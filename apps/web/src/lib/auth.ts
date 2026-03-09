export type AuthRole = "OWNER" | "ADMIN" | "CLIENT";

export type AuthSession = {
  accessToken: string;
  role: AuthRole;
  userId: string;
  businessId: string;
};

const STORAGE_KEY = "saas-turnos.session";

type JwtPayload = {
  sub: string;
  businessId: string;
  role: AuthRole;
  exp?: number;
};

function parseJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = atob(padded);
    const payload = JSON.parse(decoded) as JwtPayload;
    return payload;
  } catch {
    return null;
  }
}

function isValidRole(value: unknown): value is AuthRole {
  return value === "OWNER" || value === "ADMIN" || value === "CLIENT";
}

export function sessionFromToken(accessToken: string): AuthSession | null {
  const payload = parseJwtPayload(accessToken);
  if (!payload || !payload.sub || !payload.businessId || !isValidRole(payload.role)) {
    return null;
  }

  if (payload.exp && payload.exp * 1000 < Date.now()) {
    return null;
  }

  return {
    accessToken,
    role: payload.role,
    userId: payload.sub,
    businessId: payload.businessId,
  };
}

export function loadSession(): AuthSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { accessToken?: string };
    if (!parsed.accessToken) return null;
    return sessionFromToken(parsed.accessToken);
  } catch {
    return null;
  }
}

export function persistSession(session: AuthSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken: session.accessToken }));
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}
