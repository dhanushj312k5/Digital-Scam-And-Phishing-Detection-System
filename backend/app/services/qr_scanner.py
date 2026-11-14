import re
import io
import cv2
import json
import logging
from urllib.parse import urlparse, parse_qs, unquote, unquote_plus
import numpy as np
from PIL import Image, ImageOps, ImageFilter, ImageEnhance

import zxingcpp
try:
    import pyzbar.pyzbar as pyzbar
    HAS_PYZBAR = True
except Exception:
    HAS_PYZBAR = False

from app.services.gemini_service import GeminiAIService
from app.services.url_scanner import UrlScanner
from app.services.message_scanner import MessageScanner
from app.models.scan_model import ScanModel, derive_fraud_verdict, calculate_confidence

logger = logging.getLogger(__name__)

# Reverse payment scam keywords commonly used to trick victims into paying
REVERSE_PAYMENT_KEYWORDS = [
    "receive", "refund", "cashback", "lottery", "prize", "reward",
    "credit", "claim", "bonus", "winner", "earn", "payout", "deposit",
    "scan to receive", "refund desk", "reward money", "claim free"
]

# High-risk impersonation terms in payment VPAs
VPA_IMPERSONATION_TERMS = [
    "kyc", "support", "refund", "helpdesk", "care", "service",
    "verify", "verification", "officer", "nodal", "security-desk",
    "cybercell", "customercare", "helpline", "unblock"
]

# Target financial brands often spoofed in VPA handles
SPOOFED_PAYMENT_BRANDS = [
    "sbi", "hdfc", "icici", "axis", "pnb", "bob", "paytm",
    "phonepe", "gpay", "googlepay", "bhim", "amazon", "rbi"
]


