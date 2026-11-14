import React, { useState } from 'react';
import {
  MessageSquareWarning,
  Sparkles,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  Info,
  ShieldCheck,
  Terminal,
  AlertCircle
} from 'lucide-react';
import { useScans } from '../context/ScanContext';
import { zeroxApi } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import RiskMeter from '../components/common/RiskMeter';
import FraudVerdictBadge from '../components/common/FraudVerdictBadge';

// Sample demonstration presets
const DEMO_PRESETS = [
  {
    label: '🏦 Bank KYC Smishing',
    text: 'URGENT: Your SBI Bank account has been blocked due to unverified KYC. Immediately visit http://sbi-kyc-verify-portal.top and submit your PAN & Aadhar details or access will be permanently suspended.',
    demoResult: {
      risk_score: 95,
      threat_level: 'CRITICAL',
      fraud_verdict: 'FRAUD_DETECTED',
      confidence_score: 0.96,
      categories: ['Banking Smishing', 'Urgency Manipulation', 'Credential Theft'],
      summary: 'High-severity fraudulent SMS mimicking official banking institution using coercive suspension threats.',
      flagged_indicators: [
        'Deceptive non-standard top-level domain (.top) impersonating official bank',
        'Artificial urgency designed to bypass logical discretion',
        'Direct solicitation of sensitive financial credentials and identification numbers'
      ],
      recommendations: [
        'Do not click the link or disclose any personal documents.',
        'Official banks never solicit KYC updates through third-party SMS links.',
        'Report this SMS to the bank fraud hotline or national cyber-crime portal.'
      ],
    }
  },
  {
    label: '💼 Telegram Task Scam',
    text: 'Hi dear! I am Sarah from Global Talent HR. We saw your resume. We offer part-time remote work: like 3 YouTube videos to earn $300-$500 daily. Payouts via USDT/crypto. Join Telegram @EasyCashTaskNow to start immediately!',
    demoResult: {
      risk_score: 88,
      threat_level: 'HIGH',
      fraud_verdict: 'FRAUD_DETECTED',
      confidence_score: 0.94,
      categories: ['Task Scam', 'Advance Fee Fraud', 'Unsolicited Recruitment'],
      summary: 'Typical recruitment scam enticing victims with high compensation for simple tasks, leading to fake investment deposits.',
      flagged_indicators: [
        'Disproportionate reward promised for trivial tasks',
        'Unverified Telegram recruitment funnel without company credentials',
        'Crypto/USDT payout mechanism to prevent payment chargebacks'
      ],
      recommendations: [
        'Do not contact the Telegram handle or join related channels.',
        'Never pay upfront deposit fees to unlock job earnings.',
        'Block the sender immediately.'
      ],
    }
  },
  {
    label: '🔑 Legitimate OTP Alert',
    text: 'Your Microsoft Account security verification code is 912830. If you did not initiate this request, someone may be attempting to sign in to your account. Do not share this code with anyone.',
    demoResult: {
      risk_score: 5,
      threat_level: 'SAFE',
      fraud_verdict: 'NO_FRAUD_DETECTED',
      confidence_score: 0.98,
      categories: ['Legitimate Authentication'],
      summary: 'Standard 2FA one-time verification passcode from legitimate identity provider.',
      flagged_indicators: [
        'Standard authentication dispatch',
        'Clear anti-phishing disclosure advising never to share code'
      ],
      recommendations: [
        'Safe to enter into the official Microsoft login prompt.',
        'If unsolicited, change your password immediately.'
      ],
    }
  }
];

