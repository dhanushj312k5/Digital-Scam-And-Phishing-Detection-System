import json
from app.models.database import get_db


import json
from app.models.database import get_db


def derive_fraud_verdict(risk_score: float, threat_level: str = "SAFE", categories: list = None) -> str:
    """
    Deterministically derive fraud verdict based on risk score, threat level, and category patterns:
    - FRAUD_DETECTED: Strong fraud, phishing, or credential harvesting indicators found (score >= 65).
    - NO_FRAUD_DETECTED: No significant fraud indicators identified (score < 30 and level SAFE).
    - NEEDS_REVIEW: Ambiguous or borderline result requiring human verification (30 <= score < 65).
    """
    level = str(threat_level or "").upper()
    score = float(risk_score or 0.0)

    if score >= 65.0 or level in ("CRITICAL", "HIGH"):
        return "FRAUD_DETECTED"
    elif score < 30.0 and level == "SAFE":
        return "NO_FRAUD_DETECTED"
    else:
        return "NEEDS_REVIEW"


def calculate_confidence(risk_score: float, analysis_source: str = "", indicators_count: int = 0) -> float:
    """
    Calculate meaningful confidence score between 0.0 and 1.0 (70% to 98%):
    - Higher confidence when corroborated by multiple indicators or Gemini AI.
    - Decisive scores (<15 or >80) have higher confidence than borderline scores (40-60).
    """
    score = float(risk_score or 0.0)
    is_ai = "gemini" in str(analysis_source).lower()

    # Distance from ambiguity midpoint (50)
    extremity_boost = abs(score - 50.0) / 50.0 * 0.10  # 0.00 to 0.10

    base_conf = 0.85 if is_ai else 0.78
    corroboration_boost = min(0.08, indicators_count * 0.02)

    total_conf = base_conf + extremity_boost + corroboration_boost
    return round(min(0.98, max(0.70, total_conf)), 2)


