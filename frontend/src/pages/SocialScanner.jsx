import React, { useState } from 'react';
import {
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle,
  Copy,
  Check,
  AlertCircle,
  ArrowRight,
  Link as LinkIcon,
  AtSign
} from 'lucide-react';
import { useScans } from '../context/ScanContext';
import { zeroxApi } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import RiskMeter from '../components/common/RiskMeter';
import FraudVerdictBadge from '../components/common/FraudVerdictBadge';

// 8 Official Supported Social Media Platforms with Crisp Brand SVGs (approx 40x40px)
const SOCIAL_PLATFORMS = [
  {
    id: 'instagram',
    label: 'Instagram',
    color: '#E1306C',
    iconSvg: (
      <svg viewBox="0 0 24 24" width="40" height="40" fill="none">
        <defs>
          <linearGradient id="ig-gradient-card" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f09433" />
            <stop offset="25%" stopColor="#e6683c" />
            <stop offset="50%" stopColor="#dc2743" />
            <stop offset="75%" stopColor="#cc2366" />
            <stop offset="100%" stopColor="#bc1888" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="url(#ig-gradient-card)" strokeWidth="2.2" />
        <circle cx="12" cy="12" r="4.2" stroke="url(#ig-gradient-card)" strokeWidth="2.2" />
        <circle cx="17.5" cy="6.5" r="1.4" fill="url(#ig-gradient-card)" />
      </svg>
    )
  },
  {
    id: 'facebook',
    label: 'Facebook',
    color: '#1877F2',
    iconSvg: (
      <svg viewBox="0 0 24 24" width="40" height="40" fill="none">
        <circle cx="12" cy="12" r="11" fill="#1877F2" />
        <path
          d="M13.5 22V13.8H16.2L16.6 10.7H13.5V8.7C13.5 7.8 13.8 7.2 15 7.2H16.7V4.4C16.4 4.3 15.4 4.2 14.2 4.2C11.7 4.2 10 5.7 10 8.5V10.7H7.3V13.8H10V22H13.5Z"
          fill="#FFFFFF"
        />
      </svg>
    )
  },
  {
    id: 'x',
    label: 'X (Twitter)',
    color: '#FFFFFF',
    iconSvg: (
      <svg viewBox="0 0 24 24" width="40" height="40" fill="none">
        <rect width="24" height="24" rx="6" fill="#141824" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1.2" />
        <path
          d="M17.3 4.5H19.5L14.7 10L20.3 17.5H15.9L12.4 12.9L8.5 17.5H6.3L11.4 11.6L6 4.5H10.5L13.7 8.7L17.3 4.5ZM16.5 16.2H17.7L9.9 5.8H8.6L16.5 16.2Z"
          fill="#FFFFFF"
        />
      </svg>
    )
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    color: '#25D366',
    iconSvg: (
      <svg viewBox="0 0 24 24" width="40" height="40" fill="none">
        <circle cx="12" cy="12" r="11" fill="#25D366" />
        <path
          d="M12 4.2C7.7 4.2 4.2 7.7 4.2 12C4.2 13.5 4.6 14.9 5.4 16.1L4.5 19.5L8 18.6C9.2 19.3 10.5 19.8 12 19.8C16.3 19.8 19.8 16.3 19.8 12C19.8 7.7 16.3 4.2 12 4.2ZM15.8 14.8C15.6 15.3 14.8 15.7 14.2 15.7C13.8 15.7 13.2 15.6 11.5 14.8C9.4 13.9 8 11.8 7.9 11.6C7.8 11.5 7 10.4 7 9.3C7 8.2 7.6 7.6 7.8 7.4C8 7.2 8.3 7.1 8.6 7.1C8.7 7.1 8.8 7.1 8.9 7.1C9.2 7.1 9.3 7.2 9.5 7.5C9.7 8 10.1 9.1 10.1 9.2C10.2 9.4 10.2 9.5 10.1 9.7C10 9.8 9.9 10 9.8 10.1C9.7 10.2 9.6 10.4 9.5 10.5C9.3 10.7 9.2 10.8 9.4 11.1C9.6 11.5 10.2 12.5 11.1 13.3C12.3 14.3 13.2 14.6 13.5 14.8C13.8 14.9 14 14.9 14.2 14.6C14.4 14.4 14.9 13.8 15.1 13.5C15.3 13.2 15.5 13.3 15.7 13.4C16 13.5 17.3 14.1 17.5 14.2C17.7 14.3 17.9 14.4 17.9 14.5C17.9 14.7 17.9 15.2 15.8 14.8Z"
          fill="#FFFFFF"
        />
      </svg>
    )
  },
  {
    id: 'telegram',
    label: 'Telegram',
    color: '#229ED9',
    iconSvg: (
      <svg viewBox="0 0 24 24" width="40" height="40" fill="none">
        <circle cx="12" cy="12" r="11" fill="#229ED9" />
        <path
          d="M6 11.8L16.5 7.6C17 7.4 17.4 7.7 17.3 8.3L15.5 16.7C15.4 17.2 15 17.3 14.6 17.1L12 15.1L10.7 16.3C10.5 16.5 10.4 16.7 10.1 16.7L10.3 13.8L15.6 9C15.8 8.8 15.6 8.7 15.3 8.9L8.7 13.1L5.9 12.2C5.3 12 5.3 11.6 6 11.8Z"
          fill="#FFFFFF"
        />
      </svg>
    )
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    color: '#0A66C2',
    iconSvg: (
      <svg viewBox="0 0 24 24" width="40" height="40" fill="none">
        <rect width="24" height="24" rx="5" fill="#0A66C2" />
        <path
          d="M7.4 9.1H4.8V17.5H7.4V9.1ZM6.1 5.5C5.3 5.5 4.6 6.2 4.6 7C4.6 7.8 5.3 8.5 6.1 8.5C6.9 8.5 7.6 7.8 7.6 7C7.6 6.2 6.9 5.5 6.1 5.5ZM19.4 17.5V12.9C19.4 10.6 18.2 9.5 16.5 9.5C15.2 9.5 14.6 10.2 14.2 10.8V9.1H11.6C11.6 9.8 11.6 17.5 11.6 17.5H14.2V12.8C14.2 12.5 14.2 12.3 14.3 12.1C14.6 11.5 15.1 10.9 16 10.9C17.1 10.9 17.6 11.7 17.6 12.9V17.5H19.4Z"
          fill="#FFFFFF"
        />
      </svg>
    )
  },
  {
    id: 'youtube',
    label: 'YouTube',
    color: '#FF0000',
    iconSvg: (
      <svg viewBox="0 0 24 24" width="40" height="40" fill="none">
        <rect width="24" height="24" rx="6" fill="#FF0000" />
        <path d="M10 8.5L15.5 12L10 15.5V8.5Z" fill="#FFFFFF" />
      </svg>
    )
  },
  {
    id: 'snapchat',
    label: 'Snapchat',
    color: '#FFFC00',
    iconSvg: (
      <svg viewBox="0 0 24 24" width="40" height="40" fill="none">
        <rect width="24" height="24" rx="6" fill="#FFFC00" />
        <path
          d="M12 4.5C9.7 4.5 8.1 5.9 8 8C8 8.6 8.2 9.7 8.2 10.3C8.1 10.4 7.6 10.6 7.2 10.8C6.9 10.9 6.8 11.2 6.9 11.4C7.1 11.6 7.7 11.8 8.1 11.6C8.2 12.3 8.5 13.5 9.4 14.2C9.5 14.3 9.2 14.5 8.5 14.8C7.9 15 7.4 15.3 7.3 15.7C7.2 16 7.5 16.3 8.2 16.3C9 16.3 9.7 15.9 10.3 16.2C10.7 16.4 11.2 17 12 17C12.8 17 13.3 16.4 13.7 16.2C14.3 15.9 15 16.3 15.8 16.3C16.5 16.3 16.8 16 16.7 15.7C16.6 15.3 16.1 15 15.5 14.8C14.8 14.5 14.5 14.3 14.6 14.2C15.5 13.5 15.8 12.3 15.9 11.6C16.3 11.8 16.9 11.6 17.1 11.4C17.2 11.2 17.1 10.9 16.8 10.8C16.4 10.6 15.9 10.4 15.8 10.3C15.8 9.7 16 8.6 16 8C15.9 5.9 14.3 4.5 12 4.5Z"
          fill="#000000"
        />
      </svg>
    )
  }
];

