# Roadmap SaaS Turnos

Este documento es la fuente de verdad del plan del proyecto.
Actualizalo al cerrar cada sesion.

## Norte del proyecto

- Construir un SaaS de agendamiento que sirva para aprender y mostrar criterio tecnico en entrevistas.
- Priorizar decisiones de producto reales (no solo CRUD): evitar solapes, reglas de disponibilidad, auth y contexto por negocio.
- Mantener alcance MVP y luego iterar por capas.

## Estado actual (2026-03-08)

### Hecho

- Monorepo npm workspaces funcionando (`apps/api`, `apps/web`, `packages/shared`).
- API Express + Prisma con:
  - auth (`/auth/register`, `/auth/login`, `/auth/refresh`)
  - servicios (`GET/POST /services`)
  - disponibilidad (`GET/POST /availability`)
  - slots publicos (`GET /appointments/slots`)
  - reserva (`POST /appointments`)
  - cancelacion (`PATCH /appointments/:id/cancel`)
- Persistencia con PostgreSQL y schema Prisma para negocio, usuarios, roles, servicios y turnos.
- Seed de demo con negocio, owner, servicio y reglas base.
- Frontend React funcional para probar flujo principal de punta a punta.
- `npm run lint` y `npm run build` en verde.

### Pendiente critico para portfolio

- Tests automaticos aun no configurados (ni scripts ni suites).
- Frontend aun orientado a formulario de prueba (falta experiencia de agenda diaria).
- Falta uso completo de contratos compartidos desde `@saas-turnos/shared` en todos los bordes.
- Falta historia de cambios por sesion y estandar de trabajo con ramas/commits.
- Falta deploy y README de portfolio con decisiones tecnicas.

## Plan por fases

## Fase 1 - Base profesional (1 semana)

Objetivo: convertir MVP funcional en MVP defendible.

- [ ] Mover validaciones de request para API a `@saas-turnos/shared` (evitar duplicacion).
- [ ] Estandarizar respuestas de error (`message`, `code`, `issues?`).
- [x] Agregar endpoint autenticado para listar turnos por fecha (`GET /appointments`).
- [x] Agregar filtros minimos (`date`, `status`) para agenda diaria.

## Fase 2 - Calidad y seguridad (1 semana)

Objetivo: agregar capa de confianza tecnica.

- [x] Configurar tests en API (Vitest o Jest) con foco en:
  - [x] generacion de slots
  - [x] deteccion de solapes
  - [ ] validaciones de reserva fuera de disponibilidad
- [x] Agregar script(s) de test en `package.json` y documentarlos.
- [ ] Cobertura minima objetivo: 60% en modulos de reglas de negocio.

## Fase 3 - Frontend de producto (1-2 semanas)

Objetivo: pasar de panel tecnico a app de negocio.

- [ ] Pantalla de agenda diaria (lista de turnos con estados).
- [ ] Crear/cancelar turno desde UI con feedback claro. (cancelacion lista, falta alta en agenda)
- [ ] Estado de carga y errores consistente.
- [ ] Base de diseno simple pero coherente para demo de portfolio.

## Fase 4 - Publicacion y narrativa (3-5 dias)

Objetivo: cerrar proyecto para mostrar a reclutadores/entrevistadores.

- [ ] Deploy API + DB (Render/Fly/Railway o similar).
- [ ] Deploy web (Vercel/Netlify).
- [ ] README final orientado a portfolio:
  - [ ] arquitectura
  - [ ] decisiones y trade-offs
  - [ ] como correr local
  - [ ] datos demo
- [ ] Capturas o gif corto del flujo principal.

## Prioridad inmediata (proxima sesion)

1. Estandarizar formato de errores en API (`message`, `code`, `issues?`).
2. Crear tests adicionales del endpoint `POST /appointments` para flujo exitoso.
3. Permitir alta de turnos desde agenda diaria en frontend.
