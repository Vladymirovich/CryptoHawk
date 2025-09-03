import asyncio
import json
from pathlib import Path
from typing import Set

from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

from .. import config
from ..logger import get_logger
from ..market_stats import poller

log = get_logger(__name__)

# --- Subscriber Management ---
SUBSCRIBERS_FILE = Path(__file__).parent.parent.parent / 'config' / 'market_stats_subscribers.json'
_subscribers: Set[int] = set()

def _load_subscribers():
    """Loads subscriber chat IDs from the JSON file."""
    global _subscribers
    if SUBSCRIBERS_FILE.exists():
        try:
            with open(SUBSCRIBERS_FILE, 'r') as f:
                _subscribers = set(json.load(f))
                log.info("Loaded %d subscribers for MarketStatsBot.", len(_subscribers))
        except (json.JSONDecodeError, TypeError):
            log.error("Could not decode subscribers file. Starting fresh.")
            _subscribers = set()
    else:
        log.info("Subscribers file not found. Starting with an empty set.")

def _save_subscribers():
    """Saves the current set of subscribers to the JSON file."""
    try:
        with open(SUBSCRIBERS_FILE, 'w') as f:
            json.dump(list(_subscribers), f)
    except IOError as e:
        log.error("Could not save subscribers file: %s", e)

# --- Command Handlers ---
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Adds the user to the subscriber list."""
    chat_id = update.effective_chat.id
    if chat_id not in _subscribers:
        _subscribers.add(chat_id)
        _save_subscribers()
        log.info("New subscriber added: %d", chat_id)
        await update.message.reply_text("🚀 You are now subscribed to CryptoHawk MarketStats updates!")
    else:
        await update.message.reply_text("✅ You are already subscribed.")

async def stop(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Removes the user from the subscriber list."""
    chat_id = update.effective_chat.id
    if chat_id in _subscribers:
        _subscribers.remove(chat_id)
        _save_subscribers()
        log.info("Subscriber removed: %d", chat_id)
        await update.message.reply_text("👋 You have been unsubscribed from MarketStats updates.")
    else:
        await update.message.reply_text("You were not subscribed.")

async def get_market_data(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Displays the latest cached market data."""
    log.info("User %s requested market data.", update.effective_user.id)
    cache = poller.market_data_cache
    if not cache:
        await update.message.reply_text("😕 Market data cache is currently empty. Please try again later.")
        return

    message = "📊 **Latest Market Data** 📊\n\n"
    for key, value in cache.items():
        message += f"🔹 **{key.replace('_', ' ').title()}**:\n"
        message += f"```json\n{json.dumps(value, indent=2)}\n```\n\n"

    await update.message.reply_text(message, parse_mode='Markdown')

# --- Bot Setup ---
def setup_market_stats_bot(application: Application):
    """Adds handlers to the MarketStats bot application."""
    log.info("Setting up MarketStats bot handlers...")

    _load_subscribers()
    poller.set_notification_bot(application, _subscribers)

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("stop", stop))
    application.add_handler(CommandHandler("marketdata", get_market_data))

    log.info("MarketStats bot handlers set up successfully.")

async def main():
    """Main function to run the bot for testing."""
    if not config.TELEGRAM_MARKET_BOT_TOKEN:
        log.error("TELEGRAM_MARKET_BOT_TOKEN is not set!")
        return

    from pathlib import Path
    config_dir = Path(__file__).parent.parent.parent / 'config'
    config.load_configuration(config_dir)
    config.validate_configuration()

    application = Application.builder().token(config.TELEGRAM_MARKET_BOT_TOKEN).build()
    setup_market_stats_bot(application)

    log.info("Starting MarketStats bot...")
    await application.run_polling()

if __name__ == '__main__':
    asyncio.run(main())
