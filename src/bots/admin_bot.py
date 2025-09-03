import asyncio
import psutil
import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, ContextTypes

from .. import config
from ..logger import get_logger
from ..market_stats import poller as market_poller

log = get_logger(__name__)

# --- Authorization Filter ---
class AdminFilter(filters.BaseFilter):
    def filter(self, update: Update) -> bool:
        user_id = update.from_user.id if update.from_user else None
        return user_id is not None and user_id in config.ADMIN_LIST

admin_filter = AdminFilter()

# --- Main Menu ---
def get_main_menu_keyboard():
    keyboard = [
        [InlineKeyboardButton("MarketStats", callback_data="menu_marketstats"), InlineKeyboardButton("OnChain", callback_data="menu_onchain")],
        [InlineKeyboardButton("CEX Screen", callback_data="menu_cex_screen"), InlineKeyboardButton("DEX Screen", callback_data="menu_dex_screen")],
        [InlineKeyboardButton("Status", callback_data="menu_status")]
    ]
    return InlineKeyboardMarkup(keyboard)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Sends a message with the main menu."""
    if not admin_filter.filter(update.message):
        await update.message.reply_text("❌ You are not authorized to use this bot.")
        return

    text = "Welcome to CryptoHawk Admin Bot!\nSelect an option:"
    await update.message.reply_text(text, reply_markup=get_main_menu_keyboard())

async def back_to_main_menu(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Go back to the main menu."""
    query = update.callback_query
    await query.answer()
    text = "🚀 **CryptoHawk Admin Bot**\nChoose an option:"
    await query.edit_message_text(text, reply_markup=get_main_menu_keyboard())

# --- MarketStats Menu ---
market_stats_settings = {
    "crypto_market_cap": False,
    "cmc_fear_greed": False,
}

def get_market_stats_menu_keyboard():
    buttons = []
    for key, is_active in market_stats_settings.items():
        label = key.replace("_", " ").title()
        icon = "✅" if is_active else "❌"
        buttons.append([InlineKeyboardButton(f"{icon} {label}", callback_data=f"toggle_market_{key}")])
    buttons.append([InlineKeyboardButton("← Back", callback_data="main_menu")])
    return InlineKeyboardMarkup(buttons)

async def menu_marketstats(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    text = "MarketStats Settings:\nToggle market events to monitor:"
    await query.edit_message_text(text, reply_markup=get_market_stats_menu_keyboard())

async def toggle_market_event(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    event_key = query.data.replace("toggle_market_", "")

    if event_key in market_stats_settings:
        market_stats_settings[event_key] = not market_stats_settings[event_key]
        await query.answer(f"{event_key} is now {'ON' if market_stats_settings[event_key] else 'OFF'}")
    else:
        await query.answer("Unknown event.")

    active_events = [key for key, active in market_stats_settings.items() if active]
    if active_events:
        market_poller.start_poller(active_events)
    else:
        market_poller.stop_poller()

    await query.edit_message_text(
        text="MarketStats Settings:\nToggle market events to monitor:",
        reply_markup=get_market_stats_menu_keyboard()
    )

# --- Server Status Menu ---
async def get_server_status() -> str:
    """Gathers and formats server metrics using psutil."""
    cpu_load = psutil.cpu_percent(interval=1)

    mem = psutil.virtual_memory()
    mem_total_gb = mem.total / (1024**3)
    mem_used_gb = mem.used / (1024**3)
    mem_percent = mem.percent

    disk = psutil.disk_usage('/')
    disk_total_gb = disk.total / (1024**3)
    disk_used_gb = disk.used / (1024**3)
    disk_percent = disk.percent

    uptime_seconds = psutil.boot_time()
    uptime_hours = int(uptime_seconds / 3600)
    uptime_minutes = int((uptime_seconds % 3600) / 60)

    status_text = (
        f"🖥 **System Status**\n\n"
        f"⚡ **CPU Load:** `{cpu_load}%`\n"
        f"🖥 **Memory:** `{mem_used_gb:.2f} GB / {mem_total_gb:.2f} GB ({mem_percent}%)`\n"
        f"💾 **Disk Usage:** `{disk_used_gb:.2f} GB / {disk_total_gb:.2f} GB ({disk_percent}%)`\n"
        f"⏳ **Uptime:** `{uptime_hours}h {uptime_minutes}m`"
    )
    return status_text

async def menu_status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Displays the server status."""
    query = update.callback_query
    await query.answer("Fetching server status...")

    status_text = await get_server_status()

    await query.edit_message_text(
        text=status_text,
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("← Back", callback_data="main_menu")]])
    )

# --- Placeholder Handlers ---
async def placeholder_menu(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    await query.edit_message_text(
        text=f"This menu ({query.data}) is not yet implemented.",
        reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("← Back", callback_data="main_menu")]])
    )

# --- Bot Application Setup ---
def setup_admin_bot(application: Application):
    log.info("Setting up admin bot handlers...")

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(back_to_main_menu, pattern="^main_menu$"))
    application.add_handler(CallbackQueryHandler(menu_marketstats, pattern="^menu_marketstats$"))
    application.add_handler(CallbackQueryHandler(toggle_market_event, pattern="^toggle_market_"))
    application.add_handler(CallbackQueryHandler(menu_status, pattern="^menu_status$"))

    application.add_handler(CallbackQueryHandler(placeholder_menu, pattern="^menu_(onchain|cex_screen|dex_screen)$"))

    log.info("Admin bot handlers set up successfully.")

async def main():
    if not config.TELEGRAM_BOSS_BOT_TOKEN:
        log.error("TELEGRAM_BOSS_BOT_TOKEN is not set!")
        return

    from pathlib import Path
    config_dir = Path(__file__).parent.parent.parent / 'config'
    config.load_configuration(config_dir)
    config.validate_configuration()

    application = Application.builder().token(config.TELEGRAM_BOSS_BOT_TOKEN).build()
    setup_admin_bot(application)

    log.info("Starting admin bot...")
    await application.run_polling()

if __name__ == '__main__':
    asyncio.run(main())
