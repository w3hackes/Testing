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

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)