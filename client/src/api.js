// The ONLY way the frontend talks to data: our own /api. Never Supabase directly.

export class ApiError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      ...options,
      headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', "Can't reach the server. Check your connection and try again.");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const e = json?.error ?? {};
    throw new ApiError(res.status, e.code ?? 'HTTP_ERROR', e.message ?? `Request failed (${res.status})`, e.details);
  }
  return json.data;
}

export const api = {
  gradeScale: () => request('/grade-scale'),
  listRecords: () => request('/records'),
  getRecord: (id) => request(`/records/${encodeURIComponent(id)}`),
  createRecord: (body) => request('/records', { method: 'POST', body: JSON.stringify(body) }),
};
