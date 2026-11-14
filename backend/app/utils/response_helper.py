from flask import jsonify


def success_response(data=None, message="Success", status_code=200):
    """Return a standard JSON success response."""
    payload = {
        "success": True,
        "message": message,
        "data": data if data is not None else {}
    }
    return jsonify(payload), status_code


def error_response(message="An error occurred", error_code="ERROR", status_code=400, details=None):
    """Return a standard JSON error response."""
    payload = {
        "success": False,
        "error": {
            "code": error_code,
            "message": message,
            "details": details if details is not None else {}
        }
    }
    return jsonify(payload), status_code
