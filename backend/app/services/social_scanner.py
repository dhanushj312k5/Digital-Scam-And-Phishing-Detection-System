import re
import logging
from app.services.gemini_service import GeminiAIService
from app.services.url_scanner import UrlScanner
from app.models.scan_model import ScanModel, derive_fraud_verdict, calculate_confidence

logger = logging.getLogger(__name__)

# Mandatory Disclaimer as specified in requirement 5
MANDATORY_DISCLAIMER = (
    "ZEROX AI analyzes the information provided and identifies suspicious indicators. "
    "It does not independently verify account ownership or guarantee that an account is genuine."
)

# Brands frequently impersonated across social networks
PROTECTED_SOCIAL_BRANDS = [
    "instagram", "facebook", "meta", "whatsapp", "telegram",
    "twitter", "apple", "google", "binance", "amazon",
    "paypal", "netflix", "microsoft", "linkedin", "snapchat", "youtube",
    "elonmusk", "elon", "musk", "tesla", "spacex", "vitalik", "coinbase"
]

# Spoofed support / authority keywords
SUPPORT_KEYWORDS = [
    "support", "help", "helpdesk", "verify", "verification",
    "official", "care", "service", "security", "team", "recovery", "agent",
    "giveaway", "airdrop", "promo", "reward"
]

# Crypto / Investment / Financial Scam keywords
CRYPTO_SCAM_KEYWORDS = [
    "crypto", "forex", "bitcoin", "btc", "eth", "investment", "guaranteed profit",
    "guaranteed 1000%", "1000%", "daily return", "daily profit", "signals", "trading expert",
    "doubling", "double your", "airdrop", "passive income", "earn daily", "binary option",
    "vip group", "mining pool", "gas fee", "claim free 0.5"
]

# Task scam & recruitment scam phrases
TASK_SCAM_PHRASES = [
    "like youtube videos", "part-time job", "remote task", "remote part-time",
    "rating apps", "rating products", "earn $", "earn ₹", "daily payout",
    "telegram hr", "hiring manager", "hotel review task", "contact our project manager",
    "working 30 minutes"
]

# Credential, copyright, & account threat phrases
CREDENTIAL_PHRASES = [
    "send otp", "verification code", "share 2fa", "your password",
    "pin code", "account will be suspended", "copyright infringement", "appeal here",
    "violates copyright", "permanently deleted", "verify your login", "security desk",
    "appeal immediately"
]

# Emergency money & family distress impersonation phrases
EMERGENCY_SCAM_PHRASES = [
    "phone broke", "temporary number", "stranded at", "medical bill",
    "hospital clinic", "send money urgently", "via zelle", "mic is broken",
    "new phone number, send money"
]


