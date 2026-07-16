# Daily Duty Institute

Página personal tipo **link-in-bio** para Daily Duty Institute — un reemplazo
propio de Linktree: una sola página con perfil y una lista de enlaces
(redes sociales, sitio web, contenido, etc.), totalmente controlada por
nosotros en vez de depender de un servicio de terceros.

## Stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) (v4, vía `@tailwindcss/vite`)
- ESLint + Prettier

## Estructura

```
src/
  components/   # Componentes de UI (ProfileHeader, LinkButton, LinkList, ...)
  data/         # Datos estáticos: perfil y lista de enlaces (links.ts)
  hooks/        # Hooks reutilizables (useLinks, ...)
  lib/          # Utilidades genéricas (helpers, formateo, etc.)
```

Para agregar o modificar enlaces, edita `src/data/links.ts`.

## Desarrollo

```bash
npm install
npm run dev
```

## Scripts

| Comando                | Descripción                             |
| ---------------------- | --------------------------------------- |
| `npm run dev`          | Servidor de desarrollo con HMR          |
| `npm run build`        | Type-check + build de producción        |
| `npm run preview`      | Sirve el build de producción localmente |
| `npm run lint`         | Corre ESLint                            |
| `npm run format`       | Formatea el proyecto con Prettier       |
| `npm run format:check` | Verifica formato sin escribir cambios   |