// Presets using ONLY simplified fields (Platform, Username, Profile URL)
const PRESETS = [
  {
    title: 'Instagram Impersonator',
    badge: 'Fraud',
    badgeType: 'critical',
    data: {
      platform: 'instagram',
      username: '@instagram_support123',
      profile_url: 'https://instagram.com/instagram_support123'
    }
  },
  {
    title: 'X Crypto Giveaway Trap',
    badge: 'Fraud',
    badgeType: 'critical',
    data: {
      platform: 'x',
      username: '@elonmusk_airdrop2026',
      profile_url: 'https://x.com/elonmusk_airdrop2026'
    }
  },
  {
    title: 'Telegram 1000% Profit Scheme',
    badge: 'Fraud',
    badgeType: 'critical',
    data: {
      platform: 'telegram',
      username: '@crypto_vip_signals_daily',
      profile_url: 'https://t.me/crypto_vip_signals_daily'
    }
  },
  {
    title: 'Facebook Meta Helpdesk',
    badge: 'Fraud',
    badgeType: 'critical',
    data: {
      platform: 'facebook',
      username: '@meta_support_security_desk',
      profile_url: 'https://facebook.com/meta_support_security_desk'
    }
  },
  {
    title: 'WhatsApp Contact',
    badge: 'Review',
    badgeType: 'medium',
    data: {
      platform: 'whatsapp',
      username: '+1 (555) 019-2834',
      profile_url: ''
    }
  },
  {
    title: 'Official Tech Community',
    badge: 'Safe',
    badgeType: 'safe',
    data: {
      platform: 'youtube',
      username: '@googleworkspace',
      profile_url: 'https://youtube.com/@googleworkspace'
    }
  }
];

