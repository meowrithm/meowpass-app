"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Key, Lock, Plus, Copy, Check, Trash2, LogOut, Loader2, Eye, EyeOff,
  Search, ChevronDown, Shield, Clock, Users, Settings, Pencil, X, FolderPlus, Menu
} from "lucide-react";
import * as api from "@/lib/api";
import * as cr from "@/lib/crypto";

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

type View = "login" | "unlock" | "dashboard";
type Modal = null | "add-secret" | "edit-secret" | "add-vault";
interface Vault { id: string; name: string; created_at: string; }
interface Secret { key_name: string; version: number; }
interface User { email: string; name: string; subscription_tier: string; }

/* ═══════════════════════════════════════════════════════════
   APP ROOT
   ═══════════════════════════════════════════════════════════ */

export default function App() {
  const [view, setView] = useState<View>("login");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (api.hasToken()) setView(api.getMasterKey() ? "dashboard" : "unlock");
    else setView("login");
    setReady(true);
  }, []);

  if (!ready) return <CenterShell><Loader2 className="w-6 h-6 animate-spin text-[var(--orange)]" /></CenterShell>;

  if (view === "login") return <LoginView onSuccess={() => setView("unlock")} />;
  if (view === "unlock") return <UnlockView onSuccess={() => setView("dashboard")} />;
  return <Dashboard onLogout={() => { api.clearAll(); setView("login"); }} />;
}

/* ═══════════════════════════════════════════════════════════
   LOGIN
   ═══════════════════════════════════════════════════════════ */

function LoginView({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const data = mode === "register" ? await api.register(email, name, password) : await api.login(email, password);
      api.setToken(data.token);
      if (data.user?.key_salt) api.setSalt(data.user.key_salt);
      onSuccess();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <CenterShell>
      <div className="animate-fade-in">
        <div className="text-center mb-8">
          <Image src="/images/logo-192.png" alt="" width={56} height={56} className="rounded-2xl mx-auto mb-4 ring-2 ring-[var(--border)] ring-offset-2 ring-offset-[var(--bg-deep)]" />
          <h1 className="text-2xl font-bold tracking-tight">MeowPass</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">E2E encrypted secret vault</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl shadow-black/40">
          <form onSubmit={submit} className="space-y-5">
            {mode === "register" && <Input label="Name" value={name} onChange={setName} placeholder="Your name" />}
            <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoFocus />
            <Input label="Password" type="password" value={password} onChange={setPassword} placeholder={mode === "register" ? "Create a password" : "Enter password"} />
            {error && <ErrorMsg msg={error} />}
            <PrimaryBtn disabled={busy}>{busy ? <><Loader2 className="w-4 h-4 animate-spin" /> {mode === "register" ? "Creating..." : "Signing in..."}</> : mode === "register" ? "Create Account" : "Sign In"}</PrimaryBtn>
          </form>
          <p className="text-center text-sm text-[var(--text-dim)] mt-5">
            {mode === "login" ? <>New here? <button onClick={() => { setMode("register"); setError(""); }} className="text-[var(--orange)] hover:underline">Create account</button></> : <>Have an account? <button onClick={() => { setMode("login"); setError(""); }} className="text-[var(--orange)] hover:underline">Sign in</button></>}
          </p>
        </div>
      </div>
    </CenterShell>
  );
}

/* ═══════════════════════════════════════════════════════════
   UNLOCK
   ═══════════════════════════════════════════════════════════ */

