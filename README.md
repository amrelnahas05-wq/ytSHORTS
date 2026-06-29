# ytSHORTS 🎬

> Convert long-form videos into viral short-form clips — optimized for YouTube Shorts, TikTok, and Instagram Reels.

## What It Does

ytSHORTS is a full-stack monorepo application that automates the process of taking long videos and intelligently splitting them into short, platform-ready clips. Upload a video, let the processor do the work, and download your clips ready to post.

## Stack

| Layer | Tech |
|---|---|
| Runtime | Node.js 24, TypeScript 5.9 |
| Package manager | pnpm workspaces |
| Frontend | React + Vite + shadcn/ui |
| API | Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod (v4) + drizzle-zod |
| Video processing | FFmpeg |
| API codegen | Orval (from OpenAPI spec) |
| Build | esbuild (CJS bundle) |

## Project Structure

```
ytSHORTS/
├── artifacts/
│   ├── shorts-converter/     # React frontend (Vite)
│   └── api-server/           # Express API server
├── lib/
│   ├── api-spec/             # OpenAPI spec + Orval config
│   ├── api-client-react/     # Generated React query hooks
│   ├── api-zod/              # Generated Zod schemas
│   └── db/                   # Drizzle ORM schema + config
├── package.json              # Root workspace config
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm
- PostgreSQL database

### Setup

```bash
# Install dependencies
pnpm install

# Set environment variables
cp .env.example .env
# Edit .env and set DATABASE_URL=your_postgres_connection_string

# Push DB schema
pnpm --filter @workspace/db run push

# Run the API server (port 5000)
pnpm --filter @workspace/api-server run dev

# Run the frontend (separate terminal)
pnpm --filter @workspace/shorts-converter run dev
```

## Available Scripts

```bash
pnpm run typecheck                              # Full typecheck across all packages
pnpm run build                                  # Typecheck + build all packages
pnpm --filter @workspace/api-server run dev     # Dev API server on port 5000
pnpm --filter @workspace/api-spec run codegen   # Regenerate API hooks & Zod schemas from OpenAPI
pnpm --filter @workspace/db run push            # Push DB schema changes (dev only)
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |

## Features

- 📤 Upload long-form videos
- ✂️ Automatic clip generation via FFmpeg
- 📊 Job queue with real-time progress tracking
- 🎯 Platform targeting (YouTube Shorts, TikTok, Reels)
- 📱 Clean React dashboard to manage clips
- 🔌 REST API with OpenAPI spec + auto-generated client hooks

## License

MIT
