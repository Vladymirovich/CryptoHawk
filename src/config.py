import os
import json
from dotenv import load_dotenv
from pathlib import Path
from typing import List, Optional

from .logger import get_logger

log = get_logger(__name__)

# --- Global Configuration Variables (with defaults) ---
TELEGRAM_BOSS_BOT_TOKEN: Optional[str] = None
TELEGRAM_MARKET_BOT_TOKEN: Optional[str] = None
TELEGRAM_CEX_BOT_TOKEN: Optional[str] = None
COINMARKETCAP_API_KEY: Optional[str] = None
WEBHOOK_SECRET: Optional[str] = None
WEBHOOK_PORT: int = 3000
ADMIN_LIST: List[int] = []

def load_configuration(config_dir: Path):
    """
    Loads configuration from a specified directory.
    This function populates the global config variables.
    """
    global TELEGRAM_BOSS_BOT_TOKEN, TELEGRAM_MARKET_BOT_TOKEN, TELEGRAM_CEX_BOT_TOKEN
    global COINMARKETCAP_API_KEY, WEBHOOK_SECRET, WEBHOOK_PORT, ADMIN_LIST

    # --- Load Environment Variables ---
    env_path = config_dir / '.env'
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
        log.info(".env file loaded successfully from %s.", env_path)
    else:
        log.warning(".env file not found at %s. Using environment variables.", env_path)

    TELEGRAM_BOSS_BOT_TOKEN = os.getenv("TELEGRAM_BOSS_BOT_TOKEN")
    TELEGRAM_MARKET_BOT_TOKEN = os.getenv("TELEGRAM_MARKET_BOT_TOKEN")
    TELEGRAM_CEX_BOT_TOKEN = os.getenv("TELEGRAM_CEX_BOT_TOKEN")
    COINMARKETCAP_API_KEY = os.getenv("COINMARKETCAP_API_KEY")
    WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET")
    WEBHOOK_PORT = int(os.getenv("WEBHOOK_PORT", "3000"))

    # --- Admin Whitelist ---
    admin_file_path = config_dir / 'admins.json'
    try:
        with open(admin_file_path, 'r') as f:
            data = json.load(f)
            ADMIN_LIST = data.get("admins", [])
            log.info("admins.json loaded successfully. %d admins found.", len(ADMIN_LIST))
    except FileNotFoundError:
        log.error("admins.json not found at %s", admin_file_path)
        ADMIN_LIST = []
    except json.JSONDecodeError:
        log.error("Error decoding admins.json.")
        ADMIN_LIST = []
    except Exception as e:
        log.error("An error occurred while loading admins.json: %s", e)
        ADMIN_LIST = []


def validate_configuration():
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

# Note: Configuration is no longer loaded on import.
# The main application entrypoint must call load_configuration().
