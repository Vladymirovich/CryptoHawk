import pytest
from src import config

@pytest.fixture(autouse=True)
def reset_config_module():
    """
    Fixture to reset the state of the config module before each test.
    This prevents state from leaking between tests.
    """
    config.TELEGRAM_BOSS_BOT_TOKEN = None
    config.TELEGRAM_MARKET_BOT_TOKEN = None
    config.TELEGRAM_CEX_BOT_TOKEN = None
    config.WEBHOOK_PORT = 3000
    config.ADMIN_LIST = []
    yield

def test_config_loading(tmp_path):
    """
    Tests if the config module correctly loads variables from a mock config directory.
    """
    # 1. Create mock config files in a temporary directory
    config_dir = tmp_path / "test_config"
    config_dir.mkdir()

    (config_dir / ".env").write_text(
        "TELEGRAM_BOSS_BOT_TOKEN=test_boss_token\n"
        "TELEGRAM_MARKET_BOT_TOKEN=test_market_token\n"
        "TELEGRAM_CEX_BOT_TOKEN=test_cex_token\n"
        "WEBHOOK_PORT=8080\n"
    )
    (config_dir / "admins.json").write_text('{"admins": [123, 456]}')

    # 2. Call the loading function with the path to the mock directory
    config.load_configuration(config_dir)

    # 3. Assert that the global configuration variables are set correctly
    assert config.TELEGRAM_BOSS_BOT_TOKEN == "test_boss_token"
    assert config.TELEGRAM_MARKET_BOT_TOKEN == "test_market_token"
    assert config.TELEGRAM_CEX_BOT_TOKEN == "test_cex_token"
    assert config.WEBHOOK_PORT == 8080
    assert config.ADMIN_LIST == [123, 456]

def test_missing_env_vars_validation(tmp_path, monkeypatch):
    """
    Tests if the validation function raises a ValueError for missing variables.
    """
    # 1. Create mock config files but without setting env vars
    config_dir = tmp_path / "test_config"
    config_dir.mkdir()
    (config_dir / ".env").write_text("SOME_OTHER_VAR=123")
    (config_dir / "admins.json").write_text('{"admins": []}')

    # 2. Load the configuration
    # Unset the variables from the actual environment to be sure
    monkeypatch.delenv("TELEGRAM_BOSS_BOT_TOKEN", raising=False)
    monkeypatch.delenv("TELEGRAM_MARKET_BOT_TOKEN", raising=False)
    monkeypatch.delenv("TELEGRAM_CEX_BOT_TOKEN", raising=False)

    config.load_configuration(config_dir)

    # 3. Assert that validation fails
    with pytest.raises(ValueError, match="Missing required environment variables"):
        config.validate_configuration()

def test_empty_admins_file(tmp_path):
    """
    Tests that the admin list is empty if the JSON file is empty or malformed.
    """
    config_dir = tmp_path / "test_config"
    config_dir.mkdir()
    (config_dir / ".env").write_text("")
    (config_dir / "admins.json").write_text('{}') # Empty JSON

    config.load_configuration(config_dir)
    assert config.ADMIN_LIST == []