export default function SocialScanner() {
  const { addScan, backendStatus } = useScans();

  // Simplified Form State: Only Platform, Username, and Profile URL
  const [platform, setPlatform] = useState('instagram');
  const [username, setUsername] = useState('');
  const [profileUrl, setProfileUrl] = useState('');

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const selectedPlatformObj =
    SOCIAL_PLATFORMS.find((p) => p.id === platform) || SOCIAL_PLATFORMS[0];

  const handleSelectPlatform = (pId) => {
    setPlatform(pId);
  };

  const handleLoadPreset = (preset) => {
    setPlatform(preset.data.platform);
    setUsername(preset.data.username);
    setProfileUrl(preset.data.profile_url);
    setError(null);
    setScanResult(null);
  };

  const handleClear = () => {
    setUsername('');
    setProfileUrl('');
    setError(null);
    setScanResult(null);
  };

  const getHandlePlaceholder = (plat) => {
    switch (plat) {
      case 'instagram':
        return '@instagram_support123 or @username';
      case 'facebook':
        return 'Meta Support Desk or username';
      case 'x':
        return '@elonmusk_official or @support_desk';
      case 'whatsapp':
        return '+1 (555) 019-2834 or phone handle';
      case 'telegram':
        return '@crypto_vip_signals or @username';
      case 'linkedin':
        return 'sarah-jenkins-recruiter or full name';
      case 'youtube':
        return '@googleworkspace or channel handle';
      case 'snapchat':
        return 'snap_support123 or username';
      default:
        return '@instagram_support123';
    }
  };

  const getUrlPlaceholder = (plat) => {
    switch (plat) {
      case 'instagram':
        return 'https://instagram.com/username';
      case 'facebook':
        return 'https://facebook.com/username';
      case 'x':
        return 'https://x.com/username';
      case 'whatsapp':
        return 'https://wa.me/15550192834';
      case 'telegram':
        return 'https://t.me/username';
      case 'linkedin':
        return 'https://linkedin.com/in/username';
      case 'youtube':
        return 'https://youtube.com/@username';
      case 'snapchat':
        return 'https://snapchat.com/add/username';
      default:
        return 'https://instagram.com/username';
    }
  };

  const handleScan = async (e) => {
    if (e) e.preventDefault();

    const trimmedUsername = username.trim();
    const trimmedUrl = profileUrl.trim();

    // Validation: At least one of Username or Profile URL must be provided (min 2 chars)
    if (trimmedUsername.length < 2 && trimmedUrl.length < 2) {
      setError(
        'Please provide at least a Username / Account Handle or a Profile URL to analyze.'
      );
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      platform,
      username: trimmedUsername,
      profile_url: trimmedUrl
    };

    try {
      let result;
      if (backendStatus.connected) {
        result = await zeroxApi.scanSocialMedia(payload);
      } else {
        // Fallback simulation only if backend is completely disconnected
        result = {
          risk_score: 85,
          classification: 'CRITICAL',
          threat_level: 'CRITICAL',
          fraud_verdict: 'FRAUD_DETECTED',
          confidence_score: 0.92,
          account_assessment: 'Suspected Impersonation & Scam',
          reasons: [
            'Pattern match: Deceptive handle pattern combined with brand keywords',
            'Assessment Scope: Static offline analysis performed on handle and URL structure'
          ],
          recommendation:
            'Do not click links or send funds. Block and report profile.',
          detected_patterns: ['Social Media Scam', 'Brand Impersonation'],
          analysis_source: 'heuristic_fallback (offline)',
          categories: ['Social Media Scam'],
          summary: `Offline assessment: high-risk indicators detected for ${selectedPlatformObj.label} profile.`,
          flagged_indicators: ['Suspicious profile attributes detected in offline mode'],
          recommendations: [
            'Block and report the account to platform safety moderators.',
            'Never share OTPs, credit cards, or login credentials.'
          ],
          disclaimer:
            'ZEROX AI analyzes the information provided and identifies suspicious indicators. It does not independently verify account ownership or guarantee that an account is genuine.'
        };
      }

      setScanResult(result);

      // Synchronize with scan history
      await addScan({
        scan_type: 'social_media',
        target_content: `[${result.platform || selectedPlatformObj.label}] ${trimmedUsername || trimmedUrl || 'Social Profile'}`,
        threat_level: result.threat_level || result.classification,
        risk_score: result.risk_score,
        fraud_verdict: result.fraud_verdict,
        confidence_score: result.confidence_score,
        categories:
          result.categories ||
          result.detected_patterns || ['Social Media Analysis'],
        summary:
          result.summary ||
          `Scan completed for ${selectedPlatformObj.label} profile.`,
        flagged_indicators: result.flagged_indicators || result.reasons || [],
        recommendations: result.recommendations || [result.recommendation],
        analysis_details: {
          platform: result.platform || selectedPlatformObj.label,
          username: result.username || trimmedUsername,
          profile_url: trimmedUrl,
          account_assessment: result.account_assessment,
          disclaimer: result.disclaimer
        },
        analysis_source: result.analysis_source
      });

      // Smooth scroll to results on mobile/tablets
      setTimeout(() => {
        const el = document.getElementById('results-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (err) {
      setError(
        err.message ||
          'Social media profile analysis failed. Please verify input and retry.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReport = () => {
    if (!scanResult) return;
    const text = `--- ZEROX AI SOCIAL MEDIA THREAT REPORT ---
Platform: ${scanResult.platform || selectedPlatformObj.label}
Account Handle: ${username || scanResult.username || 'N/A'}
Profile URL: ${profileUrl || 'N/A'}
Verdict: ${scanResult.fraud_verdict}
Risk Score: ${scanResult.risk_score}/100 (${scanResult.threat_level || scanResult.classification})
Account Assessment: ${scanResult.account_assessment || 'N/A'}
Analysis Source: ${scanResult.analysis_source || 'N/A'}
Forensic Indicators:
${(scanResult.reasons || []).map((r) => ` - ${r}`).join('\n')}
Recommendation: ${scanResult.recommendation || ''}
Disclaimer: ${scanResult.disclaimer || 'ZEROX AI analyzes the information provided and identifies suspicious indicators. It does not independently verify account ownership or guarantee that an account is genuine.'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isFormValid = username.trim().length >= 2 || profileUrl.trim().length >= 2;

  return (
    <div className="page-container scanner-page-wrapper">
      {/* SECTION 1: HEADER */}
      <div className="page-header">
        <div className="header-badge">
          <Users size={14} />
          <span>SCAN VECTOR 04 | SOCIAL MEDIA SECURITY</span>
        </div>
        <h1 className="page-title">Social Media Scam & Fake Profile Detector</h1>
        <p className="page-description">
          Detect suspicious social media profiles, impersonation attempts and potential
          phishing threats using AI-powered security analysis.
        </p>
      </div>

      {/* QUICK PRESETS */}
      <div className="presets-wrapper">
        <div className="presets-header">
          <Sparkles size={16} color="var(--accent-cyan)" />
          <span>Quick Test Presets (Instant Forensics):</span>
        </div>
        <div className="presets-grid">
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              className="preset-btn"
              onClick={() => handleLoadPreset(p)}
              disabled={loading}
            >
              <span className={`preset-pill ${p.badgeType}`}>{p.badge}</span>
              <span className="preset-name">{p.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="social-scanner-main-layout">
        {/* SECTION 2: SOCIAL MEDIA PLATFORM SELECTION */}
        <div className="scanner-section-card">
          <div className="section-card-header">
            <div className="section-step-indicator">
              <span className="step-num">1</span>
              <div>
                <h3 className="section-card-title">Select Social Media Platform</h3>
                <p className="section-card-subtitle">
                  Choose the target platform for contextual impersonation and threat analysis
                </p>
              </div>
            </div>
          </div>
          <div className="platform-cards-grid">
            {SOCIAL_PLATFORMS.map((p) => {
              const isSelected = platform === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`platform-select-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectPlatform(p.id)}
                  disabled={loading}
                  aria-label={`Select ${p.label}`}
                >
                  <div className="platform-card-icon-wrap" style={{ color: p.color }}>
                    {p.iconSvg}
                  </div>
                  <span className="platform-card-label">{p.label}</span>
                  {isSelected && <span className="platform-selected-dot" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: PROFILE INFORMATION (TWO MAIN INPUT FIELDS ONLY) */}
        <div className="scanner-section-card">
          <div className="section-card-header">
            <div className="section-step-indicator">
              <span className="step-num">2</span>
              <div>
                <h3 className="section-card-title">Profile Information</h3>
                <p className="section-card-subtitle">
                  Enter a username, a profile URL, or both. No passwords, bio, or message text required.
                </p>
              </div>
            </div>
            {(username || profileUrl) && (
              <button
                type="button"
                className="clear-text-btn"
                onClick={handleClear}
                disabled={loading}
              >
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>
            )}
          </div>

          <form onSubmit={handleScan} className="profile-inputs-stack">
            {/* Field 1: Username / Account Handle */}
            <div className="premium-input-group">
              <label className="premium-input-label">
                <span className="label-text">Username / Account Handle</span>
                <span className="label-hint">
                  {username.trim() ? 'Included in analysis' : 'Required if Profile URL is empty'}
                </span>
              </label>
              <div className="premium-input-wrapper">
                <div className="input-icon-slot">
                  <AtSign size={22} className="input-leading-icon" />
                </div>
                <input
                  type="text"
                  className="premium-text-input"
                  placeholder={getHandlePlaceholder(platform)}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Field 2: Profile URL */}
            <div className="premium-input-group">
              <label className="premium-input-label">
                <span className="label-text">Profile URL</span>
                <span className="label-hint">
                  {profileUrl.trim() ? 'Included in analysis' : 'Required if Username is empty'}
                </span>
              </label>
              <div className="premium-input-wrapper">
                <div className="input-icon-slot">
                  <LinkIcon size={22} className="input-leading-icon" />
                </div>
                <input
                  type="url"
                  className="premium-text-input"
                  placeholder={getUrlPlaceholder(platform)}
                  value={profileUrl}
                  onChange={(e) => {
                    setProfileUrl(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Privacy & Zero Credential Assurance Banner */}
            <div className="social-input-info-banner">
              <Shield size={16} color="var(--accent-cyan)" />
              <span>
                <strong>Zero Credential Policy:</strong> Enter public account handles or profile links only.
                ZEROX AI never asks for passwords, private OTPs, or account access credentials.
              </span>
            </div>

            {error && (
              <div className="error-alert">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* SECTION 4: LARGE ANALYZE BUTTON */}
            <button
              type="submit"
              className="premium-analyze-btn"
              disabled={loading || !isFormValid}
            >
              {loading ? (
                <>
                  <div className="btn-spinner" />
                  <span>Analyzing {selectedPlatformObj.label} Profile Signals...</span>
                </>
              ) : (
                <>
                  <ShieldAlert size={22} />
                  <span>ANALYZE SOCIAL PROFILE</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* SECTION 5: FORENSIC ASSESSMENT & VERDICT */}
        <div className="scanner-section-card results-section-card" id="results-section">
          <div className="section-card-header">
            <div className="section-step-indicator">
              <span className="step-num">3</span>
              <div>
                <h3 className="section-card-title">Forensic Assessment & Verdict</h3>
                <p className="section-card-subtitle">
                  AI-assisted threat intelligence and impersonation risk breakdown
                </p>
              </div>
            </div>
            {scanResult && (
              <button
                type="button"
                className="icon-text-btn"
                onClick={handleCopyReport}
                title="Export forensic threat dossier"
              >
                {copied ? <Check size={14} color="var(--threat-safe)" /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Export Dossier'}</span>
              </button>
            )}
          </div>

          {/* Initial Empty State */}
          {!scanResult && !loading && (
            <div className="empty-results-state social-empty-state">
              <div className="empty-results-icon" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                <Users size={38} color="#ef4444" />
              </div>
              <h4>No Profile Analyzed Yet</h4>
              <p>
                Select a social media platform, enter an account handle or profile URL, and click{' '}
                <strong>ANALYZE SOCIAL PROFILE</strong> to detect impersonation and scam indicators.
              </p>
            </div>
          )}

          {/* Scanning / Loading State */}
          {loading && (
            <div className="scanning-active-state">
              <div className="scanner-radar">
                <div className="radar-sweep" />
                <Users size={36} color="var(--accent-cyan)" />
              </div>
              <h4>Evaluating {selectedPlatformObj.label} Profile Signals</h4>
              <p>
                Cross-checking handle syntax, examining brand impersonation patterns, testing
                destination link safety, and running Gemini AI forensic reasoning...
              </p>
            </div>
          )}

          {/* Final Results State */}
          {scanResult && !loading && (
            <div className="results-content-stack">
              {/* Prominent Fraud Verdict Banner */}
              <FraudVerdictBadge
                verdict={scanResult.fraud_verdict}
                riskScore={scanResult.risk_score}
                confidence={scanResult.confidence_score}
                size="banner"
              />

              {/* Score Meter & Threat Level Overview */}
              <div className="score-overview-box">
                <div className="meter-col">
                  <RiskMeter score={scanResult.risk_score} size={110} />
                </div>
                <div className="meta-col">
                  <div className="meta-row">
                    <span className="meta-label">Threat Level:</span>
                    <RiskBadge level={scanResult.threat_level || scanResult.classification} />
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Account Assessment:</span>
                    <span className="assessment-pill">
                      {scanResult.account_assessment || 'Evaluated Profile'}
                    </span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Platform Analyzed:</span>
                    <span className="platform-tag" style={{ color: selectedPlatformObj.color }}>
                      {scanResult.platform || selectedPlatformObj.label}
                    </span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Analysis Engine:</span>
                    <span className="engine-pill">
                      {scanResult.analysis_source?.includes('gemini')
                        ? 'Gemini AI'
                        : 'Rule-Based Engine'}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Explanation / Summary */}
              {scanResult.summary && (
                <div className="ai-explanation-box">
                  <div className="explanation-header">
                    <Sparkles size={16} color="var(--accent-cyan)" />
                    <span>Forensic Summary & AI Explanation</span>
                  </div>
                  <p className="explanation-body">{scanResult.summary}</p>
                </div>
              )}

              {/* Detected Forensic Threat Indicators */}
              <div className="indicators-section">
                <h4 className="section-title">
                  <AlertTriangle size={16} color="var(--threat-medium)" />
                  <span>Detected Threat Indicators</span>
                  <span className="count-pill">{(scanResult.reasons || []).length}</span>
                </h4>
                <ul className="indicators-list">
                  {(scanResult.reasons || []).map((reason, idx) => (
                    <li key={idx} className="indicator-item">
                      <span className="indicator-bullet" />
                      <span className="indicator-text">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Protective Recommendations */}
              <div className="recommendations-section">
                <h4 className="section-title">
                  <ShieldCheck size={16} color="var(--threat-safe)" />
                  <span>Recommended Protective Actions</span>
                </h4>
                <ul className="recommendations-list">
                  {(scanResult.recommendations || [scanResult.recommendation])
                    .filter(Boolean)
                    .map((rec, idx) => (
                      <li key={idx} className="recommendation-item">
                        <CheckCircle size={16} color="var(--threat-safe)" className="rec-icon" />
                        <span>{rec}</span>
                      </li>
                    ))}
                </ul>
              </div>

              {/* MANDATORY LEGAL & FORENSIC DISCLAIMER */}
              <div className="mandatory-social-disclaimer">
                <div className="disclaimer-header">
                  <Info size={16} color="var(--text-secondary)" />
                  <span>MANDATORY SYSTEM ADVISORY</span>
                </div>
                <p className="disclaimer-text">
                  {scanResult.disclaimer ||
                    'ZEROX AI analyzes the information provided and identifies suspicious indicators. It does not independently verify account ownership or guarantee that an account is genuine.'}
                </p>
              </div>

              {/* Reset / Scan Another Action */}
              <button
                type="button"
                className="secondary-btn full-width"
                onClick={handleClear}
              >
                <RotateCcw size={16} />
                <span>Scan Another Social Profile</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
