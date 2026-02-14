"""Unit tests for the Flask measurement agent."""

import time
import pytest
from app import app
from measurement import MeasurementEngine, AgentState


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


@pytest.fixture
def engine():
    return MeasurementEngine(interval=0.1, crash_probability=0.0)


# ---- Engine tests --------------------------------------------------------

class TestMeasurementEngine:
    def test_initial_state(self, engine):
        assert engine.state == AgentState.IDLE
        assert engine.readings == []

    def test_start_stop(self, engine):
        assert engine.start() is True
        assert engine.state == AgentState.RUNNING
        time.sleep(0.35)
        assert engine.stop() is True
        assert engine.state == AgentState.IDLE
        assert len(engine.readings) >= 2

    def test_double_start(self, engine):
        engine.start()
        assert engine.start() is False
        engine.stop()

    def test_stop_when_idle(self, engine):
        assert engine.stop() is False

    def test_crash_and_reset(self):
        eng = MeasurementEngine(interval=0.05, crash_probability=1.0)
        eng.start()
        time.sleep(0.3)
        assert eng.state == AgentState.CRASHED
        assert eng.error_message is not None
        eng.reset()
        assert eng.state == AgentState.IDLE


# ---- Flask route tests ---------------------------------------------------

class TestFlaskRoutes:
    def test_health(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.get_json()["healthy"] is True

    def test_status_idle(self, client):
        resp = client.get("/status")
        data = resp.get_json()
        assert data["state"] in ("idle", "running", "crashed")

    def test_start_stop_cycle(self, client):
        resp = client.post("/start")
        assert resp.status_code == 200

        resp = client.post("/start")
        assert resp.status_code == 409  # already running

        time.sleep(0.3)

        resp = client.get("/data?n=5")
        assert resp.status_code == 200

        resp = client.post("/stop")
        assert resp.status_code == 200

    def test_data_empty(self, client):
        resp = client.get("/data")
        assert resp.status_code == 200
