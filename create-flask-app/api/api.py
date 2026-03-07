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

    @app.route("/")
    def home():
        return "Hello from Flask!"

    @app.route("/api/withdraw", methods=["POST"])
    def withdraw():
        data = request.get_json() or {}
        blood_type = data.get("bloodType", "")
        rh_factor = data.get("rhFactor", "")
        amount = data.get("amount", 0)

        blood_inventory[blood_type + rh_factor] -= int(amount)
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
        blood_inventory[blood_type + rh_factor] += int(amount)
        # TODO: update inventory, validate, etc.
        for b in blood_inventory.values():
            print(b)

        return jsonify({"ok": True, "action": "deposit", "bloodType": blood_type, "rhFactor": rh_factor, "amount": amount})


    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)