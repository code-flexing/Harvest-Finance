/**
 * Derives a short, human-readable device name from a raw User-Agent string.
 *
 * The result follows the pattern "<browser> on <OS>", e.g.:
 *   "Chrome on Windows"
 *   "Safari on iPhone"
 *   "Firefox on macOS"
 *   "Mobile Safari on Android"
 *   "Postman / curl" (non-browser clients)
 *
 * This is intentionally a lightweight regex approach — no heavy UA-parser
 * library is required for the summary label shown in the sessions list.
 */
export function deriveDeviceName(userAgent: string | undefined | null): string {
  if (!userAgent) return 'Unknown device';

  const ua = userAgent;

  // ── Browser detection ────────────────────────────────────────────────────
  let browser = 'Unknown browser';

  if (/Edg\//i.test(ua)) {
    browser = 'Edge';
  } else if (/OPR\//i.test(ua) || /Opera\//i.test(ua)) {
    browser = 'Opera';
  } else if (/SamsungBrowser\//i.test(ua)) {
    browser = 'Samsung Browser';
  } else if (/Chrome\//i.test(ua) && !/Chromium\//i.test(ua)) {
    browser = 'Chrome';
  } else if (/Chromium\//i.test(ua)) {
    browser = 'Chromium';
  } else if (/Firefox\//i.test(ua) || /FxiOS\//i.test(ua)) {
    browser = 'Firefox';
  } else if (/Safari\//i.test(ua) && /Mobile/i.test(ua)) {
    browser = 'Mobile Safari';
  } else if (/Safari\//i.test(ua)) {
    browser = 'Safari';
  } else if (/curl\//i.test(ua)) {
    return 'curl';
  } else if (/PostmanRuntime\//i.test(ua)) {
    return 'Postman';
  } else if (/python-requests\//i.test(ua)) {
    return 'Python requests';
  } else if (/axios\//i.test(ua)) {
    return 'axios';
  }

  // ── OS / platform detection ───────────────────────────────────────────────
  let os = 'Unknown OS';

  if (/iPhone/i.test(ua)) {
    os = 'iPhone';
  } else if (/iPad/i.test(ua)) {
    os = 'iPad';
  } else if (/Android/i.test(ua)) {
    os = 'Android';
  } else if (/Windows Phone/i.test(ua)) {
    os = 'Windows Phone';
  } else if (/Windows NT/i.test(ua)) {
    os = 'Windows';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  } else if (/CrOS/i.test(ua)) {
    os = 'ChromeOS';
  }

  return `${browser} on ${os}`;
}
