import React from 'react';

export default function RiskMeter({ score = 0, size = 120, strokeWidth = 10, showLabel = true }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  const offset = circumference - (safeScore / 100) * circumference;

  let color = 'var(--threat-safe)';
  let glowColor = 'rgba(16, 185, 129, 0.4)';
  let label = 'SAFE';

  if (safeScore >= 80) {
    color = 'var(--threat-critical)';
    glowColor = 'rgba(255, 42, 85, 0.6)';
    label = 'CRITICAL';
  } else if (safeScore >= 60) {
    color = 'var(--threat-high)';
    glowColor = 'rgba(249, 115, 22, 0.5)';
    label = 'HIGH';
  } else if (safeScore >= 35) {
    color = 'var(--threat-medium)';
    glowColor = 'rgba(245, 158, 11, 0.5)';
    label = 'MEDIUM';
  } else if (safeScore >= 15) {
    color = 'var(--threat-low)';
    glowColor = 'rgba(56, 189, 248, 0.4)';
    label = 'LOW';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--bg-tertiary)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.4s ease',
              filter: `drop-shadow(0 0 10px ${glowColor})`,
            }}
          />
        </svg>

        {/* Center content */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: size * 0.26, fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
            {safeScore}
          </span>
          <span style={{ fontSize: size * 0.1, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Score
          </span>
        </div>
      </div>

      {showLabel && (
        <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.5px',
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-sm)',
              color: color,
              background: `rgba(${color === 'var(--threat-critical)' ? '255, 42, 85' : '16, 185, 129'}, 0.12)`,
              border: `1px solid ${color}`,
            }}
          >
            {label}
          </span>
        </div>
      )}
    </div>
  );
}
