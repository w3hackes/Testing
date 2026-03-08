import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

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

BLOOD_LEDGER_TABLE  = os.getenv("BLOOD_LEDGER_TABLE",  "blood_events")
PLASMA_LEDGER_TABLE = os.getenv("PLASMA_LEDGER_TABLE", "plasma_events")

print("FILE LOADED")

def create_app():
    print("CREATE_APP CALLED")
    app = Flask(__name__)
    CORS(app)

    blood_inventory = {
        "A+": 0, "A-": 0, "B+": 0, "B-": 0,
        "AB+": 0, "AB-": 0, "O+": 0, "O-": 0,
    }
    plasma_inventory = {"A": 0, "B": 0, "AB": 0, "O": 0}

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

    PLASMA_COMP = {
        "O": ["O"],
        "A": ["A", "O"],
        "B": ["B", "O"],
        "AB-": ["AB", "A", "B", "O"],
    }

    POPULATION_FREQ = {
        "O+": 37.4, "O-":  6.6,
        "A+": 35.7, "A-":  6.3,
        "B+":  8.5, "B-":  1.5,
        "AB+": 3.4, "AB-": 0.6,
    }
    SCARCITY = {t: 1.0 / f for t, f in POPULATION_FREQ.items()}

    # ── Seed Supabase on startup if empty ──────────────────────────────────
    existing = ledger_repo.get_balance_by_blood_type(BLOOD_LEDGER_TABLE)
    print(f"[startup] existing Supabase balances: {existing}")

    if not existing:
        print("[seed] Supabase is empty — seeding initial inventory...")
        for blood_type, amount in [
            ("A+", 1000), ("A-", 500),  ("B+", 800),  ("B-",  400),
            ("AB+", 300), ("AB-", 200), ("O+", 1200), ("O-",  600),
        ]:
            ledger_repo.insert_event(BLOOD_LEDGER_TABLE, "deposit", blood_type, amount)
        for blood_type, amount in [
            ("A", 500), ("B", 400), ("AB", 300), ("O", 600),
        ]:
            ledger_repo.insert_event(PLASMA_LEDGER_TABLE, "deposit", blood_type, amount)
        print("[seed] Done seeding.")

    # Sync in-memory inventory from Supabase
    blood_inventory.update(ledger_repo.get_balance_by_blood_type(BLOOD_LEDGER_TABLE))
    plasma_inventory.update(ledger_repo.get_balance_by_blood_type(PLASMA_LEDGER_TABLE))
    print(f"[startup] blood_inventory: {blood_inventory}")
    print(f"[startup] plasma_inventory: {plasma_inventory}")

    # ── send_type ──────────────────────────────────────────────────────────
    # Plasma compatibility: patient type -> which donor types they can receive FROM
    PLASMA_COMPATIBILITY = {
        "A": ["A", "AB"],
        "B": ["B", "AB"],
        "O": ["O", "A", "B", "AB"],
        "AB": ["AB"],
    }

    # Plasma population frequencies (same ABO groups, no Rh)
    PLASMA_POPULATION_FREQ = {
        "A": 42.0,
        "B": 10.0,
        "O": 44.0,
        "AB": 4.0,
    }
    PLASMA_SCARCITY = {t: 1.0 / f for t, f in PLASMA_POPULATION_FREQ.items()}

    def send_plasma(ptype, amount_int):
        # Sync from Supabase
        real_balances = ledger_repo.get_balance_by_blood_type(PLASMA_LEDGER_TABLE)
        plasma_inventory.update(real_balances)
        print(f"[send_plasma] ptype={ptype} amount={amount_int}")
        print(f"[send_plasma] inventory: {plasma_inventory}")

        donors = PLASMA_COMPATIBILITY.get(ptype)
        if not donors:
            return {"ok": False, "error": f"Unknown plasma type: {ptype}", "available": 0}

        total_available = sum(plasma_inventory.get(d, 0) for d in donors)
        if total_available < amount_int:
            return {"ok": False, "error": "Not enough compatible plasma", "available": int(total_available)}

        EXACT_MATCH_BONUS = 3.0
        weights = {}
        for d in donors:
            w = 1.0 / PLASMA_SCARCITY[d]  # higher = more common = spend first
            if d == ptype:
                w *= EXACT_MATCH_BONUS
            weights[d] = w
        total_weight = sum(weights.values())

        raw_shares = {d: amount_int * (weights[d] / total_weight) for d in donors}
        capped = {d: min(raw_shares[d], plasma_inventory.get(d, 0)) for d in donors}

        remaining = amount_int
        taken = {d: 0 for d in donors}
        simulated = {d: plasma_inventory.get(d, 0) for d in donors}

        # Pass 1: floor shares
        for d in donors:
            take = int(capped[d])
            taken[d] = take
            simulated[d] -= take
            remaining -= take

        # Pass 2: largest fractional remainder
        if remaining > 0:
            for d in sorted(donors, key=lambda d: capped[d] - int(capped[d]), reverse=True):
                if remaining <= 0:
                    break
                extra = min(remaining, simulated[d])
                taken[d] += int(extra)
                simulated[d] -= int(extra)
                remaining -= int(extra)

        # Pass 3: greedy from most common
        if remaining > 0:
            for d in sorted(donors, key=lambda d: PLASMA_SCARCITY[d]):
                if remaining <= 0:
                    break
                extra = min(remaining, simulated[d])
                taken[d] += int(extra)
                simulated[d] -= int(extra)
                remaining -= int(extra)

        if remaining > 0:
            return {"ok": False, "error": "Not enough compatible plasma", "available": int(total_available)}

        # Commit
        for d in donors:
            plasma_inventory[d] = int(simulated[d])

        used = {k: v for k, v in taken.items() if v > 0}
        print(f"[send_plasma] allocated: {used}")
        return {"ok": True, "taken": {d: int(v) for d, v in taken.items()}}

    def send_type(btype, amount_int):
        # Always sync from Supabase before allocating
        real_balances = ledger_repo.get_balance_by_blood_type(BLOOD_LEDGER_TABLE)
        blood_inventory.update(real_balances)
        print(f"[send_type] btype={btype} amount={amount_int}")
        print(f"[send_type] inventory: { {d: blood_inventory.get(d,0) for d in COMPATIBILITY[btype]} }")

        donors = COMPATIBILITY[btype]
        total_available = sum(blood_inventory.get(d, 0) for d in donors)

        if total_available < amount_int:
            return {"ok": False, "error": "Not enough compatible blood", "available": int(total_available)}

        EXACT_MATCH_BONUS = 3.0
        weights = {}
        for d in donors:
            w = 1.0 / SCARCITY[d]
            if d == btype:
                w *= EXACT_MATCH_BONUS
            weights[d] = w
        total_weight = sum(weights.values())

        raw_shares = {d: amount_int * (weights[d] / total_weight) for d in donors}
        capped     = {d: min(raw_shares[d], blood_inventory.get(d, 0)) for d in donors}

        remaining = amount_int
        taken     = {d: 0 for d in donors}
        simulated = {d: blood_inventory.get(d, 0) for d in donors}

        # Pass 1: floor shares
        for d in donors:
            take = int(capped[d])
            taken[d] = take
            simulated[d] -= take
            remaining -= take

        # Pass 2: largest fractional remainder
        if remaining > 0:
            for d in sorted(donors, key=lambda d: capped[d] - int(capped[d]), reverse=True):
                if remaining <= 0:
                    break
                extra = min(remaining, simulated[d])
                taken[d] += int(extra)
                simulated[d] -= int(extra)
                remaining -= int(extra)

        # Pass 3: greedy from most common
        if remaining > 0:
            for d in sorted(donors, key=lambda d: SCARCITY[d]):
                if remaining <= 0:
                    break
                extra = min(remaining, simulated[d])
                taken[d] += int(extra)
                simulated[d] -= int(extra)
                remaining -= int(extra)

        if remaining > 0:
            return {"ok": False, "error": "Not enough compatible blood", "available": int(total_available)}

        # Commit to in-memory
        for d in donors:
            blood_inventory[d] = int(simulated[d])

        print(f"[send_type] allocated: { {k:v for k,v in taken.items() if v>0} }")
        return {"ok": True, "taken": {d: int(v) for d, v in taken.items()}}

    # ── Routes ─────────────────────────────────────────────────────────────

    @app.route("/")
    def home():
        return "Hello from Flask!"

    @app.route("/api/withdraw", methods=["POST"])
    def withdraw():
        data       = request.get_json() or {}
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

            result = send_type(full_type, amount_int)
            if not result["ok"]:
                raise RuntimeError(
                    f"Insufficient supply: requested {amount_int} units of "
                    f"{full_type}-compatible blood, but only "
                    f"{result['available']} available across all compatible types."
                )

            for donor_type, units_taken in result["taken"].items():
                if units_taken > 0:
                    ledger_repo.insert_event(BLOOD_LEDGER_TABLE, "withdraw", donor_type, int(units_taken))

            return jsonify({
                "ok": True, "action": "withdraw",
                "bloodType": blood_type, "rhFactor": rh_factor,
                "amount": amount_int, "taken": result["taken"],
                "message": f"Successfully allocated {amount_int} units for {full_type} patient.",
            })

        except ValueError  as e: return jsonify({"ok": False, "error": "Invalid request",     "message": str(e)}), 400
        except RuntimeError as e: return jsonify({"ok": False, "error": "Insufficient supply", "message": str(e)}), 409
        except Exception    as e: return jsonify({"ok": False, "error": "Unexpected error",    "message": str(e)}), 500

    @app.route("/api/deposit", methods=["POST"])
    def deposit():
        data       = request.get_json() or {}
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
                "ok": True, "action": "deposit",
                "bloodType": blood_type, "rhFactor": rh_factor,
                "amount": amount_int,
                "message": f"Successfully deposited {amount_int} units of {full_type}.",
            })

        except ValueError as e: return jsonify({"ok": False, "error": "Invalid request",  "message": str(e)}), 400
        except Exception  as e: return jsonify({"ok": False, "error": "Unexpected error", "message": str(e)}), 500

    @app.route("/api/facility-request", methods=["POST"])
    def facility_request():
        data = request.get_json() or {}
        facility_name = data.get("facilityName", "Unknown facility")
        origin_name = data.get("originName", "Unknown origin")
        urgency = data.get("urgency", "standard")
        blood = data.get("blood", {})
        plasma = data.get("plasma", {})

        try:
            results = {}

            # Add blood to inventory (deposit)
            for blood_type, amount in blood.items():
                amount_int = int(amount)
                if amount_int <= 0:
                    continue
                if blood_type not in blood_inventory:
                    raise ValueError(f"Invalid blood type: '{blood_type}'")

                blood_inventory[blood_type] += amount_int
                ledger_repo.insert_event(BLOOD_LEDGER_TABLE, "deposit", blood_type, amount_int)
                results[blood_type] = amount_int
                print(f"[facility-request] deposited {amount_int} units of {blood_type}")

            # Add plasma to inventory (deposit)
            for plasma_type, amount in plasma.items():
                amount_int = int(amount)
                if amount_int <= 0:
                    continue
                if plasma_type not in plasma_inventory:
                    raise ValueError(f"Invalid plasma type: '{plasma_type}'")

                plasma_inventory[plasma_type] += amount_int
                ledger_repo.insert_event(PLASMA_LEDGER_TABLE, "deposit", plasma_type, amount_int)
                print(f"[facility-request] deposited {amount_int} units of plasma {plasma_type}")

            print(f"[facility-request] {facility_name} -> {origin_name} | urgency={urgency} | {results}")

            return jsonify({
                "ok": True,
                "message": f"Successfully received supply from {facility_name} to {origin_name}.",
                "urgency": urgency,
                "allocated": results,
            })

        except ValueError as e:
            return jsonify({"ok": False, "error": "Invalid request", "message": str(e)}), 400
        except Exception as e:
            return jsonify({"ok": False, "error": "Unexpected error", "message": str(e)}), 500

    @app.route("/api/plasma/withdraw", methods=["POST"])
    @app.route("/api/plasma/withdraw", methods=["POST"])
    def plasma_withdraw():
        data = request.get_json() or {}
        blood_type = data.get("bloodType", "")
        amount = data.get("amount", 0)

        try:
            amount_int = int(amount)
            if amount_int <= 0:
                raise ValueError("Amount must be positive")
            if blood_type not in plasma_inventory:
                raise ValueError(f"Invalid plasma blood type: '{blood_type}'")

            result = send_plasma(blood_type, amount_int)
            if not result["ok"]:
                raise RuntimeError(
                    f"Insufficient plasma supply: requested {amount_int} units of "
                    f"{blood_type}-compatible plasma, but only {result['available']} available."
                )

            # Log each donor type actually used
            for donor_type, units_taken in result["taken"].items():
                if units_taken > 0:
                    ledger_repo.insert_event(PLASMA_LEDGER_TABLE, "withdraw", donor_type, int(units_taken))

            return jsonify({
                "ok": True, "action": "plasma_withdraw",
                "bloodType": blood_type, "amount": amount_int,
                "taken": result["taken"],
                "message": f"Successfully withdrawn {amount_int} units of {blood_type}-compatible plasma.",
            })

        except ValueError as e:
            return jsonify({"ok": False, "error": "Invalid request", "message": str(e)}), 400
        except RuntimeError as e:
            return jsonify({"ok": False, "error": "Insufficient supply", "message": str(e)}), 409
        except Exception as e:
            return jsonify({"ok": False, "error": "Unexpected error", "message": str(e)}), 500

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
                "ok": True, "action": "plasma_deposit",
                "bloodType": blood_type, "amount": amount_int,
                "message": f"Successfully deposited {amount_int} units of {blood_type} plasma.",
            })

        except ValueError as e: return jsonify({"ok": False, "error": "Invalid request",  "message": str(e)}), 400
        except Exception  as e: return jsonify({"ok": False, "error": "Unexpected error", "message": str(e)}), 500

    @app.route("/api/inventory/blood", methods=["GET"])
    def blood_inventory_view():
        return jsonify(ledger_repo.get_balance_by_blood_type(BLOOD_LEDGER_TABLE))

    @app.route("/api/inventory/plasma", methods=["GET"])
    def plasma_inventory_view():
        return jsonify(ledger_repo.get_balance_by_blood_type(PLASMA_LEDGER_TABLE))

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)