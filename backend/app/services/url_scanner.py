import re
import logging
from urllib.parse import urlparse
from app.services.gemini_service import GeminiAIService
from app.models.scan_model import ScanModel, derive_fraud_verdict, calculate_confidence

logger = logging.getLogger(__name__)

# Known reputable root domains
REPUTABLE_DOMAINS = {
    "github.com", "google.com", "apple.com", "microsoft.com",
    "amazon.com", "paypal.com", "netflix.com", "wikipedia.org",
    "youtube.com", "linkedin.com", "twitter.com", "x.com",
    "facebook.com", "instagram.com", "stackoverflow.com"
}

# Monitored target brands for typosquatting / homoglyphs
PROTECTED_BRANDS = [
    ("paypal", "PayPal Inc."),
    ("netflix", "Netflix"),
    ("google", "Google"),
    ("microsoft", "Microsoft"),
    ("amazon", "Amazon"),
    ("apple", "Apple"),
    ("chase", "Chase Bank"),
    ("wellsfargo", "Wells Fargo"),
    ("bankofamerica", "Bank of America"),
    ("sbi", "State Bank of India"),
    ("binance", "Binance"),
    ("coinbase", "Coinbase"),
]

# TLDs frequently abused in rapid disposable phishing campaigns
SUSPICIOUS_TLDS = {
    ".xyz", ".top", ".tk", ".ml", ".ga", ".cf", ".gq",
    ".zip", ".mov", ".click", ".buzz", ".rest", ".country",
    ".icu", ".cam", ".work", ".cfd", ".sbs"
}


