import re
import logging
from app.services.gemini_service import GeminiAIService
from app.models.scan_model import ScanModel, derive_fraud_verdict, calculate_confidence

logger = logging.getLogger(__name__)


class MessageScanner:
    """Service to process and evaluate messages for scams, phishing, and fraud."""

    def __init__(self):
        self.ai_service = GeminiAIService()

    def _heuristic_analysis(self, text: str) -> dict:
        """Deep cybersecurity heuristic assessment based on fraud taxonomies."""
        text_lower = text.lower()
        flagged = []
        categories = []
        risk_score = 5

        # 1. Coercive urgency patterns
        urgency_patterns = [
            r"\burgent\b", r"\bimmediately\b", r"\bwithin \d+ hours?\b",
            r"\baccount (has been )?blocked\b", r"\bsuspended\b",
            r"\bhalted\b", r"\bfreeze\b", r"\blegal action\b",
            r"\barrest warrant\b", r"\bfinal notice\b", r"\bpenalty\b"
        ]
        found_urgency = any(re.search(p, text_lower) for p in urgency_patterns)
        if found_urgency:
            flagged.append("High urgency and coercive deadline manipulation detected")
            categories.append("Urgency Manipulation")
            risk_score += 35

        # 2. Financial & KYC impersonation
        kyc_patterns = [
            r"\bkyc\b", r"\bpan (card|number)\b", r"\baadhar\b",
            r"\bdebit card\b", r"\bcredit card\b", r"\bbank account\b",
            r"\bupdate kyc\b", r"\bunblock\b", r"\bsbi\b", r"\bhdfc\b",
            r"\bicici\b", r"\bbanking portal\b", r"\btax refund\b"
        ]
        found_kyc = any(re.search(p, text_lower) for p in kyc_patterns)
        if found_kyc:
            flagged.append("Impersonation of banking or regulatory KYC verification")
            categories.append("Banking Phishing")
            risk_score += 40

        # 3. Task scam & recruitment fraud
        task_patterns = [
            r"\blike (3 |several )?(youtube )?videos\b", r"\bearn \$\d+",
            r"\bpart[- ]time (job|remote work)\b", r"\btelegram @\w+",
            r"\busdt\b", r"\bcrypto payout\b", r"\bdaily (income|earnings)\b",
            r"\bhr manager\b", r"\bwhatsapp recruiter\b"
        ]
        found_task = any(re.search(p, text_lower) for p in task_patterns)
        if found_task:
            flagged.append("Unsolicited remote task scam promising high return for trivial actions")
            categories.append("Task Scam / Advance Fee")
            risk_score += 45

        # 4. Lottery / Prize / Gift scam
        lottery_patterns = [
            r"\bcongratulations!? you (have )?won\b", r"\blottery winner\b",
            r"\bclaim (your )?(prize|reward|gift card)\b", r"\bexclusive reward\b"
        ]
        found_lottery = any(re.search(p, text_lower) for p in lottery_patterns)
        if found_lottery:
            flagged.append("Prize solicitation promising unearned winnings")
            categories.append("Lottery Fraud")
            risk_score += 35

        # 5. Suspicious hyperlinks in SMS
        has_link = bool(re.search(r"https?://|\bbit\.ly/|\.top/|\.xyz/|\.click/", text_lower))
        if has_link:
            flagged.append("Embedded hyperlink or shortened redirect destination")
            if "Phishing" not in " ".join(categories):
                categories.append("Phishing Link")
            risk_score += 25

        # 6. Sensitive credential / OTP requests
        otp_solicit = any(re.search(p, text_lower) for p in [
            r"\bshare this otp\b", r"\benter password\b", r"\bconfirm pin\b",
            r"\bdisclose (your )?code\b"
        ])
        if otp_solicit:
            flagged.append("Direct solicitation of authentication credentials or OTP")
            categories.append("Credential Theft")
            risk_score += 40

        # Check for legitimate automated OTP (e.g. Google, Microsoft, Bank OTP)
        is_legit_otp = bool(re.search(r"\b(verification|security) code is \d{4,8}\b", text_lower) and
                            re.search(r"\b(never share|do not share|valid for)\b", text_lower) and
                            not has_link)
        if is_legit_otp:
            flagged = ["Standard automated 2FA notification", "Clear warning never to disclose code"]
            categories = ["Legitimate Authentication"]
            risk_score = 5

        # Cap score between 0 and 100
        risk_score = min(100, max(0, risk_score))

        # Classification
        if risk_score >= 80:
            threat_level = "CRITICAL"
        elif risk_score >= 60:
            threat_level = "HIGH"
        elif risk_score >= 35:
            threat_level = "MEDIUM"
        elif risk_score >= 15:
            threat_level = "LOW"
        else:
            threat_level = "SAFE"

        # Deduplicate categories
        categories = list(dict.fromkeys(categories))
        if not categories:
            categories = ["Benign Communication" if threat_level == "SAFE" else "Suspicious Patterns"]

        # Recommendations based on threat level
        if threat_level in ["CRITICAL", "HIGH"]:
            summary = "High-confidence fraudulent message attempting social engineering or credential theft."
            recommendations = [
                "Do NOT click any links or download attachments from this message.",
                "Never share OTPs, PINs, or financial identifiers.",
                "Verify the matter directly via official banking app or customer portal."
            ]
        elif threat_level == "MEDIUM":
            summary = "Message exhibits suspicious deception patterns and should be treated with caution."
            recommendations = [
                "Verify sender authenticity before taking action.",
                "Do not disclose confidential information."
            ]
        else:
            summary = "No immediate scam or phishing indicators identified in this message."
            recommendations = [
                "Safe to proceed. Continue observing standard cyber hygiene."
            ]

        primary_rec = recommendations[0] if recommendations else "Safe to proceed."
        fraud_verdict = derive_fraud_verdict(risk_score, threat_level, categories)
        confidence_score = calculate_confidence(risk_score, "heuristic_fallback", len(flagged))

        return {
            "risk_score": risk_score,
            "classification": threat_level,
            "threat_level": threat_level,
            "fraud_verdict": fraud_verdict,
            "confidence_score": confidence_score,
            "reasons": flagged if flagged else ["No adverse security indicators detected in message."],
            "recommendation": primary_rec,
            "detected_patterns": categories,
            "analysis_source": "heuristic_fallback",
            "categories": categories,
            "summary": summary,
            "flagged_indicators": flagged,
            "recommendations": recommendations,
            "engine": "heuristic_engine_v1"
        }

    def scan(self, message_text: str) -> dict:
        """
        Execute scan pipeline for message text:
        1. Run deep heuristic baseline
        2. Attempt Gemini AI semantic analysis if configured
        3. If Gemini fails or is unconfigured, fall back seamlessly to heuristics
        4. Persist record into SQLite
        """
        heuristic_res = self._heuristic_analysis(message_text)

        # Attempt Gemini AI analysis
        ai_res, ai_err = None, None
        if self.ai_service.is_configured():
            try:
                ai_res, ai_err = self.ai_service.analyze_message(message_text)
            except Exception as e:
                ai_err = str(e)
                logger.warning(f"AI service exception: {e}")

        # Choose AI result if returned, otherwise preserve heuristic assessment
        if ai_res:
            final_assessment = ai_res
        else:
            final_assessment = heuristic_res
            fallback_reason = f"heuristic_fallback ({ai_err})" if ai_err else "heuristic_fallback"
            final_assessment["analysis_source"] = fallback_reason

        risk_score = float(final_assessment.get("risk_score", heuristic_res["risk_score"]))
        classification = str(final_assessment.get("classification", heuristic_res["classification"])).upper()
        reasons = final_assessment.get("reasons", heuristic_res["reasons"])
        recommendation = final_assessment.get("recommendation", heuristic_res["recommendation"])
        detected_patterns = final_assessment.get("detected_patterns", heuristic_res["detected_patterns"])
        analysis_source = final_assessment.get("analysis_source", "heuristic_fallback")

        fraud_verdict = final_assessment.get("fraud_verdict") or derive_fraud_verdict(
            risk_score, classification, detected_patterns
        )
        confidence_score = float(final_assessment.get("confidence_score") or calculate_confidence(
            risk_score, analysis_source, len(reasons)
        ))

        scan_record = {
            "scan_type": "message",
            "target_content": message_text,
            "risk_score": risk_score,
            "classification": classification,
            "threat_level": classification,
            "fraud_verdict": fraud_verdict,
            "confidence_score": round(confidence_score, 2),
            "reasons": reasons,
            "recommendation": recommendation,
            "detected_patterns": detected_patterns,
            "analysis_source": analysis_source,
            "categories": detected_patterns,
            "summary": final_assessment.get("summary", heuristic_res["summary"]),
            "analysis_details": {
                **final_assessment,
                "fraud_verdict": fraud_verdict,
                "confidence_score": round(confidence_score, 2),
                "engine_used": analysis_source
            },
            "flagged_indicators": reasons,
            "recommendations": final_assessment.get("recommendations", heuristic_res["recommendations"])
        }

        # Persist to SQLite
        scan_id = ScanModel.create(scan_record)
        scan_record["id"] = scan_id

        return scan_record