export default function MessageScanner() {
  const { addScan, backendStatus } = useScans();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [inputError, setInputError] = useState('');

  const handleScan = async (e) => {
    e.preventDefault();

    // Form input validation for empty input
    if (!message.trim()) {
      setInputError('Please enter or paste a message into the text area before scanning.');
      return;
    }

    setInputError('');
    setLoading(true);
    setResult(null);

    // If backend is active and connected, call real Flask backend
    if (backendStatus.connected) {
      try {
        const response = await zeroxApi.scanMessage(message);
        setResult(response);
        addScan({
          id: response.id || response.scan_id,
          scan_type: 'message',
          target_content: message,
          risk_score: response.risk_score,
          threat_level: response.threat_level,
          fraud_verdict: response.fraud_verdict,
          confidence_score: response.confidence_score,
          categories: response.categories || [],
          summary: response.summary,
          flagged_indicators: response.flagged_indicators || [],
          recommendations: response.recommendations || [],
          isDemo: false
        });
        setLoading(false);
        return;
      } catch (err) {
        console.warn('Backend call failed, falling back to demonstration mode:', err);
      }
    }

    // Graceful demonstration mode when backend is offline or when running preset
    setTimeout(() => {
      // Find matching preset or generate standard demonstration assessment
      const matched = DEMO_PRESETS.find(p => p.text.trim() === message.trim());
      const demoData = matched?.demoResult || {
        risk_score: 75,
        threat_level: 'HIGH',
        fraud_verdict: 'FRAUD_DETECTED',
        confidence_score: 0.90,
        categories: ['Potential Phishing', 'Social Engineering'],
        summary: 'Demonstration analysis: Message contains deceptive language patterns and urgency cues commonly associated with scam attempts.',
        flagged_indicators: [
          'Demonstration indicator: Unverified sender origin',
          'Demonstration indicator: Call to action with coercive urgency'
        ],
        recommendations: [
          'Verify sender authenticity through secondary official channel.',
          'Never submit credentials or OTPs based on unauthenticated messages.'
        ],
      };

      const finalScan = {
        ...demoData,
        scan_type: 'message',
        target_content: message,
        isDemo: true
      };

      setResult(finalScan);
      addScan(finalScan);
      setLoading(false);
    }, 1200);
  };

  const handleSelectPreset = (preset) => {
    setMessage(preset.text);
    setActivePreset(preset.label);
    setInputError('');
    setResult(null);
  };

  const handleClear = () => {
    setMessage('');
    setResult(null);
    setActivePreset(null);
    setInputError('');
  };

  const handleCopyReport = () => {
    if (!result) return;
    const text = `ZEROX AI MESSAGE SCAN REPORT\nContent: "${message}"\nThreat Level: ${result.threat_level}\nRisk Score: ${result.risk_score}/100\nSummary: ${result.summary}`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-title">Message Scam Scanner</h1>
        <p className="page-subtitle">
          Advanced semantic threat detection for SMS, WhatsApp, Telegram, and email phishing attacks.
        </p>
      </div>

      <div className="scanner-layout">
        {/* Input Panel */}
        <div className="card scanner-input-panel">
          <div className="panel-title-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquareWarning size={18} color="var(--accent-red)" />
              <span style={{ fontWeight: 600 }}>Message Threat Inspector</span>
            </div>
            {message && (
              <button className="text-btn" onClick={handleClear}>
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>

          <form onSubmit={handleScan}>
            <div className="textarea-container">
              <textarea
                rows={9}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (inputError) setInputError('');
                }}
                placeholder="Paste incoming SMS message, email body, WhatsApp message, or direct message here..."
                className={`cyber-textarea ${inputError ? 'input-invalid' : ''}`}
                disabled={loading}
              />
              <div className="textarea-footer">
                <span>{message.length} characters</span>
                <span>Max 10,000</span>
              </div>
            </div>

            {/* Empty Input Validation Warning */}
            {inputError && (
              <div className="validation-message error" style={{ marginTop: '0.6rem' }}>
                <AlertCircle size={15} />
                <span>{inputError}</span>
              </div>
            )}

            {/* Presets */}
            <div className="preset-selector">
              <span className="preset-label">Demonstration Presets (Click to test):</span>
              <div className="preset-chips">
                {DEMO_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`preset-btn ${activePreset === p.label ? 'active' : ''}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="scanner-actions">
              <button
                type="submit"
                className="btn-red-pill btn-block"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="scanner-spinner"></span>
                    <span>Analyzing Deception Signals...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Analyze Message for Scams</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Tips card */}
          <div className="scanner-hint">
            <Terminal size={14} color="var(--accent-red)" />
            <span>
              ZEROX evaluates NLP urgency indicators, brand impersonation markers, and financial coercion models.
            </span>
          </div>
        </div>

        {/* Results Panel */}
        <div className="card scanner-result-panel">
          <div className="panel-title-bar">
            <span style={{ fontWeight: 600 }}>Forensic Assessment</span>
            {result && (
              <button className="text-btn" onClick={handleCopyReport}>
                {copied ? <Check size={14} color="var(--threat-safe)" /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Export'}</span>
              </button>
            )}
          </div>

          {/* Empty State */}
          {!result && !loading && (
            <div className="scanner-empty-state">
              <div className="radar-circle">
                <MessageSquareWarning size={42} style={{ opacity: 0.5, color: 'var(--accent-red)' }} />
              </div>
              <h4>Awaiting Message Input</h4>
              <p>Paste an SMS or email on the left and trigger analysis to view risk classification.</p>
            </div>
          )}

          {/* Scanning Animation State */}
          {loading && (
            <div className="scanner-loading-state">
              <div className="cyber-radar">
                <div className="radar-sweep"></div>
                <div className="radar-core"></div>
              </div>
              <h4>Inspecting Threat Signatures</h4>
              <p>Running semantic scam taxonomy and fraud model validation...</p>
              <div className="scanning-steps">
                <span>✓ Language decomposition</span>
                <span>• Evaluating credential risk</span>
                <span>• Checking urgency manipulation</span>
              </div>
            </div>
          )}

          {/* Results Display */}
          {result && !loading && (
            <div className="result-content-wrapper">
              {result.isDemo && (
                <div className="demo-badge-pill">
                  <Info size={13} />
                  <span>Demonstration Data (Sample Mode)</span>
                </div>
              )}

              {/* Prominent Fraud or Not Fraud Detection Verdict */}
              <FraudVerdictBadge
                verdict={result.fraud_verdict}
                riskScore={result.risk_score}
                confidence={result.confidence_score}
                size="banner"
              />

              {/* Gauge and Classification */}
              <div className="result-score-block">
                <RiskMeter score={result.risk_score} size={130} strokeWidth={11} />
                <div className="score-details">
                  <span className="detail-label">THREAT CLASSIFICATION</span>
                  <RiskBadge level={result.threat_level} size="large" />
                  <p className="result-summary">{result.summary}</p>
                </div>
              </div>

              {/* Categories */}
              {result.categories && result.categories.length > 0 && (
                <div className="result-section">
                  <div className="section-title">Detected Threat Categories</div>
                  <div className="tags-container">
                    {result.categories.map((c, i) => (
                      <span key={i} className="category-chip danger">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Flagged Indicators */}
              {result.flagged_indicators && result.flagged_indicators.length > 0 && (
                <div className="result-section">
                  <div className="section-title text-warning">
                    <AlertTriangle size={14} />
                    <span>Suspicious Indicators & Deception Red Flags</span>
                  </div>
                  <ul className="indicators-bullet-list">
                    {result.flagged_indicators.map((ind, i) => (
                      <li key={i}>{ind}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="result-section">
                  <div className="section-title text-safe">
                    <ShieldCheck size={14} />
                    <span>Recommended Defense Actions</span>
                  </div>
                  <ul className="indicators-bullet-list safe">
                    {result.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
