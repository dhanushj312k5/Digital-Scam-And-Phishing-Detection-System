"""
Automated Test Suite for ZEROX AI Cybersecurity Chat Assistant.
Verifies:
1. POST /api/chat response structure
2. Input validation (empty message, oversized payload)
3. Multi-turn conversation handling
4. 6 quick suggestion queries
5. Explaining an attached scan context
6. Chat messages are NEVER saved to the scans table
7. Analysis source identification (Gemini vs heuristic fallback)
"""
import unittest
import sqlite3
from app.main import create_app

class TestChatAssistant(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.client = cls.app.test_client()
        cls.db_path = cls.app.config.get("DATABASE_PATH", "zerox_ai.db")

    def test_01_empty_message_validation(self):
        res = self.client.post("/api/chat", json={"message": ""})
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data["success"])
        self.assertEqual(data["error"]["code"], "EMPTY_MESSAGE")

        res_spaces = self.client.post("/api/chat", json={"message": "   "})
        self.assertEqual(res_spaces.status_code, 400)
        self.assertEqual(res_spaces.get_json()["error"]["code"], "EMPTY_MESSAGE")

    def test_02_oversized_message_validation(self):
        huge_msg = "A" * 9000
        res = self.client.post("/api/chat", json={"message": huge_msg})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.get_json()["error"]["code"], "MESSAGE_TOO_LONG")

    def test_03_quick_suggestion_phishing_message(self):
        res = self.client.post("/api/chat", json={
            "message": "How do I identify a phishing message?"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["data"]
        self.assertTrue(bool(data.get("reply")))
        self.assertTrue("phish" in data["reply"].lower() or "urgency" in data["reply"].lower())
        self.assertTrue(bool(data.get("analysis_source")))

    def test_04_quick_suggestion_fake_upi_qr(self):
        res = self.client.post("/api/chat", json={
            "message": "How can I detect a fake UPI QR code?"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["data"]
        self.assertTrue("upi" in data["reply"].lower() or "pin" in data["reply"].lower())
        self.assertTrue("receive" in data["reply"].lower() or "qr" in data["reply"].lower())

    def test_05_quick_suggestion_otp_theft(self):
        res = self.client.post("/api/chat", json={
            "message": "How do scammers steal OTPs?"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["data"]
        self.assertTrue("otp" in data["reply"].lower())

    def test_06_quick_suggestion_fake_instagram(self):
        res = self.client.post("/api/chat", json={
            "message": "How do I identify a fake Instagram account?"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["data"]
        self.assertTrue("instagram" in data["reply"].lower() or "handle" in data["reply"].lower())

    def test_07_quick_suggestion_protect_bank(self):
        res = self.client.post("/api/chat", json={
            "message": "How can I protect my bank account?"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["data"]
        self.assertTrue("bank" in data["reply"].lower() or "card" in data["reply"].lower())

    def test_08_quick_suggestion_clicked_suspicious_link(self):
        res = self.client.post("/api/chat", json={
            "message": "What should I do if I clicked a suspicious link?"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["data"]
        self.assertTrue("password" in data["reply"].lower() or "close" in data["reply"].lower())

    def test_09_multi_turn_history(self):
        history = [
            {"role": "user", "content": "I received an SMS claiming my SBI account is blocked."},
            {"role": "assistant", "content": "That is almost certainly a smishing attack. Do not click the link."}
        ]
        res = self.client.post("/api/chat", json={
            "message": "What should I do with the sender phone number?",
            "history": history
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["data"]
        self.assertTrue(bool(data.get("reply")))

    def test_10_scan_context_explanation(self):
        scan_context = {
            "scan_type": "qr_code",
            "target_content": "upi://pay?pa=scammer@ybl&am=2000&tn=Refund",
            "risk_score": 95,
            "fraud_verdict": "FRAUD_DETECTED",
            "classification": "CRITICAL",
            "reasons": ["Reverse payment scam note requesting QR scan to receive funds"]
        }
        res = self.client.post("/api/chat", json={
            "message": "Can you explain why this QR scan got a Critical rating?",
            "scan_context": scan_context
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["data"]
        self.assertTrue(bool(data.get("reply")))

    def test_11_chat_does_not_pollute_scans_table(self):
        # Count scans before chat
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM scans")
        count_before = cursor.fetchone()[0]
        conn.close()

        # Send chat message
        res = self.client.post("/api/chat", json={
            "message": "Is a message saying I won a car legitimate?"
        })
        self.assertEqual(res.status_code, 200)

        # Count scans after chat
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM scans")
        count_after = cursor.fetchone()[0]
        conn.close()

        self.assertEqual(count_before, count_after, "Chat assistant messages must NOT be stored in the scans table!")


if __name__ == "__main__":
    unittest.main()
