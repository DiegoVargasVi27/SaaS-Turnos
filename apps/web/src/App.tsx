import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type ApiError = { message?: string };

type AppointmentStatusFilter = "ALL" | "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

type AppointmentItem = {
  id: string;
  status: Exclude<AppointmentStatusFilter, "ALL">;
  startsAt: string;
  endsAt: string;
  service: {
    id: string;
    name: string;
    durationMin: number;
  };
  clientUser: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
  };
};

const colorThemes = [
  { id: "spritz", name: "Stone ivory" },
  { id: "lagoon", name: "Sage linen" },
  { id: "sunset", name: "Rose parchment" },
] as const;

type ColorTheme = (typeof colorThemes)[number]["id"];

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(data.message ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

function App() {
  const [colorTheme, setColorTheme] = useState<ColorTheme>("spritz");
  const [accessToken, setAccessToken] = useState("");
  const [businessSlug, setBusinessSlug] = useState("demo-barberia");
  const [serviceId, setServiceId] = useState("c8f4f40f-b1ff-4f11-9a0f-9e85d73f3da1");
  const [slotDate, setSlotDate] = useState(new Date().toISOString().slice(0, 10));
  const [agendaDate, setAgendaDate] = useState(new Date().toISOString().slice(0, 10));
  const [agendaStatus, setAgendaStatus] = useState<AppointmentStatusFilter>("ALL");
  const [slots, setSlots] = useState<string[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [status, setStatus] = useState("Listo para crear tu MVP.");

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${accessToken}` }),
    [accessToken],
  );

  async function onRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      const data = await api<{ accessToken: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          businessName: form.get("businessName"),
          businessSlug: form.get("businessSlug"),
          fullName: form.get("fullName"),
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      setAccessToken(data.accessToken);
      setStatus("Registro completado. Ya puedes crear servicios y horarios.");
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      const data = await api<{ accessToken: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      setAccessToken(data.accessToken);
      setStatus("Sesion iniciada. Token cargado en memoria del navegador.");
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  async function onCreateService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      const data = await api<{ id: string }>("/services", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          name: form.get("name"),
          durationMin: Number(form.get("durationMin")),
          priceCents: Number(form.get("priceCents")),
          currency: form.get("currency"),
        }),
      });
      setServiceId(data.id);
      setStatus(`Servicio creado. Nuevo serviceId: ${data.id}`);
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  async function onCreateAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      await api("/availability", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          weekday: Number(form.get("weekday")),
          startTime: form.get("startTime"),
          endTime: form.get("endTime"),
          slotIntervalMin: Number(form.get("slotIntervalMin")),
        }),
      });
      setStatus("Disponibilidad guardada. Ya puedes consultar slots.");
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  async function onLoadSlots() {
    try {
      const data = await api<{ slots: string[] }>(
        `/appointments/slots?businessSlug=${encodeURIComponent(businessSlug)}&serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(slotDate)}`,
      );
      setSlots(data.slots);
      setStatus(`Slots encontrados: ${data.slots.length}`);
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  async function onLoadAppointments() {
    try {
      const params = new URLSearchParams({ date: agendaDate });
      if (agendaStatus !== "ALL") {
        params.set("status", agendaStatus);
      }

      const data = await api<{ appointments: AppointmentItem[] }>(`/appointments?${params.toString()}`, {
        headers: authHeaders,
      });

      setAppointments(data.appointments);
      setStatus(`Turnos cargados: ${data.appointments.length}`);
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  async function onCancelAppointment(appointmentId: string) {
    try {
      await api(`/appointments/${appointmentId}/cancel`, {
        method: "PATCH",
        headers: authHeaders,
      });

      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === appointmentId ? { ...appointment, status: "CANCELLED" } : appointment,
        ),
      );
      setStatus("Turno cancelado correctamente.");
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  return (
    <main className={`page theme-${colorTheme}`}>
      <section className="hero">
        <p className="eyebrow">MVP de SaaS para turnos</p>
        <h1>Reserva, administra y valida disponibilidad sin doble booking.</h1>
        <p className="subtitle">
          Este frontend conecta con tu API de Express + Prisma y te permite probar el flujo
          completo en local.
        </p>
        <p className="guide">
          Orden sugerido: 1) Registro o login, 2) crear servicio, 3) crear horario, 4) consultar
          slots, 5) revisar agenda diaria.
        </p>
        <div className="theme-switcher" role="tablist" aria-label="Paleta de color">
          {colorThemes.map((theme) => (
            <button
              key={theme.id}
              className={theme.id === colorTheme ? "theme-chip is-active" : "theme-chip"}
              type="button"
              onClick={() => setColorTheme(theme.id)}
            >
              {theme.name}
            </button>
          ))}
        </div>
        <p className="status">{status}</p>
      </section>

      <section className="grid">
        <form className="card" onSubmit={onRegister}>
          <h2>Registro negocio</h2>
          <label className="field">
            <span>Nombre del negocio</span>
            <input name="businessName" placeholder="Barberia Central" required />
          </label>
          <label className="field">
            <span>Slug publico del negocio</span>
            <input
              name="businessSlug"
              placeholder="barberia-central"
              value={businessSlug}
              onChange={(event) => setBusinessSlug(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Nombre del administrador</span>
            <input name="fullName" placeholder="Diego Perez" required />
          </label>
          <label className="field">
            <span>Email del administrador</span>
            <input name="email" type="email" placeholder="admin@demo.com" required />
          </label>
          <label className="field">
            <span>Contrasena</span>
            <input name="password" type="password" placeholder="Minimo 8 caracteres" required />
          </label>
          <button type="submit">Crear cuenta</button>
        </form>

        <form className="card" onSubmit={onLogin}>
          <h2>Login</h2>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" placeholder="owner@demo.com" required />
          </label>
          <label className="field">
            <span>Contrasena</span>
            <input name="password" type="password" placeholder="admin12345" required />
          </label>
          <p className="hint">Usa estas credenciales despues de correr el seed.</p>
          <button type="submit">Iniciar sesion</button>
        </form>

        <form className="card" onSubmit={onCreateService}>
          <h2>Crear servicio</h2>
          <label className="field">
            <span>Nombre del servicio</span>
            <input name="name" placeholder="Corte clasico" required />
          </label>
          <label className="field">
            <span>Duracion (minutos)</span>
            <input name="durationMin" type="number" min={5} placeholder="30" required />
          </label>
          <label className="field">
            <span>Precio en centavos</span>
            <input name="priceCents" type="number" min={0} placeholder="1200" required />
          </label>
          <label className="field">
            <span>Moneda</span>
            <input name="currency" defaultValue="USD" maxLength={3} required />
          </label>
          <button type="submit" disabled={!accessToken}>
            Guardar servicio
          </button>
          {!accessToken ? <p className="hint">Necesitas iniciar sesion para usar este bloque.</p> : null}
        </form>

        <form className="card" onSubmit={onCreateAvailability}>
          <h2>Crear horario</h2>
          <label className="field">
            <span>Dia de semana (0 domingo - 6 sabado)</span>
            <input name="weekday" type="number" min={0} max={6} placeholder="1" required />
          </label>
          <label className="field">
            <span>Hora inicio</span>
            <input name="startTime" type="time" defaultValue="09:00" required />
          </label>
          <label className="field">
            <span>Hora fin</span>
            <input name="endTime" type="time" defaultValue="18:00" required />
          </label>
          <label className="field">
            <span>Intervalo entre slots (minutos)</span>
            <input name="slotIntervalMin" type="number" min={5} defaultValue={30} required />
          </label>
          <button type="submit" disabled={!accessToken}>
            Guardar horario
          </button>
          {!accessToken ? <p className="hint">Necesitas iniciar sesion para usar este bloque.</p> : null}
        </form>
      </section>

      <section className="card booking-card">
        <h2>Consulta de slots</h2>
        <p className="hint">
          Este bloque consulta horarios disponibles para una fecha. Requiere `businessSlug` y
          `serviceId` validos.
        </p>
        <div className="inline-fields">
          <label className="field">
            <span>Service ID</span>
            <input
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
              placeholder="service uuid"
            />
          </label>
          <label className="field">
            <span>Fecha</span>
            <input
              type="date"
              value={slotDate}
              onChange={(event) => setSlotDate(event.target.value)}
            />
          </label>
          <button type="button" onClick={onLoadSlots}>
            Cargar slots
          </button>
        </div>
        <ul className="slot-list">
          {slots.length === 0 ? <li>Sin resultados por ahora.</li> : null}
          {slots.map((slot) => (
            <li key={slot}>{new Date(slot).toLocaleString()}</li>
          ))}
        </ul>
      </section>

      <section className="card booking-card">
        <h2>Agenda diaria</h2>
        <p className="hint">Lista turnos del negocio autenticado con filtros por fecha y estado.</p>
        <div className="inline-fields">
          <label className="field">
            <span>Fecha</span>
            <input
              type="date"
              value={agendaDate}
              onChange={(event) => setAgendaDate(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Estado</span>
            <select
              value={agendaStatus}
              onChange={(event) => setAgendaStatus(event.target.value as AppointmentStatusFilter)}
            >
              <option value="ALL">Todos</option>
              <option value="PENDING">Pendiente</option>
              <option value="CONFIRMED">Confirmado</option>
              <option value="CANCELLED">Cancelado</option>
              <option value="COMPLETED">Completado</option>
              <option value="NO_SHOW">No show</option>
            </select>
          </label>
          <button type="button" disabled={!accessToken} onClick={onLoadAppointments}>
            Cargar agenda
          </button>
        </div>
        {!accessToken ? <p className="hint">Necesitas iniciar sesion para consultar agenda.</p> : null}
        <ul className="slot-list appointment-list">
          {appointments.length === 0 ? <li>Sin turnos para el filtro actual.</li> : null}
          {appointments.map((appointment) => (
            <li key={appointment.id}>
              <strong>
                {new Date(appointment.startsAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>{" "}
              - {appointment.service.name} - {appointment.clientUser.fullName} - {appointment.status}
              {appointment.status === "CONFIRMED" || appointment.status === "PENDING" ? (
                <button
                  className="inline-action"
                  type="button"
                  onClick={() => onCancelAppointment(appointment.id)}
                >
                  Cancelar
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default App;
