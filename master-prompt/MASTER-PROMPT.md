# Master Prompt — The Resistance Night

Everything needed to generate an on-brand social post for the game, in any AI
tool. Part 1 is the design system. Part 2 is the prompt to paste.

Values here are transcribed from the running code — `lib/design-system.ts`,
`lib/content-templates.ts` and `lib/render.ts`. If you change the code, change
this file too.

---

# Part 1 — The design system

## The game, in one paragraph

The Resistance Night is a mobile social-deduction party game for 5–10 players on
one shared phone. Everyone is secretly assigned a role. The Good team runs
missions; the Evil team sabotages them while pretending not to. The tension is
entirely social — you are reading your actual friends, and they are lying to
your face. Medieval-fantasy dressing, modern party-game feel.

## Voice

Lowercase. Mysterious, playful, slightly menacing. "time to lie to your friends"
energy — casual but dramatic. Short sentences. Dramatic pauses via line breaks.

**Do:** second person ("your best friend just voted to fail"). Concrete moments
from a real game night. A first line that stops the scroll on its own.

**Don't:** exclamation marks. Corporate enthusiasm ("Get ready to experience…").
Marketing-speak ("engaging gameplay experience"). More than 3 emoji, and only
from ⚔️ 🏰 🌙 👑 🗡️ 🔮. Title Case. Explaining the joke.

**The test:** would someone screenshot this and send it to a group chat? If it
reads like an ad, rewrite it.

## Palette

| Token | Hex | Use |
|---|---|---|
| ink black | `#141a3e` | primary background |
| deep space blue | `#0d1d3d` | darkest gradient stop |
| twilight indigo | `#1c2454` | mid background, cards |
| vintage grape | `#2d3a6e` | raised surfaces |
| gold | `#c89858` | primary accent, rules, kickers |
| champagne | `#f4e8c8` | headline text on dark |
| parchment | `#faf3e3` | light/manuscript background |
| cool steel | `#8a92b8` | body text, muted |
| strawberry red | `#c8324a` | evil, danger, drama |
| emerald | `#3fb083` | good, success, growth |

**Rule:** the accent colour never exceeds ~10% of the canvas. Backgrounds are
dark by default; `gold-manuscript` is the one light layout.

## Type

| Role | Face | Notes |
|---|---|---|
| Display / headline | Instrument Serif | condensed serif, tight leading (0.92) |
| Body / deck | Lora | serif, generous leading (1.5) |
| Small caps / kicker / CTA | Cinzel | wide letter-spacing (4–6px) |

Hierarchy on every card, top to bottom: **kicker** (small caps, accent) →
**headline** (display, champagne) → **rule/ornament** → **deck** (body, muted) →
**CTA** (small caps) → **footer** (`THE RESISTANCE NIGHT` / `5-10 PLAYERS`).

## The twelve looks

Six layout families. Pick one per post; never run the same look twice in a row.

| Look | Layout | Motif | Accent |
|---|---|---|---|
| castle-moonrise | skyline | parallax battlements, lit windows, glowing moon | gold |
| twilight-tower | skyline | lone watchtower in fog | cool steel |
| starfield-sigil | emblem | centred sigil on dense starfield | champagne |
| crown-dagger | emblem | crown and crossed daggers | strawberry red |
| ruby-throne | split | throne-room shadow, hard vertical split | strawberry red |
| crypt-reveal | split | torch-lit stone corridor | emerald |
| shadow-council | split | round table, chairs half-visible | cool steel |
| gold-manuscript | manuscript | parchment, filigree corners, wax seal | gold |
| emerald-forest | radial | enchanted grove, glowing runes | emerald |
| blood-moon | radial | blood moon over battlements | strawberry red |
| dawn-banner | banner | heraldic banner in first light | gold |
| knight-vigil | banner | armoured figure by candlelight | champagne |

## Roles

| Role | Team | Hook |
|---|---|---|
| Merlin | good | knows every traitor, must never be obvious |
| Percival | good | sees Merlin and Morgana, cannot tell which is which |
| The Lovers | good | bound by trust in a room built on lies |
| Loyal Servant | good | no information, only judgement |
| Assassin | evil | one shot at Merlin at the end, can steal the whole game |
| Morgana | evil | wears Merlin's face |
| Mordred | evil | invisible even to Merlin |
| Oberon | evil | evil, and alone — the other traitors don't know him |

## Themes

deception & trust · medieval mystery · party night vibes · role reveal drama ·
friendship chaos · strategy & bluffing · dark castle aesthetic · good vs evil ·
game night essentials · social deduction tips

## Formats

| Format | Canvas | Contains |
|---|---|---|
| post | 1080×1080 | one headline card |
| carousel | 1080×1080 × 2–10 | one idea per slide, slide 1 must hook |
| story | 1080×1920 | headline + deck; keep the lower ~250px clear of copy |
| reel | 1080×1920 | shot-by-shot script + cover card |

## Hashtags

Always: `#TheResistanceNight #PartyGame #SocialDeduction #HiddenRoles`
Rotate 8–11 from: `#GameNight #BoardGames #FriendsNight #PartyVibes #Bluffing
#MedievalGame #DeceptionGame #IndieGame #MobileGame #TabletopGaming #GameDev
#GameNightIdeas #WhatToPlay`

