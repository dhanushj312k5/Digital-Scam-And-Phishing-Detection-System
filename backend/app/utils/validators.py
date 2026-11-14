import re
import io
import os
from urllib.parse import urlparse

# Permitted QR image file extensions
ALLOWED_QR_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
MAX_QR_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit

# Supported social media platforms
ALLOWED_SOCIAL_PLATFORMS = {
    "instagram", "facebook", "x (twitter)", "twitter", "x", "whatsapp",
    "telegram", "linkedin", "youtube", "snapchat"
}

PLATFORM_CANONICAL_NAMES = {
    "instagram": "Instagram",
    "facebook": "Facebook",
    "x (twitter)": "X (Twitter)",
    "twitter": "X (Twitter)",
    "x": "X (Twitter)",
    "whatsapp": "WhatsApp",
    "telegram": "Telegram",
    "linkedin": "LinkedIn",
    "youtube": "YouTube",
    "snapchat": "Snapchat"
}


def validate_message_input(text: str) -> tuple[bool, str]:
    """Validate message text input."""
    if not text or not isinstance(text, str):
        return False, "Message content cannot be empty."

    trimmed = text.strip()
    if len(trimmed) < 3:
        return False, "Message content is too short (minimum 3 characters)."
    if len(trimmed) > 10000:
        return False, "Message content exceeds maximum allowed length of 10,000 characters."

    return True, ""


def validate_url_input(url: str) -> tuple[bool, str]:
    """Validate URL string input."""
    if not url or not isinstance(url, str):
        return False, "URL cannot be empty."

    trimmed = url.strip()
    if len(trimmed) > 2048:
        return False, "URL exceeds maximum allowed length of 2048 characters."

    # Ensure scheme is present for parsing
    if not re.match(r"^https?://", trimmed, re.IGNORECASE):
        trimmed = "http://" + trimmed

    try:
        parsed = urlparse(trimmed)
        hostname = parsed.netloc.split(":")[0].strip()
        if not hostname:
            return False, "Invalid URL format: missing host/domain."
        
        # Must have a valid dot-separated domain, IPv4/IPv6, or localhost
        is_ip = bool(re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", hostname))
        is_localhost = hostname.lower() in ("localhost", "127.0.0.1")
        has_tld = "." in hostname and len(hostname.split(".")[-1]) >= 2

        if not (is_ip or is_localhost or has_tld):
            return False, "Invalid URL format: please enter a valid domain (e.g. example.com) or full URL."

        return True, ""
    except Exception as e:
        return False, f"Invalid URL: {str(e)}"


def validate_qr_image_input(raw_bytes: bytes, filename: str = "") -> tuple[bool, str]:
    """
    Validate QR code image payload:
    - Must not be empty.
    - Must not exceed maximum allowed byte size (10 MB).
    - File extension (if filename provided) must be an allowed image type.
    - Actual payload must decode into a valid raster image.
    """
    if not raw_bytes or len(raw_bytes) == 0:
        return False, "Uploaded image file is empty."

    if len(raw_bytes) > MAX_QR_IMAGE_SIZE_BYTES:
        max_mb = MAX_QR_IMAGE_SIZE_BYTES // (1024 * 1024)
        return False, f"Image file exceeds maximum permitted size of {max_mb}MB."

    if filename:
        ext = os.path.splitext(filename)[1].lower()
        if ext and ext not in ALLOWED_QR_IMAGE_EXTENSIONS:
            allowed_list = ", ".join(ALLOWED_QR_IMAGE_EXTENSIONS)
            return False, f"Unsupported file extension '{ext}'. Permitted image formats: {allowed_list}."

    # Validate image magic headers / decoding integrity
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(raw_bytes))
        img.verify()
    except Exception:
        return False, "Uploaded file is not a valid or readable image format (PNG, JPG, JPEG, WEBP, BMP required)."

    return True, ""


def validate_social_media_input(payload: dict) -> tuple[bool, str, str, dict]:
    """
    Validate and sanitize social media scam scanner payload:
    - Platform must be specified and supported.
    - At least one identifying signal must be provided (username, profile URL, message, bio, or shared link).
    - Protects against credential submission.
    Returns: (is_valid, error_code, error_message, sanitized_data)
    """
    if not isinstance(payload, dict):
        return False, "INVALID_PAYLOAD", "Invalid payload format: expected JSON object.", {}

    raw_platform = str(payload.get("platform") or "").strip().lower()
    if not raw_platform:
        return False, "INVALID_PLATFORM", "Please specify a supported social media platform (Instagram, Facebook, X, WhatsApp, Telegram, LinkedIn, YouTube, Snapchat).", {}

    if raw_platform not in ALLOWED_SOCIAL_PLATFORMS:
        return False, "INVALID_PLATFORM", f"Unsupported platform '{raw_platform}'. Please choose from supported platforms.", {}

    platform = PLATFORM_CANONICAL_NAMES.get(raw_platform, "Instagram")

    username = str(payload.get("username") or payload.get("account_handle") or payload.get("handle") or "").strip()
    profile_url = str(payload.get("profile_url") or payload.get("url") or "").strip()
    display_name = str(payload.get("display_name") or payload.get("name") or "").strip()
    bio = str(payload.get("bio") or payload.get("bio_text") or payload.get("description") or "").strip()
    message = str(payload.get("message") or payload.get("received_message") or payload.get("post_content") or "").strip()
    shared_link = str(payload.get("shared_link") or payload.get("link") or "").strip()

    # Clean username: remove leading '@' if entered
    if username.startswith("@"):
        username = username[1:].strip()

    # Check that at least one content signal is supplied
    signals = [username, profile_url, display_name, bio, message, shared_link]
    if not any(len(s) >= 2 for s in signals):
        return False, "EMPTY_INPUT", "Please provide at least an account handle, profile URL, bio description, or message to scan.", {}

    # Check for accidental password or credential submission
    combined_text = f"{bio} {message}".lower()
    if any(k in combined_text for k in ["mypassword=", "password is ", "auth_cookie=", "my secret token"]):
        return False, "CREDENTIAL_REJECTED", "Security Advisory: Never submit private passwords, tokens, or personal account credentials to ZEROX AI.", {}

    sanitized = {
        "platform": platform,
        "username": username[:100],
        "profile_url": profile_url[:2048],
        "display_name": display_name[:150],
        "bio": bio[:3000],
        "message": message[:10000],
        "shared_link": shared_link[:2048]
    }

    return True, "", "", sanitized
