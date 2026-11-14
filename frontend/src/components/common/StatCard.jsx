import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  color = 'var(--accent-cyan)',
  trend = null, // e.g. { direction: 'up', label: '+12%' }
}) {
  return (
    <div className="card stat-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="stat-label">
          {label}
        </span>
        {Icon && (
          <div
            className="stat-icon-wrapper"
            style={{
              color: color,
              background: `rgba(${color.includes('threat-critical') ? '239, 68, 68' : color.includes('threat-safe') ? '16, 185, 129' : '6, 182, 212'}, 0.12)`,
              border: `1px solid rgba(255, 255, 255, 0.08)`,
            }}
          >
            <Icon size={19} />
          </div>
        )}
      </div>

      <div className="stat-value">
        {value}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
        {trend && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: trend.direction === 'up' ? 'var(--threat-critical)' : 'var(--threat-safe)',
            }}
          >
            {trend.direction === 'up' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {trend.label}
          </span>
        )}
        {subtext && (
          <span className="stat-subtext">
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
}
