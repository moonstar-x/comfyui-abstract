<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/banner/banner-horizontal-on-dark.svg" />
    <img src="assets/banner/banner-horizontal-color.svg" alt="ComfyUI Abstract" width="420" />
  </picture>
</p>

# ComfyUI Abstract

A self-hosted web app that puts a simple, multi-user interface on top of a [ComfyUI](https://github.com/comfyanonymous/ComfyUI) server. Instead of handling node graphs, users pick a task such as "generate an image" or "make a cover of this song", choose a model, fill in a short form, and get the result. They can also chat with a local LLM through [LM Studio](https://lmstudio.ai) for help writing prompts.

The server admin decides which ComfyUI workflows and models are available, and which parameters users can change, in a single YAML file. Model paths and other server-side settings are never sent to the browser.

## Features

- **Workflows by task**: image generation, image editing, image upscaling, music generation and music covers. Each task can offer several models.
- **Forms built from the config**: every workflow lists its visible and advanced parameters. The UI renders each one as the right input: text, number, select, toggle, LoRA list, image list or audio file.
- **Live progress** over a WebSocket: queue position, step progress and the ComfyUI system status. CPU, RAM and GPU stats need the Crystools monitor extension.
- **Generation history** for each user, plus a shared feed. Both have grid and post views, a media-type filter and bulk delete.
- **Uploads library**: images and audio uploaded once can be reused as inputs. Any past output can be sent straight into another workflow, for example generate → edit → upscale.
- **LLM chat sidecar** with conversations stored per user, pinning, streamed replies and reasoning output. When a chat is started from a workflow page, the model is told about that workflow and its parameters.
- **Model instructions**: Markdown notes for each model or LoRA, shown next to the form, such as prompting tips or trigger words.
- **Dashboard**: usage stats, daily activity, top models, workflow breakdown, most active users and generation timings.
- **Accounts**: username and password login with JWT sessions, profile pictures, password changes, and sign-up that can be turned on or off.
- Light and dark themes, and a layout that works on phones.

## Architecture

```
┌────────────┐   HTTP /api, SSE    ┌────────────────┐   HTTP + WS   ┌──────────┐
│  UI (Vite, │ ──────────────────▶ │  API (Express, │ ────────────▶ │ ComfyUI  │
│  React 19) │ ◀────────────────── │  ws, Node 24)  │               └──────────┘
└────────────┘   WebSocket /ws     │                │   HTTP (OpenAI-compatible)
                                   │                │ ────────────▶ ┌───────────┐
                                   │                │               │ LM Studio │
                                   └───────┬────────┘               └───────────┘
                                           │
                                     ┌─────▼──────┐
                                     │ PostgreSQL │
                                     └────────────┘
```

| Directory | Contents |
|-----------|----------|
| `api/` | Express 5 + `ws` server written in TypeScript. It talks to ComfyUI through [`@saintno/comfyui-sdk`](https://github.com/tctien342/comfyui-sdk) and to LM Studio through its OpenAI-compatible `/v1` endpoints, and stores data in PostgreSQL. |
| `ui/` | React 19 single-page app built with Vite, Tailwind CSS 4, shadcn/Base UI components, TanStack Query and React Router. |
| `local/` | Docker Compose file that starts a PostgreSQL instance for local development. |
| `Dockerfile` | Multi-stage build that compiles both packages and serves the UI from the API server. |

The REST API is mounted under `/api` and generated files are served from `/public`. Workflows run over the WebSocket at `/ws`. When `APP_BUILD_DIR` is set, the API also serves the built UI and falls back to its `index.html` for client-side routes.

## Requirements

- **Node.js 24** or later (see `.nvmrc`) for development
- **PostgreSQL**. Version 18 is used in `local/docker-compose.yml`.
- **ComfyUI** reachable from the API server, with these custom nodes installed (see `COMFYUI_REQUIRED.txt`):
  - [`ComfyUI-Crystools-MonitorOnly`](https://github.com/BobRandomNumber/ComfyUI-Crystools-MonitorOnly): reports CPU, RAM and GPU stats in the status panel.
  - [`ComfyUI-SimpleUtils`](https://github.com/moonstar-x-libs/ComfyUI-SimpleUtils): provides the `SimpleUtilsDeleteInputFile` node, which removes uploaded files from the ComfyUI input folder when a user deletes them.
  - All custom nodes and model files used by the workflows you enable.
- **LM Studio** with its local server running and the chat model from `config.yml` available. The API key is only needed if you turned on authentication in LM Studio.

## Quick start (Docker)

The image builds both packages and serves everything on a single port.

```bash
docker build -t comfyui-abstract .
```

Prepare `config.yml` and, optionally, a `model_instructions/` directory (see [Configuration](#configuration)), then run:

```bash
docker run -d --name comfyui-abstract \
  -p 4000:4000 \
  -e COMFYUI_URL=http://comfyui-host:8188 \
  -e LMSTUDIO_URL=http://lmstudio-host:1234 \
  -e POSTGRES_HOST=postgres-host \
  -e POSTGRES_USER=comfyui \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DATABASE=comfyui \
  -e JWT_SECRET=change-me-to-a-long-random-string \
  -e ENABLE_SIGNUP=true \
  -v "$PWD/config.yml:/app/api/config.yml:ro" \
  -v "$PWD/model_instructions:/app/api/model_instructions:ro" \
  -v comfyui-abstract-public:/app/api/public \
  comfyui-abstract
```

Open `http://localhost:4000`, create an account, then set `ENABLE_SIGNUP=false` if you don't want anyone else to sign up.

- `config.yml` and `model_instructions/` are excluded from the image and must be mounted at runtime.
- `/app/api/public` holds generated outputs, temporary inputs and profile pictures. Mount a volume there so they survive container restarts.
- Database migrations run automatically on startup.
- The container shuts down cleanly on `docker stop`. It stops accepting connections, lets in-flight requests finish within the default 10-second stop timeout, and then closes the database pool.

## Local development

### 1. Start PostgreSQL

```bash
docker compose -f local/docker-compose.yml up -d
```

This starts PostgreSQL on `localhost:5432` with user `comfyui`, password `password` and database `comfyui`. Data is stored in `local/volumes/postgres`.

### 2. Run the API

```bash
cd api
npm ci
cp .env.sample .env
cp config.sample.yml config.yml
cp -r model_instructions.sample model_instructions
```

Fill in `.env` with at least:

```dotenv
COMFYUI_URL=http://localhost:8188
LMSTUDIO_URL=http://localhost:1234

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=comfyui
POSTGRES_PASSWORD=password
POSTGRES_DATABASE=comfyui

ENABLE_SIGNUP=true
JWT_SECRET=any-long-random-string
```

Then edit `config.yml` so it lists models that exist on your ComfyUI server, and start the watcher:

```bash
npm run dev
```

The dev server restarts when the source, `config.yml` or any model instructions file changes. It applies new migrations on every restart.

### 3. Run the UI

```bash
cd ui
npm ci
cp .env.sample .env
```

In development the UI runs on its own origin, so point it at the API:

```dotenv
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000/ws
```

```bash
npm run dev
```

Open the URL Vite prints, usually `http://localhost:5173`. Both variables can be left empty in production when the API serves the UI. They then default to the page's own origin and `/ws`.

### Scripts

Both `api/` and `ui/` provide:

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the dev server (`tsx watch` for the API, Vite for the UI). |
| `npm run build` | Compile to `dist/`. |
| `npm run typecheck` | Type-check without emitting. |
| `npm run lint` / `npm run lint:fix` | Run ESLint. |

The API also has `npm start`, which runs the compiled server. The UI also has `npm run preview`, which serves the production build.

## Configuration

### Environment variables (API)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | HTTP and WebSocket port. |
| `TRUST_PROXY` | `false` | Set when the API runs behind a reverse proxy so login limits see each client's IP instead of the proxy's. Use the number of proxies in front of the API, such as `1`, or a comma-separated list of their addresses. Avoid `true` unless every request goes through a proxy you control, since clients could then fake their IP. |
| `COMFYUI_URL` | *required* | Base URL of the ComfyUI server. |
| `COMFYUI_UPLOAD_SUBFOLDER` | `comfyui-abstract` | Subfolder of the ComfyUI input directory where user uploads are placed. It may contain only letters, digits, `_`, `-` and `/`. |
| `LMSTUDIO_URL` | *required* | Base URL of the LM Studio server. A path prefix, such as one added by a reverse proxy, is kept. |
| `LMSTUDIO_API_KEY` | *empty* | Sent as a bearer token to LM Studio when set. |
| `POSTGRES_HOST` | *required* | |
| `POSTGRES_PORT` | `5432` | |
| `POSTGRES_USER` | *required* | |
| `POSTGRES_PASSWORD` | *required* | |
| `POSTGRES_DATABASE` | *required* | |
| `POSTGRES_MAX_CONNECTIONS` | `25` | Size of the connection pool. |
| `JWT_SECRET` | *required* | Secret used to sign session tokens. |
| `JWT_EXPIRATION` | `7d` | Session lifetime, for example `12h` or `30d`. |
| `ENABLE_SIGNUP` | `false` | Allows new accounts to be created from the sign-up page. |
| `MAX_IMAGE_UPLOAD_MB` | `20` | Maximum size of each uploaded image. |
| `MAX_AUDIO_UPLOAD_MB` | `50` | Maximum size of each uploaded audio file. |
| `PUBLIC_DIRECTORY` | `public` | Where outputs and profile pictures are written. They are served at `/public`. |
| `CONFIG_FILE` | `config.yml` | Path to the app config. |
| `MODEL_INSTRUCTIONS_DIRECTORY` | `model_instructions` | Directory of model instruction files. It is optional. |
| `APP_BUILD_DIR` | *empty* | Directory of the built UI. When set, the API serves the UI too. The Docker image sets it to `/app/ui`. |

Relative paths are resolved against the API's working directory.

### Environment variables (UI)

These are read when the UI is built.

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | page origin | Base URL of the API. |
| `VITE_WS_URL` | `ws(s)://<page origin>/ws` | URL of the WebSocket endpoint. |

### `config.yml`

The config file chooses the chat model and lists every workflow users can run. `api/config.sample.yml` is a full example.

```yaml
lmstudio:
  model: 'qwen/qwen3-8b'   # model id as listed by LM Studio's /v1/models
  contextLength: 8192      # context length the model is loaded with; older messages are trimmed to fit

workflows:
  - alias: krea2-turbo              # name shown to users; unique for each type
    workflow: image-generate-krea2  # id of a workflow implementation (see below)
    type: image-generate            # must match the implementation's type
    serverParams:                   # fixed by the server and hidden from users
      model: 'krea2\krea2_turbo_int8_convrot.safetensors'
      clip: 'krea2\qwen3vl_4b_fp8_scaled.safetensors'
      vae: 'qwen-image\qwen_image_vae.safetensors'
    params:
      defaults:                     # pre-filled values users can still change
        steps: 8
    options:
      allowedLoras:                 # LoRAs users may pick; the LoRA field is hidden if empty
        - 'krea2\krea2_darkbrush.safetensors'
```

How parameters are combined:

- A run uses the workflow's built-in defaults, overridden by `params.defaults`, then by the user's input, then by `serverParams`.
- Users can only send parameters the workflow exposes and that aren't in `serverParams`. Anything else is rejected, and so is any LoRA not listed in `allowedLoras`.
- Model paths are written exactly as ComfyUI expects them. The sample uses Windows-style `\` separators because its ComfyUI server runs on Windows.

The config is checked on startup. The server refuses to start if a workflow id or type is unknown, an alias is defined twice for the same type, a parameter doesn't exist, or `allowedLoras` is set on a workflow without LoRA support. It also warns if the LM Studio model can't be found.

#### Available workflows

| Type | Workflow id | Notes |
|------|-------------|-------|
| `image-generate` | `image-generate-qwen-image-2.1` | Qwen Image 2.1 text-to-image |
| `image-generate` | `image-generate-krea2` | Krea 2, supports LoRAs |
| `image-edit` | `image-edit-qwen-image-2.1` | Qwen Image 2.1 edit with reference images |
| `image-upscale` | `image-upscale-esrgan` | Any ESRGAN-style upscale model (`.pth` / `.safetensors`) |
| `image-upscale` | `image-upscale-seedvr2` | SeedVR2 |
| `image-upscale` | `image-upscale-z-image` | Z-Image Turbo with model-based upscaling |
| `music-generate` | `music-generate-minimax-music3` | MiniMax Music 3 |
| `music-generate` | `music-generate-yue2` | YuE 2 |
| `music-cover` | `music-cover-yue2` | YuE 2 cover of an uploaded song |

One implementation can be listed several times under different aliases. The sample config does this with `image-upscale-esrgan` to offer several upscale models.

### Model instructions

Every `.yml` file under `MODEL_INSTRUCTIONS_DIRECTORY`, including nested ones, is merged into one map. Each key is a diffusion model (`serverParams.model`) or LoRA name, written exactly as in `config.yml`, and each value is Markdown. The workflow form shows the instructions for the selected model and for each LoRA the user picks.

```yaml
'krea2\krea2_turbo_int8_convrot.safetensors': |
  **Krea 2 Turbo**

  Works best with short, descriptive prompts.

'krea2\krea2_darkbrush.safetensors': |
  **Darkbrush**

  Trigger word: `darkbrush style`.
```

Describing the same model in two files is an error. The server logs a warning on startup for entries that match no model in the config.

## Adding a workflow

1. In ComfyUI, export the workflow in **API format** and save it under `api/src/workflows/_json/<type>/<id>.json`.
2. Create a class in `api/src/workflows/<type>/` that extends `ComfyUiWorkflow`. Look at `ImageGenerateWithKrea2.ts` for an example. It defines:
   - a static `id`, `type` and `fields` (how each parameter is shown in the UI, often reused from that type's `fields.ts`),
   - a Zod `schema` for the parameters, usually defaulting to the values saved in the JSON,
   - `visibleParams`, `advancedParams` and `outputNodeId`,
   - `buildPrompt()`, which maps the parameters onto node inputs with `PromptBuilder`.
3. Add the class to `WORKFLOW_IMPLEMENTATIONS` in `api/src/workflows/factory.ts`.
4. Reference the new `workflow` id from `config.yml`.

A new workflow *type* also requires adding it to `WORKFLOW_TYPES` in `api/src/workflows/types.ts`, and to the matching definitions in `ui/src/core/workflows/`.

## API overview

All routes are under `/api`. Every route except `GET /health`, `POST /auth/login` and `POST /users` requires an `Authorization: Bearer <token>` header.

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/health` | Health check. |
| `POST` | `/auth/login` | Log in and receive a JWT. Limited to 20 attempts per IP and 10 per username every 15 minutes; over the limit it returns `429` with a `Retry-After` header. |
| `POST` | `/users` | Sign up. Only works when `ENABLE_SIGNUP=true`. |
| `PATCH` | `/users/me` | Change your profile picture URL. |
| `PUT` | `/users/me/password` | Change your password. Logs out every other session and returns a new token. |
| `PUT` | `/users/me/picture` | Upload a profile picture. |
| `GET` | `/users/me/uploads` | List your uploads. |
| `GET` | `/users/me/generations/count` | Count your generations. |
| `GET` | `/users/:username/generations` | A user's generation history. |
| `GET` | `/workflows/:type` | Form definitions for every configured model of a type. |
| `GET` / `DELETE` | `/generations` | Shared feed, and bulk delete of your generations. |
| `GET` | `/generations/users` | Users who have generations. |
| `DELETE` | `/generations/:id` | Delete one of your generations. |
| `POST` | `/generations/:id/outputs/:index/input` | Reuse an output as a workflow input. |
| `POST` | `/uploads/:kind` | Upload an `image` or `audio` file. |
| `GET` | `/uploads/:id/file` | Download an upload. |
| `DELETE` | `/uploads`, `/uploads/:id` | Delete uploads. |
| `GET` | `/conversations`, `/conversations/:id` | List or read chat conversations. |
| `PATCH` / `DELETE` | `/conversations/:id` | Pin, unpin or delete a conversation. |
| `POST` | `/messages` | Send a chat message. The reply is streamed as server-sent events (`conversation`, `reasoning`, `delta`, `done`, `error`). |
| `GET` | `/dashboard` | Usage statistics. |

The WebSocket at `/ws` accepts JSON messages that each carry the user's `token`: `run_workflow`, `cancel_run`, `get_runs`, `get_queue`, `get_status` and `comfyui_free_up_memory`. The server pushes progress, results and ComfyUI status updates back to the client.

Runs don't depend on the connection that started them. The API keeps a single connection to ComfyUI and stores every queued run until its outputs are saved, so a run survives a dropped connection, a page reload or an API restart. Its progress and result go to every open connection of the user, and `get_runs` returns the user's runs still in flight after a reconnect.

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
