import React from 'react';
import { ShieldAlert, AlertTriangle, ShieldCheck, AlertCircle, Info } from 'lucide-react';
import { THREAT_LEVELS } from '../../utils/constants';

const icons = {
  CRITICAL: ShieldAlert,
  HIGH: AlertTriangle,
  MEDIUM: AlertCircle,
  LOW: Info,
  SAFE: ShieldCheck,
};

export default function RiskBadge({ level = 'SAFE', size = 'normal' }) {
  const normalized = (level || 'SAFE').toUpperCase();
  const config = THREAT_LEVELS[normalized] || THREAT_LEVELS.SAFE;
  const IconComponent = icons[normalized] || ShieldCheck;

  return (
    <span className={`threat-badge ${config.badgeClass} ${size === 'large' ? 'badge-lg' : ''}`}>
      <IconComponent size={size === 'large' ? 14 : 12} />
      <span>{config.label}</span>
    </span>
  );
}
