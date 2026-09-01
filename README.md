# Lie to Me

A bluffing game played over a voice call with a Wikipedia article nobody chose on purpose.

One player is the **guesser**. Everyone else draws random Wikipedia articles and locks one
in. A single locked-in article is then drawn at random, and only the player who drew it —
the **reader** — gets to read it. Everyone else sees the title and nothing more.

Then the guesser interrogates the table, and everyone claims they read it.

**The reader wants to be found.** They score together with the guesser, so the reader's job
is to prove genuine knowledge — while being careful, because everyone else is listening and
will happily repeat whatever they say. A bluffer scores by being named instead.

| Outcome                      | Guesser | Reader | Named bluffer |
| ---------------------------- | ------- | ------ | ------------- |
| The guesser names the reader | +2      | +2     | —             |
| The guesser names a bluffer  | 0       | 0      | +3            |

Whoever was named takes the chair for the next round.

Three players minimum, twelve maximum. The game supplies the article and the scoring; the
talking happens wherever you already are.

## Running it locally

Requires Node 20+ and a Cloudflare account only if you intend to deploy.

```bash
npm install
```

Create the two env files. `SESSION_SECRET` signs the player identity cookie, and **the same
value must appear in both** — the pages issue the token and the game server verifies it.

```bash
cp .env.example .env && cp .dev.vars.example .dev.vars
```

Put the output of `openssl rand -hex 32` into `SESSION_SECRET` in each.

A durable object cannot run inside `vite dev`, so development takes two terminals:

```bash
npm run dev
```

```bash
npm run dev:server
```

The first serves the pages on `localhost:5173` with hot reloading. The second runs the game
server — the durable object — on `localhost:8787`, which the pages connect to over
`PUBLIC_GAME_SERVER`. In production both are a single worker on a single origin, so that
variable is left empty there.

To exercise the production shape instead, with both halves in one worker:

```bash
npm run preview
```

## Tests

```bash
npm test
```

The suite runs inside workerd, against the real durable object. Wikipedia is stubbed by an
outbound service in `vitest.config.ts`, so the tests are deterministic and never touch the
network.

```bash
npm run check
```

Typechecks the SvelteKit app and the worker separately — they compile against different
globals, so they have separate tsconfigs.

## Deploying

```bash
npx wrangler secret put SESSION_SECRET
npm run deploy
```

Rotating that secret signs everyone out, which is harmless: they get a new identity and
rejoin.

### Continuous deployment

`.github/workflows/ci.yml` typechecks, lints, tests and builds every push and pull request,
and deploys to Cloudflare on a push to `main` — only if all of that passed. Two repository
secrets are needed for the deploy step:

| Secret | Where it comes from |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard, My Profile, API Tokens, "Edit Cloudflare Workers" template |
| `CLOUDFLARE_ACCOUNT_ID` | `npx wrangler whoami` |

`SESSION_SECRET` is deliberately not in that list. Worker secrets survive a deployment, so
it stays whatever `wrangler secret put` last set it to and never has to travel through CI.

Before running this anywhere public, change `WIKIPEDIA_USER_AGENT` in `wrangler.jsonc` to
something that identifies your deployment and gives a contact route. Wikimedia
[asks API clients to do this](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy).

## How it fits together

**One durable object per room**, addressed by room code. A durable object handles one
request at a time, which is why nothing here needs locks or transactions: two players
locking in at the same instant are simply two messages in a queue. Room state lives in that
object's SQLite storage, and players hold WebSockets to it.

**The server decides everything.** Clients send intent — "lock in", "I name Cleo" — and
receive state. They never assert state. Cheating therefore means compromising the durable
object rather than the browser.

**Secrecy is structural, not cosmetic.** `RoomState` in `src/lib/protocol.ts` is broadcast
identically to everyone, and `PrivateState` is built per socket. The article text and the
reader's identity are only ever in the private half, so there is no version of the game
where the answer is sitting in a client's memory waiting to be read out of devtools.

**Identity is a signed cookie.** A player is an opaque id plus an HMAC of it. Nothing stops
someone discarding their identity, but nobody can claim someone else's. Display names are
deliberately unsigned — they are cosmetic and nothing is authorised on the strength of one.

### The two wrangler configs

`wrangler.jsonc` is the real one. `wrangler.build.jsonc` exists only because
`adapter-cloudflare` writes its generated worker to whatever `main` points at in the config
it reads — which would overwrite `src/worker/index.ts`, our actual entry point. The adapter
is pointed at the build config instead, leaving `wrangler.jsonc` free to name the entry that
re-exports the `Room` durable object alongside the SvelteKit handler.

### Layout

```
src/lib/protocol.ts        the wire contract, imported by both ends
src/lib/server/identity.ts cookie signing and verification
src/lib/game/              one component per stage of a round
src/worker/room.ts         the durable object: all the rules live here
src/worker/router.ts       the game API, in front of the durable object
src/worker/index.ts        production entry; wraps the SvelteKit worker
src/worker/dev.ts          development sidecar; the API alone
```