function UnlockView({ onSuccess }: { onSuccess: () => void }) {
  const [pw, setPw] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      let salt = api.getSalt();
      if (!salt) { const me = await api.getMe(); if (me?.key_salt) { salt = me.key_salt; api.setSalt(salt!); } }
      if (!salt) throw new Error("No encryption key found. Please login via CLI first (meowpass login).");
      const key = await cr.deriveKey(pw, cr.base64ToBytes(salt));
      api.setMasterKey(cr.bytesToHex(key));
      onSuccess();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <CenterShell>
      <div className="animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-[var(--orange)]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Unlock Vault</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Enter your master password to decrypt</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl shadow-black/40">
          <form onSubmit={submit} className="space-y-5">
            <Input label="Master Password" type="password" value={pw} onChange={setPw} placeholder="Your master password" autoFocus />
            {error && <ErrorMsg msg={error} />}
            <PrimaryBtn disabled={busy}>{busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Deriving key...</> : <><Lock className="w-4 h-4" /> Unlock</>}</PrimaryBtn>
          </form>
        </div>
      </div>
    </CenterShell>
  );
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════════════ */

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [activeVault, setActiveVault] = useState<Vault | null>(null);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [secretsLoading, setSecretsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [editKey, setEditKey] = useState("");
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState("");
  const [vaultDropdown, setVaultDropdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setVaultDropdown(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load vaults + user
  const loadVaults = useCallback(async () => {
    setLoading(true);
    try {
      const [v, me] = await Promise.all([api.listVaults(), api.getMe()]);
      setVaults(v || []);
      setUser(me);
      if (!activeVault && v?.length > 0) setActiveVault(v[0]);
    } catch { /* */ }
    setLoading(false);
  }, [activeVault]);

  useEffect(() => { loadVaults(); }, []);// eslint-disable-line

  // Load secrets when vault changes
  const loadSecrets = useCallback(async () => {
    if (!activeVault) return;
    setSecretsLoading(true);
    try { setSecrets(await api.listSecrets(activeVault.id) || []); }
    catch { /* */ }
    setSecretsLoading(false);
    setRevealed({});
  }, [activeVault]);

  useEffect(() => { loadSecrets(); }, [loadSecrets]);

  // Decrypt helper
  async function decryptValue(keyName: string): Promise<string> {
    if (!activeVault) throw new Error("No vault");
    const mk = api.getMasterKey();
    if (!mk) throw new Error("Session expired");
    const masterKey = cr.hexToBytes(mk);
    const vault = await api.getVault(activeVault.id);
    const encKey = vault.encrypted_key instanceof Array ? new Uint8Array(vault.encrypted_key) : cr.base64ToBytes(vault.encrypted_key);
    const vaultKey = await cr.decryptVaultKey(encKey, masterKey);
    const secret = await api.getSecret(activeVault.id, keyName);
    const encVal = secret.encrypted_value instanceof Array ? new Uint8Array(secret.encrypted_value) : cr.base64ToBytes(secret.encrypted_value);
    return new TextDecoder().decode(await cr.decrypt(encVal, vaultKey));
  }

  async function handleReveal(keyName: string) {
    if (revealed[keyName]) { setRevealed(r => { const n = { ...r }; delete n[keyName]; return n; }); return; }
    try {
      const val = await decryptValue(keyName);
      setRevealed(r => ({ ...r, [keyName]: val }));
      setTimeout(() => setRevealed(r => { const n = { ...r }; delete n[keyName]; return n; }), 10000);
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "Decrypt failed"); }
  }

  async function handleCopy(keyName: string) {
    try {
      const val = revealed[keyName] || await decryptValue(keyName);
      await navigator.clipboard.writeText(val);
      setCopied(keyName);
      setTimeout(() => setCopied(""), 2000);
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleDelete(keyName: string) {
    if (!activeVault || !confirm(`Delete "${keyName}" permanently?`)) return;
    try { await api.deleteSecret(activeVault.id, keyName); loadSecrets(); } catch { /* */ }
  }

  async function handleCreateVault(name: string) {
    const mk = api.getMasterKey();
    if (!mk) return;
    const masterKey = cr.hexToBytes(mk);
    const vaultKey = cr.generateVaultKey();
    const encKey = await cr.encryptVaultKey(vaultKey, masterKey);
    await api.createVault(name, Array.from(encKey));
    await loadVaults();
  }

  const filtered = secrets.filter(s => s.key_name.toLowerCase().includes(search.toLowerCase()));

  const sidebarItems = [
    { icon: Key, label: "Secrets", active: true },
    { icon: Shield, label: "Environments", soon: true },
    { icon: Clock, label: "Audit Trail", soon: true },
    { icon: Users, label: "Access", soon: true },
    { icon: Settings, label: "Settings", soon: true },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Mobile sidebar backdrop ── */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── Sidebar ── */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[220px] shrink-0 bg-[var(--bg-base)] border-r border-[var(--border)] flex flex-col transform transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/images/logo-192.png" alt="" width={32} height={32} className="rounded-lg" />
            <span className="font-bold text-base tracking-tight">MeowPass</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-dim)]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <nav className="flex-1 px-3 space-y-0.5 mt-2">
          {sidebarItems.map(item => (
            <button key={item.label} onClick={() => setSidebarOpen(false)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
              item.active ? "bg-[var(--orange-glow)] text-[var(--orange)] font-medium" : item.soon ? "text-[var(--text-ghost)] cursor-default" : "text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-elevated)]"
            }`}>
              <item.icon className="w-[18px] h-[18px]" />
              <span>{item.label}</span>
              {item.soon && <span className="ml-auto text-[10px] uppercase tracking-wider opacity-60">Soon</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-[var(--border)]">
          <div className="text-xs text-[var(--text-ghost)]">Early Access</div>
          <div className="text-xs text-[var(--text-dim)] mt-1">All features free</div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-[60px] shrink-0 border-b border-[var(--border)] bg-[var(--bg-base)] flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3 md:gap-4">
            {/* Mobile menu toggle */}
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-dim)]">
              <Menu className="w-5 h-5" />
            </button>
            {/* Vault selector */}
            <div ref={dropdownRef} className="relative">
              <button onClick={() => setVaultDropdown(!vaultDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--bg-card)] text-sm transition-colors">
                <div className="w-2 h-2 rounded-full bg-[var(--green)]" />
                <span className="font-medium">{activeVault?.name || "Select vault"}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-dim)]" />
              </button>
              {vaultDropdown && (
                <div className="absolute top-full left-0 mt-1 w-56 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-2xl shadow-black/50 z-50 overflow-hidden animate-fade-in">
                  {vaults.map(v => (
                    <button key={v.id} onClick={() => { setActiveVault(v); setVaultDropdown(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-[var(--bg-card)] transition-colors ${v.id === activeVault?.id ? "text-[var(--orange)]" : "text-[var(--text-secondary)]"}`}>
                      <div className={`w-2 h-2 rounded-full ${v.id === activeVault?.id ? "bg-[var(--orange)]" : "bg-[var(--text-ghost)]"}`} />
                      {v.name}
                    </button>
                  ))}
                  <button onClick={() => { setVaultDropdown(false); setModal("add-vault"); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[var(--text-dim)] hover:bg-[var(--bg-card)] hover:text-[var(--orange)] transition-colors border-t border-[var(--border)]">
                    <FolderPlus className="w-4 h-4" /> New vault
                  </button>
                </div>
              )}
            </div>
            <span className="text-xs text-[var(--text-ghost)]">{secrets.length} secret{secrets.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {user && (
              <>
                <span className="text-xs px-2 py-1 rounded-md bg-[var(--orange-glow)] text-[var(--orange)] capitalize font-medium">{user.subscription_tier}</span>
                <span className="text-xs text-[var(--text-dim)] hidden md:inline">{user.email}</span>
              </>
            )}
            <button onClick={onLogout} className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-dim)] hover:text-[var(--text)] transition-colors" title="Log out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {loading ? <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[var(--text-dim)]" /></div> :
          !activeVault ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center mb-4">
                <FolderPlus className="w-7 h-7 text-[var(--text-ghost)]" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-secondary)]">No vaults yet</h2>
              <p className="text-sm text-[var(--text-dim)] mt-1 mb-4">Create your first vault to start managing secrets</p>
              <button onClick={() => setModal("add-vault")} className="px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--orange)] to-[var(--orange-light)] text-white text-sm font-medium hover:shadow-lg hover:shadow-[var(--orange)]/20 transition-all">
                Create Vault
              </button>
            </div>
          ) : (
            <div className="animate-fade-in">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
                <div className="relative flex-1 sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-ghost)]" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter secrets..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-sm outline-none focus:border-[var(--orange)]/50 transition-colors placeholder:text-[var(--text-ghost)]" />
                </div>
                <button onClick={() => { setEditKey(""); setModal("add-secret"); }}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--orange)] to-[var(--orange-light)] text-white text-sm font-medium hover:shadow-lg hover:shadow-[var(--orange)]/20 transition-all shrink-0">
                  <Plus className="w-4 h-4" /> Add Secret
                </button>
              </div>

              {/* Secret list */}
              {secretsLoading ? <div className="flex items-center justify-center h-40"><Loader2 className="w-5 h-5 animate-spin text-[var(--text-dim)]" /></div> :
              filtered.length === 0 ? (
                <div className="rounded-xl border border-[var(--border)] border-dashed bg-[var(--bg-card)]/50 p-12 text-center">
                  <Key className="w-8 h-8 text-[var(--text-ghost)] mx-auto mb-3" />
                  <p className="text-sm text-[var(--text-dim)]">{search ? "No secrets match your filter" : "No secrets in this vault"}</p>
                  {!search && <p className="text-xs text-[var(--text-ghost)] mt-1">Click &quot;Add Secret&quot; to store your first one</p>}
                </div>
              ) : (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
                  {/* Table header — hidden on mobile */}
                  <div className="hidden md:grid grid-cols-[1fr_2fr_auto_auto] gap-4 px-5 py-3 border-b border-[var(--border)] text-xs text-[var(--text-ghost)] uppercase tracking-wider font-medium">
                    <span>Key</span>
                    <span>Value</span>
                    <span>Version</span>
                    <span className="text-right">Actions</span>
                  </div>
                  {/* Rows — grid on desktop, stacked on mobile */}
                  {filtered.map((s, i) => (
                    <div key={s.key_name} className={`md:grid md:grid-cols-[1fr_2fr_auto_auto] md:gap-4 md:items-center px-4 md:px-5 py-3.5 group hover:bg-[var(--bg-elevated)]/50 transition-colors ${i < filtered.length - 1 ? "border-b border-[var(--border)]/50" : ""}`}>
                      {/* Mobile: stacked layout */}
                      <div className="flex items-center justify-between md:contents">
                        <div className="flex-1 min-w-0 md:contents">
                          <span className="font-mono text-sm font-medium text-[var(--text)] truncate block">{s.key_name}</span>
                          <div className="font-mono text-sm truncate mt-1 md:mt-0">
                            {revealed[s.key_name] ? (
                              <span className="text-[var(--green)] break-all">{revealed[s.key_name]}</span>
                            ) : (
                              <span className="text-[var(--text-ghost)] tracking-widest select-none">{"••••••••••••"}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] text-[var(--text-dim)] font-mono shrink-0 ml-3 md:ml-0">v{s.version}</span>
                      </div>
                      {/* Actions — always visible on mobile, hover on desktop */}
                      <div className="flex items-center gap-1 mt-2 md:mt-0 md:justify-end md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <IconBtn title={revealed[s.key_name] ? "Hide" : "Reveal"} onClick={() => handleReveal(s.key_name)}
                          className={revealed[s.key_name] ? "text-[var(--green)]" : ""}>
                          {revealed[s.key_name] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </IconBtn>
                        <IconBtn title="Copy" onClick={() => handleCopy(s.key_name)}>
                          {copied === s.key_name ? <Check className="w-3.5 h-3.5 text-[var(--green)]" /> : <Copy className="w-3.5 h-3.5" />}
                        </IconBtn>
                        <IconBtn title="Edit" onClick={() => { setEditKey(s.key_name); setModal("edit-secret"); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </IconBtn>
                        <IconBtn title="Delete" onClick={() => handleDelete(s.key_name)} className="hover:!text-[var(--red)]">
                          <Trash2 className="w-3.5 h-3.5" />
                        </IconBtn>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── Modals ── */}
      {modal === "add-secret" && activeVault && (
        <SecretModal vaultId={activeVault.id} mode="add" onClose={() => setModal(null)} onSaved={loadSecrets} />
      )}
      {modal === "edit-secret" && activeVault && (
        <SecretModal vaultId={activeVault.id} mode="edit" editKey={editKey} onClose={() => setModal(null)} onSaved={loadSecrets} />
      )}
      {modal === "add-vault" && (
        <VaultModal onClose={() => setModal(null)} onCreate={handleCreateVault} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SECRET MODAL
   ═══════════════════════════════════════════════════════════ */

function SecretModal({ vaultId, mode, editKey, onClose, onSaved }: {
  vaultId: string; mode: "add" | "edit"; editKey?: string; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = mode === "edit";
  const [keyName, setKeyName] = useState(editKey || "");
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit || !editKey) return;
    (async () => {
      try {
        const mk = api.getMasterKey(); if (!mk) return;
        const masterKey = cr.hexToBytes(mk);
        const vault = await api.getVault(vaultId);
        const encKey = vault.encrypted_key instanceof Array ? new Uint8Array(vault.encrypted_key) : cr.base64ToBytes(vault.encrypted_key);
        const vaultKey = await cr.decryptVaultKey(encKey, masterKey);
        const secret = await api.getSecret(vaultId, editKey);
        const encVal = secret.encrypted_value instanceof Array ? new Uint8Array(secret.encrypted_value) : cr.base64ToBytes(secret.encrypted_value);
        setValue(new TextDecoder().decode(await cr.decrypt(encVal, vaultKey)));
      } catch { /* */ }
      setLoading(false);
    })();
  }, [isEdit, editKey, vaultId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      if (!keyName.trim()) throw new Error("Key name required");
      const mk = api.getMasterKey(); if (!mk) throw new Error("Session expired");
      const masterKey = cr.hexToBytes(mk);
      const vault = await api.getVault(vaultId);
      const encKey = vault.encrypted_key instanceof Array ? new Uint8Array(vault.encrypted_key) : cr.base64ToBytes(vault.encrypted_key);
      const vaultKey = await cr.decryptVaultKey(encKey, masterKey);
      const encrypted = await cr.encrypt(new TextEncoder().encode(value), vaultKey);
      await api.setSecret(vaultId, keyName.trim(), Array.from(encrypted));
      onSaved(); onClose();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    setBusy(false);
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl shadow-black/60 animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold">{isEdit ? "Edit Secret" : "Add Secret"}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"><X className="w-4 h-4" /></button>
        </div>
        {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[var(--text-dim)]" /></div> :
          <form onSubmit={submit} className="p-6 space-y-5">
            <Input label="Key Name" value={keyName} onChange={setKeyName} placeholder="STRIPE_SECRET_KEY" disabled={isEdit} mono />
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Value</label>
              <div className="relative">
                <textarea value={value} onChange={e => setValue(e.target.value)} placeholder="Enter secret value..."
                  rows={4} className="w-full px-3.5 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-deep)] text-sm font-mono outline-none focus:border-[var(--orange)]/50 transition-colors resize-y pr-10"
                  style={{ WebkitTextSecurity: show ? "none" : "disc" } as React.CSSProperties} />
                <button type="button" onClick={() => setShow(!show)} className="absolute top-3 right-3 text-[var(--text-dim)] hover:text-[var(--text)] transition-colors">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <ErrorMsg msg={error} />}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors">Cancel</button>
              <PrimaryBtn disabled={busy} className="flex-1">{busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Encrypting...</> : isEdit ? "Update" : "Save"}</PrimaryBtn>
            </div>
          </form>
        }
      </div>
    </ModalOverlay>
  );
}

/* ═══════════════════════════════════════════════════════════
   VAULT MODAL
   ═══════════════════════════════════════════════════════════ */

function VaultModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => Promise<void> }) {
  const [name, setName] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!name.trim()) return;
    setBusy(true);
    try { await onCreate(name.trim()); onClose(); }
    catch { /* */ }
    setBusy(false);
  }
  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl shadow-black/60 animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold">Create Vault</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-5">
          <Input label="Vault Name" value={name} onChange={setName} placeholder="my-project" autoFocus />
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors">Cancel</button>
            <PrimaryBtn disabled={busy || !name.trim()} className="flex-1">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}</PrimaryBtn>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

/* ═══════════════════════════════════════════════════════════
   SHARED PRIMITIVES
   ═══════════════════════════════════════════════════════════ */

function CenterShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center p-4 relative z-10"><div className="w-full max-w-md">{children}</div></div>;
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function Input({ label, type = "text", value, onChange, placeholder, disabled, mono, autoFocus }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; mono?: boolean; autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required disabled={disabled} autoFocus={autoFocus}
        className={`w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-deep)] text-sm outline-none focus:border-[var(--orange)]/50 transition-colors disabled:opacity-40 placeholder:text-[var(--text-ghost)] ${mono ? "font-mono" : ""}`} />
    </div>
  );
}

function PrimaryBtn({ children, disabled, className = "" }: { children: React.ReactNode; disabled?: boolean; className?: string }) {
  return (
    <button type="submit" disabled={disabled}
      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[var(--orange)] to-[var(--orange-light)] text-white text-sm font-semibold hover:shadow-lg hover:shadow-[var(--orange)]/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${className}`}>
      {children}
    </button>
  );
}

function IconBtn({ children, title, onClick, className = "" }: { children: React.ReactNode; title: string; onClick: () => void; className?: string }) {
  return (
    <button onClick={onClick} title={title}
      className={`p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-dim)] hover:text-[var(--text)] transition-colors ${className}`}>
      {children}
    </button>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return <div className="text-sm text-[var(--red)] bg-[var(--red)]/8 border border-[var(--red)]/15 rounded-xl px-4 py-3">{msg}</div>;
}
