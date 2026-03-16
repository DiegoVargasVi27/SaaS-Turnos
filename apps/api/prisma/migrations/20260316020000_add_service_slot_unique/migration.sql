-- Ensure unique appointments per service + slot
ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_serviceId_startsAt_key" UNIQUE ("serviceId", "startsAt");
