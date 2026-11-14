import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


class Config:
    """Base configuration for ZEROX AI Flask backend."""
    SECRET_KEY = os.environ.get("SECRET_KEY", "zerox-ai-cyber-secret-key-2026")
    FLASK_ENV = os.environ.get("FLASK_ENV", "development")
    DEBUG = os.environ.get("FLASK_DEBUG", "True").lower() in ("true", "1", "yes")
    PORT = int(os.environ.get("PORT", 5001))

    # Gemini AI configuration
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
    GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite").strip()

    # SQLite Database configuration (always canonical absolute path)
    _raw_db = os.environ.get("DATABASE_PATH", "zerox_ai.db").strip()
    DATABASE_PATH = _raw_db if os.path.isabs(_raw_db) else str(BASE_DIR / _raw_db)

    # CORS configuration
    CORS_ORIGINS = os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5001,http://127.0.0.1:5001"
    ).split(",")


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
