import React from 'react';
import { X, MessageSquareWarning, Globe, QrCode, Users, ArrowRight } from 'lucide-react';

export default function QuickScanModal({ isOpen, onClose, onNavigate }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content quick-scan-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Choose Scan Vector</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            className="quick-card"
            onClick={() => {
              onNavigate('message-scanner');
              onClose();
            }}
          >
            <div className="quick-card-icon" style={{ color: 'var(--accent-cyan)' }}>
              <MessageSquareWarning size={28} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Message Scam Scanner
              </h4>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Analyze SMS, WhatsApp, Telegram, or email copy for urgency triggers and fraud patterns.
              </p>
            </div>
            <ArrowRight size={18} color="var(--accent-cyan)" />
          </div>

          <div
            className="quick-card"
            onClick={() => {
              onNavigate('url-scanner');
              onClose();
            }}
          >
            <div className="quick-card-icon" style={{ color: 'var(--accent-blue)' }}>
              <Globe size={28} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                URL Threat & Phishing Scanner
              </h4>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Inspect suspicious web links, typosquatting domains, and credential harvesting sites.
              </p>
            </div>
            <ArrowRight size={18} color="var(--accent-blue)" />
          </div>

          <div
            className="quick-card qr-card"
            onClick={() => {
              onNavigate('qr-scanner');
              onClose();
            }}
          >
            <div className="quick-card-icon" style={{ color: '#a855f7' }}>
              <QrCode size={28} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                QR Code Scam Scanner
              </h4>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Upload or scan a QR code to detect malicious links, fake payment requests, UPI scams, and suspicious payment information before proceeding.
              </p>
            </div>
            <ArrowRight size={18} color="#a855f7" />
          </div>

          <div
            className="quick-card social-card"
            onClick={() => {
              onNavigate('social-scanner');
              onClose();
            }}
          >
            <div className="quick-card-icon" style={{ color: '#ec4899' }}>
              <Users size={28} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Social Media Scam Scanner
              </h4>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Detect suspicious social media profiles, impersonation attempts, fake accounts, phishing links, and social engineering scams.
              </p>
            </div>
            <ArrowRight size={18} color="#ec4899" />
          </div>
        </div>
      </div>
    </div>
  );
}
