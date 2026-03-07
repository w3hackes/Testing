from flask import Flask, request, jsonify
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app)  # <-- this is required

    @app.route("/")
    def home():
        return "Hello from Flask!"

    @app.route("/api/deposit", methods=["POST"])
    def deposit():
        data = request.get_json()
        return jsonify({"you_sent": data})

    @app.route("/api/withdraw", methods=["POST"])
    def withdraw():
        data = request.get_json()
        return jsonify({"you_sent": data})

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)