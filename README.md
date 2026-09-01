<sub>_This article is about the party game. For the encyclopedia it draws its material from, see [Wikipedia](https://en.wikipedia.org)._</sub>

# [citation needed]

<table align="right">
<tr><th colspan="2">[citation needed]</th></tr>
<tr><td><i>Formerly</i></td><td>Lie to Me: The Bull$#!&^ing Game</td></tr>
<tr><td><i>Genre</i></td><td>Social deduction, party</td></tr>
<tr><td><i>Players</i></td><td>3–12</td></tr>
<tr><td><i>Playing time</i></td><td>Variable; five rounds by default</td></tr>
<tr><td><i>Setup time</i></td><td>None</td></tr>
<tr><td><i>Random chance</i></td><td>High (article and reader selection)</td></tr>
<tr><td><i>Skills</i></td><td>Bluffing, deduction, improvisation</td></tr>
<tr><td><i>Materials</i></td><td>A web browser; a voice channel</td></tr>
<tr><td><i>Source material</i></td><td>Wikipedia, drawn at random</td></tr>
</table>

**[citation needed]** is a multiplayer social deduction game in which players attempt to
convince one another that they have read a randomly selected Wikipedia article. It takes its
name from the Wikipedia template appended to an unsourced claim, which is the position every
player at the table is in. The game is played in a web browser by three to twelve participants,
who supply the conversation themselves — in person or over a voice call — while the software
handles article selection, timing and scoring.

The game is unusual among social deduction games in the alignment of its hidden role. The
player who has genuinely read the article, termed the _reader_, is rewarded for being
identified rather than for escaping detection, and scores jointly with the interrogating
player. The remaining players, the _bluffers_, score by being mistaken for the reader. The
resulting incentive is cooperative rather than evasive: every player at the table is trying
to appear knowledgeable, and the reader's difficulty lies in demonstrating genuine
familiarity without supplying material the bluffers can immediately repeat.

## Contents

1. [Gameplay](#gameplay) — [Round structure](#round-structure) · [Scoring](#scoring) · [Strategy](#strategy) · [Configuration](#configuration)
2. [History](#history)
3. [Architecture](#architecture)
4. [Installation and use](#installation-and-use)
5. [See also](#see-also)
6. [References](#references)
7. [External links](#external-links)

## Gameplay

A game is played over a series of rounds. In each round exactly one player holds the role of
_guesser_; every other player is a _guessee_. One guessee will, during the round, become the
reader. Players join a room using a four-character code, drawn from an alphabet that omits
the characters `I`, `O`, `U`, `0` and `1` so that codes can be read aloud without ambiguity.

### Round structure

Each round proceeds through four stages.

1. **Picking.** Every guessee is dealt a random Wikipedia article, of which they are shown
   only the title and Wikipedia's one-line description. A player may redraw a limited number
   of times before settling on an article, but at no point during this stage may anyone read
   the article itself. The guesser takes no part.
2. **Reading.** One of the locked-in articles is selected at random. Its owner becomes the
   reader and is shown the text; every other player, including the guesser, is shown only the
   title. The reader may end the stage early once satisfied, and it otherwise expires on a
   timer.
3. **Questioning.** The guesser interrogates the table. Every guessee maintains that they
   read the article. There is no time limit — the stage ends when the guesser names a player.
4. **Reveal.** The reader's identity and the full article text are published to everyone,
   points are awarded, and the player who was named becomes the guesser for the following
   round.

Because the article is chosen from the pool _before_ anyone reads it, a player's redraws
matter whether or not their own article is ultimately selected. Only one player ever reads,
so no reading effort is wasted on an article that does not come up.

### Scoring

| Outcome                      | Guesser | Reader | Named bluffer |
| ---------------------------- | ------- | ------ | ------------- |
| The guesser names the reader | +2      | +2     | —             |
| The guesser names a bluffer  | 0       | 0      | +3            |

The asymmetry is deliberate. A correct identification pays two players, while a successful
bluff pays only one, and a bluffer must outperform both their rivals and the genuine reader
to collect. The scheme avoids the degenerate equilibrium that arises if the reader is instead
rewarded for concealment: in that variant the reader's optimal play is to underperform, and
the guesser's optimal counter-play is to name the least convincing player, which inverts the
game.

### Strategy

The reader must convey enough detail to be believed while withholding anything distinctive
enough to be echoed back, since the bluffers can hear every answer. For the same reason, the
order in which the guesser questions the table is consequential; the player questioned last
is widely held to have the easiest task.<sup>[_[citation needed](https://en.wikipedia.org/wiki/Wikipedia:Citation_needed)_]</sup>

Article selection is drawn from `Special:Random` without curation, and the encyclopedia's
random distribution is dominated by short articles on obscure settlements, taxa and
sportspeople. The redraw budget is the mechanism by which players escape an article they
could say nothing about. Since a player does not know in advance whether their article will
be the one selected, and since the reader is rewarded for being recognised, players are
incentivised to settle on subjects they could plausibly discuss.

Articles that cannot support a round at all — disambiguation pages, list and index pages, and
articles with no substantial prose — are excluded from the draw. This is a playability
constraint rather than a curation of subject matter.

### Configuration

The host may adjust the following before a game begins. Settings are fixed for the duration
of a game.

| Setting      | Default | Range   | Effect                                     |
| ------------ | ------- | ------- | ------------------------------------------ |
| Rounds       | 5       | 1–20    | How many times the guesser's chair changes |
| Redraws      | 8       | 0–30    | Redraws available to each player per round |
| Reading time | 60s     | 15–180s | How long the reader has with the article   |

A player who disconnects during the lobby forfeits their seat after a short grace period; a
player who disconnects mid-game keeps it and may rejoin. The host may abandon a round that
cannot be completed, in which case no points are awarded and the chair passes on.

## History

The game was first implemented in 2023 on a [PocketBase](https://pocketbase.io) backend. That
version reached a working lobby but no completed round, and development stopped in November
2023; it remains in the repository on the `master` branch. A second attempt was scaffolded in
April 2025 and left unfinished.

The present implementation dates from 2026 and shares no history with either. It replaces the
PocketBase backend with Cloudflare Durable Objects, moves all game logic to the server, and
completes the round loop. The rules described above were settled during that rewrite; earlier
drafts had every player read a different article, which left all but one player's reading
effort unused, and left the reader's alignment unspecified.

The game was renamed from _Lie to Me: The Bull$#!&^ing Game_ to **[citation needed]** in
September 2026 and moved to citationneededgame.com. The interface was restyled after
Wikipedia's own at the same time, and the puzzle-globe logo — a Wikimedia trademark rather
than a freely reusable asset — was dropped in favour of a wordmark.

## Architecture

The application is a [SvelteKit](https://svelte.dev/docs/kit) front end and a
[Cloudflare Worker](https://developers.cloudflare.com/workers/) back end, deployed together as
a single worker.

**Rooms.** Each room is one Durable Object, addressed by its room code.<sup>[[1]](#references)</sup>
A Durable Object processes one request at a time, so the implementation requires no locks or
transactions: two players locking in simultaneously are simply two messages in a queue. Room
state is held in the object's SQLite storage and players are connected to it by WebSocket.

**Authority.** Clients send intent — _lock in_, _I name Cleo_ — and receive state. They never
assert state. Cheating therefore requires compromising the Durable Object rather than the
browser.

**Information model.** The secrecy of the game is structural rather than presentational.
`RoomState`, defined in `src/lib/protocol.ts`, is broadcast identically to every player;
`PrivateState` is constructed separately for each socket. The article text and the reader's
identity exist only in the latter, so at no point does an unprivileged client hold data that
would spoil the round.

**Identity.** A player is an opaque identifier accompanied by an HMAC of it, held in a cookie
and verified by the worker before a socket may act as that player. A player may discard their
identity, but cannot assume another's. Display names are deliberately unsigned, being
cosmetic and load-bearing for nothing.

**Self-addressed requests.** Server-side code reaches the Durable Object through its
binding rather than over HTTP. A Worker's subrequest to its own hostname does not re-enter
the Worker; with static assets configured it is answered by the asset handler, which knows
nothing of `/api/rooms` and returns 404. The room-hosting page action therefore uses
`platform.env.ROOM` in production and falls back to an HTTP call only under `vite dev`,
where no bindings exist and the Durable Object is a separate process.

**Build configuration.** Two Wrangler configuration files exist. `wrangler.jsonc` is the
operative one. `wrangler.build.jsonc` exists solely because `adapter-cloudflare` writes its
generated worker to whatever path `main` names in the configuration file it reads,<sup>[[2]](#references)</sup>
which would otherwise overwrite `src/worker/index.ts` — the real entry point, and the module
that must re-export the `Room` class for the Durable Object binding to resolve. The adapter is
therefore pointed at the build configuration instead.

**Source layout.**

```
src/lib/protocol.ts        the wire contract, imported by both ends
src/lib/server/identity.ts cookie signing and verification
src/lib/game/Table.svelte  a round, rendered the same wherever it is played
src/lib/game/              one component per stage of a round
src/worker/room.ts         the durable object; all the rules live here
src/worker/router.ts       the game API, in front of the durable object
src/worker/wikipedia.ts    article selection
src/worker/index.ts        production entry; wraps the SvelteKit worker
src/worker/dev.ts          development sidecar; the API alone
src/routes/room/[code]/    the website: a room code and a cookie
src/routes/discord/        the activity: an instance and a Discord account
```

## Installation and use

Node 20.19 or later is required.<sup>[[3]](#references)</sup> Continuous integration uses
Node 24.

```bash
npm install
```

Two environment files are needed. `SESSION_SECRET` signs the player identity cookie and **the
same value must appear in both**, as the pages issue the token and the game server verifies
it.

```bash
cp .env.example .env && cp .dev.vars.example .dev.vars
```

The output of `openssl rand -hex 32` is a suitable value.

### Development

A Durable Object cannot run inside `vite dev`, so development requires two processes.

```bash
npm run dev
```

```bash
npm run dev:server
```

The first serves the pages on `localhost:5173` with hot reloading; the second runs the game
server on `localhost:8787`, which the pages reach through `PUBLIC_GAME_SERVER`. In production
the two are a single worker on a single origin and that variable is left empty. To run the
production arrangement locally instead:

```bash
npm run preview
```

### Testing

```bash
npm test
```

The suite executes inside workerd against the real Durable Object. Wikipedia is replaced by an
outbound service defined in `vitest.config.ts`, making rounds deterministic and ensuring the
tests never reach the network.

```bash
npm run check
```

This typechecks the SvelteKit application and the worker as separate projects, which is
necessary because they compile against different global environments.

### Deployment

```bash
npx wrangler secret put SESSION_SECRET
npm run deploy
```

Rotating that secret invalidates every player identity, which is harmless: players are issued
new ones and rejoin.

### Continuous deployment

`.github/workflows/ci.yml` typechecks, lints, tests and builds on every push and pull request,
and deploys on a push to `main` if all of that succeeded. The deployment step requires two
repository secrets.

| Secret                  | Source                                                                     |
| ----------------------- | -------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare dashboard → My Profile → API Tokens → "Edit Cloudflare Workers" |
| `CLOUDFLARE_ACCOUNT_ID` | `npx wrangler whoami`                                                      |

`SESSION_SECRET` is deliberately absent. Worker secrets outlive a deployment, so it remains
whatever `wrangler secret put` last set and never passes through continuous integration.

`WIKIPEDIA_USER_AGENT` in `wrangler.jsonc` identifies this client to the Wikimedia Foundation
and points at this repository, whose issue tracker is the contact route their user-agent
policy requires.<sup>[[4]](#references)</sup> Operators of a fork should change it to point at
their own deployment, so that traffic originating from it does not lead back here.

## See also

- [Balderdash](https://en.wikipedia.org/wiki/Balderdash) — bluffing with invented dictionary definitions
- [Two truths and a lie](https://en.wikipedia.org/wiki/Two_truths_and_a_lie) — icebreaker built on the same detection problem
- [Fibbage](https://en.wikipedia.org/wiki/The_Jackbox_Party_Pack) — a commercial party game in which players invent plausible facts
- [Wikipedia:Random](https://en.wikipedia.org/wiki/Special:Random) — the source of every article in play

## References

1. ["Durable Objects"](https://developers.cloudflare.com/durable-objects/), Cloudflare Developer Documentation.
2. ["Cloudflare adapter"](https://svelte.dev/docs/kit/adapter-cloudflare), SvelteKit documentation.
3. ["Node.js support"](https://vite.dev/guide/migration), Vite documentation. The constraint originates with Vite, not this project.
4. ["Wikimedia Foundation User-Agent Policy"](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy), Wikimedia Foundation.

## External links

- [Play the game](https://citationneededgame.com)
- [Source repository](https://github.com/abedef/wikigame)

<sub>Not affiliated with, endorsed by, or connected to the Wikimedia Foundation. Article text
comes from Wikipedia and is available under [CC BY-SA](https://creativecommons.org/licenses/by-sa/4.0/).</sub>
