import React, { createContext, useContext, useState, useEffect } from 'react';
import { zeroxApi } from '../services/api';

// Curated initial demonstration scan items clearly marked
const INITIAL_DEMO_SCANS = [
  {
    id: 'demo-1',
    scan_type: 'message',
    target_content: 'Dear customer, your State Bank account has been blocked due to pending KYC. Click here immediately to update PAN details: http://sbi-kyc-update.top or services will be halted.',
    threat_level: 'CRITICAL',
    risk_score: 94,
    fraud_verdict: 'FRAUD_DETECTED',
    confidence_score: 0.96,
    categories: ['Banking Phishing', 'Urgency Manipulation', 'Credential Theft'],
    summary: 'High-severity smishing attack impersonating official bank with coercive account suspension threats.',
    flagged_indicators: [
      'Deceptive top-level domain (.top) mimicking financial authority',
      'Artificial deadline pressure intended to bypass critical thinking',
      'Solicitation of sensitive identification numbers (PAN / OTP)'
    ],
    recommendations: [
      'Do not click the embedded hyperlink.',
      'Report the sender phone number to national cyber-crime portal.',
      'Check official banking portal directly to confirm status.'
    ],
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    isDemo: true
  },
  {
    id: 'demo-2',
    scan_type: 'url',
    target_content: 'https://security-verify-paypa1.co/login',
    threat_level: 'CRITICAL',
    risk_score: 96,
    fraud_verdict: 'FRAUD_DETECTED',
    confidence_score: 0.98,
    categories: ['Phishing', 'Typosquatting', 'Brand Impersonation'],
    summary: 'Deceptive lookalike domain using numeral "1" in place of letter "l" targeting PayPal credentials.',
    flagged_indicators: [
      'Typosquatting variation of protected trademark domain (paypa1.co)',
      'Hidden WHOIS privacy proxy concealing registrar identity',
      'Credential input form hosted on unauthorized origin'
    ],
    recommendations: [
      'Immediately close the browser tab.',
      'Report domain to anti-phishing workgroups.',
      'Do not submit login credentials.'
    ],
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    isDemo: true
  },
  {
    id: 'demo-3',
    scan_type: 'message',
    target_content: 'Your Google Account verification code is 849201. Never share this code with anyone. Google will never call or text asking for this code.',
    threat_level: 'SAFE',
    risk_score: 3,
    fraud_verdict: 'NO_FRAUD_DETECTED',
    confidence_score: 0.96,
    categories: ['Legitimate Authentication'],
    summary: 'Standard automated two-factor authentication notification without deceptive anomalies.',
    flagged_indicators: [
      'Standard shortcode delivery',
      'Explicit warning not to disclose security code'
    ],
    recommendations: [
      'Safe to proceed if you initiated this login request.',
      'If you did not request this OTP, change account password immediately.'
    ],
    created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    isDemo: true
  },
  {
    id: 'demo-4',
    scan_type: 'url',
    target_content: 'https://github.com/security/advisories',
    threat_level: 'SAFE',
    risk_score: 0,
    fraud_verdict: 'NO_FRAUD_DETECTED',
    confidence_score: 0.98,
    categories: ['Verified Developer Resource'],
    summary: 'Legitimate authenticated platform host with valid extended EV/OV certificate authority.',
    flagged_indicators: [
      'Verified domain ownership and valid SSL/TLS certificate',
      'No domain name obfuscation or spoofing tactics detected'
    ],
    recommendations: [
      'Domain is secure and authenticated.'
    ],
    created_at: new Date(Date.now() - 1000 * 60 * 380).toISOString(),
    isDemo: true
  },
  {
    id: 'demo-5',
    scan_type: 'message',
    target_content: 'Congratulations! You have been chosen for part-time remote video reviewer job. Earn $300-$800 daily by liking YouTube videos. Telegram @RecruitTeamGlobal to start today!',
    threat_level: 'HIGH',
    risk_score: 88,
    fraud_verdict: 'FRAUD_DETECTED',
    confidence_score: 0.92,
    categories: ['Task Scam', 'Advance Fee Fraud', 'Unsolicited Recruitment'],
    summary: 'Typical task scam enticing victims with unrealistic daily compensation to siphon registration fees.',
    flagged_indicators: [
      'Unsolicited employment proposition from unknown sender',
      'Redirection to unverified Telegram handle',
      'Disproportionate reward promised for trivial tasks'
    ],
    recommendations: [
      'Do not engage with the recruiter or join Telegram channels.',
      'Never transfer upfront deposit or verification fees for employment.'
    ],
    created_at: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
    isDemo: true
  },
  {
    id: 'demo-6',
    scan_type: 'qr_code',
    target_content: 'UPI: refu***@okhdfcbank | ₹4999.00 | SBI_Helpdesk',
    threat_level: 'CRITICAL',
    risk_score: 95,
    fraud_verdict: 'FRAUD_DETECTED',
    confidence_score: 0.98,
    categories: ['Reverse Payment Scam', 'Brand Impersonation', 'Social Engineering'],
    summary: 'High-risk reverse UPI payment scam attempting to deceive victim into authorizing a ₹4,999 debit under the guise of an account refund.',
    flagged_indicators: [
      'Reverse Payment Scam: Transaction note solicits QR scan to receive refund (UPI scanning only debits money)',
      'Impersonation of banking authority (SBI_Helpdesk) linked to personal HDFC VPA',
      'Pre-authorized payment debit of ₹4,999.00'
    ],
    recommendations: [
      'DO NOT scan with your UPI payment application or enter your UPI PIN.',
      'Remember: You NEVER need to enter your UPI PIN to receive money or refunds.',
      'Report the fraudulent VPA to your bank and national cyber crime authorities.'
    ],
    analysis_details: {
      content_type: 'UPI_PAYMENT',
      decoded_text: 'upi://pay?pa=refund-desk@okhdfcbank&pn=SBI_Helpdesk&am=4999.00&tn=Scan+to+receive+Rs+4999+refund',
      extracted_fields: {
        pa: 'refund-desk@okhdfcbank',
        pn: 'SBI_Helpdesk',
        am: '4999.00',
        cu: 'INR',
        tn: 'Scan to receive Rs 4999 refund'
      },
      security_warning: {
        severity: 'DANGER',
        message: 'WARNING: This QR code may lead to a fraudulent destination or suspicious payment request. Do not proceed unless you have independently verified the destination and recipient.'
      }
    },
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    isDemo: true
  },
  {
    id: 'demo-7',
    scan_type: 'social_media',
    target_content: '[Instagram] @elonmusk_official_giveaway_2026',
    threat_level: 'CRITICAL',
    risk_score: 98,
    fraud_verdict: 'FRAUD_DETECTED',
    confidence_score: 0.98,
    categories: ['Brand Impersonation', 'Fake Giveaway', 'Advance Fee Fraud'],
    summary: 'High-risk Instagram impersonation profile advertising a fraudulent Bitcoin airdrop.',
    flagged_indicators: [
      'Impersonation Handle Pattern: Combining celebrity name with authority tags ("official", "giveaway")',
      'Crypto Airdrop Bait: DM promises 0.5 free BTC in exchange for an upfront gas fee deposit',
      'Phishing Link: Directs followers to unverified third-party crypto wallet extraction portal'
    ],
    recommendations: [
      'Do not send cryptocurrency, gas fees, or connect your Web3 wallet.',
      'Report profile directly to Instagram Trust & Safety for impersonation.',
      'Verify official communications solely via verified corporate channels.'
    ],
    analysis_details: {
      platform: 'Instagram',
      username: 'elonmusk_official_giveaway_2026',
      display_name: 'Elon Musk Official',
      account_assessment: 'Celebrity / Brand Impersonator',
      disclaimer: 'ZEROX AI analyzes the information provided and identifies suspicious indicators. It does not independently verify account ownership or guarantee that an account is genuine.'
    },
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    isDemo: true
  }
];

