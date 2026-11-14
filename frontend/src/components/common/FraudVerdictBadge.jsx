import React from 'react';
import { ShieldAlert, ShieldCheck, AlertCircle, HelpCircle } from 'lucide-react';

export function normalizeVerdict(verdict, riskScore = 0) {
  if (!verdict) {
    const score = Number(riskScore) || 0;
    if (score >= 65) return 'FRAUD_DETECTED';
    if (score < 30) return 'NO_FRAUD_DETECTED';
    return 'NEEDS_REVIEW';
  }
  const v = String(verdict).toUpperCase().replace(/\s+/g, '_');
  if (v.includes('NO_FRAUD') || v.includes('CLEAN') || v.includes('SAFE')) {
    return 'NO_FRAUD_DETECTED';
  }
  if (v.includes('FRAUD') && !v.includes('NO')) {
    return 'FRAUD_DETECTED';
  }
  return 'NEEDS_REVIEW';
}

const VERDICT_CONFIG = {
  FRAUD_DETECTED: {
    label: 'FRAUD DETECTED',
    shortLabel: 'Fraud Detected',
    className: 'verdict-fraud',
    color: 'var(--accent-red)',
    bg: 'rgba(255, 42, 85, 0.12)',
    border: 'rgba(255, 42, 85, 0.35)',
    description: 'Strong fraud or phishing indicators found.',
    icon: ShieldAlert,
  },
  NO_FRAUD_DETECTED: {
    label: 'NO FRAUD INDICATORS DETECTED',
    shortLabel: 'No Fraud',
    className: 'verdict-safe',
    color: 'var(--threat-safe)',
    bg: 'rgba(0, 229, 163, 0.10)',
    border: 'rgba(0, 229, 163, 0.30)',
    description: 'No significant indicators found in this scan. This does not guarantee safety.',
    icon: ShieldCheck,
  },
  NEEDS_REVIEW: {
    label: 'NEEDS REVIEW',
    shortLabel: 'Needs Review',
    className: 'verdict-review',
    color: 'var(--threat-medium)',
    bg: 'rgba(255, 170, 0, 0.12)',
    border: 'rgba(255, 170, 0, 0.35)',
    description: 'The result is uncertain and requires manual verification.',
    icon: AlertCircle,
  },
};

export default function FraudVerdictBadge({
  verdict,
  riskScore = 0,
  confidence = null,
  size = 'compact', // 'banner' | 'large' | 'compact' | 'pill'
  showDescription = false,
  className = '',
}) {
  const normVerdict = normalizeVerdict(verdict, riskScore);
  const config = VERDICT_CONFIG[normVerdict] || VERDICT_CONFIG.NEEDS_REVIEW;
  const Icon = config.icon;

  const confVal = typeof confidence === 'number'
    ? (confidence <= 1.0 ? Math.round(confidence * 100) : Math.round(confidence))
    : null;

  // Prominent banner mode for top of scanner results panel
  if (size === 'banner') {
    return (
      <div className={`fraud-verdict-banner ${config.className} ${className}`}>
        <div className="verdict-banner-header">
          <div className="verdict-icon-glow">
            <Icon size={24} color={config.color} />
          </div>
          <div className="verdict-banner-meta">
            <span className="verdict-sublabel">ZEROX FRAUD VERDICT</span>
            <h3 className="verdict-headline" style={{ color: config.color }}>
              {config.label}
            </h3>
          </div>
          {confVal !== null && (
            <div className="verdict-confidence-badge" title="Algorithm & AI forensic corroboration confidence">
              <span className="conf-label">Confidence</span>
              <span className="conf-value">{confVal}%</span>
            </div>
          )}
        </div>
        <p className="verdict-banner-description">
          {config.description}
        </p>
      </div>
    );
  }

  // Compact / table pill mode
  return (
    <div
      className={`fraud-verdict-pill ${config.className} size-${size} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: size === 'pill' ? '0.2rem 0.6rem' : '0.3rem 0.75rem',
        borderRadius: '999px',
        background: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color,
        fontSize: size === 'pill' ? '0.72rem' : '0.78rem',
        fontWeight: 700,
        letterSpacing: '0.4px',
      }}
      title={config.description}
    >
      <Icon size={size === 'pill' ? 12 : 14} />
      <span>{size === 'pill' ? config.shortLabel : config.label}</span>
      {confVal !== null && size !== 'pill' && (
        <span style={{ opacity: 0.75, fontSize: '0.7rem', fontWeight: 500 }}>
          ({confVal}%)
        </span>
      )}
    </div>
  );
}
