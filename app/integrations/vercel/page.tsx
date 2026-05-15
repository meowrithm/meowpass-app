"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Check, Loader2, Trash2, RefreshCw, FolderSync, ChevronDown } from "lucide-react";
import * as api from "@/lib/api";

interface VercelProject {
  id: string;
  name: string;
}

interface Integration {
  id: string;
  provider: string;
  provider_account_id: string;
  project_mappings: { vault_id: string; vault_name: string; vercel_project: string; env: string }[];
  created_at: string;
}

interface Vault {
  id: string;
  name: string;
}

export default function VercelConfigPage() {
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [projects, setProjects] = useState<VercelProject[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connectToken, setConnectToken] = useState("");
  const [connecting, setConnecting] = useState(false);

  // New mapping form
  const [selectedVault, setSelectedVault] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedEnv, setSelectedEnv] = useState("production");
  const [addingMapping, setAddingMapping] = useState(false);

  const configId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("configurationId") : null;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [integrations, v] = await Promise.all([
        api.listIntegrations(),
        api.listVaults(),
      ]);
      setVaults(v || []);
      const vercel = (integrations || []).find((i: Integration) => i.provider === "vercel");
      if (vercel) {
        setIntegration(vercel);
        try {
          const p = await api.listVercelProjects();
          setProjects(p || []);
        } catch { /* token might be invalid */ }
      }
    } catch {
      setError("Please log in at app.meowpass.dev first");
    }
    setLoading(false);
  }

  async function handleConnect() {
    if (!connectToken.trim()) return;
    setConnecting(true);
    setError("");
    try {
      await api.connectVercel(connectToken.trim());
      setConnectToken("");
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    }
    setConnecting(false);
  }

  async function handleDisconnect() {
    if (!integration || !confirm("Disconnect Vercel? Your secrets in Vercel won't be deleted.")) return;
    try {
      await api.disconnectIntegration(integration.id);
      setIntegration(null);
      setProjects([]);
    } catch { /* */ }
  }

  async function handleAddMapping() {
    if (!integration || !selectedVault || !selectedProject) return;
    setAddingMapping(true);
    try {
      const vaultName = vaults.find(v => v.id === selectedVault)?.name || selectedVault;
      const mappings = [...(integration.project_mappings || []), {
        vault_id: selectedVault,
        vault_name: vaultName,
        vercel_project: selectedProject,
        env: selectedEnv,
      }];
      await api.updateIntegrationMappings(integration.id, mappings);
      setIntegration({ ...integration, project_mappings: mappings });
      setSelectedVault("");
      setSelectedProject("");
    } catch { /* */ }
    setAddingMapping(false);
  }

  async function handleRemoveMapping(index: number) {
    if (!integration) return;
    const mappings = integration.project_mappings.filter((_, i) => i !== index);
    await api.updateIntegrationMappings(integration.id, mappings);
    setIntegration({ ...integration, project_mappings: mappings });
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 style={{ width: 32, height: 32, color: "var(--orange)" }} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: "48px 24px", maxWidth: 640, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--orange-glow)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="20" height="20" viewBox="0 0 76 65" fill="white"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z"/></svg>
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>MeowPass + Vercel</h1>
          <p style={{ fontSize: 13, color: "var(--text-dim)" }}>Sync E2E encrypted secrets to Vercel environment variables</p>
        </div>
      </div>

      {error && (
        <div style={{ margin: "16px 0", padding: 12, borderRadius: 8, border: "1px solid var(--red)", background: "rgba(239,68,68,0.08)", color: "var(--red)", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Not connected */}
      {!integration && (
        <div style={{ marginTop: 32 }}>
          <div style={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-card)", padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Connect Vercel</h2>
            <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 16 }}>
              Enter your Vercel API token to connect. Get one from{" "}
              <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer" style={{ color: "var(--orange)", textDecoration: "none" }}>
                vercel.com/account/tokens <ExternalLink style={{ width: 11, height: 11, display: "inline" }} />
              </a>
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="password"
                value={connectToken}
                onChange={e => setConnectToken(e.target.value)}
                placeholder="Vercel API token"
                style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-deep)", color: "var(--text)", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", outline: "none" }}
              />
              <button
                onClick={handleConnect}
                disabled={connecting || !connectToken.trim()}
                style={{ padding: "10px 20px", borderRadius: 8, background: "var(--orange)", color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", opacity: connecting ? 0.6 : 1 }}
              >
                {connecting ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : "Connect"}
              </button>
            </div>
          </div>

          <div style={{ marginTop: 16, padding: 16, borderRadius: 8, background: "rgba(255,109,0,0.05)", border: "1px solid rgba(255,109,0,0.15)" }}>
            <p style={{ fontSize: 12, color: "var(--text-dim)" }}>
              <strong style={{ color: "var(--orange)" }}>Or use CLI:</strong>{" "}
              <code style={{ color: "var(--text)", fontFamily: "'JetBrains Mono', monospace" }}>mp vercel sync --project my-app --env production</code>
            </p>
          </div>
        </div>
      )}

      {/* Connected */}
      {integration && (
        <div style={{ marginTop: 32 }}>
          {/* Status */}
          <div style={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-card)", padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Check style={{ width: 16, height: 16, color: "var(--green)" }} />
                <span style={{ fontSize: 14, fontWeight: 500, color: "var(--green)" }}>Connected to Vercel</span>
              </div>
              <button onClick={handleDisconnect} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 12, cursor: "pointer" }}>
                <Trash2 style={{ width: 12, height: 12 }} /> Disconnect
              </button>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 8 }}>
              Connected {new Date(integration.created_at).toLocaleDateString()}
              {configId && <span> · Config: {configId.slice(0, 12)}...</span>}
            </p>
          </div>

          {/* Project Mappings */}
          <div style={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-card)", padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Project Mappings</h2>
              <button onClick={loadData} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 11, cursor: "pointer" }}>
                <RefreshCw style={{ width: 11, height: 11 }} /> Refresh
              </button>
            </div>

            {/* Existing mappings */}
            {(integration.project_mappings || []).length > 0 ? (
              <div style={{ marginBottom: 16 }}>
                {integration.project_mappings.map((m, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", marginBottom: 8, background: "var(--bg-deep)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <FolderSync style={{ width: 14, height: 14, color: "var(--orange)" }} />
                      <span style={{ fontSize: 13, color: "var(--text)" }}>{m.vault_name || m.vault_id.slice(0, 8)}</span>
                      <span style={{ fontSize: 11, color: "var(--text-dim)" }}>→</span>
                      <span style={{ fontSize: 13, color: "var(--text)", fontFamily: "'JetBrains Mono', monospace" }}>{m.vercel_project}</span>
                      <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--bg-elevated)", color: "var(--text-dim)" }}>{m.env}</span>
                    </div>
                    <button onClick={() => handleRemoveMapping(i)} style={{ color: "var(--text-dim)", background: "transparent", border: "none", cursor: "pointer", padding: 4 }}>
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 16 }}>No mappings yet. Add one below to sync secrets.</p>
            )}

            {/* Add mapping */}
            <div style={{ padding: 16, borderRadius: 8, border: "1px dashed var(--border)", background: "var(--bg-deep)" }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-dim)", marginBottom: 12 }}>Add mapping</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px auto", gap: 8 }}>
                <select value={selectedVault} onChange={e => setSelectedVault(e.target.value)} style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text)", fontSize: 12 }}>
                  <option value="">Select vault</option>
                  {vaults.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text)", fontSize: 12 }}>
                  <option value="">Select Vercel project</option>
                  {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
                <select value={selectedEnv} onChange={e => setSelectedEnv(e.target.value)} style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text)", fontSize: 12 }}>
                  <option value="production">production</option>
                  <option value="preview">preview</option>
                  <option value="development">development</option>
                  <option value="default">default</option>
                </select>
                <button onClick={handleAddMapping} disabled={addingMapping || !selectedVault || !selectedProject} style={{ padding: "8px 14px", borderRadius: 6, background: "var(--orange)", color: "white", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", opacity: addingMapping ? 0.6 : 1 }}>
                  {addingMapping ? "..." : "Add"}
                </button>
              </div>
            </div>
          </div>

          {/* CLI hint */}
          <div style={{ padding: 16, borderRadius: 8, background: "rgba(255,109,0,0.05)", border: "1px solid rgba(255,109,0,0.15)" }}>
            <p style={{ fontSize: 12, color: "var(--text-dim)" }}>
              <strong style={{ color: "var(--orange)" }}>CLI sync:</strong>{" "}
              <code style={{ color: "var(--text)", fontFamily: "'JetBrains Mono', monospace" }}>mp vercel sync --project PROJECT --env production</code>
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 48, textAlign: "center" }}>
        <a href="https://meowpass.dev/docs/vercel" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--text-dim)", textDecoration: "none" }}>
          Documentation <ExternalLink style={{ width: 10, height: 10, display: "inline" }} />
        </a>
        <span style={{ margin: "0 8px", color: "var(--text-ghost)" }}>·</span>
        <a href="https://discord.gg/GTZcZKRQu7" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--text-dim)", textDecoration: "none" }}>
          Support
        </a>
      </div>
    </div>
  );
}
