## 2025-02-15 - [Sequential Polling Bottleneck]
**Learning:** The `AgentHealthMonitor` polled agents sequentially inside a loop, creating a bottleneck proportional to the number of agents and their response times. This was bounded by `PollInterval` but could exceed it.
**Action:** Always prefer parallelizing independent network I/O tasks using `Task.WhenAll`, especially in background services. Ensure database operations remain sequential or use separate contexts to avoid concurrency issues with `DbContext`.

## 2025-02-17 - [Optimization vs Implicit Contracts]
**Learning:** Reducing data payload size by fetching only the latest data point (`n=1`) instead of history (`n=5`) caused a regression because it violated the implicit contract of providing historical context, even if the current frontend only used the latest point.
**Action:** When optimizing data payloads, verify all consumers and the semantic contract of the API. If the API is designed to return history, preserve that behavior unless explicitly changed via API versioning.

## 2025-02-18 - [Parallel Broadcasting & Thread Safety]
**Learning:** `SseBroadcaster.BroadcastAsync` iterated connected clients sequentially, creating a bottleneck proportional to the number of clients * write time. Parallelizing this loop with `Task.WhenAll` significantly improved latency. However, `StreamWriter` is not thread-safe, so adding a `SemaphoreSlim` to serialize concurrent `BroadcastAsync` calls was critical to prevent race conditions while enabling internal parallelism.
**Action:** When implementing fan-out patterns (one-to-many broadcasts), always parallelize the fan-out loop but ensure the shared resource (e.g., connection list or writer) is protected from concurrent external calls if necessary. Use `Task.WhenAll` or `Parallel.ForEachAsync` for IO-bound fan-out.
