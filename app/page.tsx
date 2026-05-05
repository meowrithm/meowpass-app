"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Shield, Lock, Plus, Copy, Check, Trash2, ArrowLeft, LogOut, Key, Loader2, Eye, EyeOff } from "lucide-react";
import * as api from "@/lib/api";
import * as crypto from "@/lib/crypto";

type View = "login" | "unlock" | "vaults" | "secrets" | "secret-form";
interface ViewParams { vaultId?: string; vaultName?: string; mode?: "add" | "edit"; keyName?: string; }

export default function App() {
  const [view, setView] = useState<View>("login");
  const [params, setParams] = useState<ViewParams>({});
  const [loading, setLoading] = useState(true);

  const navigate = useCallback((v: View, p: ViewParams = {}) => { setView(v); setParams(p); }, []);

  useEffect(() => {
    if (api.hasToken()) {
      if (api.getMasterKey()) navigate("vaults");
      else navigate("unlock");
    } else {
      navigate("login");
    }
    setLoading(false);
  }, [navigate]);

  if (loading) return <Shell><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[var(--orange)]" /></div></Shell>;

  return (
    <Shell>
      {view === "login" && <LoginView navigate={navigate} />}
      {view === "unlock" && <UnlockView navigate={navigate} />}
      {view === "vaults" && <VaultsView navigate={navigate} />}
      {view === "secrets" && <SecretsView navigate={navigate} params={params} />}
      {view === "secret-form" && <SecretFormView navigate={navigate} params={params} />}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-start justify-center p-4 pt-12 md:pt-20">
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );
}

// ── Login ──

function LoginView({ navigate }: { navigate: (v: View, p?: ViewParams) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const data = mode === "register"
        ? await api.register(email, name, password)
        : await api.login(email, password);
      api.setToken(data.token);
      if (data.user?.key_salt) api.setSalt(data.user.key_salt);
      navigate("unlock");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setBusy(false); }
  }

  return (
    <div>
      <Header />
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && <Field label="Name" value={name} onChange={setName} placeholder="Your name" />}
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <Field label="Password" type="password" value={password} onChange={setPassword} placeholder={mode === "register" ? "Create a password" : "Your password"} />
          {error && <ErrorBox msg={error} />}
          <Btn disabled={busy}>{busy ? "Loading..." : mode === "register" ? "Create Account" : "Sign In"}</Btn>
        </form>
        <p className="text-center text-sm text-[var(--text-muted)] mt-4">
          {mode === "login" ? <>Don&apos;t have an account? <a href="#" onClick={(e) => { e.preventDefault(); setMode("register"); setError(""); }} className="text-[var(--orange)] hover:underline">Sign up</a></> : <>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setMode("login"); setError(""); }} className="text-[var(--orange)] hover:underline">Sign in</a></>}
        </p>
      </Card>
    </div>
  );
}

// ── Unlock ──

function UnlockView({ navigate }: { navigate: (v: View) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      let salt = api.getSalt();
      if (!salt) {
        const me = await api.getMe();
        if (me?.key_salt) { salt = me.key_salt; api.setSalt(salt!); }
      }
      if (!salt) throw new Error("No salt found. Please login via CLI first.");
      const saltBytes = crypto.base64ToBytes(salt);
      const key = await crypto.deriveKey(password, saltBytes);
      api.setMasterKey(crypto.bytesToHex(key));
      navigate("vaults");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to derive key");
    } finally { setBusy(false); }
  }

  return (
    <div>
      <Header subtitle="Enter your master password to decrypt secrets." />
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Master Password" type="password" value={password} onChange={setPassword} placeholder="Your master password" autoFocus />
          {error && <ErrorBox msg={error} />}
          <Btn disabled={busy}>{busy ? "Deriving key..." : "Unlock"}</Btn>
        </form>
      </Card>
    </div>
  );
}

// ── Vaults ──

