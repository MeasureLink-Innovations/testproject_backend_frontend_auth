# Sentinel's Journal

## 2024-05-21 - [High] SSRF in Measurement Agent Registration
**Vulnerability:** The `AgentsController` allowed admins to register agents with any `BaseUrl`. The backend would then make HTTP requests to this URL. This is a classic SSRF vector, allowing an attacker (with admin access) to scan internal ports or access cloud metadata services.
**Learning:** When a system acts as a proxy or webhook dispatcher (backend calls agent), strict validation of the target URL is mandatory. Relying on "admin trust" is insufficient defense-in-depth.
**Prevention:** Implemented `AgentUrlValidator` to block:
- Non-HTTP/HTTPS schemes.
- Loopback addresses (`localhost`, `127.0.0.1`, `[::1]`, `0.0.0.0`).
- Link-local/Metadata addresses (`169.254.x.x`).