class ScanModel:
    """Data access object for scan records and analytics in SQLite."""

    @staticmethod
    def create(scan_data: dict) -> int:
        """Insert a new scan result into the database."""
        db = get_db()
        cursor = db.cursor()

        categories_list = scan_data.get("categories", [])
        flagged_list = scan_data.get("flagged_indicators", [])
        recommendations_list = scan_data.get("recommendations", [])
        analysis_details_dict = scan_data.get("analysis_details", {})

        categories = json.dumps(categories_list)
        flagged_indicators = json.dumps(flagged_list)
        recommendations = json.dumps(recommendations_list)
        analysis_details = json.dumps(analysis_details_dict)

        risk_score = float(scan_data.get("risk_score", 0.0))
        threat_level = str(scan_data.get("threat_level", "SAFE")).upper()

        fraud_verdict = scan_data.get("fraud_verdict")
        if not fraud_verdict:
            fraud_verdict = derive_fraud_verdict(risk_score, threat_level, categories_list)

        confidence_score = scan_data.get("confidence_score")
        if confidence_score is None:
            confidence_score = calculate_confidence(
                risk_score,
                scan_data.get("analysis_source", ""),
                len(flagged_list)
            )

        cursor.execute(
            """
            INSERT INTO scans (
                scan_type, target_content, risk_score, threat_level,
                fraud_verdict, confidence_score,
                categories, summary, analysis_details, flagged_indicators,
                recommendations
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                scan_data.get("scan_type"),
                scan_data.get("target_content"),
                risk_score,
                threat_level,
                fraud_verdict,
                float(confidence_score),
                categories,
                scan_data.get("summary", ""),
                analysis_details,
                flagged_indicators,
                recommendations
            )
        )
        db.commit()
        return cursor.lastrowid

    @staticmethod
    def get_by_id(scan_id: int) -> dict | None:
        """Fetch a specific scan by its ID."""
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT * FROM scans WHERE id = ?", (scan_id,))
        row = cursor.fetchone()
        if not row:
            return None

        result = dict(row)
        result["categories"] = json.loads(result["categories"] or "[]")
        result["flagged_indicators"] = json.loads(result["flagged_indicators"] or "[]")
        result["recommendations"] = json.loads(result["recommendations"] or "[]")
        result["analysis_details"] = json.loads(result["analysis_details"] or "{}")

        # Backwards compatibility for older records
        if not result.get("fraud_verdict"):
            result["fraud_verdict"] = derive_fraud_verdict(
                result.get("risk_score", 0.0),
                result.get("threat_level", "SAFE"),
                result["categories"]
            )
        if result.get("confidence_score") is None:
            result["confidence_score"] = calculate_confidence(
                result.get("risk_score", 0.0),
                result.get("analysis_details", {}).get("analysis_source", ""),
                len(result["flagged_indicators"])
            )
        return result

    @staticmethod
    def get_history(limit: int = 50, scan_type: str = None, threat_level: str = None, search: str = None, fraud_verdict: str = None) -> list[dict]:
        """Fetch scans with optional filters and search query."""
        db = get_db()
        cursor = db.cursor()

        query = "SELECT * FROM scans"
        conditions = []
        params = []

        if scan_type:
            st = scan_type.lower()
            if st in ("qr", "qr_code"):
                conditions.append("LOWER(scan_type) IN ('qr', 'qr_code')")
            elif st in ("social", "social_media"):
                conditions.append("LOWER(scan_type) IN ('social', 'social_media')")
            else:
                conditions.append("LOWER(scan_type) = ?")
                params.append(st)

        if threat_level:
            conditions.append("threat_level = ?")
            params.append(threat_level.upper())

        if fraud_verdict:
            conditions.append("(fraud_verdict = ? OR (fraud_verdict IS NULL AND threat_level = ?))")
            params.extend([fraud_verdict.upper(), "CRITICAL" if fraud_verdict.upper() == "FRAUD_DETECTED" else "SAFE"])

        if search:
            conditions.append("(target_content LIKE ? OR summary LIKE ? OR categories LIKE ?)")
            term = f"%{search}%"
            params.extend([term, term, term])

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        scans = []
        for row in rows:
            item = dict(row)
            item["categories"] = json.loads(item["categories"] or "[]")
            item["flagged_indicators"] = json.loads(item["flagged_indicators"] or "[]")
            item["recommendations"] = json.loads(item["recommendations"] or "[]")
            item["analysis_details"] = json.loads(item["analysis_details"] or "{}")

            # Handle older records gracefully
            if not item.get("fraud_verdict"):
                item["fraud_verdict"] = derive_fraud_verdict(
                    item.get("risk_score", 0.0),
                    item.get("threat_level", "SAFE"),
                    item["categories"]
                )
            if item.get("confidence_score") is None:
                item["confidence_score"] = calculate_confidence(
                    item.get("risk_score", 0.0),
                    item.get("analysis_details", {}).get("analysis_source", ""),
                    len(item["flagged_indicators"])
                )
            scans.append(item)
        return scans

    @staticmethod
    def delete_by_id(scan_id: int) -> bool:
        """Delete a single scan record by ID."""
        db = get_db()
        cursor = db.cursor()
        cursor.execute("DELETE FROM scans WHERE id = ?", (scan_id,))
        db.commit()
        return cursor.rowcount > 0

    @staticmethod
    def clear_all() -> int:
        """Delete all scan history records from SQLite."""
        db = get_db()
        cursor = db.cursor()
        cursor.execute("DELETE FROM scans")
        count = cursor.rowcount
        db.commit()
        return count

    @staticmethod
    def get_stats() -> dict:
        """Aggregate summary metrics for the security dashboard including Fraud Detection metrics."""
        db = get_db()
        cursor = db.cursor()

        cursor.execute("SELECT COUNT(*) as total FROM scans")
        total_scans = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) as malicious FROM scans WHERE risk_score >= 60.0")
        threats_detected = cursor.fetchone()["malicious"]

        cursor.execute("SELECT COUNT(*) as safe FROM scans WHERE risk_score < 30.0")
        safe_scans = cursor.fetchone()["safe"]

        cursor.execute("SELECT AVG(risk_score) as avg_risk FROM scans")
        avg_row = cursor.fetchone()
        avg_risk = round(avg_row["avg_risk"] or 0.0, 1)

        # Count by scan type
        cursor.execute("SELECT scan_type, COUNT(*) as count FROM scans GROUP BY scan_type")
        type_counts = {row["scan_type"]: row["count"] for row in cursor.fetchall()}

        # Fraud Detection Metrics based on actual SQLite data
        cursor.execute("""
            SELECT COUNT(*) as fraud FROM scans
            WHERE fraud_verdict = 'FRAUD_DETECTED'
               OR (fraud_verdict IS NULL AND risk_score >= 60.0)
        """)
        fraud_detected_count = cursor.fetchone()["fraud"]

        cursor.execute("""
            SELECT COUNT(*) as clean FROM scans
            WHERE fraud_verdict = 'NO_FRAUD_DETECTED'
               OR (fraud_verdict IS NULL AND risk_score < 30.0)
        """)
        no_fraud_count = cursor.fetchone()["clean"]

        cursor.execute("""
            SELECT COUNT(*) as review FROM scans
            WHERE fraud_verdict = 'NEEDS_REVIEW'
               OR (fraud_verdict IS NULL AND risk_score >= 30.0 AND risk_score < 60.0)
        """)
        needs_review_count = cursor.fetchone()["review"]

        fraud_rate_pct = round((fraud_detected_count / total_scans * 100), 1) if total_scans > 0 else 0.0

        # QR Code Specific Telemetry Metrics
        cursor.execute("""
            SELECT COUNT(*) as total FROM scans
            WHERE LOWER(scan_type) IN ('qr', 'qr_code')
        """)
        qr_total = cursor.fetchone()["total"]

        cursor.execute("""
            SELECT COUNT(*) as fraud FROM scans
            WHERE LOWER(scan_type) IN ('qr', 'qr_code')
              AND (fraud_verdict = 'FRAUD_DETECTED' OR (fraud_verdict IS NULL AND risk_score >= 60.0))
        """)
        qr_fraud = cursor.fetchone()["fraud"]

        cursor.execute("""
            SELECT COUNT(*) as clean FROM scans
            WHERE LOWER(scan_type) IN ('qr', 'qr_code')
              AND (fraud_verdict = 'NO_FRAUD_DETECTED' OR (fraud_verdict IS NULL AND risk_score < 30.0))
        """)
        qr_clean = cursor.fetchone()["clean"]

        cursor.execute("""
            SELECT COUNT(*) as review FROM scans
            WHERE LOWER(scan_type) IN ('qr', 'qr_code')
              AND (fraud_verdict = 'NEEDS_REVIEW' OR (fraud_verdict IS NULL AND risk_score >= 30.0 AND risk_score < 60.0))
        """)
        qr_review = cursor.fetchone()["review"]

        qr_fraud_rate_pct = round((qr_fraud / qr_total * 100), 1) if qr_total > 0 else 0.0

        # Social Media Specific Telemetry Metrics
        cursor.execute("""
            SELECT COUNT(*) as total FROM scans
            WHERE LOWER(scan_type) IN ('social', 'social_media')
        """)
        social_total = cursor.fetchone()["total"]

        cursor.execute("""
            SELECT COUNT(*) as fraud FROM scans
            WHERE LOWER(scan_type) IN ('social', 'social_media')
              AND (fraud_verdict = 'FRAUD_DETECTED' OR (fraud_verdict IS NULL AND risk_score >= 60.0))
        """)
        social_fraud = cursor.fetchone()["fraud"]

        cursor.execute("""
            SELECT COUNT(*) as clean FROM scans
            WHERE LOWER(scan_type) IN ('social', 'social_media')
              AND (fraud_verdict = 'NO_FRAUD_DETECTED' OR (fraud_verdict IS NULL AND risk_score < 30.0))
        """)
        social_clean = cursor.fetchone()["clean"]

        cursor.execute("""
            SELECT COUNT(*) as review FROM scans
            WHERE LOWER(scan_type) IN ('social', 'social_media')
              AND (fraud_verdict = 'NEEDS_REVIEW' OR (fraud_verdict IS NULL AND risk_score >= 30.0 AND risk_score < 60.0))
        """)
        social_review = cursor.fetchone()["review"]

        social_fraud_rate_pct = round((social_fraud / social_total * 100), 1) if social_total > 0 else 0.0

        return {
            "total_scans": total_scans,
            "threats_detected": threats_detected,
            "safe_scans": safe_scans,
            "suspicious_scans": max(0, total_scans - threats_detected - safe_scans),
            "average_risk_score": avg_risk,
            "type_counts": type_counts,
            # Enhanced Fraud Detection Metrics
            "fraud_stats": {
                "total_scans": total_scans,
                "fraud_detected": fraud_detected_count,
                "no_fraud_detected": no_fraud_count,
                "needs_review": needs_review_count,
                "fraud_rate_pct": fraud_rate_pct,
            },
            # QR Code Specific Telemetry
            "qr_stats": {
                "total": qr_total,
                "fraud_detected": qr_fraud,
                "no_fraud_detected": qr_clean,
                "needs_review": qr_review,
                "fraud_rate_pct": qr_fraud_rate_pct
            },
            # Social Media Specific Telemetry
            "social_stats": {
                "total": social_total,
                "fraud_detected": social_fraud,
                "no_fraud_detected": social_clean,
                "needs_review": social_review,
                "fraud_rate_pct": social_fraud_rate_pct
            },
            # Direct top-level access for backwards compatibility
            "fraud_detected": fraud_detected_count,
            "no_fraud_detected": no_fraud_count,
            "needs_review": needs_review_count,
            "fraud_rate_pct": fraud_rate_pct
        }
