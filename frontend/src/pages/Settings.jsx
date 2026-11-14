import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Database,
  Save,
  RefreshCw,
  Check,
  Lock,
  Radio
} from 'lucide-react';
import { useScans } from '../context/ScanContext';

export default function Settings() {
  const { settings, updateSettings, backendStatus, checkBackend } = useScans();
  const configuredModel = backendStatus.details?.gemini?.model || settings.model || 'gemini-3.5-flash-lite';
  const [model, setModel] = useState(configuredModel);
  const [riskThreshold, setRiskThreshold] = useState(settings.riskThreshold || 70);
  const [autoFlag, setAutoFlag] = useState(settings.autoFlagTyposquatting ?? true);
  const [soundAlerts, setSoundAlerts] = useState(settings.soundAlerts ?? false);
  const [demoNotice, setDemoNotice] = useState(settings.demoModeNotice ?? true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (backendStatus.details?.gemini?.model) {
      setModel(backendStatus.details.gemini.model);
    }
  }, [backendStatus.details?.gemini?.model]);

  const handleSave = (e) => {
    e.preventDefault();
    updateSettings({
      model,
      riskThreshold,
      autoFlagTyposquatting: autoFlag,
      soundAlerts,
      demoModeNotice: demoNotice,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-title">Settings & Engine Configuration</h1>
        <p className="page-subtitle">
          Manage AI heuristics, threat score sensitivity, backend connection parameters, and security policies.
        </p>
      </div>

      <div style={{ maxWidth: '850px', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* Backend & AI Connection Status Card */}
        <div className="card">
          <div className="panel-title-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Radio size={18} color="var(--accent-red)" />
              <span style={{ fontWeight: 600 }}>Backend & AI Engine Status</span>
            </div>
            <button
              className="text-btn"
              onClick={checkBackend}
              disabled={backendStatus.checking}
            >
              <RefreshCw size={13} className={backendStatus.checking ? 'spin' : ''} />
              <span>{backendStatus.checking ? 'Pinging...' : 'Check Connection'}</span>
            </button>
          </div>

          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">Flask API Service</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
                <span className={`pulse-dot ${backendStatus.connected ? 'success' : 'demo'}`}></span>
                <span style={{ fontWeight: 600, color: backendStatus.connected ? 'var(--threat-safe)' : 'var(--accent-red)' }}>
                  {backendStatus.connected
                    ? `Operational (Port ${backendStatus.details?.port || 5001})`
                    : 'Offline (Demonstration Mode)'}
                </span>
              </div>
            </div>

            <div className="status-item">
              <span className="status-label">Google Gemini API</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
                <Cpu size={15} color={backendStatus.geminiConfigured ? 'var(--threat-safe)' : 'var(--threat-medium)'} />
                <span style={{ fontWeight: 600, color: backendStatus.geminiConfigured ? 'var(--threat-safe)' : 'var(--text-secondary)' }}>
                  {backendStatus.geminiConfigured
                    ? `Active (${backendStatus.details?.gemini?.model || 'gemini-3.5-flash-lite'})`
                    : 'Configure in backend/.env'}
                </span>
              </div>
            </div>

            <div className="status-item">
              <span className="status-label">Local Audit Database</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
                <Database size={15} color="#38bdf8" />
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  SQLite 3 (zerox_ai.db)
                </span>
              </div>
            </div>

            <div className="status-item">
              <span className="status-label">Last Health Ping</span>
              <span style={{ fontWeight: 500, color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                {backendStatus.lastChecked || 'Just now'}
              </span>
            </div>
          </div>
        </div>

        {/* AI & Detection Preferences Form */}
        <form onSubmit={handleSave} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="panel-title-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={18} color="var(--accent-red)" />
              <span style={{ fontWeight: 600 }}>Gemini AI Model Parameters</span>
            </div>
          </div>

          <div>
            <label className="form-label">Active Gemini Threat Classifier</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="cyber-select"
            >
              <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite (Active Default — High speed scam & phishing detector)</option>
              <option value="gemini-3.5-flash">Gemini 3.5 Flash — Balanced multi-turn reasoning</option>
              <option value="gemini-3.8-flash">Gemini 3.8 Flash — Advanced frontier threat inference</option>
            </select>
            <span className="form-hint">
              Configured via <code>google-genai</code> SDK on the Flask backend. Keys are never exposed client-side.
            </span>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>High-Risk Critical Alert Threshold</label>
              <span style={{ fontWeight: 800, color: 'var(--threat-critical)', fontFamily: 'var(--font-mono)' }}>
                {riskThreshold} / 100
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="90"
              value={riskThreshold}
              onChange={(e) => setRiskThreshold(Number(e.target.value))}
              className="cyber-slider"
            />
            <span className="form-hint">
              Evaluations scoring above this risk mark trigger immediate quarantine recommendations.
            </span>
          </div>

          {/* Toggle Switches */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={autoFlag}
                onChange={(e) => setAutoFlag(e.target.checked)}
              />
              <div>
                <strong>Automatic Homoglyph / Typosquatting Interception</strong>
                <p>Flag lookalike brand domains (e.g. micr0soft.com) immediately regardless of WHOIS registration age.</p>
              </div>
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={soundAlerts}
                onChange={(e) => setSoundAlerts(e.target.checked)}
              />
              <div>
                <strong>Audio Threat Alerts</strong>
                <p>Play audible alert cue when a Critical risk score is discovered during live scan.</p>
              </div>
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={demoNotice}
                onChange={(e) => setDemoNotice(e.target.checked)}
              />
              <div>
                <strong>Show Demonstration Mode Banners</strong>
                <p>Clearly tag simulated sample telemetry when running without an active backend.</p>
              </div>
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingTop: '0.5rem' }}>
            <button type="submit" className="btn-red-pill">
              <Save size={16} />
              <span>Save Configuration</span>
            </button>
            {saved && (
              <span style={{ color: 'var(--threat-safe)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Check size={16} />
                <span>Preferences saved successfully!</span>
              </span>
            )}
          </div>
        </form>

        {/* Security & Cryptographic Privacy Disclosure */}
        <div className="card">
          <div className="panel-title-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={18} color="var(--accent-red)" />
              <span style={{ fontWeight: 600 }}>Zero-Retention Privacy Architecture</span>
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <p>
              ZEROX AI adheres to strict data minimization principles. Scan payloads are inspected in-memory and evaluated against threat models without persisting sensitive PII. Audit logs remain strictly inside your local workspace SQLite container.
            </p>
            <div style={{ marginTop: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              SYSTEM HASH: 0x9B4E...C21F • PROTOCOL: ZEROX-GENAI-v1.0
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
