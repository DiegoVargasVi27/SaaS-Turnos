# SaaS Turnos

Aplicacion full stack de reservas para negocios de servicios (barberias, esteticas, consultorios, etc.).

Este proyecto nace como portfolio para demostrar criterio de producto y backend real: autenticacion, reglas de disponibilidad, slots publicos y control de agenda sin dobles reservas.

## Que demuestra este proyecto

- Flujo de reserva completo: servicio -> fecha -> horario -> confirmacion.
- Reglas de negocio para evitar solapes y turnos fuera de disponibilidad.
- API con manejo de errores consistente (`code` + `message`).
- Panel operativo para gestionar disponibilidad y agenda diaria.
- Base de tests en API sobre casos criticos de turnos.

## Stack

- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL
- Frontend: React, TypeScript, Vite
- Monorepo: npm workspaces

## Arquitectura (resumen)

- `apps/api`: API REST y logica de negocio
- `apps/web`: interfaz de operacion y validacion del flujo
- `packages/shared`: contratos compartidos y tipos

## Correr en local

Requisitos:

- Node.js 20+
- Docker

Pasos:

```bash
npm install
docker compose up -d
copy apps\api\.env.example apps\api\.env
npm run prisma:generate -w apps/api
npm run prisma:migrate -w apps/api -- --name init
npm run prisma:seed -w apps/api
```

Luego, en dos terminales:

```bash
npm run dev:api
npm run dev:web
```

- Web: `http://localhost:5173`
- API: `http://localhost:4000`

## Credenciales demo (solo entorno local)

- Email: `owner@demo.com`
- Password: `admin12345`
- Business slug: `demo-barberia`

Estas credenciales existen para pruebas locales del seed y no deben usarse en produccion.

## Endpoints principales

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /services` / `POST /services` (auth)
- `GET /availability` / `POST /availability` (auth)
- `GET /appointments` (auth, filtros por fecha/estado)
- `GET /appointments/slots` (publico)
- `POST /appointments` (publico)
- `PATCH /appointments/:id/cancel` (auth)

## Estado actual

- MVP funcional de punta a punta.
- Build y lint en verde.
- Tests de API orientados a reglas de turnos y manejo de errores.

## Proximos pasos de portfolio

- Deploy de API + web en cloud.
- Capturas o demo en video corto del flujo principal.
- Mas cobertura automatica en casos de negocio complejos.

## Documentacion interna

- Roadmap: `docs/ROADMAP.md`
- Worklog: `docs/WORKLOG.md`
- Flujo Git: `docs/GIT_WORKFLOW.md`
