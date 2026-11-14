import base64
import logging
from flask import Blueprint, request
from app.services.message_scanner import MessageScanner
from app.services.url_scanner import UrlScanner
from app.services.qr_scanner import QRScanner
from app.services.social_scanner import SocialMediaScanner
from app.utils.validators import (
    validate_message_input,
    validate_url_input,
    validate_qr_image_input,
    validate_social_media_input
)
from app.utils.response_helper import success_response, error_response

logger = logging.getLogger(__name__)
scan_bp = Blueprint("scan", __name__, url_prefix="/api/scan")


@scan_bp.route("/message", methods=["POST"])
def scan_message():
    """Scan and analyze message text for scams, phishing, and coercion."""
    payload = request.get_json(silent=True) or {}
    message_text = payload.get("message", "")

    # Input validation
    is_valid, err_msg = validate_message_input(message_text)
    if not is_valid:
        return error_response(
            message=err_msg,
            error_code="INVALID_INPUT",
            status_code=400,
            details={"field": "message"}
        )

    try:
        scanner = MessageScanner()
        result = scanner.scan(message_text)
        return success_response(
            data=result,
            message="Message scan completed successfully."
        )
    except Exception as e:
        logger.exception("Failed to scan message")
        return error_response(
            message=f"Message scan failed: {str(e)}",
            error_code="SCAN_EXECUTION_ERROR",
            status_code=500
        )


@scan_bp.route("/url", methods=["POST"])
def scan_url():
    """Scan and analyze a suspicious URL using static forensic decomposition."""
    payload = request.get_json(silent=True) or {}
    url = payload.get("url", "")

    # Input validation
    is_valid, err_msg = validate_url_input(url)
    if not is_valid:
        return error_response(
            message=err_msg,
            error_code="INVALID_INPUT",
            status_code=400,
            details={"field": "url"}
        )

    try:
        scanner = UrlScanner()
        result = scanner.scan(url)
        return success_response(
            data=result,
            message="URL scan completed successfully."
        )
    except Exception as e:
        logger.exception("Failed to scan URL")
        return error_response(
            message=f"URL scan failed: {str(e)}",
            error_code="SCAN_EXECUTION_ERROR",
            status_code=500
        )


@scan_bp.route("/qr", methods=["POST"])
def scan_qr():
    """
    Decode and analyze QR code image for financial fraud, malicious destinations, and scam payloads.
    Accepts multipart/form-data with 'image' or 'file', or JSON with 'image_base64'.
    """
    raw_bytes = None
    filename = ""
    payload = None

    # 1. Check for multipart file upload
    if "image" in request.files:
        uploaded_file = request.files["image"]
        filename = uploaded_file.filename or "upload.png"
        raw_bytes = uploaded_file.read()
    elif "file" in request.files:
        uploaded_file = request.files["file"]
        filename = uploaded_file.filename or "upload.png"
        raw_bytes = uploaded_file.read()
    else:
        # 2. Check for JSON base64 payload
        payload = request.get_json(silent=True) or {}
        b64_data = payload.get("image_base64") or payload.get("image") or ""
        if b64_data:
            filename = payload.get("filename", "upload.png")
            # Strip data URL prefix if present (e.g. data:image/png;base64,...)
            if "," in b64_data:
                b64_data = b64_data.split(",", 1)[1]
            try:
                raw_bytes = base64.b64decode(b64_data)
            except Exception:
                return error_response(
                    message="Malformed base64 image data.",
                    error_code="INVALID_BASE64",
                    status_code=400
                )

    if not raw_bytes:
        return error_response(
            message="No image file provided. Please upload a QR code image (PNG, JPG, JPEG).",
            error_code="MISSING_IMAGE",
            status_code=400
        )

    # 3. Secure file size and format validation
    is_valid, val_err = validate_qr_image_input(raw_bytes, filename)
    if not is_valid:
        return error_response(
            message=val_err,
            error_code="INVALID_IMAGE",
            status_code=400,
            details={"filename": filename, "size_bytes": len(raw_bytes)}
        )

    # Check for selected_index parameter (for multi-QR resolution)
    selected_index = None
    if request.form and "selected_index" in request.form:
        try:
            selected_index = int(request.form.get("selected_index"))
        except (ValueError, TypeError):
            pass
    elif request.args and "selected_index" in request.args:
        try:
            selected_index = int(request.args.get("selected_index"))
        except (ValueError, TypeError):
            pass
    elif payload and "selected_index" in payload:
        try:
            selected_index = int(payload.get("selected_index"))
        except (ValueError, TypeError):
            pass

    # 4. Execute QR decoding and threat forensics
    try:
        scanner = QRScanner()
        result = scanner.scan(raw_bytes, filename=filename, selected_index=selected_index)
        if result.get("multiple_detected"):
            return success_response(
                data=result,
                message=f"Multiple QR codes detected ({result.get('qr_count', 0)} found). Please select which code to analyze."
            )
        return success_response(
            data=result,
            message="QR code decoded and analyzed successfully."
        )
    except ValueError as ve:
        # Expected user validation error (e.g. image contains no QR code)
        return error_response(
            message=str(ve),
            error_code="QR_DECODE_FAILED",
            status_code=400
        )
    except Exception as e:
        logger.exception("Failed to scan QR code image")
        return error_response(
            message=f"QR code analysis failed: {str(e)}",
            error_code="SCAN_EXECUTION_ERROR",
            status_code=500
        )


@scan_bp.route("/social", methods=["POST"])
def scan_social():
    """
    Scan and analyze social media account handle, profile bio, shared link,
    and received messages for impersonation, fake recruiters, crypto schemes, and scams.
    """
    payload = request.get_json(silent=True) or {}

    is_valid, err_code, err_msg, sanitized_data = validate_social_media_input(payload)
    if not is_valid:
        return error_response(
            message=err_msg,
            error_code=err_code or "INVALID_INPUT",
            status_code=400,
            details={"payload": payload}
        )

    try:
        scanner = SocialMediaScanner()
        result = scanner.scan(sanitized_data)
        return success_response(
            data=result,
            message=f"{sanitized_data.get('platform', 'Social Media')} profile analysis completed successfully."
        )
    except Exception as e:
        logger.exception("Failed to scan social media profile")
        return error_response(
            message=f"Social media scan failed: {str(e)}",
            error_code="SCAN_EXECUTION_ERROR",
            status_code=500
        )


