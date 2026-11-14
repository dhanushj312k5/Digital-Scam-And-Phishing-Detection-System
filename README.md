# 🛡️ ZEROX AI – Intelligent Scam & Phishing Detection System

ZEROX AI is a modern cybersecurity application designed to detect, analyze, and neutralize scams and phishing threats across messages (SMS, WhatsApp, Email) and malicious URLs using Google Gemini AI.

---

## ⚡ Tech Stack

- **Frontend:** [React.js](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling:** CSS Modern Dark Cybersecurity Design System
- **Icons:** [Lucide React](https://lucide.dev/)
- **Charts & Metrics:** [Recharts](https://recharts.org/)
- **Backend:** [Python Flask](https://flask.palletsprojects.com/)
- **AI Engine:** Google Gemini API via the official [`google-genai`](https://pypi.org/project/google-genai/) SDK
- **Database:** SQLite 3 (local persistent audit logging)

---

## 📂 Project Architecture

```
ZEROX_AI/
├── .gitignore                    # Git ignore rules for node, python, environment, and db
├── README.md                     # Project documentation & runbook
│
├── frontend/                     # React + Vite frontend application
│   ├── index.html                # HTML entry point with cybersecurity typography
│   ├── package.json              # Frontend dependencies (React, Lucide, Recharts)
│   ├── vite.config.js            # Vite build config with backend API proxy
│   └── src/
│       ├── main.jsx              # React DOM entry point
│       ├── App.jsx               # Root layout & tab router
│       ├── App.css               # Component & dashboard styles
│       ├── index.css             # Theme design tokens & CSS variables
│       ├── components/
│       │   └── common/           # Reusable UI elements (Sidebar, Navbar, Badges, Cards)
│       ├── pages/                # Main feature modules
│       │   ├── Dashboard.jsx     # Security metrics overview & quick actions
│       │   ├── MessageScanner.jsx# SMS/Email scam & social engineering detector
│       │   ├── UrlScanner.jsx    # Phishing link & typosquatting inspector
│       │   ├── ScanHistory.jsx   # Searchable audit logs of previous scans
│       │   ├── SecurityCenter.jsx# Active threat advisories & defense best practices
│       │   └── Settings.jsx      # AI model selection & sensitivity controls
│       ├── services/
│       │   └── api.js            # Centralized API service for Flask backend
│       └── utils/
│           └── constants.js      # App constants, navigation definitions, risk levels
│
└── backend/                      # Python Flask API & AI engine
    ├── run.py                    # Application launch entry point
    ├── config.py                 # Environment & app configuration
    ├── requirements.txt          # Python dependencies
    ├── .env.example              # Sample environment variables template
    └── app/
        ├── __init__.py           # Flask factory (CORS, Blueprints, SQLite lifecycle)
        ├── models/               # Data access layer
        │   ├── database.py       # SQLite connection & table initialization
        │   └── scan_model.py     # CRUD operations for scan records & statistics
        ├── routes/               # API endpoints
        │   ├── health_routes.py  # Health check & Gemini status endpoint
        │   ├── scan_routes.py    # /api/scan/message & /api/scan/url
        │   ├── history_routes.py # /api/history & /api/history/<id>
        │   └── security_routes.py# /api/security/stats & /api/security/threat-intel
        ├── services/             # Core business & AI logic
        │   ├── gemini_service.py # Google GenAI SDK integration & prompt templates
        │   ├── message_scanner.py# Message scam detection pipeline
        │   └── url_scanner.py    # URL threat analysis pipeline
        └── utils/
            ├── response_helper.py# Standardized JSON response formatting
            └── validators.py     # Input sanitization and validators
```

---

## 🚀 Getting Started

### 1. Backend Setup

1. Open a terminal in the `backend/` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate    # On Windows: venv\Scripts\activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Create your `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

5. Open `.env` and add your **Google Gemini API Key**:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   ```

6. Start the Flask backend server:
   ```bash
   python run.py
   ```
   The backend API will run on `http://127.0.0.1:5001`.

---

### 2. Frontend Setup

1. Open another terminal in the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install JavaScript dependencies:
   ```bash
   npm install
   ```

3. Launch the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will be accessible at `http://localhost:5173`.

---

## 🔒 Security Best Practices

- **Never commit `.env` files**: All secrets, including `GEMINI_API_KEY`, are kept strictly in `backend/.env` and excluded via `.gitignore`.
- **Backend Isolation**: AI calls and database transactions are processed exclusively through the Flask API layer.
- **Input Validation**: All incoming messages and URLs are sanitized and validated before AI parsing to prevent prompt injection or format exploits.
