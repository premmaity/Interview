import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.core.security import (
    hash_password,
    hash_token,
    new_opaque_token,
    tokens_equal,
    validate_password_strength,
    verify_password,
)


def test_argon2_uses_a_unique_salt() -> None:
    first = hash_password("Correct-Horse-42")
    second = hash_password("Correct-Horse-42")
    assert first != second
    assert first.startswith("$argon2id$")
    assert verify_password("Correct-Horse-42", first)
    assert not verify_password("incorrect", first)
    assert not verify_password("anything", "not-an-argon-hash")


def test_opaque_tokens_are_high_entropy_and_hashed() -> None:
    first = new_opaque_token()
    second = new_opaque_token()
    assert len(first) >= 48
    assert first != second
    assert hash_token(first) != first
    assert tokens_equal(hash_token(first), hash_token(first))
    assert not tokens_equal(hash_token(first), hash_token(second))


@pytest.mark.parametrize("password", ["short", "alllowercaseonly", "1234567890123456"])
def test_weak_passwords_are_rejected(password: str) -> None:
    with pytest.raises(ValueError):
        validate_password_strength(password)


def test_reasonable_passphrase_is_accepted() -> None:
    validate_password_strength("correct horse battery staple 42")


def test_cross_site_cookies_must_be_secure() -> None:
    with pytest.raises(ValidationError, match="SameSite=None requires secure cookies"):
        Settings(cookie_samesite="none", cookie_secure=False)

    settings = Settings(cookie_samesite="none", cookie_secure=True)
    assert settings.cookie_samesite == "none"