function VaultsView({ navigate }: { navigate: (v: View, p?: ViewParams) => void }) {
  const [vaults, setVaults] = useState<Array<{ id: string; name: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [user, setUser] = useState<{ email: string; subscription_tier: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [v, me] = await Promise.all([api.listVaults(), api.getMe()]);
      setVaults(v || []);
      setUser(me);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const mk = api.getMasterKey();
      if (!mk) { navigate("unlock"); return; }
      const masterKey = crypto.hexToBytes(mk);
      const vaultKey = crypto.generateVaultKey();
      const encKey = await crypto.encryptVaultKey(vaultKey, masterKey);
      await api.createVault(newName.trim(), Array.from(encKey));
      setNewName("");
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed");
    }
    setCreating(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Image src="/images/logo-192.png" alt="MeowPass" width={28} height={28} className="rounded-lg" />
          <h1 className="text-lg font-bold">Vaults</h1>
        </div>
        <div className="flex items-center gap-2">
          {user && <span className="text-xs px-2 py-1 rounded-full bg-[var(--orange)]/20 text-[var(--orange)] capitalize">{user.subscription_tier}</span>}
          <button onClick={() => { api.clearAll(); navigate("login"); }} className="p-2 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors" title="Log out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Card>
        {loading ? <div className="text-center py-8 text-[var(--text-muted)]"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div> :
          vaults.length === 0 ? <p className="text-center py-8 text-[var(--text-muted)] text-sm">No vaults yet. Create one below.</p> :
          <div className="space-y-2">
            {vaults.map(v => (
              <button key={v.id} onClick={() => navigate("secrets", { vaultId: v.id, vaultName: v.name })}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-[var(--border)] hover:border-[var(--orange)]/30 hover:bg-[var(--bg-card)] transition-all text-left">
                <div>
                  <div className="font-medium text-sm">{v.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{v.created_at?.slice(0, 10)}</div>
                </div>
                <ArrowLeft className="w-4 h-4 text-[var(--text-muted)] rotate-180" />
              </button>
            ))}
          </div>
        }
      </Card>

      <div className="flex gap-2 mt-4">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New vault name"
          onKeyDown={e => e.key === "Enter" && handleCreate()}
          className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-sm outline-none focus:border-[var(--orange)] transition-colors" />
        <button onClick={handleCreate} disabled={creating}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--orange)] to-[var(--orange-light)] text-white text-sm font-medium hover:shadow-lg hover:shadow-[var(--orange)]/25 transition-all disabled:opacity-50">
          {creating ? "..." : "Create"}
        </button>
      </div>
    </div>
  );
}

// ── Secrets ──

function SecretsView({ navigate, params }: { navigate: (v: View, p?: ViewParams) => void; params: ViewParams }) {
  const { vaultId, vaultName } = params;
  const [secrets, setSecrets] = useState<Array<{ key_name: string; version: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    try { setSecrets(await api.listSecrets(vaultId) || []); } catch { /* ignore */ }
    setLoading(false);
  }, [vaultId]);

  useEffect(() => { load(); }, [load]);

  async function handleCopy(keyName: string) {
    if (!vaultId) return;
    try {
      const mk = api.getMasterKey();
      if (!mk) { navigate("unlock"); return; }
      const masterKey = crypto.hexToBytes(mk);
      const vault = await api.getVault(vaultId);
      const encKeyBytes = vault.encrypted_key instanceof Array ? new Uint8Array(vault.encrypted_key) : crypto.base64ToBytes(vault.encrypted_key);
      const vaultKey = await crypto.decryptVaultKey(encKeyBytes, masterKey);
      const secret = await api.getSecret(vaultId, keyName);
      const encBytes = secret.encrypted_value instanceof Array ? new Uint8Array(secret.encrypted_value) : crypto.base64ToBytes(secret.encrypted_value);
      const plaintext = await crypto.decrypt(encBytes, vaultKey);
      await navigator.clipboard.writeText(new TextDecoder().decode(plaintext));
      setCopied(keyName);
      setTimeout(() => setCopied(""), 1500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Decrypt failed");
    }
  }

  async function handleDelete(keyName: string) {
    if (!vaultId || !confirm(`Delete ${keyName}?`)) return;
    try { await api.deleteSecret(vaultId, keyName); load(); } catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("vaults")} className="p-2 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-bold">{vaultName}</h1>
        </div>
        <button onClick={() => navigate("secret-form", { vaultId, vaultName, mode: "add" })}
          className="p-2 rounded-lg bg-[var(--orange)]/10 text-[var(--orange)] hover:bg-[var(--orange)]/20 transition-colors" title="Add secret">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <Card>
        {loading ? <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[var(--text-muted)]" /></div> :
          secrets.length === 0 ? <p className="text-center py-8 text-[var(--text-muted)] text-sm">No secrets yet. Click + to add one.</p> :
          <div className="space-y-1">
            {secrets.map(s => (
              <div key={s.key_name} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg)] transition-colors group">
                <button onClick={() => navigate("secret-form", { vaultId, vaultName, mode: "edit", keyName: s.key_name })} className="text-left flex-1 min-w-0">
                  <div className="font-mono text-sm truncate">{s.key_name}</div>
                  <div className="text-xs text-[var(--text-muted)]">v{s.version}</div>
                </button>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleCopy(s.key_name)} className="p-1.5 rounded hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors" title="Copy">
                    {copied === s.key_name ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => handleDelete(s.key_name)} className="p-1.5 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        }
      </Card>
    </div>
  );
}

