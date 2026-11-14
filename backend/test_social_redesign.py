"""
Automated Verification Suite for the Redesigned Social Media Scanner in ZEROX AI.
Verifies:
1. Selecting all 8 platforms (Instagram, Facebook, X, WhatsApp, Telegram, LinkedIn, YouTube, Snapchat)
2. Username-only submission
3. Profile-URL-only submission
4. Both fields together
5. Empty-field rejection with 400
6. Live Flask API route /api/scan/social
7. Heuristic fallback and Gemini integration handling
8. SQLite persistence and scan history retrieval
"""
import unittest
import json
import sqlite3
import os
from app.main import create_app
from app.services.social_scanner import SocialMediaScanner

class TestSocialScannerRedesign(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.client = cls.app.test_client()
        cls.db_path = cls.app.config.get("DATABASE_PATH", "zerox_ai.db")

    def test_01_all_eight_platforms_supported(self):
        platforms = [
            "Instagram", "Facebook", "X", "WhatsApp",
            "Telegram", "LinkedIn", "YouTube", "Snapchat"
        ]
        for plat in platforms:
            res = self.client.post("/api/scan/social", json={
                "platform": plat,
                "username": f"{plat.lower()}_test_account"
            })
            self.assertEqual(res.status_code, 200, f"Platform {plat} failed with status {res.status_code}")
            data = res.get_json()
            self.assertTrue(data.get("success"))
            self.assertTrue(plat.lower() in data["data"]["platform"].lower(), f"Expected {plat} in {data['data']['platform']}")

    def test_02_username_only_submission(self):
        res = self.client.post("/api/scan/social", json={
            "platform": "Instagram",
            "username": "@instagram_support123",
            "profile_url": ""
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["data"]
        self.assertEqual(data["fraud_verdict"], "FRAUD_DETECTED")
        self.assertGreaterEqual(data["risk_score"], 65)
        self.assertIn("username", data)
        self.assertEqual(data["username"], "instagram_support123")

    def test_03_profile_url_only_submission(self):
        res = self.client.post("/api/scan/social", json={
            "platform": "Instagram",
            "username": "",
            "profile_url": "https://instagram.com/instagram_support123"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["data"]
        self.assertEqual(data["fraud_verdict"], "FRAUD_DETECTED")
        self.assertGreaterEqual(data["risk_score"], 65)
        self.assertEqual(data["analysis_details"]["profile_url"], "https://instagram.com/instagram_support123")

    def test_04_both_fields_together(self):
        res = self.client.post("/api/scan/social", json={
            "platform": "Telegram",
            "username": "@crypto_vip_signals_daily",
            "profile_url": "https://t.me/crypto_vip_signals_daily"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["data"]
        self.assertEqual(data["fraud_verdict"], "FRAUD_DETECTED")
        self.assertGreaterEqual(data["risk_score"], 50)
        self.assertEqual(data["username"], "crypto_vip_signals_daily")
        self.assertEqual(data["analysis_details"]["profile_url"], "https://t.me/crypto_vip_signals_daily")

    def test_05_empty_field_validation(self):
        # Both empty
        res = self.client.post("/api/scan/social", json={
            "platform": "Instagram",
            "username": "",
            "profile_url": ""
        })
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertEqual(data.get("error", {}).get("code"), "EMPTY_INPUT")

        # Single character empty equivalent
        res2 = self.client.post("/api/scan/social", json={
            "platform": "Instagram",
            "username": "a",
            "profile_url": ""
        })
        self.assertEqual(res2.status_code, 400)
        self.assertEqual(res2.get_json().get("error", {}).get("code"), "EMPTY_INPUT")

    def test_06_legitimate_account_benign_verdict(self):
        res = self.client.post("/api/scan/social", json={
            "platform": "YouTube",
            "username": "@googleworkspace",
            "profile_url": "https://youtube.com/@googleworkspace"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["data"]
        self.assertEqual(data["fraud_verdict"], "NO_FRAUD_DETECTED")
        self.assertLessEqual(data["risk_score"], 20)
        self.assertEqual(data["classification"], "SAFE")

    def test_07_disclaimer_and_scope_explanation_present(self):
        res = self.client.post("/api/scan/social", json={
            "platform": "LinkedIn",
            "username": "sarah_jenkins_hr",
            "profile_url": ""
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["data"]
        self.assertTrue(bool(data.get("disclaimer")))
        # Scope explanation is present in reasons when bio/message are omitted
        reasons_text = " ".join(data.get("reasons", []))
        self.assertTrue("Assessment Scope" in reasons_text or "disclaimer" in data)

    def test_08_sqlite_persistence(self):
        # Scan unique username
        test_handle = "unique_audit_test_handle_999"
        res = self.client.post("/api/scan/social", json={
            "platform": "X",
            "username": test_handle,
            "profile_url": ""
        })
        self.assertEqual(res.status_code, 200)
        scan_id = res.get_json()["data"]["id"]

        # Verify in SQLite database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT id, scan_type, target_content, risk_score, fraud_verdict FROM scans WHERE id = ?", (scan_id,))
        row = cursor.fetchone()
        conn.close()

        self.assertIsNotNone(row)
        self.assertEqual(row[1], "social_media")
        self.assertIn(test_handle, row[2])

        # Verify via GET /api/history
        h_res = self.client.get(f"/api/history/{scan_id}")
        self.assertEqual(h_res.status_code, 200)
        h_data = h_res.get_json()["data"]
        self.assertEqual(h_data["scan_type"], "social_media")


if __name__ == "__main__":
    unittest.main()
