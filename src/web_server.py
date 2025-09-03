from fastapi import FastAPI
from .logger import get_logger

log = get_logger(__name__)

app = FastAPI(
    title="CryptoHawk API",
    description="Backend server for CryptoHawk bots.",
    version="1.0.0-python"
)

@app.get("/")
async def root():
    """
    Root endpoint to check if the server is running.
    """
    log.info("Root endpoint was hit.")
    return {"message": "CryptoHawk bots are running."}

@app.get("/api/endpoints")
async def get_api_endpoints():
    """
    Provides a list of available API endpoints.
    Placeholder based on admin bot functionality.
    """
    # In a real app, this could be dynamically generated
    return [
        {"path": "/", "description": "Server status"},
        {"path": "/api/endpoints", "description": "List of API endpoints"},
        {"path": "/api/webhooks", "description": "List of connected webhooks"},
    ]

@app.get("/api/webhooks")
async def get_webhooks():
    """
    Provides a list of connected webhooks.
    Placeholder based on admin bot functionality.
    """
    # In a real app, this would be a list of active webhook connections
    return [
        {"bot": "CEX Bot", "status": "connected"},
        {"bot": "MarketStats Bot", "status": "connected"},
        {"bot": "Admin Bot", "status": "connected"},
    ]

def start_server(port: int):
    """
    A function to start the Uvicorn server programmatically.
    This will be called from the main entrypoint.
    """
    import uvicorn
    log.info("Starting FastAPI server on port %d", port)
    uvicorn.run(app, host="0.0.0.0", port=port)

if __name__ == "__main__":
    # This allows running the server directly for testing
    start_server(8000)
