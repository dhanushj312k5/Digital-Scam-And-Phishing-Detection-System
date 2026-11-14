import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldAlert,
  Send,
  X,
  Minus,
  RotateCcw,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import { zeroxApi } from '../../services/api';
import { useScans } from '../../context/ScanContext';

// 6 Official Quick Suggestion Prompts
const QUICK_SUGGESTIONS = [
  'How do I identify a phishing message?',
  'How can I detect a fake UPI QR code?',
  'How do scammers steal OTPs?',
  'How do I identify a fake Instagram account?',
  'How can I protect my bank account?',
  'What should I do if I clicked a suspicious link?'
];

// Helper to format inline markdown (bold **text** and `code`) safely with React elements
function formatInlineText(text) {
  if (!text) return text;

  // Split by bold (**...**) and inline code (`...`)
  const parts = [];
  let remaining = text;
  let keyIdx = 0;

  // Regex to match **bold** or `code`
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let match;
  let lastIndex = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`b-${keyIdx++}`} className="chat-strong">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={`c-${keyIdx++}`} className="chat-inline-code">
          {token.slice(1, -1)}
        </code>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

// Structured message block renderer
function FormattedMessage({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let listItems = [];
  let listType = null; // 'ul' or 'ol'

  const flushList = (key) => {
    if (listItems.length > 0) {
      if (listType === 'ol') {
        elements.push(
          <ol key={`ol-${key}`} className="chat-ol">
            {listItems}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${key}`} className="chat-ul">
            {listItems}
          </ul>
        );
      }
      listItems = [];
      listType = null;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList(idx);
      return;
    }

    // Header 3 or 4: ### Heading
    if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
      flushList(idx);
      const title = trimmed.replace(/^#{2,3}\s+/, '');
      elements.push(
        <h4 key={`h-${idx}`} className="chat-heading">
          {formatInlineText(title)}
        </h4>
      );
      return;
    }

    // Unordered list item: - Item or * Item
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (listType && listType !== 'ul') flushList(idx);
      listType = 'ul';
      listItems.push(
        <li key={`li-${idx}`} className="chat-li">
          {formatInlineText(trimmed.slice(2))}
        </li>
      );
      return;
    }

    // Numbered list item: 1. Item
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      if (listType && listType !== 'ol') flushList(idx);
      listType = 'ol';
      listItems.push(
        <li key={`li-${idx}`} className="chat-li">
          {formatInlineText(numMatch[2])}
        </li>
      );
      return;
    }

    // Standard paragraph line
    flushList(idx);
    elements.push(
      <p key={`p-${idx}`} className="chat-p">
        {formatInlineText(trimmed)}
      </p>
    );
  });

  flushList('end');
  return <div className="chat-formatted-body">{elements}</div>;
}

export default function FloatingChatBot() {
  const { backendStatus } = useScans();

  // Chat Window State
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  // Conversation State
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello! I'm **ZEROX AI Assistant**. I can help you understand online scams, phishing attacks, suspicious QR codes, and digital security.\n\nWhat would you like to know?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'ZEROX AI Core'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
      // Focus input on desktop
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isOpen, isMinimized]);

  // Handle open/toggle
  const handleToggleOpen = () => {
    if (!isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
      setHasUnread(false);
    } else {
      setIsMinimized(!isMinimized);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleClearConversation = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content:
          "Conversation cleared. Hello! I'm **ZEROX AI Assistant**. Ask me any question about scams, phishing, or cybersecurity hygiene.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'ZEROX AI Core'
      }
    ]);
    setError(null);
  };

  const handleCopyMessage = (msgId, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Send message handler
  const handleSendMessage = async (textToSend) => {
    const raw = typeof textToSend === 'string' ? textToSend : inputValue;
    const cleanMsg = (raw || '').trim();

    if (!cleanMsg || loading) return;

    // Append user message
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: cleanMsg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInputValue('');
    setLoading(true);
    setError(null);

    // Format history for backend
    const backendHistory = updatedHistory.map((m) => ({
      role: m.role,
      content: m.content
    }));

    try {
      const response = await zeroxApi.sendChatMessage({
        message: cleanMsg,
        history: backendHistory.slice(-8)
      });

      const replyData = response?.data || response;
      const aiReply = replyData?.reply || 'I received your query. Please let me know how else I can assist you.';
      const source = replyData?.analysis_source || 'ZEROX AI';

      const aiMsg = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: source
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setError(err.message || 'Failed to reach ZEROX AI backend. Please verify your connection and retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Determine availability status text and color
  const isAiReady = backendStatus.connected && backendStatus.geminiConfigured;
  const statusLabel = !backendStatus.connected
    ? 'Offline'
    : isAiReady
    ? 'Gemini AI Active'
    : 'Security Engine';
  const statusDotClass = !backendStatus.connected
    ? 'status-dot-offline'
    : isAiReady
    ? 'status-dot-ready'
    : 'status-dot-fallback';

  return (
    <>
      {/* FLOATING ACTION TRIGGER BUTTON */}
      <div className="floating-chat-trigger-wrap">
        <button
          type="button"
          className={`floating-chat-btn ${isOpen && !isMinimized ? 'active' : ''}`}
          onClick={handleToggleOpen}
          aria-label="Open ZEROX AI Assistant"
        >
          <div className="chat-btn-pulse-ring" />
          <div className="chat-btn-icon-inner">
            {isOpen && !isMinimized ? (
              <X size={26} className="btn-icon" />
            ) : (
              <ShieldAlert size={28} className="btn-icon" />
            )}
          </div>
          {hasUnread && !isOpen && <span className="chat-unread-dot" />}
        </button>
        <span className="chat-floating-tooltip">Ask ZEROX AI</span>
      </div>

      {/* CHAT WINDOW (Open State) */}
      {isOpen && (
        <div
          className={`chat-window-container ${isMinimized ? 'minimized' : ''}`}
          role="dialog"
          aria-label="ZEROX AI Assistant"
        >
          {/* HEADER */}
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar-badge">
                <ShieldAlert size={18} />
              </div>
              <div className="chat-title-group">
                <div className="chat-title-row">
                  <span className="chat-title">ZEROX AI Assistant</span>
                  <span className={`chat-status-pill ${statusDotClass}`}>
                    <span className="pill-dot" />
                    <span>{statusLabel}</span>
                  </span>
                </div>
                <span className="chat-subtitle">Your Personal Cybersecurity Assistant</span>
              </div>
            </div>

            <div className="chat-header-actions">
              <button
                type="button"
                className="header-action-btn"
                onClick={handleClearConversation}
                title="Clear Conversation"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                className="header-action-btn"
                onClick={handleMinimize}
                title="Minimize Chat"
              >
                <Minus size={16} />
              </button>
              <button
                type="button"
                className="header-action-btn close-action-btn"
                onClick={handleClose}
                title="Close Chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* CHAT BODY (Hidden when minimized) */}
          {!isMinimized && (
            <>
              <div className="chat-messages-scroll-area">
                {/* Message Stack */}
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`chat-message-row ${isUser ? 'user-row' : 'assistant-row'}`}
                    >
                      {!isUser && (
                        <div className="msg-avatar">
                          <ShieldAlert size={15} />
                        </div>
                      )}

                      <div className="msg-content-wrapper">
                        <div className={`chat-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}>
                          {isUser ? (
                            <p className="user-msg-text">{msg.content}</p>
                          ) : (
                            <FormattedMessage text={msg.content} />
                          )}
                        </div>

                        <div className="msg-meta-row">
                          <span className="msg-time">{msg.timestamp}</span>
                          {!isUser && (
                            <>
                              <span className="meta-sep">•</span>
                              <span className="msg-source-tag">
                                {msg.source?.includes('gemini') ? 'Gemini AI' : 'Cyber Engine'}
                              </span>
                              <button
                                type="button"
                                className="copy-msg-btn"
                                onClick={() => handleCopyMessage(msg.id, msg.content)}
                                title="Copy response"
                              >
                                {copiedId === msg.id ? (
                                  <>
                                    <Check size={11} color="var(--threat-safe)" />
                                    <span style={{ color: 'var(--threat-safe)' }}>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={11} />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Loading / Typing Indicator */}
                {loading && (
                  <div className="chat-message-row assistant-row">
                    <div className="msg-avatar thinking-avatar">
                      <Sparkles size={15} />
                    </div>
                    <div className="chat-bubble assistant-bubble typing-bubble">
                      <div className="typing-dots">
                        <span className="dot" />
                        <span className="dot" />
                        <span className="dot" />
                      </div>
                      <span className="typing-text">ZEROX AI is thinking...</span>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {error && (
                  <div className="chat-error-alert">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                {/* Quick Suggestion Chips (Visible on initial view) */}
                {messages.length <= 2 && !loading && (
                  <div className="chat-suggestions-box">
                    <div className="suggestions-title">
                      <Sparkles size={13} color="var(--accent-cyan)" />
                      <span>Suggested Questions:</span>
                    </div>
                    <div className="suggestions-chips-wrap">
                      {QUICK_SUGGESTIONS.map((sug, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="suggestion-chip"
                          onClick={() => handleSendMessage(sug)}
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* FOOTER / INPUT */}
              <div className="chat-footer">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="chat-input-form"
                >
                  <textarea
                    ref={inputRef}
                    rows={1}
                    className="chat-textarea"
                    placeholder="Ask about scams, phishing, UPI fraud, fake links..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    className="chat-send-btn"
                    disabled={loading || !inputValue.trim()}
                    aria-label="Send Message"
                  >
                    <Send size={16} />
                  </button>
                </form>

                <div className="chat-footer-disclaimer">
                  <span>Zero Credential Policy: Never share passwords, OTPs, or UPI PINs.</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
