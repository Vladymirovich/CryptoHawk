import json
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional

from ..logger import get_logger

log = get_logger(__name__)

# --- Event Bus ---
# An asyncio.Queue can serve as a simple, in-memory event bus.
# The CEX bot will listen to this queue for notifications.
notification_queue = asyncio.Queue()

# --- Template Loading ---
def load_templates() -> Dict[str, Any]:
    """Loads notification templates from templates.json."""
    # Assuming the templates.json will be placed in the same directory.
    templates_path = Path(__file__).parent / 'templates.json'
    try:
        with open(templates_path, 'r') as f:
            templates = json.load(f)
            log.info("CEX templates loaded successfully.")
            return templates
    except FileNotFoundError:
        log.error("CEX templates.json not found at %s", templates_path)
    except json.JSONDecodeError:
        log.error("Error decoding CEX templates.json.")
    return {}

TEMPLATES = load_templates()

def apply_template(template_obj: Dict[str, Any], data: Dict[str, Any]) -> str:
    """
    Applies data to a notification template.
    """
    if not template_obj:
        return f"CEX Event (no template): {json.dumps(data, indent=2)}"

    message = f"{template_obj.get('title', '')}\n\n{template_obj.get('message', '')}"

    # Replace placeholders like {{param}}
    for param in template_obj.get('parameters', []):
        value = data.get(param, 'N/A')
        message = message.replace(f"{{{{{param}}}}}", str(value))

    return message

# --- Event Filtering Logic ---
# These functions replicate the logic from the original CEXScreen.js file.
# For now, they are simplified placeholders.

def evaluate_flow_alerts(event_data: Dict[str, Any], settings: Dict[str, Any]) -> bool:
    """Filter logic for Flow Alerts."""
    if not settings.get('active', False):
        return False
    # Add more complex filter logic here based on favorite/unwanted coins etc.
    return True

def evaluate_cex_tracking(event_data: Dict[str, Any], settings: Dict[str, Any]) -> bool:
    """Filter logic for CEX Tracking."""
    if not settings.get('active', False):
        return False
    # Add more complex filter logic here
    return True

def evaluate_generic(event_data: Dict[str, Any], settings: Dict[str, Any]) -> bool:
    """Generic filter for simple 'active'/'inactive' categories."""
    return settings.get('active', False)

EVALUATION_MAP = {
    'flow_alerts': evaluate_flow_alerts,
    'cex_tracking': evaluate_cex_tracking,
    'all_spot': evaluate_generic,
    'all_derivatives': evaluate_generic,
    'all_spot_percent': evaluate_generic,
    'all_derivatives_percent': evaluate_generic,
}

# --- Main Event Processing ---
async def process_cex_event(event_data: Dict[str, Any], user_filters: Dict[str, Any]):
    """
    Processes a CEX event, filters it, and puts a formatted notification on the queue.
    """
    category = event_data.get('category')
    if not category:
        log.error("CEX event received with missing category!")
        return

    eval_func = EVALUATION_MAP.get(category)
    if not eval_func:
        log.warning("Unknown CEX event category '%s'. Event skipped.", category)
        return

    settings = user_filters.get(category, {})
    if not eval_func(event_data, settings):
        log.info("CEX event did not pass filters for category '%s'.", category)
        return

    template_obj = TEMPLATES.get(category)
    notification_message = apply_template(template_obj, event_data)

    # Put the formatted message on the queue for the CEX bot to pick up.
    await notification_queue.put(notification_message)
    log.info("Notification for CEX event '%s' emitted.", event_data.get('event', 'N/A'))

# Note: The `templates.json` file needs to be created in this directory
# for the template loading to work. I will do that in a subsequent step.
