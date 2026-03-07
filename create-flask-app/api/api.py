from flask import Flask, request, jsonify
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app)  # <-- this is required
    type_a = 100

    @app.route("/")
    def home():
        return "Hello from Flask!"

    @app.route("/api/deposit", methods=["POST"])
    def deposit():
        nonlocal type_a
        type_a += 10
        return jsonify(type_a)

    @app.route("/api/withdraw", methods=["POST"])
    def withdraw():
        nonlocal type_a
        type_a -= 10
        return jsonify(type_a)

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)