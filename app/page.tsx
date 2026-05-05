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

/* ═══════════════════════════════════════════════════════════ */

type View = "login" | "unlock" | "dashboard";
type Modal = null | "add-vault";
type SidebarTab = "secrets" | "activity" | "access" | "settings";
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

  if (!ready) return <CenterShell><Loader2 style={{ width: 24, height: 24, color: "var(--orange)" }} className="animate-spin" /></CenterShell>;
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
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Image src="/images/logo-192.png" alt="" width={56} height={56} style={{ borderRadius: 16, margin: "0 auto 16px", display: "block", boxShadow: "0 0 0 2px var(--bg-deep), 0 0 0 4px var(--border)" }} />
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)" }}>MeowPass</h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>E2E encrypted secret vault</p>
        </div>
        <div className="mp-card" style={{ padding: 32 }}>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {mode === "register" && <Field label="Name" value={name} onChange={setName} placeholder="Your name" />}
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoFocus />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder={mode === "register" ? "Create a password" : "Enter password"} />
            {error && <ErrorMsg msg={error} />}
            <button type="submit" disabled={busy} className="mp-btn-primary">
              {busy ? <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> {mode === "register" ? "Creating..." : "Signing in..."}</> : mode === "register" ? "Create Account" : "Sign In"}
            </button>
          </form>
          <p style={{ textAlign: "center", fontSize: 14, color: "var(--text-dim)", marginTop: 20 }}>
            {mode === "login" ? <>New here? <button onClick={() => { setMode("register"); setError(""); }} style={{ color: "var(--orange)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Create account</button></> : <>Have an account? <button onClick={() => { setMode("login"); setError(""); }} style={{ color: "var(--orange)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Sign in</button></>}
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
      if (!salt) throw new Error("No encryption key found. Please login via CLI first.");
      const key = await cr.deriveKey(pw, cr.base64ToBytes(salt));
      api.setMasterKey(cr.bytesToHex(key));
      onSuccess();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <CenterShell>
      <div className="animate-fade-in">
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "var(--bg-elevated)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Lock style={{ width: 28, height: 28, color: "var(--orange)" }} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)" }}>Unlock Vault</h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>Enter your master password to decrypt</p>
        </div>
        <div className="mp-card" style={{ padding: 32 }}>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Field label="Master Password" type="password" value={pw} onChange={setPw} placeholder="Your master password" autoFocus />
            {error && <ErrorMsg msg={error} />}
            <button type="submit" disabled={busy} className="mp-btn-primary">
              {busy ? <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> Deriving key...</> : <><Lock style={{ width: 16, height: 16 }} /> Unlock</>}
            </button>
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
      setVaults(v || []); setUser(me);
      if (!activeVault && v?.length > 0) setActiveVault(v[0]);
    } catch { /* */ }
    setLoading(false);
  }, [activeVault]);

  useEffect(() => { loadVaults(); }, []);// eslint-disable-line

  const loadSecrets = useCallback(async () => {
    if (!activeVault) return;
    setSecretsLoading(true);
    try { setSecrets(await api.listSecrets(activeVault.id) || []); } catch { /* */ }
    setSecretsLoading(false); setRevealed({});
  }, [activeVault]);

  useEffect(() => { loadSecrets(); }, [loadSecrets]);

  async function decryptValue(keyName: string): Promise<string> {
    if (!activeVault) throw new Error("No vault");
    const mk = api.getMasterKey(); if (!mk) throw new Error("Session expired");
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
      await navigator.clipboard.writeText(val); setCopied(keyName);
      setTimeout(() => setCopied(""), 2000);
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleDelete(keyName: string) {
    if (!activeVault || !confirm(`Delete "${keyName}" permanently?`)) return;
    try { await api.deleteSecret(activeVault.id, keyName); loadSecrets(); } catch { /* */ }
  }

  async function handleDeleteVault() {
    if (!activeVault || !confirm(`Delete vault "${activeVault.name}" and ALL its secrets?`)) return;
    try { await api.deleteVault(activeVault.id); setActiveVault(null); loadVaults(); } catch { /* */ }
  }

  async function handleCreateVault(name: string) {
    const mk = api.getMasterKey(); if (!mk) return;
    const masterKey = cr.hexToBytes(mk);
    const vaultKey = cr.generateVaultKey();
    const encKey = await cr.encryptVaultKey(vaultKey, masterKey);
    await api.createVault(name, Array.from(encKey)); await loadVaults();
  }

  const filtered = secrets.filter(s => s.key_name.toLowerCase().includes(search.toLowerCase()));

  const tabs: { icon: typeof Key; label: string; tab: SidebarTab; soon?: boolean }[] = [
    { icon: Key, label: "Secrets", tab: "secrets" },
    { icon: Clock, label: "Activity", tab: "activity", soon: true },
    { icon: Users, label: "Team", tab: "access", soon: true },
    { icon: Settings, label: "Settings", tab: "settings", soon: true },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Mobile overlay */}
      {sidebarOpen && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40 }} onClick={() => setSidebarOpen(false)} />}

      {/* ── Sidebar ── */}
      <aside style={{
        position: sidebarOpen ? "fixed" : undefined, inset: sidebarOpen ? "0 auto 0 0" : undefined,
        width: 220, flexShrink: 0, background: "var(--bg-base)", borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column", zIndex: 50,
        transform: sidebarOpen ? "translateX(0)" : undefined, transition: "transform 0.2s",
      }} className={sidebarOpen ? "" : "hidden lg:flex"}>
        <div style={{ padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Image src="/images/logo-192.png" alt="" width={32} height={32} style={{ borderRadius: 8 }} />
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>MeowPass</span>
          </div>
          {sidebarOpen && <button onClick={() => setSidebarOpen(false)} className="mp-icon-btn lg:hidden"><X style={{ width: 16, height: 16 }} /></button>}
        </div>

        <nav style={{ flex: 1, padding: "0 12px", marginTop: 8 }}>
          {tabs.map(item => (
            <button key={item.label} onClick={() => { if (!item.soon) setActiveTab(item.tab); setSidebarOpen(false); }}
              className={`mp-sidebar-item ${activeTab === item.tab ? "mp-sidebar-item--active" : item.soon ? "mp-sidebar-item--soon" : "mp-sidebar-item--default"}`}>
              <item.icon style={{ width: 18, height: 18 }} />
              <span>{item.label}</span>
              {item.soon && <span style={{ marginLeft: "auto", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.6 }}>Soon</span>}
            </button>
          ))}
        </nav>

        <div style={{ padding: 16, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 10, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>CLI Equivalent</div>
          <code style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-dim)", display: "block" }}>
            {activeTab === "secrets" && "meowpass list"}
            {activeTab === "activity" && "GET /audit-logs"}
            {activeTab === "access" && "meowpass team list"}
            {activeTab === "settings" && "meowpass apikey list"}
          </code>
        </div>
      </aside>

      {/* ── Main panel ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Header */}
        <header style={{ height: 60, flexShrink: 0, borderBottom: "1px solid var(--border)", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => setSidebarOpen(true)} className="mp-icon-btn lg:hidden" style={{ marginLeft: -4 }}>
              <Menu style={{ width: 20, height: 20 }} />
            </button>

            {/* Vault selector */}
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <button onClick={() => setVaultDropdown(!vaultDropdown)} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 8,
                border: "1px solid var(--border)", background: "var(--bg-card)", fontSize: 14, color: "var(--text)", cursor: "pointer"
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)" }} />
                <span style={{ fontWeight: 500 }}>{activeVault?.name || "Select vault"}</span>
                <ChevronDown style={{ width: 14, height: 14, color: "var(--text-dim)" }} />
              </button>
              {vaultDropdown && (
                <div className="animate-fade-in" style={{
                  position: "absolute", top: "100%", left: 0, marginTop: 4, width: 224, borderRadius: 12,
                  border: "1px solid var(--border)", background: "var(--bg-elevated)", boxShadow: "0 25px 50px rgba(0,0,0,0.5)", zIndex: 50, overflow: "hidden"
                }}>
                  {vaults.map(v => (
                    <button key={v.id} onClick={() => { setActiveVault(v); setVaultDropdown(false); }} style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                      fontSize: 14, textAlign: "left", background: "none", border: "none", cursor: "pointer",
                      color: v.id === activeVault?.id ? "var(--orange)" : "var(--text-secondary)", transition: "background 0.15s"
                    }} onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card)")} onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: v.id === activeVault?.id ? "var(--orange)" : "var(--text-ghost)" }} />
                      {v.name}
                    </button>
                  ))}
                  <button onClick={() => { setVaultDropdown(false); setModal("add-vault"); }} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                    fontSize: 14, color: "var(--text-dim)", background: "none", border: "none", borderTop: "1px solid var(--border)", cursor: "pointer", transition: "color 0.15s"
                  }} onMouseEnter={e => { e.currentTarget.style.color = "var(--orange)"; e.currentTarget.style.background = "var(--bg-card)"; }} onMouseLeave={e => { e.currentTarget.style.color = "var(--text-dim)"; e.currentTarget.style.background = "none"; }}>
                    <FolderPlus style={{ width: 16, height: 16 }} /> New vault
                  </button>
                </div>
              )}
            </div>
            <span style={{ fontSize: 12, color: "var(--text-ghost)" }}>{secrets.length} secret{secrets.length !== 1 ? "s" : ""}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {user && <>
              <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, background: "var(--orange-glow)", color: "var(--orange)", fontWeight: 500, textTransform: "capitalize" }}>{user.subscription_tier}</span>
              <span style={{ fontSize: 12, color: "var(--text-dim)" }} className="hidden md:inline">{user.email}</span>
            </>}
            <button onClick={onLogout} className="mp-icon-btn" title="Log out"><LogOut style={{ width: 16, height: 16 }} /></button>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {loading ? <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 256 }}><Loader2 style={{ width: 24, height: 24, color: "var(--text-dim)" }} className="animate-spin" /></div> :

          !activeVault ? <OnboardingEmpty onCreateVault={() => setModal("add-vault")} /> :

          activeTab === "secrets" ? (
            <div className="animate-fade-in">
              {/* Toolbar */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                <div className="mp-search-wrap">
                  <Search className="mp-search-icon" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter secrets..." className="mp-search-input" />
                </div>
                <CLIHint cmd="meowpass set KEY VALUE" label="Add via CLI" />
              </div>

              {/* Secret list */}
              {secretsLoading ? <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 160 }}><Loader2 style={{ width: 20, height: 20, color: "var(--text-dim)" }} className="animate-spin" /></div> :
              filtered.length === 0 ? <EmptySecrets search={search} vaultId={activeVault.id} /> : (
                <div style={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-card)", overflow: "hidden" }}>
                  {/* Header row */}
                  <div className="hidden md:grid" style={{ gridTemplateColumns: "1fr 2fr auto auto", gap: 16, padding: "12px 20px", borderBottom: "1px solid var(--border)", fontSize: 11, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>
                    <span>Key</span><span>Value</span><span>Version</span><span style={{ textAlign: "right" }}>Actions</span>
                  </div>
                  {filtered.map((s, i) => (
                    <div key={s.key_name} className="group" style={{
                      display: "grid", gridTemplateColumns: "1fr 2fr auto auto", gap: 16, alignItems: "center",
                      padding: "14px 20px", borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.15s"
                    }} onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-elevated)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.key_name}</span>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {revealed[s.key_name]
                          ? <span style={{ color: "var(--green)", wordBreak: "break-all", whiteSpace: "normal" }}>{revealed[s.key_name]}</span>
                          : <span style={{ color: "var(--text-ghost)", letterSpacing: "0.15em", userSelect: "none" }}>••••••••••••</span>}
                      </div>
                      <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, background: "var(--bg-elevated)", color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace" }}>v{s.version}</span>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <button className="mp-icon-btn" title={revealed[s.key_name] ? "Hide" : "Reveal"} onClick={() => handleReveal(s.key_name)} style={revealed[s.key_name] ? { color: "var(--green)" } : {}}>
                          {revealed[s.key_name] ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                        </button>
                        <button className="mp-icon-btn" title="Copy" onClick={() => handleCopy(s.key_name)}>
                          {copied === s.key_name ? <Check style={{ width: 14, height: 14, color: "var(--green)" }} /> : <Copy style={{ width: 14, height: 14 }} />}
                        </button>
                        <button className="mp-icon-btn" title="Delete" onClick={() => handleDelete(s.key_name)} onMouseEnter={e => (e.currentTarget.style.color = "var(--red)")} onMouseLeave={e => (e.currentTarget.style.color = "var(--text-dim)")}>
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Danger zone */}
              {activeVault && (
                <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Danger Zone</div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>Delete vault &quot;{activeVault.name}&quot; and all secrets</div>
                  </div>
                  <button className="mp-danger-btn" onClick={handleDeleteVault}>Delete Vault</button>
                </div>
              )}
            </div>
          ) : <ComingSoonTab tab={activeTab} />}
        </main>
      </div>

      {modal === "add-vault" && <VaultModal onClose={() => setModal(null)} onCreate={handleCreateVault} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ONBOARDING
   ═══════════════════════════════════════════════════════════ */

function OnboardingEmpty({ onCreateVault }: { onCreateVault: () => void }) {
  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: "var(--bg-elevated)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
        <Terminal style={{ width: 28, height: 28, color: "var(--orange)" }} />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text)" }}>Welcome to MeowPass</h2>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8, maxWidth: 400 }}>Your secrets live in the terminal. This dashboard is your control panel.</p>

      <div style={{ marginTop: 32, width: "100%", maxWidth: 480 }}>
        <div style={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-card)", padding: 20, textAlign: "left" }}>
          <div style={{ fontSize: 11, color: "var(--text-ghost)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Get started with the CLI</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {["brew install meowrithm/tap/meowpass", "meowpass login", "meowpass init"].map(cmd => (
              <div key={cmd} style={{ display: "flex", gap: 12 }}>
                <span style={{ color: "var(--orange)", userSelect: "none", width: 16 }}>$</span>
                <span style={{ color: "var(--text)" }}>{cmd}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 16 }}>
            After <code style={{ color: "var(--orange)" }}>meowpass init</code>, your secrets appear here automatically.
          </p>
        </div>
      </div>

      <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onCreateVault} className="mp-btn-primary" style={{ width: "auto", padding: "8px 16px" }}>Or create a vault manually</button>
        <a href="https://meowpass.dev/docs/cli" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--text-dim)", textDecoration: "none" }}>
          CLI docs <ExternalLink style={{ width: 12, height: 12 }} />
        </a>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EMPTY SECRETS
   ═══════════════════════════════════════════════════════════ */

function EmptySecrets({ search, vaultId }: { search: string; vaultId: string }) {
  return (
    <div style={{ borderRadius: 12, border: "1px dashed var(--border)", padding: 48, textAlign: "center", background: "rgba(15,20,32,0.5)" }}>
      <Key style={{ width: 32, height: 32, color: "var(--text-ghost)", margin: "0 auto 12px", display: "block" }} />
      {search ? <p style={{ fontSize: 14, color: "var(--text-dim)" }}>No secrets match your filter</p> : <>
        <p style={{ fontSize: 14, color: "var(--text-dim)" }}>No secrets in this vault yet</p>
        <div style={{ marginTop: 16, display: "inline-block", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", padding: 16, textAlign: "left" }}>
          <div style={{ fontSize: 12, color: "var(--text-ghost)", marginBottom: 8 }}>Add secrets via CLI:</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            <div><span style={{ color: "var(--orange)" }}>$</span> <span style={{ color: "var(--text)" }}>meowpass set STRIPE_KEY sk_live_... --vault {vaultId.slice(0, 8)}...</span></div>
            <div><span style={{ color: "var(--orange)" }}>$</span> <span style={{ color: "var(--text)" }}>meowpass push --vault {vaultId.slice(0, 8)}...</span></div>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-ghost)", marginTop: 8 }}>Or use <code style={{ color: "var(--orange)" }}>meowpass init</code> to import your .env</div>
        </div>
      </>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMING SOON
   ═══════════════════════════════════════════════════════════ */

function ComingSoonTab({ tab }: { tab: SidebarTab }) {
  const info: Record<string, { title: string; desc: string; cli: string }> = {
    activity: { title: "Activity Log", desc: "Track who accessed, created, or modified secrets.", cli: "Audit logs available via API:\nGET /audit-logs?vault_id=<id>" },
    access: { title: "Team Management", desc: "Manage team members, roles, and vault sharing.", cli: "meowpass team list\nmeowpass team invite EMAIL --team ID\nmeowpass share VAULT_ID --team ID" },
    settings: { title: "Settings", desc: "Manage API keys, view your plan, and account settings.", cli: "meowpass apikey list\nmeowpass apikey create NAME\nmeowpass whoami" },
  };
  const { title, desc, cli } = info[tab] || { title: "", desc: "", cli: "" };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", textAlign: "center" }}>
      <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 999, background: "var(--orange-glow)", color: "var(--orange)", fontWeight: 500, marginBottom: 16 }}>Coming Soon</span>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>{title}</h2>
      <p style={{ fontSize: 14, color: "var(--text-dim)", marginTop: 8, maxWidth: 400 }}>{desc}</p>
      {cli && (
        <div style={{ marginTop: 24, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", padding: 16, textAlign: "left", maxWidth: 400, width: "100%" }}>
          <div style={{ fontSize: 12, color: "var(--text-ghost)", marginBottom: 8 }}>Available now via CLI:</div>
          <pre style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--text)", whiteSpace: "pre-wrap", lineHeight: 1.6, margin: 0 }}>{cli}</pre>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CLI HINT
   ═══════════════════════════════════════════════════════════ */

function CLIHint({ cmd, label }: { cmd: string; label: string }) {
  const [c, setC] = useState(false);
  return (
    <button className="mp-cli-hint" onClick={() => { navigator.clipboard.writeText(cmd); setC(true); setTimeout(() => setC(false), 2000); }} title={`Copy: ${cmd}`}>
      <Terminal style={{ width: 14, height: 14 }} className="mp-cli-hint-icon" />
      <span className="mp-cli-hint-label">{label}</span>
      {c ? <Check style={{ width: 12, height: 12, color: "var(--green)" }} /> : <Copy style={{ width: 12, height: 12, color: "var(--text-ghost)" }} />}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   VAULT MODAL
   ═══════════════════════════════════════════════════════════ */

function VaultModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => Promise<void> }) {
  const [name, setName] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!name.trim()) return;
    setBusy(true); try { await onCreate(name.trim()); onClose(); } catch { /* */ } setBusy(false);
  }
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="mp-card animate-fade-in" style={{ position: "relative", width: "100%", maxWidth: 400, zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Create Vault</h2>
          <button className="mp-icon-btn" onClick={onClose}><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <Field label="Vault Name" value={name} onChange={setName} placeholder="my-project" autoFocus />
          <p style={{ fontSize: 12, color: "var(--text-ghost)" }}>CLI: <code style={{ color: "var(--orange)" }}>meowpass vault create {name || "NAME"}</code></p>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="button" className="mp-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={busy || !name.trim()} className="mp-btn-primary" style={{ flex: 1 }}>
              {busy ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SHARED PRIMITIVES
   ═══════════════════════════════════════════════════════════ */

function CenterShell({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, position: "relative", zIndex: 10 }}><div style={{ width: "100%", maxWidth: 400 }}>{children}</div></div>;
}

function Field({ label, type = "text", value, onChange, placeholder, disabled, mono, autoFocus }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; mono?: boolean; autoFocus?: boolean;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required disabled={disabled} autoFocus={autoFocus}
        className={`mp-input ${mono ? "mp-input--mono" : ""}`} />
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return <div style={{ fontSize: 14, color: "var(--red)", borderRadius: 12, padding: "12px 16px", border: "1px solid rgba(239,68,68,0.15)", background: "rgba(239,68,68,0.08)" }}>{msg}</div>;
}