class QRScanner:
    """
    Forensic Multi-Engine QR Code Decoder and Fraud Detection Engine.
    Employs a multi-stage decoding pipeline:
      1. zxing-cpp (robust C++ port with advanced binarization and center-logo tolerance)
      2. OpenCV QRCodeDetector / QRCodeDetectorAruco multi-pass fallbacks
      3. pyzbar native fallback when available
    Handles mobile screenshots, center logos (PhonePe, GPay, Paytm), rotated,
    blurry, dark-mode, and multi-QR images.
    Parses standard UPI payment URIs, BharatQR / EMVCo, URLs, Wi-Fi configs, and plain text.
    STRICT POLICY: Never opens URLs, never connects to external payment gateways, and never executes transactions.
    """

    def __init__(self):
        self.ai_service = GeminiAIService()
        self.url_scanner = UrlScanner()
        self.message_scanner = MessageScanner()
        self.cv_detectors = []
        if hasattr(cv2, "QRCodeDetectorAruco"):
            try:
                self.cv_detectors.append(cv2.QRCodeDetectorAruco())
            except Exception:
                pass
        self.cv_detectors.append(cv2.QRCodeDetector())

    def _safe_load_pil_image(self, image_bytes: bytes) -> Image.Image:
        """Load image bytes into PIL Image, auto-correcting EXIF orientation."""
        pil_img = Image.open(io.BytesIO(image_bytes))
        try:
            # Auto-rotate according to mobile camera orientation tag (Tag 274)
            pil_img = ImageOps.exif_transpose(pil_img)
        except Exception:
            pass
        if pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")
        return pil_img

    def decode_all_qr_codes(self, image_bytes: bytes) -> tuple[list[dict], str | None]:
        """
        Multi-engine, multi-pass decoding pipeline.
        Searches for all unique QR codes present in the image across:
          - zxing-cpp (LocalAverage and GlobalHistogram binarizers)
          - OpenCV QRCodeDetector (detectAndDecodeMulti / detectAndDecode)
          - pyzbar (when available)
        Applies progressive image preprocessing:
          - EXIF orientation correction
          - Quiet zone white-border padding
          - Dynamic downscaling / upscaling
          - Grayscale & CLAHE contrast enhancement
          - Otsu & adaptive thresholding
          - Color inversion (dark mode QR codes)
          - Sharpening (deblurring)
          - Angle rotations (90°, 180°, 270°, ±15°)
        Returns: (candidates_list, error_message)
        """
        try:
            pil_img = self._safe_load_pil_image(image_bytes)
        except Exception as e:
            return [], f"Failed to read image data: {str(e)}"

        found_texts = set()
        candidates = []

        def add_result(text: str, engine: str, fmt: str = "QR Code"):
            if not text:
                return
            t = text.strip()
            if t and t not in found_texts:
                found_texts.add(t)
                candidates.append({
                    "text": t,
                    "engine": engine,
                    "format": fmt
                })

        # --- PASS 0: Fast direct zxing-cpp on original image ---
        try:
            results = zxingcpp.read_barcodes(
                pil_img,
                try_rotate=True,
                try_downscale=True,
                try_invert=True
            )
            for r in results:
                add_result(r.text, "zxing-cpp (Direct)", str(r.format))
            if candidates:
                # Early return if fast pass already found QR code(s)
                return candidates, None
        except Exception as e:
            logger.debug(f"Pass 0 zxing error: {e}")

        # --- PASS 1: White Border Padding (Essential for cropped screenshots without quiet zone) ---
        try:
            padded_img = ImageOps.expand(pil_img, border=35, fill="white")
            results = zxingcpp.read_barcodes(
                padded_img,
                try_rotate=True,
                try_downscale=True,
                try_invert=True
            )
            for r in results:
                add_result(r.text, "zxing-cpp (Padded)", str(r.format))
            if candidates:
                return candidates, None
        except Exception as e:
            logger.debug(f"Pass 1 padded zxing error: {e}")

        # Prepare OpenCV Mat structures
        orig_w, orig_h = pil_img.size
        cv_rgb = np.array(pil_img)
        cv_bgr = cv2.cvtColor(cv_rgb, cv2.COLOR_RGB2BGR)

        # --- PASS 2: OpenCV detectAndDecodeMulti on original & padded BGR ---
        for detector in self.cv_detectors:
            try:
                ret, decoded_info, _, _ = detector.detectAndDecodeMulti(cv_bgr)
                if ret and decoded_info:
                    for text in decoded_info:
                        add_result(text, "OpenCV Multi-Detector")
                if candidates:
                    return candidates, None
            except Exception:
                pass

        # --- PASS 3: CLAHE Contrast Equalization & Grayscale ---
        gray = cv2.cvtColor(cv_bgr, cv2.COLOR_BGR2GRAY)
        try:
            clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
            contrast_gray = clahe.apply(gray)
            # zxing on contrast gray
            contrast_pil = Image.fromarray(contrast_gray)
            res_contrast = zxingcpp.read_barcodes(
                contrast_pil,
                binarizer=zxingcpp.Binarizer.GlobalHistogram,
                try_rotate=True,
                try_downscale=True
            )
            for r in res_contrast:
                add_result(r.text, "zxing-cpp (CLAHE)")
            if candidates:
                return candidates, None
        except Exception as e:
            logger.debug(f"Pass 3 CLAHE error: {e}")

        # --- PASS 4: Inverted Grayscale (Crucial for Dark Mode QR Codes) ---
        try:
            inv_gray = cv2.bitwise_not(gray)
            inv_pil = Image.fromarray(inv_gray)
            res_inv = zxingcpp.read_barcodes(inv_pil, try_rotate=True)
            for r in res_inv:
                add_result(r.text, "zxing-cpp (Inverted)")
            if candidates:
                return candidates, None
        except Exception as e:
            logger.debug(f"Pass 4 inverted error: {e}")

        # --- PASS 5: Multi-Scale Resizing (Downscale huge screenshots, upscale tiny images) ---
        scales = []
        if max(orig_w, orig_h) > 1600:
            scales.extend([0.5, 0.75])
        elif max(orig_w, orig_h) < 600:
            scales.extend([2.0, 3.0])
        else:
            scales.extend([1.5, 0.75])

        for sc in scales:
            try:
                new_w, new_h = max(64, int(orig_w * sc)), max(64, int(orig_h * sc))
                scaled_pil = pil_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                padded_scaled = ImageOps.expand(scaled_pil, border=30, fill="white")
                res_sc = zxingcpp.read_barcodes(padded_scaled, try_rotate=True)
                for r in res_sc:
                    add_result(r.text, f"zxing-cpp (Scaled {sc}x)")
                if candidates:
                    return candidates, None
            except Exception:
                continue

        # --- PASS 6: Sharpening Filter (De-blurring camera captures) ---
        try:
            sharp_pil = pil_img.filter(ImageFilter.UnsharpMask(radius=2, percent=175, threshold=3))
            res_sharp = zxingcpp.read_barcodes(sharp_pil, try_rotate=True)
            for r in res_sharp:
                add_result(r.text, "zxing-cpp (Sharpened)")
            if candidates:
                return candidates, None
        except Exception as e:
            logger.debug(f"Pass 6 sharpen error: {e}")

        # --- PASS 7: Binary Otsu & Adaptive Thresholding ---
        try:
            _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
            otsu_pil = Image.fromarray(otsu)
            for r in zxingcpp.read_barcodes(otsu_pil, try_rotate=True):
                add_result(r.text, "zxing-cpp (Otsu)")
            if candidates:
                return candidates, None

            adaptive = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 21, 5
            )
            adaptive_pil = Image.fromarray(adaptive)
            for r in zxingcpp.read_barcodes(adaptive_pil, try_rotate=True):
                add_result(r.text, "zxing-cpp (Adaptive)")
            if candidates:
                return candidates, None
        except Exception as e:
            logger.debug(f"Pass 7 threshold error: {e}")

        # --- PASS 8: pyzbar Fallback (if native zbar available) ---
        if HAS_PYZBAR:
            try:
                zbar_results = pyzbar.decode(cv_bgr)
                for item in zbar_results:
                    txt = item.data.decode("utf-8", errors="replace")
                    add_result(txt, "pyzbar")
                if candidates:
                    return candidates, None
            except Exception:
                pass

        # --- PASS 9: Rotations (for tilted smartphone photos) ---
        for angle in [15, -15, 30, -30, 45, 90, 180, 270]:
            try:
                rot_pil = pil_img.rotate(angle, expand=True, fillcolor="white")
                rot_res = zxingcpp.read_barcodes(rot_pil)
                for r in rot_res:
                    add_result(r.text, f"zxing-cpp (Rotated {angle}°)")
                if candidates:
                    return candidates, None
            except Exception:
                continue

        if not candidates:
            return [], (
                "No QR code could be detected in the uploaded image. "
                "Troubleshooting Tips:\n"
                "1. If using a mobile screenshot (PhonePe, GPay, Paytm), ensure the entire QR card is visible.\n"
                "2. If photographing a physical standee or sticker, hold the camera steady to avoid motion blur and glare.\n"
                "3. Crop slightly closer to the QR code while keeping a small white margin (quiet zone) around the corners."
            )

        return candidates, None

    def decode_qr_image(self, image_bytes: bytes) -> tuple[str | None, str | None]:
        """
        Backwards-compatible decode method returning the first decoded payload or error message.
        """
        candidates, err = self.decode_all_qr_codes(image_bytes)
        if candidates:
            return candidates[0]["text"], None
        return None, err

    def _parse_emvco_bharatqr(self, text: str) -> dict | None:
        """
        Parse EMVCo / BharatQR standard payload (used by Indian merchant QR codes).
        Extracts VPA handle from Tag 26-51, Payee Name (Tag 59), and Amount (Tag 54).
        """
        if not (text.startswith("000201") and len(text) > 20):
            return None
        i = 0
        tags = {}
        try:
            while i < len(text) - 4:
                tag = text[i:i+2]
                len_str = text[i+2:i+4]
                if not len_str.isdigit():
                    break
                length = int(len_str)
                val = text[i+4:i+4+length]
                tags[tag] = val
                i += 4 + length
        except Exception:
            return None

        vpa = ""
        # Search merchant account information tags 26 to 51
        for t in range(26, 52):
            tkey = f"{t:02d}"
            if tkey in tags:
                tag_val = tags[tkey]
                if "@" in tag_val:
                    m = re.search(r"([a-zA-Z0-9.\-_]+@[a-zA-Z0-9.\-_]+)", tag_val)
                    if m:
                        vpa = m.group(1)
                        break

        payee_name = tags.get("59", "")
        amount = tags.get("54", "")
        mcc = tags.get("52", "")
        currency = "INR" if tags.get("53") == "356" else tags.get("53", "INR")

        return {
            "pa": vpa,
            "pn": payee_name,
            "am": amount,
            "cu": currency,
            "mc": mcc,
            "is_bharat_qr": True,
            "raw_uri": text
        }

    def identify_content_type(self, raw_content: str) -> str:
        """
        Classify decoded QR payload into:
          - 'UPI_PAYMENT': Standard UPI URI, PhonePe/GPay deeplink, or BharatQR
          - 'WIFI': Wi-Fi network configuration payload
          - 'URL': Web hyperlink or IP address
          - 'TEXT': Plain text or alphanumeric string
        """
        content = (raw_content or "").strip()
        lower = content.lower()

        if (
            lower.startswith("upi://") or
            lower.startswith("phonepe://") or
            lower.startswith("paytmmp://") or
            lower.startswith("gpay://") or
            ("pa=" in lower and ("&" in lower or "?" in lower)) or
            (content.startswith("000201") and "@" in content)
        ):
            return "UPI_PAYMENT"

        if content.upper().startswith("WIFI:"):
            return "WIFI"

        if re.match(r"^https?://", content, re.IGNORECASE) or (
            "." in content and " " not in content and ("/" in content or len(content.split(".")[-1]) in (2, 3, 4, 6))
        ):
            return "URL"

        return "TEXT"

    def parse_upi_payload(self, raw_content: str) -> dict:
        """
        Extract and structure all standard UPI payment parameters:
        pa, pn, mc, am, cu, tn, tr, tid, url, mam, mode, orgid, sign.
        Handles BharatQR, missing amounts (static QR), and URL-encoded values safely.
        """
        content = raw_content.strip()

        # Check for BharatQR / EMVCo format first
        emvco_data = self._parse_emvco_bharatqr(content)
        if emvco_data:
            return {
                "pa": emvco_data.get("pa", ""),
                "pn": emvco_data.get("pn", ""),
                "mc": emvco_data.get("mc", ""),
                "am": emvco_data.get("am", ""),
                "cu": emvco_data.get("cu", "INR"),
                "tn": "BharatQR Merchant Payment",
                "tr": "",
                "tid": "",
                "url": "",
                "is_static": not bool(emvco_data.get("am")),
                "is_bharat_qr": True,
                "raw_uri": content
            }

        # Handle URI query string
        if "?" in content:
            query_part = content.split("?", 1)[-1]
        elif content.startswith("upi://pay"):
            query_part = content[len("upi://pay"):].lstrip("/?")
        else:
            query_part = content

        parsed_qs = parse_qs(query_part)

        def get_field(key: str, default: str = "") -> str:
            vals = parsed_qs.get(key, [])
            return unquote_plus(vals[0]).strip() if vals else default

        pa = get_field("pa")
        pn = get_field("pn")
        mc = get_field("mc")
        am = get_field("am")
        cu = get_field("cu", "INR")
        tn = get_field("tn")
        tr = get_field("tr")
        tid = get_field("tid")
        url = get_field("url")
        mam = get_field("mam")
        mode = get_field("mode")
        orgid = get_field("orgid")

        # Validate amount safely
        is_static = True
        if am:
            try:
                am_val = float(am)
                if am_val > 0:
                    is_static = False
                    am = f"{am_val:.2f}"
            except ValueError:
                pass

        return {
            "pa": pa,
            "pn": pn,
            "mc": mc,
            "am": am,
            "cu": cu,
            "tn": tn,
            "tr": tr,
            "tid": tid,
            "url": url,
            "mam": mam,
            "mode": mode,
            "orgid": orgid,
            "is_static": is_static,
            "is_bharat_qr": False,
            "raw_uri": content
        }

    def parse_wifi_payload(self, raw_content: str) -> dict:
        """Extract Wi-Fi credentials from WIFI:S:ssid;T:WPA;P:password;; payload."""
        content = raw_content.strip()
        data = {"ssid": "", "auth_type": "WPA", "hidden": False, "has_password": False}
        pairs = content[5:].rstrip(";").split(";")
        for pair in pairs:
            if ":" in pair:
                k, v = pair.split(":", 1)
                k = k.upper().strip()
                if k == "S":
                    data["ssid"] = v
                elif k == "T":
                    data["auth_type"] = v.upper()
                elif k == "H":
                    data["hidden"] = v.lower() in ("true", "1")
                elif k == "P":
                    data["has_password"] = bool(v)
        return data

    def _mask_upi_vpa(self, vpa: str) -> str:
        """
        Safely mask personal phone numbers or user handles in UPI VPAs for privacy.
        Example: '9876543210@paytm' -> '98*****210@paytm'
        Example: 'phonepe.merchant@ybl' -> 'pho***nt@ybl'
        """
        if not vpa or "@" not in vpa:
            return vpa or "unspecified"
        handle, domain = vpa.split("@", 1)
        # If numerical (phone number)
        if handle.isdigit() and len(handle) == 10:
            masked_handle = handle[:2] + "*****" + handle[-3:]
        elif len(handle) <= 4:
            masked_handle = handle[0] + "***"
        else:
            masked_handle = handle[:3] + "***" + handle[-2:]
        return f"{masked_handle}@{domain}"

    def _analyze_upi_heuristics(self, upi_data: dict) -> dict:
        """
        Evaluate UPI payment parameters against financial fraud and social engineering vectors.
        IMPORTANT: A normal payment QR code is NOT automatically fraudulent.
        Clear distinction is made between verified safe payments, unverified merchant identities,
        and actual reverse payment fraud traps.
        """
        pa = upi_data.get("pa", "").lower()
        pn = upi_data.get("pn", "").lower()
        tn = upi_data.get("tn", "").lower()
        am_str = upi_data.get("am", "")
        url_param = upi_data.get("url", "").strip()

        flagged = []
        categories = []
        risk_score = 0.0

        # Vector 1: Reverse Payment Scam (Fake refund/prize trap)
        # Scammers claim scanning a QR code receives money, but UPI scanning ONLY debits funds.
        has_reverse_keyword = any(
            re.search(rf"\b{re.escape(k)}\b", f"{tn} {pn}") for k in REVERSE_PAYMENT_KEYWORDS
        )
        if has_reverse_keyword:
            flagged.append(
                "Reverse Payment Scam Trap: Transaction note or payee name solicits scanning to receive "
                "a refund, prize, reward, or credit. UPI scanning ONLY transfers funds OUT of your account; "
                "you NEVER enter your UPI PIN to receive money."
            )
            categories.extend(["Reverse Payment Scam", "Social Engineering"])
            risk_score += 85.0

        # Vector 2: Bank / Support / Nodal Desk Impersonation in VPA
        has_impersonation = any(term in pa for term in VPA_IMPERSONATION_TERMS) or (
            any(brand in pa for brand in SPOOFED_PAYMENT_BRANDS) and any(term in pa for term in ["help", "care", "desk", "desk-id"])
        )
        if has_impersonation and not any(official in pa for official in ["merchant.sbi", "merchant.hdfc"]):
            flagged.append(
                f"Authority / Helpdesk Impersonation: UPI address '{self._mask_upi_vpa(upi_data.get('pa'))}' mimics an official bank "
                f"or support desk handle. Financial institutions never conduct dispute resolutions via consumer UPI handles."
            )
            categories.extend(["Brand Impersonation", "Phishing"])
            risk_score += 70.0

        # Vector 3: Suspicious embedded redirect URL inside payment payload
        if url_param:
            url_heuristics = self.url_scanner._static_heuristic_analysis(url_param)
            if url_heuristics.get("risk_score", 0) >= 40:
                flagged.append(
                    f"Deceptive Payment Web Link: Attached reference URL ({url_param}) points to a high-risk or unauthenticated domain."
                )
                categories.extend(url_heuristics.get("categories", ["Phishing URL"]))
                risk_score += 50.0

        # Vector 4: High unverified amount on disposable or unknown VPA
        try:
            if am_str and float(am_str) >= 50000.0 and not upi_data.get("mc"):
                flagged.append(
                    f"High-Value Unverified Transaction: Pre-filled amount of ₹{am_str} on an unclassified merchant VPA without standard merchant category code."
                )
                categories.append("Unusual High-Value Transaction")
                risk_score += 25.0
        except ValueError:
            pass

        # Vector 5: Urgency or coercive threat in transaction note
        if any(w in tn for w in ["urgent", "blocked", "penalty", "court", "legal notice", "police", "arrest"]):
            flagged.append(
                "Coercive Urgency Pressure: Transaction note contains extortion, legal threats, or false account suspension claims."
            )
            categories.append("Extortion Pressure")
            risk_score += 75.0

        # Cap score between 0 and 100
        risk_score = min(100.0, max(0.0, risk_score))

        # Threat classification
        if risk_score >= 70.0:
            threat_level = "CRITICAL"
        elif risk_score >= 50.0:
            threat_level = "HIGH"
        elif risk_score >= 25.0:
            threat_level = "MEDIUM"
        elif risk_score >= 10.0:
            threat_level = "LOW"
        else:
            threat_level = "SAFE"

        categories = list(dict.fromkeys(categories))
        if not categories:
            categories = ["Standard UPI Payment" if threat_level == "SAFE" else "Commercial Payment"]

        # Recommendations based on actual risk
        if threat_level in ("CRITICAL", "HIGH"):
            summary = "High-risk UPI payment trap exhibiting strong fraud, impersonation, or reverse-credit scam triggers."
            recs = [
                "DO NOT scan with your UPI payment app and DO NOT enter your UPI PIN.",
                "Remember: Entering your UPI PIN ALWAYS transfers money FROM your account, never into it.",
                "Report this fraudulent UPI address to your bank and the National Cyber Crime Reporting Portal."
            ]
        elif threat_level == "MEDIUM":
            summary = "Suspicious UPI payment request requiring manual verification of payee credentials."
            recs = [
                "Verify the recipient's identity through an independent secondary communication channel.",
                "Double check the payment amount and ensure you intended to make this payment."
            ]
        else:
            summary = "Standard commercial UPI payment request with no reverse payment fraud or deceptive triggers detected."
            recs = [
                "Always verify the payee name and payment amount displayed on your UPI payment app before entering your UPI PIN.",
                "Ensure you recognize the merchant or physical counter before approving transactions."
            ]

        fraud_verdict = derive_fraud_verdict(risk_score, threat_level, categories)
        confidence_score = calculate_confidence(risk_score, "heuristic_fallback", len(flagged))

        return {
            "risk_score": float(risk_score),
            "classification": threat_level,
            "threat_level": threat_level,
            "fraud_verdict": fraud_verdict,
            "confidence_score": confidence_score,
            "reasons": flagged if flagged else ["Valid UPI payment syntax", "Standard payee VPA format", "No reverse payment traps or impersonation tags identified."],
            "recommendation": recs[0],
            "detected_patterns": categories,
            "analysis_source": "heuristic_fallback",
            "categories": categories,
            "summary": summary,
            "flagged_indicators": flagged,
            "recommendations": recs,
            "payee_assessment": "Suspicious Entity" if threat_level in ("CRITICAL", "HIGH") else "Standard Commercial Payee"
        }

    def _analyze_wifi_heuristics(self, wifi_data: dict) -> dict:
        """Evaluate Wi-Fi network configuration parameters for open access vulnerabilities."""
        ssid = wifi_data.get("ssid", "")
        auth = wifi_data.get("auth_type", "WPA")
        flagged = []
        categories = ["Wi-Fi Configuration"]

        if auth in ("NOPASS", "NONE") or not wifi_data.get("has_password"):
            risk_score = 35.0
            threat_level = "MEDIUM"
            fraud_verdict = "NEEDS_REVIEW"
            flagged.append(f"Unencrypted Open Wi-Fi Network ('{ssid}'): Allows network eavesdropping and traffic interception.")
            summary = f"Open Wi-Fi access point configuration ('{ssid}') without encryption."
            recs = [
                "Do not access sensitive accounts, bank portals, or enter passwords over unencrypted public Wi-Fi.",
                "Use a trusted VPN if connection to this network is strictly required."
            ]
        else:
            risk_score = 5.0
            threat_level = "SAFE"
            fraud_verdict = "NO_FRAUD_DETECTED"
            summary = f"Standard password-protected Wi-Fi network configuration ('{ssid}')."
            recs = ["Ensure this network is authorized by the premises owner before connecting."]

        return {
            "risk_score": float(risk_score),
            "classification": threat_level,
            "threat_level": threat_level,
            "fraud_verdict": fraud_verdict,
            "confidence_score": 0.90,
            "reasons": flagged if flagged else [f"Standard encrypted Wi-Fi network configuration ({auth})."],
            "recommendation": recs[0],
            "detected_patterns": categories,
            "analysis_source": "heuristic_fallback",
            "categories": categories,
            "summary": summary,
            "flagged_indicators": flagged,
            "recommendations": recs
        }

    def _format_candidate_preview(self, text: str) -> str:
        """Return a readable short preview for multi-QR selection cards."""
        content_type = self.identify_content_type(text)
        if content_type == "UPI_PAYMENT":
            upi = self.parse_upi_payload(text)
            pa = self._mask_upi_vpa(upi.get("pa", ""))
            am = f"₹{upi.get('am')}" if upi.get("am") else "Static Amount"
            pn = upi.get("pn") or "Merchant"
            return f"UPI Payment: {pn} ({pa}) • {am}"
        elif content_type == "URL":
            return f"Web Link: {text[:60]}"
        elif content_type == "WIFI":
            wifi = self.parse_wifi_payload(text)
            return f"Wi-Fi Network: {wifi.get('ssid')} ({wifi.get('auth_type')})"
        return f"Plain Text: {text[:60]}"

    def scan(self, image_bytes: bytes, filename: str = "", selected_index: int = None) -> dict:
        """
        Complete end-to-end QR Code fraud analysis pipeline:
        1. Decode all QR codes using multi-engine pipeline
        2. If multiple QR codes detected and no selection made, return candidate list
        3. Identify payload type (UPI, URL, Wi-Fi, Text)
        4. Execute static heuristics & Gemini AI forensic analysis
        5. Generate mandatory security warning and caution copy
        6. Persist record to SQLite
        """
        candidates, decode_err = self.decode_all_qr_codes(image_bytes)
        if decode_err or not candidates:
            raise ValueError(decode_err or "No QR code could be detected in the provided image.")

        total_detected = len(candidates)

        # Requirement 8: If multiple QR codes found and no selection made yet, return candidates list
        if total_detected > 1 and selected_index is None:
            return {
                "multiple_detected": True,
                "qr_count": total_detected,
                "candidates": [
                    {
                        "index": idx,
                        "content_type": self.identify_content_type(c["text"]),
                        "preview": self._format_candidate_preview(c["text"]),
                        "raw_content": c["text"],
                        "engine": c.get("engine", "Multi-Engine")
                    }
                    for idx, c in enumerate(candidates)
                ],
                "message": f"Detected {total_detected} QR codes in this image. Please select which code to analyze."
            }

        # Resolve selected candidate
        target_idx = 0
        if selected_index is not None and 0 <= selected_index < total_detected:
            target_idx = selected_index

        chosen_candidate = candidates[target_idx]
        decoded_text = chosen_candidate["text"]
        decoding_engine = chosen_candidate.get("engine", "Multi-Engine")

        content_type = self.identify_content_type(decoded_text)
        extracted_fields = {}
        target_display = decoded_text

        # Execute specialized analysis based on payload type
        if content_type == "UPI_PAYMENT":
            upi_data = self.parse_upi_payload(decoded_text)
            extracted_fields = {
                "pa": self._mask_upi_vpa(upi_data.get("pa", "")),
                "pn": upi_data.get("pn", ""),
                "mc": upi_data.get("mc", ""),
                "am": upi_data.get("am", ""),
                "cu": upi_data.get("cu", "INR"),
                "tn": upi_data.get("tn", ""),
                "is_static": upi_data.get("is_static", True),
                "is_bharat_qr": upi_data.get("is_bharat_qr", False),
                "url": upi_data.get("url", ""),
                "decoding_engine": decoding_engine
            }
            masked_vpa = extracted_fields["pa"]
            amount_display = f"₹{upi_data.get('am')}" if upi_data.get("am") else "Static QR"
            target_display = f"UPI: {masked_vpa} | {amount_display}" + (f" | {upi_data.get('pn')}" if upi_data.get("pn") else "")

            heuristic_res = self._analyze_upi_heuristics(upi_data)

            # Attempt Gemini AI financial fraud reasoning
            ai_res, ai_err = None, None
            if self.ai_service.is_configured():
                try:
                    ai_res, ai_err = self.ai_service.analyze_upi_payment(
                        upi_data=upi_data,
                        heuristic_signals=heuristic_res.get("flagged_indicators", [])
                    )
                except Exception as e:
                    ai_err = str(e)
                    logger.warning(f"Gemini UPI analysis exception: {e}")

            if ai_res:
                final_assessment = ai_res
            else:
                final_assessment = heuristic_res
                fallback_reason = f"heuristic_fallback ({ai_err})" if ai_err else "heuristic_fallback"
                final_assessment["analysis_source"] = fallback_reason

        elif content_type == "WIFI":
            wifi_data = self.parse_wifi_payload(decoded_text)
            extracted_fields = {
                "ssid": wifi_data.get("ssid", ""),
                "auth_type": wifi_data.get("auth_type", "WPA"),
                "has_password": wifi_data.get("has_password", False),
                "decoding_engine": decoding_engine
            }
            target_display = f"Wi-Fi Network: {wifi_data.get('ssid')} ({wifi_data.get('auth_type')})"
            heuristic_res = self._analyze_wifi_heuristics(wifi_data)
            final_assessment = heuristic_res

        elif content_type == "URL":
            extracted_fields = {
                "url": decoded_text,
                "parsed_domain": urlparse(decoded_text if "://" in decoded_text else f"http://{decoded_text}").netloc,
                "decoding_engine": decoding_engine
            }
            target_display = decoded_text
            heuristic_res = self.url_scanner._static_heuristic_analysis(decoded_text)

            ai_res, ai_err = None, None
            if self.ai_service.is_configured():
                try:
                    ai_res, ai_err = self.ai_service.analyze_url(
                        decoded_text,
                        heuristic_signals=heuristic_res.get("flagged_indicators", [])
                    )
                except Exception as e:
                    ai_err = str(e)
                    logger.warning(f"Gemini URL QR analysis exception: {e}")

            if ai_res:
                final_assessment = ai_res
            else:
                final_assessment = heuristic_res
                fallback_reason = f"heuristic_fallback ({ai_err})" if ai_err else "heuristic_fallback"
                final_assessment["analysis_source"] = fallback_reason

        else:  # TEXT
            extracted_fields = {
                "text_preview": decoded_text[:300],
                "decoding_engine": decoding_engine
            }
            target_display = decoded_text[:200]
            heuristic_res = self.message_scanner._heuristic_analysis(decoded_text)

            ai_res, ai_err = None, None
            if self.ai_service.is_configured():
                try:
                    ai_res, ai_err = self.ai_service.analyze_message(decoded_text)
                except Exception as e:
                    ai_err = str(e)
                    logger.warning(f"Gemini Text QR analysis exception: {e}")

            if ai_res:
                final_assessment = ai_res
            else:
                final_assessment = heuristic_res
                fallback_reason = f"heuristic_fallback ({ai_err})" if ai_err else "heuristic_fallback"
                final_assessment["analysis_source"] = fallback_reason

        # Normalize score and verdict
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

        # Mandatory User Caution & Warning Copy
        if fraud_verdict == "FRAUD_DETECTED" or risk_score >= 60.0:
            warning_copy = (
                "WARNING: This QR code exhibits strong indicators of a fraudulent transaction or reverse payment trap. "
                "Do not scan or enter your UPI PIN. Remember: entering a PIN ALWAYS debits your bank account."
            )
            warning_severity = "DANGER"
        elif fraud_verdict == "NO_FRAUD_DETECTED" and risk_score < 30.0:
            warning_copy = (
                "No significant fraud indicators were detected. "
                "Always verify the payee name and amount displayed on your UPI app before entering your UPI PIN."
            )
            warning_severity = "SAFE"
        else:
            warning_copy = (
                "The result requires human verification. "
                "Always verify the recipient identity and payment amount with the merchant before authorizing."
            )
            warning_severity = "CAUTION"

        # Build scan record for SQLite
        scan_record = {
            "scan_type": "qr_code",
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
                "content_type": content_type,
                "decoded_text": decoded_text,
                "extracted_fields": extracted_fields,
                "security_warning": {
                    "severity": warning_severity,
                    "message": warning_copy
                },
                "decoding_engine": decoding_engine,
                "fraud_verdict": fraud_verdict,
                "confidence_score": round(confidence_score, 2),
                "engine_used": analysis_source
            },
            "flagged_indicators": reasons,
            "recommendations": final_assessment.get("recommendations", heuristic_res.get("recommendations", []))
        }

        # Persist to SQLite database
        scan_id = ScanModel.create(scan_record)
        scan_record["id"] = scan_id

        # Response payload
        return {
            **scan_record,
            "content_type": content_type,
            "decoded_content": decoded_text,
            "extracted_fields": extracted_fields,
            "decoding_engine": decoding_engine,
            "multiple_detected": False,
            "total_detected": total_detected,
            "selected_index": target_idx,
            "security_warning": {
                "severity": warning_severity,
                "message": warning_copy
            }
        }
