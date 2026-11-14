from flask import Blueprint
from app.models.scan_model import ScanModel
from app.utils.response_helper import success_response

security_bp = Blueprint("security", __name__, url_prefix="/api/security")


@security_bp.route("/stats", methods=["GET"])
def get_security_stats():
    """Retrieve aggregate security statistics for dashboard analytics."""
    stats = ScanModel.get_stats()
    return success_response(stats, message="Security statistics retrieved.")


@security_bp.route("/threat-intel", methods=["GET"])
def get_threat_intel():
    """Retrieve latest threat intel feeds, scam trends, and security advisories."""
    threat_feed = [
        {
            "id": 1,
            "type": "Banking SMS Scam",
            "threat_level": "CRITICAL",
            "trend": "Surging",
            "description": "Urgent SMS claiming debit card suspension with fake KYC update link."
        },
        {
            "id": 2,
            "type": "Package Delivery Phishing",
            "threat_level": "HIGH",
            "trend": "Stable",
            "description": "Fake courier SMS requesting address verification or pending fee payment."
        },
        {
            "id": 3,
            "type": "Crypto Job Offer / Task Scam",
            "threat_level": "HIGH",
            "trend": "Increasing",
            "description": "Telegram/WhatsApp recruiters promising high daily earnings for rating apps."
        }
    ]
    return success_response(threat_feed, message="Threat intelligence feed retrieved.")