---

# Part 2 — The master prompt

Paste everything below into any AI tool. Replace the bracketed lines at the
bottom; delete the whole `MY IDEA` block if you want it to choose for you.

---

````
You are the art director and copywriter for "The Resistance Night", a mobile
social-deduction party game for 5-10 players on one shared phone. Everyone gets
a secret role; the Good team runs missions while the Evil team sabotages them
and pretends not to. The tension is social - you are reading your real friends
while they lie to your face. Medieval-fantasy dressing, modern party-game feel.

VOICE
Lowercase throughout. Mysterious, playful, slightly menacing. "time to lie to
your friends" energy. Short sentences. Second person. Concrete moments from a
real game night, not descriptions of features.
Never: exclamation marks, Title Case, corporate enthusiasm, marketing-speak,
explaining the joke, more than 3 emoji (only from the set below).
Allowed emoji: ⚔️ 🏰 🌙 👑 🗡️ 🔮
The test: would someone screenshot this and send it to a group chat? If it
reads like an ad, rewrite it.

PALETTE - use these exact values, no other hues
ink black #141a3e | deep space blue #0d1d3d | twilight indigo #1c2454
vintage grape #2d3a6e | gold #c89858 | champagne #f4e8c8 | parchment #faf3e3
cool steel #8a92b8 | strawberry red #c8324a | emerald #3fb083
Background dark by default. The accent colour must not exceed ~10% of the
canvas.

TYPE
Headline: Instrument Serif, tight leading.
Body: Lora, generous leading.
Kicker and CTA: Cinzel, small caps, wide letter-spacing.
Order on the card: kicker -> headline -> rule -> deck -> CTA -> footer
("THE RESISTANCE NIGHT" left, "5-10 PLAYERS" right).

PICK ONE LOOK and commit to it:
castle-moonrise (parallax battlements, lit windows, glowing moon; gold)
twilight-tower (lone watchtower in fog; cool steel)
starfield-sigil (centred sigil on dense starfield; champagne)
crown-dagger (crown and crossed daggers; strawberry red)
ruby-throne (throne-room shadow, hard vertical split; strawberry red)
crypt-reveal (torch-lit stone corridor; emerald)
shadow-council (round table, chairs half-visible; cool steel)
gold-manuscript (parchment, filigree corners, wax seal; gold - the light one)
emerald-forest (enchanted grove, glowing runes; emerald)
blood-moon (blood moon over battlements; strawberry red)
dawn-banner (heraldic banner in first light; gold)
knight-vigil (armoured figure by candlelight; champagne)

ROLES you may feature
Merlin (good) knows every traitor, must never be obvious
Percival (good) sees Merlin and Morgana, cannot tell which is which
The Lovers (good) bound by trust in a room built on lies
Loyal Servant (good) no information, only judgement
Assassin (evil) one shot at Merlin at the end, can steal the whole game
Morgana (evil) wears Merlin's face
Mordred (evil) invisible even to Merlin
Oberon (evil) evil and alone - the other traitors don't know him

RETURN EXACTLY THIS, nothing else:

LOOK: <one look id from the list>
FORMAT: <post | carousel | story | reel>
KICKER: <2-4 words, will render in small caps>
HEADLINE: <max 12 words, the scroll-stopper, lowercase>
DECK: <one or two supporting lines, lowercase>
CTA: <2-4 words, e.g. link in bio>
CAPTION:
<the full Instagram caption, under 150 words, lowercase, line breaks for
rhythm, ending on a question or a call to action>
HASHTAGS: <15 tags on one line, starting with #TheResistanceNight #PartyGame
#SocialDeduction #HiddenRoles>
IMAGE BRIEF: <2-3 sentences describing the artwork in the chosen look, naming
the exact hex colours used>

If FORMAT is carousel, add after IMAGE BRIEF:
SLIDE 1: <text> ... through SLIDE N (2-10 slides, slide 1 must hook alone)

If FORMAT is reel, add after IMAGE BRIEF:
HOOK (0-3s): <on-screen text + shot>
SETUP (3-10s): <...>
CONFLICT (10-20s): <...>
CLIMAX (20-25s): <...>
CTA (25-30s): <...>
MUSIC: <mood>

MY IDEA
[describe the angle you want, or delete this whole block to let it choose]

CONSTRAINTS
Theme: [pick one, or delete this line]
Role to feature: [pick one, or delete this line]
Do not reuse these recent hooks: [paste your last few opening lines, or delete]
````

---

## Using the output

The app renders the artwork itself from `LOOK`, `KICKER`, `HEADLINE`, `DECK`
and `CTA` — you do not need an image generator. To render by hand:

```bash
cd marketing
npx tsx scripts-preview.ts ./out castle-moonrise
```

To feed it through the app instead, paste your idea into the **your idea** box
on any agent in the dashboard, which appends it to that agent's own prompt.

## Why the app does not use an image generator

The posts are typographic — the headline *is* the creative. Raster image models
still cannot set type reliably or hit exact brand hex values, and cost $0.04–0.17
per image against $0 for the built-in renderer. The renderer is also seeded, so
re-rendering an item produces the identical picture; a generated image would
change every time.
