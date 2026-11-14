import React, { useState } from 'react';
import {
  Shield,
  Activity,
  ArrowRight,
  TrendingUp,
  Globe,
  MessageSquareWarning,
  Sparkles,
  Play,
  Database,
  Radio,
  ChevronRight,
  Eye,
  ArrowUpRight,
  Scan,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  QrCode,
  Users
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  BarChart,
  Bar,
  LineChart,
  Line
} from 'recharts';
import { useScans } from '../context/ScanContext';
import RiskBadge from '../components/common/RiskBadge';
import RiskMeter from '../components/common/RiskMeter';
import FraudVerdictBadge from '../components/common/FraudVerdictBadge';
import ScanDetailModal from '../components/common/ScanDetailModal';

// Event Volume sparkline data (matching top right card in screenshot)
const SPARKLINE_DATA = [
  { day: 'May 7', volume: 8 },
  { day: 'May 8', volume: 11 },
  { day: 'May 9', volume: 9 },
  { day: 'May 10', volume: 15 },
  { day: 'May 11', volume: 13 },
  { day: 'May 12', volume: 19 },
  { day: 'May 13', volume: 18.6 },
];

// Scalability line chart data (matching bottom card 2 in screenshot)
const SCALE_LINE_DATA = [
  { month: 'Jan', val: 12 },
  { month: 'Feb', val: 19 },
  { month: 'Mar', val: 15 },
  { month: 'Apr', val: 32 },
  { month: 'May', val: 48 },
  { month: 'Jun', val: 65 },
  { month: 'Jul', val: 89 },
];

// Performance bar data (matching bottom card 1 in screenshot)
const PERFORMANCE_BAR_DATA = [
  { day: 'Mon', h: 30 },
  { day: 'Tue', h: 45 },
  { day: 'Wed', h: 60 },
  { day: 'Thu', h: 80 },
  { day: 'Fri', h: 95 },
  { day: 'Sat', h: 100 },
];

