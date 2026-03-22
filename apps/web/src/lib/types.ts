export type Service = {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  currency: string;
  isActive: boolean;
};

export type AppointmentStatusFilter =
  | "ALL"
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

export type AppointmentItem = {
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

export type ThemeMode = "light" | "dark";
