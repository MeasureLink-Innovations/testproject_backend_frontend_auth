## 2025-02-15 - [Sequential Polling Bottleneck]
**Learning:** The `AgentHealthMonitor` polled agents sequentially inside a loop, creating a bottleneck proportional to the number of agents and their response times. This was bounded by `PollInterval` but could exceed it.
**Action:** Always prefer parallelizing independent network I/O tasks using `Task.WhenAll`, especially in background services. Ensure database operations remain sequential or use separate contexts to avoid concurrency issues with `DbContext`.