class SocialMediaScanner:
    """
    Dedicated Social Media Scam & Fake Profile Forensic Analyzer.
    Examines profile handles, bios, shared links, and received messages for
    impersonation, social engineering, credential harvesting, and financial fraud.
    STRICT POLICY: Never accesses private account APIs, never bypasses restrictions,
    and analyzes strictly the user-supplied data without live scraping.
    """

    def __init__(self):
        self.ai_service = GeminiAIService()
        self.url_scanner = UrlScanner()

    def _extract_embedded_links(self, text: str) -> list[str]:
        """Extract URLs embedded in text for static forensic examination."""
        if not text:
            return []
        pattern = r"(?:https?://|www\.)[^\s/$.?#].[^\s]*"
        return re.findall(pattern, text, re.IGNORECASE)

    def _heuristic_analysis(self, data: dict) -> dict:
        """
        Evaluate social media signals against known impersonation,
        financial fraud, task scams, and social engineering heuristic vectors.
        """
        platform = data.get("platform", "Social Media")
        username = (data.get("username") or "").lower()
        display_name = (data.get("display_name") or "").lower()
        bio = (data.get("bio") or "").lower()
        message = (data.get("message") or "").lower()
        shared_link = (data.get("shared_link") or "").strip()
        profile_url = (data.get("profile_url") or "").strip()

        # If username is omitted but profile_url is provided, derive candidate handle
        if not username and profile_url:
            from urllib.parse import urlparse
            try:
                parsed_u = urlparse(profile_url)
                path_parts = [p for p in parsed_u.path.strip("/").split("/") if p]
                if path_parts:
                    candidate = path_parts[-1]
                    if candidate.startswith("@"):
                        candidate = candidate[1:]
                    if candidate and candidate.lower() not in ("in", "user", "channel", "c", "p", "profile", "post"):
                        username = candidate.lower()
            except Exception:
                pass

        flagged = []
        categories = []
        risk_score = 0
        assessment = "Standard Account"

        display_handle = data.get('username') or username

        # 1. Username Impersonation Checks
        has_brand = any(brand in username for brand in PROTECTED_SOCIAL_BRANDS)
        has_support_term = any(term in username for term in SUPPORT_KEYWORDS)
        has_trailing_digits = bool(re.search(r"\d{3,}$", username))

        if has_brand and has_support_term:
            flagged.append(
                f"Impersonation Handle Pattern: Handle '@{display_handle}' combines protected brand with authority/support tags."
            )
            categories.extend(["Brand Impersonation", "Fake Support"])
            risk_score += 65
            assessment = "Brand / Support Impersonator"

        if has_support_term and has_trailing_digits:
            flagged.append(
                f"Suspicious Support Handle: Random trailing digits in '@{display_handle}' are typical of disposable fake helpdesk accounts."
            )
            categories.append("Deceptive Handle")
            risk_score += 35

        # Check for homoglyphs in username (e.g. met4, paypa1, app1e)
        homoglyphs = [("0", "o"), ("1", "l"), ("1", "i"), ("4", "a"), ("5", "s")]
        for char, target in homoglyphs:
            if char in username:
                for brand in PROTECTED_SOCIAL_BRANDS:
                    if brand in username.replace(char, target) and brand not in username:
                        flagged.append(f"Homoglyph/Typosquatting Trick: Username replaces '{target}' with '{char}' to spoof {brand.title()}.")
                        categories.append("Homoglyph Spoofing")
                        risk_score += 55
                        assessment = "Typosquatting Account"

        # Check if username directly contains financial / crypto solicitation bait
        has_crypto_handle = any(term in username for term in ["crypto", "signals", "trading", "airdrop", "giveaway", "profit", "mining"])
        if has_crypto_handle:
            flagged.append(
                f"Financial/Crypto Bait Handle: Handle '@{display_handle}' contains speculative trading, airdrop, or giveaway keywords."
            )
            categories.append("Financial Scam")
            risk_score += 50
            if assessment == "Standard Account":
                assessment = "Crypto / Investment Scheme"

        # 2. Bio & Profile Claims Checks
        has_crypto = any(term in bio or term in message for term in CRYPTO_SCAM_KEYWORDS)
        if has_crypto:
            flagged.append("High-Yield Investment / Crypto Bait: Profile or message advertises unrealistic financial returns, trading signals, or crypto giveaways.")
            categories.append("Financial Scam")
            risk_score += 65
            assessment = "Crypto / Investment Scheme"

        has_support_claim = any(term in bio or term in display_name for term in ["official support", "customer care", "unblock account", "dm for help", "helpline", "security desk", "security team"])
        if has_support_claim:
            flagged.append("Unverified Helpdesk / Authority Claim: Profile claims to offer official security, recovery, or customer care services.")
            categories.append("Fake Support")
            risk_score += 50
            if assessment == "Standard Account":
                assessment = "Fake Support / Helpdesk"

        # Bio redirection to unknown messaging handles
        if ("telegram" in bio or "whatsapp" in bio or "dm on" in bio) and ("@" in bio or "+" in bio):
            flagged.append("Off-Platform Redirection: Profile urges victims to move communication to unmonitored messaging apps.")
            categories.append("Social Engineering")
            risk_score += 25

        # 3. Message / Direct Message Threat Checks
        has_credential_threat = any(phrase in message or phrase in bio for phrase in CREDENTIAL_PHRASES)
        if has_credential_threat:
            flagged.append("Credential / OTP Harvesting or Threat: Message solicits security credentials, passwords, or threatens account closure.")
            categories.extend(["Credential Theft", "Urgency Manipulation"])
            risk_score += 70
            assessment = "Credential Harvesting Scam"

        has_task_scam = any(phrase in message or phrase in bio for phrase in TASK_SCAM_PHRASES)
        if has_task_scam:
            flagged.append("Task / Job Scam Pattern: Message offers disproportionate daily compensation for simple remote tasks (app ratings, video liking).")
            categories.extend(["Task Scam", "Advance Fee Fraud"])
            risk_score += 70
            assessment = "Task & Recruitment Scam"

        has_emergency = any(phrase in message for phrase in EMERGENCY_SCAM_PHRASES) or (
            "urgent" in message and any(w in message for w in ["money", "cash", "upi", "transfer", "emergency", "hospital", "zelle"])
        )
        if has_emergency:
            flagged.append("Emergency Impersonation / Money Appeal: Message mimics a friend/family member in distress requesting urgent funds.")
            categories.extend(["Social Engineering", "Emergency Scam"])
            risk_score += 70
            assessment = "Emergency Impersonation Scam"

        # 4. Embedded / Shared Links Analysis (Static Forensics)
        links_to_test = []
        if profile_url:
            links_to_test.append(profile_url)
        if shared_link:
            links_to_test.append(shared_link)
        links_to_test.extend(self._extract_embedded_links(f"{bio} {message}"))
        # Deduplicate
        links_to_test = list(dict.fromkeys(links_to_test))

        for link in links_to_test[:2]:  # inspect up to 2 links
            link_heuristics = self.url_scanner._static_heuristic_analysis(link)
            if link_heuristics.get("risk_score", 0) >= 40:
                flagged.append(f"Suspicious Embedded Destination Link ({link}): {link_heuristics.get('summary', 'Deceptive structural markers.')}")
                categories.extend(link_heuristics.get("categories", ["Phishing"]))
                risk_score += 55
                if assessment == "Standard Account":
                    assessment = "Phishing Link Distribution"

        # If only handle or URL is provided, include transparent scope note
        if not (bio or message):
            flagged.append(
                "Assessment Scope: Evaluation is based solely on handle syntax and URL structure. "
                "ZEROX AI does not scrape private account databases, follower counts, or creation dates."
            )

        # Cap score between 0 and 100
        risk_score = min(100, max(0, risk_score))

        # Threat classification
        if risk_score >= 70:
            threat_level = "CRITICAL"
        elif risk_score >= 50:
            threat_level = "HIGH"
        elif risk_score >= 25:
            threat_level = "MEDIUM"
        elif risk_score >= 10:
            threat_level = "LOW"
        else:
            threat_level = "SAFE"

        categories = list(dict.fromkeys(categories))
        if not categories:
            categories = ["Clean Profile Indicators" if threat_level == "SAFE" else "Standard Social Profile"]

        # Recommendations based on threat level and platform
        if threat_level in ("CRITICAL", "HIGH"):
            summary = f"High-risk {platform} profile exhibiting strong indicators of {assessment.lower()}."
            recommendations = [
                f"Do NOT click links, send verification OTPs, or transfer funds to this account.",
                f"Block and report this profile to {platform}'s trust and safety team.",
                "If an official brand was impersonated, reach out only through verified official channels."
            ]
        elif threat_level == "MEDIUM":
            summary = f"Profile exhibits anomalous indicators or off-platform communication requests on {platform}."
            recommendations = [
                "Verify the contact's identity through an independent secondary communication channel.",
                "Avoid sharing personal phone numbers or private information."
            ]
        else:
            summary = f"No obvious impersonation tactics or deceptive social engineering patterns identified for this {platform} account."
            recommendations = [
                "Observe standard social media security hygiene. Never disclose passwords or 2FA codes."
            ]

        fraud_verdict = derive_fraud_verdict(risk_score, threat_level, categories)
        confidence_score = calculate_confidence(risk_score, "heuristic_fallback", len(flagged))

        return {
            "risk_score": float(risk_score),
            "classification": threat_level,
            "threat_level": threat_level,
            "fraud_verdict": fraud_verdict,
            "confidence_score": confidence_score,
            "account_assessment": assessment if threat_level != "SAFE" else "Legitimate / Benign Profile",
            "reasons": flagged if flagged else ["No suspicious username patterns, impersonation keywords, or coercive copy detected."],
            "recommendation": recommendations[0],
            "detected_patterns": categories,
            "analysis_source": "heuristic_fallback",
            "categories": categories,
            "summary": summary,
            "flagged_indicators": flagged,
            "recommendations": recommendations
        }

    def scan(self, social_data: dict) -> dict:
        """
        Execute safe static scan pipeline for social media profiles and messages:
        1. Run static heuristic and lexical analysis
        2. Attempt Google Gemini AI contextual threat reasoning if configured
        3. Fall back seamlessly to heuristics on error or when offline
        4. Persist record into SQLite with scan_type='social_media'
        """
        platform = social_data.get("platform", "Instagram")
        username = social_data.get("username", "")
        profile_url = social_data.get("profile_url", "")
        
        if not username and profile_url:
            from urllib.parse import urlparse
            try:
                parts = [p for p in urlparse(profile_url).path.strip("/").split("/") if p]
                if parts:
                    cand = parts[-1]
                    if cand.startswith("@"):
                        cand = cand[1:]
                    if cand and cand.lower() not in ("in", "user", "channel", "c", "p", "profile", "post"):
                        username = cand
            except Exception:
                pass

        target_display = f"[{platform}] @{username}" if username else f"[{platform}] {profile_url or 'Social Profile'}"

        heuristic_res = self._heuristic_analysis(social_data)

        # Attempt Gemini AI static reasoning if configured
        ai_res, ai_err = None, None
        if self.ai_service.is_configured():
            try:
                ai_res, ai_err = self.ai_service.analyze_social_media(
                    social_data=social_data,
                    heuristic_signals=heuristic_res.get("flagged_indicators", [])
                )
            except Exception as e:
                ai_err = str(e)
                logger.warning(f"Gemini social media analysis exception: {e}")

        if ai_res:
            final_assessment = ai_res
        else:
            final_assessment = heuristic_res
            fallback_reason = f"heuristic_fallback ({ai_err})" if ai_err else "heuristic_fallback"
            final_assessment["analysis_source"] = fallback_reason

        risk_score = float(final_assessment.get("risk_score", heuristic_res["risk_score"]))
        classification = str(final_assessment.get("classification", heuristic_res["classification"])).upper()
        account_assessment = final_assessment.get("account_assessment", heuristic_res.get("account_assessment", "Profile Evaluated"))
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
            "scan_type": "social_media",
            "target_content": target_display,
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
            "summary": final_assessment.get("summary", heuristic_res.get("summary", "")),
            "analysis_details": {
                "platform": platform,
                "username": username,
                "profile_url": profile_url,
                "display_name": social_data.get("display_name", ""),
                "account_assessment": account_assessment,
                "fraud_verdict": fraud_verdict,
                "confidence_score": round(confidence_score, 2),
                "disclaimer": MANDATORY_DISCLAIMER,
                "engine_used": analysis_source
            },
            "flagged_indicators": reasons,
            "recommendations": final_assessment.get("recommendations", heuristic_res.get("recommendations", []))
        }

        # Persist to SQLite
        scan_id = ScanModel.create(scan_record)
        scan_record["id"] = scan_id

        return {
            **scan_record,
            "platform": platform,
            "username": username,
            "account_assessment": account_assessment,
            "disclaimer": MANDATORY_DISCLAIMER
        }
