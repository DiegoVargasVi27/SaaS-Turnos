import { NavLink } from "react-router-dom";

type ThemeMode = "light" | "dark";

interface TopTabsProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export function TopTabs({ theme, onToggleTheme }: TopTabsProps) {
  return (
    <nav className="top-tabs" aria-label="Navegacion principal">
      <NavLink to="/" className={({ isActive }) => (isActive ? "tab-link is-active" : "tab-link")} end>
        Inicio
      </NavLink>
      <NavLink to="/book/demo-barberia" className={({ isActive }) => (isActive ? "tab-link is-active" : "tab-link")}>
        Booking publico
      </NavLink>
      <NavLink to="/login" className={({ isActive }) => (isActive ? "tab-link is-active" : "tab-link")}>
        Login prestador
      </NavLink>
      <NavLink to="/admin" className={({ isActive }) => (isActive ? "tab-link is-active" : "tab-link")}>
        Admin
      </NavLink>
      <button type="button" className="theme-toggle" onClick={onToggleTheme}>
        {theme === "dark" ? "Tema claro" : "Tema oscuro"}
      </button>
    </nav>
  );
}

export type { ThemeMode };
