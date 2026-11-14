import os
import json
import logging
from pathlib import Path
from dotenv import dotenv_values
from flask import current_app

logger = logging.getLogger(__name__)

# Base directory pointing to backend/
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


class GeminiAIService:
    """Service wrapper for Google Gemini AI using the official google-genai SDK."""

    def __init__(self, api_key: str = None, model: str = None):
        self._api_key = api_key
        self._model_name = model
        self._client = None

    def _resolve_config(self) -> tuple[str, str]:
        """
        Dynamically read GEMINI_API_KEY and GEMINI_MODEL directly from backend/.env,
        falling back to Flask config or OS environment variables.
        """
        api_key = self._api_key
        model = self._model_name

        env_file = BACKEND_DIR / ".env"
        if env_file.exists():
            env_vars = dotenv_values(env_file)
            if not api_key:
                api_key = (env_vars.get("GEMINI_API_KEY") or "").strip()
            if not model:
                model = (env_vars.get("GEMINI_MODEL") or "").strip()

        if not api_key:
            try:
                api_key = current_app.config.get("GEMINI_API_KEY", "").strip()
            except RuntimeError:
                api_key = os.environ.get("GEMINI_API_KEY", "").strip()

        if not model or model == "gemini-2.5-flash":
            try:
                model = current_app.config.get("GEMINI_MODEL", "gemini-3.5-flash-lite").strip()
            except RuntimeError:
                model = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite").strip()

        if model == "gemini-2.5-flash":
            model = "gemini-3.5-flash-lite"

        return api_key, model or "gemini-3.5-flash-lite"

    def is_configured(self) -> bool:
        """Check whether a non-placeholder Gemini API key is configured."""
        key, _ = self._resolve_config()
        return bool(key and key not in ("your_gemini_api_key_here", "your_actual_gemini_api_key_here"))

    def _get_client(self):
        """Lazily initialize Google GenAI Client with configured API key and timeout."""
        if not self.is_configured():
            return None

        key, _ = self._resolve_config()
        try:
            from google import genai
            from google.genai import types
            return genai.Client(api_key=key, http_options=types.HttpOptions(timeout=25000))
        except ImportError:
            logger.warning("google-genai package not found. AI features will fallback to heuristic analysis.")
            return None
        except Exception as e:
            logger.error(f"Failed to instantiate Google GenAI client: {e}")
            return None

    def verify_connection(self) -> dict:
        """
        Perform a real live Gemini API verification request against the configured model
        using an actual generate_content probe with JSON schema parsing.
        Never reports active unless a real API request succeeds.
        """
        api_key, model = self._resolve_config()

        if not self.is_configured():
            return {
                "available": False,
                "configured": False,
                "model": model,
                "analysis_source": "heuristic_fallback",
                "error": "GEMINI_API_KEY is not configured or is a placeholder in backend/.env.",
                "error_type": "UNCONFIGURED"
            }

        client = self._get_client()
        if not client:
            return {
                "available": False,
                "configured": True,
                "model": model,
                "analysis_source": "heuristic_fallback",
                "error": "Failed to initialize Google GenAI client instance.",
                "error_type": "CLIENT_INIT_FAILED"
            }

        try:
            # Perform a real generate_content probe with JSON schema verification
            probe_resp = client.models.generate_content(
                model=model,
                contents='Ping test. Return strictly valid JSON: {"status": "ok", "service": "ZEROX_AI"}',
                config={'response_mime_type': 'application/json'}
            )
            parsed_probe = json.loads(probe_resp.text)
            if parsed_probe.get("status") != "ok":
                raise ValueError(f"Unexpected probe payload: {probe_resp.text}")

            return {
                "available": True,
                "configured": True,
                "model": model,
                "display_name": f"Google Gemini ({model})",
                "analysis_source": f"gemini_ai ({model})",
                "error": None,
                "error_type": None,
                "message": f"Successfully verified real Gemini inference with model '{model}'."
            }
        except Exception as e:
            err_str = str(e)
            error_type = "API_ERROR"
            user_msg = "Gemini API request failed."

            if "API_KEY_INVALID" in err_str or "400" in err_str or "403" in err_str or "unauthorized" in err_str.lower():
                error_type = "AUTHENTICATION_ERROR"
                user_msg = "Gemini API key is invalid or unauthorized (API_KEY_INVALID)."
            elif "404" in err_str or "NOT_FOUND" in err_str or "not found" in err_str.lower():
                error_type = "MODEL_NOT_FOUND"
                user_msg = f"Model '{model}' was not found or is unavailable for this API key."
            elif "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
                error_type = "QUOTA_EXCEEDED"
                user_msg = "Gemini API quota exceeded or rate limit reached (HTTP 429)."
            elif "timeout" in err_str.lower() or "timed out" in err_str.lower():
                error_type = "TIMEOUT"
                user_msg = "Gemini API connection timed out."
            else:
                user_msg = f"Gemini API error: {err_str}"

            logger.warning(f"Gemini live verification failed: [{error_type}] {user_msg}")
            return {
                "available": False,
                "configured": True,
                "model": model,
                "analysis_source": "heuristic_fallback",
                "error": user_msg,
                "error_type": error_type
            }

    def analyze_message(self, message_text: str) -> tuple[dict | None, str | None]:
        """
        Analyze a message (SMS, Email, DM) for scam, phishing, urgency manipulation,
        and credential theft using Google Gemini AI.
        Returns: (structured_result_dict, error_message_or_None)
        """
        if not self.is_configured():
            return None, "GEMINI_API_KEY is not configured in backend/.env"

        client = self._get_client()
        if not client:
            return None, "Google GenAI client initialization failed"

        _, model = self._resolve_config()

        system_instruction = (
            "You are ZEROX AI, an elite cybersecurity scam and phishing detection engine. "
            "Analyze the given incoming message for social engineering, urgency manipulation, "
            "banking fraud, credential theft, and smishing patterns. "
            "Respond strictly in valid JSON adherence."
        )

        prompt = f"""
Analyze this incoming message for scam or security threats:
---
{message_text}
---

Return JSON adhering EXACTLY to this schema:
{{
    "risk_score": <number between 0 and 100>,
    "classification": "<SAFE | LOW | MEDIUM | HIGH | CRITICAL>",
    "fraud_verdict": "<FRAUD_DETECTED | NO_FRAUD_DETECTED | NEEDS_REVIEW>",
    "confidence_score": <number between 0.70 and 0.98>,
    "reasons": [
        "<Detailed bullet explaining specific forensic threat signal 1>",
        "<Detailed bullet explaining specific forensic threat signal 2>"
    ],
    "recommendation": "<Clear, concise actionable advice for the user>",
    "detected_patterns": [
        "<Category 1, e.g. Urgency Manipulation>",
        "<Category 2, e.g. Banking Phishing>"
    ],
    "detailed_reasoning": "<In-depth forensic reasoning>"
}}
"""

        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config={
                    "system_instruction": system_instruction,
                    "response_mime_type": "application/json"
                }
            )

            if not response or not response.text:
                return None, "Empty response received from Gemini API"

            parsed = json.loads(response.text)

            # Validate & normalize required fields
            risk_score = float(parsed.get("risk_score", 50.0))
            risk_score = max(0.0, min(100.0, risk_score))
            classification = str(parsed.get("classification", "MEDIUM")).upper()
            if classification not in ("SAFE", "LOW", "MEDIUM", "HIGH", "CRITICAL"):
                if risk_score >= 80:
                    classification = "CRITICAL"
                elif risk_score >= 60:
                    classification = "HIGH"
                elif risk_score >= 35:
                    classification = "MEDIUM"
                elif risk_score >= 15:
                    classification = "LOW"
                else:
                    classification = "SAFE"

            reasons = parsed.get("reasons") or []
            if isinstance(reasons, str):
                reasons = [reasons]

            recommendation = parsed.get("recommendation") or "Exercise caution with unsolicited messages."
            recommendations_list = [recommendation] if isinstance(recommendation, str) else list(recommendation)
            if not recommendation and recommendations_list:
                recommendation = recommendations_list[0]

            detected_patterns = parsed.get("detected_patterns") or []
            if isinstance(detected_patterns, str):
                detected_patterns = [detected_patterns]

            # Derive or validate fraud_verdict
            raw_verdict = str(parsed.get("fraud_verdict", "")).upper()
            if raw_verdict in ("FRAUD_DETECTED", "NO_FRAUD_DETECTED", "NEEDS_REVIEW"):
                fraud_verdict = raw_verdict
            else:
                from app.models.scan_model import derive_fraud_verdict
                fraud_verdict = derive_fraud_verdict(risk_score, classification, detected_patterns)

            # Derive or validate confidence_score
            try:
                confidence_score = float(parsed.get("confidence_score", 0.0))
                if confidence_score < 0.60 or confidence_score > 0.99:
                    from app.models.scan_model import calculate_confidence
                    confidence_score = calculate_confidence(risk_score, f"gemini_ai ({model})", len(reasons))
            except (ValueError, TypeError):
                from app.models.scan_model import calculate_confidence
                confidence_score = calculate_confidence(risk_score, f"gemini_ai ({model})", len(reasons))

            detailed_reasoning = parsed.get("detailed_reasoning") or (reasons[0] if reasons else "")

            structured_result = {
                "risk_score": risk_score,
                "classification": classification,
                "fraud_verdict": fraud_verdict,
                "confidence_score": round(confidence_score, 2),
                "reasons": reasons,
                "recommendation": recommendation,
                "detected_patterns": detected_patterns,
                "analysis_source": f"gemini_ai ({model})",
                # UI compatibility fields
                "threat_level": classification,
                "categories": detected_patterns,
                "summary": detailed_reasoning or (reasons[0] if reasons else "Gemini analysis completed."),
                "flagged_indicators": reasons,
                "recommendations": recommendations_list,
                "detailed_reasoning": detailed_reasoning
            }
            return structured_result, None

        except json.JSONDecodeError as je:
            err_msg = f"Invalid JSON response from Gemini model: {je}"
            logger.warning(err_msg)
            return None, err_msg
        except Exception as e:
            err_str = str(e)
            err_msg = f"Gemini message scan API error: {err_str}"
            logger.warning(err_msg)
            return None, err_msg

    def analyze_url(self, url: str, heuristic_signals: list[str] = None) -> tuple[dict | None, str | None]:
        """
        Analyze a suspicious URL for phishing, typosquatting, brand impersonation,
        and credential harvesting using Google Gemini AI.
        STRICT SECURITY DIRECTIVE: Performs static lexical decomposition only. NEVER connects to the target URL.
        Returns: (structured_result_dict, error_message_or_None)
        """
        if not self.is_configured():
            return None, "GEMINI_API_KEY is not configured in backend/.env"

        client = self._get_client()
        if not client:
            return None, "Google GenAI client initialization failed"

        _, model = self._resolve_config()
        signals_text = ", ".join(heuristic_signals) if heuristic_signals else "None initially flagged"

        system_instruction = (
            "You are ZEROX AI, a cybersecurity static URL threat analyzer. "
            "Examine domain syntax, structural markers, typosquatting, homoglyphs, brand impersonation, "
            "and credential collection patterns. "
            "CRITICAL SECURITY RULE: DO NOT visit, browse, or initiate network connections to the target URL. "
            "Perform static reasoning only on the provided domain text and lexical components. "
            "Respond strictly in valid JSON adherence."
        )

        prompt = f"""
Perform static threat analysis on this URL text and structural heuristics:
---
Target URL: {url}
Initial Detected Heuristic Signals: {signals_text}
---

Return JSON adhering EXACTLY to this schema:
{{
    "risk_score": <number between 0 and 100>,
    "classification": "<SAFE | LOW | MEDIUM | HIGH | CRITICAL>",
    "fraud_verdict": "<FRAUD_DETECTED | NO_FRAUD_DETECTED | NEEDS_REVIEW>",
    "confidence_score": <number between 0.70 and 0.98>,
    "target_brand": "<Name of impersonated brand or 'None Detected'>",
    "reasons": [
        "<Detailed bullet explaining specific forensic threat signal 1>",
        "<Detailed bullet explaining specific forensic threat signal 2>"
    ],
    "recommendation": "<Clear, concise actionable advice for the user>",
    "detected_patterns": [
        "<Category 1, e.g. Typosquatting>",
        "<Category 2, e.g. Brand Impersonation>"
    ],
    "detailed_reasoning": "<In-depth forensic reasoning>"
}}
"""

        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config={
                    "system_instruction": system_instruction,
                    "response_mime_type": "application/json"
                }
            )

            if not response or not response.text:
                return None, "Empty response received from Gemini API"

            parsed = json.loads(response.text)

            risk_score = float(parsed.get("risk_score", 50.0))
            risk_score = max(0.0, min(100.0, risk_score))
            classification = str(parsed.get("classification", "MEDIUM")).upper()
            if classification not in ("SAFE", "LOW", "MEDIUM", "HIGH", "CRITICAL"):
                if risk_score >= 80:
                    classification = "CRITICAL"
                elif risk_score >= 60:
                    classification = "HIGH"
                elif risk_score >= 35:
                    classification = "MEDIUM"
                elif risk_score >= 15:
                    classification = "LOW"
                else:
                    classification = "SAFE"

            target_brand = parsed.get("target_brand") or "None Detected"

            reasons = parsed.get("reasons") or []
            if isinstance(reasons, str):
                reasons = [reasons]

            recommendation = parsed.get("recommendation") or "Verify the web address through official channels before browsing."
            recommendations_list = [recommendation] if isinstance(recommendation, str) else list(recommendation)
            if not recommendation and recommendations_list:
                recommendation = recommendations_list[0]

            detected_patterns = parsed.get("detected_patterns") or []
            if isinstance(detected_patterns, str):
                detected_patterns = [detected_patterns]

            # Derive or validate fraud_verdict
            raw_verdict = str(parsed.get("fraud_verdict", "")).upper()
            if raw_verdict in ("FRAUD_DETECTED", "NO_FRAUD_DETECTED", "NEEDS_REVIEW"):
                fraud_verdict = raw_verdict
            else:
                from app.models.scan_model import derive_fraud_verdict
                fraud_verdict = derive_fraud_verdict(risk_score, classification, detected_patterns)

            # Derive or validate confidence_score
            try:
                confidence_score = float(parsed.get("confidence_score", 0.0))
                if confidence_score < 0.60 or confidence_score > 0.99:
                    from app.models.scan_model import calculate_confidence
                    confidence_score = calculate_confidence(risk_score, f"gemini_ai ({model})", len(reasons))
            except (ValueError, TypeError):
                from app.models.scan_model import calculate_confidence
                confidence_score = calculate_confidence(risk_score, f"gemini_ai ({model})", len(reasons))

            detailed_reasoning = parsed.get("detailed_reasoning") or (reasons[0] if reasons else "")

            structured_result = {
                "risk_score": risk_score,
                "classification": classification,
                "fraud_verdict": fraud_verdict,
                "confidence_score": round(confidence_score, 2),
                "target_brand": target_brand,
                "reasons": reasons,
                "recommendation": recommendation,
                "detected_patterns": detected_patterns,
                "analysis_source": f"gemini_ai ({model})",
                # UI compatibility fields
                "threat_level": classification,
                "categories": detected_patterns,
                "summary": detailed_reasoning or (reasons[0] if reasons else "Gemini URL analysis completed."),
                "flagged_indicators": reasons,
                "recommendations": recommendations_list,
                "detailed_reasoning": detailed_reasoning
            }
            return structured_result, None

        except json.JSONDecodeError as je:
            err_msg = f"Invalid JSON response from Gemini model: {je}"
            logger.warning(err_msg)
            return None, err_msg
        except Exception as e:
            err_str = str(e)
            err_msg = f"Gemini URL scan API error: {err_str}"
            logger.warning(err_msg)
            return None, err_msg

    def analyze_upi_payment(self, upi_data: dict, heuristic_signals: list[str] = None) -> tuple[dict | None, str | None]:
        """
        Analyze a UPI payment QR payload for financial fraud, advance fee deception,
        reverse payment scams, and deceptive merchant claims using Google Gemini AI.
        Returns: (structured_result_dict, error_message_or_None)
        """
        if not self.is_configured():
            return None, "GEMINI_API_KEY is not configured in backend/.env"

        client = self._get_client()
        if not client:
            return None, "Google GenAI client initialization failed"

        _, model = self._resolve_config()
        signals_text = ", ".join(heuristic_signals) if heuristic_signals else "None initially flagged"

        payee_vpa = upi_data.get("pa", "Not specified")
        payee_name = upi_data.get("pn", "Not specified")
        amount = upi_data.get("am", "Flexible / Not set")
        currency = upi_data.get("cu", "INR")
        note = upi_data.get("tn", "No transaction note")
        merchant_code = upi_data.get("mc", "None")
        ref_url = upi_data.get("url", "None")

        system_instruction = (
            "You are ZEROX AI, an elite financial fraud and UPI cybersecurity analyst. "
            "Examine UPI payment parameters for scam patterns: reverse payment scams "
            "('scan QR to receive funds/cashback/refund'), impersonation of banking authorities or customer care, "
            "forced unusual payments, deceptive transaction notes, or phishing gateway links. "
            "IMPORTANT GUIDELINE: Do not mark a personal UPI ID as fraud solely because it is unverified. "
            "Only classify as fraud if there is clear deceptive intent, social engineering, or brand impersonation. "
            "Respond strictly in valid JSON adherence."
        )

        prompt = f"""
Perform financial fraud and risk analysis on this UPI payment QR data:
---
Payee UPI ID (VPA): {payee_vpa}
Payee Name: {payee_name}
Requested Amount: {amount} {currency}
Transaction Note / Purpose: {note}
Merchant Category Code: {merchant_code}
Embedded Payment Link / URL: {ref_url}
Pre-flagged Heuristic Signals: {signals_text}
---

Return JSON adhering EXACTLY to this schema:
{{
    "risk_score": <number between 0 and 100>,
    "classification": "<SAFE | LOW | MEDIUM | HIGH | CRITICAL>",
    "fraud_verdict": "<FRAUD_DETECTED | NO_FRAUD_DETECTED | NEEDS_REVIEW>",
    "confidence_score": <number between 0.70 and 0.98>,
    "payee_assessment": "<Legitimate Merchant | Personal VPA | Suspicious Impersonator | High-Risk Entity>",
    "reasons": [
        "<Detailed bullet explaining specific forensic risk indicator 1>",
        "<Detailed bullet explaining specific forensic risk indicator 2>"
    ],
    "recommendation": "<Clear, actionable advice for the user before making any payment>",
    "detected_patterns": [
        "<Category 1, e.g. Reverse Payment Scam>",
        "<Category 2, e.g. Impersonation>"
    ],
    "detailed_reasoning": "<In-depth financial security reasoning>"
}}
"""

        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config={
                    "system_instruction": system_instruction,
                    "response_mime_type": "application/json"
                }
            )

            if not response or not response.text:
                return None, "Empty response received from Gemini API"

            parsed = json.loads(response.text)

            risk_score = float(parsed.get("risk_score", 50.0))
            risk_score = max(0.0, min(100.0, risk_score))
            classification = str(parsed.get("classification", "MEDIUM")).upper()
            if classification not in ("SAFE", "LOW", "MEDIUM", "HIGH", "CRITICAL"):
                if risk_score >= 80:
                    classification = "CRITICAL"
                elif risk_score >= 60:
                    classification = "HIGH"
                elif risk_score >= 35:
                    classification = "MEDIUM"
                elif risk_score >= 15:
                    classification = "LOW"
                else:
                    classification = "SAFE"

            reasons = parsed.get("reasons") or []
            if isinstance(reasons, str):
                reasons = [reasons]

            recommendation = parsed.get("recommendation") or "Always verify payee identity before authorizing payments."
            recommendations_list = [recommendation] if isinstance(recommendation, str) else list(recommendation)
            if not recommendation and recommendations_list:
                recommendation = recommendations_list[0]

            detected_patterns = parsed.get("detected_patterns") or []
            if isinstance(detected_patterns, str):
                detected_patterns = [detected_patterns]

            # Derive or validate fraud_verdict
            raw_verdict = str(parsed.get("fraud_verdict", "")).upper()
            if raw_verdict in ("FRAUD_DETECTED", "NO_FRAUD_DETECTED", "NEEDS_REVIEW"):
                fraud_verdict = raw_verdict
            else:
                from app.models.scan_model import derive_fraud_verdict
                fraud_verdict = derive_fraud_verdict(risk_score, classification, detected_patterns)

            # Derive or validate confidence_score
            try:
                confidence_score = float(parsed.get("confidence_score", 0.0))
                if confidence_score < 0.60 or confidence_score > 0.99:
                    from app.models.scan_model import calculate_confidence
                    confidence_score = calculate_confidence(risk_score, f"gemini_ai ({model})", len(reasons))
            except (ValueError, TypeError):
                from app.models.scan_model import calculate_confidence
                confidence_score = calculate_confidence(risk_score, f"gemini_ai ({model})", len(reasons))

            detailed_reasoning = parsed.get("detailed_reasoning") or (reasons[0] if reasons else "")

            structured_result = {
                "risk_score": risk_score,
                "classification": classification,
                "fraud_verdict": fraud_verdict,
                "confidence_score": round(confidence_score, 2),
                "payee_assessment": parsed.get("payee_assessment", "Standard Payee"),
                "reasons": reasons,
                "recommendation": recommendation,
                "detected_patterns": detected_patterns,
                "analysis_source": f"gemini_ai ({model})",
                # UI compatibility fields
                "threat_level": classification,
                "categories": detected_patterns,
                "summary": detailed_reasoning or (reasons[0] if reasons else "Gemini UPI analysis completed."),
                "flagged_indicators": reasons,
                "recommendations": recommendations_list,
                "detailed_reasoning": detailed_reasoning
            }
            return structured_result, None

        except json.JSONDecodeError as je:
            err_msg = f"Invalid JSON response from Gemini model: {je}"
            logger.warning(err_msg)
            return None, err_msg
        except Exception as e:
            err_str = str(e)
            err_msg = f"Gemini UPI scan API error: {err_str}"
            logger.warning(err_msg)
            return None, err_msg

    def analyze_social_media(self, social_data: dict, heuristic_signals: list[str] = None) -> tuple[dict | None, str | None]:
        """
        Analyze a social media profile, handle, bio, and message for impersonation,
        social engineering, fake recruitment, and scams using Google Gemini AI.
        Returns: (structured_result_dict, error_message_or_None)
        """
        if not self.is_configured():
            return None, "GEMINI_API_KEY is not configured in backend/.env"

        client = self._get_client()
        if not client:
            return None, "Google GenAI client initialization failed"

        _, model = self._resolve_config()
        signals_text = ", ".join(heuristic_signals) if heuristic_signals else "None initially flagged"

        platform = social_data.get("platform", "Social Media")
        username = social_data.get("username", "None provided")
        display_name = social_data.get("display_name", "None provided")
        bio = social_data.get("bio", "None provided")
        message = social_data.get("message", "None provided")
        shared_link = social_data.get("shared_link", "None provided")
        profile_url = social_data.get("profile_url", "None provided")

        system_instruction = (
            "You are ZEROX AI, a world-class social media threat intelligence and impersonation detection expert. "
            f"Analyze the submitted profile data for the platform: {platform}. "
            "Inspect handle naming tricks (extra digits, fake 'support', 'verify', lookalikes), deceptive bio promises "
            "(unrealistic crypto/forex returns, fake giveaway prizes, requests to message unknown WhatsApp/Telegram handles), "
            "and coercive or manipulative message copy (job task scams, OTP requests, urgent money appeals). "
            "IMPORTANT GUIDELINE: You analyze the user-provided data for threat indicators. Never claim internal platform verification or guaranteed account status. "
            "Respond strictly in valid JSON adhering to the specified schema."
        )

        prompt = f"""
Perform social media fraud and impersonation analysis on this profile data:
---
Target Platform: {platform}
Account Handle / Username: {username}
Display Name: {display_name}
Profile URL: {profile_url}
Bio / Profile Description: {bio}
Received Message / Direct Message: {message}
Shared Website Link: {shared_link}
Initial Pre-flagged Heuristic Signals: {signals_text}
---

Return JSON adhering EXACTLY to this schema:
{{
    "risk_score": <number between 0 and 100>,
    "classification": "<SAFE | LOW | MEDIUM | HIGH | CRITICAL>",
    "fraud_verdict": "<FRAUD_DETECTED | NO_FRAUD_DETECTED | NEEDS_REVIEW>",
    "confidence_score": <number between 0.70 and 0.98>,
    "account_assessment": "<Impersonator / Fake Support | Task & Advance Fee Scam | Crypto / Investment Scheme | Suspicious Profile | Legitimate / Benign Account>",
    "reasons": [
        "<Detailed bullet explaining specific forensic risk indicator 1>",
        "<Detailed bullet explaining specific forensic risk indicator 2>"
    ],
    "recommendation": "<Clear, concise actionable advice for the user before interacting with this account>",
    "detected_patterns": [
        "<Category 1, e.g. Fake Recruiter Scam>",
        "<Category 2, e.g. Brand Impersonation>"
    ],
    "detailed_reasoning": "<In-depth forensic reasoning>"
}}
"""

        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config={
                    "system_instruction": system_instruction,
                    "response_mime_type": "application/json"
                }
            )

            if not response or not response.text:
                return None, "Empty response received from Gemini API"

            parsed = json.loads(response.text)

            risk_score = float(parsed.get("risk_score", 50.0))
            risk_score = max(0.0, min(100.0, risk_score))
            classification = str(parsed.get("classification", "MEDIUM")).upper()
            if classification not in ("SAFE", "LOW", "MEDIUM", "HIGH", "CRITICAL"):
                if risk_score >= 80:
                    classification = "CRITICAL"
                elif risk_score >= 60:
                    classification = "HIGH"
                elif risk_score >= 35:
                    classification = "MEDIUM"
                elif risk_score >= 15:
                    classification = "LOW"
                else:
                    classification = "SAFE"

            reasons = parsed.get("reasons") or []
            if isinstance(reasons, str):
                reasons = [reasons]

            recommendation = parsed.get("recommendation") or "Exercise caution and do not disclose sensitive credentials or transfer funds."
            recommendations_list = [recommendation] if isinstance(recommendation, str) else list(recommendation)
            if not recommendation and recommendations_list:
                recommendation = recommendations_list[0]

            detected_patterns = parsed.get("detected_patterns") or []
            if isinstance(detected_patterns, str):
                detected_patterns = [detected_patterns]

            # Derive or validate fraud_verdict
            raw_verdict = str(parsed.get("fraud_verdict", "")).upper()
            if raw_verdict in ("FRAUD_DETECTED", "NO_FRAUD_DETECTED", "NEEDS_REVIEW"):
                fraud_verdict = raw_verdict
            else:
                from app.models.scan_model import derive_fraud_verdict
                fraud_verdict = derive_fraud_verdict(risk_score, classification, detected_patterns)

            # Derive or validate confidence_score
            try:
                confidence_score = float(parsed.get("confidence_score", 0.0))
                if confidence_score < 0.60 or confidence_score > 0.99:
                    from app.models.scan_model import calculate_confidence
                    confidence_score = calculate_confidence(risk_score, f"gemini_ai ({model})", len(reasons))
            except (ValueError, TypeError):
                from app.models.scan_model import calculate_confidence
                confidence_score = calculate_confidence(risk_score, f"gemini_ai ({model})", len(reasons))

            detailed_reasoning = parsed.get("detailed_reasoning") or (reasons[0] if reasons else "")

            structured_result = {
                "risk_score": risk_score,
                "classification": classification,
                "fraud_verdict": fraud_verdict,
                "confidence_score": round(confidence_score, 2),
                "account_assessment": parsed.get("account_assessment", "Profile Evaluated"),
                "reasons": reasons,
                "recommendation": recommendation,
                "detected_patterns": detected_patterns,
                "analysis_source": f"gemini_ai ({model})",
                # UI compatibility fields
                "threat_level": classification,
                "categories": detected_patterns,
                "summary": detailed_reasoning or (reasons[0] if reasons else f"Gemini {platform} profile analysis completed."),
                "flagged_indicators": reasons,
                "recommendations": recommendations_list,
                "detailed_reasoning": detailed_reasoning
            }
            return structured_result, None

        except json.JSONDecodeError as je:
            err_msg = f"Invalid JSON response from Gemini model: {je}"
            logger.warning(err_msg)
            return None, err_msg
        except Exception as e:
            err_str = str(e)
            err_msg = f"Gemini social media scan API error: {err_str}"
            logger.warning(err_msg)
            return None, err_msg
