# AGENTS.md
Guia para agentes de codigo autonomos que trabajen en `saas-turnos`.
Usar como comportamiento por defecto salvo que el usuario indique lo contrario.

## 1) Resumen del proyecto
- Monorepo con npm workspaces.
- `apps/api`: Express + TypeScript + Prisma + PostgreSQL.
- `apps/web`: React + TypeScript + Vite.
- `packages/shared`: esquemas Zod compartidos y tipos inferidos de TS.
- Gestor de paquetes raiz: npm (`package-lock.json` presente).
- Runtime objetivo segun docs: Node.js 20+.

## 2) Archivos de reglas Cursor/Copilot
- Revisado `.cursorrules`: no encontrado.
- Revisado `.cursor/rules/`: no encontrado.
- Revisado `.github/copilot-instructions.md`: no encontrado.
- Conclusion: no existe capa adicional de reglas Cursor/Copilot por ahora.

## 3) Setup y entorno
- Instalar dependencias: `npm install`
- Levantar DB: `docker compose up -d`
- Crear archivo env API: `copy apps\api\.env.example apps\api\.env`
- Generar cliente Prisma: `npm run prisma:generate -w apps/api`
- Ejecutar migracion: `npm run prisma:migrate -w apps/api -- --name init`
- Cargar datos demo: `npm run prisma:seed -w apps/api`

## 4) Comandos de Build/Lint/Test
### Comandos raiz
- Build completo: `npm run build`
- Lint de objetivos configurados: `npm run lint`
- Levantar API en dev: `npm run dev:api`
- Levantar web en dev: `npm run dev:web`

### Comandos por workspace
API (`apps/api`):
- `npm run dev -w apps/api`
- `npm run build -w apps/api`
- `npm run start -w apps/api`
- `npm run test -w apps/api`
- `npm run prisma:generate -w apps/api`
- `npm run prisma:migrate -w apps/api -- --name <name>`
- `npm run prisma:seed -w apps/api`

Web (`apps/web`):
- `npm run dev -w apps/web`
- `npm run build -w apps/web`
- `npm run lint -w apps/web`
- `npm run preview -w apps/web`

Shared (`packages/shared`):
- `npm run build -w packages/shared`

### Estado de tests (importante)
- API tiene tests con Vitest y script `npm run test -w apps/api`.
- Web todavia no tiene scripts ni suites de test.
- Si te piden tests de web, reportar que aun no estan configurados.

### Guia de test individual (cuando se agreguen tests)
- API por archivo: `npm run test -w apps/api -- src/path/file.test.ts`
- API por nombre de caso: `npm run test -w apps/api -- src/path/file.test.ts -t "case name"`
- Web por archivo: `npm run test -w apps/web -- src/path/component.test.tsx`
- Web por nombre de caso: `npm run test -w apps/web -- src/path/component.test.tsx -t "case name"`
- Ejemplo actual API: `npm run test -w apps/api -- src/lib/slots.test.ts`

## 5) Reglas de estilo de codigo
### TypeScript y tipado
- Se espera modo estricto (`strict: true`) en todos los paquetes.
- Preferir `unknown` + narrowing; evitar `any` salvo necesidad real.
- Agregar tipos explicitos en bordes (inputs, outputs, contratos de helpers).
- Preferir esquemas/tipos compartidos de `@saas-turnos/shared` entre apps.
- Usar Zod para validacion runtime de entrada externa.

### Imports y modulos
- Ordenar imports: paquetes externos -> modulos internos -> estilos/assets.
- Usar `import type` para imports solo de tipo.
- Mantener imports minimos y remover no usados.
- API compila a CommonJS; web/shared a ES modules.
- Respetar configuracion de tsconfig/modulos por workspace.

### Formato y edicion
- Seguir estilo local del archivo editado.
- El repo mezcla comillas/punto y coma; priorizar consistencia local.
- Preferir formato multilinea para objetos/chains largos.
- Mantener funciones y handlers lineales con retornos tempranos.
- No hay Prettier global obligatorio; la consistencia es clave.

