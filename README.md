# Two Truths, One Lie — Real-Time Party Game

A live multiplayer party game for teams. Each player joins a room from their own
device, submits two truths and one lie, and the group votes to spot the liar —
one player in the spotlight at a time, with live reveals and scoring.

Built with **Next.js (App Router, TypeScript)** and a **Socket.IO** real-time
layer running on a single custom Node server.

## How it plays

1. **Lobby** — One person creates a room and shares the 4-letter code. Others join.
2. **Submission** — Everyone writes 3 statements and marks which one is the lie.
3. **Voting** — One player is spotlighted at a time; everyone else guesses the lie.
4. **Reveal** — The lie is revealed, votes shown, and points awarded.
5. **Results** — Final leaderboard. The host can start a new round.

### Scoring

- **+100** to each voter who correctly spots the lie.
- **+50** to the spotlight player for every voter they fool.

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
server.ts                     Custom Node server: Next.js + Socket.IO
lib/game/types.ts             Shared types + socket event contracts
lib/game/store.ts             In-memory room store + room-code generation
lib/game/engine.ts            Authoritative game logic, scoring, sanitization
lib/socket/handlers.ts        Socket.IO event wiring + per-viewer broadcasts
lib/socket/client.ts          Browser socket singleton + reconnect identity
app/page.tsx                  Home: create / join a room
app/room/[code]/page.tsx      Room page: renders the current phase
app/room/[code]/components/   Lobby, SubmissionForm, VotingPanel, RevealPanel,
                              Leaderboard, PlayerList
```

## Adding more games later

The room/player/socket layer is generic; `lib/game/engine.ts` isolates the
Two-Truths phase machine. Additional games (e.g. "Most Likely To",
"Caption This") can be added as sibling engines selected at room creation.
