export const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { id: 'message-scanner', label: 'Message Scanner', icon: 'MessageSquareWarning' },
  { id: 'url-scanner', label: 'URL Scanner', icon: 'Globe' },
  { id: 'qr-scanner', label: 'QR Code Scanner', icon: 'QrCode' },
  { id: 'social-scanner', label: 'Social Media Scanner', icon: 'Users' },
  { id: 'scan-history', label: 'Scan History', icon: 'History' },
  { id: 'security-center', label: 'Security Center', icon: 'ShieldAlert' },
  { id: 'settings', label: 'Settings', icon: 'Settings' },
];

export const THREAT_LEVELS = {
  SAFE: { label: 'Safe', color: 'var(--threat-safe)', badgeClass: 'threat-safe' },
  LOW: { label: 'Low Risk', color: 'var(--threat-low)', badgeClass: 'threat-low' },
  MEDIUM: { label: 'Suspicious', color: 'var(--threat-medium)', badgeClass: 'threat-medium' },
  HIGH: { label: 'High Risk', color: 'var(--threat-high)', badgeClass: 'threat-high' },
  CRITICAL: { label: 'Critical Threat', color: 'var(--threat-critical)', badgeClass: 'threat-critical' },
};
