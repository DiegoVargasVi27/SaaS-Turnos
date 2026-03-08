# Git workflow recomendado

Si estas arrancando desde cero en otra carpeta, inicializa git asi:

```bash
git init
git add .
git commit -m "chore: bootstrap saas-turnos mvp"
```

## Convencion de ramas

- `main`: rama estable y siempre desplegable.
- `feat/<tema-corto>`: nueva funcionalidad.
- `fix/<tema-corto>`: correccion de bug.
- `refactor/<tema-corto>`: mejora interna sin cambiar comportamiento.
- `test/<tema-corto>`: agregar o mejorar pruebas.
- `docs/<tema-corto>`: cambios de documentacion.
- `chore/<tema-corto>`: mantenimiento, tooling, deps.
- `hotfix/<tema-corto>`: correccion urgente sobre `main`.

Ejemplos:

- `feat/agendar-turnos-diarios`
- `fix/validacion-solape-slots`
- `refactor/servicio-de-turnos`
- `test/casos-crear-turno`
- `docs/roadmap-worklog`

## Regla de nombres

- Usar prefijo en ingles + tema en espanol: `feat/estandarizacion-api`.
- Un solo objetivo por rama.
- Evitar ramas largas y genericas como `changes` o `update`.

## Workflow diario (GitHub Flow)

1. Actualizar `main` local.
2. Crear rama nueva desde `main`.
3. Hacer cambios pequenos y commitear en esa rama.
4. Push de la rama.
5. Abrir Pull Request hacia `main`.
6. Merge cuando build/lint/tests esten en verde.
7. Borrar rama luego del merge.

Comandos base:

```bash
git checkout main
git pull
git checkout -b feat/estandarizacion-api
git push -u origin feat/estandarizacion-api
```

## Workflow en GitHub Desktop

1. `Current Branch` -> `main` -> `Fetch origin` -> `Pull origin`.
2. `Current Branch` -> `New Branch` (ej: `feat/estandarizacion-api`).
3. Commit en `Changes` con mensaje claro.
4. `Push origin`.
5. `Create Pull Request`.
6. Merge en GitHub y luego `Delete branch`.

## Convencion de commits

Formato sugerido:

`tipo(scope): motivo`

Tipos recomendados:

- `feat`: nueva funcionalidad
- `fix`: bug fix
- `refactor`: mejora interna sin cambio funcional
- `docs`: documentacion
- `test`: pruebas
- `chore`: tareas de mantenimiento

Ejemplos:

- `feat(api): add daily appointments endpoint`
- `test(api): cover slot overlap rules`
- `docs(plan): update roadmap after session 3`

## Cierre de cada sesion (checklist)

1. Actualizar `docs/WORKLOG.md`.
2. Revisar cambios con `git status` y `git diff`.
3. Hacer commit pequeno y descriptivo.
4. (Opcional) crear tag de hito en entregas importantes:

```bash
git tag -a v0.1.0-mvp-base -m "MVP base listo"
```

## Definicion de "hecho" por tarea

- Build y lint en verde.
- Tests en verde si aplica al alcance.
- Documentacion minima actualizada si cambia comportamiento.
- Sin secretos ni archivos `.env` en commit.
