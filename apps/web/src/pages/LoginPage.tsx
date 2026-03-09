import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiClientError } from "../lib/api";
import type { AuthSession } from "../lib/auth";
import { sessionFromToken } from "../lib/auth";

type LoginPageProps = {
  onLogin: (session: AuthSession) => void;
};

export function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);

    try {
      const response = await api<{ accessToken: string; refreshToken: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });

      const session = sessionFromToken(response.accessToken);
      if (!session) {
        setError("No se pudo crear la sesion con el token recibido.");
        return;
      }

      if (session.role !== "OWNER" && session.role !== "ADMIN") {
        setError("Este panel es solo para OWNER y ADMIN.");
        return;
      }

      onLogin(session);
      navigate("/admin", { replace: true });
    } catch (error) {
      if (error instanceof ApiClientError) {
        setError(`${error.code ?? "LOGIN_ERROR"}: ${error.message}`);
      } else {
        setError((error as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">SaaS Turnos</p>
        <h1>Acceso administrador</h1>
        <p className="helper">Inicia sesion como OWNER o ADMIN para gestionar servicios y agenda.</p>

        <form className="form" onSubmit={onSubmit}>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" required placeholder="owner@demo.com" />
          </label>
          <label className="field">
            <span>Contrasena</span>
            <input name="password" type="password" required placeholder="admin12345" />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Ingresando..." : "Entrar al panel"}
          </button>
        </form>

        {error ? <p className="alert error">{error}</p> : null}

        <p className="helper small">
          ¿Quieres ver el flujo publico? <Link to="/book/demo-barberia">Ir al booking</Link>
        </p>
      </section>
    </main>
  );
}
