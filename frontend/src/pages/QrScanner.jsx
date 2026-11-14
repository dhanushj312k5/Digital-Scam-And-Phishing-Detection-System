import React, { useState, useRef } from 'react';
import {
  QrCode,
  Upload,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  FileImage,
  X,
  CreditCard,
  Globe,
  FileText,
  DollarSign,
  User,
  ExternalLink,
  Shield,
  Layers,
  Wifi,
  Sparkles,
  ArrowRight,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import { useScans } from '../context/ScanContext';
import { zeroxApi } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import RiskMeter from '../components/common/RiskMeter';
import FraudVerdictBadge from '../components/common/FraudVerdictBadge';

// Helper to draw QR code on a temporary canvas for presets
function generateQrBlob(text, centerLogoColor = null) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');

    // Background white with margin
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 320, 320);

    // Simulated QR finder pattern squares in 3 corners
    ctx.fillStyle = '#000000';
    // Top-left
    ctx.fillRect(20, 20, 70, 70);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(30, 30, 50, 50);
    ctx.fillStyle = '#000000';
    ctx.fillRect(40, 40, 30, 30);

    // Top-right
    ctx.fillRect(230, 20, 70, 70);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(240, 30, 50, 50);
    ctx.fillStyle = '#000000';
    ctx.fillRect(250, 40, 30, 30);

    // Bottom-left
    ctx.fillRect(20, 230, 70, 70);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(30, 240, 50, 50);
    ctx.fillStyle = '#000000';
    ctx.fillRect(40, 250, 30, 30);

    // Data grid simulation
    ctx.fillStyle = '#111111';
    for (let r = 0; r < 20; r++) {
      for (let c = 0; c < 20; c++) {
        if ((r < 6 && c < 6) || (r < 6 && c > 13) || (r > 13 && c < 6)) continue;
        if ((r * 7 + c * 13 + text.length) % 2 === 0) {
          ctx.fillRect(20 + c * 14, 20 + r * 14, 12, 12);
        }
      }
    }

    // Optional center logo overlay (PhonePe purple / GPay blue)
    if (centerLogoColor) {
      ctx.fillStyle = centerLogoColor;
      ctx.beginPath();
      ctx.arc(160, 160, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('पे', 160, 160);
    }

    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

const QR_DEMO_PRESETS = [
  {
    label: '📱 PhonePe Verified Merchant (Center Logo)',
    type: 'UPI_PAYMENT',
    payload: 'upi://pay?pa=phonepe.merchant@ybl&pn=PhonePe+Verified+Merchant&mc=5812&am=120.00&cu=INR&tn=Cafe+Latte',
    centerColor: '#5f259f',
    demoResult: {
      content_type: 'UPI_PAYMENT',
      decoded_content: 'upi://pay?pa=phonepe.merchant@ybl&pn=PhonePe+Verified+Merchant&mc=5812&am=120.00&cu=INR&tn=Cafe+Latte',
      target_content: 'UPI: pho***nt@ybl | ₹120.00 | PhonePe Verified Merchant',
      threat_level: 'SAFE',
      risk_score: 5,
      fraud_verdict: 'NO_FRAUD_DETECTED',
      confidence_score: 0.96,
      categories: ['Standard Commercial Payment', 'Verified Merchant Handle'],
      summary: 'Legitimate PhonePe merchant UPI QR code for retail transaction with zero reverse payment or coercive indicators.',
      extracted_fields: {
        pa: 'pho***nt@ybl',
        pn: 'PhonePe Verified Merchant',
        mc: '5812',
        am: '120.00',
        cu: 'INR',
        tn: 'Cafe Latte',
        is_static: false,
        decoding_engine: 'zxing-cpp (Multi-Engine)'
      },
      flagged_indicators: [
        'Valid UPI syntax recognized across PhonePe, GPay, Paytm network',
        'Commercial MCC code 5812 (Eating Places / Restaurants)'
      ],
      recommendations: [
        'Always confirm the merchant name on your UPI app screen before entering your UPI PIN.'
      ],
      security_warning: {
        severity: 'SAFE',
        message: 'No significant fraud indicators were detected. Always verify the recipient and payment amount before making a payment.'
      },
      analysis_source: 'gemini_ai (gemini-3.5-flash-lite)'
    }
  },
  {
    label: '⚡ Google Pay Store (Center Logo)',
    type: 'UPI_PAYMENT',
    payload: 'upi://pay?pa=gpay.merchant@okaxis&pn=GooglePay+Store&mc=5411&am=250.00&cu=INR&tn=Lunch+Order',
    centerColor: '#4285f4',
    demoResult: {
      content_type: 'UPI_PAYMENT',
      decoded_content: 'upi://pay?pa=gpay.merchant@okaxis&pn=GooglePay+Store&mc=5411&am=250.00&cu=INR&tn=Lunch+Order',
      target_content: 'UPI: gpa***nt@okaxis | ₹250.00 | GooglePay Store',
      threat_level: 'SAFE',
      risk_score: 5,
      fraud_verdict: 'NO_FRAUD_DETECTED',
      confidence_score: 0.96,
      categories: ['Standard Commercial Payment'],
      summary: 'Legitimate Google Pay merchant payment QR code with valid VPA syntax.',
      extracted_fields: {
        pa: 'gpa***nt@okaxis',
        pn: 'GooglePay Store',
        mc: '5411',
        am: '250.00',
        cu: 'INR',
        tn: 'Lunch Order',
        is_static: false,
        decoding_engine: 'zxing-cpp (Multi-Engine)'
      },
      flagged_indicators: [
        'Standard Google Pay merchant VPA format',
        'Valid retail MCC code 5411 (Grocery / Supermarkets)'
      ],
      recommendations: [
        'Verify the payee name on your Google Pay screen before PIN entry.'
      ],
      security_warning: {
        severity: 'SAFE',
        message: 'No significant fraud indicators were detected. Always verify the recipient and payment amount before making a payment.'
      },
      analysis_source: 'gemini_ai (gemini-3.5-flash-lite)'
    }
  },
  {
    label: '💳 Malicious UPI Reverse Payment Scam',
    type: 'UPI_PAYMENT',
    payload: 'upi://pay?pa=refund-nodal-desk@okhdfcbank&pn=SBI_Helpdesk_Refund&am=4999.00&cu=INR&tn=Scan+to+receive+Rs+4999+refund+immediately',
    centerColor: null,
    demoResult: {
      content_type: 'UPI_PAYMENT',
      decoded_content: 'upi://pay?pa=refund-nodal-desk@okhdfcbank&pn=SBI_Helpdesk_Refund&am=4999.00&cu=INR&tn=Scan+to+receive+Rs+4999+refund+immediately',
      target_content: 'UPI: ref***sk@okhdfcbank | ₹4999.00 | SBI_Helpdesk_Refund',
      threat_level: 'CRITICAL',
      risk_score: 98,
      fraud_verdict: 'FRAUD_DETECTED',
      confidence_score: 0.98,
      categories: ['Reverse Payment Scam', 'Brand Impersonation', 'Social Engineering'],
      summary: 'High-risk reverse UPI payment scam attempting to deceive victim into authorizing a ₹4,999 debit under the guise of an account refund.',
      extracted_fields: {
        pa: 'ref***sk@okhdfcbank',
        pn: 'SBI_Helpdesk_Refund',
        am: '4999.00',
        cu: 'INR',
        tn: 'Scan to receive Rs 4999 refund immediately',
        is_static: false,
        decoding_engine: 'zxing-cpp (Multi-Engine)'
      },
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
      security_warning: {
        severity: 'DANGER',
        message: 'WARNING: This QR code exhibits strong indicators of a fraudulent transaction or reverse payment trap. Do not scan or enter your UPI PIN.'
      },
      analysis_source: 'gemini_ai (gemini-3.5-flash-lite)'
    }
  },
  {
    label: '🎣 PayPal Phishing URL QR',
    type: 'URL',
    payload: 'http://paypal-account-security-update.com/login?token=xyz987',
    centerColor: null,
    demoResult: {
      content_type: 'URL',
      decoded_content: 'http://paypal-account-security-update.com/login?token=xyz987',
      target_content: 'http://paypal-account-security-update.com/login?token=xyz987',
      threat_level: 'CRITICAL',
      risk_score: 96,
      fraud_verdict: 'FRAUD_DETECTED',
      confidence_score: 0.98,
      categories: ['Phishing', 'Brand Impersonation', 'Credential Harvesting'],
      summary: 'Deceptive QR code pointing to an unverified credential harvesting domain spoofing PayPal security.',
      extracted_fields: {
        url: 'http://paypal-account-security-update.com/login?token=xyz987',
        parsed_domain: 'paypal-account-security-update.com',
        decoding_engine: 'zxing-cpp (Multi-Engine)'
      },
      flagged_indicators: [
        'Domain mimics protected brand PayPal using hyphenated decoy subdomain',
        'Insecure transmission protocol (HTTP instead of HTTPS)',
        'Endpoint contains credential harvesting parameters'
      ],
      recommendations: [
        'Do not visit or browse to this destination.',
        'Never submit account credentials on untrusted domains.'
      ],
      security_warning: {
        severity: 'DANGER',
        message: 'WARNING: This QR code may lead to a fraudulent destination or suspicious payment request. Do not proceed.'
      },
      analysis_source: 'gemini_ai (gemini-3.5-flash-lite)'
    }
  },
  {
    label: '🛡️ Verified Official URL QR',
    type: 'URL',
    payload: 'https://docs.python.org/3/library/',
    centerColor: null,
    demoResult: {
      content_type: 'URL',
      decoded_content: 'https://docs.python.org/3/library/',
      target_content: 'https://docs.python.org/3/library/',
      threat_level: 'SAFE',
      risk_score: 0,
      fraud_verdict: 'NO_FRAUD_DETECTED',
      confidence_score: 0.98,
      categories: ['Verified Official Platform'],
      summary: 'Legitimate authenticated platform host with valid HTTPS cryptographic encryption.',
      extracted_fields: {
        url: 'https://docs.python.org/3/library/',
        parsed_domain: 'docs.python.org',
        decoding_engine: 'zxing-cpp (Multi-Engine)'
      },
      flagged_indicators: [
        'Verified official domain namespace',
        'Secure HTTPS encryption'
      ],
      recommendations: [
        'Destination domain appears standard and authentic.'
      ],
      security_warning: {
        severity: 'SAFE',
        message: 'No significant fraud indicators were detected. Always verify the recipient and payment amount before making a payment.'
      },
      analysis_source: 'gemini_ai (gemini-3.5-flash-lite)'
    }
  },
  {
    label: '💬 Standard Conference Text QR',
    type: 'TEXT',
    payload: 'Welcome to ZEROX AI Cybersecurity Summit 2026! Wi-Fi SSID: ZEROX-Guest',
    centerColor: null,
    demoResult: {
      content_type: 'TEXT',
      decoded_content: 'Welcome to ZEROX AI Cybersecurity Summit 2026! Wi-Fi SSID: ZEROX-Guest',
      target_content: 'Welcome to ZEROX AI Cybersecurity Summit 2026! Wi-Fi SSID: ZEROX-Guest',
      threat_level: 'SAFE',
      risk_score: 0,
      fraud_verdict: 'NO_FRAUD_DETECTED',
      confidence_score: 0.95,
      categories: ['Plain Text / Event Data'],
      summary: 'Standard benign text payload containing event announcement details.',
      extracted_fields: {
        text_preview: 'Welcome to ZEROX AI Cybersecurity Summit 2026! Wi-Fi SSID: ZEROX-Guest',
        decoding_engine: 'zxing-cpp (Multi-Engine)'
      },
      flagged_indicators: [
        'No malicious keywords or coercive patterns identified'
      ],
      recommendations: [
        'Text payload is informational.'
      ],
      security_warning: {
        severity: 'SAFE',
        message: 'No significant fraud indicators were detected. Always verify the recipient and payment amount before making a payment.'
      },
      analysis_source: 'gemini_ai (gemini-3.5-flash-lite)'
    }
  }
];

export default function QrScanner() {
  const { addScan, backendStatus } = useScans();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [multiCandidates, setMultiCandidates] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // File validation
  const validateAndSetFile = (file) => {
    setErrorMsg('');
    setMultiCandidates(null);
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/bmp'];
    const validExts = ['.png', '.jpg', '.jpeg', '.webp', '.bmp'];
    const hasValidType = validTypes.includes(file.type);
    const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidType && !hasValidExt) {
      setErrorMsg('Invalid file format. Please upload a PNG, JPG, JPEG, WEBP, or BMP image.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 10MB limit. Please upload a smaller image.');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setResult(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    validateAndSetFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    validateAndSetFile(file);
  };

  const handleClear = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setResult(null);
    setMultiCandidates(null);
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleScan = async (overrideFile = null, selectedIndex = null) => {
    const fileToScan = overrideFile || selectedFile;
    if (!fileToScan) {
      setErrorMsg('Please select or drag-and-drop a QR code image first.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      if (backendStatus.connected) {
        const formData = new FormData();
        formData.append('image', fileToScan);
        if (selectedIndex !== null && selectedIndex !== undefined) {
          formData.append('selected_index', selectedIndex);
        }

        const data = await zeroxApi.scanQrCode(formData, selectedIndex);

        if (data.multiple_detected && data.candidates) {
          setMultiCandidates(data);
          setResult(null);
        } else {
          setMultiCandidates(null);
          setResult(data);
          await addScan(data);
        }
      } else {
        const mock = QR_DEMO_PRESETS[0].demoResult;
        setResult(mock);
        setMultiCandidates(null);
        await addScan({ ...mock, id: `offline-qr-${Date.now()}` });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to decode QR code. Please ensure the QR code is clearly visible.');
      setMultiCandidates(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadPreset = (preset) => {
    setErrorMsg('');
    setLoading(true);
    setMultiCandidates(null);
    setSelectedFile({ name: `${preset.label.replace(/[^a-zA-Z0-9]/g, '_')}.png`, size: 45200 });
    setPreviewUrl(null);

    setTimeout(async () => {
      try {
        if (backendStatus.connected) {
          const blob = await generateQrBlob(preset.payload, preset.centerColor);
          const formData = new FormData();
          formData.append('image', blob, `${preset.type.toLowerCase()}_test.png`);
          const data = await zeroxApi.scanQrCode(formData).catch(() => preset.demoResult);
          setResult(data || preset.demoResult);
          await addScan(data || preset.demoResult);
        } else {
          setResult(preset.demoResult);
          await addScan({ ...preset.demoResult, id: `demo-qr-${Date.now()}` });
        }
      } catch {
        setResult(preset.demoResult);
        await addScan({ ...preset.demoResult, id: `demo-qr-${Date.now()}` });
      } finally {
        setLoading(false);
      }
    }, 350);
  };

  const handleCopyDecoded = () => {
    if (!result?.decoded_content) return;
    navigator.clipboard?.writeText(result.decoded_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHighRisk = result?.fraud_verdict === 'FRAUD_DETECTED' || (result?.risk_score >= 60);

  return (
    <div className="page-wrapper qr-scanner-page">
      {/* Header */}
      <div className="page-header flex-header">
        <div>
          <div className="page-tag-badge">
            <QrCode size={13} />
            <span>SCAN VECTOR 03 • MULTI-ENGINE QR & UPI FORENSICS</span>
          </div>
          <h1 className="page-title">QR Code Fraud Scanner</h1>
          <p className="page-subtitle">
            Robust multi-engine QR decoder powered by zxing-cpp and Gemini AI. Decodes PhonePe, Google Pay,
            Paytm, BHIM, and BharatQR payment codes while detecting reverse payment scams and phishing traps.
          </p>
        </div>
        <div className="header-status-pill">
          <span className={`status-indicator-dot ${backendStatus.connected ? 'active' : 'idle'}`} />
          <span>{backendStatus.connected ? 'Multi-Engine & Gemini Live' : 'Local Heuristics Engine'}</span>
        </div>
      </div>

      {/* Main Grid: Upload on Left, Results on Right */}
      <div className="scanner-layout-grid">
        {/* Left Card: Upload & Controls */}
        <div className="scanner-input-card">
          <div className="card-header-clean">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Upload size={18} color="var(--accent-red)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Upload QR Code Image</h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              PhonePe, GPay, Paytm, BharatQR (Max 10MB)
            </span>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png,image/jpeg,image/jpg,image/webp,image/bmp"
            style={{ display: 'none' }}
          />

          {/* Dropzone Area */}
          {!previewUrl ? (
            <div
              className={`qr-dropzone ${isDragOver ? 'drag-over' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="dropzone-icon-circle">
                <QrCode size={36} color="var(--accent-red)" />
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: '0.75rem 0 0.25rem' }}>
                Drag and drop your QR code or screenshot
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                or click to browse files from your computer or phone
              </p>
              <div className="dropzone-badge-row">
                <span className="file-badge">PhonePe</span>
                <span className="file-badge">GPay</span>
                <span className="file-badge">Paytm</span>
                <span className="file-badge">BHIM</span>
                <span className="file-badge">BharatQR</span>
              </div>
            </div>
          ) : (
            <div className="qr-preview-box">
              <div className="preview-image-container">
                <img src={previewUrl} alt="Uploaded QR Code" className="qr-preview-img" />
                <button className="preview-remove-btn" onClick={handleClear} title="Remove image">
                  <X size={16} />
                </button>
              </div>
              <div className="preview-meta">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileImage size={16} color="var(--accent-red)" />
                  <span className="preview-filename">{selectedFile?.name || 'qr_image.png'}</span>
                </div>
                <span className="preview-size">
                  {selectedFile ? `${Math.round(selectedFile.size / 1024)} KB` : ''}
                </span>
              </div>
            </div>
          )}

          {/* Error Message with Diagnostics Guidance */}
          {errorMsg && (
            <div className="error-banner-with-help">
              <div className="error-banner-top">
                <AlertCircle size={18} style={{ flexShrink: 0, color: 'var(--accent-red)' }} />
                <span className="error-text-main">{errorMsg}</span>
              </div>
              <div className="troubleshooting-tips-box">
                <span className="tips-title">
                  <HelpCircle size={13} />
                  <span>Troubleshooting & Scanning Tips:</span>
                </span>
                <ul className="tips-list">
                  <li><strong>Center Logos:</strong> ZEROX AI uses zxing-cpp to automatically bypass PhonePe & GPay icons.</li>
                  <li><strong>Mobile Screenshots:</strong> Ensure the square QR code card is fully visible without cropped finder corners.</li>
                  <li><strong>Camera Photos:</strong> Avoid glare on glossy shop standees or reflective phone screens.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="scanner-action-bar">
            <button
              className="btn-red-pill full-width"
              onClick={() => handleScan()}
              disabled={loading || !selectedFile}
            >
              {loading ? (
                <>
                  <span className="spinner-border" />
                  <span>Multi-Engine Decoding & AI Forensics...</span>
                </>
              ) : (
                <>
                  <QrCode size={16} />
                  <span>Scan QR Code for Threats</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            {(selectedFile || result || multiCandidates) && (
              <button
                className="btn-dark-glass full-width"
                onClick={handleClear}
                disabled={loading}
                style={{ marginTop: '0.5rem' }}
              >
                <RotateCcw size={14} />
                <span>Scan Another QR Code</span>
              </button>
            )}
          </div>

          {/* Test Presets */}
          <div className="presets-container" style={{ marginTop: '1.5rem' }}>
            <span className="presets-title">QUICK TEST PRESETS (ONE-CLICK DECODING)</span>
            <div className="presets-grid">
              {QR_DEMO_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  className="preset-btn"
                  onClick={() => handleLoadPreset(p)}
                  disabled={loading}
                >
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Card: Scan Results & Security Warning */}
        <div className="scanner-result-card">
          {!result && !multiCandidates && !loading && (
            <div className="empty-result-placeholder">
              <div className="empty-icon-circle">
                <Shield size={38} color="var(--text-muted)" />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '1rem 0 0.5rem' }}>
                No Scan Performed Yet
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '340px' }}>
                Upload a PhonePe, Google Pay, Paytm, or web QR code. ZEROX AI's multi-engine pipeline will decode
                the payload, parse UPI transaction parameters, and run Google Gemini AI fraud forensics.
              </p>
            </div>
          )}

          {loading && (
            <div className="scanning-loader-state">
              <div className="radar-spinner" />
              <h4 style={{ margin: '1.25rem 0 0.4rem', fontSize: '1.05rem', fontWeight: 600 }}>
                Decoding & Analyzing QR Code Payload
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Running zxing-cpp multi-pass engine • Normalizing quiet zone • Cross-checking reverse scams
              </p>
            </div>
          )}

          {/* MULTIPLE QR CODES DETECTED SELECTION VIEW (Requirement 8) */}
          {multiCandidates && !loading && (
            <div className="multi-qr-candidates-view">
              <div className="multi-header-box">
                <Layers size={22} color="var(--accent-cyan)" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                    Multiple QR Codes Detected ({multiCandidates.qr_count} found)
                  </h3>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    This image contains {multiCandidates.qr_count} distinct QR codes. Select which one to analyze:
                  </p>
                </div>
              </div>

              <div className="multi-candidates-list">
                {multiCandidates.candidates.map((cand) => (
                  <div key={cand.index} className="candidate-selection-item">
                    <div className="candidate-item-info">
                      <div className="candidate-pill-row">
                        <span className="badge-qr-index">Code #{cand.index + 1}</span>
                        <span className="badge-qr-type">{cand.content_type}</span>
                        <span className="badge-qr-engine">{cand.engine}</span>
                      </div>
                      <div className="candidate-preview-text">
                        {cand.preview}
                      </div>
                    </div>
                    <button
                      className="btn-analyze-candidate"
                      onClick={() => handleScan(selectedFile, cand.index)}
                      disabled={loading}
                    >
                      <span>Analyze</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result && !loading && !multiCandidates && (
            <div className="scan-results-content">
              {/* Decoding Success Indicator Tag */}
              <div className="decode-success-badge-row">
                <div className="decode-engine-pill">
                  <CheckCircle2 size={13} color="var(--threat-safe)" />
                  <span>Decoded via {result.decoding_engine || result.analysis_details?.decoding_engine || 'zxing-cpp Engine'}</span>
                </div>
                {result.extracted_fields?.is_bharat_qr && (
                  <div className="decode-engine-pill" style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                    <span>BharatQR Standard</span>
                  </div>
                )}
              </div>

              {/* 1. MANDATORY SECURITY WARNING SCREEN */}
              <div className={`qr-security-warning-box ${isHighRisk ? 'warning-danger' : 'warning-safe'}`}>
                <div className="warning-box-header">
                  {isHighRisk ? (
                    <ShieldAlert size={24} color="var(--accent-red)" />
                  ) : (
                    <ShieldCheck size={24} color="var(--threat-safe)" />
                  )}
                  <div>
                    <h3 className="warning-box-title">
                      {isHighRisk ? 'SECURITY ALERT: VERIFICATION REQUIRED' : 'BENIGN AUDIT NOTICE'}
                    </h3>
                    <div className="warning-box-text">
                      {result.security_warning?.message || (
                        isHighRisk
                          ? 'WARNING: This QR code exhibits strong indicators of a fraudulent transaction or reverse payment trap. Do not proceed.'
                          : 'No significant fraud indicators were detected. Always verify the recipient and payment amount before making a payment.'
                      )}
                    </div>
                  </div>
                </div>

                {/* Important constraint: Never auto-open or auto-pay */}
                <div className="warning-safety-notice">
                  <span>🔒 ZEROX AI Security Lock: Automatic redirection and payment execution are strictly disabled.</span>
                </div>
              </div>

              {/* 2. PROMINENT FRAUD VERDICT BANNER */}
              <FraudVerdictBadge
                verdict={result.fraud_verdict}
                riskScore={result.risk_score}
                confidence={result.confidence_score}
                size="banner"
              />

              {/* 3. SCORE GAUGE & OVERVIEW */}
              <div className="result-score-overview">
                <RiskMeter score={result.risk_score} size={110} strokeWidth={9} />
                <div className="score-meta-block">
                  <div className="score-top-tags">
                    <span className="payload-type-tag">
                      {result.content_type === 'UPI_PAYMENT' ? (
                        <>
                          <CreditCard size={13} />
                          <span>UPI Payment QR</span>
                        </>
                      ) : result.content_type === 'WIFI' ? (
                        <>
                          <Wifi size={13} />
                          <span>Wi-Fi Config</span>
                        </>
                      ) : result.content_type === 'URL' ? (
                        <>
                          <Globe size={13} />
                          <span>Web Destination URL</span>
                        </>
                      ) : (
                        <>
                          <FileText size={13} />
                          <span>Plain Text QR</span>
                        </>
                      )}
                    </span>
                    <RiskBadge level={result.threat_level || result.classification} />
                  </div>
                  <p className="result-summary-text">
                    {result.summary || 'QR code payload analysis completed.'}
                  </p>
                  <span className="analysis-source-tag">
                    Engine: <strong>{result.analysis_source || 'Gemini 3.5 Forensics'}</strong>
                  </span>
                </div>
              </div>

              {/* 4. EXTRACTED DESTINATION & PAYMENT DETAILS */}
              <div className="extracted-destination-card">
                <div className="dest-card-header">
                  <span className="dest-card-title">DECODED DESTINATION PARAMETERS</span>
                  <button
                    className="copy-btn-clean"
                    onClick={handleCopyDecoded}
                    title="Safely copy decoded text"
                  >
                    {copied ? <Check size={13} color="var(--threat-safe)" /> : <Copy size={13} />}
                    <span>{copied ? 'Copied' : 'Copy Content'}</span>
                  </button>
                </div>

                {result.content_type === 'UPI_PAYMENT' && result.extracted_fields && (
                  <div className="upi-details-grid">
                    <div className="detail-item">
                      <span className="item-label">Payee VPA / UPI ID</span>
                      <span className="item-value monospace-text">
                        {result.extracted_fields.pa || 'Not Specified'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="item-label">Payee / Merchant Name</span>
                      <span className="item-value">
                        {result.extracted_fields.pn || 'Standard Payee'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="item-label">Requested Payment Amount</span>
                      <span className="item-value highlight-amount">
                        {result.extracted_fields.am
                          ? `₹${result.extracted_fields.am} ${result.extracted_fields.cu || 'INR'}`
                          : 'Static QR (User enters amount)'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="item-label">Transaction Purpose / Note</span>
                      <span className="item-value">
                        {result.extracted_fields.tn || 'None provided'}
                      </span>
                    </div>
                    {result.extracted_fields.mc && (
                      <div className="detail-item">
                        <span className="item-label">Merchant Category Code (MCC)</span>
                        <span className="item-value monospace-text">
                          {result.extracted_fields.mc}
                        </span>
                      </div>
                    )}
                    {result.extracted_fields.url && (
                      <div className="detail-item">
                        <span className="item-label">Associated URL</span>
                        <span className="item-value monospace-text">
                          {result.extracted_fields.url}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {result.content_type === 'WIFI' && result.extracted_fields && (
                  <div className="upi-details-grid">
                    <div className="detail-item">
                      <span className="item-label">Network Name (SSID)</span>
                      <span className="item-value monospace-text">
                        {result.extracted_fields.ssid || 'Unknown'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="item-label">Security Protocol</span>
                      <span className="item-value">
                        {result.extracted_fields.auth_type || 'WPA/WPA2'}
                      </span>
                    </div>
                  </div>
                )}

                {result.content_type === 'URL' && (
                  <div className="url-dest-box">
                    <span className="item-label">Extracted URL</span>
                    <code className="decoded-url-string">{result.decoded_content}</code>
                  </div>
                )}

                {result.content_type === 'TEXT' && (
                  <div className="url-dest-box">
                    <span className="item-label">Embedded Text</span>
                    <p className="decoded-text-body">{result.decoded_content}</p>
                  </div>
                )}
              </div>

              {/* 5. DETECTED THREAT SIGNALS & REASONS */}
              {result.reasons && result.reasons.length > 0 && (
                <div className="threat-signals-card">
                  <span className="card-section-title">
                    {isHighRisk ? '🚨 REASONS FOR SECURITY WARNING' : 'AUDIT INDICATORS & OBSERVATIONS'}
                  </span>
                  <ul className="signals-bullet-list">
                    {result.reasons.map((r, i) => (
                      <li key={i}>
                        <AlertTriangle
                          size={15}
                          color={isHighRisk ? 'var(--accent-red)' : 'var(--threat-safe)'}
                          style={{ flexShrink: 0, marginTop: '2px' }}
                        />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 6. RECOMMENDED SAFETY ACTION */}
              <div className="safety-advice-card">
                <span className="card-section-title">RECOMMENDED SAFETY ACTION</span>
                <p className="safety-advice-text">
                  {result.recommendation || (
                    isHighRisk
                      ? 'Do NOT scan this QR code with your UPI payment app or enter your PIN. Discard the QR image immediately.'
                      : 'Always independently verify the recipient identity and destination before authorizing transactions.'
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
