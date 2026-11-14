import io
import unittest
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps
import qrcode
from app import create_app
from app.models.database import init_db
from app.services.qr_scanner import QRScanner


def make_qr_bytes(
    payload: str,
    box_size: int = 8,
    border: int = 4,
    center_logo: bool = False,
    logo_color: str = "#5f259f", # PhonePe purple
    rotate_angle: int = 0,
    blur_radius: float = 0.0,
    extra_margins: int = 0,
    invert_colors: bool = False
) -> bytes:
    """Generate synthetic QR code image in memory with specified image transformations."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H if center_logo else qrcode.constants.ERROR_CORRECT_M,
        box_size=box_size,
        border=border
    )
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")

    # Optional center logo overlay (PhonePe / GPay style)
    if center_logo:
        draw = ImageDraw.Draw(img)
        w, h = img.size
        lw, lh = int(w * 0.22), int(h * 0.22)
        lx, ly = (w - lw) // 2, (h - lh) // 2
        draw.ellipse([lx, ly, lx + lw, ly + lh], fill=logo_color, outline="white", width=3)
        draw.ellipse([lx + lw//3, ly + lh//3, lx + 2*lw//3, ly + 2*lh//3], fill="white")

    if invert_colors:
        img = ImageOps.invert(img)

    if rotate_angle != 0:
        img = img.rotate(rotate_angle, expand=True, fillcolor="white")

    if blur_radius > 0:
        img = img.filter(ImageFilter.GaussianBlur(radius=blur_radius))

    if extra_margins > 0:
        img = ImageOps.expand(img, border=extra_margins, fill="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.getvalue()


class TestQREngineComplete(unittest.TestCase):
    """
    Comprehensive verification suite for ZEROX AI QR Code Scanner.
    Covers all 20 enumerated testing requirements.
    """

    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config["TESTING"] = True
        cls.client = cls.app.test_client()
        cls.scanner = QRScanner()

    # 1. Normal Google Pay UPI QR
    def test_01_normal_google_pay_upi_qr(self):
        payload = "upi://pay?pa=gpay.merchant@okaxis&pn=GooglePay+Store&mc=5411&am=250.00&cu=INR&tn=Lunch+Order"
        img_bytes = make_qr_bytes(payload, center_logo=True, logo_color="#4285f4")
        res = self.client.post("/api/scan/qr", data={"image": (io.BytesIO(img_bytes), "gpay_qr.png")}, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 200)
        d = res.get_json()["data"]
        self.assertEqual(d["content_type"], "UPI_PAYMENT")
        self.assertEqual(d["fraud_verdict"], "NO_FRAUD_DETECTED")
        self.assertEqual(d["classification"], "SAFE")
        self.assertLess(d["risk_score"], 30.0)
        self.assertIn("gpa", d["extracted_fields"]["pa"])
        print(f"[PASS] 01. Normal Google Pay UPI QR: Verdict={d['fraud_verdict']}, Score={d['risk_score']}")

    # 2. Normal PhonePe UPI QR
    def test_02_normal_phonepe_upi_qr(self):
        payload = "upi://pay?pa=phonepe.merchant@ybl&pn=PhonePe+Verified+Merchant&mc=5812&am=120.00&cu=INR&tn=Cafe+Latte"
        img_bytes = make_qr_bytes(payload, center_logo=True, logo_color="#5f259f")
        res = self.client.post("/api/scan/qr", data={"image": (io.BytesIO(img_bytes), "phonepe_qr.png")}, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 200)
        d = res.get_json()["data"]
        self.assertEqual(d["content_type"], "UPI_PAYMENT")
        self.assertEqual(d["fraud_verdict"], "NO_FRAUD_DETECTED")
        self.assertEqual(d["classification"], "SAFE")
        print(f"[PASS] 02. Normal PhonePe UPI QR: Verdict={d['fraud_verdict']}, Score={d['risk_score']}")

    # 3. Paytm UPI QR
    def test_03_paytm_upi_qr(self):
        payload = "upi://pay?pa=paytmqr12345@paytm&pn=Paytm+Retail+Store&mc=5311&am=499.00&cu=INR&tn=Groceries"
        img_bytes = make_qr_bytes(payload, center_logo=True, logo_color="#002e6e")
        res = self.client.post("/api/scan/qr", data={"image": (io.BytesIO(img_bytes), "paytm_qr.png")}, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 200)
        d = res.get_json()["data"]
        self.assertEqual(d["content_type"], "UPI_PAYMENT")
        self.assertEqual(d["fraud_verdict"], "NO_FRAUD_DETECTED")
        print(f"[PASS] 03. Paytm UPI QR: Verdict={d['fraud_verdict']}, Score={d['risk_score']}")

    # 4. BHIM UPI QR
    def test_04_bhim_upi_qr(self):
        payload = "upi://pay?pa=centralstore@upi&pn=BHIM+Merchant&mc=5499&am=50.00&cu=INR&tn=Stationery"
        img_bytes = make_qr_bytes(payload, center_logo=False)
        res = self.client.post("/api/scan/qr", data={"image": (io.BytesIO(img_bytes), "bhim_qr.png")}, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 200)
        d = res.get_json()["data"]
        self.assertEqual(d["content_type"], "UPI_PAYMENT")
        self.assertEqual(d["fraud_verdict"], "NO_FRAUD_DETECTED")
        print(f"[PASS] 04. BHIM UPI QR: Verdict={d['fraud_verdict']}, Score={d['risk_score']}")

    # 5. QR code with center logo
    def test_05_qr_code_with_center_logo(self):
        payload = "upi://pay?pa=coffeeshop@okhdfcbank&pn=Coffee+Hub&am=85.00&cu=INR&tn=Espresso"
        img_bytes = make_qr_bytes(payload, center_logo=True, logo_color="#d97706")
        res = self.client.post("/api/scan/qr", data={"image": (io.BytesIO(img_bytes), "logo_qr.png")}, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 200)
        d = res.get_json()["data"]
        self.assertIn("Coffee Hub", d["target_content"])
        print(f"[PASS] 05. QR with Center Logo: Successfully decoded via {d.get('decoding_engine')}")

    # 6. QR code with a long UPI payload
    def test_06_qr_code_with_long_upi_payload(self):
        payload = (
            "upi://pay?pa=enterprise.services@icici&pn=Enterprise+Logistics+Private+Limited&mc=4789"
            "&am=15499.50&cu=INR&tn=Monthly+logistics+invoice+number+INV-2026-NOV-9948271"
            "&tr=TXN994827198273645&tid=TID884719283746&url=https://verified-billing.example.com/invoice"
        )
        img_bytes = make_qr_bytes(payload)
        res = self.client.post("/api/scan/qr", data={"image": (io.BytesIO(img_bytes), "long_upi.png")}, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 200)
        d = res.get_json()["data"]
        self.assertEqual(d["extracted_fields"]["am"], "15499.50")
        self.assertIn("Monthly logistics invoice", d["extracted_fields"]["tn"])
        print(f"[PASS] 06. Long UPI Payload: Extracted am={d['extracted_fields']['am']}")

    # 7. QR code without a specified amount (Static UPI QR)
    def test_07_qr_code_without_specified_amount(self):
        payload = "upi://pay?pa=localvendor@axisbank&pn=Corner+Kirana+Store&cu=INR&tn=Scan+and+pay+any+amount"
        img_bytes = make_qr_bytes(payload)
        res = self.client.post("/api/scan/qr", data={"image": (io.BytesIO(img_bytes), "static_qr.png")}, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 200)
        d = res.get_json()["data"]
        self.assertTrue(d["extracted_fields"]["is_static"])
        self.assertEqual(d["extracted_fields"]["am"], "")
        self.assertEqual(d["fraud_verdict"], "NO_FRAUD_DETECTED")
        print(f"[PASS] 07. Static UPI QR: is_static={d['extracted_fields']['is_static']}")

    # 8. Suspicious refund-themed UPI QR (Reverse payment scam)
    def test_08_suspicious_refund_themed_upi_qr(self):
        payload = "upi://pay?pa=refund-nodal-desk@okhdfcbank&pn=SBI_Helpdesk_Refund&am=4999.00&cu=INR&tn=Scan+to+receive+Rs+4999+refund+immediately"
        img_bytes = make_qr_bytes(payload)
        res = self.client.post("/api/scan/qr", data={"image": (io.BytesIO(img_bytes), "scam_refund.png")}, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 200)
        d = res.get_json()["data"]
        self.assertEqual(d["fraud_verdict"], "FRAUD_DETECTED")
        self.assertGreaterEqual(d["risk_score"], 70.0)
        self.assertEqual(d["security_warning"]["severity"], "DANGER")
        print(f"[PASS] 08. Suspicious Refund Scam QR: Verdict={d['fraud_verdict']}, Score={d['risk_score']}")

    # 9. Suspicious payment URL QR
    def test_09_suspicious_payment_url_qr(self):
        payload = "http://paypal-account-security-update.com/login?token=xyz987"
        img_bytes = make_qr_bytes(payload)
        res = self.client.post("/api/scan/qr", data={"image": (io.BytesIO(img_bytes), "phish_url.png")}, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 200)
        d = res.get_json()["data"]
        self.assertEqual(d["content_type"], "URL")
        self.assertEqual(d["fraud_verdict"], "FRAUD_DETECTED")
        print(f"[PASS] 09. Suspicious URL QR: Verdict={d['fraud_verdict']}, Score={d['risk_score']}")

    # 10. Normal HTTPS URL QR
    def test_10_normal_https_url_qr(self):
        payload = "https://github.com/security/advisories"
        img_bytes = make_qr_bytes(payload)
        res = self.client.post("/api/scan/qr", data={"image": (io.BytesIO(img_bytes), "safe_url.png")}, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 200)
        d = res.get_json()["data"]
        self.assertEqual(d["content_type"], "URL")
        self.assertEqual(d["fraud_verdict"], "NO_FRAUD_DETECTED")
        print(f"[PASS] 10. Normal HTTPS URL QR: Verdict={d['fraud_verdict']}, Score={d['risk_score']}")

    # 11. Plain text QR
    def test_11_plain_text_qr(self):
        payload = "ZEROX AI Cybersecurity Conference Keynote 2026: Hall B"
        img_bytes = make_qr_bytes(payload)
        res = self.client.post("/api/scan/qr", data={"image": (io.BytesIO(img_bytes), "text_qr.png")}, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 200)
        d = res.get_json()["data"]
        self.assertEqual(d["content_type"], "TEXT")
        print(f"[PASS] 11. Plain Text QR: ContentType={d['content_type']}")

    # 12. Blurry QR image
    def test_12_blurry_qr_image(self):
        payload = "upi://pay?pa=merchant.blur@ybl&pn=BlurTest&am=75.00&cu=INR"
        img_bytes = make_qr_bytes(payload, blur_radius=1.5)
        res = self.client.post("/api/scan/qr", data={"image": (io.BytesIO(img_bytes), "blur.png")}, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 200)
        d = res.get_json()["data"]
        self.assertEqual(d["content_type"], "UPI_PAYMENT")
        print(f"[PASS] 12. Blurry QR Image: Successfully deblurred and decoded via {d.get('decoding_engine')}")

    # 13. Rotated QR image
    def test_13_rotated_qr_image(self):
        payload = "upi://pay?pa=merchant.rot@ybl&pn=RotateTest&am=100.00&cu=INR"
        img_bytes = make_qr_bytes(payload, rotate_angle=45)
        res = self.client.post("/api/scan/qr", data={"image": (io.BytesIO(img_bytes), "rotated.png")}, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 200)
        d = res.get_json()["data"]
        self.assertEqual(d["content_type"], "UPI_PAYMENT")
        print(f"[PASS] 13. Rotated 45° QR Image: Successfully decoded via {d.get('decoding_engine')}")

    # 14. QR image with extra margins
    def test_14_qr_image_with_extra_margins(self):
        payload = "upi://pay?pa=store@icici&pn=MarginStore&am=200.00&cu=INR"
        img_bytes = make_qr_bytes(payload, extra_margins=150)
        res = self.client.post("/api/scan/qr", data={"image": (io.BytesIO(img_bytes), "margins.png")}, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 200)
        d = res.get_json()["data"]
        self.assertEqual(d["content_type"], "UPI_PAYMENT")
        print(f"[PASS] 14. QR with Extra Margins: Decoded successfully via {d.get('decoding_engine')}")

    # 15. Invalid image (text file uploaded as image)
    def test_15_invalid_image(self):
        fake_txt = io.BytesIO(b"This is not a valid image format.")
        res = self.client.post("/api/scan/qr", data={"image": (fake_txt, "not_an_image.txt")}, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.get_json()["error"]["code"], "INVALID_IMAGE")
        print("[PASS] 15. Invalid Image Format: Correctly rejected with 400 INVALID_IMAGE")

    # 16. Image with no QR code (blank white canvas)
    def test_16_image_with_no_qr_code(self):
        blank = Image.new("RGB", (300, 300), color="white")
        buf = io.BytesIO()
        blank.save(buf, format="PNG")
        buf.seek(0)
        res = self.client.post("/api/scan/qr", data={"image": (buf, "blank.png")}, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.get_json()["error"]["code"], "QR_DECODE_FAILED")
        self.assertIn("Troubleshooting Tips", res.get_json()["error"]["message"])
        print("[PASS] 16. Image With No QR: Correctly returned QR_DECODE_FAILED with troubleshooting instructions")

    # 17. Image containing multiple QR codes
    def test_17_image_containing_multiple_qr_codes(self):
        # Create two distinct QR codes
        qr1_bytes = make_qr_bytes("upi://pay?pa=merchantA@ybl&pn=MerchantA&am=10.00&cu=INR")
        qr2_bytes = make_qr_bytes("upi://pay?pa=merchantB@ybl&pn=MerchantB&am=20.00&cu=INR")

        im1 = Image.open(io.BytesIO(qr1_bytes))
        im2 = Image.open(io.BytesIO(qr2_bytes))

        # Composite side-by-side
        comp = Image.new("RGB", (im1.width + im2.width + 100, max(im1.height, im2.height) + 100), color="white")
        comp.paste(im1, (30, 50))
        comp.paste(im2, (im1.width + 70, 50))

        buf = io.BytesIO()
        comp.save(buf, format="PNG")
        buf.seek(0)

        # 17a. Detect without selected_index -> prompts user with multiple_detected=True
        res = self.client.post("/api/scan/qr", data={"image": (io.BytesIO(buf.getvalue()), "multi.png")}, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 200)
        d = res.get_json()["data"]
        self.assertTrue(d.get("multiple_detected"))
        self.assertEqual(d.get("qr_count"), 2)
        print(f"[PASS] 17a. Multiple QR Detected: Prompted user with {d['qr_count']} candidates")

        # 17b. Specify selected_index=1 -> analyzes MerchantB
        res_sel = self.client.post(
            "/api/scan/qr",
            data={"image": (io.BytesIO(buf.getvalue()), "multi.png"), "selected_index": "1"},
            content_type="multipart/form-data"
        )
        self.assertEqual(res_sel.status_code, 200)
        d_sel = res_sel.get_json()["data"]
        self.assertFalse(d_sel.get("multiple_detected"))
        self.assertIn("MerchantB", d_sel["target_content"])
        print(f"[PASS] 17b. Multiple QR Selection: Successfully analyzed candidate 1 (MerchantB)")

    # 18. Gemini unavailable fallback
    def test_18_gemini_unavailable_fallback(self):
        # Force fallback by mocking is_configured to False
        from app.services.qr_scanner import QRScanner
        s = QRScanner()
        s.ai_service.is_configured = lambda: False
        payload = "upi://pay?pa=fallback.store@icici&pn=FallbackStore&am=100.00&cu=INR"
        img_bytes = make_qr_bytes(payload)
        with self.app.app_context():
            res = s.scan(img_bytes)
        self.assertIn("heuristic_fallback", res["analysis_source"])
        self.assertEqual(res["fraud_verdict"], "NO_FRAUD_DETECTED")
        print(f"[PASS] 18. Gemini Offline Fallback: analysis_source={res['analysis_source']}")

    # 19. SQLite scan history persistence
    def test_19_sqlite_scan_history_persistence(self):
        res = self.client.get("/api/history?type=qr_code")
        self.assertEqual(res.status_code, 200)
        hist = res.get_json()["data"]
        self.assertGreaterEqual(hist["count"], 5)
        print(f"[PASS] 19. SQLite History Persistence: Verified {hist['count']} QR records in database")

    # 20. Frontend upload-to-result integration (JSON base64 format)
    def test_20_frontend_api_integration(self):
        import base64
        payload = "upi://pay?pa=web.checkout@ybl&pn=WebCheckout&am=350.00&cu=INR"
        img_bytes = make_qr_bytes(payload)
        b64 = "data:image/png;base64," + base64.b64encode(img_bytes).decode("utf-8")
        res = self.client.post("/api/scan/qr", json={"image_base64": b64, "filename": "base64_qr.png"})
        self.assertEqual(res.status_code, 200)
        d = res.get_json()["data"]
        self.assertEqual(d["content_type"], "UPI_PAYMENT")
        self.assertIn("web.checkout", d["decoded_content"])
        print(f"[PASS] 20. Frontend Base64 JSON Integration: Successfully scanned and returned analysis")


if __name__ == "__main__":
    unittest.main()
