import os
import json
from dotenv import load_dotenv
from pathlib import Path
from .logger import get_logger

log = get_logger(__name__)

# --- Load Environment Variables ---
# Construct the path to the .env file, which is in the parent directory's 'config' folder
env_path = Path(__file__).parent.parent / 'config' / '.env'

if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    log.info(".env file loaded successfully.")
else:
    log.warning(".env file not found at %s", env_path)

# --- Telegram Bot Tokens ---
TELEGRAM_BOSS_BOT_TOKEN = os.getenv("TELEGRAM_BOSS_BOT_TOKEN")
TELEGRAM_MARKET_BOT_TOKEN = os.getenv("TELEGRAM_MARKET_BOT_TOKEN")
TELEGRAM_CEX_BOT_TOKEN = os.getenv("TELEGRAM_CEX_BOT_TOKEN")

# --- API Keys ---
COINMARKETCAP_API_KEY = os.getenv("COINMARKETCAP_API_KEY")

# --- Webhook Settings ---
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET")
WEBHOOK_PORT = int(os.getenv("WEBHOOK_PORT", "3000")) # Default to 3000 if not set

# --- Admin Whitelist ---
ADMIN_LIST = []
try:
    admin_file_path = Path(__file__).parent.parent / 'config' / 'admins.json'
    with open(admin_file_path, 'r') as f:
        data = json.load(f)
        ADMIN_LIST = data.get("admins", [])
        log.info("admins.json loaded successfully. %d admins found.", len(ADMIN_LIST))
except FileNotFoundError:
    log.error("admins.json not found at %s", admin_file_path)
except json.JSONDecodeError:
    log.error("Error decoding admins.json.")
except Exception as e:
    log.error("An error occurred while loading admins.json: %s", e)

# --- Validation ---
def validate_config():
    """Checks if essential configuration is missing."""
    required_vars = {
        "TELEGRAM_BOSS_BOT_TOKEN": TELEGRAM_BOSS_BOT_TOKEN,
        "TELEGRAM_MARKET_BOT_TOKEN": TELEGRAM_MARKET_BOT_TOKEN,
        "TELEGRAM_CEX_BOT_TOKEN": TELEGRAM_CEX_BOT_TOKEN,
    }
    missing_vars = [key for key, value in required_vars.items() if value is None]
    if missing_vars:
        log.error("Missing required environment variables: %s", ", ".join(missing_vars))
        raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

    if not ADMIN_LIST:
        log.warning("Admin list is empty. The admin bot may not have any authorized users.")

    log.info("Configuration validated successfully.")

validate_config()
