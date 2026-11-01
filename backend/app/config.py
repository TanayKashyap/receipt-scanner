import os
from typing import List
from dotenv import load_dotenv

# Load .env file if present
load_dotenv()

class Settings:
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    ALLOWED_ORIGINS_RAW: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000,https://reciept-scanner-app.firebaseapp.com,https://reciept-scanner-app.web.app"
    )
    PORT: int = int(os.getenv("PORT", "8000"))
    DRIVE_APP_FOLDER: str = os.getenv("DRIVE_APP_FOLDER", "Receipt_Scanner_App")

    @property
    def allowed_origins(self) -> List[str]:
        origins = [o.strip() for o in self.ALLOWED_ORIGINS_RAW.split(",") if o.strip()]
        # Always allow wildcard or origins in development if empty
        return origins if origins else ["*"]

settings = Settings()
