import React, { useState } from 'react';
import {
  Globe,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  Info,
  ShieldCheck,
  CheckCircle,
  Lock,
  Unlock,
  AlertCircle
} from 'lucide-react';
import { useScans } from '../context/ScanContext';
import { zeroxApi } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import RiskMeter from '../components/common/RiskMeter';
import FraudVerdictBadge from '../components/common/FraudVerdictBadge';

const URL_DEMO_PRESETS = [
  {
    label: '💳 PayPal Lookalike (Typosquatting)',
    url: 'https://security-verify-paypa1.co/login',
    demoResult: {
      risk_score: 96,
      threat_level: 'CRITICAL',
      fraud_verdict: 'FRAUD_DETECTED',
      confidence_score: 0.98,
      target_brand: 'PayPal Inc.',
      categories: ['Phishing', 'Typosquatting', 'Credential Harvesting'],
      summary: 'High-risk credential harvesting portal exploiting typosquatted domain ("paypa1" using digit 1 instead of letter l).',
      flagged_indicators: [
        'Homoglyph substitution: paypa1 replaces letter "l" with digit "1"',
        'Unauthorized host imitating PayPal account verification interface',
        'Recently registered domain with anonymized WHOIS registrant records',
        'Suspicious top-level domain (.co) differing from official brand (.com)'
      ],
      recommendations: [
        'Do not visit or enter credentials on this address.',
        'Access PayPal exclusively via the official URL: https://www.paypal.com.',
        'Submit URL to Google Safe Browsing and Microsoft Defender SmartScreen.'
      ],
    }
  },
  {
    label: '🎬 Netflix Billing Phish',
    url: 'http://netflix-billing-resolve-account.xyz/update',
    demoResult: {
      risk_score: 92,
      threat_level: 'CRITICAL',
      fraud_verdict: 'FRAUD_DETECTED',
      confidence_score: 0.95,
      target_brand: 'Netflix',
      categories: ['Brand Impersonation', 'Payment Fraud', 'Unencrypted HTTP'],
      summary: 'Deceptive streaming service billing scam attempting to capture payment card numbers and CVV codes.',
      flagged_indicators: [
        'Insecure transmission protocol (HTTP instead of HTTPS)',
        'Excessive hyphenated subdomains designed to deceive mobile browser bars',
        'Cheap generic top-level domain (.xyz) frequently abused in phishing campaigns'
      ],
      recommendations: [
        'Never submit credit card or payment details.',
        'Verify membership status inside the official Netflix mobile application.',
        'Block domain across local firewall or network DNS.'
      ],
    }
  },
  {
    label: '🛡️ Verified Official Domain',
    url: 'https://github.com/security/advisories',
    demoResult: {
      risk_score: 0,
      threat_level: 'SAFE',
      fraud_verdict: 'NO_FRAUD_DETECTED',
      confidence_score: 0.98,
      target_brand: 'GitHub / Microsoft',
      categories: ['Verified Official Platform'],
      summary: 'Authenticated enterprise developer security registry with valid high-assurance cryptographic certificates.',
      flagged_indicators: [
        'Authentic domain ownership verified',
        'Valid TLS 1.3 encryption certificate issued by trusted CA',
        'No malicious redirection hops detected'
      ],
      recommendations: [
        'Domain is verified and safe for navigation.'
      ],
    }
  }
];

