import asyncio
from typing import Dict, Any, List, Optional, Set
from telegram.ext import Application

from .. import config
from ..logger import get_logger
from ..api.coinmarketcap import CoinMarketCapAPI

log = get_logger(__name__)

# --- In-Memory Cache ---
market_data_cache: Dict[str, Any] = {}

# --- Poller Task Management ---
_poller_task: Optional[asyncio.Task] = None
_notification_bot_app: Optional[Application] = None
_subscribers: Set[int] = set()

# --- API Instance ---
cmc_api = CoinMarketCapAPI()

def set_notification_bot(application: Application, subscribers: Set[int]):
    """Sets the bot application instance and subscribers for sending notifications."""
    global _notification_bot_app, _subscribers
    _notification_bot_app = application
    _subscribers = subscribers
    log.info("Notification bot and subscribers have been set for the MarketStats poller.")

async def _send_notifications(event_name: str, data: Dict[str, Any]):
    """Formats and sends a notification message to all subscribers."""
    if not _notification_bot_app:
        log.warning("Cannot send notifications, bot application not set.")
        return
    if not _subscribers:
        log.info("No subscribers to send notifications to for event '%s'.", event_name)
        return

    message = f"🔔 **Market Update: {event_name.replace('_', ' ').title()}** 🔔\n\n"

    if event_name == "crypto_market_cap" and 'total_market_cap' in data:
        message += f"Total Market Cap: `${data['total_market_cap']:,.2f}`\n"
        message += f"BTC Dominance: `{data['btc_dominance']:.2f}%`"
    elif event_name == "cmc_fear_greed" and 'value_classification' in data:
        message += f"Index Value: `{data['value']}`\n"
        message += f"Sentiment: `{data['value_classification']}`"
    else:
        # Generic fallback
        message += f"```json\n{data}\n```"

    # Send message to all subscribers concurrently
    notification_tasks = []
    for chat_id in _subscribers:
        task = _notification_bot_app.bot.send_message(
            chat_id=chat_id,
            text=message,
            parse_mode='Markdown'
        )
        notification_tasks.append(task)

    results = await asyncio.gather(*notification_tasks, return_exceptions=True)

    for i, result in enumerate(results):
        chat_id = list(_subscribers)[i]
        if isinstance(result, Exception):
            log.error("Failed to send notification for '%s' to chat %d: %s", event_name, chat_id, result)
        else:
            log.info("Sent notification for '%s' to chat %d", event_name, chat_id)


async def _fetch_market_cap():
    """Fetches, caches, and notifies for market cap data."""
    log.info("Fetching market cap data...")
    data = await cmc_api.get_market_cap()
    if data:
        market_data_cache['market_cap'] = data
        log.info("Market cap data updated.")
        await _send_notifications("crypto_market_cap", data)

async def _fetch_fear_and_greed():
    """Fetches, caches, and notifies for the Fear & Greed index."""
    log.info("Fetching Fear & Greed Index...")
    data = await cmc_api.get_fear_and_greed_index()
    if data:
        market_data_cache['fear_and_greed'] = data
        log.info("Fear & Greed Index updated.")
        await _send_notifications("cmc_fear_greed", data)

EVENT_FETCH_MAP = {
    "crypto_market_cap": _fetch_market_cap,
    "cmc_fear_greed": _fetch_fear_and_greed,
}

async def _poller_loop(active_events: List[str], interval_seconds: int):
    """The main loop for the poller task."""
    log.info("Poller loop started with active events: %s", active_events)
    while True:
        for event in active_events:
            fetch_func = EVENT_FETCH_MAP.get(event)
            if fetch_func:
                try:
                    await fetch_func()
                except Exception as e:
                    log.error("Error fetching data for event '%s': %s", event, e)
            else:
                log.warning("No fetch function found for event '%s'", event)

        log.info("Poller loop finished a cycle. Waiting for %d seconds.", interval_seconds)
        await asyncio.sleep(interval_seconds)

def start_poller(active_events: List[str], interval_seconds: int = 300):
    """
    Starts the market data poller. If it's already running, it restarts it.
    """
    global _poller_task
    if _poller_task and not _poller_task.done():
        log.info("Poller is already running. Stopping it before restarting.")
        _poller_task.cancel()

    if not active_events:
        log.info("No active events. Poller will not be started.")
        _poller_task = None
        return

    log.info("Starting poller with events: %s", active_events)
    _poller_task = asyncio.create_task(_poller_loop(active_events, interval_seconds))

def stop_poller():
    """Stops the market data poller."""
    global _poller_task
    if _poller_task and not _poller_task.done():
        log.info("Stopping the poller task.")
        _poller_task.cancel()
        _poller_task = None
    else:
        log.info("Poller is not running.")
