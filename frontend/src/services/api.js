/**
 * ZEROX AI API Client
 * Connects frontend views with Python Flask endpoints.
 */

const API_BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok || !data.success) {
    const errorMsg = data?.error?.message || 'Network response was not ok';
    throw new Error(errorMsg);
  }

  return data.data;
}

export const zeroxApi = {
  // Health & Status
  getHealth: () => request('/health'),

  // Scanners
  scanMessage: (message) =>
    request('/scan/message', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  scanUrl: (url) =>
    request('/scan/url', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),

  scanQrCode: async (payload, selectedIndex = null) => {
    let response;
    if (payload instanceof FormData) {
      if (selectedIndex !== null && selectedIndex !== undefined) {
        payload.append('selected_index', selectedIndex);
      }
      response = await fetch(`${API_BASE_URL}/scan/qr`, {
        method: 'POST',
        body: payload,
      });
    } else {
      const bodyObj = typeof payload === 'object' ? { ...payload } : { image: payload };
      if (selectedIndex !== null && selectedIndex !== undefined) {
        bodyObj.selected_index = selectedIndex;
      }
      response = await fetch(`${API_BASE_URL}/scan/qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyObj),
      });
    }
    const data = await response.json();
    if (!response.ok || !data.success) {
      const errorMsg = data?.error?.message || 'QR code scan failed';
      throw new Error(errorMsg);
    }
    return data.data;
  },

  scanSocialMedia: (payload) =>
    request('/scan/social', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // AI Cybersecurity Chat Assistant
  sendChatMessage: (payload) =>
    request('/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // History & Reports
  getHistory: (limit = 50, type = null, fraudVerdict = null, search = null) => {
    const query = new URLSearchParams();
    if (limit) query.append('limit', limit);
    if (type) query.append('type', type);
    if (fraudVerdict) query.append('fraud_verdict', fraudVerdict);
    if (search) query.append('search', search);
    return request(`/history?${query.toString()}`);
  },

  getScanById: (id) => request(`/history/${id}`),

  deleteScan: (id) =>
    request(`/history?id=${id}`, {
      method: 'DELETE',
    }),

  clearHistory: () =>
    request('/history', {
      method: 'DELETE',
    }),

  // Security Analytics & Threat Feeds
  getSecurityStats: () => request('/security/stats'),
  getThreatIntel: () => request('/security/threat-intel'),
};
