import { Link } from "react-router-dom";
import { TopTabs, type ThemeMode } from "../components/TopTabs";

export function Home({ theme, onToggleTheme }: { theme: ThemeMode; onToggleTheme: () => void }) {
  return (
    <main className="screen">
      <section className="surface intro">
        <TopTabs theme={theme} onToggleTheme={onToggleTheme} />
        <p className="kicker">SaaS Turnos</p>
        <h1>Flujos separados por pantalla</h1>
        <p>
          Cliente final agenda sin cuenta en booking publico. Prestador inicia sesion y opera en
          admin.
        </p>
        <div className="link-row">
          <Link to="/login" className="link-button">
            Soy prestador
          </Link>
          <Link to="/admin" className="link-button is-muted">
            Ir a admin
          </Link>
          <Link to="/book/demo-barberia" className="link-button is-muted">
            Quiero reservar
          </Link>
        </div>
      </section>
    </main>
  );
}
