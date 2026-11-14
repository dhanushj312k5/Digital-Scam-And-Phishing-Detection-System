import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  Lock,
  Globe,
  Smartphone,
  Mail,
  Zap,
  Radio
} from 'lucide-react';
import { zeroxApi } from '../services/api';
import { useScans } from '../context/ScanContext';

const DEFENSE_CHECKLIST = [
  { id: '2fa', label: 'Enable App-Based Multi-Factor Authentication (TOTP)', category: 'Account Security' },
  { id: 'url-inspect', label: 'Always manually verify address bar domains before entering passwords', category: 'Browsing Safety' },
  { id: 'otp-privacy', label: 'Never disclose one-time SMS verification passcodes over the phone', category: 'Anti-Smishing' },
  { id: 'dmarc', label: 'Verify sender email headers for SPF/DKIM/DMARC alignment', category: 'Email Defense' },
  { id: 'qr-safety', label: 'Inspect physical QR payment codes for tampering and sticker overlays', category: 'Quishing Defense' },
  { id: 'zerox-scan', label: 'Run suspicious links & urgent messages through ZEROX AI before opening', category: 'Proactive Auditing' },
];

const ATTACK_VECTORS = [
  {
    title: 'Smishing (SMS Phishing)',
    severity: 'SURGING',
    severityColor: 'var(--threat-critical)',
    icon: Smartphone,
    description: 'Fraudulent SMS messages disguised as banks, delivery couriers, or government agencies creating fake urgency to steal credentials.',
    countermeasure: 'Never click links inside unverified SMS. Check official bank apps or call the verified number on the back of your card.'
  },
  {
    title: 'Typosquatting & Homoglyph Spoofing',
    severity: 'HIGH RISK',
    severityColor: 'var(--threat-high)',
    icon: Globe,
    description: 'Deceptive lookalike domains registering subtle typos (e.g. paypa1.com, amzon.co) or Cyrillic characters to trick victims into trusting fake login portals.',
    countermeasure: 'Bookmark official financial login portals. Utilize password managers that automatically refuse to auto-fill on spoofed domains.'
  },
  {
    title: 'Quishing (QR Code Phishing)',
    severity: 'EMERGING',
    severityColor: 'var(--threat-medium)',
    icon: Zap,
    description: 'Malicious QR codes placed on physical parking meters, restaurants, or embedded in emails that bypass email link scanners and route to credential harvesters.',
    countermeasure: 'Preview the URL before opening any scanned QR code. Avoid scanning unsolicited QR codes sent via email.'
  },
  {
    title: 'Task & Fake Job Recruitment Scams',
    severity: 'WIDESPREAD',
    severityColor: 'var(--threat-high)',
    icon: Mail,
    description: 'WhatsApp and Telegram messages promising high pay for simple online actions, eventually demanding upfront crypto deposits to release "earnings".',
    countermeasure: 'Legitimate employers will never ask for registration fees or conduct formal hiring exclusively over anonymous messaging channels.'
  },
];

