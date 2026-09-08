"""Phase 5: Historical Voyage Replay & Backtesting Engine.

Simulates counterfactual routing decisions on historical polar voyages to benchmark
PolarNav's recommended corridors against actual human-navigated AIS tracks.
"""

from .backtest_schema import (
    SimulatedStep,
    ViolationAudit,
    RouteComparisonMetrics,
    BacktestResult,
)
from .backtest_metrics import compute_route_comparison_metrics
from .replay_engine import HistoricalVoyageReplayEngine

__all__ = [
    "SimulatedStep",
    "ViolationAudit",
    "RouteComparisonMetrics",
    "BacktestResult",
    "compute_route_comparison_metrics",
    "HistoricalVoyageReplayEngine",
]
