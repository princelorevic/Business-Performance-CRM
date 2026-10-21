// Thin fetch wrapper. Session is an httpOnly cookie (never readable by JS).
// The X-Requested-With header is required by the server as CSRF protection.
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status; this.code = code; this.details = details;
  }
}

async function request(method, path, { body, query } = {}) {
  const qs = query ? '?' + new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString() : '';
  let res;
  try {
    res = await fetch(`/api${path}${qs}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'bp-crm' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection and try again.');
  }
  if (res.status === 204) return null;
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    const e = data?.error ?? {};
    if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('bp:unauthorized'));
    throw new ApiError(res.status, e.code ?? 'ERROR', e.message ?? 'Request failed', e.details);
  }
  return data;
}

export const api = {
  get: (p, query) => request('GET', p, { query }),
  post: (p, body) => request('POST', p, { body: body ?? {} }),
  patch: (p, body) => request('PATCH', p, { body }),
  del: (p) => request('DELETE', p),
  csvUrl: (p, query) => `/api${p}?${new URLSearchParams(query)}`,
};

// Field-level messages from a VALIDATION_ERROR, keyed by field name.
export function fieldErrors(err) {
  if (!(err instanceof ApiError) || err.code !== 'VALIDATION_ERROR') return {};
  return Object.fromEntries((err.details ?? []).map((d) => [d.field, d.message]));
}
