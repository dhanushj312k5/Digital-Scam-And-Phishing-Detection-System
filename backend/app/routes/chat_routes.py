import logging
from flask import Blueprint, request
from app.utils.response_helper import success_response, error_response
from app.services.chat_service import ChatService

logger = logging.getLogger(__name__)

chat_bp = Blueprint("chat", __name__, url_prefix="/api")
chat_service = ChatService()


@chat_bp.route("/chat", methods=["POST"])
def chat_endpoint():
    """
    POST /api/chat
    Intelligent Cybersecurity Chat Assistant endpoint.
    Accepts:
    {
      "message": "User query...",
      "history": [{"role": "user"|"assistant", "content": "..."}],
      "scan_context": { ...optional scan result data... }
    }
    Returns:
    {
      "success": true,
      "message": "Chat response generated successfully.",
      "data": {
        "reply": "...",
        "model": "...",
        "analysis_source": "gemini_ai (gemini-3.5-flash-lite)" | "heuristic_fallback (...)",
        "timestamp": "..."
      }
    }
    """
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response(
            message="Invalid request payload. Expected JSON object with a 'message' field.",
            error_code="INVALID_PAYLOAD",
            status_code=400
        )

    raw_message = payload.get("message")
    if not raw_message or not isinstance(raw_message, str) or not raw_message.strip():
        return error_response(
            message="Please provide a non-empty message to chat with ZEROX AI Assistant.",
            error_code="EMPTY_MESSAGE",
            status_code=400
        )

    user_message = raw_message.strip()
    if len(user_message) > 8000:
        return error_response(
            message="Message exceeds the maximum permitted length of 8000 characters.",
            error_code="MESSAGE_TOO_LONG",
            status_code=400
        )

    history = payload.get("history")
    if history is not None and not isinstance(history, list):
        history = []

    scan_context = payload.get("scan_context")
    if scan_context is not None and not isinstance(scan_context, dict):
        scan_context = None

    try:
        data, err = chat_service.chat(
            user_message=user_message,
            history=history,
            scan_context=scan_context
        )

        return success_response(
            data=data,
            message="Chat response generated successfully."
        )

    except Exception as e:
        logger.exception("Failed to process chat message")
        return error_response(
            message=f"Cybersecurity chat assistance failed: {str(e)}",
            error_code="CHAT_EXECUTION_ERROR",
            status_code=500
        )
