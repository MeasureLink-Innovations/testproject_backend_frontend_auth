"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback, useRef } from "react";
import AgentCard from "@/components/AgentCard";
import EventLog, { EventLogEntry } from "@/components/EventLog";
import {
    Agent,
    getAgents,
    startAgent,
    stopAgent,
    resetAgent,
    deleteAgent,
    createSseUrl,
} from "@/lib/api";

export default function Dashboard() {
    const { data: session, status } = useSession();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [events, setEvents] = useState<EventLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [highlightedAgent, setHighlightedAgent] = useState<string | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    const token = (session as any)?.accessToken as string | undefined;
    const roles = (session as any)?.roles as string[] | undefined;
    const isAdmin = roles?.includes("admin") ?? false;

    const addEvent = useCallback(
        (type: string, message: string) => {
            const entry: EventLogEntry = {
                id: crypto.randomUUID(),
                type,
                message,
                timestamp: new Date(),
            };
            setEvents((prev) => [entry, ...prev].slice(0, 50));
        },
        []
    );

    // Fetch agents
    const fetchAgents = useCallback(async () => {
        if (!token) return;
        try {
            const data = await getAgents(token);
            setAgents(data);
        } catch (err) {
            console.error("Failed to fetch agents:", err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    // SSE connection
    useEffect(() => {
        if (!token) return;

        fetchAgents();

        const es = new EventSource(createSseUrl(token));
        eventSourceRef.current = es;

        es.addEventListener("agent_status_changed", (e) => {
            const data = JSON.parse(e.data);
            addEvent(
                data.newStatus === "crashed" ? "error" : "status",
                `${data.name}: ${data.previousStatus} → ${data.newStatus}${data.error ? ` (${data.error})` : ""}`
            );
            setHighlightedAgent(data.agentId);
            setTimeout(() => setHighlightedAgent(null), 2000);
            fetchAgents();
        });

        es.addEventListener("agent_registered", (e) => {
            const data = JSON.parse(e.data);
            addEvent("info", `New agent registered: ${data.name}`);
            fetchAgents();
        });

        es.addEventListener("agent_removed", (e) => {
            const data = JSON.parse(e.data);
            addEvent("info", `Agent removed: ${data.name}`);
            fetchAgents();
        });

        es.addEventListener("measurement_data", (e) => {
            const data = JSON.parse(e.data);
            const latest = data.readings?.[data.readings.length - 1];
            if (latest) {
                addEvent(
                    "data",
                    `${data.name}: T=${latest.temperature}°C H=${latest.humidity}% P=${latest.pressure}hPa`
                );
            }
        });

        es.onerror = () => {
            addEvent("error", "Connection lost — reconnecting...");
        };

        return () => {
            es.close();
        };
    }, [token, fetchAgents, addEvent]);

    // Agent actions
    const handleStart = async (id: string) => {
        if (!token) return;
        try {
            await startAgent(token, id);
        } catch (err: any) {
            addEvent("error", `Failed to start: ${err.message}`);
        }
    };

    const handleStop = async (id: string) => {
        if (!token) return;
        try {
            await stopAgent(token, id);
        } catch (err: any) {
            addEvent("error", `Failed to stop: ${err.message}`);
        }
    };

    const handleReset = async (id: string) => {
        if (!token) return;
        try {
            await resetAgent(token, id);
        } catch (err: any) {
            addEvent("error", `Failed to reset: ${err.message}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!token) return;
        try {
            await deleteAgent(token, id);
        } catch (err: any) {
            addEvent("error", `Failed to delete: ${err.message}`);
        }
    };

    if (status === "loading") {
        return (
            <div className="page-loading">
                <div className="spinner" />
                <p>Loading...</p>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="page-unauthenticated">
                <div className="hero-card">
                    <h1>⚡ Measurement System</h1>
                    <p>Monitor and control your measurement agents in real-time.</p>
                    <p className="hero-sub">Please sign in to access the dashboard.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>Dashboard</h1>
                <div className="dashboard-stats">
                    <div className="stat-card">
                        <span className="stat-value">{agents.length}</span>
                        <span className="stat-label">Agents</span>
                    </div>
                    <div className="stat-card stat-running">
                        <span className="stat-value">
                            {agents.filter((a) => a.status === "running").length}
                        </span>
                        <span className="stat-label">Running</span>
                    </div>
                    <div className="stat-card stat-error">
                        <span className="stat-value">
                            {agents.filter((a) => a.status === "crashed" || a.status === "unreachable").length}
                        </span>
                        <span className="stat-label">Issues</span>
                    </div>
                </div>
            </div>

            <div className="dashboard-grid">
                <section className="dashboard-agents">
                    <h2>Agents</h2>
                    {loading ? (
                        <div className="spinner" />
                    ) : agents.length === 0 ? (
                        <div className="empty-state">
                            <p>No agents registered yet.</p>
                            <a href="/agents" className="btn btn-primary">
                                Register Agent
                            </a>
                        </div>
                    ) : (
                        <div className="agents-grid">
                            {agents.map((agent) => (
                                <AgentCard
                                    key={agent.id}
                                    agent={agent}
                                    isAdmin={isAdmin}
                                    onStart={handleStart}
                                    onStop={handleStop}
                                    onReset={handleReset}
                                    onDelete={handleDelete}
                                    highlight={highlightedAgent === agent.id}
                                />
                            ))}
                        </div>
                    )}
                </section>

                <section className="dashboard-events">
                    <h2>Live Events</h2>
                    <EventLog events={events} />
                </section>
            </div>
        </div>
    );
}
