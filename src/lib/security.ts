const TICKET_TOKENS_STORAGE_KEY = "clayjar_ticket_tokens_v2";
const ACTIVE_TICKET_STORAGE_KEY = "clayjar_customer_active_ticket_v1";

/**
 * Validates that an external URL (e.g., customer artwork file link) uses `https:`
 * to prevent `javascript:`, `data:`, or mixed-content XSS/phishing vectors.
 */
export function sanitizeExternalUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 1000) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Prevents open-redirect attacks by allowing only single-slash app-relative paths
 * free of backslashes (`/\evil.com`) and control characters.
 */
export function sanitizeSafeNextPath(
  raw?: string | null,
  fallback = "/account"
): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    /[\u0000-\u001F\u007F]/.test(trimmed)
  ) {
    return fallback;
  }
  return trimmed;
}

export function isValidEmail(email: string): boolean {
  const clean = email.trim();
  return clean.length >= 3 && clean.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
}

export function getStoredTicketTokens(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(TICKET_TOKENS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    return {};
  } catch {
    return {};
  }
}

export function saveStoredTicketToken(ticketId: string, accessToken: string): void {
  if (typeof window === "undefined" || !ticketId || !accessToken) return;
  try {
    const current = getStoredTicketTokens();
    current[ticketId] = accessToken;
    window.localStorage.setItem(TICKET_TOKENS_STORAGE_KEY, JSON.stringify(current));
    window.localStorage.setItem(ACTIVE_TICKET_STORAGE_KEY, ticketId);
  } catch {
    // Ignore storage quota errors in private browsing
  }
}

export function getActiveStoredTicketId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_TICKET_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setActiveStoredTicketId(ticketId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (ticketId) {
      window.localStorage.setItem(ACTIVE_TICKET_STORAGE_KEY, ticketId);
    } else {
      window.localStorage.removeItem(ACTIVE_TICKET_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

