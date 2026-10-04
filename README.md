# Pisica din campus (Campus Cat)

A browser-based, top-down 2D game for OSUT at the UTCN Observator campus. The game runs on a laptop, large display, or projector, while a phone becomes the controller by scanning a QR code. Players do not need to install an app.

Explore the campus as a cat, visit OSUT stands, answer trivia questions, and collect medals. There are currently **14 stands**. Before starting a round, the host chooses a medal target: **4, 8, or 14** using presets, or any whole number from **1 to 14**.

The application UI, trivia content, and map editor currently use Romanian. This README documents the project in English.

## Contents

- [Features](#features)
- [Technology and Architecture](#technology-and-architecture)
- [Requirements](#requirements)
- [Local Setup](#local-setup)
- [Configuration](#configuration)
- [Gameplay](#gameplay)
- [Project Structure](#project-structure)
- [Realtime Protocol](#realtime-protocol)
- [Campus Map and Editor](#campus-map-and-editor)
- [Trivia Customization](#trivia-customization)
- [Graphics and Customization](#graphics-and-customization)
- [Commands and Verification](#commands-and-verification)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)
- [Current Limitations](#current-limitations)

## Features

- QR pairing between the game display and a mobile D-pad controller.
- Four-direction movement and an action button, plus keyboard input during gameplay.
- A campus with dormitories, OSUT offices, roads, gates, fences, sports areas, a cinema area, parking, and surrounding woodland.
- Four-answer trivia, hints, wrong-answer markers, and per-stand retry cooldowns.
- Configurable medal targets, a completion screen, and replay.
- Live movement-speed adjustment, remembered in the browser.
- Pairing-code rotation for handing the game over to another player.
- WebSocket reconnection, server keepalive, and input resets after connection changes.
- A browser map editor that writes layout data directly into the source tree.
- Map rendering, geometry validation, frontend tests, and backend tests.

## Technology and Architecture

| Layer | Implementation |
| --- | --- |
| Application UI | React 19, TypeScript, React Router 7 |
| Game engine | Phaser 3 with Arcade Physics |
| Frontend tooling | Vite 8, TypeScript 6, ESLint 10 |
| QR rendering | `qrcode.react` |
| Backend | Go 1.23, `github.com/coder/websocket` |
| Tests | Node.js built-in test runner and Go testing package |
| Map tools | Node.js TypeScript scripts and a local HTTP editor server |

The phone sends button presses and releases to the Go backend over WebSocket. The backend validates messages and relays them to the game display. **Simulation, collisions, trivia, and medal progress run in the game browser**, not on the backend.

React manages routing, pairing, connection status, and host controls. Phaser manages gameplay scenes. `GameBridge` connects them: the game loop reads mutable input objects, while coarse status updates such as medal counts are published to React. `GameInput` preserves quick taps so presses between frames can still be sampled.

Each backend process has one shared hub with **one game connection and one controller connection**. There are no independent rooms for multiple simultaneous games.

## Requirements

- **Go 1.23 or newer**, as declared in [backend/go.mod](backend/go.mod).
- **Node.js 22.18 or newer recommended**, with npm. Use a release supporting native TypeScript execution because the map commands execute `.ts` scripts directly. Tests also use `--experimental-strip-types`.
- Modern desktop and mobile browsers with WebSocket support.
- A network that lets the phone reach the computer's frontend address.
- An installed Chrome or Microsoft Edge executable recognized by `render-map.ts` for blueprint rendering.

## Local Setup

These examples use PowerShell and start from the repository root. Replace `192.168.1.20` with the computer's actual LAN IP address; `ipconfig` can help identify it.

### 1. Start the backend

In the first terminal:

```powershell
cd backend
go mod download
$env:PORT = "8080"
$env:ALLOWED_ORIGINS = "localhost:5173,127.0.0.1:5173,192.168.1.20:5173"
go run ./cmd/server
```

The backend listens on all interfaces on port `8080` by default.

| Endpoint | Purpose |
| --- | --- |
| `/ws` | WebSocket connections for game and controller |
| `/healthz` | JSON health response: `{"status":"ok"}` |

The backend reads process environment variables. **It does not automatically load a `.env` file**, including the provided `backend/.env.example`.

### 2. Start the frontend

In another terminal, starting from the repository root:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
```

Edit `frontend/.env`:

```dotenv
VITE_PUBLIC_APP_URL=http://192.168.1.20:5173
VITE_REALTIME_URL=
BACKEND_URL=http://127.0.0.1:8080
```

Then start Vite:

```powershell
npm run dev
```

Vite accepts LAN connections and proxies `/ws` to the backend. With this setup, the phone only needs access to frontend port `5173`.

### 3. Pair and play

1. Open `http://192.168.1.20:5173/game` on the computer.
2. Choose the round's medal target in the lobby.
3. Scan the QR code with the phone to open `/controller?s=<pairing-token>`.
4. When the controller connects, the game display navigates to `/game/start`.
5. Press **ACTION** on the phone to enter `/game/play`.

The game-page component and connection remain mounted across these phases. Existing gameplay is paused while the canvas is hidden in the lobby or start screen. The target becomes fixed when the round's game instance is created.

Use the LAN address on both devices. A QR URL containing `localhost` points to the phone itself, not the computer.

## Configuration

### Frontend

See [frontend/.env.example](frontend/.env.example).

| Variable | Purpose |
| --- | --- |
| `VITE_PUBLIC_APP_URL` | Public HTTP/HTTPS origin used for the controller QR and default WebSocket address. Include a port if needed, but no path, query, credentials, or fragment. Empty means use the current page's origin. |
| `VITE_REALTIME_URL` | Optional full `ws://` or `wss://` endpoint for a separately hosted realtime service. Empty means derive `/ws` from the public app origin. |
| `BACKEND_URL` | Internal destination for Vite's local WebSocket proxy, normally `http://127.0.0.1:8080`. Not exposed to browsers. |

An HTTP app origin derives a `ws://` endpoint; HTTPS derives `wss://`. Vite's serve configuration requires either `BACKEND_URL` or `VITE_REALTIME_URL`.

Restart Vite after changing environment files. Production `VITE_*` values are embedded during compilation and require a new build when changed. They are public configuration, not secrets.

### Backend

See [backend/.env.example](backend/.env.example).

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8080` | HTTP and WebSocket listening port. |
| `ALLOWED_ORIGINS` | Unset | Comma-separated host patterns for additional permitted WebSocket origins, such as `localhost:5173,192.168.1.20:5173`. Same-origin acceptance is handled by the WebSocket library. |

Set variables in the shell or deployment environment launching Go. If the monitor opens `localhost` while the configured public origin is a LAN address, allow the monitor's origin too. If realtime uses a separate domain, allow the frontend's public host.

## Gameplay

### Player controls

| Phone button | On the map | In trivia |
| --- | --- | --- |
| Up | Move up | Select answer 1 |
| Right | Move right | Select answer 2 |
| Down | Move down | Select answer 3 |
| Left | Move left | Select answer 4 |
| ACTION | Open a nearby stand | Return to the map |

Directional presses submit answers immediately; there is no separate confirmation button.

During active gameplay, the computer also accepts **arrow keys or WASD**, with **Space or Enter** for ACTION. Pairing and the phone's ACTION button are used for normal startup; keyboard controls are available once gameplay starts.

### Trivia and completion

- Enter a stand's interaction radius to see the open prompt. The radius is currently `110` world units.
- A wrong answer stays marked for the round, reveals the hint, and starts a **10-second cooldown** at that stand. Players may leave and explore while waiting.
- A correct answer awards one medal for that stand and displays a green completion marker.
- Reaching the chosen medal target opens the completion scene.
- Medal counts appear in both the game HUD and host toolbar.

### Host controls

| Control | Behavior |
| --- | --- |
| Medal target | Choose 4, 8, or 14, or enter an integer from 1 to 14 before starting. Locked during a round. |
| Reset game | Destroy the current game instance and clear progress. Return to the start screen if a phone is connected, otherwise to the lobby. |
| New QR code | Rotate the pairing token, disconnect the old controller, release input, and return to the lobby. Existing round progress is retained. |
| Connection screen | Display the lobby and pause the game. The return-to-game control resumes the retained round. |
| Speed | Adjust from `0.4x` to `2.5x`; Normal restores `1.0x`. |
| Play again | Reset after completion and prepare another round. |

The world's base speed is `290` units per second, multiplied by the slider value. Speed is stored in `localStorage` under `pisica:speed-scale`.

**Round progress is in memory only.** Reloading the game page loses medals, wrong-answer markers, hints, and cooldowns. Generating a new QR code and resetting a round are separate operations.

## Project Structure

```text
backend/
  cmd/server/main.go             HTTP routes, environment config, shutdown
  internal/realtime/
    message.go                   Protocol definitions and validation
    hub.go                       Active peers, session tokens, input relay
    handler.go                   Handshake, read loop, keepalive
    client.go                    Outgoing message queue and socket writes
    *_test.go                    Backend tests
  .env.example
  go.mod
  go.sum

frontend/
  src/
    App.tsx                      Application routes
    config/                      App and realtime URL resolution
    components/                  QR and controller button components
    pages/
      GamePage.tsx               Active host, phases, and round controls
      GameStartPage.tsx          Start-screen content
      ControllerPage.tsx         Mobile controller
    realtime/
      protocol.ts                Typed messages and incoming validation
      RealtimeClient.ts          Socket lifecycle and reconnection
      useRealtimeClient.ts       React integration
    game/
      index.ts                   Active Phaser factory and keyboard input
      GameInput.ts               Held input and quick-tap handling
      bridge.ts                  React/Phaser bridge and round state
      campus.layout.ts           Editor-managed layout data
      campus.ts                  Map types, geometry, derived scenery
      trivia.ts                  Questions, answers, hints, cooldown
      palette.ts                 Procedural graphics colors
      textures.ts                Canvas-generated environment textures
      catAnimations.ts           Cat loading and animation frames
      assets/cat/                Cat PNG artwork and walking sheets
      entities/Player.ts         Movement and animations
      scenes/BootScene.ts        Assets, textures, animation setup
      scenes/WorldScene.ts       Campus, collisions, interaction, HUD
      scenes/TriviaScene.ts      Trivia UI and answer processing
      scenes/GameOverScene.ts    Completion screen
      scenes/Gameover.png        Completion artwork
    assets/                      Application artwork
  scripts/
    check-map.ts                 Layout validation
    render-map.ts                Blueprint generation
    map-editor/
      server.ts                  Editor server and save endpoints
      editor.html                Browser editor
      refs/                      Aerial, plan, and OSM references
  tests/                         Input, bridge, URL, reachability tests
  public/                        Public icons
  .env.example
  package.json
  vite.config.ts
```

Alternate modules such as `createGame.ts`, `GameScene.ts`, `GameSessionLayout.tsx`, and `PlayingPage.tsx` also exist. The current routed campus experience uses `GamePage.tsx` and the factory exported by `game/index.ts`.

## Realtime Protocol

Messages are JSON objects over `/ws`. Definitions are maintained in [message.go](backend/internal/realtime/message.go) and [protocol.ts](frontend/src/realtime/protocol.ts).

1. The first message must be a `join` within **10 seconds**, specifying role `game` or `controller`.
2. The game receives a server-generated pairing token. Reconnecting with the current token can preserve it.
3. Controllers must present the current token. Missing or stale tokens are rejected with close code **1008**.
4. A new connection for an occupied role replaces the previous connection.
5. The server reports peer status and relays controller input to the game.

Example game handshake:

```json
{"type":"join","role":"game"}
```

Controller handshake:

```json
{"type":"join","role":"controller","session":"<pairing-token>"}
```

Button press and release:

```json
{"type":"input","key":"up","pressed":true}
{"type":"input","key":"up","pressed":false}
```

| Type | Direction | Purpose |
| --- | --- | --- |
| `join` | Client to server | Identify role and session token. |
| `input` | Controller to server to game | Press/release `up`, `down`, `left`, `right`, or `action`. |
| `input_reset` | Controller to server to game; also server to game | Release held input. A controller reset message must contain no additional fields. |
| `new_session` | Game to server | Rotate the token and disconnect the previous controller. |
| `session` | Server to game | Deliver the pairing token in `session`. |
| `status` | Server to client | Report connection and peer state. |
| `error` | Server to client | Send an error `code` and explanatory `message`. |

Status values are `connected`, `controller_connected`, `controller_disconnected`, `game_connected`, and `game_disconnected`.

Tokens contain **16 cryptographically random bytes**, encoded as URL-safe Base64. Incoming WebSocket messages have a **4 KiB read limit**. Keepalive pings run every **15 seconds**, with a **10-second pong timeout**.

The frontend retries ordinary disconnects with exponential backoff and jitter, with the base delay capped at 15 seconds. Policy rejections require resolving the pairing issue. Controller replacement, disconnection, focus loss, and visibility changes have input release/reset handling.

Pairing tokens authorize the controller. The game-screen role has no separate host authentication.

## Campus Map and Editor

### Map data and geometry

[campus.layout.ts](frontend/src/game/campus.layout.ts) stores world dimensions, spawn position, buildings and wings, roads, stands, zones, fences, gates, and forests. The current world is **8580 x 4060 units**.

[campus.ts](frontend/src/game/campus.ts) defines types and derives collision geometry, label anchors, trees and bushes, roadside lamps and benches, and parked cars.

- Buildings support whole-block rotation and independent wing rotation. Wings can be separated to allow passage between them.
- Rotated solids use axis-aligned collision slabs because Arcade Physics bodies are not rotated polygons.
- Fences are independent open or closed polylines. Nearby gates cut openings; open fence endpoints can also leave passages.
- Forest rectangles generate decorative woodland and have no solid colliders.
- Building, zone, and gate names support `labelOffset`. Stand names are painted on banners; gate signs have separately editable text.
- Roads require unique IDs and at least two vertices. Roadside decoration refers to road IDs, so renaming roads may require updating `campus.ts`.

### Open the editor

From `frontend/`:

```powershell
npm run map:edit
```

Open `http://localhost:5174`. The editor uses reference images in `scripts/map-editor/refs/`. Its local API exposes `GET /api/layout` to read and `POST /api/layout` to save.

Saving rewrites **only `src/game/campus.layout.ts`** and preserves a one-step backup at `campus.layout.ts.bak`. It does not rewrite `campus.ts`. This file-writing tool is intended for local development, not public hosting.

| Operation | Interaction |
| --- | --- |
| Move an object or individual wing | Drag it. |
| Resize | Drag the lower-right handle. |
| Move an entire building | Drag its center square or Ctrl-drag. |
| Rotate a building | Drag the blue handle. |
| Rotate a wing | Select it and drag the green handle. |
| Add, duplicate, delete a wing | Use the properties panel. |
| Add a road or fence | Choose the add command, click vertices, and finish with at least two vertices. |
| Add a forest | Choose the add command and drag a rectangle. |
| Rename a label | Double-click the text; Enter saves and Esc cancels. |
| Move a label | Drag it; restore its automatic anchor in properties. |
| Edit a gate sign | Use the sign field in properties. |
| Add a road vertex | Double-click the road. |
| Remove a vertex | Right-click it. |
| Align the reference | Fit it to the world, then Shift-drag. |
| Pan/zoom | Space-drag or middle-button drag; mouse wheel to zoom. |
| Disable snapping | Hold Alt. |
| Undo/save | Ctrl+Z / Ctrl+S. |

The drawing toolbar removes the last vertex, finishes, or cancels a line. The validation panel highlights issues while editing. Open fence endpoints have orange markers; label anchors are marked in yellow.

### Check changes

```powershell
npm run map:check
npm run map
```

`map:check` reports geometry issues including overlaps, road obstructions, duplicate IDs, incomplete roads, and stands too far from roads. It exits with a nonzero code if problems are found.

`map` generates `scripts/out/campus.html` and `scripts/out/campus.png` using an installed browser in headless mode. Inspect the blueprint and run the reachability tests after substantial layout edits. Geometry checks do not replace playing through the map.

## Trivia Customization

Edit [frontend/src/game/trivia.ts](frontend/src/game/trivia.ts). Each stand has one question, exactly four answers, a zero-based correct index, and a hint:

```ts
polihack: {
  question: 'Which event is a 48-hour coding competition?',
  answers: ['Event A', 'Event B', 'PoliHack', 'Event D'],
  correct: 2,
  hint: 'Think of the OSUT hackathon.',
},
```

`correct: 0` means answer 1, `1` means answer 2, and so on. The type restricts answers to a four-item tuple and the correct index to `0 | 1 | 2 | 3`. `COOLDOWN_MS` is currently `10_000`.

Current stand IDs:

```text
bal-bobocilor   polihack       sport-sanatate   viitor-inginer
infotech       divertisment   imagine          it
media          pr             tehnic           tineret
financiar      educational
```

Questions are populated. Many hints still use the generic Romanian text `Indiciu`; review questions, answer keys, dates, and hints before a new event.

When adding/removing stands, update the `StandId` union in `campus.ts`, the layout's stands, and the `TRIVIA` record together. Review the medal presets in `GamePage.tsx`, which currently contain a literal `14`.

## Graphics and Customization

Most environment textures are generated with Canvas 2D in [textures.ts](frontend/src/game/textures.ts) during boot. [palette.ts](frontend/src/game/palette.ts) centralizes procedural colors. World objects use depth sorting to place the cat in front of or behind scenery.

The project also uses **bitmap artwork**, including cat idle/walking PNGs, application images, map references, and completion artwork. [catAnimations.ts](frontend/src/game/catAnimations.ts) defines frame crops and timing. Walking sheets are expected to be `1774 x 887` pixels, with eight frames at 10 fps. Replacing sheets may require changing frame definitions.

The active canvas has a **1280 x 720** logical resolution, with Phaser FIT scaling and centered alignment. The camera follows the player inside the larger world.

| Customization | Main files |
| --- | --- |
| Map positions, spawn, dimensions | `campus.layout.ts`, preferably through the editor |
| Geometry, scenery, interaction radius | `campus.ts` |
| Environment appearance | `textures.ts`, `palette.ts` |
| Cat appearance and animations | `assets/cat/`, `catAnimations.ts`, `entities/Player.ts` |
| Questions and retry delay | `trivia.ts` |
| Movement speed | `WorldScene.ts` base speed, `bridge.ts` limits |
| Round targets and page flow | `GamePage.tsx` |
| Completion screen | `GameOverScene.ts`, `Gameover.png` |
| Application styles | `App.css`, `index.css`, page/component files |
| Realtime behavior | Frontend `realtime/`, backend `internal/realtime/` |

## Commands and Verification

Run frontend commands from `frontend/`:

| Command | Purpose |
| --- | --- |
| `npm ci` | Install locked dependencies. |
| `npm run dev` | Start the LAN-accessible development server. |
| `npm run build` | Check TypeScript projects and build assets into `dist/`. |
| `npm run preview` | Preview the production build locally. |
| `npm run lint` | Run ESLint. |
| `npm test` | Run the Node.js test suite. |
| `npm run test:input` | Run focused input tests. |
| `npm run map:edit` | Start the editor on port 5174. |
| `npm run map:check` | Validate layout geometry and IDs. |
| `npm run map` | Generate blueprint HTML and PNG. |

Frontend tests cover held inputs, short taps, resets, bridge actions, medal targets and completion, URL configuration, and campus reachability.

Run backend commands from `backend/`:

```powershell
go test ./...
go vet ./...
go build -o server ./cmd/server
```

On Windows, use `-o server.exe` to give the executable an explicit Windows extension. Backend tests cover message validation, hub behavior, pairing, and WebSocket handling.

For manual verification, pair a phone, start a round, press/release each direction, submit wrong and correct answers, check cooldowns, reach the target, replay, reconnect the phone, and rotate the QR code. Unit tests do not replace browser/device integration checks.

## Production Deployment

The application needs both a static frontend and a running Go service.

1. Configure the public origin before building, for example `VITE_PUBLIC_APP_URL=https://game.example.com`. Leave it empty to use the deployed page's origin.
2. Run `npm ci` and `npm run build` in `frontend/`, then serve `frontend/dist/`.
3. Build/run the backend with the appropriate process environment variables.
4. Serve `index.html` as the fallback for application routes, including `/game`, `/game/start`, `/game/play`, and `/controller`.
5. Reverse-proxy `/ws` to Go with WebSocket upgrades and suitable long-lived connection timeouts.
6. Use HTTPS for the frontend and WSS for realtime connections.

Vite's `server.proxy` is **development-only** and is not included in the static build. Uploading `dist/` does not deploy the backend. `vite preview` is for local inspection, not production hosting; realtime connectivity must still be configured.

For a separate realtime domain, set `VITE_REALTIME_URL=wss://realtime.example.com/ws` before building and allow the frontend host on the backend.

Backend restarts lose pairing tokens and require fresh pairing. Multiple backend replicas do not share hub state or tokens. The game role has no separate authentication, so hosting access should reflect the intended single-display event setup.

## Troubleshooting

| Symptom | Checks |
| --- | --- |
| QR opens localhost on the phone | Set a LAN `VITE_PUBLIC_APP_URL`, restart Vite, and scan again. |
| Phone cannot open the controller | Check IP, port, firewall, and Wi-Fi client isolation. |
| Vite reports missing backend configuration | Set `BACKEND_URL` or `VITE_REALTIME_URL` in `frontend/.env`. |
| WebSocket is rejected | Check allowed origins and confirm variables reached the Go process. |
| Pairing is stale or rejected | Scan the current QR; rotated tokens invalidate old links. |
| Production route returns 404 | Add an `index.html` fallback for SPA routes. |
| Production UI loads but cannot connect | Check backend health, WebSocket upgrades, WSS, origins, and build-time URLs. |
| Port 5173 is occupied | Stop the process you own or use `npm run dev -- --port 5175`; update origins. Vite uses strict port handling. |
| Editor port 5174 is occupied | Check for an already running editor at `http://localhost:5174`. The editor port is fixed. |
| Map scripts reject TypeScript syntax | Use Node.js with native TypeScript execution, such as the recommended 22.18+ release. |
| Renderer cannot locate a browser | Inspect supported Chrome/Edge paths in `findBrowser()` in `render-map.ts`. |
| Refresh loses progress | Expected: round state exists only in the game page's memory. |

## Current Limitations

- One active game and one controller per backend process; no independent rooms or simultaneous multiplayer.
- No server-side gameplay authority, persistent progress, accounts, leaderboard, or database.
- No separate authentication for the game-screen role.
- No sound implementation in the active gameplay flow.
- Romanian UI and trivia without a language-selection system.
- Generic hints and event-specific content requiring editorial review.
- A local file-writing map editor rather than a hosted content-management system.
- No deployment automation or browser/device end-to-end test command in the current project scripts.
