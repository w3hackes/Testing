from flask import Flask, request, jsonify
from flask_cors import CORS


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

    COMPATIBILITY = {
        "O-": ["O-"],
        "O+": ["O+", "O-"],
        "A-": ["A-", "O-"],
        "A+": ["A+", "A-", "O+", "O-"],
        "B-": ["B-", "O-"],
        "B+": ["B+", "B-", "O+", "O-"],
        "AB-": ["AB-", "A-", "B-", "O-"],
        "AB+": ["AB+", "AB-", "A+", "A-", "B+", "B-", "O+", "O-"]
    }

    blood_percentages = {
        "AB+": 10,
        "AB-": 40,
        "B+": 25,
        "B-": 25,
        "A+": 15,
        "A-": 10,
        "O+": 15,
        "O-": 10
    }



    def send_type(btype, amount):
        nonlocal blood_inventory

        amount = float(amount)
        donors = COMPATIBILITY[btype]

        total_weight = sum(blood_percentages[d] for d in donors)

        for donor in donors:
            if amount <= 0:
                break

            pct = blood_percentages[donor] / total_weight
            desired_take = amount * pct
            available = blood_inventory[donor]

            take = min(desired_take, available)

            blood_inventory[donor] -= int(take)
            amount -= int(take)

        if amount > 0:
            for donor in donors:
                if amount <= 0:
                    break

                available = blood_inventory[donor]
                take = min(amount, available)

                blood_inventory[donor] -= take
                amount -= take

    @app.route("/")
    def home():
        return "Hello from Flask!"

    @app.route("/api/withdraw", methods=["POST"])
    def withdraw():
        data = request.get_json() or {}
        blood_type = data.get("bloodType", "")
        rh_factor = data.get("rhFactor", "")
        amount = data.get("amount", 0)

        send_type(blood_type+rh_factor, amount)
        # TODO: update inventory, validate, etc.
        for b in blood_inventory.values():
            print(b)
        return jsonify({"ok": True, "action": "withdraw", "bloodType": blood_type, "rhFactor": rh_factor, "amount": amount})

    @app.route("/api/deposit", methods=["POST"])
    def deposit():
        data = request.get_json() or {}
        blood_type = data.get("bloodType", "")
        rh_factor = data.get("rhFactor", "")
        amount = data.get("amount", 0)
        blood_inventory[blood_type+rh_factor] += amount
        # TODO: update inventory, validate, etc.
        for b in blood_inventory.values():
            print(b)

        return jsonify({"ok": True, "action": "deposit", "bloodType": blood_type, "rhFactor": rh_factor, "amount": amount})

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)