export default function SecurityCenter() {
  const { backendStatus } = useScans();
  const [threatIntel, setThreatIntel] = useState([]);
  const [checkedItems, setCheckedItems] = useState({
    '2fa': true,
    'url-inspect': true,
    'zerox-scan': true,
  });

  useEffect(() => {
    let isMounted = true;
    async function loadIntel() {
      try {
        const intel = await zeroxApi.getThreatIntel();
        if (isMounted && Array.isArray(intel)) {
          setThreatIntel(intel);
        }
      } catch (err) {
        console.warn('Backend threat intel unavailable:', err);
      }
    }
    loadIntel();
    return () => { isMounted = false; };
  }, [backendStatus.connected]);

  const toggleCheck = (id) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const completedCount = Object.values(checkedItems).filter(Boolean).length;
  const readinessScore = Math.round((completedCount / DEFENSE_CHECKLIST.length) * 100);

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-title">ZEROX Security Center</h1>
        <p className="page-subtitle">
          Cyber threat advisories, scam tactics encyclopedia, and actionable defense readiness protocols.
        </p>
      </div>

      {/* Defense Readiness Score Banner */}
      <div className="card readiness-banner">
        <div className="readiness-score-group">
          <div className="readiness-circle">
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-red)' }}>
              {readinessScore}%
            </span>
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Personal Defense Readiness Score</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {readinessScore >= 80
                ? 'Strong protection posture: Your defense hygiene covers major scam entry vectors.'
                : 'Action required: Complete the defense checklist below to harden your attack surface.'}
            </p>
          </div>
        </div>

        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${readinessScore}%` }} />
        </div>
      </div>

      <div className="security-center-grid">
        {/* Defense Checklist */}
        <div className="card">
          <div className="panel-title-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={18} color="var(--accent-red)" />
              <span style={{ fontWeight: 600 }}>Security Best Practices Checklist</span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {completedCount} of {DEFENSE_CHECKLIST.length} completed
            </span>
          </div>

          <div className="checklist-container">
            {DEFENSE_CHECKLIST.map((item) => {
              const isDone = Boolean(checkedItems[item.id]);
              return (
                <div
                  key={item.id}
                  className={`checklist-item ${isDone ? 'completed' : ''}`}
                  onClick={() => toggleCheck(item.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className={`checkbox-custom ${isDone ? 'checked' : ''}`}>
                    {isDone && <CheckCircle size={14} color="#07080b" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="checklist-label">{item.label}</div>
                    <div className="checklist-category">{item.category}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Emergency Response Guide */}
        <div className="card emergency-card">
          <div className="panel-title-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} color="var(--threat-high)" />
              <span style={{ fontWeight: 600 }}>Emergency Protocol: Clicked a Suspicious Link?</span>
            </div>
          </div>

          <div className="emergency-steps">
            <div className="step-item">
              <span className="step-num">1</span>
              <div>
                <strong>Disconnect / Close Immediately:</strong> Close the browser tab. If you downloaded a file, do not execute it.
              </div>
            </div>
            <div className="step-item">
              <span className="step-num">2</span>
              <div>
                <strong>Change Passwords:</strong> If credentials were entered, immediately reset your password on the official website.
              </div>
            </div>
            <div className="step-item">
              <span className="step-num">3</span>
              <div>
                <strong>Freeze Card / Alert Bank:</strong> If financial or banking details were compromised, immediately lock your cards via the mobile banking app.
              </div>
            </div>
            <div className="step-item">
              <span className="step-num">4</span>
              <div>
                <strong>Report Incident:</strong> Log the deceptive URL or SMS sender on your national cyber crime reporting hotline.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Threat Intelligence Feed from Backend */}
      {threatIntel && threatIntel.length > 0 && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <div className="panel-title-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Radio size={18} color="var(--accent-red)" />
              <span style={{ fontWeight: 600 }}>Active Threat Intelligence Advisories (Live Stream)</span>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--threat-safe)', fontWeight: 600 }}>● Live Telemetry</span>
          </div>
          <div className="vector-grid">
            {threatIntel.map((item) => (
              <div key={item.id} className="vector-card">
                <div className="vector-header">
                  <div className="vector-icon">
                    <ShieldAlert size={20} color="var(--accent-red)" />
                  </div>
                  <span
                    className="vector-severity-badge"
                    style={{ color: item.threat_level === 'CRITICAL' ? 'var(--threat-critical)' : 'var(--threat-high)' }}
                  >
                    {item.trend} • {item.threat_level}
                  </span>
                </div>
                <h4 className="vector-title">{item.type}</h4>
                <p className="vector-desc">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attack Vectors Encyclopedia */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="panel-title-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={18} color="var(--accent-red)" />
            <span style={{ fontWeight: 600 }}>Online Scam Threat Vectors & Countermeasures</span>
          </div>
        </div>

        <div className="vector-grid">
          {ATTACK_VECTORS.map((vec, idx) => {
            const Icon = vec.icon;
            return (
              <div key={idx} className="vector-card">
                <div className="vector-header">
                  <div className="vector-icon">
                    <Icon size={20} />
                  </div>
                  <span
                    className="vector-severity-badge"
                    style={{ color: vec.severityColor, borderColor: vec.severityColor }}
                  >
                    {vec.severity}
                  </span>
                </div>
                <h4 className="vector-title">{vec.title}</h4>
                <p className="vector-desc">{vec.description}</p>
                <div className="vector-countermeasure">
                  <strong>Countermeasure:</strong> {vec.countermeasure}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