const ScanContext = createContext(null);

export function ScanProvider({ children }) {
  const [scans, setScans] = useState(() => {
    try {
      const stored = localStorage.getItem('zerox_scan_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_DEMO_SCANS;
  });

  const [backendStatus, setBackendStatus] = useState({
    checking: true,
    connected: false,
    geminiConfigured: false,
    details: null,
    lastChecked: null,
  });

  const [settings, setSettings] = useState({
    model: 'gemini-2.5-flash',
    riskThreshold: 70,
    autoFlagTyposquatting: true,
    soundAlerts: false,
    demoModeNotice: true,
  });

  const [backendStats, setBackendStats] = useState(null);

  // Check backend health and sync real SQLite history
  const checkBackend = async () => {
    try {
      const data = await zeroxApi.getHealth();
      setBackendStatus({
        checking: false,
        connected: true,
        geminiConfigured: Boolean(data?.gemini_configured),
        details: data,
        lastChecked: new Date().toLocaleTimeString(),
      });

      // Synchronize with backend history from SQLite
      try {
        const [histData, sData] = await Promise.all([
          zeroxApi.getHistory(50),
          zeroxApi.getSecurityStats()
        ]);
        if (histData && Array.isArray(histData.scans)) {
          setScans(histData.scans);
        }
        if (sData) {
          setBackendStats(sData);
        }
      } catch (syncErr) {
        console.warn('Could not sync SQLite data:', syncErr);
      }
    } catch (err) {
      setBackendStatus({
        checking: false,
        connected: false,
        geminiConfigured: false,
        details: null,
        lastChecked: new Date().toLocaleTimeString(),
      });
    }
  };

  useEffect(() => {
    checkBackend();
    // Auto-poll health and sync status every 5 seconds
    const pollInterval = setInterval(() => {
      checkBackend();
    }, 5000);
    return () => clearInterval(pollInterval);
  }, []);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('zerox_scan_history', JSON.stringify(scans));
    } catch (err) {
      console.error('Failed to save to localStorage', err);
    }
  }, [scans]);

  const addScan = async (newScan) => {
    const risk = Number(newScan.risk_score) || 0;
    const derivedVerdict = newScan.fraud_verdict || (
      risk >= 65 ? 'FRAUD_DETECTED' : risk < 30 ? 'NO_FRAUD_DETECTED' : 'NEEDS_REVIEW'
    );
    const formatted = {
      ...newScan,
      id: newScan.id || `scan-${Date.now()}`,
      created_at: newScan.created_at || new Date().toISOString(),
      fraud_verdict: derivedVerdict,
      confidence_score: newScan.confidence_score ?? (risk > 80 || risk < 15 ? 0.95 : 0.85),
    };
    setScans((prev) => [formatted, ...prev]);

    // Instantly sync SQLite history and aggregate stats
    if (backendStatus.connected) {
      try {
        const [histData, sData] = await Promise.all([
          zeroxApi.getHistory(50),
          zeroxApi.getSecurityStats()
        ]);
        if (histData && Array.isArray(histData.scans)) {
          setScans(histData.scans);
        }
        if (sData) {
          setBackendStats(sData);
        }
      } catch (err) {
        console.warn('Failed to refresh stats after scan:', err);
      }
    }
    return formatted;
  };

  const deleteScan = async (id) => {
    setScans((prev) => prev.filter((item) => String(item.id) !== String(id)));
    if (backendStatus.connected && !String(id).startsWith('demo')) {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        try {
          await zeroxApi.deleteScan(numId);
          const [histData, sData] = await Promise.all([
            zeroxApi.getHistory(50),
            zeroxApi.getSecurityStats()
          ]);
          if (histData && Array.isArray(histData.scans)) {
            setScans(histData.scans);
          }
          if (sData) {
            setBackendStats(sData);
          }
        } catch (err) {
          console.warn('Failed to delete scan on backend:', err);
        }
      }
    }
  };

  const clearHistory = async () => {
    setScans([]);
    setBackendStats({
      total_scans: 0,
      threats_detected: 0,
      safe_scans: 0,
      suspicious_scans: 0,
      average_risk_score: 0,
      type_counts: {}
    });
    try {
      localStorage.removeItem('zerox_scan_history');
    } catch (e) {
      // ignore
    }
    if (backendStatus.connected) {
      try {
        await zeroxApi.clearHistory();
        const sData = await zeroxApi.getSecurityStats();
        if (sData) setBackendStats(sData);
      } catch (err) {
        console.warn('Failed to clear backend history:', err);
      }
    }
  };

  const resetToDemo = () => {
    setScans(INITIAL_DEMO_SCANS);
  };

  const updateSettings = (newSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Compute stats dynamically from scans array or backend stats
  const totalScans = backendStats?.total_scans ?? scans.length;
  const threatsDetected = backendStats?.threats_detected ?? scans.filter((s) => s.risk_score >= 60).length;
  const safeScans = backendStats?.safe_scans ?? scans.filter((s) => s.risk_score < 30).length;
  const suspiciousScans = backendStats?.suspicious_scans ?? (totalScans - threatsDetected - safeScans);
  const avgRisk = backendStats?.average_risk_score ?? (
    totalScans > 0 
      ? Math.round(scans.reduce((sum, s) => sum + (s.risk_score || 0), 0) / scans.length) 
      : 0
  );

  // Compute Fraud Detection summary metrics
  const computedFraudCount = scans.filter((s) => {
    const v = s.fraud_verdict || (s.risk_score >= 65 ? 'FRAUD_DETECTED' : s.risk_score < 30 ? 'NO_FRAUD_DETECTED' : 'NEEDS_REVIEW');
    return v === 'FRAUD_DETECTED';
  }).length;

  const computedCleanCount = scans.filter((s) => {
    const v = s.fraud_verdict || (s.risk_score >= 65 ? 'FRAUD_DETECTED' : s.risk_score < 30 ? 'NO_FRAUD_DETECTED' : 'NEEDS_REVIEW');
    return v === 'NO_FRAUD_DETECTED';
  }).length;

  const computedReviewCount = scans.filter((s) => {
    const v = s.fraud_verdict || (s.risk_score >= 65 ? 'FRAUD_DETECTED' : s.risk_score < 30 ? 'NO_FRAUD_DETECTED' : 'NEEDS_REVIEW');
    return v === 'NEEDS_REVIEW';
  }).length;

  const fraudDetected = backendStats?.fraud_stats?.fraud_detected ?? backendStats?.fraud_detected ?? computedFraudCount;
  const noFraudDetected = backendStats?.fraud_stats?.no_fraud_detected ?? backendStats?.no_fraud_detected ?? computedCleanCount;
  const needsReview = backendStats?.fraud_stats?.needs_review ?? backendStats?.needs_review ?? computedReviewCount;
  const fraudRatePct = backendStats?.fraud_stats?.fraud_rate_pct ?? (
    totalScans > 0 ? Math.round((fraudDetected / totalScans) * 1000) / 10 : 0
  );

  // QR Code Specific Telemetry
  const qrScans = scans.filter((s) => ['qr', 'qr_code'].includes(String(s.scan_type || '').toLowerCase()));
  const qrTotal = backendStats?.qr_stats?.total ?? qrScans.length;
  const qrFraud = backendStats?.qr_stats?.fraud_detected ?? qrScans.filter((s) => {
    const v = s.fraud_verdict || (s.risk_score >= 65 ? 'FRAUD_DETECTED' : s.risk_score < 30 ? 'NO_FRAUD_DETECTED' : 'NEEDS_REVIEW');
    return v === 'FRAUD_DETECTED';
  }).length;
  const qrClean = backendStats?.qr_stats?.no_fraud_detected ?? qrScans.filter((s) => {
    const v = s.fraud_verdict || (s.risk_score >= 65 ? 'FRAUD_DETECTED' : s.risk_score < 30 ? 'NO_FRAUD_DETECTED' : 'NEEDS_REVIEW');
    return v === 'NO_FRAUD_DETECTED';
  }).length;
  const qrReview = backendStats?.qr_stats?.needs_review ?? qrScans.filter((s) => {
    const v = s.fraud_verdict || (s.risk_score >= 65 ? 'FRAUD_DETECTED' : s.risk_score < 30 ? 'NO_FRAUD_DETECTED' : 'NEEDS_REVIEW');
    return v === 'NEEDS_REVIEW';
  }).length;
  const qrFraudRatePct = backendStats?.qr_stats?.fraud_rate_pct ?? (
    qrTotal > 0 ? Math.round((qrFraud / qrTotal) * 1000) / 10 : 0
  );

  // Social Media Specific Telemetry
  const socialScans = scans.filter((s) => ['social', 'social_media'].includes(String(s.scan_type || '').toLowerCase()));
  const socialTotal = backendStats?.social_stats?.total ?? socialScans.length;
  const socialFraud = backendStats?.social_stats?.fraud_detected ?? socialScans.filter((s) => {
    const v = s.fraud_verdict || (s.risk_score >= 65 ? 'FRAUD_DETECTED' : s.risk_score < 30 ? 'NO_FRAUD_DETECTED' : 'NEEDS_REVIEW');
    return v === 'FRAUD_DETECTED';
  }).length;
  const socialClean = backendStats?.social_stats?.no_fraud_detected ?? socialScans.filter((s) => {
    const v = s.fraud_verdict || (s.risk_score >= 65 ? 'FRAUD_DETECTED' : s.risk_score < 30 ? 'NO_FRAUD_DETECTED' : 'NEEDS_REVIEW');
    return v === 'NO_FRAUD_DETECTED';
  }).length;
  const socialReview = backendStats?.social_stats?.needs_review ?? socialScans.filter((s) => {
    const v = s.fraud_verdict || (s.risk_score >= 65 ? 'FRAUD_DETECTED' : s.risk_score < 30 ? 'NO_FRAUD_DETECTED' : 'NEEDS_REVIEW');
    return v === 'NEEDS_REVIEW';
  }).length;
  const socialFraudRatePct = backendStats?.social_stats?.fraud_rate_pct ?? (
    socialTotal > 0 ? Math.round((socialFraud / socialTotal) * 1000) / 10 : 0
  );

  return (
    <ScanContext.Provider
      value={{
        scans,
        addScan,
        deleteScan,
        clearHistory,
        resetToDemo,
        backendStatus,
        checkBackend,
        settings,
        updateSettings,
        stats: {
          totalScans,
          threatsDetected,
          safeScans,
          suspiciousScans,
          avgRisk,
          typeCounts: backendStats?.type_counts || {},
          fraudStats: {
            fraudDetected,
            noFraudDetected,
            needsReview,
            fraudRatePct,
          },
          qrStats: {
            total: qrTotal,
            fraudDetected: qrFraud,
            noFraudDetected: qrClean,
            needsReview: qrReview,
            fraudRatePct: qrFraudRatePct,
          },
          socialStats: {
            total: socialTotal,
            fraudDetected: socialFraud,
            noFraudDetected: socialClean,
            needsReview: socialReview,
            fraudRatePct: socialFraudRatePct,
          },
        },
      }}
    >
      {children}
    </ScanContext.Provider>
  );
}

export function useScans() {
  const context = useContext(ScanContext);
  if (!context) {
    throw new Error('useScans must be used within a ScanProvider');
  }
  return context;
}
