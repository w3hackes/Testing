from flask import Flask, render_template, request, jsonify

def create_app():
    app = Flask(__name__)

    @app.route("/")
    def home():
        return "Hello from Flask!"

    @app.route("/api/echo", methods=["POST"])
    def echo():
        data = request.get_json()
        return jsonify({"you_sent": data})

    @app.route("/api/withdraw", methods=["POST"])
    def withdraw():
        data = request.get_json() or {}
        blood_type = data.get("bloodType", "")
        rh_factor = data.get("rhFactor", "")
        amount = data.get("amount", 0)
        # TODO: update inventory, validate, etc.
        return jsonify({"ok": True, "action": "withdraw", "bloodType": blood_type, "rhFactor": rh_factor, "amount": amount})

    @app.route("/api/deposit", methods=["POST"])
    def deposit():
        data = request.get_json() or {}
        blood_type = data.get("bloodType", "")
        rh_factor = data.get("rhFactor", "")
        amount = data.get("amount", 0)
        # TODO: update inventory, validate, etc.
        return jsonify({"ok": True, "action": "deposit", "bloodType": blood_type, "rhFactor": rh_factor, "amount": amount})

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)