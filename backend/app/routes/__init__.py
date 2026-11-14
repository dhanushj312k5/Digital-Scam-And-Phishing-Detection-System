from app.routes.scan_routes import scan_bp
from app.routes.history_routes import history_bp
from app.routes.security_routes import security_bp
from app.routes.health_routes import health_bp
from app.routes.chat_routes import chat_bp

__all__ = ["scan_bp", "history_bp", "security_bp", "health_bp", "chat_bp"]
