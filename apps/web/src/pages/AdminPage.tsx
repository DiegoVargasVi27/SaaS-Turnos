import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiClientError } from "../lib/api";
import type { AuthSession } from "../lib/auth";

type ServiceItem = {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  currency: string;
  isActive: boolean;
};

type AppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

type AppointmentItem = {
  id: string;
  status: AppointmentStatus;
  startsAt: string;
  service: { id: string; name: string; durationMin: number };
  clientUser: { id: string; fullName: string; email: string; phone: string | null };
};

type AdminPageProps = {
  session: AuthSession;
  onLogout: () => void;
};

function toApiMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return `${error.code ?? "ERROR"}: ${error.message}`;
  }
  return (error as Error).message;
}

export function AdminPage({ session, onLogout }: AdminPageProps) {
  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${session.accessToken}` }),
    [session.accessToken],
  );

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const [serviceError, setServiceError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [agendaDate, setAgendaDate] = useState(new Date().toISOString().slice(0, 10));
  const [agendaStatus, setAgendaStatus] = useState<AppointmentStatus | "ALL">("ALL");
  const [loadingAgenda, setLoadingAgenda] = useState(false);
  const [agendaError, setAgendaError] = useState("");

  const loadServices = useCallback(async () => {
    setLoadingServices(true);
    setServiceError("");
    try {
      const data = await api<ServiceItem[]>("/services", { headers: authHeaders });
      setServices(data);
    } catch (error) {
      setServiceError(toApiMessage(error));
    } finally {
      setLoadingServices(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  async function onSaveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setSavingService(true);
    setServiceError("");

    const payload = {
      name: String(form.get("name") ?? ""),
      durationMin: Number(form.get("durationMin")),
      priceCents: Number(form.get("priceCents")),
      currency: String(form.get("currency") ?? "USD").toUpperCase(),
      isActive: form.get("isActive") === "on",
    };

    try {
      if (editingId) {
        await api<ServiceItem>(`/services/${editingId}`, {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
      } else {
        await api<ServiceItem>("/services", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            name: payload.name,
            durationMin: payload.durationMin,
            priceCents: payload.priceCents,
            currency: payload.currency,
          }),
        });
      }

      setEditingId(null);
      event.currentTarget.reset();
      await loadServices();
    } catch (error) {
      setServiceError(toApiMessage(error));
    } finally {
      setSavingService(false);
    }
  }

  function onEdit(service: ServiceItem) {
    setEditingId(service.id);
    const form = document.getElementById("service-form") as HTMLFormElement | null;
    if (!form) return;
    (form.elements.namedItem("name") as HTMLInputElement).value = service.name;
    (form.elements.namedItem("durationMin") as HTMLInputElement).value = String(service.durationMin);
    (form.elements.namedItem("priceCents") as HTMLInputElement).value = String(service.priceCents);
    (form.elements.namedItem("currency") as HTMLInputElement).value = service.currency;
    (form.elements.namedItem("isActive") as HTMLInputElement).checked = service.isActive;
  }

  async function onDisable(serviceId: string) {
    setServiceError("");
    try {
      await api<ServiceItem>(`/services/${serviceId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      await loadServices();
    } catch (error) {
      setServiceError(toApiMessage(error));
    }
  }

  async function onLoadAgenda() {
    setLoadingAgenda(true);
    setAgendaError("");
    try {
      const params = new URLSearchParams({ date: agendaDate });
      if (agendaStatus !== "ALL") params.set("status", agendaStatus);
      const data = await api<{ appointments: AppointmentItem[] }>(`/appointments?${params.toString()}`, {
        headers: authHeaders,
      });
      setAppointments(data.appointments);
    } catch (error) {
      setAgendaError(toApiMessage(error));
    } finally {
      setLoadingAgenda(false);
    }
  }

  async function onCancelAppointment(appointmentId: string) {
    setAgendaError("");
    try {
      await api(`/appointments/${appointmentId}/cancel`, {
        method: "PATCH",
        headers: authHeaders,
      });
      setAppointments((current) =>
        current.map((item) => (item.id === appointmentId ? { ...item, status: "CANCELLED" } : item)),
      );
    } catch (error) {
      setAgendaError(toApiMessage(error));
    }
  }

  return (
    <main className="admin-page">
      <header className="top-strip">
        <div>
          <p className="eyebrow">Panel Admin</p>
          <h1>Servicios y agenda</h1>
        </div>
        <div className="top-actions">
          <span className="role-pill">{session.role}</span>
          <button type="button" className="ghost" onClick={onLogout}>
            Cerrar sesion
          </button>
        </div>
      </header>

      <section className="grid-two">
        <article className="card">
          <h2>{editingId ? "Editar servicio" : "Crear servicio"}</h2>
          <form id="service-form" className="form" onSubmit={onSaveService}>
            <label className="field">
              <span>Nombre</span>
              <input name="name" required placeholder="Corte clasico" />
            </label>
            <label className="field">
              <span>Duracion (min)</span>
              <input name="durationMin" type="number" min={5} required defaultValue={30} />
            </label>
            <label className="field">
              <span>Precio (centavos)</span>
              <input name="priceCents" type="number" min={0} required defaultValue={1200} />
            </label>
            <label className="field">
              <span>Moneda</span>
              <input name="currency" required defaultValue="USD" maxLength={3} />
            </label>
            <label className="check-field">
              <input name="isActive" type="checkbox" defaultChecked />
              <span>Servicio activo</span>
            </label>
            <div className="row-actions">
              <button type="submit" disabled={savingService}>
                {savingService ? "Guardando..." : editingId ? "Actualizar" : "Crear"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setEditingId(null);
                    const form = document.getElementById("service-form") as HTMLFormElement | null;
                    form?.reset();
                  }}
                >
                  Cancelar edicion
                </button>
              ) : null}
            </div>
          </form>
          {serviceError ? <p className="alert error">{serviceError}</p> : null}
        </article>

        <article className="card">
          <h2>Servicios del negocio</h2>
          {loadingServices ? <p className="helper">Cargando servicios...</p> : null}
          <ul className="list">
            {services.map((service) => (
              <li key={service.id} className="list-item">
                <div>
                  <strong>{service.name}</strong>
                  <p>
                    {service.durationMin} min - {(service.priceCents / 100).toFixed(2)} {service.currency}
                  </p>
                </div>
                <div className="row-actions">
                  <span className={`badge ${service.isActive ? "ok" : "muted"}`}>
                    {service.isActive ? "Activo" : "Inactivo"}
                  </span>
                  <button type="button" className="ghost" onClick={() => onEdit(service)}>
                    Editar
                  </button>
                  <button type="button" className="danger" onClick={() => onDisable(service.id)}>
                    Desactivar
                  </button>
                </div>
              </li>
            ))}
            {!loadingServices && services.length === 0 ? <li>No hay servicios aun.</li> : null}
          </ul>
        </article>
      </section>

      <section className="card">
        <h2>Agenda operativa</h2>
        <div className="row-fields">
          <label className="field">
            <span>Fecha</span>
            <input type="date" value={agendaDate} onChange={(event) => setAgendaDate(event.target.value)} />
          </label>
          <label className="field">
            <span>Estado</span>
            <select value={agendaStatus} onChange={(event) => setAgendaStatus(event.target.value as AppointmentStatus | "ALL") }>
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
        {agendaError ? <p className="alert error">{agendaError}</p> : null}

        <ul className="list">
          {appointments.map((appointment) => (
            <li key={appointment.id} className="list-item">
              <div>
                <strong>
                  {new Date(appointment.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {appointment.service.name}
                </strong>
                <p>
                  {appointment.clientUser.fullName} ({appointment.clientUser.email})
                </p>
              </div>
              <div className="row-actions">
                <span className="badge muted">{appointment.status}</span>
                {(appointment.status === "PENDING" || appointment.status === "CONFIRMED") ? (
                  <button type="button" className="danger" onClick={() => onCancelAppointment(appointment.id)}>
                    Cancelar
                  </button>
                ) : null}
              </div>
            </li>
          ))}
          {appointments.length === 0 ? <li>Sin turnos cargados.</li> : null}
        </ul>
      </section>
    </main>
  );
}
