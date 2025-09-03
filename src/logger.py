import logging
import sys

def get_logger(name: str) -> logging.Logger:
    """
    Configures and returns a logger.
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    # Create handlers
    stream_handler = logging.StreamHandler(sys.stdout)

    # Create formatters and add it to handlers
    log_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    stream_handler.setFormatter(log_format)

    # Add handlers to the logger
    if not logger.handlers:
        logger.addHandler(stream_handler)

    return logger

# A default logger for simple scripts or testing
log = get_logger(__name__)
log.info("Logger initialized.")
