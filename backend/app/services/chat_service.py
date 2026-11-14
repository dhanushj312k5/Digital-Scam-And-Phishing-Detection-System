"""
ZEROX AI - Intelligent Cybersecurity Chat Assistant Service
Powered by Google Gemini AI with resilient heuristic fallback knowledge engine.
Handles cybersecurity guidance, scan explanations, fraud education, and safe digital hygiene.
"""

import os
import re
import logging
from datetime import datetime, timezone
from app.services.gemini_service import GeminiAIService

logger = logging.getLogger(__name__)

# Specialized system instruction providing full domain context of ZEROX AI and threat models
CYBERSECURITY_SYSTEM_INSTRUCTION = (
    "You are ZEROX AI Assistant, an elite, friendly, and practical cybersecurity specialist embedded inside "
    "ZEROX AI – Scam & Phishing Detection System. Your mission is to protect everyday users, students, and professionals "
    "from cyber threats by providing clear, jargon-free, actionable guidance.\n\n"
    "ABOUT ZEROX AI PLATFORM:\n"
    "- Message Scam Scanner: Analyzes SMS, emails, and DMs for smishing, urgency manipulation, and credential harvesting.\n"
    "- URL Threat & Phishing Scanner: Static lexical decomposition of domains, typosquatting, and brand impersonation (never visits live links).\n"
    "- QR Code Scam Scanner: Decodes PhonePe, GPay, Paytm, BHIM, BharatQR, and URL matrices. Identifies reverse payment traps "
    "  (scanning a QR code can NEVER receive money; it always debits the account).\n"
    "- Social Media Scam Scanner: Analyzes Instagram, Facebook, X, WhatsApp, Telegram, LinkedIn, YouTube, and Snapchat handles for fake helpdesks and recruitment scams.\n"
    "- Risk Scoring: 0-100 (0-14 SAFE, 15-34 LOW, 35-64 MEDIUM, 65-84 HIGH, 85-100 CRITICAL).\n"
    "- Fraud Verdicts: FRAUD DETECTED (High/Critical risk), NO FRAUD INDICATORS DETECTED (Safe/Benign), NEEDS REVIEW (Medium/Anomalous).\n\n"
    "SECURITY & SAFETY DIRECTIVES:\n"
    "1. NEVER ask users for passwords, OTPs, CVVs, UPI PINs, or private keys.\n"
    "2. If a user asks how to hack, create malware, or steal credentials, refuse politely and explain defensive countermeasures.\n"
    "3. If financial loss or stolen funds are reported, advise immediate contact with the bank's fraud helpline, freezing cards/UPI, "
    "   and reporting to cybercrime authorities (e.g., 1930 / cybercrime.gov.in in India, IC3 in the US).\n"
    "4. Format answers cleanly using markdown: bold highlights, bullet points, and numbered action steps.\n"
    "5. Keep responses concise, practical, and beginner-friendly."
)

