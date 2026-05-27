import axios from '@/lib/api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const SESSION_KEY = 'hf-funnel-session-id';

function getSessionId(): string {
  if (typeof window === 'undefined') {
    return 'server-render';
  }

  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) {
    return existing;
  }

  const generated =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;

  window.sessionStorage.setItem(SESSION_KEY, generated);
  return generated;
}

export async function trackDepositFunnelStep(
  token: string | null,
  eventName: string,
  stepName: string,
): Promise<void> {
  if (!token) {
    return;
  }

  try {
    await axios.post(
      `${API_BASE_URL}/api/v1/analytics/funnel/events`,
      {
        eventName,
        funnelName: 'deposit-conversion',
        stepName,
        sessionId: getSessionId(),
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch {
    // Tracking should never block the primary transaction flow.
  }
}
