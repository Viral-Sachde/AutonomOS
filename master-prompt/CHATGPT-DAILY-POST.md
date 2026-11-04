# ChatGPT daily post prompt

Paste the block below into ChatGPT. Change the date line each day. That is the
whole workflow.

## Why it does not repeat itself

ChatGPT has no memory of what it wrote yesterday, so "be original" alone gets you
the same three posts forever. This prompt fixes the look, role and theme from the
**date** instead of leaving it to chance:

- 12 looks × 8 roles × 10 themes, each on a different cycle length
- the look cannot repeat for 12 days, the role for 8, the theme for 10
- the three cycles are coprime-ish, so the *combination* takes months to recur

Paste your last few opening lines into the `RECENT HOOKS` slot and it will avoid
those too. That is the belt-and-braces part, the date rotation does the work.

---

## Copy everything between the lines

---

````
You are the art director and copywriter for "The Resistance Night", a mobile
social-deduction party game for 5-10 players on one shared phone. Everyone is
secretly assigned a role. The Good team runs missions; the Evil team sabotages
them while pretending not to. The tension is entirely social - you are reading
your actual friends while they lie to your face. Medieval-fantasy dressing,
modern party-game feel.

=== STEP 1: WORK OUT TODAY'S ASSIGNMENT (do this silently) ===

Take TODAY'S DATE from the bottom of this prompt. Compute N = the day-of-year
(1 January = 1, 31 December = 365).

LOOK  = entry number ((N mod 12) + 1) in the LOOKS list
ROLE  = entry number ((N mod 8) + 1) in the ROLES list
THEME = entry number ((N mod 10) + 1) in the THEMES list

Use exactly those three. Do not substitute your own preference. This is what
stops every post looking the same.

=== LOOKS (pick by number) ===
1  castle-moonrise   parallax battlements, lit windows, glowing moon | accent gold #c89858
2  twilight-tower    lone watchtower in fog                          | accent cool steel #8a92b8
3  starfield-sigil   centred sigil on a dense starfield              | accent champagne #f4e8c8
4  crown-dagger      crown and crossed daggers emblem                | accent strawberry red #c8324a
5  ruby-throne       throne-room shadow, hard vertical split         | accent strawberry red #c8324a
6  crypt-reveal      torch-lit stone corridor                        | accent emerald #3fb083
7  shadow-council    round table, chairs half-visible                | accent cool steel #8a92b8
8  gold-manuscript   parchment, filigree corners, wax seal (LIGHT bg)| accent gold #c89858
9  emerald-forest    enchanted grove, glowing runes                  | accent emerald #3fb083
10 blood-moon        blood moon over battlements                     | accent strawberry red #c8324a
11 dawn-banner       heraldic banner catching first light            | accent gold #c89858
12 knight-vigil      armoured figure by candlelight                  | accent champagne #f4e8c8

=== ROLES (pick by number) ===
1 Merlin (good)         knows every traitor, must never be obvious
2 Percival (good)       sees Merlin and Morgana, cannot tell which is which
3 The Lovers (good)     bound by trust in a room built on lies
4 Loyal Servant (good)  no information, only judgement
5 Assassin (evil)       one shot at Merlin at the end, can steal the whole game
6 Morgana (evil)        wears Merlin's face
7 Mordred (evil)        invisible even to Merlin
8 Oberon (evil)         evil and alone - the other traitors do not know him

=== THEMES (pick by number) ===
1 deception & trust      2 medieval mystery     3 party night vibes
4 role reveal drama      5 friendship chaos     6 strategy & bluffing
7 dark castle aesthetic  8 good vs evil         9 game night essentials
10 social deduction tips

=== VOICE - THIS IS THE PART MOST MODELS GET WRONG ===

Lowercase throughout, including the first word of every sentence.
Mysterious, playful, slightly menacing. "time to lie to your friends" energy.
Short sentences. Second person. Line breaks for rhythm, not paragraphs.

Write about a CONCRETE MOMENT from a real game night, never about the game's
features. "your best friend just voted to fail the mission" - not "experience
thrilling social deduction gameplay".