# Comprehensive rule-based knowledge responses used when Gemini AI is offline, rate-limited, or unconfigured
HEURISTIC_KNOWLEDGE_BASE = [
    {
        "keywords": ["phish", "phishing", "scam message", "smish", "fake sms", "identify scam", "identify phishing"],
        "topic": "Phishing & Scam Message Identification",
        "reply": (
            "### 🛡️ How to Identify a Phishing or Scam Message\n\n"
            "Phishing messages trick you into disclosing passwords, financial info, or downloading malware. Look for these **red flags**:\n\n"
            "1. **Artificial Urgency & Fear Tactics**: 'Account suspended in 24 hours', 'Immediate legal action', or 'KYC blocked'. Scammers rush you so you don't think.\n"
            "2. **Suspicious Sender Addresses**: Generic numbers, strange country codes, or spoofed email addresses with subtle typos.\n"
            "3. **Deceptive Links**: Shortened URLs (`bit.ly`, `tinyurl`) or lookalike domains (`sbi-update.top`, `paypa1.co`). Always check the actual domain name.\n"
            "4. **Requests for Sensitive Credentials**: Banks and reputable companies **never** ask for your password, OTP, CVV, or UPI PIN via message.\n"
            "5. **Unsolicited Prizes or Refunds**: 'You won ₹25,00,000 in a lottery' or 'Tax refund ready to claim'. If you didn't enter, you didn't win.\n\n"
            "💡 **Pro-Tip**: You can copy any suspicious text into the **ZEROX AI Message Scanner** for instant AI forensic analysis!"
        )
    },
    {
        "keywords": ["upi", "qr", "qr code", "fake qr", "reverse payment", "gpay", "phonepe", "paytm", "bhim", "fake upi"],
        "topic": "UPI & QR Code Payment Scams",
        "reply": (
            "### ⚠️ How to Detect Fake UPI & QR Code Scams\n\n"
            "The most common payment scam is the **Reverse Payment Trap**:\n\n"
            "1. **Golden Rule of UPI**: **You NEVER need to enter your UPI PIN or scan a QR code to RECEIVE money.** Scanning a QR code only **debits** money from your account.\n"
            "2. **Deceptive Transaction Notes**: Scammers send QR codes with notes like *'Scan to receive ₹5,000 cashback'* or *'Refund SBI Desk'*. This is 100% fraud.\n"
            "3. **Personal VPAs Posing as Companies**: Legitimate merchants have official merchant category codes (`mc`). If a 'business' uses a personal VPA (`someone99@ybl`), be alert.\n"
            "4. **Tampered Physical Stickers**: In physical stores, fraudsters stick their own QR stickers on top of legitimate shopkeeper QR stands. Always check the merchant name shown on screen before paying.\n\n"
            "🔍 **Action**: Upload any suspicious QR screenshot to the **ZEROX AI QR Code Scanner** to verify merchant parameters and reverse payment traps before scanning with your banking app."
        )
    },
    {
        "keywords": ["otp", "steal otp", "one time password", "2fa", "sim swap", "verification code", "steal otps"],
        "topic": "OTP Fraud & Account Takeover",
        "reply": (
            "### 🔒 How Scammers Steal OTPs and How to Stay Protected\n\n"
            "One-Time Passwords (OTPs) are the final shield protecting your bank and social accounts. Scammers steal them through:\n\n"
            "1. **Social Engineering Calls**: Scammers pose as bank executives, telecom agents (5G upgrade), or courier delivery staff claiming an OTP is needed to 'cancel an unauthorized charge' or 'verify delivery'.\n"
            "2. **Screen Sharing Apps**: Convincing you to install remote access apps like AnyDesk, TeamViewer, or RustDesk under the guise of customer support.\n"
            "3. **Malicious SMS Forwarder APKs**: Fraudulent apps downloaded outside official app stores that silently read and forward your incoming SMS messages to criminals.\n"
            "4. **Phishing Login Pages**: Entering credentials and OTPs on a clone login website.\n\n"
            "🛑 **Golden Rule**: **NEVER share an OTP with anyone over the phone, chat, or email**, even if they claim to be from your bank or the police."
        )
    },
    {
        "keywords": ["instagram", "fake instagram", "fake account", "fake profile", "social media", "impersonator", "twitter", "telegram", "facebook", "snapchat"],
        "topic": "Fake Social Media Profiles & Impersonation",
        "reply": (
            "### 🕵️ How to Spot a Fake Social Media Profile\n\n"
            "Scammers create duplicate accounts to scam followers or impersonate customer support:\n\n"
            "1. **Subtle Handle Variations**: Extra underscores, swapped letters, or digits (e.g., `@instagram_support_124` or `@elon_musk_airdrop`).\n"
            "2. **Account Creation Date & Activity**: Newly created accounts with few posts, disproportionate follower-to-following ratios, or disabled comments.\n"
            "3. **Bio Promises**: Unrealistic claims like 'Official Giveaways', 'Guaranteed 1000% Crypto Profit', or 'DM for account recovery'.\n"
            "4. **Off-Platform Redirection**: Urging you to move conversation to unmonitored channels like unknown WhatsApp numbers or Telegram handles.\n\n"
            "⚡ **Test It**: Paste any handle or profile URL into the **ZEROX AI Social Media Scanner** to evaluate brand spoofing and risk signals."
        )
    },
    {
        "keywords": ["bank", "protect", "protect bank", "card", "atm", "financial", "cvv", "pin"],
        "topic": "Bank Account & Financial Protection",
        "reply": (
            "### 🏦 Best Practices to Protect Your Bank Account\n\n"
            "Follow these essential financial security habits:\n\n"
            "1. **Enable Daily Transaction Limits**: Set reasonable limits for UPI, ATM withdrawals, and online card payments in your banking app.\n"
            "2. **Disable International & Online Usage When Not in Use**: Toggle off international card transactions until you travel.\n"
            "3. **Never Disclose CVV or UPI PIN**: Your PIN is only required to deduct money, never to view balance or receive credits.\n"
            "4. **Monitor Real-Time SMS Alerts**: Check bank debit alerts immediately. If you see an unrecognized charge, freeze the card instantly.\n"
            "5. **Use Dedicated Accounts for Online Shopping**: Keep a primary savings account separate from the account linked to daily UPI and shopping apps."
        )
    },
    {
        "keywords": ["clicked", "clicked link", "suspicious link", "clicked a link", "hacked", "visited link"],
        "topic": "Emergency Response: Clicked a Suspicious Link",
        "reply": (
            "### 🚨 Immediate Steps If You Clicked a Suspicious Link\n\n"
            "Don't panic — act quickly to mitigate the risk:\n\n"
            "1. **Close the Page Immediately**: Do **not** fill in any forms, passwords, phone numbers, or credit card fields.\n"
            "2. **Did You Enter Passwords?**: If you entered login credentials, go to the **official** website from another tab and change your password immediately. Enable Two-Factor Authentication (2FA).\n"
            "3. **Did an APK or File Download?**: Do **NOT** install or open it. Go to your Downloads folder and delete it immediately.\n"
            "4. **Did You Authorize a Bank Charge?**: Call your bank's 24/7 fraud helpline immediately to block your cards and freeze UPI access.\n"
            "5. **Clear Browser Cache & Cookies**: Go to browser settings and clear browsing data to eliminate tracking cookies or malicious sessions.\n"
            "6. **Scan the Link in ZEROX AI**: Paste the URL into **ZEROX AI URL Scanner** to inspect what kind of phishing campaign it was."
        )
    },
    {
        "keywords": ["zerox", "how does zerox work", "features", "scanners", "how to use", "dashboard"],
        "topic": "ZEROX AI Capabilities Overview",
        "reply": (
            "### 🚀 ZEROX AI Security Suite Overview\n\n"
            "ZEROX AI is your all-in-one AI-driven scam and phishing defense system. Here is what you can do:\n\n"
            "- **Message Scam Scanner** (`/message-scanner`): Paste suspicious SMS, emails, or texts to detect smishing, urgency manipulation, and lottery scams.\n"
            "- **URL Threat Scanner** (`/url-scanner`): Inspect website links for typosquatting, phishing kits, and homoglyphs without visiting dangerous sites.\n"
            "- **QR Code Scanner** (`/qr-scanner`): Upload PhonePe, GPay, Paytm, or generic QR screenshots to verify UPI parameters and catch reverse payment scams.\n"
            "- **Social Media Scanner** (`/social-scanner`): Enter account handles across 8 platforms to detect fake profiles, support impostors, and crypto traps.\n"
            "- **Security Center** (`/security`): Review threat intelligence advisories, real-time statistics, and incident checklists.\n"
            "- **Scan History** (`/history`): Review, filter, or export your saved security scan records."
        )
    },
    {
        "keywords": ["score", "risk score", "verdict", "safe", "critical", "suspicious", "what does it mean"],
        "topic": "Understanding ZEROX AI Risk Scores & Verdicts",
        "reply": (
            "### 📊 Understanding ZEROX AI Risk Scores & Verdicts\n\n"
            "ZEROX AI combines Google Gemini AI contextual reasoning with lexical security heuristics:\n\n"
            "**Risk Score (0–100):**\n"
            "- **0 – 14 (SAFE)**: Clean syntax, verified merchant or standard domain. No threat markers.\n"
            "- **15 – 34 (LOW)**: Minor anomalies or unfamiliar sender. Observe standard security hygiene.\n"
            "- **35 – 64 (MEDIUM)**: Suspicious indicators or off-platform communication. Exercise high caution.\n"
            "- **65 – 84 (HIGH)**: Strong indicators of fraud, coercive urgency, or lookalike branding.\n"
            "- **85 – 100 (CRITICAL)**: High-confidence scam, credential harvesting, or reverse payment trap.\n\n"
            "**Fraud Verdicts:**\n"
            "- 🔴 **FRAUD DETECTED**: Active threat detected. Do not click, pay, or respond. Block and report.\n"
            "- 🟢 **NO FRAUD INDICATORS DETECTED**: No known scam patterns matched. Normal caution still applies.\n"
            "- 🟡 **NEEDS REVIEW**: Inconclusive or borderline signals. Verify through a trusted secondary channel."
        )
    }
]


