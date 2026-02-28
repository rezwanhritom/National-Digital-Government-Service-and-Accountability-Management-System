# Frontend Guidelines

Conventions for the React frontend in the `frontend` folder.

## Structure

- **`src/components/`** – Reusable UI components (e.g. Layout, Button, Card).
- **`src/views/`** – Page-level components tied to routes.
- **`src/services/`** – API client and other external calls.
- **`src/`** – `App.jsx`, `main.jsx`, and global styles.

Add folders as needed (e.g. `hooks/`, `utils/`, `context/`, `assets/`).

## Components

- One main component per file; co-locate component-specific CSS in the same folder.
- Prefer function components and hooks; use classes only if required by a library.
- Keep components focused; split large components into smaller ones.
- Use meaningful prop names and document non-obvious props (comment or PropTypes when used).

## State and data

- Use React state for local UI state.
- For server data, use the `services/api` helpers (or a data-fetching library when introduced).
- Consider context for app-wide state (e.g. auth, theme) when needed.

## Routing

- Routes are defined in `App.jsx` (or a dedicated routes module).
- Use React Router’s `Link` and `useNavigate` for navigation; avoid full-page reloads for in-app links.

## Styling

- Global styles in `index.css`; component-specific styles in `.css` files next to the component.
- Use clear class names (e.g. BEM or a consistent prefix) to avoid clashes.
- Prefer CSS (or the project’s chosen approach) consistently; avoid inline styles for layout and theming unless required.

## Accessibility and UX

- Use semantic HTML and ARIA where needed.
- Ensure keyboard navigation and focus order make sense.
- Keep loading and error states visible and clear.
