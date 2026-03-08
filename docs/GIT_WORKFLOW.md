# Git workflow recomendado

Si estas arrancando desde cero en otra carpeta, inicializa git asi:

```bash
git init
git add .
git commit -m "chore: bootstrap saas-turnos mvp"
```

## Convencion de ramas

- `main`: rama estable.
- `feat/<tema>`: nuevas funcionalidades.
- `fix/<tema>`: correcciones.
- `docs/<tema>`: cambios de documentacion.

Ejemplos:

- `feat/appointments-daily-list`
- `fix/slot-overlap-check`
- `docs/roadmap-worklog`

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
- Documentacion minima actualizada si cambia comportamiento.
- Sin secretos ni archivos `.env` en commit.
