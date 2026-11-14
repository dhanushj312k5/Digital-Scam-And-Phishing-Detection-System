import React, { useState } from 'react';
import {
  Search,
  Download,
  Trash2,
  Eye,
  MessageSquareWarning,
  Globe,
  QrCode,
  Users,
  RotateCcw,
  AlertOctagon
} from 'lucide-react';
import { useScans } from '../context/ScanContext';
import RiskBadge from '../components/common/RiskBadge';
import FraudVerdictBadge, { normalizeVerdict } from '../components/common/FraudVerdictBadge';
import ScanDetailModal from '../components/common/ScanDetailModal';

export default function ScanHistory() {
  const { scans, deleteScan, clearHistory, resetToDemo } = useScans();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [verdictFilter, setVerdictFilter] = useState('all');
  const [selectedScan, setSelectedScan] = useState(null);

  const filteredScans = scans.filter((scan) => {
    // Type filter
    if (typeFilter !== 'all') {
      const st = String(scan.scan_type || '').toLowerCase();
      if (typeFilter === 'qr_code') {
        if (st !== 'qr_code' && st !== 'qr') return false;
      } else if (typeFilter === 'social_media') {
        if (st !== 'social_media' && st !== 'social') return false;
      } else if (st !== typeFilter) {
        return false;
      }
    }

    // Level filter
    if (levelFilter === 'threats' && scan.risk_score < 60) return false;
    if (levelFilter === 'safe' && scan.risk_score >= 30) return false;

    // Fraud Verdict filter
    if (verdictFilter !== 'all') {
      const v = normalizeVerdict(scan.fraud_verdict, scan.risk_score);
      if (verdictFilter === 'fraud' && v !== 'FRAUD_DETECTED') return false;
      if (verdictFilter === 'clean' && v !== 'NO_FRAUD_DETECTED') return false;
      if (verdictFilter === 'review' && v !== 'NEEDS_REVIEW') return false;
    }

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTarget = scan.target_content?.toLowerCase().includes(q);
      const matchSummary = scan.summary?.toLowerCase().includes(q);
      const matchCategory = scan.categories?.some((c) => c.toLowerCase().includes(q));
      const matchVerdict = scan.fraud_verdict?.toLowerCase().includes(q);
      if (!matchTarget && !matchSummary && !matchCategory && !matchVerdict) return false;
    }

    return true;
  });

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(scans, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `zerox_scan_audit_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Type', 'Target', 'Fraud Verdict', 'Confidence', 'Threat Level', 'Risk Score', 'Date'];
    const rows = scans.map((s) => [
      `"${s.id}"`,
      `"${s.scan_type}"`,
      `"${(s.target_content || '').replace(/"/g, '""')}"`,
      `"${normalizeVerdict(s.fraud_verdict, s.risk_score)}"`,
      s.confidence_score ?? 0.85,
      `"${s.threat_level}"`,
      s.risk_score,
      `"${s.created_at}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `zerox_scan_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="page-wrapper">
      <div className="page-header flex-header">
        <div>
          <h1 className="page-title">Scan Audit History</h1>
          <p className="page-subtitle">
            Comprehensive audit log of all message and URL scans performed by ZEROX AI.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleExportCSV} title="Export as CSV table">
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          <button className="btn-secondary" onClick={handleExportJSON} title="Export complete JSON records">
            <Download size={15} />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      <div className="card">
        {/* Controls Bar */}
        <div className="history-controls-bar">
          {/* Search box */}
          <div className="search-input-wrapper">
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search content, domains, or attack categories..."
              className="search-input"
            />
          </div>

          {/* Filter Pills */}
          <div className="filter-group">
            <div className="segmented-control">
              {[
                { id: 'all', label: 'All Types' },
                { id: 'message', label: 'Messages' },
                { id: 'url', label: 'URLs' },
                { id: 'qr_code', label: 'QR Codes' },
                { id: 'social_media', label: 'Social Media' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTypeFilter(tab.id)}
                  className={`segment-btn ${typeFilter === tab.id ? 'active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="segmented-control">
              {[
                { id: 'all', label: 'All Risks' },
                { id: 'threats', label: 'Threats Only' },
                { id: 'safe', label: 'Safe Only' },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setLevelFilter(lvl.id)}
                  className={`segment-btn ${levelFilter === lvl.id ? 'active' : ''}`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>

            <div className="segmented-control">
              {[
                { id: 'all', label: 'All Verdicts' },
                { id: 'fraud', label: '🚨 Fraud' },
                { id: 'clean', label: '🛡️ No Fraud' },
                { id: 'review', label: '⚠️ Review' },
              ].map((vf) => (
                <button
                  key={vf.id}
                  onClick={() => setVerdictFilter(vf.id)}
                  className={`segment-btn ${verdictFilter === vf.id ? 'active' : ''}`}
                >
                  {vf.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Counter and management actions */}
        <div className="history-meta-bar">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing <strong>{filteredScans.length}</strong> of <strong>{scans.length}</strong> scan records
          </span>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="text-btn" onClick={resetToDemo} title="Restore initial demonstration dataset">
              <RotateCcw size={13} />
              <span>Reset Samples</span>
            </button>
            {scans.length > 0 && (
              <button
                className="text-btn text-danger"
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all scan history?')) {
                    clearHistory();
                  }
                }}
              >
                <Trash2 size={13} />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* History Table */}
        {filteredScans.length === 0 ? (
          <div className="empty-history-box">
            <AlertOctagon size={48} style={{ opacity: 0.4, margin: '0 auto 1rem' }} />
            <h4>No Scans Found</h4>
            <p>No records matched your search filters. Try clearing your search term or running a new scan.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="cyber-table">
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>TYPE</th>
                  <th>TARGET CONTENT</th>
                  <th style={{ width: '150px' }}>FRAUD VERDICT</th>
                  <th style={{ width: '130px' }}>CLASSIFICATION</th>
                  <th style={{ width: '110px' }}>RISK SCORE</th>
                  <th style={{ width: '140px' }}>TIMESTAMP</th>
                  <th style={{ width: '90px', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredScans.map((scan) => (
                  <tr key={scan.id}>
                    <td>
                      <span className="type-pill">
                        {scan.scan_type === 'message' ? (
                          <MessageSquareWarning size={13} />
                        ) : ['qr', 'qr_code'].includes(String(scan.scan_type || '').toLowerCase()) ? (
                          <QrCode size={13} />
                        ) : ['social', 'social_media'].includes(String(scan.scan_type || '').toLowerCase()) ? (
                          <Users size={13} color="#ec4899" />
                        ) : (
                          <Globe size={13} />
                        )}
                        <span>
                          {['qr', 'qr_code'].includes(String(scan.scan_type || '').toLowerCase())
                            ? 'QR'
                            : ['social', 'social_media'].includes(String(scan.scan_type || '').toLowerCase())
                            ? 'Social'
                            : scan.scan_type}
                        </span>
                      </span>
                    </td>
                    <td className="content-cell">
                      <div className="truncate-text" title={scan.target_content}>
                        {scan.target_content}
                      </div>
                      <div className="subtext-line">
                        {scan.summary ? (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {scan.summary}
                          </span>
                        ) : null}
                        {scan.isDemo && <span className="demo-tag">Sample</span>}
                      </div>
                    </td>
                    <td>
                      <FraudVerdictBadge
                        verdict={scan.fraud_verdict}
                        riskScore={scan.risk_score}
                        confidence={scan.confidence_score}
                        size="pill"
                      />
                    </td>
                    <td>
                      <RiskBadge level={scan.threat_level} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span
                          className="score-cell"
                          style={{
                            color: scan.risk_score >= 60 ? 'var(--threat-critical)' : scan.risk_score >= 30 ? 'var(--threat-medium)' : 'var(--threat-safe)'
                          }}
                        >
                          {scan.risk_score}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/100</span>
                      </div>
                    </td>
                    <td className="time-cell">
                      {new Date(scan.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          className="action-btn"
                          onClick={() => setSelectedScan(scan)}
                          title="Inspect Detailed Forensic Breakdown"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => deleteScan(scan.id)}
                          title="Delete Record"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Forensic Inspection Modal */}
      {selectedScan && (
        <ScanDetailModal scan={selectedScan} onClose={() => setSelectedScan(null)} />
      )}
    </div>
  );
}
