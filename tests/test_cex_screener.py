import pytest
from src.cex import cex_screener

# --- Test Data ---

@pytest.fixture
def sample_template():
    return {
        "title": "Test Alert: {{event}}",
        "message": "Asset: {{asset}}, Volume: {{volume}}",
        "parameters": ["event", "asset", "volume"]
    }

@pytest.fixture
def sample_event_data():
    return {
        "event": "Large Transfer",
        "asset": "BTC",
        "volume": 1000
    }

# --- Tests for apply_template ---

def test_apply_template_success(sample_template, sample_event_data):
    """
    Tests that the template is applied correctly when all data is present.
    """
    expected_message = (
        "Test Alert: Large Transfer\n\n"
        "Asset: BTC, Volume: 1000"
    )
    result = cex_screener.apply_template(sample_template, sample_event_data)
    assert result == expected_message

def test_apply_template_missing_data(sample_template, sample_event_data):
    """
    Tests that missing parameters are replaced with 'N/A'.
    """
    del sample_event_data['volume']
    expected_message = (
        "Test Alert: Large Transfer\n\n"
        "Asset: BTC, Volume: N/A"
    )
    result = cex_screener.apply_template(sample_template, sample_event_data)
    assert result == expected_message

def test_apply_template_no_template_obj():
    """
    Tests that a JSON string is returned when the template object is None.
    """
    event_data = {"event": "test", "data": 123}
    result = cex_screener.apply_template(None, event_data)
    assert '"event": "test"' in result
    assert '"data": 123' in result

# --- Tests for Filtering Logic ---

def test_evaluate_generic():
    """
    Tests the generic filter function.
    """
    assert cex_screener.evaluate_generic({}, {"active": True}) == True
    assert cex_screener.evaluate_generic({}, {"active": False}) == False
    assert cex_screener.evaluate_generic({}, {}) == False # Should be inactive by default

def test_evaluate_flow_alerts():
    """
    Tests the placeholder filter for flow alerts.
    """
    assert cex_screener.evaluate_flow_alerts({}, {"active": True}) == True
    assert cex_screener.evaluate_flow_alerts({}, {"active": False}) == False

# --- Tests for process_cex_event (Async) ---

@pytest.mark.asyncio
async def test_process_cex_event_puts_on_queue(monkeypatch):
    """
    Tests that a successful event processing puts a message on the notification queue.
    """
    # Mock the templates
    monkeypatch.setattr(cex_screener, 'TEMPLATES', {
        'test_category': {
            "title": "Title",
            "message": "Message for {{asset}}",
            "parameters": ["asset"]
        }
    })

    # Mock the evaluation map to include our test category
    monkeypatch.setitem(cex_screener.EVALUATION_MAP, 'test_category', lambda data, settings: True)

    user_filters = {
        'test_category': {'active': True}
    }

    event_data = {
        'category': 'test_category',
        'asset': 'ETH',
        'event': 'Test Event'
    }

    # Clear the queue before the test
    while not cex_screener.notification_queue.empty():
        cex_screener.notification_queue.get_nowait()

    await cex_screener.process_cex_event(event_data, user_filters)

    # Check if the message is on the queue
    assert not cex_screener.notification_queue.empty()
    notification = await cex_screener.notification_queue.get()

    expected_message = "Title\n\nMessage for ETH"
    assert notification == expected_message


@pytest.mark.asyncio
async def test_process_cex_event_filtered_out(monkeypatch):
    """
    Tests that a filtered event does not put a message on the queue.
    """
    # Mock the evaluation map to use a simple filter
    monkeypatch.setitem(cex_screener.EVALUATION_MAP, 'test_category', cex_screener.evaluate_generic)

    user_filters = {
        'test_category': {'active': False} # Event is inactive
    }

    event_data = {
        'category': 'test_category',
        'asset': 'ETH',
        'event': 'Test Event'
    }

    # Clear the queue before the test
    while not cex_screener.notification_queue.empty():
        cex_screener.notification_queue.get_nowait()

    await cex_screener.process_cex_event(event_data, user_filters)

    # Check that the queue is still empty
    assert cex_screener.notification_queue.empty()
