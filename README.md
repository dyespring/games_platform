# Team Party Games — Real-Time Game Platform

A live multiplayer party-game platform for teams. Each player joins a room from
their own device; the host picks a game in the lobby and everyone plays together
with live voting, reveals, and a leaderboard.

Built with **Next.js (App Router, TypeScript)** and a **Socket.IO** real-time
layer running on a single custom Node server. The room/player/socket layer is
shared; each game is an isolated module under `lib/game/games/`.

## Games

### Two Truths, One Lie

1. **Submission** — Everyone writes 3 statements and marks which one is the lie.
2. **Voting** — One player is spotlighted at a time; everyone else guesses the lie.
3. **Reveal** — The lie is revealed, votes shown, points awarded.
4. **Results** — Final leaderboard.

Scoring: **+100** to each voter who spots the lie; **+50** to the spotlight player
for every voter they fool. (2+ players.)

### Most Likely To

1. **Voting** — A prompt appears ("most likely to reply-all by accident"); everyone
   votes for the person they think fits (you can't vote for yourself).
2. **Reveal** — Vote counts per person are shown with the round's "winner".
3. Repeats for several prompts, then a final leaderboard of who got the most votes.

Prompts come from a built-in library; the host can add custom prompts in the
lobby. (3+ players.)

### Caption This

1. **Submission** — A funny image appears; everyone writes a caption for it.
2. **Voting** — All captions are shown anonymously (shuffled); everyone votes for
   the funniest (you can't vote for your own).
3. **Reveal** — Captions are revealed with their authors and vote counts.
4. Repeats for several images (default 4 rounds), then a final leaderboard.

Scoring: **+100** per vote a caption receives. Images come from a built-in
library of meme templates; the host can add custom image URLs (e.g. a team photo)
in the lobby. (3+ players.)

## How it plays

1. **Lobby** — One person creates a room and shares the 4-letter code. Others join.
   The host picks a game (and optionally adds prompts) and starts.
2. Play the chosen game's rounds with live voting and reveals.
3. **Results** — Final leaderboard. The host can return to the lobby and pick a
   game again (scores reset).

## Getting started

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

### Testing multiplayer locally

- Open the app in several browser tabs (or an incognito window) — each tab is a
  separate player. Create a room in one, then join with the code from the others.
- To play across phones on the same Wi-Fi, find your machine's LAN IP and visit
  `http://<your-ip>:3000` from each device. The server binds to `0.0.0.0`.

## Production

```bash
npm run build
npm start
```

The custom server (`server.ts`) serves both the Next.js app and the WebSocket
endpoint on the same port (it reads `PORT` from the environment). Because game
state lives in memory, run a **single instance** — no horizontal scaling or
autoscaling without moving rooms into a shared store like Redis.

## Deploying to Render

This repo includes a [`render.yaml`](render.yaml) Blueprint, so deployment is
mostly automatic.

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. In the Render dashboard: **New > Blueprint**, then connect the repo. Render
   reads `render.yaml` and provisions a single Web Service:
   - Build: `npm install --include=dev && npm run build`
   - Start: `npm start`
   - Health check: `/`
   - `numInstances: 1` (required — see the in-memory note above)
3. Click **Apply**. The first build takes a few minutes; then your game is live
   at `https://<service-name>.onrender.com`.

Notes:
- Render injects `PORT` automatically; the server already binds to it.
- WebSockets work out of the box on Render Web Services — no extra config.
- On the **free** plan the service sleeps after inactivity and cold-starts on the
  next request (which also clears any in-progress rooms). Use a paid instance to
  keep it always-on.

Prefer not to use the Blueprint? Create a Web Service manually with the same
build/start commands above and set instances to 1.

## Project structure

```
server.ts                       Custom Node server: Next.js + Socket.IO
lib/game/types.ts               Shared types + socket event contracts
lib/game/errors.ts              GameError (user-facing rule violations)
lib/game/store.ts               In-memory room store + room-code generation
lib/game/registry.ts            Game metadata (name, tagline, minPlayers)
lib/game/engine.ts              Core membership + lobby + game dispatcher
lib/game/games/twoTruths.ts     Two Truths logic, scoring, sanitization
lib/game/games/mostLikely.ts    Most Likely To logic, tally, sanitization
lib/game/games/mostLikelyPrompts.ts  Built-in prompt library
lib/game/games/captionThis.ts   Caption This logic, anonymized voting, scoring
lib/game/games/captionImages.ts Built-in image library
lib/socket/handlers.ts          Socket.IO event wiring + per-viewer broadcasts
lib/socket/client.ts            Browser socket singleton + reconnect identity
app/page.tsx                    Home: create / join a room
app/room/[code]/page.tsx        Room page: dispatches on gameType + phase
app/room/[code]/components/     Lobby, Leaderboard, PlayerList (shared) +
                                twoTruths/ and mostLikely/ phase UIs
```

## Adding more games

The room/player/socket layer is game-agnostic. To add a game:

1. Add its `GameType` and state to `lib/game/types.ts` (extend the `GameState`
   and `ClientGameView` unions).
2. Create `lib/game/games/<game>.ts` exporting `start`, `vote`, `advance`,
   `sanitize`, and `playerFlags`.
3. Register metadata in `lib/game/registry.ts` and route it in
   `lib/game/engine.ts`.
4. Add phase components under `app/room/[code]/components/<game>/` and wire them
   into `app/room/[code]/page.tsx`.
