import React from 'react';
import {
  Shield,
  LayoutDashboard,
  MessageSquareWarning,
  Globe,
  QrCode,
  Users,
  History,
  ShieldAlert,
  Settings,
  X,
  Radio,
  ArrowRight
} from 'lucide-react';
import { useScans } from '../../context/ScanContext';

const iconMap = {
  LayoutDashboard,
  MessageSquareWarning,
  Globe,
  QrCode,
  Users,
  History,
  ShieldAlert,
  Settings,
};

export default function Sidebar({
  currentTab,
  onSelectTab,
  navigationItems,
  isOpen,
  onClose
}) {
  const { stats, backendStatus } = useScans();

  const handleTabClick = (tabId) => {
    onSelectTab(tabId);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop */}
      <div className="sidebar-backdrop" onClick={onClose} />

      <aside className="mobile-drawer open">
        <div className="mobile-drawer-header">
          <div className="brand-group">
            <div className="brand-badge-icon">
              <Shield size={18} />
            </div>
            <span className="brand-logo-text">ZEROX AI</span>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <nav className="mobile-drawer-nav">
          <div className="drawer-section-label">PLATFORM NAVIGATION</div>
          {navigationItems.map((item) => {
            const IconComponent = iconMap[item.icon] || Shield;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`drawer-nav-item ${isActive ? 'active' : ''}`}
              >
                <IconComponent size={18} />
                <span>{item.label}</span>
                {isActive && <span className="drawer-active-pill">Active</span>}
              </button>
            );
          })}
        </nav>

        <div className="mobile-drawer-footer">
          <div className="drawer-status-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Radio size={13} color={backendStatus.connected ? 'var(--threat-safe)' : 'var(--accent-red)'} />
              <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                {backendStatus.connected
                  ? backendStatus.geminiConfigured
                    ? 'Gemini 2.5 Live'
                    : 'Heuristic Engine (Live)'
                  : 'Demo Engine (Offline)'}
              </span>
            </div>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
            ZEROX AI • Next-Gen Scam Defense
          </div>
        </div>
      </aside>
    </>
  );
}
