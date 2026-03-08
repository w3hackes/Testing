import logging
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
    CORS(app)

    blood_inventory = {
        "A+":  100,
        "A-":  100,
        "B+":  100,
        "B-":  100,
        "AB+": 100,
        "AB-": 100,
        "O+":  100,
        "O-":  100,
    }

    plasma_inventory = {"A": 100, "B": 100, "AB": 100, "O": 100}

    # Who a patient of each type can receive FROM
    COMPATIBILITY = {
        "O-":  ["O-"],
        "O+":  ["O+",  "O-"],
        "A-":  ["A-",  "O-"],
        "A+":  ["A+",  "A-",  "O+",  "O-"],
        "B-":  ["B-",  "O-"],
        "B+":  ["B+",  "B-",  "O+",  "O-"],
        "AB-": ["AB-", "A-",  "B-",  "O-"],
        "AB+": ["AB+", "AB-", "A+",  "A-",  "B+",  "B-",  "O+",  "O-"],
    }

    # Approximate US population frequencies (%)
    # Used to compute scarcity: rarer blood = higher score = protect it more
    POPULATION_FREQ = {
        "O+":  37.4, "O-":  6.6,
        "A+":  35.7, "A-":  6.3,
        "B+":   8.5, "B-":  1.5,
        "AB+":  3.4, "AB-": 0.6,
    }

    # Scarcity score = 1 / frequency  ->  higher means rarer, spend last
    SCARCITY = {t: 1.0 / f for t, f in POPULATION_FREQ.items()}

    # ── Core optimisation function ──────────────────────────────────────────
    def send_type(btype, amount_int):
        # Sync real balances from Supabase
        real_balances = ledger_repo.get_balance_by_blood_type(BLOOD_LEDGER_TABLE)
        print(f"[supabase balances] {real_balances}")
        blood_inventory.update(real_balances)

        donors = COMPATIBILITY[btype]

        print(f"[send_type] btype={btype} amount={amount_int}")
        print(f"[send_type] blood_inventory at call time: { {d: blood_inventory[d] for d in donors} }")

        # Guard: enough total compatible supply?
        total_available = sum(blood_inventory[d] for d in donors)
        if total_available < amount_int:
            return {
                "ok": False,
                "error": "Not enough compatible blood available",
                "available": int(total_available),
            }

        # ── Ratio-based allocation ──
        # Invert scarcity so COMMON blood gets a HIGHER share weight
        # exact match gets a bonus multiplier to still prefer it first
        EXACT_MATCH_BONUS = 3.0

        weights = {}
        for d in donors:
            inv_scarcity = 1.0 / SCARCITY[d]  # = POPULATION_FREQ[d], higher = more common
            if d == btype:
                inv_scarcity *= EXACT_MATCH_BONUS
            weights[d] = inv_scarcity

        total_weight = sum(weights.values())

        # Compute ideal share for each donor, capped by available inventory
        raw_shares = {d: amount_int * (weights[d] / total_weight) for d in donors}

        # Cap each share by what's actually available
        capped = {d: min(raw_shares[d], blood_inventory[d]) for d in donors}

        # If capping reduced the total, redistribute the shortfall to remaining donors
        remaining = amount_int
        taken = {d: 0 for d in donors}
        simulated = {d: blood_inventory[d] for d in donors}

        # First pass: assign capped shares (floor to int)
        for d in donors:
            take = int(capped[d])
            taken[d] = take
            simulated[d] -= take
            remaining -= take

        # Second pass: distribute leftover units by largest fractional remainder
        if remaining > 0:
            remainders = sorted(
                donors,
                key=lambda d: (capped[d] - int(capped[d])),
                reverse=True
            )
            for d in remainders:
                if remaining <= 0:
                    break
                extra = min(remaining, simulated[d])
                taken[d] += int(extra)
                simulated[d] -= int(extra)
                remaining -= int(extra)

        # Third pass: if still remaining (due to caps), greedily fill from most common
        if remaining > 0:
            sorted_by_common = sorted(donors, key=lambda d: SCARCITY[d])
            for d in sorted_by_common:
                if remaining <= 0:
                    break
                extra = min(remaining, simulated[d])
                taken[d] += int(extra)
                simulated[d] -= int(extra)
                remaining -= int(extra)

        if remaining > 0:
            return {
                "ok": False,
                "error": "Not enough compatible blood available",
                "available": int(total_available),
            }

        # Commit to in-memory inventory
        for d in donors:
            blood_inventory[d] = int(simulated[d])

        used = {k: v for k, v in taken.items() if v > 0}
        print(f"[send_type] allocated: {used}")
        return {"ok": True, "taken": {d: int(v) for d, v in taken.items()}}

    # ── Routes ──────────────────────────────────────────────────────────────

    @app.route("/")
    def home():
        return "Hello from Flask!"

    @app.route("/api/withdraw", methods=["POST"])
    def withdraw():
        print("abhaybalaljfdlajfls")
        data = request.get_json() or {}
        blood_type = data.get("bloodType", "")
        rh_factor = data.get("rhFactor", "")
        amount = data.get("amount", 0)
        full_type = f"{blood_type}{rh_factor}"
        print("balaljfdlajfls")
        try:
            amount_int = int(amount)
            if amount_int <= 0:
                raise ValueError("Amount must be positive")
            if not blood_type or not rh_factor or full_type not in blood_inventory:
                raise ValueError(f"Invalid blood type: '{full_type}'")

            result = send_type(full_type, amount_int)

            if not result["ok"]:
                raise RuntimeError(
                    f"Insufficient supply: requested {amount_int} units of "
                    f"{full_type}-compatible blood, but only "
                    f"{result['available']} units available across all compatible types."
                )

            # ✅ Log each blood type actually used to Supabase separately
            for donor_type, units_taken in result["taken"].items():
                if units_taken > 0:
                    ledger_repo.insert_event(BLOOD_LEDGER_TABLE, "withdraw", donor_type, units_taken)

            return jsonify({
                "ok": True,
                "action": "withdraw",
                "bloodType": blood_type,
                "rhFactor": rh_factor,
                "amount": amount_int,
                "taken": result["taken"],
                "message": f"Successfully allocated {amount_int} units for {full_type} patient.",
            })

        except ValueError as e:
            return jsonify({"ok": False, "error": "Invalid request", "message": str(e)}), 400
        except RuntimeError as e:
            return jsonify({"ok": False, "error": "Insufficient supply", "message": str(e)}), 409
        except Exception as e:
            return jsonify({"ok": False, "error": "Unexpected error", "message": str(e)}), 500

    @app.route("/api/deposit", methods=["POST"])
    def deposit():
        data = request.get_json() or {}
        blood_type = data.get("bloodType", "")
        rh_factor  = data.get("rhFactor", "")
        amount     = data.get("amount", 0)
        full_type  = f"{blood_type}{rh_factor}"

        try:
            amount_int = int(amount)
            if amount_int <= 0:
                raise ValueError("Amount must be positive")
            if not blood_type or not rh_factor or full_type not in blood_inventory:
                raise ValueError(f"Invalid blood type: '{full_type}'")

            blood_inventory[full_type] += amount_int

            ledger_repo.insert_event(BLOOD_LEDGER_TABLE, "deposit", full_type, amount_int)

            return jsonify({
                "ok":        True,
                "action":    "deposit",
                "bloodType": blood_type,
                "rhFactor":  rh_factor,
                "amount":    amount_int,
                "message":   f"Successfully deposited {amount_int} units of {full_type}.",
            })

        except ValueError as e:
            return jsonify({"ok": False, "error": "Invalid request",  "message": str(e)}), 400
        except Exception as e:
            return jsonify({"ok": False, "error": "Unexpected error", "message": str(e)}), 500

    @app.route("/api/plasma/withdraw", methods=["POST"])
    def plasma_withdraw():
        data       = request.get_json() or {}
        blood_type = data.get("bloodType", "")
        amount     = data.get("amount", 0)

        try:
            amount_int = int(amount)
            if amount_int <= 0:
                raise ValueError("Amount must be positive")
            if blood_type not in plasma_inventory:
                raise ValueError(f"Invalid plasma blood type: '{blood_type}'")

            available = plasma_inventory[blood_type]
            if available < amount_int:
                raise RuntimeError(
                    f"Insufficient plasma supply: requested {amount_int} units of "
                    f"type {blood_type}, but only {available} units available."
                )

            plasma_inventory[blood_type] -= amount_int

            ledger_repo.insert_event(PLASMA_LEDGER_TABLE, "withdraw", blood_type, amount_int)

            return jsonify({
                "ok":        True,
                "action":    "plasma_withdraw",
                "bloodType": blood_type,
                "amount":    amount_int,
                "message":   f"Successfully withdrawn {amount_int} units of {blood_type} plasma.",
            })

        except ValueError as e:
            return jsonify({"ok": False, "error": "Invalid request",     "message": str(e)}), 400
        except RuntimeError as e:
            return jsonify({"ok": False, "error": "Insufficient supply", "message": str(e)}), 409
        except Exception as e:
            return jsonify({"ok": False, "error": "Unexpected error",    "message": str(e)}), 500

    @app.route("/api/plasma/deposit", methods=["POST"])
    def plasma_deposit():
        data       = request.get_json() or {}
        blood_type = data.get("bloodType", "")
        amount     = data.get("amount", 0)

        try:
            amount_int = int(amount)
            if amount_int <= 0:
                raise ValueError("Amount must be positive")
            if blood_type not in plasma_inventory:
                raise ValueError(f"Invalid plasma blood type: '{blood_type}'")

            plasma_inventory[blood_type] += amount_int

            ledger_repo.insert_event(PLASMA_LEDGER_TABLE, "deposit", blood_type, amount_int)

            return jsonify({
                "ok":        True,
                "action":    "plasma_deposit",
                "bloodType": blood_type,
                "amount":    amount_int,
                "message":   f"Successfully deposited {amount_int} units of {blood_type} plasma.",
            })

        except ValueError as e:
            return jsonify({"ok": False, "error": "Invalid request",  "message": str(e)}), 400
        except Exception as e:
            return jsonify({"ok": False, "error": "Unexpected error", "message": str(e)}), 500

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