class ChatService:
    """
    Orchestrates intelligent conversation between the user and the ZEROX AI Cybersecurity Assistant.
    Primary Engine: Google Gemini AI (via GeminiAIService).
    Fallback Engine: Heuristic Rule-Based Cybersecurity Knowledge Engine.
    """

    def __init__(self):
        self.ai_service = GeminiAIService()

    def _match_heuristic_knowledge(self, message: str) -> str:
        """Find the most relevant cybersecurity response from the knowledge base."""
        lowered = message.lower()

        # Score matching entries based on keyword hits
        best_match = None
        max_score = 0

        for entry in HEURISTIC_KNOWLEDGE_BASE:
            score = sum(len(kw) for kw in entry["keywords"] if kw in lowered)
            if score > max_score:
                max_score = score
                best_match = entry

        if best_match and max_score > 0:
            return best_match["reply"]

        # Default helpful fallback response
        return (
            "### 🛡️ ZEROX AI Cybersecurity Assistant\n\n"
            "I'm here to help you identify online scams, phishing attempts, fake QR codes, and digital security threats.\n\n"
            "Here are some common topics I can assist with:\n"
            "- **Phishing & Smishing**: How to spot deceptive emails, SMS, and WhatsApp messages.\n"
            "- **UPI & QR Code Traps**: Why you never enter a PIN to receive refunds or money.\n"
            "- **Fake Social Profiles**: Detecting Instagram, X, or Telegram impersonators.\n"
            "- **Account Security**: Two-Factor Authentication (2FA), password hygiene, and OTP protection.\n"
            "- **ZEROX AI Scanners**: How to use the Message, URL, QR, and Social Media scanners.\n\n"
            "Feel free to ask a specific question, or click one of the quick suggestions above!"
        )

    def chat(self, user_message: str, history: list = None, scan_context: dict = None) -> tuple[dict, str | None]:
        """
        Process user question and return an intelligent cybersecurity answer.
        Returns: (result_dict, error_message_or_None)
        """
        clean_msg = (user_message or "").strip()
        if not clean_msg:
            return {
                "reply": "Please enter a question or cybersecurity topic you'd like help with.",
                "analysis_source": "rule_based_security_engine",
                "model": "heuristic",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }, None

        # Truncate extremely long inputs to avoid payload abuse
        if len(clean_msg) > 4000:
            clean_msg = clean_msg[:4000]

        # 1. Attempt Google Gemini AI real inference if configured
        if self.ai_service.is_configured():
            try:
                client = self.ai_service._get_client()
                _, model = self.ai_service._resolve_config()

                if client:
                    # Construct multi-turn context or formatted prompt
                    prompt_parts = []

                    # Include scan context if explicitly passed
                    if scan_context and isinstance(scan_context, dict):
                        sc_summary = (
                            f"Context: The user is asking about an existing scan result:\n"
                            f"- Scan Type: {scan_context.get('scan_type', 'Scan')}\n"
                            f"- Target: {scan_context.get('target_content', 'N/A')}\n"
                            f"- Risk Score: {scan_context.get('risk_score', 'N/A')}/100\n"
                            f"- Verdict: {scan_context.get('fraud_verdict', 'N/A')}\n"
                            f"- Classification: {scan_context.get('classification', 'N/A')}\n"
                            f"- Reasons: {', '.join(scan_context.get('reasons', []))}\n\n"
                        )
                        prompt_parts.append(sc_summary)

                    # Append recent conversation history (up to last 6 turns)
                    if history and isinstance(history, list):
                        hist_text = "Recent Conversation History:\n"
                        for item in history[-6:]:
                            role = item.get("role", "user")
                            content = (item.get("content") or "").strip()
                            if content:
                                hist_text += f"{role.title()}: {content}\n"
                        prompt_parts.append(hist_text + "\n")

                    prompt_parts.append(f"User Question: {clean_msg}\n\nProvide an intelligent, helpful, and concise cybersecurity response in markdown:")

                    full_prompt = "".join(prompt_parts)

                    response = client.models.generate_content(
                        model=model,
                        contents=full_prompt,
                        config={
                            "system_instruction": CYBERSECURITY_SYSTEM_INSTRUCTION
                        }
                    )

                    if response and response.text:
                        reply_text = response.text.strip()
                        return {
                            "reply": reply_text,
                            "model": model,
                            "analysis_source": f"gemini_ai ({model})",
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }, None

            except Exception as e:
                err_str = str(e)
                logger.warning(f"Gemini chat inference error (falling back to heuristic engine): {err_str}")

        # 2. Resilient Rule-Based Fallback Knowledge Engine
        heuristic_reply = self._match_heuristic_knowledge(clean_msg)
        return {
            "reply": heuristic_reply,
            "model": "heuristic_knowledge_engine",
            "analysis_source": "heuristic_fallback (rule_based_security_engine)",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }, None
