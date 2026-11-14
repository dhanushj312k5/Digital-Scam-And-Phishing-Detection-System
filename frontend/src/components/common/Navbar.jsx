import React from 'react';
import { Shield, Sparkles, Menu, Activity, ArrowRight, RefreshCw } from 'lucide-react';
import { useScans } from '../../context/ScanContext';
import { NAVIGATION_ITEMS } from '../../utils/constants';

export default function Navbar({
  currentTab,
  onSelectTab,
  onToggleSidebar,
  onQuickScan
}) {
  const { backendStatus, checkBackend } = useScans();

  return (
    <header className="top-navbar">
      <div className="top-navbar-container">
        {/* Brand Logo on Left */}
        <div className="top-nav-brand" onClick={() => onSelectTab('dashboard')} style={{ cursor: 'pointer' }}>
          <div className="brand-badge-icon">
            <Shield size={18} />
          </div>
          <span className="brand-logo-text">ZEROX AI</span>
        </div>

        {/* Center Nav Links (Desktop) */}
        <nav className="top-nav-links">
          {NAVIGATION_ITEMS.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`top-nav-link ${isActive ? 'active' : ''}`}
              >
                <span>{item.label}</span>
                {isActive && <span className="active-dot-indicator"></span>}
              </button>
            );
          })}
        </nav>

        {/* Right CTA Actions */}
        <div className="top-nav-actions">
          {/* Status Indicator */}
          <div
            className="top-status-indicator"
            onClick={checkBackend}
            title={
              backendStatus.connected
                ? backendStatus.geminiConfigured
                  ? 'Connected to Flask Backend with Google Gemini AI'
                  : 'Connected to Flask Backend with Heuristic NLP Engine'
                : 'Backend offline - Running Demonstration Engine'
            }
          >
            <span
              className={`status-pulse-dot ${
                backendStatus.connected ? 'online' : 'demo'
              }`}
            />
            <span className="status-label-text">
              {backendStatus.connected
                ? backendStatus.geminiConfigured
                  ? 'Gemini Active'
                  : 'Heuristic Engine'
                : 'Demo Engine'}
            </span>
            <RefreshCw
              size={11}
              className={backendStatus.checking ? 'spin' : ''}
              style={{ opacity: 0.6 }}
            />
          </div>

          {/* Red Pill Action Button */}
          <button
            className="btn-red-pill"
            onClick={onQuickScan}
          >
            <span>Scan Threat</span>
            <ArrowRight size={14} />
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            className="mobile-hamburger-btn"
            onClick={onToggleSidebar}
            aria-label="Open Navigation Menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
