# AGENTS.md

Guide for autonomous coding agents on `saas-turnos`.

## Stack
- **API**: Express 4 + TypeScript + Prisma 6 + PostgreSQL
- **Web**: React 19 + Vite + react-router-dom 7
- **Shared**: Zod schemas (framework-agnostic)
- Runtime: Node.js 20+, npm workspaces

## Setup
```bash
npm install
docker compose up -d
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm run prisma:generate -w apps/api
npm run prisma:migrate -w apps/api -- --name init
npm run prisma:seed -w apps/api
```

## Commands
| Command | Purpose |
|---------|---------|
| `npm run dev:api` | API watch mode |
| `npm run dev:web` | Web dev server |
| `npm run build` | Sequential build |
| `npm run test -w apps/api` | Run API tests |
| `npm run prisma:generate -w apps/api` | Regenerate client |
| `npm run prisma:migrate -w apps/api -- --name <name>` | Create migration |

## Testing pattern
1. Mock Prisma: `vi.doMock("./lib/prisma", ...)`
2. Import dynamically: `const { default: app } = await import("./server")`
3. Reset modules before suite: `vi.resetModules()`
4. Generate real JWT tokens with test secret
5. Assert via `supertest`

## Code style
- `strict: true` everywhere
- Validate with Zod, use `sendError(res, status, code, message)`
- Status codes: 400 · 401 · 403 · 404 · 409 · 500
- Order imports: external → internal → styles

## API routes
**Public**: `GET /health` · `POST /auth/register|login|refresh` · `GET /public/services?businessSlug=` · `GET /appointments/slots` · `POST /appointments`

**Protected** (OWNER/ADMIN): `GET|POST|PATCH|DELETE /services` · `GET|POST /availability` · `GET /appointments` · `PATCH /appointments/:id/cancel`

## Known issues
- `App.tsx` is ~1000 lines; router uses it, not `pages/`. Edit App.tsx for now.
- Shared package not consumed (schemas duplicated in server.ts)
- `server.ts` is monolithic (~740 lines)

## Key files
- `apps/api/src/server.ts` - API entry + routes
- `apps/api/src/middleware/auth.ts` - Auth middleware
- `apps/api/src/lib/slots.ts` - Slot logic
- `apps/api/prisma/schema.prisma` - Database schema
- `apps/web/src/App.tsx` - Web entry

## Rules
- Run build/lint after editing
- Never edit generated artifacts (`dist/`, Prisma client)
- Never commit secrets
- Keep scope tight; avoid unrequested refactors
