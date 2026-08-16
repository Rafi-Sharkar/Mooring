# 🔱 Dockhand — Docker Fleet Monitor

Centralized monitoring for Docker containers across your entire fleet. Deploy lightweight agents on any server, monitor them all from a single dashboard.

## Architecture

```
┌─────────────────┐         WSS          ┌──────────────────┐
│  Client EC2 #1   │ ───────────────────► │                  │
│  (hawser agent)  │                      │  Dockhand Server │
└─────────────────┘                      │  (NestJS+Prisma) │
┌─────────────────┐         WSS          │                  │
│  Client EC2 #2   │ ───────────────────► │  - Auth/tokens   │
│  (hawser agent)  │                      │  - WS gateway    │
└─────────────────┘                      │  - Agent registry│
                                          └────────┬─────────┘
                                                   │
                                          ┌────────▼─────────┐
                                          │  Next.js Dashboard│
                                          │  (fleet view)     │
                                          └───────────────────┘
```

## Quick Start with Docker (Recommended)

To run the entire Dockhand stack (Postgres + API + Web Dashboard) in Docker containers:

```bash
docker compose up --build -d
```

- **Dashboard**: [http://localhost:3000](http://localhost:3000)
- **API Health**: [http://localhost:3001/api/health](http://localhost:3001/api/health)
- **Logs**: `docker compose logs -f`
- **Stop**: `docker compose down`

---

## Local Development (Without full Docker)

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker & Docker Compose (for PostgreSQL)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start PostgreSQL

```bash
docker compose up postgres -d
```

### 3. Set up the database

```bash
cp apps/api/.env.example apps/api/.env
pnpm db:generate
pnpm db:push
```

### 4. Start development servers

```bash
pnpm dev
```

- **Dashboard**: http://localhost:3000
- **API**: http://localhost:3001
- **API Health**: http://localhost:3001/api/health

### 5. Add an agent

1. Go to **Settings** in the dashboard
2. Click **"Add Agent"**
3. Enter a name for the server
4. Copy the generated `docker run` command
5. Run it on the target server


## Project Structure

```
server-monitor-agent/
├── apps/
│   ├── api/              # NestJS backend (REST + WebSocket)
│   ├── web/              # Next.js dashboard
│   └── agent/            # Hawser agent (dockerode + WS client)
├── packages/
│   └── database/         # Shared Prisma schema + client
├── docker-compose.yml    # PostgreSQL + full stack
├── turbo.json            # Build orchestration
└── pnpm-workspace.yaml   # Workspace definition
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | NestJS, Prisma, PostgreSQL |
| Dashboard | Next.js 15, React 19 |
| Agent | TypeScript, dockerode, ws |
| Auth | argon2 token hashing |
| Transport | WebSocket (raw ws) |
| Build | Turborepo, pnpm workspaces |
| CI/CD | GitHub Actions → GHCR |

## License

MIT
