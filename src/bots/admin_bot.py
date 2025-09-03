import asyncio
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, ContextTypes

from .. import config
from ..logger import get_logger

log = get_logger(__name__)

# --- Authorization Middleware ---
class AdminFilter(filters.BaseFilter):
    def filter(self, message: Update) -> bool:
        user_id = message.from_user.id if message.from_user else None
        return user_id is not None and user_id in config.ADMIN_LIST

admin_filter = AdminFilter()

# --- Main Menu ---
def get_main_menu_keyboard():
    keyboard = [
        [InlineKeyboardButton("MarketStats", callback_data="menu_marketstats"), InlineKeyboardButton("OnChain", callback_data="menu_onchain")],
        [InlineKeyboardButton("CEX Screen", callback_data="menu_cex_screen"), InlineKeyboardButton("DEX Screen", callback_data="menu_dex_screen")],
        [InlineKeyboardButton("News", callback_data="menu_news"), InlineKeyboardButton("Trends", callback_data="menu_trends")],
        [InlineKeyboardButton("Activate Bots", callback_data="menu_activate_bots"), InlineKeyboardButton("Status", callback_data="menu_status")]
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

# --- Placeholder Handlers for Sub-menus ---
async def placeholder_menu(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """A placeholder for unimplemented menus."""
    query = update.callback_query
    await query.answer()
    await query.edit_message_text(
        text=f"This menu ({query.data}) is not yet implemented in the Python version.",
        reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("← Back", callback_data="main_menu")]])
    )

# --- Bot Application Setup ---
def setup_admin_bot(application: Application):
    """Adds all the handlers to the bot application."""
    log.info("Setting up admin bot handlers...")

    # Command Handlers
    application.add_handler(CommandHandler("start", start))

    # Callback Query Handlers
    application.add_handler(CallbackQueryHandler(back_to_main_menu, pattern="^main_menu$"))
    # Placeholders for all other menus
    application.add_handler(CallbackQueryHandler(placeholder_menu, pattern="^menu_"))

    log.info("Admin bot handlers set up successfully.")

async def main():
    """Main function to run the bot."""
    if not config.TELEGRAM_BOSS_BOT_TOKEN:
        log.error("TELEGRAM_BOSS_BOT_TOKEN is not set!")
        return

    application = Application.builder().token(config.TELEGRAM_BOSS_BOT_TOKEN).build()
    setup_admin_bot(application)

    log.info("Starting admin bot...")
    await application.run_polling()

if __name__ == '__main__':
    # This allows running the bot directly for testing
    asyncio.run(main())
