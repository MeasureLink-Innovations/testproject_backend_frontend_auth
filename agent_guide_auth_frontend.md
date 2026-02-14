# Reference Guide: Authentication and Dynamic Frontend Implementation

This guide provides a technical walkthrough of the authentication and dynamic frontend implementation in this repository. It is designed to serve as a reference for implementing similar features in other projects.

## Architecture Overview

The system uses a modern distributed architecture:
- **Frontend**: Next.js (App Router) with NextAuth (Auth.js) for session management.
- **Backend**: ASP.NET Core Web API with JWT Bearer authentication.
- **Identity Provider**: Keycloak for OAuth2/OpenID Connect.
- **Real-time Communication**: Server-Sent Events (SSE) for live dashboard updates.

---

## 1. Authentication Implementation

### 🔐 Frontend: NextAuth + Keycloak

The frontend manages authentication using `next-auth`. The core configuration is in [`frontend/lib/auth.ts`](frontend/lib/auth.ts).

**Key Features:**
1.  **Dual Issuer Handling**: Differentiates between `KEYCLOAK_ISSUER` (client-facing) and `KEYCLOAK_ISSUER_INTERNAL` (server-to-server) to support Docker networking.
2.  **Token Refresh Flow**: Implements a `jwt` callback that automatically refreshes the access token using the refresh token when it near expiration.
3.  **Role Extraction**: Extracts realm roles from the JWT payload and adds them to the session for Role-Based Access Control (RBAC) in the UI.

```typescript
// Example Role Extraction (frontend/lib/auth.ts)
function extractRoles(accessToken: string): string[] {
    const payload = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64").toString());
    return payload.realm_access?.roles || [];
}
```

### 🛡️ Backend: ASP.NET Core JWT Validation

The backend validates tokens issued by Keycloak. Configuration is in [`backend/Backend.Api/Program.cs`](backend/Backend.Api/Program.cs).

**Key Features:**
1.  **Multiple Issuers**: Configured to accept tokens from both internal and external Keycloak URLs.
2.  **SSE Token Support**: A custom `OnMessageReceived` event handler extracts the access token from the query string (required for `EventSource` which doesn't support custom headers).
3.  **Role Mapping**: On token validation, the `realm_access.roles` from the raw JWT are mapped to `ClaimTypes.Role` so they can be used with `[Authorize(Roles = "admin")]`.

```csharp
// SSE Token Extraction (backend/Backend.Api/Program.cs)
options.Events = new JwtBearerEvents {
    OnMessageReceived = context => {
        if (string.IsNullOrEmpty(context.Token) &&
            context.Request.Query.TryGetValue("access_token", out var token)) {
            context.Token = token;
        }
        return Task.CompletedTask;
    }
};
```

---

## 2. Dynamic Frontend & Real-time Updates

### 📡 Server-Sent Events (SSE)

The dashboard provides real-time updates without polling.

**Frontend Implementation ([`frontend/app/page.tsx`](frontend/app/page.tsx)):**
- Uses the standard `EventSource` API.
- Passes the auth token via query parameter: `new EventSource(createSseUrl(token))`.
- Detailed listeners for `agent_status_changed`, `agent_registered`, and `measurement_data`.

**Backend Implementation ([`backend/Backend.Api/Controllers/EventsController.cs`](backend/Backend.Api/Controllers/EventsController.cs)):**
- Streams data with `text/event-stream` Content-Type.
- Uses a `SseBroadcaster` service to push events to all connected clients.

### 🏗️ Role-Based UI (RBAC)

The UI dynamically adjusts based on the user's roles extracted during login.

- **Admin-only Actions**: Buttons for starting, stopping, or deleting agents are only rendered if `session.roles.includes("admin")`.
- **Protected Routes**: The backend enforces `[Authorize(Roles = "admin")]` on destructive or state-changing endpoints ([`AgentsController.cs`](backend/Backend.Api/Controllers/AgentsController.cs)).

---

## 3. Observability & Error Handling

The system automatically detects and propagates issues with the measurement agents to the frontend.

### 🩺 Health Monitoring (Backend)
The [`AgentHealthMonitor`](backend/Backend.Api/Services/AgentHealthMonitor.cs) is a background service that:
- Polls every registered agent's `/status` endpoint every 5 seconds.
- Detects if an agent is `unreachable` or has `crashed`.
- Updates the database and broadcasts an `agent_status_changed` event via SSE if the state changes.

### ❗ Frontend Reaction
In [`app/page.tsx`](frontend/app/page.tsx), the `EventSource` listener for `agent_status_changed` handles the update:
1.  **Event Log**: Adds a new entry (marked as "error" if the new status is `crashed`).
2.  **Visual Feedback**: Sets a `highlightedAgent` ID, which causes the specific `AgentCard` to pulse or flash.
3.  **State Refresh**: Calls `fetchAgents()` to ensure the dashboard reflects the latest status and error messages from the database.

---

## 4. Networking & Docker Setup

The system relies on a specific network topology defined in [`docker-compose.yml`](docker-compose.yml):

- **Internal Communication**: Containers talk to each other via service names (e.g., `http://keycloak:8080`).
- **External Communication**: The browser talks to the system via `localhost` (e.g., `http://localhost:8080`).
- **Consistency**: Environment variables like `KEYCLOAK_ISSUER_INTERNAL` are critical for the backend to verify tokens against the same Keycloak instance that the frontend uses.

---

## 🚀 How to use as a Reference

1.  **Auth Setup**: Copy `frontend/lib/auth.ts` and the `Authentication` section of `Program.cs`.
2.  **SSE Pattern**: Refer to `EventsController.cs` and the `useEffect` hook in `page.tsx` for a clean streaming implementation.
3.  **Internal/External URLs**: Use the pattern of passing both internal and external authorities to the backend to avoid "Issuer Mismatch" errors in Docker environments.
