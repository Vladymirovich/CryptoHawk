import httpx
from ..config import COINMARKETCAP_API_KEY
from ..logger import get_logger

log = get_logger(__name__)

BASE_URL = "https://pro-api.coinmarketcap.com"

class CoinMarketCapAPI:
    def __init__(self, api_key: str = COINMARKETCAP_API_KEY):
        if not api_key:
            raise ValueError("CoinMarketCap API key is required.")
        self._headers = {
            'Accepts': 'application/json',
            'X-CMC_PRO_API_KEY': api_key,
        }

    async def _request(self, endpoint: str, params: dict = None):
        """
        Makes an asynchronous request to the CoinMarketCap API.
        """
        url = f"{BASE_URL}{endpoint}"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=self._headers, params=params)
                response.raise_for_status()  # Raises an exception for 4XX/5XX responses
                return response.json()
        except httpx.HTTPStatusError as e:
            log.error("HTTP error occurred: %s - %s", e.response.status_code, e.response.text)
            return None
        except httpx.RequestError as e:
            log.error("An error occurred while requesting %s: %s", e.request.url, e)
            return None

    async def get_fear_and_greed_index(self):
        """
        Fetches the Fear and Greed Index.
        Note: The official CoinMarketCap API does not have a public endpoint for the F&G index.
        This is a placeholder for what was likely a custom or scraped endpoint.
        The original JS file was cmc_fear_greed.js.
        A common public source is from alternative.me.
        """
        log.warning("The official CoinMarketCap API does not provide a Fear & Greed Index.")
        # As a fallback, we can use the alternative.me API
        alternative_url = "https://api.alternative.me/fng/?limit=1"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(alternative_url)
                response.raise_for_status()
                data = response.json()
                return data.get('data', [{}])[0]
        except Exception as e:
            log.error("Could not fetch Fear & Greed index from alternative.me: %s", e)
            return None

    async def get_altcoin_season_index(self):
        """
        Fetches the Altcoin Season Index.
        Note: This is also not a standard endpoint in the public CoinMarketCap API.
        The original JS file was cmc_altcoin_season.js.
        This is likely a custom calculation or from another source.
        """
        log.warning("The official CoinMarketCap API does not provide an Altcoin Season Index.")
        # Placeholder implementation
        return {"altcoin_season": "N/A - Endpoint not available"}

    async def get_market_cap(self):
        """
        Fetches the global cryptocurrency market cap.
        """
        endpoint = "/v1/global-metrics/quotes/latest"
        data = await self._request(endpoint)
        if data and 'data' in data:
            return data['data'].get('quote', {}).get('USD', {})
        return None

# Example usage (for testing)
if __name__ == '__main__':
    import asyncio

    async def main():
        api = CoinMarketCapAPI()

        print("--- Fear & Greed Index ---")
        fg_index = await api.get_fear_and_greed_index()
        print(fg_index)

        print("\n--- Altcoin Season Index ---")
        alt_season = await api.get_altcoin_season_index()
        print(alt_season)

        print("\n--- Global Market Cap ---")
        market_cap = await api.get_market_cap()
        if market_cap:
            print(f"Total Market Cap: ${market_cap.get('total_market_cap'):,.2f}")
            print(f"BTC Dominance: {market_cap.get('btc_dominance'):.2f}%")

    asyncio.run(main())
