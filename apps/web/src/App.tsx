import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type Service = {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  currency: string;
  isActive: boolean;
};

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

type ApiErrorPayload = {
  code?: string;
  message?: string;
};

type ThemeMode = "light" | "dark";

class ApiRequestError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new ApiRequestError(payload.code ?? "REQUEST_FAILED", payload.message ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

function TopTabs({
  theme,
  onToggleTheme,
}: {
  theme: ThemeMode;
  onToggleTheme: () => void;
}) {
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

function Home({ theme, onToggleTheme }: { theme: ThemeMode; onToggleTheme: () => void }) {
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

function LoginPage({
  isAuthenticated,
  onLogin,
  theme,
  onToggleTheme,
}: {
  isAuthenticated: boolean;
  onLogin: (token: string) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorPayload | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/admin", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await api<{ accessToken: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      onLogin(data.accessToken);
      navigate("/admin", { replace: true });
    } catch (unknownError) {
      const typedError = unknownError as ApiRequestError;
      setError({ code: typedError.code, message: typedError.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="screen">
      <section className="surface auth-shell">
        <TopTabs theme={theme} onToggleTheme={onToggleTheme} />
        <p className="kicker">Acceso prestador</p>
        <h1>Inicia sesion</h1>
        <p>Solo usuarios OWNER o ADMIN pueden operar el panel administrativo.</p>

        <form className="form-grid" onSubmit={onSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="owner@demo.com"
              required
            />
          </label>

          <label className="field">
            <span>Contrasena</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="admin12345"
              required
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Ingresando..." : "Entrar al panel"}
          </button>
        </form>

        {error ? (
          <p className="banner is-error" aria-live="polite">
            {error.code} - {error.message}
          </p>
        ) : null}

        <div className="link-row">
          <Link to="/book/demo-barberia" className="link-button is-muted">
            Ver booking publico
          </Link>
        </div>
      </section>
    </main>
  );
}

function AdminPage({
  accessToken,
  onLogout,
  theme,
  onToggleTheme,
}: {
  accessToken: string;
  onLogout: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}) {
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  const [serviceName, setServiceName] = useState("");
  const [serviceDurationMin, setServiceDurationMin] = useState("30");
  const [servicePriceCents, setServicePriceCents] = useState("1200");
  const [serviceCurrency, setServiceCurrency] = useState("USD");
  const [creatingService, setCreatingService] = useState(false);
  const [disablingServiceId, setDisablingServiceId] = useState<string | null>(null);

  const [weekday, setWeekday] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [slotIntervalMin, setSlotIntervalMin] = useState("30");
  const [savingAvailability, setSavingAvailability] = useState(false);

  const [agendaDate, setAgendaDate] = useState(new Date().toISOString().slice(0, 10));
  const [agendaStatus, setAgendaStatus] = useState<AppointmentStatusFilter>("ALL");
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loadingAgenda, setLoadingAgenda] = useState(false);
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<string | null>(null);

  const [notice, setNotice] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(
    null,
  );

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${accessToken}` }),
    [accessToken],
  );

  async function loadServices() {
    setLoadingServices(true);

    try {
      const data = await api<Service[]>("/services", { headers: authHeaders });
      setServices(data);
    } catch (unknownError) {
      const typedError = unknownError as ApiRequestError;
      setNotice({ tone: "error", text: `${typedError.code} - ${typedError.message}` });
    } finally {
      setLoadingServices(false);
    }
  }

  useEffect(() => {
    void loadServices();
  }, []);

  async function onCreateService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingService(true);
    setNotice(null);

    try {
      await api<Service>("/services", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          name: serviceName,
          durationMin: Number(serviceDurationMin),
          priceCents: Number(servicePriceCents),
          currency: serviceCurrency,
        }),
      });

      setServiceName("");
      setServiceDurationMin("30");
      setServicePriceCents("1200");
      setServiceCurrency("USD");
      setNotice({ tone: "success", text: "Servicio creado correctamente." });
      await loadServices();
    } catch (unknownError) {
      const typedError = unknownError as ApiRequestError;
      setNotice({ tone: "error", text: `${typedError.code} - ${typedError.message}` });
    } finally {
      setCreatingService(false);
    }
  }

  async function onDisableService(serviceId: string) {
    setDisablingServiceId(serviceId);
    setNotice(null);

    try {
      await api<Service>(`/services/${serviceId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      setNotice({ tone: "info", text: "Servicio desactivado (isActive=false)." });
      await loadServices();
    } catch (unknownError) {
      const typedError = unknownError as ApiRequestError;
      setNotice({ tone: "error", text: `${typedError.code} - ${typedError.message}` });
    } finally {
      setDisablingServiceId(null);
    }
  }

  async function onCreateAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingAvailability(true);
    setNotice(null);

    try {
      await api("/availability", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          weekday: Number(weekday),
          startTime,
          endTime,
          slotIntervalMin: Number(slotIntervalMin),
        }),
      });
      setNotice({ tone: "success", text: "Disponibilidad guardada." });
    } catch (unknownError) {
      const typedError = unknownError as ApiRequestError;
      setNotice({ tone: "error", text: `${typedError.code} - ${typedError.message}` });
    } finally {
      setSavingAvailability(false);
    }
  }

  async function onLoadAgenda() {
    setLoadingAgenda(true);
    setNotice(null);

    try {
      const params = new URLSearchParams({ date: agendaDate });
      if (agendaStatus !== "ALL") {
        params.set("status", agendaStatus);
      }

      const data = await api<{ appointments: AppointmentItem[] }>(`/appointments?${params.toString()}`, {
        headers: authHeaders,
      });

      setAppointments(data.appointments);
      setNotice({ tone: "success", text: `Agenda cargada: ${data.appointments.length} turnos.` });
    } catch (unknownError) {
      const typedError = unknownError as ApiRequestError;
      setNotice({ tone: "error", text: `${typedError.code} - ${typedError.message}` });
    } finally {
      setLoadingAgenda(false);
    }
  }

  async function onCancelAppointment(appointmentId: string) {
    setCancellingAppointmentId(appointmentId);
    setNotice(null);

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

      setNotice({ tone: "info", text: "Turno cancelado correctamente." });
    } catch (unknownError) {
      const typedError = unknownError as ApiRequestError;
      setNotice({ tone: "error", text: `${typedError.code} - ${typedError.message}` });
    } finally {
      setCancellingAppointmentId(null);
    }
  }

  return (
    <main className="screen">
      <section className="surface admin-shell">
        <TopTabs theme={theme} onToggleTheme={onToggleTheme} />
        <header className="admin-header">
          <div>
            <p className="kicker">Admin panel</p>
            <h1>Operacion del negocio</h1>
            <p>Gestion de servicios, disponibilidad y agenda diaria.</p>
          </div>
          <div className="link-row">
            <Link to="/book/demo-barberia" className="link-button is-muted">
              Ver booking
            </Link>
            <button type="button" className="danger-button" onClick={onLogout}>
              Cerrar sesion
            </button>
          </div>
        </header>

        {notice ? (
          <p className={`banner ${notice.tone === "error" ? "is-error" : notice.tone === "success" ? "is-success" : "is-info"}`}>
            {notice.text}
          </p>
        ) : null}

        <section className="admin-grid">
          <article className="panel">
            <h2>Servicios</h2>
            <form className="form-grid" onSubmit={onCreateService}>
              <label className="field">
                <span>Nombre</span>
                <input
                  value={serviceName}
                  onChange={(event) => setServiceName(event.target.value)}
                  placeholder="Corte clasico"
                  required
                />
              </label>
              <label className="field">
                <span>Duracion (min)</span>
                <input
                  type="number"
                  min={5}
                  value={serviceDurationMin}
                  onChange={(event) => setServiceDurationMin(event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Precio (centavos)</span>
                <input
                  type="number"
                  min={0}
                  value={servicePriceCents}
                  onChange={(event) => setServicePriceCents(event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Moneda</span>
                <input
                  maxLength={3}
                  value={serviceCurrency}
                  onChange={(event) => setServiceCurrency(event.target.value.toUpperCase())}
                  required
                />
              </label>
              <button type="submit" disabled={creatingService}>
                {creatingService ? "Guardando..." : "Crear servicio"}
              </button>
            </form>

            <div className="list-stack">
              {loadingServices ? <p className="muted">Cargando servicios...</p> : null}
              {!loadingServices && services.length === 0 ? (
                <p className="muted">No hay servicios aun.</p>
              ) : null}

              {services.map((service) => (
                <div key={service.id} className="list-row">
                  <div>
                    <strong>{service.name}</strong>
                    <small>
                      {service.durationMin} min - {(service.priceCents / 100).toFixed(2)} {service.currency}
                    </small>
                  </div>
                  <div className="row-actions">
                    <span className={service.isActive ? "tag is-success" : "tag"}>
                      {service.isActive ? "Activo" : "Inactivo"}
                    </span>
                    {service.isActive ? (
                      <button
                        type="button"
                        className="danger-button"
                        disabled={disablingServiceId === service.id}
                        onClick={() => onDisableService(service.id)}
                      >
                        {disablingServiceId === service.id ? "Desactivando..." : "Desactivar"}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <h2>Disponibilidad</h2>
            <form className="form-grid" onSubmit={onCreateAvailability}>
              <label className="field">
                <span>Dia (0-6)</span>
                <input
                  type="number"
                  min={0}
                  max={6}
                  value={weekday}
                  onChange={(event) => setWeekday(event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Inicio</span>
                <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
              </label>
              <label className="field">
                <span>Fin</span>
                <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
              </label>
              <label className="field">
                <span>Intervalo (min)</span>
                <input
                  type="number"
                  min={5}
                  value={slotIntervalMin}
                  onChange={(event) => setSlotIntervalMin(event.target.value)}
                  required
                />
              </label>
              <button type="submit" disabled={savingAvailability}>
                {savingAvailability ? "Guardando..." : "Guardar horario"}
              </button>
            </form>
          </article>

          <article className="panel panel-wide">
            <h2>Agenda diaria</h2>
            <div className="agenda-controls">
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
              <button type="button" onClick={onLoadAgenda} disabled={loadingAgenda}>
                {loadingAgenda ? "Cargando..." : "Cargar agenda"}
              </button>
            </div>

            <ul className="agenda-list">
              {appointments.length === 0 ? <li className="muted">Sin turnos para el filtro actual.</li> : null}
              {appointments.map((appointment) => {
                const canCancel =
                  appointment.status === "CONFIRMED" || appointment.status === "PENDING";

                return (
                  <li key={appointment.id} className="agenda-item">
                    <strong>
                      {new Date(appointment.startsAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </strong>
                    <span>{appointment.service.name}</span>
                    <span>{appointment.clientUser.fullName}</span>
                    <span className={`tag status-${appointment.status.toLowerCase()}`}>
                      {appointment.status}
                    </span>
                    {canCancel ? (
                      <button
                        type="button"
                        className="danger-button"
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
          </article>
        </section>
      </section>
    </main>
  );
}

function PublicBookingPage({
  theme,
  onToggleTheme,
}: {
  theme: ThemeMode;
  onToggleTheme: () => void;
}) {
  const params = useParams();
  const businessSlug = params.businessSlug ?? "";
  const today = new Date().toISOString().slice(0, 10);

  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);

  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [error, setError] = useState<ApiErrorPayload | null>(null);
  const [confirmationId, setConfirmationId] = useState("");

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId),
    [serviceId, services],
  );

  useEffect(() => {
    if (!businessSlug) {
      setError({ code: "INVALID_BUSINESS_SLUG", message: "Business slug no valido." });
      return;
    }

    let cancelled = false;

    async function loadServices() {
      setLoadingServices(true);
      setError(null);

      try {
        const data = await api<{ services: Service[] }>(
          `/public/services?businessSlug=${encodeURIComponent(businessSlug)}`,
        );

        if (!cancelled) {
          setServices(data.services);
          if (data.services.length > 0) {
            setServiceId((current) => current || data.services[0].id);
          }
        }
      } catch (unknownError) {
        if (!cancelled) {
          const typedError = unknownError as ApiRequestError;
          setError({ code: typedError.code, message: typedError.message });
        }
      } finally {
        if (!cancelled) {
          setLoadingServices(false);
        }
      }
    }

    void loadServices();

    return () => {
      cancelled = true;
    };
  }, [businessSlug]);

  useEffect(() => {
    if (!serviceId || !date || !businessSlug) {
      setSlots([]);
      setSelectedSlot("");
      return;
    }

    let cancelled = false;

    async function loadSlots() {
      setLoadingSlots(true);
      setError(null);

      try {
        const data = await api<{ slots: string[] }>(
          `/appointments/slots?businessSlug=${encodeURIComponent(businessSlug)}&serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(date)}`,
        );

        if (!cancelled) {
          setSlots(data.slots);
          setSelectedSlot("");
        }
      } catch (unknownError) {
        if (!cancelled) {
          const typedError = unknownError as ApiRequestError;
          setError({ code: typedError.code, message: typedError.message });
          setSlots([]);
          setSelectedSlot("");
        }
      } finally {
        if (!cancelled) {
          setLoadingSlots(false);
        }
      }
    }

    void loadSlots();

    return () => {
      cancelled = true;
    };
  }, [businessSlug, date, serviceId]);

  async function onConfirmBooking() {
    if (!selectedSlot) {
      setError({ code: "SLOT_REQUIRED", message: "Selecciona un horario para continuar." });
      return;
    }

    if (!clientName || !clientEmail) {
      setError({ code: "CLIENT_REQUIRED", message: "Completa nombre y email para confirmar." });
      return;
    }

    setBooking(true);
    setError(null);

    try {
      const data = await api<{ id: string }>("/appointments", {
        method: "POST",
        body: JSON.stringify({
          businessSlug,
          serviceId,
          startsAt: selectedSlot,
          clientName,
          clientEmail,
          clientPhone: clientPhone || undefined,
        }),
      });

      setConfirmationId(data.id);
      setSelectedSlot("");
      setClientPhone("");
    } catch (unknownError) {
      const typedError = unknownError as ApiRequestError;
      setError({ code: typedError.code, message: typedError.message });
    } finally {
      setBooking(false);
    }
  }

  const canConfirm = Boolean(serviceId && date && selectedSlot && clientName && clientEmail);

  return (
    <main className="screen">
      <section className="surface booking-shell">
        <TopTabs theme={theme} onToggleTheme={onToggleTheme} />
        <header className="booking-header">
          <p className="kicker">Reserva publica</p>
          <h1>{businessSlug}</h1>
          <p>Sin cuenta ni login. Reserva en 4 pasos: servicio, fecha, horario y confirmacion.</p>
        </header>

        <ol className="progress-strip" aria-label="Pasos de reserva">
          <li className={serviceId ? "is-done" : "is-active"}>1. Servicio</li>
          <li className={date ? "is-done" : serviceId ? "is-active" : ""}>2. Fecha</li>
          <li className={selectedSlot ? "is-done" : date ? "is-active" : ""}>3. Horario</li>
          <li className={confirmationId ? "is-done" : selectedSlot ? "is-active" : ""}>4. Confirmar</li>
        </ol>

        <section className="booking-grid">
          <article className="panel">
            <h2>1. Elige servicio</h2>
            {loadingServices ? <p className="muted">Cargando servicios...</p> : null}
            {!loadingServices && services.length === 0 ? (
              <p className="muted">No hay servicios activos para este negocio.</p>
            ) : null}

            <div className="service-list">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  className={service.id === serviceId ? "service-chip is-selected" : "service-chip"}
                  onClick={() => {
                    setServiceId(service.id);
                    setConfirmationId("");
                  }}
                >
                  <strong>{service.name}</strong>
                  <small>
                    {service.durationMin} min - {(service.priceCents / 100).toFixed(2)} {service.currency}
                  </small>
                </button>
              ))}
            </div>
          </article>

          <article className="panel">
            <h2>2. Elige fecha</h2>
            <label className="field">
              <span>Fecha de reserva</span>
              <input
                type="date"
                value={date}
                min={today}
                onChange={(event) => {
                  setDate(event.target.value);
                  setConfirmationId("");
                }}
              />
            </label>
            {selectedService ? (
              <p className="muted">
                Servicio activo: <strong>{selectedService.name}</strong>
              </p>
            ) : null}
          </article>

          <article className="panel">
            <h2>3. Elige horario</h2>
            {loadingSlots ? <p className="muted">Buscando horarios disponibles...</p> : null}
            {!loadingSlots && slots.length === 0 ? (
              <p className="muted">No hay horarios disponibles para esa fecha.</p>
            ) : null}

            <div className="slot-grid">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className={slot === selectedSlot ? "slot-button is-selected" : "slot-button"}
                  onClick={() => {
                    setSelectedSlot(slot);
                    setConfirmationId("");
                  }}
                >
                  {new Date(slot).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </button>
              ))}
            </div>
          </article>

          <article className="panel">
            <h2>4. Confirma reserva</h2>
            <div className="form-grid">
              <label className="field">
                <span>Nombre</span>
                <input
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  placeholder="Tu nombre"
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(event) => setClientEmail(event.target.value)}
                  placeholder="tu@email.com"
                />
              </label>
              <label className="field">
                <span>Telefono (opcional)</span>
                <input
                  value={clientPhone}
                  onChange={(event) => setClientPhone(event.target.value)}
                  placeholder="+54..."
                />
              </label>
            </div>
            <button type="button" disabled={!canConfirm || booking} onClick={onConfirmBooking}>
              {booking ? "Confirmando..." : "Confirmar turno"}
            </button>
            {confirmationId ? (
              <p className="banner is-success" aria-live="polite">
                Turno confirmado. ID: {confirmationId}
              </p>
            ) : null}
          </article>
        </section>

        {error ? (
          <p className="banner is-error" aria-live="polite">
            {error.code} - {error.message}
          </p>
        ) : null}

        <div className="link-row">
          <Link to="/login" className="link-button is-muted">
            Soy prestador: login
          </Link>
        </div>
      </section>
    </main>
  );
}

function AppRoutes() {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem("accessToken") ?? "");
  const [theme, setTheme] = useState<ThemeMode>(
    () => (localStorage.getItem("themeMode") as ThemeMode | null) ?? "light",
  );
  const isAuthenticated = accessToken.length > 0;

  useEffect(() => {
    document.body.classList.toggle("theme-dark", theme === "dark");
    localStorage.setItem("themeMode", theme);
  }, [theme]);

  function onToggleTheme() {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }

  function onLogin(token: string) {
    setAccessToken(token);
    localStorage.setItem("accessToken", token);
  }

  function onLogout() {
    setAccessToken("");
    localStorage.removeItem("accessToken");
  }

  return (
    <Routes>
      <Route path="/" element={<Home theme={theme} onToggleTheme={onToggleTheme} />} />
      <Route
        path="/login"
        element={
          <LoginPage
            isAuthenticated={isAuthenticated}
            onLogin={onLogin}
            theme={theme}
            onToggleTheme={onToggleTheme}
          />
        }
      />
      <Route
        path="/admin"
        element={
          isAuthenticated ? (
            <AdminPage
              accessToken={accessToken}
              onLogout={onLogout}
              theme={theme}
              onToggleTheme={onToggleTheme}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="/book" element={<Navigate to="/book/demo-barberia" replace />} />
      <Route
        path="/book/:businessSlug"
        element={<PublicBookingPage theme={theme} onToggleTheme={onToggleTheme} />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return <AppRoutes />;
}

export default App;
