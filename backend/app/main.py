import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app import create_app

app = create_app(os.environ.get("FLASK_ENV", "development"))

if __name__ == "__main__":
    port = int(app.config.get("PORT", 5001))
    debug = bool(app.config.get("DEBUG", True))
    print(f"🚀 Starting ZEROX AI Backend (app/main.py) on port {port} (Debug: {debug})...")
    app.run(host="0.0.0.0", port=port, debug=debug)
