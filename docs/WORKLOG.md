# Worklog

Registro breve por sesion para no perder continuidad.

## Plantilla

### YYYY-MM-DD - Sesion N

- Objetivo de la sesion:
- Avances:
  -
- Bloqueos:
  -
- Decisiones tomadas:
  -
- Proximo paso (primera tarea de la siguiente sesion):
- Commit(s) asociados:

## 2026-03-08 - Sesion 1

- Objetivo de la sesion: revisar estado real del proyecto y definir plan persistente.
- Avances:
  - Auditoria de estructura y alcance actual del monorepo.
  - Verificacion de estado tecnico: `npm run lint` y `npm run build` exitosos.
  - Creacion de documentacion de roadmap y flujo de trabajo.
  - Inicializacion de repositorio git local en rama `main`.
- Bloqueos:
  - No hay tests configurados todavia.
- Decisiones tomadas:
  - Mantener enfoque MVP y atacar primero agenda diaria + tests de reglas de slots.
  - Usar este `WORKLOG.md` como memoria entre sesiones.
- Proximo paso (primera tarea de la siguiente sesion): implementar `GET /appointments` con filtros por fecha/estado.
- Commit(s) asociados: pendiente (sin commit aun).

## 2026-03-08 - Sesion 2

- Objetivo de la sesion: avanzar en agenda diaria y base de testing.
- Avances:
  - Endpoint nuevo `GET /appointments` autenticado con filtros `date` y `status`.
  - UI de agenda diaria en frontend conectada al endpoint para listar turnos del negocio.
  - Accion de cancelacion de turnos desde la agenda diaria.
  - Configuracion de Vitest en API + primer archivo `src/lib/slots.test.ts`.
  - Tests de endpoint `POST /appointments` para fuera de disponibilidad y doble booking.
  - Script de test agregado en API (`npm run test -w apps/api`).
  - AGENTS actualizado con comandos y estado real de tests.
- Bloqueos:
  - Falta caso de test de reserva exitosa en `POST /appointments`.
- Decisiones tomadas:
  - Excluir `*.test.ts` del build TypeScript del API para no emitir tests a `dist/`.
  - Mantener alcance de esta sesion en endpoint de lectura + listado de agenda + reglas de slots.
- Proximo paso (primera tarea de la siguiente sesion): testear reserva fuera de disponibilidad y conflictos de doble booking.
- Proximo paso (primera tarea de la siguiente sesion): estandarizar formato de errores (`message`, `code`, `issues?`).
- Commit(s) asociados: pendiente (sin commit aun).
