const KEY = "trimup_sim";

export function getSimulation() {
  try {
    const s = localStorage.getItem(KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export function startSimulation(role) {
  localStorage.setItem(KEY, JSON.stringify({ role, active: true }));
}

export function stopSimulation() {
  localStorage.removeItem(KEY);
}

export const ROLE_LABELS = {
  user: "Cliente (USER)",
  barber: "Barbeiro (BARBER)",
  admin: "Administrador (ADMIN)",
};

export const ROLE_COLORS = {
  user: "#6366f1",
  barber: "#D4A017",
  admin: "#10b981",
};