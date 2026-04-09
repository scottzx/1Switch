const API_BASE = '/api';

export interface Session {
  name: string;
  port: number;
  status: 'running' | 'stopped';
}

export async function listSessions(): Promise<Session[]> {
  const res = await fetch(`${API_BASE}/terminal/sessions`);
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
}

export async function createSession(name?: string): Promise<{ port: number; name: string }> {
  const res = await fetch(`${API_BASE}/terminal/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name || '' }),
  });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

export async function deleteSession(name: string): Promise<void> {
  const res = await fetch(`${API_BASE}/terminal/sessions/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Failed to delete session' }));
    throw new Error(data.error || 'Failed to delete session');
  }
}

export async function getDefaultSession(): Promise<Session> {
  const res = await fetch(`${API_BASE}/terminal/sessions/default`);
  if (!res.ok) throw new Error('Failed to fetch default session');
  return res.json();
}
