/* Small browser client for Supabase Auth + PostgREST; uses only public publishable/anon key. */
(() => {
  'use strict';
  const cfg = window.KIDNOVA_SUPABASE_CONFIG || {};
  const url = String(cfg.url || '').replace(/\/$/, '');
  const publicKey = String(cfg.anonKey || '');
  const storageKey = typeof window.KIDNOVA_SESSION_KEY === 'string' && /^kidnova-[a-z0-9-]{3,40}$/.test(window.KIDNOVA_SESSION_KEY) ? window.KIDNOVA_SESSION_KEY : 'kidnova-supabase-demo-session-v2';
  let memorySession = null;
  const isPublicBrowserKey = key => {
    if (/^sb_secret_/i.test(key)) return false;
    if (/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(key)) return true;
    const payload = key.split('.')[1];
    if (!payload || typeof atob !== 'function') return false;
    try {
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(normalized)).role === 'anon';
    } catch (_) { return false; }
  };
  const configured = /^https:\/\/[\w.-]+\.supabase\.co$/.test(url) && isPublicBrowserKey(publicKey);
  const storage = {
    get() { try { const raw = localStorage.getItem(storageKey); return raw ? JSON.parse(raw) : memorySession; } catch (_) { return memorySession; } },
    set(value) { memorySession = value; try { if (value) localStorage.setItem(storageKey, JSON.stringify(value)); else localStorage.removeItem(storageKey); } catch (_) {} }
  };
  async function request(path, options = {}, accessToken = null) {
    if (!configured) throw new Error('supabase_not_configured');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`${url}${path}`, {
        ...options, signal: controller.signal,
        headers: { apikey: publicKey, ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), 'Content-Type': 'application/json', ...(options.headers || {}) }
      });
      const text = await response.text();
      let body; try { body = text ? JSON.parse(text) : null; } catch (_) { body = null; }
      if (!response.ok) {
        const message = body?.msg || body?.message || body?.error_description || body?.error || `HTTP ${response.status}`;
        const error = new Error(String(message)); error.status = response.status; error.code = body?.code || body?.error_code || ''; throw error;
      }
      return body;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('request_timeout');
      throw error;
    } finally { clearTimeout(timeout); }
  }
  const normalizeSession = value => ({ ...value, expires_at: value.expires_at || Math.floor(Date.now() / 1000) + Number(value.expires_in || 3600) });
  async function refreshSession() {
    const current = storage.get();
    if (!current?.refresh_token) return null;
    const next = await request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: current.refresh_token }) });
    const normalized = normalizeSession(next); storage.set(normalized); return normalized;
  }
  async function currentSession() {
    const current = storage.get();
    if (current?.access_token && Number(current.expires_at || 0) * 1000 > Date.now() + 60000) return current;
    if (current?.refresh_token) { try { return await refreshSession(); } catch (_) { storage.set(null); } }
    return null;
  }
  async function signIn(email, password) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !password) throw new Error('email_password_required');
    const next = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: normalizedEmail, password }) });
    if (!next?.access_token || !next?.refresh_token) throw new Error('invalid_auth_response');
    const normalized = normalizeSession(next); storage.set(normalized); return { user: normalized.user };
  }
  async function signOut() {
    const current = await currentSession();
    try { if (current?.access_token) await request('/auth/v1/logout', { method: 'POST' }, current.access_token); }
    finally { storage.set(null); }
  }
  async function rpc(name, body = {}) {
    let current = await currentSession();
    if (!current?.access_token) throw new Error('authentication_required');
    try { return await request(`/rest/v1/rpc/${encodeURIComponent(name)}`, { method: 'POST', body: JSON.stringify(body) }, current.access_token); }
    catch (error) {
      if (error.status !== 401) throw error;
      current = await refreshSession();
      if (!current?.access_token) throw new Error('authentication_required');
      return request(`/rest/v1/rpc/${encodeURIComponent(name)}`, { method: 'POST', body: JSON.stringify(body) }, current.access_token);
    }
  }
  window.KidNovaSupabase = Object.freeze({ configured, signIn, signOut, currentSession, rpc });
})();
