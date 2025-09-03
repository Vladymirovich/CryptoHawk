import asyncio
import threading
from telegram.ext import Application

from src.logger import get_logger
from src import config
from src.web_server import app as fastapi_app
from src.bots import admin_bot, cex_bot, market_stats_bot

import uvicorn

log = get_logger(__name__)

async def run_bot(token: str, setup_func):
    """Generic function to run a bot."""
    if not token:
        log.error(f"Token for {setup_func.__name__} is not configured. Skipping.")
        return

    log.info(f"Starting bot for {setup_func.__name__}...")
    application = Application.builder().token(token).build()
    setup_func(application)

    try:
        await application.initialize()
        await application.start()
        await application.updater.start_polling()
        log.info(f"Bot {setup_func.__name__} started successfully.")
    except Exception as e:
        log.error(f"Error starting bot {setup_func.__name__}: {e}", exc_info=True)


def run_fastapi_server():
    """Function to run the FastAPI server in a separate thread."""
    log.info(f"Starting FastAPI server on port {config.WEBHOOK_PORT}")
    uvicorn.run(fastapi_app, host="0.0.0.0", port=config.WEBHOOK_PORT)


async def main():
    """
    Main entrypoint to launch all bots and the web server.
    """
    log.info("🚀 Starting CryptoHawk project (Python Version)...")

    # Load and validate configuration first
    from pathlib import Path
    config_dir = Path(__file__).parent / 'config'
    config.load_configuration(config_dir)

    try:
        config.validate_configuration()
    except ValueError as e:
        log.critical(f"Configuration error: {e}")
        return

    # Run FastAPI server in a separate thread
    server_thread = threading.Thread(target=run_fastapi_server, daemon=True)
    server_thread.start()

    # Gather all bot tasks
    bot_tasks = [
        run_bot(config.TELEGRAM_BOSS_BOT_TOKEN, admin_bot.setup_admin_bot),
        run_bot(config.TELEGRAM_CEX_BOT_TOKEN, cex_bot.setup_cex_bot),
        run_bot(config.TELEGRAM_MARKET_BOT_TOKEN, market_stats_bot.setup_market_stats_bot),
    ]

    await asyncio.gather(*bot_tasks)

    # Keep the main thread alive (the bots are running in the asyncio event loop)
    # The server thread is a daemon, so it won't block exit.
    # The polling updaters will keep the asyncio loop running.
    while True:
        await asyncio.sleep(60)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log.info("Shutting down CryptoHawk project...")
    except Exception as e:
        log.critical(f"A critical error occurred in main: {e}", exc_info=True)