class UrlScanner:
    """
    Forensic URL threat analyzer.
    STRICT SECURITY POLICY: Never visits or connects to submitted URLs.
    Performs pure static heuristic decomposition and threat intelligence matching.
    """

    def __init__(self):
        self.ai_service = GeminiAIService()

    def _static_heuristic_analysis(self, raw_url: str) -> dict:
        """Deconstruct and evaluate URL syntax and domain structures statically."""
        formatted_url = raw_url if re.match(r"^https?://", raw_url, re.IGNORECASE) else f"http://{raw_url}"
        parsed = urlparse(formatted_url)
        domain = (parsed.netloc or "").lower().split(":")[0]  # remove port if any
        path = (parsed.path or "").lower()
        query = (parsed.query or "").lower()

        flagged = []
        categories = []
        target_brand = None
        risk_score = 0

        # 1. Exact reputable whitelist check
        # Check if domain matches or is exact subdomain of reputable domain
        is_reputable = any(domain == rep or domain.endswith("." + rep) for rep in REPUTABLE_DOMAINS)
        if is_reputable and parsed.scheme == "https":
            recs = ["Domain is recognized and safe to browse."]
            flags = ["Verified recognized domain namespace", "Secure HTTPS transmission"]
            cats = ["Verified Official Platform"]
            return {
                "risk_score": 0.0,
                "classification": "SAFE",
                "threat_level": "SAFE",
                "target_brand": "Verified Entity",
                "reasons": flags,
                "recommendation": recs[0],
                "detected_patterns": cats,
                "analysis_source": "heuristic_fallback",
                "categories": cats,
                "summary": f"Authenticated official domain with valid standard structure ({domain}).",
                "flagged_indicators": flags,
                "recommendations": recs,
                "parsed_domain": domain,
                "engine": "static_heuristic_v1"
            }

        # 2. Insecure HTTP protocol check
        if parsed.scheme == "http":
            flagged.append("Insecure HTTP protocol used without cryptographic transport encryption")
            categories.append("Unencrypted Transport")
            risk_score += 15

        # 3. Raw IP address hostname check (e.g. http://192.168.1.1/login)
        is_ip_host = bool(re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", domain))
        if is_ip_host:
            flagged.append("Raw numeric IP address used as hostname instead of registered domain")
            categories.append("Obfuscated IP Host")
            risk_score += 45

        # 4. Suspicious Top-Level Domain (TLD)
        for tld in SUSPICIOUS_TLDS:
            if domain.endswith(tld):
                flagged.append(f"Suspicious disposable top-level domain ({tld}) commonly abused in phishing")
                categories.append("Suspicious TLD")
                risk_score += 35
                break

        # 5. Typosquatting & Brand Spoofing Check
        # Test character substitution variations (e.g., paypa1, micr0soft, arnazon)
        for brand_key, brand_name in PROTECTED_BRANDS:
            # Check for homoglyph substitutions
            homoglyph_patterns = [
                brand_key.replace("o", "0"),
                brand_key.replace("l", "1"),
                brand_key.replace("l", "i"),
                brand_key.replace("m", "rn"),
                brand_key.replace("w", "vv"),
            ]
            has_homoglyph = any(h != brand_key and h in domain for h in homoglyph_patterns)
            # Check for brand name with hyphenated tricks (e.g., paypal-verify, netflix-billing)
            has_brand_hyphen = bool(re.search(rf"{brand_key}[-_]|[-_]{brand_key}", domain))

            if (has_homoglyph or has_brand_hyphen) and not domain.endswith(f"{brand_key}.com"):
                target_brand = brand_name
                flagged.append(f"Typosquatting/Homoglyph attack detected impersonating protected brand: {brand_name}")
                categories.extend(["Phishing", "Typosquatting", "Brand Impersonation"])
                risk_score += 55
                break

        # 6. Excessive subdomain nesting (e.g. auth.verify.security.paypal.com.scam.top)
        subdomain_parts = domain.split(".")
        if len(subdomain_parts) >= 4 and not is_ip_host:
            flagged.append("Excessive subdomain depth designed to obscure true root destination")
            categories.append("Subdomain Obfuscation")
            risk_score += 25

        # 7. Sensitive credential keywords in path & query
        credential_path_keywords = [
            "login", "signin", "verify", "account", "update",
            "banking", "password", "wallet", "authenticate", "session"
        ]
        found_cred_words = [kw for kw in credential_path_keywords if kw in path or kw in query]
        if found_cred_words:
            flagged.append(f"Suspicious credential collection endpoint keywords detected: {', '.join(found_cred_words)}")
            categories.append("Credential Harvesting")
            risk_score += 25

        # Cap score between 0 and 100
        risk_score = min(100, max(0, risk_score))

        # Determine threat level
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
            categories = ["Clean URL" if threat_level == "SAFE" else "Suspicious Patterns"]

        # Recommendations
        if threat_level in ["CRITICAL", "HIGH"]:
            summary = f"High-risk deceptive domain ({domain}) displaying strong phishing and spoofing indicators."
            recommendations = [
                "Do NOT browse to this address or input any credentials.",
                f"If you intended to visit {target_brand or 'this service'}, use the official bookmarked URL.",
                "Report this domain to anti-phishing blacklists (Google Safe Browsing, PhishTank)."
            ]
        elif threat_level == "MEDIUM":
            summary = f"Domain ({domain}) exhibits anomalous structural indicators and requires caution."
            recommendations = [
                "Verify domain ownership and SSL certificate validity before interacting.",
                "Avoid submitting sensitive personal or payment details."
            ]
        else:
            summary = f"No obvious phishing or malicious structural signatures identified for {domain}."
            recommendations = [
                "Domain appears standard. Observe standard online security hygiene."
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
            "target_brand": target_brand or "None Detected",
            "reasons": flagged if flagged else ["No malicious domain structures or homoglyph patterns identified."],
            "recommendation": primary_rec,
            "detected_patterns": categories,
            "analysis_source": "heuristic_fallback",
            "categories": categories,
            "summary": summary,
            "flagged_indicators": flagged,
            "recommendations": recommendations,
            "parsed_domain": domain,
            "engine": "static_heuristic_v1"
        }

    def scan(self, url: str) -> dict:
        """
        Execute safe static scan pipeline for URL:
        1. Run static heuristic analysis without network requests
        2. Attempt Gemini AI static semantic reasoning if configured
        3. Fall back seamlessly to heuristics on error or when unconfigured
        4. Persist record into SQLite
        """
        heuristic_res = self._static_heuristic_analysis(url)

        # Attempt Gemini AI static reasoning if configured
        ai_res, ai_err = None, None
        if self.ai_service.is_configured():
            try:
                ai_res, ai_err = self.ai_service.analyze_url(
                    url,
                    heuristic_signals=heuristic_res.get("flagged_indicators", [])
                )
            except Exception as e:
                ai_err = str(e)
                logger.warning(f"Gemini URL static analysis exception: {e}")

        if ai_res:
            final_assessment = ai_res
        else:
            final_assessment = heuristic_res
            fallback_reason = f"heuristic_fallback ({ai_err})" if ai_err else "heuristic_fallback"
            final_assessment["analysis_source"] = fallback_reason

        risk_score = float(final_assessment.get("risk_score", heuristic_res["risk_score"]))
        classification = str(final_assessment.get("classification", heuristic_res["classification"])).upper()
        target_brand = final_assessment.get("target_brand", heuristic_res.get("target_brand", "None Detected"))
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
            "scan_type": "url",
            "target_content": url,
            "risk_score": risk_score,
            "classification": classification,
            "threat_level": classification,
            "fraud_verdict": fraud_verdict,
            "confidence_score": round(confidence_score, 2),
            "target_brand": target_brand,
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
                "parsed_domain": heuristic_res.get("parsed_domain"),
                "target_brand": target_brand,
                "engine_used": analysis_source
            },
            "flagged_indicators": reasons,
            "recommendations": final_assessment.get("recommendations", heuristic_res["recommendations"])
        }

        # Persist to SQLite
        scan_id = ScanModel.create(scan_record)
        scan_record["id"] = scan_id

        return scan_record
