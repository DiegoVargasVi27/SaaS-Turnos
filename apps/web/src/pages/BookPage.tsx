import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiClientError } from "../lib/api";

type ServiceItem = {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  currency: string;
};

function toApiMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return `${error.code ?? "ERROR"}: ${error.message}`;
  }
  return (error as Error).message;
}

export function BookPage() {
  const { businessSlug } = useParams<{ businessSlug: string }>();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId),
    [services, selectedServiceId],
  );

  useEffect(() => {
    if (!businessSlug) return;
    void loadServices(businessSlug);
  }, [businessSlug]);

  async function loadServices(slug: string) {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ services: ServiceItem[] }>(
        `/public/services?businessSlug=${encodeURIComponent(slug)}`,
      );
      setServices(data.services);
    } catch (error) {
      setError(toApiMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function loadSlots() {
    if (!businessSlug || !selectedServiceId) return;
    setLoading(true);
    setError("");
    setSelectedSlot("");
    try {
      const data = await api<{ slots: string[] }>(
        `/appointments/slots?businessSlug=${encodeURIComponent(businessSlug)}&serviceId=${encodeURIComponent(selectedServiceId)}&date=${encodeURIComponent(selectedDate)}`,
      );
      setSlots(data.slots);
      setMessage(data.slots.length ? "Paso 3: elige horario." : "No hay horarios para esa fecha.");
    } catch (error) {
      setError(toApiMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function onConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!businessSlug || !selectedServiceId || !selectedSlot) return;

    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api("/appointments", {
        method: "POST",
        body: JSON.stringify({
          businessSlug,
          serviceId: selectedServiceId,
          startsAt: selectedSlot,
          clientName: form.get("clientName"),
          clientEmail: form.get("clientEmail"),
          clientPhone: form.get("clientPhone"),
        }),
      });
      setMessage("Reserva confirmada. Te esperamos.");
      setSelectedSlot("");
      setSlots([]);
      event.currentTarget.reset();
    } catch (error) {
      setError(toApiMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (!businessSlug) {
    return (
      <main className="book-page">
        <section className="card">
          <h1>Booking no disponible</h1>
          <p>Falta el slug del negocio en la URL.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="book-page">
      <header className="top-strip">
        <div>
          <p className="eyebrow">Reserva publica</p>
          <h1>Agenda tu hora en 4 clics</h1>
          <p className="helper">Negocio: {businessSlug}</p>
        </div>
        <Link className="ghost-link" to="/login">
          Acceso admin
        </Link>
      </header>

      <section className="grid-two">
        <article className="card">
          <h2>Paso 1: elige servicio</h2>
          {loading && services.length === 0 ? <p className="helper">Cargando servicios...</p> : null}
          <div className="choice-grid">
            {services.map((service) => (
              <button
                type="button"
                key={service.id}
                className={`choice ${selectedServiceId === service.id ? "selected" : ""}`}
                onClick={() => {
                  setSelectedServiceId(service.id);
                  setSlots([]);
                  setSelectedSlot("");
                  setMessage("Paso 2: selecciona fecha y busca horarios.");
                }}
              >
                <strong>{service.name}</strong>
                <span>
                  {service.durationMin} min - {(service.priceCents / 100).toFixed(2)} {service.currency}
                </span>
              </button>
            ))}
            {!loading && services.length === 0 ? <p>No hay servicios activos por ahora.</p> : null}
          </div>
        </article>

        <article className="card">
          <h2>Paso 2: elige fecha</h2>
          <div className="row-fields">
            <label className="field">
              <span>Fecha</span>
              <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
            </label>
            <button type="button" disabled={!selectedServiceId || loading} onClick={loadSlots}>
              {loading ? "Buscando..." : "Buscar horarios"}
            </button>
          </div>

          <h2>Paso 3: elige horario</h2>
          <div className="choice-grid slots">
            {slots.map((slot) => (
              <button
                key={slot}
                type="button"
                className={`choice ${selectedSlot === slot ? "selected" : ""}`}
                onClick={() => {
                  setSelectedSlot(slot);
                  setMessage("Paso 4: confirma tu reserva.");
                }}
              >
                {new Date(slot).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </button>
            ))}
            {slots.length === 0 ? <p>Sin horarios cargados.</p> : null}
          </div>
        </article>
      </section>

      <section className="card">
        <h2>Paso 4: confirmar</h2>
        <p className="helper">Servicio: {selectedService ? selectedService.name : "Sin seleccionar"}</p>
        <form className="form" onSubmit={onConfirm}>
          <div className="grid-two">
            <label className="field">
              <span>Nombre</span>
              <input name="clientName" required placeholder="Tu nombre" />
            </label>
            <label className="field">
              <span>Email</span>
              <input name="clientEmail" type="email" required placeholder="tu@email.com" />
            </label>
          </div>
          <label className="field">
            <span>Telefono (opcional)</span>
            <input name="clientPhone" placeholder="123456789" />
          </label>
          <button type="submit" disabled={!selectedSlot || saving}>
            {saving ? "Confirmando..." : "Confirmar reserva"}
          </button>
        </form>

        {message ? <p className="alert ok">{message}</p> : null}
        {error ? <p className="alert error">{error}</p> : null}
      </section>
    </main>
  );
}
