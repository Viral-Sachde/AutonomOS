import { ContentItem } from "./design-system";

export interface PublishResult {
  success: boolean;
  postId?: string;
  error?: string;
  platform: string;
}

const GRAPH_API = "https://graph.facebook.com/v21.0";

export function isInstagramConfigured(): boolean {
  return !!(process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID);
}

function getToken(): string {
  return (process.env.INSTAGRAM_ACCESS_TOKEN || "").trim();
}

function getAccountId(): string {
  return (process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || "").trim();
}

function formatCaption(content: ContentItem): string {
  // `caption` is the finished caption; `reelScript` is narration for the video
  // and only stands in when an older item has no caption of its own.
  let caption = content.caption || content.reelScript || "";
  if (content.hashtags.length > 0 && !content.hashtags[0].startsWith("#strategy")) {
    caption += "\n\n" + content.hashtags.join(" ");
  }
  return caption.slice(0, 2200);
}

/* ------------------------------------------------------------------ *
 * Graph API plumbing
 * ------------------------------------------------------------------ */

async function graphPost(path: string, params: Record<string, string>): Promise<any> {
  const res = await fetch(`${GRAPH_API}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  return res.json();
}

/**
 * Creates a media container and returns its id.
 *
 * The Graph API reports two different kinds of failure here: an `error` object,
 * and a 200 that simply carries no `id`. The second used to fall through and
 * publish with `creation_id=undefined`, which surfaced as an unreadable error
 * several steps later, so both are turned into one explicit message.
 */
async function createContainer(
  accountId: string,
  params: Record<string, string>,
  what: string
): Promise<string> {
  const data = await graphPost(`${accountId}/media`, params);
  if (data.error) {
    throw new Error(`${what} rejected by Instagram: ${data.error.message}`);
  }
  if (!data.id) {
    throw new Error(`${what} returned no media id. Instagram said: ${JSON.stringify(data)}`);
  }
  return data.id;
}

/**
 * Waits for a container to finish processing.
 *
 * Instagram does not accept an upload - it fetches `image_url` itself, and the
 * container stays IN_PROGRESS until that download and transcode finish.
 * Publishing before then fails with "Media ID is not available", so every
 * publish path has to poll first.
 */
async function waitForContainer(
  containerId: string,
  accessToken: string,
  attempts = 16,
  delayMs = 1500
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(
      `${GRAPH_API}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`
    );
    const data = await res.json();

    if (data.error) {
      throw new Error(`Could not read media status: ${data.error.message}`);
    }

    const code = data.status_code;
    if (code === "FINISHED") return;
    if (code === "ERROR" || code === "EXPIRED") {
      throw new Error(
        `Instagram could not process the image (${code}). ${data.status || "Check that the image URL is public and the aspect ratio is allowed."}`
      );
    }

    // code is IN_PROGRESS, or occasionally undefined for a moment right after
    // creation - either way, not yet safe to publish. Calling media_publish
    // before status_code reaches FINISHED fails outright with "Media ID is
    // not available", so there is no state short of FINISHED worth treating
    // as ready: guessing here can only ever cause that failure, never avoid
    // it, so it is not guessed at.
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(
    `Instagram is still processing the image after ${Math.round((attempts * delayMs) / 1000)} seconds. The image URL may be slow or unreachable.`
  );
}

/**
 * Confirms an image URL is anonymously readable before Instagram tries it.
 *
 * Instagram fetches the image itself and presents no credentials, so a private
 * storage bucket fails inside Meta's infrastructure and comes back as an
 * unhelpful media error. Checking here turns that into a message that names
 * the actual problem.
 */
async function assertPubliclyFetchable(url: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" } });
  } catch (e: any) {
    throw new Error(`The image URL could not be reached: ${e.message}. Instagram will not be able to fetch it either.`);
  }

  if (!res.ok && res.status !== 206) {
    throw new Error(
      `The image URL is not publicly readable (HTTP ${res.status}). Instagram fetches images anonymously, so the Supabase storage bucket set in SUPABASE_BUCKET must be marked public.`
    );
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new Error(
      `The image URL returned "${contentType || "no content type"}" instead of an image. Check that the upload succeeded.`
    );
  }
}

async function publishContainer(
  accountId: string,
  containerId: string,
  accessToken: string
): Promise<string> {
  const data = await graphPost(`${accountId}/media_publish`, {
    creation_id: containerId,
    access_token: accessToken,
  });
  if (data.error) {
    throw new Error(data.error.message);
  }
  if (!data.id) {
    throw new Error(`Publish returned no post id. Instagram said: ${JSON.stringify(data)}`);
  }
  return data.id;
}

function credentials(): { accessToken: string; accountId: string } | null {
  const accessToken = getToken();
  const accountId = getAccountId();
  if (!accessToken || !accountId) return null;
  return { accessToken, accountId };
}

const NOT_CONFIGURED: PublishResult = {
  success: false,
  error:
    "Instagram credentials not configured. Add INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID to your environment variables.",
  platform: "instagram",
};

/* ------------------------------------------------------------------ *
 * Feed post
 * ------------------------------------------------------------------ */

export async function publishToInstagram(
  content: ContentItem,
  imageUrl?: string
): Promise<PublishResult> {
  const creds = credentials();
  if (!creds) return NOT_CONFIGURED;

  if (!imageUrl) {
    return {
      success: false,
      error: "Instagram requires an image URL for every post. Provide a publicly accessible image URL.",
      platform: "instagram",
    };
  }

  try {
    await assertPubliclyFetchable(imageUrl);

    const containerId = await createContainer(
      creds.accountId,
      {
        image_url: imageUrl,
        caption: formatCaption(content),
        access_token: creds.accessToken,
      },
      "Feed post"
    );

    await waitForContainer(containerId, creds.accessToken);
    const postId = await publishContainer(creds.accountId, containerId, creds.accessToken);

    return { success: true, postId, platform: "instagram" };
  } catch (error: any) {
    return { success: false, error: error.message || "Network error publishing to Instagram", platform: "instagram" };
  }
}

/* ------------------------------------------------------------------ *
 * Story
 * ------------------------------------------------------------------ */

/**
 * Stories are a separate media type, not a feed post.
 *
 * Story artwork is rendered at 1080x1920 (9:16), which is far outside the 4:5
 * to 1.91:1 window a feed post allows - sending it to the feed endpoint made
 * Instagram reject the container and return no media id. Stories accept 9:16,
 * so story content has to go through `media_type=STORIES`.
 *
 * A multi-frame story becomes one story per frame, posted in order. Instagram
 * ignores captions on stories, so none is sent.
 */
export async function publishStoryToInstagram(
  content: ContentItem,
  imageUrls: string[]
): Promise<PublishResult> {
  const creds = credentials();
  if (!creds) return NOT_CONFIGURED;

  if (imageUrls.length === 0) {
    return { success: false, error: "No image available for the story", platform: "instagram" };
  }

  try {
    const postIds: string[] = [];

    for (const [i, url] of imageUrls.entries()) {
      await assertPubliclyFetchable(url);

      const containerId = await createContainer(
        creds.accountId,
        {
          image_url: url,
          media_type: "STORIES",
          access_token: creds.accessToken,
        },
        `Story frame ${i + 1}`
      );

      await waitForContainer(containerId, creds.accessToken, 12);
      postIds.push(await publishContainer(creds.accountId, containerId, creds.accessToken));
    }

    return { success: true, postId: postIds[0], platform: "instagram" };
  } catch (error: any) {
    return { success: false, error: error.message || "Network error publishing story", platform: "instagram" };
  }
}

/* ------------------------------------------------------------------ *
 * Carousel
 * ------------------------------------------------------------------ */

export async function publishCarouselToInstagram(
  content: ContentItem,
  imageUrls: string[]
): Promise<PublishResult> {
  const creds = credentials();
  if (!creds) return NOT_CONFIGURED;

  if (imageUrls.length < 2) {
    return { success: false, error: "Carousels need at least 2 images", platform: "instagram" };
  }

  try {
    const containerIds: string[] = [];
    for (const [i, url] of imageUrls.slice(0, 10).entries()) {
      await assertPubliclyFetchable(url);

      const id = await createContainer(
        creds.accountId,
        {
          image_url: url,
          is_carousel_item: "true",
          access_token: creds.accessToken,
        },
        `Carousel slide ${i + 1}`
      );
      await waitForContainer(id, creds.accessToken, 10);
      containerIds.push(id);
    }

    const carouselId = await createContainer(
      creds.accountId,
      {
        media_type: "CAROUSEL",
        children: containerIds.join(","),
        caption: formatCaption(content),
        access_token: creds.accessToken,
      },
      "Carousel"
    );

    await waitForContainer(carouselId, creds.accessToken);
    const postId = await publishContainer(creds.accountId, carouselId, creds.accessToken);

    return { success: true, postId, platform: "instagram" };
  } catch (error: any) {
    return { success: false, error: error.message || "Network error", platform: "instagram" };
  }
}

/* ------------------------------------------------------------------ *
 * Reel
 * ------------------------------------------------------------------ */

export async function publishReelToInstagram(
  content: ContentItem,
  videoUrl: string
): Promise<PublishResult> {
  const creds = credentials();
  if (!creds) return NOT_CONFIGURED;

  try {
    const containerId = await createContainer(
      creds.accountId,
      {
        media_type: "REELS",
        video_url: videoUrl,
        caption: formatCaption(content),
        access_token: creds.accessToken,
      },
      "Reel"
    );

    // Video transcoding takes far longer than an image fetch.
    await waitForContainer(containerId, creds.accessToken, 30, 2000);
    const postId = await publishContainer(creds.accountId, containerId, creds.accessToken);

    return { success: true, postId, platform: "instagram" };
  } catch (error: any) {
    return { success: false, error: error.message || "Network error", platform: "instagram" };
  }
}
