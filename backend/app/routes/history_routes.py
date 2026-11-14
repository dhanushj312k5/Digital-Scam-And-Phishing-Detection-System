from flask import Blueprint, request
from app.models.scan_model import ScanModel
from app.utils.response_helper import success_response, error_response

history_bp = Blueprint("history", __name__, url_prefix="/api/history")


@history_bp.route("", methods=["GET"])
def get_scan_history():
    """
    Retrieve historical scan logs with optional filters:
    - limit: max number of scans to return (default 50)
    - type: 'message' or 'url'
    - threat_level: 'SAFE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    - search: search keyword
    """
    limit = min(request.args.get("limit", default=50, type=int), 200)
    scan_type = request.args.get("type", default=None, type=str)
    threat_level = request.args.get("threat_level", default=None, type=str)
    fraud_verdict = request.args.get("fraud_verdict", default=None, type=str)
    search = request.args.get("search", default=None, type=str)

    history = ScanModel.get_history(
        limit=limit,
        scan_type=scan_type,
        threat_level=threat_level,
        search=search,
        fraud_verdict=fraud_verdict
    )
    return success_response(
        {"scans": history, "count": len(history)},
        message="Scan history retrieved successfully."
    )


@history_bp.route("", methods=["DELETE"])
def delete_scan_history():
    """
    Delete scan history:
    - If ?id=<id> query param or {"id": <id>} JSON body is passed, delete single scan record.
    - Otherwise, clear all scan records.
    """
    scan_id = request.args.get("id", type=int)
    if not scan_id:
        payload = request.get_json(silent=True) or {}
        scan_id = payload.get("id")

    if scan_id:
        deleted = ScanModel.delete_by_id(scan_id)
        if not deleted:
            return error_response(
                f"Scan record with ID {scan_id} not found.",
                error_code="NOT_FOUND",
                status_code=404
            )
        return success_response(
            {"deleted_id": scan_id},
            message=f"Scan record {scan_id} deleted successfully."
        )
    else:
        deleted_count = ScanModel.clear_all()
        return success_response(
            {"deleted_count": deleted_count},
            message="All scan history records have been cleared."
        )


@history_bp.route("/<int:scan_id>", methods=["GET"])
def get_scan_detail(scan_id: int):
    """Retrieve complete report details for a specific scan by ID."""
    scan = ScanModel.get_by_id(scan_id)
    if not scan:
        return error_response(
            f"Scan record with ID {scan_id} not found.",
            error_code="NOT_FOUND",
            status_code=404
        )
    return success_response(scan, message="Scan details retrieved successfully.")


@history_bp.route("/<int:scan_id>", methods=["DELETE"])
def delete_single_scan(scan_id: int):
    """Delete a single scan record by ID."""
    deleted = ScanModel.delete_by_id(scan_id)
    if not deleted:
        return error_response(
            f"Scan record with ID {scan_id} not found.",
            error_code="NOT_FOUND",
            status_code=404
        )
    return success_response(
        {"deleted_id": scan_id},
        message=f"Scan record {scan_id} deleted successfully."
    )
