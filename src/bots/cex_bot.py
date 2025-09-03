import asyncio
from telegram.ext import Application, CommandHandler
from .. import config
from ..logger import get_logger

log = get_logger(__name__)

async def start(update, context):
    """A placeholder start command for the CEX bot."""
    await update.message.reply_text("🚀 Welcome to CryptoHawk CEX Bot (Python Version)!")

def setup_cex_bot(application: Application):
    """Adds handlers to the CEX bot application."""
    log.info("Setting up CEX bot handlers...")
    application.add_handler(CommandHandler("start", start))
    log.info("CEX bot handlers set up successfully.")

async def main():
    """Main function to run the bot."""
    if not config.TELEGRAM_CEX_BOT_TOKEN:
        log.error("TELEGRAM_CEX_BOT_TOKEN is not set!")
        return

    application = Application.builder().token(config.TELEGRAM_CEX_BOT_TOKEN).build()
    setup_cex_bot(application)

    log.info("Starting CEX bot...")
    await application.run_polling()

if __name__ == '__main__':
    asyncio.run(main())
