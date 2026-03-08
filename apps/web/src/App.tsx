import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type ApiError = { message?: string };

type AppointmentStatusFilter =
  | "ALL"
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

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

type StepId = "auth" | "service" | "availability" | "slots" | "agenda";
type NoticeTone = "info" | "success" | "error";

type StepNotice = {
  tone: NoticeTone;
  text: string;
};

const workflowSteps: Array<{ id: StepId; title: string; helper: string }> = [
  { id: "auth", title: "Autenticacion", helper: "Registra o inicia sesion" },
  { id: "service", title: "Servicio", helper: "Define la oferta base" },
  { id: "availability", title: "Disponibilidad", helper: "Configura bloques horarios" },
  { id: "slots", title: "Slots", helper: "Valida huecos publicos" },
  { id: "agenda", title: "Agenda", helper: "Control diario de turnos" },
];

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
  const [activeStep, setActiveStep] = useState<StepId>("auth");
  const [accessToken, setAccessToken] = useState("");
  const [businessSlug, setBusinessSlug] = useState("demo-barberia");
  const [serviceId, setServiceId] = useState("c8f4f40f-b1ff-4f11-9a0f-9e85d73f3da1");
  const [slotDate, setSlotDate] = useState(new Date().toISOString().slice(0, 10));
  const [agendaDate, setAgendaDate] = useState(new Date().toISOString().slice(0, 10));
  const [agendaStatus, setAgendaStatus] = useState<AppointmentStatusFilter>("ALL");
  const [slots, setSlots] = useState<string[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [hasAvailability, setHasAvailability] = useState(false);

  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCreatingService, setIsCreatingService] = useState(false);
  const [isCreatingAvailability, setIsCreatingAvailability] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isLoadingAgenda, setIsLoadingAgenda] = useState(false);
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<string | null>(null);

  const [status, setStatus] = useState("Listo para operar en modo minimal-tech.");
  const [notices, setNotices] = useState<Record<StepId, StepNotice | null>>({
    auth: null,
    service: null,
    availability: null,
    slots: null,
    agenda: null,
  });

  const hasSession = accessToken.trim().length > 0;
  const hasService = serviceId.trim().length > 0;
  const hasSlots = slots.length > 0;
  const hasAgenda = appointments.length > 0;

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);

  const recommendedStep: StepId = !hasSession
    ? "auth"
    : !hasService
      ? "service"
      : !hasAvailability
        ? "availability"
        : !hasSlots
          ? "slots"
          : "agenda";

  function stepDone(stepId: StepId): boolean {
    if (stepId === "auth") return hasSession;
    if (stepId === "service") return hasService;
    if (stepId === "availability") return hasAvailability;
    if (stepId === "slots") return hasSlots;
    return hasAgenda;
  }

  function pushNotice(stepId: StepId, tone: NoticeTone, text: string) {
    setNotices((current) => ({
      ...current,
      [stepId]: { tone, text },
    }));
  }

  async function onRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsRegistering(true);

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
      setStatus("Registro completado. Continua con servicio y disponibilidad.");
      pushNotice("auth", "success", "Cuenta creada y sesion activa.");
      setActiveStep("service");
    } catch (error) {
      const message = (error as Error).message;
      setStatus(message);
      pushNotice("auth", "error", message);
    } finally {
      setIsRegistering(false);
    }
  }

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsLoggingIn(true);

    try {
      const data = await api<{ accessToken: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      setAccessToken(data.accessToken);
      setStatus("Sesion iniciada. Ya puedes operar el negocio.");
      pushNotice("auth", "success", "Sesion iniciada correctamente.");
      setActiveStep("service");
    } catch (error) {
      const message = (error as Error).message;
      setStatus(message);
      pushNotice("auth", "error", message);
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function onCreateService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsCreatingService(true);

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
      setStatus(`Servicio listo. Nuevo serviceId: ${data.id}`);
      pushNotice("service", "success", "Servicio creado y vinculado al flujo.");
      setActiveStep("availability");
    } catch (error) {
      const message = (error as Error).message;
      setStatus(message);
      pushNotice("service", "error", message);
    } finally {
      setIsCreatingService(false);
    }
  }

  async function onCreateAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsCreatingAvailability(true);

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
      setHasAvailability(true);
      setStatus("Disponibilidad guardada. Continua con validacion de slots.");
      pushNotice("availability", "success", "Horario publicado correctamente.");
      setActiveStep("slots");
    } catch (error) {
      const message = (error as Error).message;
      setStatus(message);
      pushNotice("availability", "error", message);
    } finally {
      setIsCreatingAvailability(false);
    }
  }

  async function onLoadSlots() {
    setIsLoadingSlots(true);

    try {
      const data = await api<{ slots: string[] }>(
        `/appointments/slots?businessSlug=${encodeURIComponent(businessSlug)}&serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(slotDate)}`,
      );
      setSlots(data.slots);
      setStatus(`Slots encontrados: ${data.slots.length}`);
      pushNotice("slots", "success", `Se cargaron ${data.slots.length} slots.`);
      if (data.slots.length > 0) {
        setActiveStep("agenda");
      }
    } catch (error) {
      const message = (error as Error).message;
      setStatus(message);
      pushNotice("slots", "error", message);
    } finally {
      setIsLoadingSlots(false);
    }
  }

  async function onLoadAppointments() {
    setIsLoadingAgenda(true);

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
      pushNotice("agenda", "success", `Agenda actualizada con ${data.appointments.length} turnos.`);
    } catch (error) {
      const message = (error as Error).message;
      setStatus(message);
      pushNotice("agenda", "error", message);
    } finally {
      setIsLoadingAgenda(false);
    }
  }

  async function onCancelAppointment(appointmentId: string) {
    setCancellingAppointmentId(appointmentId);

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
      pushNotice("agenda", "info", "Se actualizo el estado del turno a CANCELLED.");
    } catch (error) {
      const message = (error as Error).message;
      setStatus(message);
      pushNotice("agenda", "error", message);
    } finally {
      setCancellingAppointmentId(null);
    }
  }

  const completedSteps = workflowSteps.reduce((accumulator, step) => {
    return accumulator + (stepDone(step.id) ? 1 : 0);
  }, 0);

  return (
    <main className="page">
      <header className="topbar">
        <p className="eyebrow">SaaS Turnos / Minimal Tech Console</p>
        <h1>Opera tu negocio por flujo, no por friccion.</h1>
        <div className="topbar-meta">
          <span className={hasSession ? "chip is-on" : "chip"}>
            {hasSession ? "Sesion activa" : "Sin sesion"}
          </span>
          <span className="chip">{completedSteps}/5 pasos</span>
          <span className="chip">API {API_URL}</span>
        </div>
        <p className="status" aria-live="polite">
          {status}
        </p>
      </header>

      <div className="shell">
        <aside className="rail rail-left">
          <h2>Flujo operativo</h2>
          <ol className="stepper">
            {workflowSteps.map((step, index) => {
              const done = stepDone(step.id);
              const active = activeStep === step.id;
              const recommended = recommendedStep === step.id;

              return (
                <li key={step.id}>
                  <button
                    type="button"
                    className={[
                      "step",
                      active ? "is-active" : "",
                      done ? "is-done" : "",
                      recommended ? "is-recommended" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setActiveStep(step.id)}
                  >
                    <span className="step-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="step-copy">
                      <strong>{step.title}</strong>
                      <small>{step.helper}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <section className="workspace">
          {activeStep === "auth" ? (
            <section className="panel-grid two-columns">
              <form className="card" onSubmit={onRegister}>
                <h3>Registro</h3>
                <p className="card-hint">Crea el negocio y obtiene token en la misma accion.</p>
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
                  <span>Email</span>
                  <input name="email" type="email" placeholder="admin@demo.com" required />
                </label>
                <label className="field">
                  <span>Contrasena</span>
                  <input name="password" type="password" placeholder="Minimo 8 caracteres" required />
                </label>
                <button type="submit" disabled={isRegistering}>
                  {isRegistering ? "Creando cuenta..." : "Crear cuenta"}
                </button>
              </form>

              <form className="card" onSubmit={onLogin}>
                <h3>Login</h3>
                <p className="card-hint">Usalo con credenciales del seed o de tu registro.</p>
                <label className="field">
                  <span>Email</span>
                  <input name="email" type="email" placeholder="owner@demo.com" required />
                </label>
                <label className="field">
                  <span>Contrasena</span>
                  <input name="password" type="password" placeholder="admin12345" required />
                </label>
                <button type="submit" disabled={isLoggingIn}>
                  {isLoggingIn ? "Iniciando sesion..." : "Iniciar sesion"}
                </button>
                {notices.auth ? (
                  <p className={`module-status ${`is-${notices.auth.tone}`}`}>{notices.auth.text}</p>
                ) : null}
              </form>
            </section>
          ) : null}

          {activeStep === "service" ? (
            <section className="panel-grid">
              <form className="card" onSubmit={onCreateService}>
                <h3>Crear servicio</h3>
                <p className="card-hint">Define la unidad comercial que luego reservan tus clientes.</p>
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
                <button type="submit" disabled={!hasSession || isCreatingService}>
                  {isCreatingService ? "Guardando servicio..." : "Guardar servicio"}
                </button>
                {!hasSession ? <p className="card-hint">Inicia sesion para habilitar este paso.</p> : null}
                {notices.service ? (
                  <p className={`module-status ${`is-${notices.service.tone}`}`}>{notices.service.text}</p>
                ) : null}
              </form>
            </section>
          ) : null}

          {activeStep === "availability" ? (
            <section className="panel-grid">
              <form className="card" onSubmit={onCreateAvailability}>
                <h3>Configurar disponibilidad</h3>
                <p className="card-hint">Publica bloques de atencion para generar slots reservables.</p>
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
                <button type="submit" disabled={!hasSession || isCreatingAvailability}>
                  {isCreatingAvailability ? "Guardando horario..." : "Guardar horario"}
                </button>
                {!hasSession ? <p className="card-hint">Inicia sesion para habilitar este paso.</p> : null}
                {notices.availability ? (
                  <p className={`module-status ${`is-${notices.availability.tone}`}`}>
                    {notices.availability.text}
                  </p>
                ) : null}
              </form>
            </section>
          ) : null}

          {activeStep === "slots" ? (
            <section className="panel-grid">
              <section className="card">
                <h3>Consulta de slots</h3>
                <p className="card-hint">
                  Requiere <code>businessSlug</code> y <code>serviceId</code> validos.
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
                  <button type="button" onClick={onLoadSlots} disabled={isLoadingSlots}>
                    {isLoadingSlots ? "Cargando..." : "Cargar slots"}
                  </button>
                </div>
                <ul className="slot-list">
                  {slots.length === 0 ? <li>Sin resultados por ahora.</li> : null}
                  {slots.map((slot) => (
                    <li key={slot}>{new Date(slot).toLocaleString()}</li>
                  ))}
                </ul>
                {notices.slots ? (
                  <p className={`module-status ${`is-${notices.slots.tone}`}`}>{notices.slots.text}</p>
                ) : null}
              </section>
            </section>
          ) : null}

          {activeStep === "agenda" ? (
            <section className="panel-grid">
              <section className="card">
                <h3>Agenda diaria</h3>
                <p className="card-hint">Vista operativa por fecha y estado para gestionar turnos.</p>
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
                  <button type="button" disabled={!hasSession || isLoadingAgenda} onClick={onLoadAppointments}>
                    {isLoadingAgenda ? "Cargando..." : "Cargar agenda"}
                  </button>
                </div>
                {!hasSession ? <p className="card-hint">Necesitas iniciar sesion para consultar agenda.</p> : null}
                <ul className="appointment-timeline">
                  {appointments.length === 0 ? <li className="empty-item">Sin turnos para el filtro actual.</li> : null}
                  {appointments.map((appointment) => {
                    const canCancel =
                      appointment.status === "CONFIRMED" || appointment.status === "PENDING";

                    return (
                      <li key={appointment.id} className="appointment-item">
                        <span className="appointment-time">
                          {new Date(appointment.startsAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <div className="appointment-main">
                          <p>
                            <strong>{appointment.service.name}</strong> - {appointment.clientUser.fullName}
                          </p>
                          <span className={`appointment-badge status-${appointment.status.toLowerCase()}`}>
                            {appointment.status}
                          </span>
                        </div>
                        {canCancel ? (
                          <button
                            className="inline-action"
                            type="button"
                            disabled={cancellingAppointmentId === appointment.id}
                            onClick={() => onCancelAppointment(appointment.id)}
                          >
                            {cancellingAppointmentId === appointment.id ? "Cancelando..." : "Cancelar"}
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                {notices.agenda ? (
                  <p className={`module-status ${`is-${notices.agenda.tone}`}`}>{notices.agenda.text}</p>
                ) : null}
              </section>
            </section>
          ) : null}
        </section>

        <aside className="rail rail-right">
          <h2>Panel rapido</h2>
          <div className="mini-metric">
            <span>Business slug</span>
            <strong>{businessSlug}</strong>
          </div>
          <div className="mini-metric">
            <span>Service ID activo</span>
            <strong>{serviceId.slice(0, 8)}...</strong>
          </div>
          <div className="mini-metric">
            <span>Slots cargados</span>
            <strong>{slots.length}</strong>
          </div>
          <div className="mini-metric">
            <span>Turnos visibles</span>
            <strong>{appointments.length}</strong>
          </div>

          <h3>Ultimo estado por paso</h3>
          <ul className="notice-list">
            {workflowSteps.map((step) => (
              <li key={step.id}>
                <p>{step.title}</p>
                <small>{notices[step.id]?.text ?? "Sin eventos recientes."}</small>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  );
}

export default App;
