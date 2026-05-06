const BASE = "https://7t5hq0otg4.execute-api.us-west-2.amazonaws.com";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("meowpass_token");
}

export function setToken(t: string) { localStorage.setItem("meowpass_token", t); }
export function clearToken() { localStorage.removeItem("meowpass_token"); }
export function hasToken() { return !!getToken(); }

export function getMasterKey() { return sessionStorage.getItem("meowpass_mk"); }
export function setMasterKey(k: string) { sessionStorage.setItem("meowpass_mk", k); }
export function clearMasterKey() { sessionStorage.removeItem("meowpass_mk"); }

export function getSalt() { return localStorage.getItem("meowpass_salt"); }
export function setSalt(s: string) { localStorage.setItem("meowpass_salt", s); }

export function clearAll() {
  clearToken(); clearMasterKey();
  localStorage.removeItem("meowpass_salt");
}

async function request(method: string, path: string, body?: unknown) {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const opts: RequestInit = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const resp = await fetch(BASE + path, opts);
  if (resp.status === 204) return null;
  const data = await resp.json().catch(() => null);
  if (!resp.ok) throw new Error(data?.error || `API error (${resp.status})`);
  return data;
}

export const login = (email: string, password: string) => request("POST", "/auth/login", { email, password });
export const register = (email: string, name: string, password: string) => request("POST", "/auth/register", { email, name, password });
export const getMe = () => request("GET", "/auth/me");
export const listVaults = () => request("GET", "/vaults");
export const getVault = (id: string) => request("GET", `/vaults/${id}`);
export const createVault = (name: string, encryptedKey: number[]) => request("POST", "/vaults", { name, encrypted_key: encryptedKey });
export const deleteVault = (id: string) => request("DELETE", `/vaults/${id}`);
export const listSecrets = (vaultId: string, env?: string) => request("GET", `/vaults/${vaultId}/secrets${env ? `?env=${encodeURIComponent(env)}` : ""}`);
export const getSecret = (vaultId: string, key: string, env?: string) => request("GET", `/vaults/${vaultId}/secrets/${key}${env ? `?env=${encodeURIComponent(env)}` : ""}`);
export const setSecret = (vaultId: string, key: string, encryptedValue: number[]) => request("PUT", `/vaults/${vaultId}/secrets/${key}`, { encrypted_value: encryptedValue, nonce: [] });
export const deleteSecret = (vaultId: string, key: string, env?: string) => request("DELETE", `/vaults/${vaultId}/secrets/${key}${env ? `?env=${encodeURIComponent(env)}` : ""}`);

// Audit logs
export const listAuditLogs = (vaultId?: string, limit = 50) => {
  const params = new URLSearchParams();
  if (vaultId) params.set("vault_id", vaultId);
  params.set("limit", String(limit));
  return request("GET", `/audit-logs?${params}`);
};

// Teams
export const listTeams = () => request("GET", "/teams");
export const createTeam = (name: string) => request("POST", "/teams", { name });
export const listTeamMembers = (teamId: string) => request("GET", `/teams/${teamId}/members`);
export const inviteTeamMember = (teamId: string, email: string, role = "member") => request("POST", `/teams/${teamId}/invite`, { email, role });

// API Keys
export const listApiKeys = () => request("GET", "/apikeys");
export const createApiKey = (name: string) => request("POST", "/apikeys", { name, scopes: ["read", "write"] });
export const revokeApiKey = (id: string) => request("DELETE", `/apikeys/${id}`);

// Subscription
export const getSubscription = () => request("GET", "/subscription");
