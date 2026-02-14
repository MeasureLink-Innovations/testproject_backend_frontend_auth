"""
Flask Measurement Agent
=======================
A lightweight HTTP wrapper around the MeasurementEngine.

Endpoints
---------
POST /start          – Begin producing measurements
POST /stop           – Stop producing measurements
POST /reset          – Reset after a crash
GET  /status         – Current agent state
GET  /data           – Latest readings (query param: ?n=20)
GET  /health         – Simple liveness probe
"""

import os
from flask import Flask, jsonify, request
from measurement import MeasurementEngine

app = Flask(__name__)

engine = MeasurementEngine(
    interval=float(os.getenv("MEASUREMENT_INTERVAL", "1.0")),
    crash_probability=float(os.getenv("CRASH_PROBABILITY", "0.005")),
)


# ---------- routes -------------------------------------------------------

@app.route("/health", methods=["GET"])
def health():
    """Liveness check – always returns 200 if the process is up."""
    return jsonify({"healthy": True})


@app.route("/status", methods=["GET"])
def status():
    """Return the engine's current state, reading count, and any error."""
    return jsonify(engine.get_status())


@app.route("/start", methods=["POST"])
def start():
    ok = engine.start()
    if ok:
        return jsonify({"message": "Measurement started"}), 200
    return jsonify({"message": "Already running"}), 409


@app.route("/stop", methods=["POST"])
def stop():
    ok = engine.stop()
    if ok:
        return jsonify({"message": "Measurement stopped"}), 200
    return jsonify({"message": "Not running"}), 409


@app.route("/reset", methods=["POST"])
def reset():
    engine.reset()
    return jsonify({"message": "Agent reset"}), 200


@app.route("/data", methods=["GET"])
def data():
    n = request.args.get("n", 20, type=int)
    return jsonify(engine.get_latest(n))


# ---------- main ---------------------------------------------------------

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5100"))
    app.run(host="0.0.0.0", port=port, debug=False)
