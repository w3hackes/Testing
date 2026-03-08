import os
from pathlib import Path
from typing import Dict, Any

import requests
from dotenv import load_dotenv

# Load .env from the api folder so it works regardless of cwd
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")


def _get_supabase_config() -> Dict[str, str]:
    """
    Read Supabase HTTP configuration from environment.
    Requires:
      - SUPABASE_URL
      - SUPABASE_SERVICE_ROLE_KEY
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment."
        )

    return {"url": url.rstrip("/"), "key": key}


def _headers(service_role_key: str) -> Dict[str, str]:
    return {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def insert_event(
    table: str, action_type: str, blood_type: str, milliliters: int
) -> Any:
    """
    Insert a single ledger event row into the given table via Supabase REST.
    """
    cfg = _get_supabase_config()
    url = f"{cfg['url']}/rest/v1/{table}"

    payload = {
        "action_type": action_type,
        "blood_type": blood_type,
        "milliliters": int(milliliters),
    }

    response = requests.post(
        url, headers=_headers(cfg["key"]), json=payload, timeout=10
    )
    response.raise_for_status()
    return response.json()


def get_balance_by_blood_type(table: str) -> Dict[str, int]:
    """
    Compute net balance per blood_type from all ledger events in the table.

    Balance = sum(deposit milliliters) - sum(withdraw milliliters)
    """
    cfg = _get_supabase_config()
    url = f"{cfg['url']}/rest/v1/{table}"

    params = {
        "select": "action_type,blood_type,milliliters",
    }

    response = requests.get(
        url, headers=_headers(cfg["key"]), params=params, timeout=10
    )
    response.raise_for_status()
    events = response.json()

    balances: Dict[str, int] = {}
    for event in events:
        blood_type = event.get("blood_type")
        if not blood_type:
            continue

        amount = int(event.get("milliliters") or 0)
        action_type = (event.get("action_type") or "").lower()

        if action_type == "deposit":
            delta = amount
        elif action_type == "withdraw":
            delta = -amount
        else:
            # Ignore unknown action types
            continue

        balances[blood_type] = balances.get(blood_type, 0) + delta

    return balances

