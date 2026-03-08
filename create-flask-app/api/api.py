import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

# Load .env from api folder (bypasses python-dotenv parsing issues on some setups)
_env_dir = Path(__file__).resolve().parent
_env_file = _env_dir / ".env"
load_dotenv(dotenv_path=_env_file)
if not os.getenv("SUPABASE_URL") and _env_file.exists():
    with open(_env_file, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                key, val = key.strip(), val.strip().strip("'\"").strip()
                if key and val:
                    os.environ.setdefault(key, val)

if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env. "
        f"Checked: {_env_file}"
    )

import ledger_repo


BLOOD_LEDGER_TABLE = os.getenv("BLOOD_LEDGER_TABLE", "blood_events")
PLASMA_LEDGER_TABLE = os.getenv("PLASMA_LEDGER_TABLE", "plasma_events")


def create_app():
    app = Flask(__name__)
    CORS(app)  # <-- this is required

    blood_inventory = {
        "A+": 100,
        "A-": 100,
        "B+": 100,
        "B-": 100,
        "AB+": 100,
        "AB-": 100,
        "O+": 100,
        "O-": 100
    }

    plasma_inventory = {"A": 100, "B": 100, "AB": 100, "O": 100}

    @app.route("/")
    def home():
        return "Hello from Flask!"

    @app.route("/api/withdraw", methods=["POST"])
    def withdraw():
        data = request.get_json() or {}
        blood_type = data.get("bloodType", "")
        rh_factor = data.get("rhFactor", "")
        amount = data.get("amount", 0)

        full_type = f"{blood_type}{rh_factor}"

        # Basic validation
        try:
            amount_int = int(amount)
        except (TypeError, ValueError):
            return jsonify({"ok": False, "error": "Amount must be an integer"}), 400

        if amount_int <= 0:
            return jsonify({"ok": False, "error": "Amount must be positive"}), 400

        if not blood_type or not rh_factor or full_type not in blood_inventory:
            return jsonify({"ok": False, "error": "Invalid blood type or Rh factor"}), 400

        # Update in-memory inventory
        blood_inventory[full_type] = max(0, blood_inventory[full_type] - amount_int)

        # Record in Supabase ledger
        ledger_repo.insert_event(
            BLOOD_LEDGER_TABLE,
            "withdraw",
            full_type,
            amount_int,
        )

        return jsonify(
            {
                "ok": True,
                "action": "withdraw",
                "bloodType": blood_type,
                "rhFactor": rh_factor,
                "amount": amount_int,
            }
        )

    @app.route("/api/deposit", methods=["POST"])
    def deposit():
        data = request.get_json() or {}
        blood_type = data.get("bloodType", "")
        rh_factor = data.get("rhFactor", "")
        amount = data.get("amount", 0)

        full_type = f"{blood_type}{rh_factor}"

        # Basic validation
        try:
            amount_int = int(amount)
        except (TypeError, ValueError):
            return jsonify({"ok": False, "error": "Amount must be an integer"}), 400

        if amount_int <= 0:
            return jsonify({"ok": False, "error": "Amount must be positive"}), 400

        if not blood_type or not rh_factor or full_type not in blood_inventory:
            return jsonify({"ok": False, "error": "Invalid blood type or Rh factor"}), 400

        # Update in-memory inventory
        blood_inventory[full_type] += amount_int

        # Record in Supabase ledger
        ledger_repo.insert_event(
            BLOOD_LEDGER_TABLE,
            "deposit",
            full_type,
            amount_int,
        )

        return jsonify(
            {
                "ok": True,
                "action": "deposit",
                "bloodType": blood_type,
                "rhFactor": rh_factor,
                "amount": amount_int,
            }
        )

    @app.route("/api/plasma/withdraw", methods=["POST"])
    def plasma_withdraw():
        data = request.get_json() or {}
        blood_type = data.get("bloodType", "")
        amount = data.get("amount", 0)

        # Basic validation
        try:
            amount_int = int(amount)
        except (TypeError, ValueError):
            return jsonify({"ok": False, "error": "Amount must be an integer"}), 400

        if amount_int <= 0:
            return jsonify({"ok": False, "error": "Amount must be positive"}), 400

        if blood_type not in plasma_inventory:
            return jsonify({"ok": False, "error": "Invalid plasma blood type"}), 400

        plasma_inventory[blood_type] = max(
            0, plasma_inventory[blood_type] - amount_int
        )

        # Record in Supabase ledger
        ledger_repo.insert_event(
            PLASMA_LEDGER_TABLE,
            "withdraw",
            blood_type,
            amount_int,
        )

        return jsonify(
            {
                "ok": True,
                "action": "plasma_withdraw",
                "bloodType": blood_type,
                "amount": amount_int,
            }
        )

    @app.route("/api/plasma/deposit", methods=["POST"])
    def plasma_deposit():
        data = request.get_json() or {}
        blood_type = data.get("bloodType", "")
        amount = data.get("amount", 0)

        # Basic validation
        try:
            amount_int = int(amount)
        except (TypeError, ValueError):
            return jsonify({"ok": False, "error": "Amount must be an integer"}), 400

        if amount_int <= 0:
            return jsonify({"ok": False, "error": "Amount must be positive"}), 400

        if blood_type not in plasma_inventory:
            return jsonify({"ok": False, "error": "Invalid plasma blood type"}), 400

        plasma_inventory[blood_type] += amount_int

        # Record in Supabase ledger
        ledger_repo.insert_event(
            PLASMA_LEDGER_TABLE,
            "deposit",
            blood_type,
            amount_int,
        )

        return jsonify(
            {
                "ok": True,
                "action": "plasma_deposit",
                "bloodType": blood_type,
                "amount": amount_int,
            }
        )

    @app.route("/api/inventory/blood", methods=["GET"])
    def blood_inventory_view():
        balances = ledger_repo.get_balance_by_blood_type(BLOOD_LEDGER_TABLE)
        return jsonify(balances)

    @app.route("/api/inventory/plasma", methods=["GET"])
    def plasma_inventory_view():
        balances = ledger_repo.get_balance_by_blood_type(PLASMA_LEDGER_TABLE)
        return jsonify(balances)

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)