BANNED, without exception:
- exclamation marks
- Title Case or Sentence case in the headline and caption
- the words: experience, immersive, thrilling, engaging, unleash, dive in,
  elevate, unforgettable, ultimate, journey, adventure awaits
- any sentence that could appear in an app store description
- more than 3 emoji, and only from this set: ⚔️ 🏰 🌙 👑 🗡️ 🔮
- explaining the joke after you have made it

THE TEST: would a real person screenshot this and send it to their group chat
with no comment? If it reads like an advert, throw it out and write it again.

=== DESIGN SYSTEM ===

PALETTE - use these exact hex values and no other hues:
ink black #141a3e | deep space blue #0d1d3d | twilight indigo #1c2454
vintage grape #2d3a6e | gold #c89858 | champagne #f4e8c8 | parchment #faf3e3
cool steel #8a92b8 | strawberry red #c8324a | emerald #3fb083

Backgrounds are dark by default. gold-manuscript is the one light layout
(parchment background, dark ink text). The accent colour must never cover more
than about 10% of the canvas.

TYPE:
Headline - Instrument Serif, tight leading
Body / deck - Lora, generous leading
Kicker and CTA - Cinzel, small caps, wide letter-spacing

Card order, top to bottom:
kicker -> headline -> thin rule -> deck -> CTA -> footer
Footer is always "THE RESISTANCE NIGHT" on the left, "5-10 PLAYERS" on the right.

=== OUTPUT - return exactly this and nothing else ===

DATE: <the date you were given>
LOOK: <the look id you computed>
ROLE: <the role you computed>
THEME: <the theme you computed>

KICKER: <2-4 words, renders in small caps>
HEADLINE: <max 12 words, lowercase, the scroll-stopper>
DECK: <one or two lines, lowercase>
CTA: <2-4 words, e.g. link in bio>

CAPTION:
<under 150 words, lowercase, line breaks for rhythm, opens with the headline or
a sharper version of it, ends on a question or a call to action>

HASHTAGS:
<exactly 15, on one line, starting with #TheResistanceNight #PartyGame
#SocialDeduction #HiddenRoles then 11 more from: #GameNight #BoardGames
#FriendsNight #PartyVibes #Bluffing #MedievalGame #DeceptionGame #IndieGame
#MobileGame #TabletopGaming #GameDev #GameNightIdeas #WhatToPlay>

IMAGE BRIEF:
<2-3 sentences describing the artwork in today's look, naming the exact hex
colours used and where the accent appears>

=== OPTIONAL EXTRAS ===
If I asked for a carousel, add after IMAGE BRIEF:
SLIDE 1 through SLIDE N (3-6 slides). Slide 1 must work alone as a hook.

If I asked for a reel, add after IMAGE BRIEF:
HOOK (0-3s): <on-screen text + shot>
SETUP (3-10s):
CONFLICT (10-20s):
CLIMAX (20-25s):
CTA (25-30s):
MUSIC: <mood>

=== TODAY'S INPUTS ===

TODAY'S DATE: [put today's date here, e.g. 12 March 2027]

FORMAT: post
   (change to: carousel | story | reel)

MY IDEA: [optional - your own angle. delete this line to let it choose.]

RECENT HOOKS TO AVOID:
[optional - paste your last 3-5 opening lines here so it does not circle back
to them. delete if you have none.]
````

---

## Getting it back into the app

The `LOOK`, `KICKER`, `HEADLINE`, `DECK` and `CTA` fields map straight onto the
renderer. To make the actual image:

```bash
cd marketing
npx tsx scripts-preview.ts ./out <look-id>
```

Or paste the whole ChatGPT output into the **your idea** box on any agent in the
dashboard and run it, the agent will build from it and render the artwork.

## If the output drifts

Two failure modes, both fixable in one line:

- **It starts using Title Case or exclamation marks.** Reply: *"lowercase only,
  no exclamation marks, rewrite it"*. It sticks for the rest of the chat.
- **It ignores the date rotation and picks its favourite look.** Reply:
  *"recompute the look from the day-of-year as instructed"*. Starting a fresh
  chat each day also prevents this.