export default function UrlScanner() {
  const { addScan, backendStatus } = useScans();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [inputError, setInputError] = useState('');

  // Live URL validation feedback
  const getValidationFeedback = () => {
    if (!url.trim()) return null;
    const trimmed = url.trim();

    const isHttp = trimmed.startsWith('http://');
    const isHttps = trimmed.startsWith('https://');
    const hasProtocol = isHttp || isHttps;

    if (!hasProtocol && !trimmed.includes('.')) {
      return { valid: false, message: 'Please enter a valid domain or web address (e.g., example.com)' };
    }

    if (isHttp) {
      return { valid: true, warning: 'Warning: Insecure HTTP protocol detected (unencrypted connection)' };
    }

    return { valid: true, secure: isHttps };
  };

  const validation = getValidationFeedback();

  const handleScan = async (e) => {
    e.preventDefault();

    // Form input validation for empty input
    if (!url.trim()) {
      setInputError('Please enter a target URL or web domain to analyze.');
      return;
    }

    if (validation && !validation.valid) {
      setInputError(validation.message || 'Please enter a valid URL.');
      return;
    }

    setInputError('');
    setLoading(true);
    setResult(null);

    // Call real Flask backend if online
    if (backendStatus.connected) {
      try {
        const response = await zeroxApi.scanUrl(url);
        setResult(response);
        addScan({
          id: response.id || response.scan_id,
          scan_type: 'url',
          target_content: url,
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
        console.warn('Backend call failed, using demonstration mode:', err);
      }
    }

    // Demonstration fallback
    setTimeout(() => {
      const matched = URL_DEMO_PRESETS.find(p => p.url.trim() === url.trim());
      const demoData = matched?.demoResult || {
        risk_score: 80,
        threat_level: 'HIGH',
        fraud_verdict: 'FRAUD_DETECTED',
        confidence_score: 0.90,
        target_brand: 'Unknown Target',
        categories: ['Suspicious Domain', 'Potential Phishing'],
        summary: 'Demonstration analysis: URL heuristics indicate suspicious domain registration patterns and potential phishing redirect infrastructure.',
        flagged_indicators: [
          'Demonstration indicator: Unverified domain registrar authority',
          'Demonstration indicator: URL contains obfuscated query components'
        ],
        recommendations: [
          'Verify link destination before opening in a browser.',
          'Do not enter credentials or download attachments.'
        ],
      };

      const finalScan = {
        ...demoData,
        scan_type: 'url',
        target_content: url,
        isDemo: true
      };

      setResult(finalScan);
      addScan(finalScan);
      setLoading(false);
    }, 1200);
  };

  const handleSelectPreset = (preset) => {
    setUrl(preset.url);
    setActivePreset(preset.label);
    setInputError('');
    setResult(null);
  };

  const handleClear = () => {
    setUrl('');
    setResult(null);
    setActivePreset(null);
    setInputError('');
  };

  const handleCopyReport = () => {
    if (!result) return;
    const text = `ZEROX AI URL SCAN REPORT\nURL: ${url}\nThreat Level: ${result.threat_level}\nRisk Score: ${result.risk_score}/100\nTarget Brand: ${result.target_brand || 'None'}\nSummary: ${result.summary}`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-title">URL Threat & Phishing Scanner</h1>
        <p className="page-subtitle">
          Real-time domain inspection, typosquatting detection, homoglyph attack discovery, and login page spoofing analysis.
        </p>
      </div>

      <div className="scanner-layout">
        {/* Input Panel */}
        <div className="card scanner-input-panel">
          <div className="panel-title-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe size={18} color="var(--accent-red)" />
              <span style={{ fontWeight: 600 }}>URL Threat Inspector</span>
            </div>
            {url && (
              <button className="text-btn" onClick={handleClear}>
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>

          <form onSubmit={handleScan}>
            <div className={`url-input-group ${inputError ? 'input-invalid' : ''}`}>
              <div className="url-prefix-icon">
                {validation?.warning ? (
                  <Unlock size={16} color="var(--threat-high)" />
                ) : validation?.secure ? (
                  <Lock size={16} color="var(--threat-safe)" />
                ) : (
                  <Globe size={16} color="var(--text-muted)" />
                )}
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (inputError) setInputError('');
                }}
                placeholder="https://security-verify-account.com/login"
                className="cyber-input"
                disabled={loading}
              />
            </div>

            {/* Validation Feedback or Empty Input Error */}
            {inputError ? (
              <div className="validation-message error">
                <AlertCircle size={14} />
                <span>{inputError}</span>
              </div>
            ) : validation ? (
              <div className={`validation-message ${validation.warning ? 'warning' : validation.valid ? 'success' : 'error'}`}>
                {validation.warning ? (
                  <>
                    <AlertTriangle size={14} />
                    <span>{validation.warning}</span>
                  </>
                ) : validation.valid ? (
                  <>
                    <CheckCircle size={14} />
                    <span>URL structure is syntactically valid</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={14} />
                    <span>{validation.message}</span>
                  </>
                )}
              </div>
            ) : null}

            {/* Presets */}
            <div className="preset-selector">
              <span className="preset-label">Demonstration Presets (Click to inspect):</span>
              <div className="preset-chips">
                {URL_DEMO_PRESETS.map((p, idx) => (
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
                    <span>Inspecting Domain & Heuristics...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Scan URL for Threats</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick tips */}
          <div className="scanner-hint">
            <Info size={14} color="var(--accent-red)" />
            <span>
              ZEROX verifies DNS anomalies, SSL certificate validity, typosquatting homoglyphs, and known blacklists.
            </span>
          </div>
        </div>

        {/* Results Panel */}
        <div className="card scanner-result-panel">
          <div className="panel-title-bar">
            <span style={{ fontWeight: 600 }}>Forensic Domain Analysis</span>
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
                <Globe size={42} style={{ opacity: 0.5, color: 'var(--accent-red)' }} />
              </div>
              <h4>Awaiting URL Input</h4>
              <p>Enter a web address on the left and trigger analysis to view domain risk forensics.</p>
            </div>
          )}

          {/* Loading Radar */}
          {loading && (
            <div className="scanner-loading-state">
              <div className="cyber-radar">
                <div className="radar-sweep"></div>
                <div className="radar-core"></div>
              </div>
              <h4>Inspecting Web Link</h4>
              <p>Decomposing domain heuristics and cross-referencing threat telemetry...</p>
              <div className="scanning-steps">
                <span>✓ Domain syntax analysis</span>
                <span>• Checking homoglyph & typosquatting variations</span>
                <span>• Inspecting credential collection points</span>
              </div>
            </div>
          )}

          {/* Results */}
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
                  {result.target_brand && result.target_brand !== 'None' && (
                    <div className="target-brand-tag">
                      <span>Target Brand:</span> <strong>{result.target_brand}</strong>
                    </div>
                  )}
                  <p className="result-summary">{result.summary}</p>
                </div>
              </div>

              {/* Categories */}
              {result.categories && result.categories.length > 0 && (
                <div className="result-section">
                  <div className="section-title">Attack Vectors Identified</div>
                  <div className="tags-container">
                    {result.categories.map((c, i) => (
                      <span key={i} className="category-chip danger">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suspicious Indicators */}
              {result.flagged_indicators && result.flagged_indicators.length > 0 && (
                <div className="result-section">
                  <div className="section-title text-warning">
                    <AlertTriangle size={14} />
                    <span>Suspicious Indicators & Heuristics</span>
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
                    <span>Security Recommendations</span>
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