export default function Dashboard({ onNavigate }) {
  const { scans, stats, backendStatus } = useScans();
  const [selectedScan, setSelectedScan] = useState(null);

  const recentScans = scans.slice(0, 5);

  return (
    <div className="nexora-dashboard-container">
      {/* 1. HERO SECTION */}
      <section className="nexora-hero">
        {/* Top Announcement Pill */}
        <div
          className="hero-announcement-pill"
          onClick={() => onNavigate('settings')}
          role="button"
          tabIndex={0}
        >
          <span className="pill-dot">🚀</span>
          <span className="pill-text">New Release — ZEROX AI 2.0 with Gemini 2.5 is live</span>
          <ChevronRight size={14} className="pill-chevron" />
        </div>

        {/* Hero Title */}
        <h1 className="hero-headline">
          The Threat Platform <br />
          Built for <span className="text-crimson-gradient">Velocity</span>
        </h1>

        {/* Hero Subtitle */}
        <p className="hero-subheadline">
          Ingest, analyze, and neutralize scams in real-time. ZEROX AI helps individuals
          and security teams move faster, detect phishing, and neutralize threats before victims click.
        </p>

        {/* CTA Buttons */}
        <div className="hero-cta-group">
          <button
            className="btn-red-pill hero-primary-btn"
            onClick={() => onNavigate('message-scanner')}
          >
            <span>Start Free Scan</span>
            <ArrowRight size={16} />
          </button>
          <button
            className="btn-dark-glass hero-secondary-btn"
            onClick={() => onNavigate('security-center')}
          >
            <Shield size={16} />
            <span>Explore Defense</span>
          </button>
        </div>
      </section>

      {/* 2. STATS ROW (3 CARDS MATCHING SCREENSHOT) */}
      <section className="nexora-stats-row">
        {/* Card 1: Data / Messages Ingested */}
        <div className="nexora-stat-card" onClick={() => onNavigate('message-scanner')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-icon-box">
            <MessageSquareWarning size={18} color="#ff2a55" />
          </div>
          <div className="stat-card-meta">
            <span className="stat-card-label">Total Scans Audited</span>
            <div className="stat-card-number">{backendStatus.connected ? stats.totalScans : (stats.totalScans || '2.45 M')}</div>
            <div className="stat-card-growth">{backendStatus.connected ? 'Persistent SQLite Records' : '↗ 32% vs last 7 days'}</div>
          </div>
        </div>

        {/* Card 2: Queries / URLs Run */}
        <div className="nexora-stat-card" onClick={() => onNavigate('url-scanner')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-icon-box">
            <Globe size={18} color="#ff2a55" />
          </div>
          <div className="stat-card-meta">
            <span className="stat-card-label">Threats Blocked</span>
            <div className="stat-card-number">{backendStatus.connected ? stats.threatsDetected : (stats.threatsDetected || '342')}</div>
            <div className="stat-card-growth">
              {backendStatus.connected
                ? `${stats.totalScans > 0 ? Math.round((stats.threatsDetected / stats.totalScans) * 100) : 0}% Detection Rate`
                : '↗ 24% vs last 7 days'}
            </div>
          </div>
        </div>

        {/* Card 3: Threat Volume / Average Risk with Real Sparkline Area Chart */}
        <div className="nexora-stat-card stat-card-wide" onClick={() => onNavigate('scan-history')} style={{ cursor: 'pointer' }}>
          <div className="sparkline-meta">
            <span className="stat-card-label">Average Risk Index</span>
            <div className="stat-card-number">
              {backendStatus.connected ? `${stats.avgRisk} / 100` : '18.6 K'}
            </div>
            <div className="stat-card-growth">
              {backendStatus.connected
                ? (stats.avgRisk >= 60 ? '⚠️ High Critical Average' : '🛡️ Safe/Low Threat Average')
                : '↗ 26% vs last 7 days'}
            </div>
          </div>
          <div className="sparkline-chart-wrapper">
            <ResponsiveContainer width="100%" height={85}>
              <AreaChart data={SPARKLINE_DATA} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="redGlowGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff2a55" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#ff2a55" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#11131a',
                    border: '1px solid #2b3044',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="#ff2a55"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#redGlowGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="sparkline-dates">
              <span>May 7</span>
              <span>May 9</span>
              <span>May 11</span>
              <span>May 13</span>
            </div>
          </div>
        </div>
      </section>

      {/* FRAUD OR NOT FRAUD DETECTION SUMMARY */}
      <section className="fraud-summary-section">
        <div className="fraud-summary-header">
          <div className="fraud-summary-title-group">
            <span className="bento-badge-tag" style={{ background: 'rgba(255, 42, 85, 0.12)', color: 'var(--accent-red)' }}>
              FRAUD OR NOT FRAUD TELEMETRY
            </span>
            <h3 className="section-title-large">Fraud Detection Summary</h3>
            <p className="section-subtitle">
              Live SQLite threat audit history corroborated with Google Gemini AI forensic heuristics.
            </p>
          </div>
          <div className="fraud-rate-callout">
            <span className="callout-value">{stats.fraudStats?.fraudRatePct ?? 0}%</span>
            <span className="callout-label">Fraud Detection Rate</span>
            <span className="callout-subtext">(Confirmed Fraud / Total Scans)</span>
          </div>
        </div>

        <div className="fraud-summary-grid">
          {/* Total Audited */}
          <div className="fraud-summary-card">
            <div className="summary-card-icon neutral">
              <Scan size={18} />
            </div>
            <div className="summary-card-data">
              <span className="summary-card-label">Total Audited Scans</span>
              <div className="summary-card-value">{stats.totalScans}</div>
              <span className="summary-card-sub">SQLite Audit Trail</span>
            </div>
          </div>

          {/* Potential Fraud Detections (Red) */}
          <div className="fraud-summary-card fraud" onClick={() => onNavigate('scan-history')} style={{ cursor: 'pointer' }}>
            <div className="summary-card-icon danger">
              <ShieldAlert size={18} color="var(--accent-red)" />
            </div>
            <div className="summary-card-data">
              <span className="summary-card-label">Potential Fraud Detections</span>
              <div className="summary-card-value text-danger">{stats.fraudStats?.fraudDetected ?? 0}</div>
              <span className="summary-card-sub">Strong threat indicators</span>
            </div>
          </div>

          {/* No Significant Fraud Indicators (Green) */}
          <div className="fraud-summary-card safe" onClick={() => onNavigate('scan-history')} style={{ cursor: 'pointer' }}>
            <div className="summary-card-icon safe">
              <ShieldCheck size={18} color="var(--threat-safe)" />
            </div>
            <div className="summary-card-data">
              <span className="summary-card-label">No Fraud Indicators</span>
              <div className="summary-card-value text-safe">{stats.fraudStats?.noFraudDetected ?? 0}</div>
              <span className="summary-card-sub">Standard / verified inputs</span>
            </div>
          </div>

          {/* Results Needing Review (Yellow) */}
          <div className="fraud-summary-card review" onClick={() => onNavigate('scan-history')} style={{ cursor: 'pointer' }}>
            <div className="summary-card-icon warning">
              <AlertCircle size={18} color="var(--threat-medium)" />
            </div>
            <div className="summary-card-data">
              <span className="summary-card-label">Needs Review</span>
              <div className="summary-card-value text-warning">{stats.fraudStats?.needsReview ?? 0}</div>
              <span className="summary-card-sub">Uncertain / manual verification</span>
            </div>
          </div>
        </div>
      </section>

      {/* QR CODE FRAUD TELEMETRY SECTION */}
      <section className="fraud-summary-section qr-telemetry-section" style={{ marginTop: '1.5rem' }}>
        <div className="fraud-summary-header">
          <div className="fraud-summary-title-group">
            <span className="bento-badge-tag" style={{ background: 'rgba(255, 42, 85, 0.12)', color: 'var(--accent-red)' }}>
              QR CODE AUDIT METRICS
            </span>
            <h3 className="section-title-large">QR Code Scam Telemetry</h3>
            <p className="section-subtitle">
              Live SQLite statistics for scanned QR codes, reverse payment traps, and deceptive destination URLs.
            </p>
          </div>
          <div className="fraud-rate-callout qr-rate-callout">
            <span className="callout-value">{stats.qrStats?.fraudRatePct ?? 0}%</span>
            <span className="callout-label">QR Fraud Detection Rate</span>
            <span className="callout-subtext">(Confirmed Fraud / Total QR Scans)</span>
          </div>
        </div>

        <div className="fraud-summary-grid">
          {/* Total QR Scans */}
          <div className="fraud-summary-card" onClick={() => onNavigate('qr-scanner')} style={{ cursor: 'pointer' }}>
            <div className="summary-card-icon neutral">
              <QrCode size={18} />
            </div>
            <div className="summary-card-data">
              <span className="summary-card-label">Total QR Scans</span>
              <div className="summary-card-value">{stats.qrStats?.total ?? 0}</div>
              <span className="summary-card-sub">SQLite Decoded Records</span>
            </div>
          </div>

          {/* QR Fraud Detections */}
          <div className="fraud-summary-card fraud" onClick={() => onNavigate('scan-history')} style={{ cursor: 'pointer' }}>
            <div className="summary-card-icon danger">
              <ShieldAlert size={18} color="var(--accent-red)" />
            </div>
            <div className="summary-card-data">
              <span className="summary-card-label">QR Fraud Detections</span>
              <div className="summary-card-value text-danger">{stats.qrStats?.fraudDetected ?? 0}</div>
              <span className="summary-card-sub">Reverse scams & malicious URLs</span>
            </div>
          </div>

          {/* Clean QR Codes */}
          <div className="fraud-summary-card safe" onClick={() => onNavigate('scan-history')} style={{ cursor: 'pointer' }}>
            <div className="summary-card-icon safe">
              <ShieldCheck size={18} color="var(--threat-safe)" />
            </div>
            <div className="summary-card-data">
              <span className="summary-card-label">No Fraud Indicators</span>
              <div className="summary-card-value text-safe">{stats.qrStats?.noFraudDetected ?? 0}</div>
              <span className="summary-card-sub">Standard / safe QR codes</span>
            </div>
          </div>

          {/* QR Scans Needing Review */}
          <div className="fraud-summary-card review" onClick={() => onNavigate('scan-history')} style={{ cursor: 'pointer' }}>
            <div className="summary-card-icon warning">
              <AlertCircle size={18} color="var(--threat-medium)" />
            </div>
            <div className="summary-card-data">
              <span className="summary-card-label">QR Needs Review</span>
              <div className="summary-card-value text-warning">{stats.qrStats?.needsReview ?? 0}</div>
              <span className="summary-card-sub">Ambiguous payment parameters</span>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL MEDIA SCAM & IMPERSONATION TELEMETRY SECTION */}
      <section className="fraud-summary-section social-telemetry-section" style={{ marginTop: '1.5rem' }}>
        <div className="fraud-summary-header">
          <div className="fraud-summary-title-group">
            <span className="bento-badge-tag" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
              SOCIAL MEDIA & PROFILE FORENSICS
            </span>
            <h3 className="section-title-large">Social Media Scam Telemetry</h3>
            <p className="section-subtitle">
              Live SQLite statistics for scanned social media profiles, impersonation attempts, fake job offers, and crypto traps.
            </p>
          </div>
          <div className="fraud-rate-callout social-rate-callout">
            <span className="callout-value" style={{ color: '#ec4899' }}>{stats.socialStats?.fraudRatePct ?? 0}%</span>
            <span className="callout-label">Social Fraud Detection Rate</span>
            <span className="callout-subtext">(Confirmed Fraud / Total Social Scans)</span>
          </div>
        </div>

        <div className="fraud-summary-grid">
          {/* Total Social Scans */}
          <div className="fraud-summary-card" onClick={() => onNavigate('social-scanner')} style={{ cursor: 'pointer' }}>
            <div className="summary-card-icon neutral">
              <Users size={18} color="#ec4899" />
            </div>
            <div className="summary-card-data">
              <span className="summary-card-label">Total Social Profiles</span>
              <div className="summary-card-value">{stats.socialStats?.total ?? 0}</div>
              <span className="summary-card-sub">SQLite Profile Dossiers</span>
            </div>
          </div>

          {/* Social Fraud Detections */}
          <div className="fraud-summary-card fraud" onClick={() => onNavigate('scan-history')} style={{ cursor: 'pointer' }}>
            <div className="summary-card-icon danger">
              <ShieldAlert size={18} color="var(--accent-red)" />
            </div>
            <div className="summary-card-data">
              <span className="summary-card-label">Profile Fraud Detections</span>
              <div className="summary-card-value text-danger">{stats.socialStats?.fraudDetected ?? 0}</div>
              <span className="summary-card-sub">Impersonators & social scams</span>
            </div>
          </div>

          {/* Clean Social Profiles */}
          <div className="fraud-summary-card safe" onClick={() => onNavigate('scan-history')} style={{ cursor: 'pointer' }}>
            <div className="summary-card-icon safe">
              <ShieldCheck size={18} color="var(--threat-safe)" />
            </div>
            <div className="summary-card-data">
              <span className="summary-card-label">No Fraud Indicators</span>
              <div className="summary-card-value text-safe">{stats.socialStats?.noFraudDetected ?? 0}</div>
              <span className="summary-card-sub">Benign / clean social profiles</span>
            </div>
          </div>

          {/* Social Scans Needing Review */}
          <div className="fraud-summary-card review" onClick={() => onNavigate('scan-history')} style={{ cursor: 'pointer' }}>
            <div className="summary-card-icon warning">
              <AlertCircle size={18} color="var(--threat-medium)" />
            </div>
            <div className="summary-card-data">
              <span className="summary-card-label">Profiles Needing Review</span>
              <div className="summary-card-value text-warning">{stats.socialStats?.needsReview ?? 0}</div>
              <span className="summary-card-sub">Unverified claims / ambiguous</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED BENTO GRID SHOWCASE (MATCHING SCREENSHOT MIDDLE SECTION) */}
      <section className="nexora-bento-section">
        {/* Left Column Text */}
        <div className="bento-text-column">
          <span className="bento-badge-tag">POWERFUL. REAL-TIME. HEURISTIC.</span>
          <h2 className="bento-headline">
            Everything you need to turn data into <span className="text-crimson-gradient">decisions</span>
          </h2>
          <p className="bento-paragraph">
            ZEROX AI unifies real-time threat intelligence with deep semantic scam analysis,
            domain typosquatting defense, and intuitive visualizations — all in one AI-native platform.
          </p>
          <button
            className="btn-red-pill bento-cta-btn"
            onClick={() => onNavigate('url-scanner')}
          >
            <span>Explore Features</span>
            <ArrowRight size={15} />
          </button>
        </div>

        {/* Right Column: Multi-panel interactive dashboard mockup */}
        <div className="bento-mockup-wrapper">
          {/* Top Row: Pipelines & Metrics */}
          <div className="bento-mockup-top-row">
            {/* Pipelines list */}
            <div className="mockup-panel pipeline-panel">
              <div className="panel-header-row">
                <span className="panel-title">Active Streams</span>
                <span
                  className="panel-sub-action"
                  onClick={() => onNavigate('security-center')}
                  style={{ cursor: 'pointer' }}
                >
                  View all
                </span>
              </div>
              <div className="stream-items-list">
                <div className="stream-item">
                  <div>
                    <div className="stream-name">User Events</div>
                    <div className="stream-type">Streaming</div>
                  </div>
                  <span className="stream-dot green"></span>
                </div>
                <div className="stream-item">
                  <div>
                    <div className="stream-name">Bank Smishing</div>
                    <div className="stream-type">Streaming</div>
                  </div>
                  <span className="stream-dot green"></span>
                </div>
                <div className="stream-item">
                  <div>
                    <div className="stream-name">Phishing Links</div>
                    <div className="stream-type">Batch 2.5</div>
                  </div>
                  <span className="stream-dot amber"></span>
                </div>
                <div className="stream-item">
                  <div>
                    <div className="stream-name">Fraud Logs</div>
                    <div className="stream-type">Streaming</div>
                  </div>
                  <span className="stream-dot green"></span>
                </div>
              </div>
            </div>

            {/* Metrics & Filter Tags */}
            <div className="mockup-panel metrics-panel">
              <div className="metrics-tiles-grid">
                <div className="metric-tile">
                  <span className="metric-tile-label">Active Scans</span>
                  <div className="metric-tile-val">24.8 K</div>
                  <span className="metric-tile-sub red">↗ 18%</span>
                </div>
                <div className="metric-tile">
                  <span className="metric-tile-label">Latency</span>
                  <div className="metric-tile-val">120 ms</div>
                  <span className="metric-tile-sub green">↗ 19%</span>
                </div>
                <div className="metric-tile">
                  <span className="metric-tile-label">Accuracy</span>
                  <div className="metric-tile-val">99.98%</div>
                  <span className="metric-tile-sub red">↗ 0.02%</span>
                </div>
              </div>

              {/* Tag Badges */}
              <div className="tags-row">
                <span className="pill-tag"><span className="tag-dot red"></span>⚡ Real-time</span>
                <span className="pill-tag"><span className="tag-dot"></span>Scalable</span>
                <span className="pill-tag"><span className="tag-dot"></span>Secure</span>
                <span className="pill-tag"><span className="tag-dot"></span>Reliable</span>
              </div>

              {/* Query Editor Box */}
              <div className="query-editor-box">
                <div className="query-editor-header">
                  <span>Query Editor</span>
                  <span className="query-lang">SQL / Gemini</span>
                </div>
                <pre className="query-code-snippet">
                  <code>
                    <span className="code-kw">SELECT</span> threat_type, count(*)<br />
                    <span className="code-kw">FROM</span> zerox_scans<br />
                    <span className="code-kw">WHERE</span> risk_score &gt;= <span className="code-num">80</span><br />
                    <span className="code-kw">ORDER BY</span> risk_score <span className="code-kw">DESC</span>;
                  </code>
                </pre>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
                  <button
                    className="query-run-btn"
                    onClick={() => onNavigate('message-scanner')}
                  >
                    <Play size={12} fill="#fff" />
                    <span>Run Query</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row: Top Events & Data Sources */}
          <div className="bento-mockup-bottom-row">
            {/* Top Events list */}
            <div className="mockup-panel top-events-panel">
              <div className="panel-header-row">
                <span className="panel-title">Top Threats</span>
                <span
                  className="panel-sub-action"
                  onClick={() => onNavigate('scan-history')}
                  style={{ cursor: 'pointer' }}
                >
                  View all
                </span>
              </div>
              <div className="events-bars-list">
                <div className="event-bar-row">
                  <div className="event-bar-info">
                    <span>bank_smishing</span>
                    <span>5.2M</span>
                  </div>
                  <div className="event-progress-track">
                    <div className="event-progress-fill" style={{ width: '92%' }}></div>
                  </div>
                </div>

                <div className="event-bar-row">
                  <div className="event-bar-info">
                    <span>phishing_links</span>
                    <span>4.6M</span>
                  </div>
                  <div className="event-progress-track">
                    <div className="event-progress-fill" style={{ width: '80%' }}></div>
                  </div>
                </div>

                <div className="event-bar-row">
                  <div className="event-bar-info">
                    <span>task_recruitment</span>
                    <span>2.1M</span>
                  </div>
                  <div className="event-progress-track">
                    <div className="event-progress-fill" style={{ width: '45%' }}></div>
                  </div>
                </div>

                <div className="event-bar-row">
                  <div className="event-bar-info">
                    <span>crypto_giveaway</span>
                    <span>1.3M</span>
                  </div>
                  <div className="event-progress-track">
                    <div className="event-progress-fill" style={{ width: '28%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Sources row */}
            <div className="mockup-panel sources-panel">
              <div className="panel-header-row">
                <span className="panel-title">Data Sources</span>
                <span
                  className="panel-sub-action"
                  onClick={() => onNavigate('settings')}
                  style={{ cursor: 'pointer' }}
                >
                  View all
                </span>
              </div>
              <div className="sources-icons-row">
                <div className="source-icon-badge" title="Google Gemini 2.5" onClick={() => onNavigate('settings')} style={{ cursor: 'pointer' }}>
                  <Sparkles size={18} color="#ff2a55" />
                </div>
                <div className="source-icon-badge" title="SQLite Engine" onClick={() => onNavigate('settings')} style={{ cursor: 'pointer' }}>
                  <Database size={18} color="#38bdf8" />
                </div>
                <div className="source-icon-badge" title="SMS Gateway" onClick={() => onNavigate('message-scanner')} style={{ cursor: 'pointer' }}>
                  <MessageSquareWarning size={18} color="#f59e0b" />
                </div>
                <div className="source-icon-badge" title="Web Browser DNS" onClick={() => onNavigate('url-scanner')} style={{ cursor: 'pointer' }}>
                  <Globe size={18} color="#10b981" />
                </div>
                <div className="source-icon-badge" title="Webhook Stream" onClick={() => onNavigate('settings')} style={{ cursor: 'pointer' }}>
                  <Radio size={18} color="#8b5cf6" />
                </div>
                <div className="source-icon-badge add-btn" title="Add Source" onClick={() => onNavigate('settings')} style={{ cursor: 'pointer' }}>
                  +
                </div>
              </div>
              <div className="sources-footer">
                <span className="status-live-dot"></span>
                <span>Connected • 23 Sources Online</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. RECENT SCAN ACTIVITY (LIVE TELEMETRY FROM SCANS) */}
      <section className="card" style={{ marginBottom: '5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Recent Scan Activity</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Real-time audits executed across message streams and domain endpoints
            </p>
          </div>
          <button
            onClick={() => onNavigate('scan-history')}
            className="btn-link"
            style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-red)' }}
          >
            <span>View Full Audit Log</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

        {recentScans.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No scans recorded yet. Use Message Scanner or URL Scanner to begin.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="cyber-table">
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>TYPE</th>
                  <th>TARGET CONTENT</th>
                  <th style={{ width: '150px' }}>FRAUD VERDICT</th>
                  <th style={{ width: '130px' }}>CLASSIFICATION</th>
                  <th style={{ width: '110px' }}>RISK SCORE</th>
                  <th style={{ width: '130px' }}>TIMESTAMP</th>
                  <th style={{ width: '70px', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {recentScans.map((scan) => (
                  <tr key={scan.id}>
                    <td>
                      <span className="type-pill">
                        {scan.scan_type === 'message' ? (
                          <MessageSquareWarning size={13} color="var(--accent-red)" />
                        ) : ['qr', 'qr_code'].includes(String(scan.scan_type || '').toLowerCase()) ? (
                          <QrCode size={13} color="var(--accent-red)" />
                        ) : ['social', 'social_media'].includes(String(scan.scan_type || '').toLowerCase()) ? (
                          <Users size={13} color="#ec4899" />
                        ) : (
                          <Globe size={13} color="var(--accent-red)" />
                        )}
                        <span>
                          {['qr', 'qr_code'].includes(String(scan.scan_type || '').toLowerCase())
                            ? 'QR'
                            : ['social', 'social_media'].includes(String(scan.scan_type || '').toLowerCase())
                            ? 'Social'
                            : scan.scan_type}
                        </span>
                      </span>
                    </td>
                    <td className="content-cell">
                      <span className="truncate-text" title={scan.target_content}>
                        {scan.target_content}
                      </span>
                      {scan.isDemo && <span className="demo-tag">Sample Data</span>}
                    </td>
                    <td>
                      <FraudVerdictBadge
                        verdict={scan.fraud_verdict}
                        riskScore={scan.risk_score}
                        confidence={scan.confidence_score}
                        size="pill"
                      />
                    </td>
                    <td>
                      <RiskBadge level={scan.threat_level} />
                    </td>
                    <td>
                      <span
                        className="score-cell"
                        style={{
                          color: scan.risk_score >= 60 ? 'var(--threat-critical)' : scan.risk_score >= 30 ? 'var(--threat-medium)' : 'var(--threat-safe)'
                        }}
                      >
                        {scan.risk_score} / 100
                      </span>
                    </td>
                    <td className="time-cell">
                      {new Date(scan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="action-btn"
                        onClick={() => setSelectedScan(scan)}
                        title="View Detailed Threat Report"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 5. THREE CARDS SECTION (MATCHING SCREENSHOT BOTTOM CARDS) */}
      <section className="nexora-triad-section">
        <div className="triad-header">
          <span className="triad-badge-tag">BUILT FOR MODERN TEAMS</span>
          <h2 className="triad-headline">
            A platform that <span className="text-crimson-gradient">scales with you</span>
          </h2>
        </div>

        <div className="triad-cards-grid">
          {/* Card 1: SOLID RED VIBRANT CARD */}
          <div className="triad-card solid-red-card" onClick={() => onNavigate('message-scanner')} style={{ cursor: 'pointer' }}>
            <div className="card-top-icon">
              <Activity size={20} color="#fff" />
            </div>
            <span className="card-tag-label">PERFORMANCE</span>
            <h3 className="card-title-text">Engineered for High Performance</h3>
            <p className="card-desc-text">
              Process billions of security events in real-time with sub-second AI inference latency.
            </p>

            {/* Dark Bar Chart inside red card */}
            <div className="red-card-chart-container">
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={PERFORMANCE_BAR_DATA} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <Bar dataKey="h" fill="#0f1118" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="red-card-days">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>
            </div>
          </div>

          {/* Card 2: DARK CARD WITH TREND LINE */}
          <div className="triad-card dark-glass-card" onClick={() => onNavigate('url-scanner')} style={{ cursor: 'pointer' }}>
            <div className="card-top-icon dark">
              <TrendingUp size={20} color="#ff2a55" />
            </div>
            <span className="card-tag-label text-muted">SCALABILITY</span>
            <h3 className="card-title-text">Built to Scale Effortlessly</h3>
            <p className="card-desc-text">
              Seamlessly scale from local SMS audits to enterprise-scale phishing feeds.
            </p>

            {/* White Connected Line Chart */}
            <div className="dark-card-chart-container">
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={SCALE_LINE_DATA} margin={{ top: 10, right: 5, left: 5, bottom: 0 }}>
                  <Line
                    type="monotone"
                    dataKey="val"
                    stroke="#ffffff"
                    strokeWidth={2}
                    dot={{ fill: '#ff2a55', r: 3, stroke: '#ffffff', strokeWidth: 1.5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="chart-x-labels">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
                <span>Jul</span>
              </div>
            </div>
          </div>

          {/* Card 3: DARK CARD WITH CIRCULAR RADIAL RING */}
          <div className="triad-card dark-glass-card" onClick={() => onNavigate('security-center')} style={{ cursor: 'pointer' }}>
            <div className="card-top-icon dark">
              <Shield size={20} color="#ff2a55" />
            </div>
            <span className="card-tag-label text-muted">RELIABILITY</span>
            <h3 className="card-title-text">Enterprise-Grade Reliability</h3>
            <p className="card-desc-text">
              99.99% detection accuracy with privacy-first zero message retention guarantees.
            </p>

            {/* Circular Ring */}
            <div className="radial-ring-container">
              <div className="radial-ring-box">
                <svg width={130} height={130} style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx={65}
                    cy={65}
                    r={50}
                    stroke="#1a1e2b"
                    strokeWidth={12}
                    fill="transparent"
                  />
                  <circle
                    cx={65}
                    cy={65}
                    r={50}
                    stroke="#ff2a55"
                    strokeWidth={12}
                    strokeDasharray={2 * Math.PI * 50}
                    strokeDashoffset={2 * Math.PI * 50 * 0.05}
                    strokeLinecap="round"
                    fill="transparent"
                    style={{ filter: 'drop-shadow(0 0 10px rgba(255,42,85,0.6))' }}
                  />
                </svg>
                <div className="radial-ring-label">
                  <div className="radial-score-val">99.99%</div>
                  <div className="radial-score-sub">Uptime</div>
                </div>
              </div>

              {/* Legend */}
              <div className="radial-legend">
                <span className="legend-tag red">● Uptime</span>
                <span className="legend-tag gray">● Downtime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Forensic Report Modal */}
      {selectedScan && (
        <ScanDetailModal scan={selectedScan} onClose={() => setSelectedScan(null)} />
      )}
    </div>
  );
}
