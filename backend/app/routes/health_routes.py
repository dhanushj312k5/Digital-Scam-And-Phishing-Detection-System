from flask import Blueprint, current_app
from app.utils.response_helper import success_response
from app.models.database import get_db
from app.services.gemini_service import GeminiAIService

health_bp = Blueprint("health", __name__, url_prefix="/api")


@health_bp.route("/health", methods=["GET"])
def health_check():
    """
    Health check endpoint to verify backend service, SQLite database,
    and actual live Google Gemini AI availability using real API validation.
    """
    ai_service = GeminiAIService()
    verification = ai_service.verify_connection()

    # Test SQLite connection
    db_status = "connected"
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT 1")
    except Exception as e:
        db_status = f"error: {str(e)}"

    is_ai_live = bool(verification.get("available"))

    gemini_payload = {
        "configured": verification.get("configured", False),
        "ai_engine_ready": is_ai_live,
        "model": verification.get("model", "gemini-2.5-flash"),
        "display_name": verification.get("display_name"),
        "analysis_source": verification.get("analysis_source", "heuristic_fallback"),
        "message": verification.get("message") or verification.get("error"),
        "error_type": verification.get("error_type")
    }

    return success_response(
        {
            "status": "healthy",
            "service": "ZEROX AI Backend",
            "version": "1.0.0",
            "port": current_app.config.get("PORT", 5001),
            "database": db_status,
            "gemini": gemini_payload,
            "gemini_configured": is_ai_live,  # Strict: Only true if real API request succeeds
            "analysis_source": verification.get("analysis_source", "heuristic_fallback"),
            "analysis_engine": "gemini_ai" if is_ai_live else "heuristic_nlp"
        },
        message="ZEROX AI Backend service is operational."
    )
