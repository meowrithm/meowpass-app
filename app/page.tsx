"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Key, Lock, Copy, Check, Trash2, LogOut, Loader2, Eye, EyeOff,
  Search, ChevronDown, Clock, Users, Settings, X, FolderPlus, Menu,
  Terminal, ExternalLink
} from "lucide-react";
import * as api from "@/lib/api";
import * as cr from "@/lib/crypto";

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

type View = "login" | "unlock" | "dashboard";
type Modal = null | "add-vault";
type SidebarTab = "secrets" | "activity" | "access" | "settings";
interface Vault { id: string; name: string; created_at: string; }
interface Secret { key_name: string; version: number; updated_at?: string; }
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
          <Image src="/images/logo-192.png" alt="" width={56} height={56} className="rounded-2xl mx-auto mb-4" style={{ boxShadow: "0 0 0 2px var(--bg-deep), 0 0 0 4px var(--border)" }} />
          <h1 className="text-2xl font-bold tracking-tight">MeowPass</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">E2E encrypted secret vault</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl shadow-black">
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
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl shadow-black">
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
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState("");
  const [vaultDropdown, setVaultDropdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>("secrets");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setVaultDropdown(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  const loadSecrets = useCallback(async () => {
    if (!activeVault) return;
    setSecretsLoading(true);
    try { setSecrets(await api.listSecrets(activeVault.id) || []); }
    catch { /* */ }
    setSecretsLoading(false);
    setRevealed({});
  }, [activeVault]);

  useEffect(() => { loadSecrets(); }, [loadSecrets]);

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

  async function handleDeleteVault() {
    if (!activeVault || !confirm(`Delete vault "${activeVault.name}" and ALL its secrets? This cannot be undone.`)) return;
    try {
      await api.deleteVault(activeVault.id);
      setActiveVault(null);
      loadVaults();
    } catch { /* */ }
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

  const sidebarItems: { icon: typeof Key; label: string; tab: SidebarTab; soon?: boolean }[] = [
    { icon: Key, label: "Secrets", tab: "secrets" },
    { icon: Clock, label: "Activity", tab: "activity", soon: true },
    { icon: Users, label: "Team", tab: "access", soon: true },
    { icon: Settings, label: "Settings", tab: "settings", soon: true },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
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
            <button key={item.label} onClick={() => { setActiveTab(item.tab); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
              activeTab === item.tab ? "bg-[var(--orange-glow)] text-[var(--orange)] font-medium" : item.soon ? "text-[var(--text-ghost)] cursor-default" : "text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-elevated)]"
            }`}>
              <item.icon className="w-[18px] h-[18px]" />
              <span>{item.label}</span>
              {item.soon && <span className="ml-auto text-[10px] uppercase tracking-wider opacity-60">Soon</span>}
            </button>
          ))}
        </nav>

        {/* CLI hint in sidebar */}
        <div className="p-4 border-t border-[var(--border)]">
          <div className="text-[10px] text-[var(--text-ghost)] uppercase tracking-wider mb-2">CLI Equivalent</div>
          <code className="text-[11px] font-mono text-[var(--text-dim)] leading-relaxed block">
            {activeTab === "secrets" && "meowpass list"}
            {activeTab === "activity" && "GET /audit-logs"}
            {activeTab === "access" && "meowpass team list"}
            {activeTab === "settings" && "meowpass apikey list"}
          </code>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-[60px] shrink-0 border-b border-[var(--border)] bg-[var(--bg-base)] flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3 md:gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-dim)]">
              <Menu className="w-5 h-5" />
            </button>
            <div ref={dropdownRef} className="relative">
              <button onClick={() => setVaultDropdown(!vaultDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--bg-card)] text-sm transition-colors">
                <div className="w-2 h-2 rounded-full bg-[var(--green)]" />
                <span className="font-medium">{activeVault?.name || "Select vault"}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-dim)]" />
              </button>
              {vaultDropdown && (
                <div className="absolute top-full left-0 mt-1 w-56 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-2xl shadow-black z-50 overflow-hidden animate-fade-in">
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

          /* ── No vaults: onboarding ── */
          !activeVault ? (
            <OnboardingEmpty onCreateVault={() => setModal("add-vault")} />
          ) : activeTab === "secrets" ? (
            <div className="animate-fade-in">
              {/* Toolbar — read-only: search + CLI hint instead of Add button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
                <div className="relative flex-1 sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-ghost)]" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter secrets..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-sm outline-none focus:border-[var(--orange)] transition-colors placeholder:text-[var(--text-ghost)]" />
                </div>
                <CLIHint cmd={`meowpass set KEY VALUE`} label="Add via CLI" />
              </div>

              {/* Secret list — read-only: reveal, copy, delete. No add/edit. */}
              {secretsLoading ? <div className="flex items-center justify-center h-40"><Loader2 className="w-5 h-5 animate-spin text-[var(--text-dim)]" /></div> :
              filtered.length === 0 ? (
                <EmptySecrets search={search} vaultId={activeVault.id} />
              ) : (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
                  <div className="hidden md:grid grid-cols-[1fr_2fr_auto_auto] gap-4 px-5 py-3 border-b border-[var(--border)] text-xs text-[var(--text-ghost)] uppercase tracking-wider font-medium">
                    <span>Key</span>
                    <span>Value</span>
                    <span>Version</span>
                    <span className="text-right">Actions</span>
                  </div>
                  {filtered.map((s, i) => (
                    <div key={s.key_name} className={`md:grid md:grid-cols-[1fr_2fr_auto_auto] md:gap-4 md:items-center px-4 md:px-5 py-3.5 group hover:bg-[var(--bg-elevated)] transition-colors ${i < filtered.length - 1 ? "border-b border-[var(--border)]" : ""}`}>
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
                      {/* Actions: reveal, copy, delete — NO edit */}
                      <div className="flex items-center gap-1 mt-2 md:mt-0 md:justify-end md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <IconBtn title={revealed[s.key_name] ? "Hide" : "Reveal (meowpass get)"} onClick={() => handleReveal(s.key_name)}
                          className={revealed[s.key_name] ? "text-[var(--green)]" : ""}>
                          {revealed[s.key_name] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </IconBtn>
                        <IconBtn title="Copy to clipboard" onClick={() => handleCopy(s.key_name)}>
                          {copied === s.key_name ? <Check className="w-3.5 h-3.5 text-[var(--green)]" /> : <Copy className="w-3.5 h-3.5" />}
                        </IconBtn>
                        <IconBtn title="Delete (meowpass delete)" onClick={() => handleDelete(s.key_name)} className="hover:!text-[var(--red)]">
                          <Trash2 className="w-3.5 h-3.5" />
                        </IconBtn>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Vault danger zone */}
              {activeVault && (
                <div className="mt-8 pt-6 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-[var(--text-ghost)] uppercase tracking-wider">Danger Zone</div>
                      <div className="text-xs text-[var(--text-dim)] mt-1">Delete vault &quot;{activeVault.name}&quot; and all secrets</div>
                    </div>
                    <button onClick={handleDeleteVault} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--red)]/30 text-[var(--red)] hover:bg-[var(--red)]/10 transition-colors">
                      Delete Vault
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Placeholder for soon tabs */
            <ComingSoonTab tab={activeTab} />
          )}
        </main>
      </div>

      {modal === "add-vault" && (
        <VaultModal onClose={() => setModal(null)} onCreate={handleCreateVault} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ONBOARDING — CLI-first empty state
   ═══════════════════════════════════════════════════════════ */

function OnboardingEmpty({ onCreateVault }: { onCreateVault: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center mb-6">
        <Terminal className="w-7 h-7 text-[var(--orange)]" />
      </div>
      <h2 className="text-xl font-semibold text-[var(--text)]">Welcome to MeowPass</h2>
      <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-md">
        Your secrets live in the terminal. This dashboard is your control panel.
      </p>

      <div className="mt-8 w-full max-w-lg">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 text-left">
          <div className="text-xs text-[var(--text-ghost)] uppercase tracking-wider mb-3">Get started with the CLI</div>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex gap-3">
              <span className="text-[var(--orange)] select-none w-4">$</span>
              <span className="text-[var(--text)]">brew install meowrithm/tap/meowpass</span>
            </div>
            <div className="flex gap-3">
              <span className="text-[var(--orange)] select-none w-4">$</span>
              <span className="text-[var(--text)]">meowpass login</span>
            </div>
            <div className="flex gap-3">
              <span className="text-[var(--orange)] select-none w-4">$</span>
              <span className="text-[var(--text)]">meowpass init</span>
            </div>
          </div>
          <p className="text-xs text-[var(--text-dim)] mt-4">
            After <code className="text-[var(--orange)]">meowpass init</code>, your secrets will appear here automatically.
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button onClick={onCreateVault} style={{ background: "linear-gradient(to right, var(--orange), var(--orange-light))" }} className="px-4 py-2 rounded-lg text-white text-sm font-medium hover:shadow-lg transition-all">
          Or create a vault manually
        </button>
        <a href="https://meowpass.dev/docs/cli" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-[var(--text-dim)] hover:text-[var(--orange)] transition-colors">
          CLI docs <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EMPTY SECRETS — guide to CLI
   ═══════════════════════════════════════════════════════════ */

function EmptySecrets({ search, vaultId }: { search: string; vaultId: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] border-dashed p-12 text-center" style={{ background: "rgba(15,20,32,0.5)" }}>
      <Key className="w-8 h-8 text-[var(--text-ghost)] mx-auto mb-3" />
      {search ? (
        <p className="text-sm text-[var(--text-dim)]">No secrets match your filter</p>
      ) : (
        <>
          <p className="text-sm text-[var(--text-dim)]">No secrets in this vault yet</p>
          <div className="mt-4 inline-block rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 text-left">
            <div className="text-xs text-[var(--text-ghost)] mb-2">Add secrets via CLI:</div>
            <div className="font-mono text-xs space-y-1.5">
              <div><span className="text-[var(--orange)]">$</span> <span className="text-[var(--text)]">meowpass set STRIPE_KEY sk_live_... --vault {vaultId.slice(0, 8)}...</span></div>
              <div><span className="text-[var(--orange)]">$</span> <span className="text-[var(--text)]">meowpass push --vault {vaultId.slice(0, 8)}...</span></div>
            </div>
            <div className="text-xs text-[var(--text-ghost)] mt-2">Or use <code className="text-[var(--orange)]">meowpass init</code> to import your .env</div>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMING SOON TABS
   ═══════════════════════════════════════════════════════════ */

function ComingSoonTab({ tab }: { tab: SidebarTab }) {
  const info: Record<SidebarTab, { title: string; desc: string; cli: string }> = {
    secrets: { title: "", desc: "", cli: "" },
    activity: {
      title: "Activity Log",
      desc: "Track who accessed, created, or modified secrets. Filterable by vault, user, and date.",
      cli: "Audit logs are available via the API: GET /audit-logs?vault_id=<id>",
    },
    access: {
      title: "Team Management",
      desc: "Manage team members, roles, and vault sharing. Invite developers and control access.",
      cli: "meowpass team list\nmeowpass team invite EMAIL --team ID\nmeowpass share VAULT_ID --team ID",
    },
    settings: {
      title: "Settings",
      desc: "Manage API keys, view your plan, and account settings.",
      cli: "meowpass apikey list\nmeowpass apikey create NAME\nmeowpass whoami",
    },
  };

  const { title, desc, cli } = info[tab];

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center animate-fade-in">
      <div className="text-xs px-3 py-1 rounded-full bg-[var(--orange-glow)] text-[var(--orange)] font-medium mb-4">Coming Soon</div>
      <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>
      <p className="text-sm text-[var(--text-dim)] mt-2 max-w-md">{desc}</p>
      {cli && (
        <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 text-left max-w-md w-full">
          <div className="text-xs text-[var(--text-ghost)] mb-2">Available now via CLI:</div>
          <div className="font-mono text-xs text-[var(--text)] whitespace-pre leading-relaxed">{cli}</div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CLI HINT COMPONENT
   ═══════════════════════════════════════════════════════════ */

function CLIHint({ cmd, label }: { cmd: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(cmd); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-xs hover:border-[var(--orange)]/50 transition-colors group shrink-0"
      title={`Copy: ${cmd}`}
    >
      <Terminal className="w-3.5 h-3.5 text-[var(--text-ghost)] group-hover:text-[var(--orange)] transition-colors" />
      <span className="text-[var(--text-dim)] group-hover:text-[var(--text)] transition-colors">{label}</span>
      {copied ? <Check className="w-3 h-3 text-[var(--green)]" /> : <Copy className="w-3 h-3 text-[var(--text-ghost)]" />}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   VAULT MODAL (keep — creating vaults is fine in web)
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
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl shadow-black animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold">Create Vault</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-5">
          <Input label="Vault Name" value={name} onChange={setName} placeholder="my-project" autoFocus />
          <p className="text-xs text-[var(--text-ghost)]">CLI equivalent: <code className="text-[var(--orange)]">meowpass vault create {name || "NAME"}</code></p>
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
        className={`w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-deep)] text-sm outline-none focus:border-[var(--orange)] transition-colors disabled:opacity-40 placeholder:text-[var(--text-ghost)] ${mono ? "font-mono" : ""}`} />
    </div>
  );
}

function PrimaryBtn({ children, disabled, className = "" }: { children: React.ReactNode; disabled?: boolean; className?: string }) {
  return (
    <button type="submit" disabled={disabled}
      style={{ background: "linear-gradient(to right, var(--orange), var(--orange-light))" }}
      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${className}`}>
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
  return <div className="text-sm text-[var(--red)] rounded-xl px-4 py-3 border" style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.15)" }}>{msg}</div>;
}
