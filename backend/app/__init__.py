import os
from flask import Flask
from flask_cors import CORS
from config import config_by_name
from app.models.database import init_db, close_db
from app.routes import scan_bp, history_bp, security_bp, health_bp, chat_bp


def create_app(config_name=None):
    """Application factory for ZEROX AI Flask backend."""
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "development")

    app = Flask(__name__)
    app.config.from_object(config_by_name.get(config_name, config_by_name["default"]))

    # Setup CORS for frontend communication
    cors_origins = app.config.get("CORS_ORIGINS", "*")
    if isinstance(cors_origins, str):
        cors_origins = [o.strip() for o in cors_origins.split(",") if o.strip()]

    CORS(
        app,
        resources={r"/api/*": {"origins": cors_origins or "*"}},
        supports_credentials=True
    )

    # Database teardown registration and table initialization
    app.teardown_appcontext(close_db)
    init_db(app)

    # Register API blueprints
    app.register_blueprint(health_bp)
    app.register_blueprint(scan_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(security_bp)
    app.register_blueprint(chat_bp)

    return app
