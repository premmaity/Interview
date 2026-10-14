from app.worker import retry_delay_seconds


def test_worker_retry_delay_is_bounded_exponential() -> None:
    assert [retry_delay_seconds(attempt) for attempt in range(5)] == [5, 10, 20, 40, 60]
    assert retry_delay_seconds(-1) == 5