### Convenciones de nombres
- `PascalCase`: componentes React, aliases de tipo importantes, enums-like.
- `camelCase`: variables, funciones, handlers, utilidades.
- `UPPER_SNAKE_CASE`: variables de entorno y constantes de compilacion.
- Rutas y nombres de archivo descriptivos y orientados al dominio.
- Usar terminos explicitos del dominio (`business`, `service`, `availability`, `appointment`).

### Manejo de errores y respuestas API
- Validar payloads con Zod `safeParse` antes de logica de negocio.
- Retornar temprano ante input invalido/fallos de auth.
- Semantica de codigos:
- `400`: payload o params invalidos.
- `401`: token ausente/invalido.
- `403`: autenticado pero sin contexto/permiso de negocio.
- `404`: recurso no encontrado.
- `409`: conflicto (duplicados, solapamiento de slots, estado invalido).
- `500`: error inesperado del servidor.
- Mantener middleware global de errores de Express como fallback final.
- No filtrar secretos ni stack interno en respuestas.

### Datos y persistencia
- Usar modulo compartido de Prisma: `apps/api/src/lib/prisma.ts`.
- Usar transacciones para escrituras multi-paso atomicas.
- Mantener seed idempotente (`upsert` preferido).
- Preservar logica UTC de fechas/slots ya implementada.
- Cambios de esquema solo por migraciones Prisma, no SQL ad-hoc.

### Patrones frontend
- Usar componentes de funcion y hooks.
- Estado local y explicito.
- Wrappers tipados de API/fetch para contratos de respuesta.
- Mostrar errores de backend en el estado de UI de forma consistente.
- Preferir inputs controlados cuando afectan pasos posteriores.

### Logica de negocio frontend (MVP actual)
- Separar UI por pantallas: `login`, `admin` y `book` (publica).
- Personas del sistema:
  - `cliente final`: solo agenda turnos.
  - `prestador` (`OWNER`/`ADMIN`): gestiona servicios, disponibilidad y agenda.
- Booking publico (sin auth) por URL con slug: `\/book\/:businessSlug`.
- En booking publico el cliente final no crea cuenta ni inicia sesion; solo completa datos de contacto para confirmar reserva.
- Flujo de reserva en 4 clics maximo: elegir servicio -> elegir fecha -> elegir horario -> confirmar.
- En booking publico mostrar solo servicios activos (`isActive = true`).
- Pantalla `login` es exclusiva para prestador (no para cliente final).
- En `admin`, acceso solo para `OWNER` y `ADMIN`.
- Admin puede crear, editar y desactivar servicios; "borrar" se implementa como baja logica (`isActive = false`).
- Mantener vistas distintas para admin y cliente final; no mezclar ambos flujos en una sola pantalla.
- Preservar contrato de error API en UI (`code` + `message`) para feedback consistente.

### Patrones del paquete shared
- Mantener contratos reutilizables en `packages/shared/src/index.ts`.
- Exportar schema + tipo inferido cuando convenga.
- Mantener `shared` agnostico de framework.

## 6) Expectativas de workflow del agente
- Revisar scripts/config antes de cambiar tooling.
- Ejecutar checks relevantes tras editar (build/lint; y Prisma si aplica).
- No editar artefactos generados manualmente (`dist/`, Prisma generado).
- No commitear secretos (`.env`, JWT secrets, credenciales, tokens).
- Mantener el alcance acotado; evitar refactors no pedidos.
- Preferir cambios pequenos y revisables alineados a la arquitectura actual.

## 7) Archivos de referencia de alto valor
- Root scripts: `package.json`
- Entrada/rutas API: `apps/api/src/server.ts`
- Middleware auth API: `apps/api/src/middleware/auth.ts`
- Helpers auth API: `apps/api/src/lib/auth.ts`
- Logica de slots API: `apps/api/src/lib/slots.ts`
- Prisma schema: `apps/api/prisma/schema.prisma`
- Prisma seed: `apps/api/prisma/seed.ts`
- Config lint web: `apps/web/eslint.config.js`
- Entrada UI web: `apps/web/src/App.tsx`
- Contratos shared: `packages/shared/src/index.ts`
