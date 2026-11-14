import React from 'react';
import { X, ShieldAlert, CheckCircle, AlertTriangle, Copy, Check } from 'lucide-react';
import RiskBadge from './RiskBadge';
import RiskMeter from './RiskMeter';
import FraudVerdictBadge from './FraudVerdictBadge';

export default function ScanDetailModal({ scan, onClose }) {
  const [copied, setCopied] = React.useState(false);

  if (!scan) return null;

  const handleCopy = () => {
    const report = `ZEROX AI SCAN REPORT\nTarget: ${scan.target_content}\nVerdict: ${scan.fraud_verdict || 'ANALYZED'}\nThreat Level: ${scan.threat_level}\nRisk Score: ${scan.risk_score}/100\nSummary: ${scan.summary}\nDate: ${new Date(scan.created_at).toLocaleString()}`;
    navigator.clipboard?.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="logo-icon" style={{ width: 32, height: 32 }}>
              <ShieldAlert size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                Scan Threat Analysis
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                ID: {scan.id} • {new Date(scan.created_at).toLocaleString()}
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {scan.isDemo && (
            <div className="demo-banner">
              <span>⚠️ Demonstration Scan Record (Sample Data)</span>
            </div>
          )}

          {/* Prominent Fraud Verdict */}
          <FraudVerdictBadge
            verdict={scan.fraud_verdict}
            riskScore={scan.risk_score}
            confidence={scan.confidence_score}
            size="banner"
          />

          {/* Security Warning Notice if available */}
          {scan.analysis_details?.security_warning && (
            <div
              className={`qr-security-warning-box ${
                scan.analysis_details.security_warning.severity === 'DANGER' ? 'warning-danger' : 'warning-safe'
              }`}
              style={{ margin: '0.75rem 0 1rem' }}
            >
              <div className="warning-box-header">
                {scan.analysis_details.security_warning.severity === 'DANGER' ? (
                  <ShieldAlert size={20} color="var(--accent-red)" />
                ) : (
                  <CheckCircle size={20} color="var(--threat-safe)" />
                )}
                <div>
                  <h4 className="warning-box-title" style={{ fontSize: '0.9rem', margin: '0 0 0.25rem' }}>
                    {scan.analysis_details.security_warning.severity === 'DANGER'
                      ? 'SECURITY WARNING: VERIFICATION REQUIRED'
                      : 'AUDIT ADVISORY'}
                  </h4>
                  <div className="warning-box-text" style={{ fontSize: '0.82rem' }}>
                    {scan.analysis_details.security_warning.message}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Top Score Summary */}
          <div className="modal-score-card">
            <RiskMeter score={scan.risk_score} size={110} strokeWidth={9} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Classification
                </span>
                <RiskBadge level={scan.threat_level} />
              </div>
              <p style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                {scan.summary || 'No summary available.'}
              </p>
              {scan.categories && scan.categories.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.75rem' }}>
                  {scan.categories.map((c, i) => (
                    <span key={i} className="category-tag">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Target Content */}
          <div className="modal-section">
            <div className="section-label">Inspected Content ({scan.scan_type?.toUpperCase()})</div>
            <div className="content-box">
              <code>{scan.target_content}</code>
            </div>
          </div>

          {/* Indicators */}
          {scan.flagged_indicators && scan.flagged_indicators.length > 0 && (
            <div className="modal-section">
              <div className="section-label" style={{ color: 'var(--threat-high)' }}>
                Flagged Red Flags & Threat Signals
              </div>
              <ul className="indicators-list">
                {scan.flagged_indicators.map((ind, i) => (
                  <li key={i}>
                    <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '0.2rem', color: 'var(--threat-high)' }} />
                    <span>{ind}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {scan.recommendations && scan.recommendations.length > 0 && (
            <div className="modal-section">
              <div className="section-label" style={{ color: 'var(--threat-safe)' }}>
                Safety Recommendations
              </div>
              <ul className="indicators-list">
                {scan.recommendations.map((rec, i) => (
                  <li key={i}>
                    <CheckCircle size={15} style={{ flexShrink: 0, marginTop: '0.2rem', color: 'var(--threat-safe)' }} />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Mandatory Disclaimer for Social Scans */}
          {(scan.analysis_details?.disclaimer || ['social', 'social_media'].includes(String(scan.scan_type || '').toLowerCase())) && (
            <div className="mandatory-social-disclaimer" style={{ margin: '1rem 0' }}>
              <div className="disclaimer-header">
                <AlertTriangle size={15} color="var(--text-secondary)" />
                <span>MANDATORY SYSTEM ADVISORY</span>
              </div>
              <p className="disclaimer-text" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
                {scan.analysis_details?.disclaimer || 'ZEROX AI analyzes the information provided and identifies suspicious indicators. It does not independently verify account ownership or guarantee that an account is genuine.'}
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleCopy}>
            {copied ? <Check size={16} color="var(--threat-safe)" /> : <Copy size={16} />}
            <span>{copied ? 'Report Copied' : 'Copy Report'}</span>
          </button>
          <button className="btn-primary" onClick={onClose}>
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
}
