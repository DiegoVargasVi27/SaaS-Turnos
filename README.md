# SaaS Turnos

Sistema de reservas para negocios de servicios: barberías, estéticas, consultorios, talleres. Donde gestionar turnos sea simple y sin conflictos de horarios.

## Qué resuelve

Un negocio puede publicar sus servicios con horarios disponibles y los clientes pueden reservar sin que se pisen los turnos. El propietario tiene un panel para gestionar su agenda diaria, crear servicios, configurar disponibilidad y cancelar turnos cuando sea necesario.

Lo interesante del proyecto es que implementa lógica de negocio real: validación de solapes, verificación de horarios dentro de la disponibilidad del negocio, y respuestas claras cuando algo no se puede completar.

## Cómo se hizo

Este proyecto fue desarrollado utilizando **OpenCode** como agente autonomous de código, combinado con **GPT-5 Codex** para decisiones de arquitectura y lógica de negocio. El workflow incluyó agents especializados para diseño frontend, búsqueda de código y manejo de tareas complejas, siguiendo un proceso de ramas y commits con convenciones definidas.

Básicamente, se daban las indicaciones de qué necesitaba y los agents se encargaban de investigar el código existente, proponer soluciones, implementarlas y validar que todo funcionara. Fue como tener un pair programmer que conoce el codebase y busca patrones similares.

El proyecto utiliza un monorepo con npm workspaces para separar API, web y código compartido.

## Stack

- **Backend**: Node.js, Express, Prisma, PostgreSQL
- **Frontend**: React, TypeScript, Vite
- **Testing**: Vitest
- **Base de datos**: PostgreSQL (Docker)

## Qué demuestra este proyecto

- Lógica de negocio real: reglas de disponibilidad, generación de slots, prevención de solapes
- API REST con manejo de errores consistente y códigos claros
- Flujo de autenticación con JWT y refresh tokens
- Interfaz con experiencia de usuario operativa y flujo guiado
- Tests automatizados sobre casos críticos de la API
- Monorepo bien organizado con workspaces
- Buenas prácticas: tipos estrictos, validaciones con Zod, código limpio

## Próximos pasos

- Deploy a producción (Render, Vercel, etc.)
- Incrementar cobertura de tests
- Mejorar experiencia en dispositivos móviles
- Agregar funciones como historial de clientes

---

