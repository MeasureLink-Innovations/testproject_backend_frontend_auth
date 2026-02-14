"""
Simulated measurement device.

Produces random sensor readings at a configurable interval.
Has a configurable probability of "crashing" on each tick to exercise
the backend's health-monitoring logic.
"""

import random
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import List


class AgentState(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    CRASHED = "crashed"


@dataclass
class Reading:
    timestamp: str
    temperature: float
    humidity: float
    pressure: float


@dataclass
class MeasurementEngine:
    """Core simulation engine – runs in a background thread."""

    interval: float = 1.0          # seconds between readings
    crash_probability: float = 0.005  # probability of crash per tick
    max_history: int = 200          # keep last N readings in memory

    state: AgentState = field(default=AgentState.IDLE, init=False)
    readings: List[Reading] = field(default_factory=list, init=False)
    error_message: str | None = field(default=None, init=False)
    _thread: threading.Thread | None = field(default=None, init=False, repr=False)
    _stop_event: threading.Event = field(default_factory=threading.Event, init=False, repr=False)

    # ---- public API ---------------------------------------------------

    def start(self) -> bool:
        """Start producing measurements. Returns False if already running."""
        if self.state == AgentState.RUNNING:
            return False
        self.state = AgentState.RUNNING
        self.error_message = None
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        return True

    def stop(self) -> bool:
        """Gracefully stop the engine. Returns False if not running."""
        if self.state != AgentState.RUNNING:
            return False
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)
        self.state = AgentState.IDLE
        return True

    def reset(self) -> None:
        """Reset after a crash so the agent can be started again."""
        if self.state == AgentState.CRASHED:
            self.state = AgentState.IDLE
            self.error_message = None

    def get_status(self) -> dict:
        return {
            "state": self.state.value,
            "reading_count": len(self.readings),
            "error": self.error_message,
        }

    def get_latest(self, n: int = 20) -> list[dict]:
        return [r.__dict__ for r in self.readings[-n:]]

    # ---- internals ----------------------------------------------------

    def _run_loop(self) -> None:
        try:
            while not self._stop_event.is_set():
                # Simulate random crash
                if random.random() < self.crash_probability:
                    raise RuntimeError("Simulated sensor hardware fault!")

                reading = Reading(
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    temperature=round(20 + random.gauss(0, 2), 2),
                    humidity=round(50 + random.gauss(0, 5), 2),
                    pressure=round(1013 + random.gauss(0, 3), 2),
                )
                self.readings.append(reading)

                # Trim history
                if len(self.readings) > self.max_history:
                    self.readings = self.readings[-self.max_history:]

                self._stop_event.wait(self.interval)
        except Exception as exc:
            self.state = AgentState.CRASHED
            self.error_message = str(exc)
