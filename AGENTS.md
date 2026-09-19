## Development and Architecture Rules

Keep the project architecture modular, maintainable, and based on clear separation of concerns. Each directory, module, and file should have one well-defined responsibility and should contain only the logic required for that responsibility. Avoid large files that combine unrelated concerns.

For example, if the phone acts as a controller for the game, the controller/input layer should only be responsible for capturing user input, validating/normalizing it when necessary, and forwarding the resulting command or event. It must not contain game movement logic, physics, collision handling, scoring, or other game-domain behavior. Those responsibilities belong to the appropriate game modules. Apply this principle throughout the entire project.

Before making architectural decisions or implementing code that depends on frameworks, libraries, APIs, protocols, or external tools, consult Context7 and the `find-docs` skill. Use current official documentation and current recommended patterns rather than relying on potentially outdated knowledge. When there is a meaningful architectural choice with multiple valid approaches, investigate the current recommended approaches before choosing one.

Avoid duplicated code and duplicated business logic. If functionality, types, constants, validation, utilities, protocol definitions, or other logic is required in multiple places, extract it into an appropriately scoped shared/common module instead of copying it. However, do not create abstractions prematurely for code that is only used once unless the abstraction clearly improves separation of concerns.

Keep dependencies between modules explicit and minimal. Prefer well-defined interfaces, functions, events, or message contracts over modules reaching into each other's internal implementation. A module should know as little as possible about the internal behavior of other modules.

Keep transport/networking concerns separate from domain logic. WebSocket handling, connection management, QR/session pairing, serialization, and message transport should not contain game rules. Likewise, game logic should not depend directly on the details of how messages arrived over the network.

Keep frontend presentation separate from application/domain logic where practical. UI components should primarily handle presentation and user interaction, while reusable behavior and state transitions should live in dedicated modules.

Use clear and consistent naming for files, directories, functions, types, variables, events, and messages. Follow the conventions of the language/framework being used and preserve the existing project conventions when modifying code.

Prefer small, focused functions and modules over large implementations. If a file or function begins handling multiple independent responsibilities, split it into appropriate modules instead of continuing to expand it.

Do not introduce a new dependency when the existing stack or standard library can solve the problem cleanly. When a new dependency is justified, verify its current usage and documentation with Context7 before integrating it.

Do not perform large unrelated refactors while implementing a feature or fixing a bug. Keep changes scoped to the task unless an architectural change is necessary for a correct implementation.

Preserve type safety and explicit contracts wherever supported. Define shared message/event structures instead of passing loosely structured data between the phone controller, server, and game client.

Handle errors explicitly at system boundaries such as network communication, parsing, external APIs, and user input. Do not silently ignore errors.

After making changes, verify that the affected code builds/runs correctly and execute the relevant tests, linters, formatters, or type checks available in the project. Do not consider a task complete if the modified code is known to fail existing checks.

When implementing a new feature, first understand the existing architecture and reuse existing modules and patterns where appropriate. Do not create parallel implementations of functionality that already exists elsewhere in the repository.

Favor simple solutions over unnecessary complexity. The goal is a clean modular architecture, not abstraction for its own sake.

## Input Safety

Treat controller input as transient state. When a controller disconnects, reconnects, loses focus, or becomes inactive, reset all active inputs for that controller. The game must never continue applying a held input after the controller connection has been lost.

Support both press and release events. On the controller, handle pointer cancellation and page visibility changes where relevant.

## WebSocket Protocol

All WebSocket messages must use explicitly defined and typed message structures. Every message must contain a recognized `type`. Validate incoming messages at the network boundary before forwarding them to application or game logic.

Do not forward arbitrary JSON between clients.

Protocol changes must remain synchronized between the frontend and backend. When the protocol becomes stable, introduce an explicit protocol version.

## Backend Concurrency

Treat session and connection state as concurrent shared state. All access to shared maps, sessions, and connection references must be synchronized or owned by a dedicated goroutine.

Each WebSocket connection should have one clearly defined write path. Avoid concurrent writes to the same connection.

Ensure goroutines, timers, and connections are cleaned up when a client disconnects or the server shuts down.

## Session Lifecycle

Define session ownership and lifecycle explicitly. A session should have clear rules for creation, controller attachment, reconnection, replacement, timeout, and deletion.

For the initial implementation, support one game client and at most one active controller per session unless requirements change.

## Configuration

Keep environment-dependent values such as backend URLs, WebSocket URLs, ports, allowed origins, and public controller URLs in configuration or environment variables. Do not hardcode deployment-specific addresses in application logic.

Never commit secrets, private keys, credentials, or production environment files.

## Logging

Log connection, disconnection, session, and protocol errors with enough context to diagnose failures, but never log secrets or unnecessarily sensitive user data.

Expected client errors must not crash the server. Return structured protocol errors where the client can recover or display a useful status.

## Testing

Add tests for domain and protocol behavior that can fail without a browser, especially message validation, session routing, controller replacement, disconnect cleanup, and input reset behavior.

Do not test implementation details when observable behavior can be tested instead.

## Code Quality

Use the project's configured formatter and linter. Format Go code with `gofmt`. Before completing a change, run the narrowest relevant checks and, when practical, the complete frontend and backend validation suites.

Phone Controller
      │
      │ input: LEFT
      ▼
Input / Transport
      │
      │ command
      ▼
WebSocket / Server
      │
      │ event
      ▼
Game Input Handler
      │
      ▼
Game Logic
      │
      ▼
Player Movement