// ── Secret Form ──

function SecretFormView({ navigate, params }: { navigate: (v: View, p?: ViewParams) => void; params: ViewParams }) {
  const { vaultId, vaultName, mode, keyName } = params;
  const isEdit = mode === "edit";
  const [key, setKey] = useState(keyName || "");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEdit);

  useEffect(() => {
    if (!isEdit || !vaultId || !keyName) return;
    (async () => {
      try {
        const mk = api.getMasterKey();
        if (!mk) { navigate("unlock"); return; }
        const masterKey = crypto.hexToBytes(mk);
        const vault = await api.getVault(vaultId);
        const encKeyBytes = vault.encrypted_key instanceof Array ? new Uint8Array(vault.encrypted_key) : crypto.base64ToBytes(vault.encrypted_key);
        const vaultKey = await crypto.decryptVaultKey(encKeyBytes, masterKey);
        const secret = await api.getSecret(vaultId, keyName);
        const encBytes = secret.encrypted_value instanceof Array ? new Uint8Array(secret.encrypted_value) : crypto.base64ToBytes(secret.encrypted_value);
        const plaintext = await crypto.decrypt(encBytes, vaultKey);
        setValue(new TextDecoder().decode(plaintext));
      } catch { /* ignore */ }
      setLoadingExisting(false);
    })();
  }, [isEdit, vaultId, keyName, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      if (!vaultId || !key.trim()) throw new Error("Key name required");
      const mk = api.getMasterKey();
      if (!mk) { navigate("unlock"); return; }
      const masterKey = crypto.hexToBytes(mk);
      const vault = await api.getVault(vaultId);
      const encKeyBytes = vault.encrypted_key instanceof Array ? new Uint8Array(vault.encrypted_key) : crypto.base64ToBytes(vault.encrypted_key);
      const vaultKey = await crypto.decryptVaultKey(encKeyBytes, masterKey);
      const encrypted = await crypto.encrypt(new TextEncoder().encode(value), vaultKey);
      await api.setSecret(vaultId, key.trim(), Array.from(encrypted));
      navigate("secrets", { vaultId, vaultName });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    }
    setBusy(false);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("secrets", { vaultId, vaultName })} className="p-2 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-bold">{isEdit ? "Edit Secret" : "Add Secret"}</h1>
      </div>
      <Card>
        {loadingExisting ? <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[var(--text-muted)]" /></div> :
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Key Name" value={key} onChange={setKey} placeholder="STRIPE_SECRET_KEY" disabled={isEdit} mono />
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Value</label>
              <div className="relative">
                <textarea value={value} onChange={e => setValue(e.target.value)} placeholder="Enter secret value..."
                  rows={4} className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm font-mono outline-none focus:border-[var(--orange)] transition-colors resize-y pr-10"
                  style={{ WebkitTextSecurity: show ? "none" : "disc" } as React.CSSProperties} />
                <button type="button" onClick={() => setShow(!show)} className="absolute top-2.5 right-2.5 text-[var(--text-muted)] hover:text-[var(--text)]">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <ErrorBox msg={error} />}
            <Btn disabled={busy}>{busy ? "Encrypting..." : isEdit ? "Update Secret" : "Save Secret"}</Btn>
          </form>
        }
      </Card>
    </div>
  );
}

// ── Shared Components ──

function Header({ subtitle }: { subtitle?: string }) {
  return (
    <div className="text-center mb-6">
      <Image src="/images/logo-192.png" alt="MeowPass" width={48} height={48} className="rounded-xl mx-auto mb-3" />
      <h1 className="text-xl font-bold">MeowPass</h1>
      {subtitle && <p className="text-sm text-[var(--text-muted)] mt-1">{subtitle}</p>}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">{children}</div>;
}

function Field({ label, type = "text", value, onChange, placeholder, disabled, mono, autoFocus }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; mono?: boolean; autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required disabled={disabled} autoFocus={autoFocus}
        className={`w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm outline-none focus:border-[var(--orange)] transition-colors disabled:opacity-50 ${mono ? "font-mono" : ""}`} />
    </div>
  );
}

function Btn({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="submit" disabled={disabled}
      className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[var(--orange)] to-[var(--orange-light)] text-white text-sm font-semibold hover:shadow-lg hover:shadow-[var(--orange)]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
      {children}
    </button>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{msg}</div>;
}
