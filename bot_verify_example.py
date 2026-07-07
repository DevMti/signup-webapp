"""
bot_verify_example.py — server-side only. NEVER ship this to the browser and
never expose BOT_TOKEN to the client.

Drop-in example of the check Telegram documents for Mini App init data:

  1. Parse `init_data` as a query string and pull out `hash`.
  2. Sort the remaining `key=value` pairs alphabetically by key, join with "\n".
  3. secret_key = HMAC_SHA256(key="WebAppData", msg=bot_token)
  4. Compare hex(HMAC_SHA256(key=secret_key, msg=data_check_string)) to `hash`.
  5. Reject stale `auth_date`.
  6. Confirm the `user.id` inside the signed init data matches the Telegram
     user who actually sent the web_app_data message.
"""

import hashlib
import hmac
import json
import os
import time

from dotenv import load_dotenv
from urllib.parse import parse_qsl

load_dotenv()
BOT_TOKEN = os.getenv("BOT_TOKEN", "123456789:ABCDEF")  # replace with your bot token in .env file
MAX_AGE_SECONDS = 24 * 60 * 60       # freshness window for auth_date


class InitDataError(Exception):
    """Raised when init data is missing, forged, or stale."""


def verify_init_data(init_data: str, bot_token: str = BOT_TOKEN) -> dict:
    """Return the parsed, verified init data, or raise InitDataError."""
    if not init_data:
        raise InitDataError("empty init data")

    # strict_parsing keeps malformed input from silently becoming an empty dict.
    pairs = dict(parse_qsl(init_data, strict_parsing=True))

    received_hash = pairs.pop("hash", None)
    if not received_hash:
        raise InitDataError("missing hash")

    # Step 2 — data-check-string: remaining pairs, sorted by key, joined by \n.
    data_check_string = "\n".join(f"{k}={pairs[k]}" for k in sorted(pairs))

    # Step 3 — the secret key is an HMAC of the bot token, keyed with "WebAppData".
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()

    # Step 4 — constant-time comparison.
    expected_hash = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_hash, received_hash):
        raise InitDataError("signature mismatch")

    # Step 5 — reject replayed / stale init data.
    auth_date = int(pairs.get("auth_date", "0"))
    if auth_date <= 0 or time.time() - auth_date > MAX_AGE_SECONDS:
        raise InitDataError("init data expired")

    if "user" in pairs:
        pairs["user"] = json.loads(pairs["user"])

    return pairs


def handle_web_app_data(message) -> dict:
    """
    Handle the `web_app_data` service message produced by Telegram.WebApp.sendData().

    `message` is whatever your framework gives you (aiogram, python-telegram-bot,
    raw Bot API update...). Only two things matter here:
      - message.from_user.id : the authoritative sender, set by Telegram itself.
      - message.web_app_data.data : the JSON string the Mini App sent.
    """
    payload = json.loads(message.web_app_data.data)

    # Step 6 — the signed init data must describe the same person who sent it.
    verified = verify_init_data(payload.get("init_data", ""))
    verified_user_id = verified["user"]["id"]
    sender_id = message.from_user.id

    if verified_user_id != sender_id:
        raise InitDataError(
            f"identity mismatch: init data says {verified_user_id}, sender is {sender_id}"
        )

    # `user_id` in the payload is client-supplied, so treat it as a hint only.
    if payload.get("user_id") not in (None, sender_id):
        raise InitDataError("client-reported user_id does not match the sender")

    # Validate the form values again server-side — the client checks are UX only.
    if not isinstance(payload.get("age"), int) or not 18 <= payload["age"] <= 120:
        raise InitDataError("age out of range")
    if not payload.get("tos_accepted"):
        raise InitDataError("terms not accepted")

    return {
        "user_id": sender_id,
        "name": payload["name"],
        "age": payload["age"],
        "gender": payload["gender"],
        "preference": payload["preference"],
        "bio": payload.get("bio", ""),
        "country": payload["country"],
        "city": payload["city"],
        "tos_accepted": True,
    }
