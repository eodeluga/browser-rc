# browser-rc

Local browser automation runtime using Playwright with a Fastify HTTP control plane and WebSocket live control.

## Current scope

This refactor now provides:
- persistent Chrome profile reuse (single configured profile directory)
- in-memory browser session registry
- transport-agnostic runtime services for page and action operations
- HTTP control endpoints for health, sessions, and jobs
- WebSocket live control endpoint for session/page/action commands
- stable outer result envelope for HTTP responses
- extract job flow with optional discovery and schema-driven validation
- run artefacts for jobs (`request.json`, `result.json`, `logs.jsonl`, `page.html`, `trace.zip`, screenshots)
- OpenAPI specification at `openapi/openapi.yaml`
- Swagger UI container support via `docker-compose.yml`

## Environment

Copy `.env.example` to `.env` and adjust values if needed.
The sample file is intentionally minimal for Docker usage; additional runtime variables are optional.

Runtime variables used by code (local defaults):
- `CHROME_EXECUTABLE_PATH` (optional; default unset)
- `CHROME_PROFILE_DIR` (default: `${HOME}/.config/google-chrome/Default`)
- `HTTP_HOST` (default: `127.0.0.1`)
- `HTTP_PORT` (default: `3001`)
- `OUTPUT_BASE_DIR` (default: `./runs`)

Container defaults (defined in `Dockerfile`):
- `CHROME_PROFILE_DIR=/home/node/.config/google-chrome/Default`
- `HTTP_HOST=0.0.0.0`
- `OUTPUT_BASE_DIR=/data/runs`

Compose overrides:
- `HTTP_PORT` is injected into the container and used for dynamic mapping with `"${HTTP_PORT:-3001}:${HTTP_PORT:-3001}"`

## Run

```bash
bun install --frozen-lockfile
bun run dev
```

## Docker (PoC)

Build and run the runtime with Docker Compose:

```bash
docker compose up --build
```

This exposes the runtime on:
- `http://localhost:3001` (or `http://localhost:${HTTP_PORT}` if set)
- `ws://localhost:3001/ws` (or `ws://localhost:${HTTP_PORT}/ws` if set)
- Swagger UI at `http://localhost:8081`

Notes:
- the container binds the service to `0.0.0.0` via Dockerfile defaults
- browser launches in headed mode through `Xvfb` (virtual display)
- host Chrome data is mounted from `${HOME}/.config/google-chrome` to `/home/node/.config/google-chrome`
- run artefacts persist under `./data/docker/runs` mounted to `/data/runs`
- Swagger UI reads the spec from `./openapi/openapi.yaml`
- this is intentionally unauthenticated for local PoC use

## Validate

```bash
bun run test
bun run lint
bun run typecheck
```

## HTTP endpoints

- `GET /health`
- `POST /sessions`
- `GET /sessions`
- `GET /sessions/:sessionId`
- `DELETE /sessions/:sessionId`
- `POST /sessions/:sessionId/goto`
- `POST /sessions/:sessionId/screenshot`
- `POST /jobs`
- `GET /jobs/:jobId`

## WebSocket endpoint

- `ws://<HTTP_HOST>:<HTTP_PORT>/ws`

Supported commands:
- `session.attach`
- `page.goto`
- `page.snapshot`
- `element.click`
- `element.type`
- `artifact.screenshot`
- `session.close`

Emitted events:
- `session.attached`
- `page.navigated`
- `action.started`
- `action.completed`
- `artifact.created`
- `error`

## OpenAPI and Swagger

- OpenAPI file: `openapi/openapi.yaml`
- The spec documents all HTTP endpoints and WebSocket message payload schemas (`WsCommand` and `WsEvent`)
- Swagger UI container is defined in `docker-compose.yml`

## Extract job payload support

`POST /jobs` with `type: "extract"` supports:
- `input.url` (required)
- `input.sessionId` (optional, reuse existing session)
- `input.takeScreenshot` (optional)
- `input.discovery` (optional: interactive elements, repeated content, summary)
- `input.extraction` (optional: object/list extraction definitions)
- `input.normalisationHints` (optional text cleanup controls)
- `input.schema` (optional output validation: `string`, `number`, `boolean`)

## Notes

- The runtime launches Chrome with a persistent Playwright context using `CHROME_PROFILE_DIR`.
- Session and action logic is shared across HTTP and WebSocket transports.
- Job execution writes debuggable run artefacts including request/result payloads, logs, HTML dump, screenshot files, and Playwright trace output.
