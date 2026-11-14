import React, { useState } from 'react';
import { ScanProvider } from './context/ScanContext';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import Dashboard from './pages/Dashboard';
import MessageScanner from './pages/MessageScanner';
import UrlScanner from './pages/UrlScanner';
import QrScanner from './pages/QrScanner';
import SocialScanner from './pages/SocialScanner';
import ScanHistory from './pages/ScanHistory';
import SecurityCenter from './pages/SecurityCenter';
import Settings from './pages/Settings';
import QuickScanModal from './components/common/QuickScanModal';
import FloatingChatBot from './components/common/FloatingChatBot';
import { NAVIGATION_ITEMS } from './utils/constants';
import './App.css';

function AppContent() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [quickScanOpen, setQuickScanOpen] = useState(false);

  const handleNavigate = (tabId) => {
    setCurrentTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderCurrentPage = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'message-scanner':
        return <MessageScanner />;
      case 'url-scanner':
        return <UrlScanner />;
      case 'qr-scanner':
        return <QrScanner />;
      case 'social-scanner':
        return <SocialScanner />;
      case 'scan-history':
        return <ScanHistory />;
      case 'security-center':
        return <SecurityCenter />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="nexora-app-layout">
      {/* Top Navigation Bar matching the design */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleNavigate}
        onToggleSidebar={() => setMobileDrawerOpen(true)}
        onQuickScan={() => setQuickScanOpen(true)}
      />

      {/* Mobile Drawer (visible on mobile when toggled) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleNavigate}
        navigationItems={NAVIGATION_ITEMS}
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      {/* Main Page Body */}
      <main className="nexora-main-viewport">
        {renderCurrentPage()}
      </main>

      {/* Footer */}
      <footer className="nexora-site-footer">
        <div className="footer-inner">
          <div className="footer-left">
            <span className="brand-logo-text" style={{ fontSize: '1rem' }}>ZEROX AI</span>
            <span className="footer-copyright">© 2026 ZEROX AI Security Labs. Powered by Google Gemini 2.5.</span>
          </div>
          <div className="footer-links">
            <button onClick={() => handleNavigate('dashboard')}>Platform</button>
            <button onClick={() => handleNavigate('message-scanner')}>Message Defense</button>
            <button onClick={() => handleNavigate('url-scanner')}>URL Scanner</button>
            <button onClick={() => handleNavigate('qr-scanner')}>QR Code Defense</button>
            <button onClick={() => handleNavigate('social-scanner')}>Social Defense</button>
            <button onClick={() => handleNavigate('security-center')}>Advisories</button>
            <button onClick={() => handleNavigate('settings')}>AI Settings</button>
          </div>
        </div>
      </footer>

      {/* Quick Scan Modal */}
      <QuickScanModal
        isOpen={quickScanOpen}
        onClose={() => setQuickScanOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* Global AI Cybersecurity Chat Assistant */}
      <FloatingChatBot />
    </div>
  );
}

export default function App() {
  return (
    <ScanProvider>
      <AppContent />
    </ScanProvider>
  );
}
