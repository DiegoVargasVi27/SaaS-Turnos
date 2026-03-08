# SaaS Turnos MVP

MVP full stack para gestionar reservas de turnos. Incluye API con autenticacion, servicios, reglas de disponibilidad y reserva publica de slots.

## Stack

- `apps/api`: Node.js + Express + Prisma + PostgreSQL
- `apps/web`: React + TypeScript + Vite
- `packages/shared`: validaciones y tipos reutilizables (base)

## Requisitos

- Node.js 20+
- Docker (para PostgreSQL)

## Arranque rapido

1. Instala dependencias:

```bash
npm install
```

2. Levanta la base de datos:

```bash
docker compose up -d
```

3. Configura variables de entorno en API:

```bash
copy apps\api\.env.example apps\api\.env
```

4. Genera cliente Prisma y ejecuta migracion:

```bash
npm run prisma:generate -w apps/api
npm run prisma:migrate -w apps/api -- --name init
```

5. Carga datos demo:

```bash
npm run prisma:seed -w apps/api
```

6. Ejecuta API y frontend (en dos terminales):

```bash
npm run dev:api
npm run dev:web
```

Frontend: `http://localhost:5173`

API: `http://localhost:4000`

## Credenciales demo

- Email: `owner@demo.com`
- Password: `admin12345`
- Business slug: `demo-barberia`

## Endpoints clave

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /services` (auth)
- `POST /services` (auth)
- `GET /availability` (auth)
- `POST /availability` (auth)
- `GET /appointments` (auth, filtros `date` y `status`)
- `GET /appointments/slots`
- `POST /appointments`
- `PATCH /appointments/:id/cancel` (auth)

## Siguiente scope recomendado

- Agregar validacion de timezone por negocio
- Agregar tests de slots y doble reserva
- Agregar panel de agenda diaria con cancelacion/reagenda

## Plan y seguimiento

- Plan de trabajo vivo: `docs/ROADMAP.md`
- Registro por sesion: `docs/WORKLOG.md`
- Flujo de ramas y commits: `docs/GIT_WORKFLOW.md`
