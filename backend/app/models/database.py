import sqlite3
import os
from flask import g, current_app


def get_db():
    """Obtain a SQLite database connection for the current application context."""
    if "db" not in g:
        db_path = current_app.config.get("DATABASE_PATH", "zerox_ai.db")
        g.db = sqlite3.connect(db_path)
        g.db.row_factory = sqlite3.Row
    return g.db


def close_db(e=None):
    """Close the database connection if open."""
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db(app):
    """Initialize SQLite database tables."""
    with app.app_context():
        db = get_db()
        cursor = db.cursor()

        # Scans table to record all scam & URL checks
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS scans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scan_type TEXT NOT NULL, -- 'message' or 'url'
                target_content TEXT NOT NULL,
                risk_score REAL NOT NULL, -- 0.0 to 100.0
                threat_level TEXT NOT NULL, -- 'SAFE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
                fraud_verdict TEXT DEFAULT 'NEEDS_REVIEW', -- 'FRAUD_DETECTED', 'NO_FRAUD_DETECTED', 'NEEDS_REVIEW'
                confidence_score REAL DEFAULT 0.85, -- 0.0 to 1.0
                categories TEXT, -- JSON array of detected threat categories
                summary TEXT,
                analysis_details TEXT, -- Full JSON response from AI or heuristics
                flagged_indicators TEXT, -- JSON array of specific red flags
                recommendations TEXT, -- JSON array of recommended safety actions
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Migration for existing databases: ensure fraud_verdict and confidence_score columns exist
        cursor.execute("PRAGMA table_info(scans)")
        existing_cols = {row["name"] for row in cursor.fetchall()}
        if "fraud_verdict" not in existing_cols:
            cursor.execute("ALTER TABLE scans ADD COLUMN fraud_verdict TEXT DEFAULT 'NEEDS_REVIEW'")
        if "confidence_score" not in existing_cols:
            cursor.execute("ALTER TABLE scans ADD COLUMN confidence_score REAL DEFAULT 0.85")

        # Threat reports / feedback table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS threat_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scan_id INTEGER,
                user_feedback TEXT, -- 'confirmed_scam', 'false_positive', etc.
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (scan_id) REFERENCES scans (id)
            )
        """)

        db.commit()
