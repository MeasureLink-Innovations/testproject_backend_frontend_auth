"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
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

    const token = (session as unknown as { accessToken?: string })?.accessToken;
    const roles = (session as unknown as { roles?: string[] })?.roles;
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
        } catch (err: unknown) {
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

        es.addEventListener("agent_status_changed", (event: Event) => {
            const e = event as MessageEvent;
            const data = JSON.parse(e.data);
            addEvent(
                data.newStatus === "crashed" ? "error" : "status",
                `${data.name}: ${data.previousStatus} → ${data.newStatus}${data.error ? ` (${data.error})` : ""}`
            );

            if (data.newStatus === "crashed") {
                toast.error(`Agent ${data.name} has crashed!`, {
                    style: {
                        border: "1px solid var(--accent-red)",
                        color: "var(--accent-red)",
                    },
                });
            }

            setHighlightedAgent(data.agentId);
            setTimeout(() => setHighlightedAgent(null), 2000);

            // Optimization: Update state locally instead of fetching all agents
            setAgents((prev) =>
                prev.map((agent) => {
                    if (agent.id === data.agentId) {
                        let newError = agent.lastError;
                        // Use provided error if present
                        if (data.error !== undefined) {
                            newError = data.error;
                        }
                        // Handle manual reset case (crashed -> idle) where error might not be in payload but should be cleared
                        else if (
                            data.previousStatus === "crashed" &&
                            data.newStatus === "idle"
                        ) {
                            newError = null;
                        }

                        return {
                            ...agent,
                            status: data.newStatus,
                            lastCheckedAt: data.timestamp || new Date().toISOString(),
                            lastError: newError,
                        };
                    }
                    return agent;
                })
            );
        });

        es.addEventListener("agent_registered", (event: Event) => {
            const e = event as MessageEvent;
            const data = JSON.parse(e.data);
            addEvent("info", `New agent registered: ${data.name}`);
            fetchAgents();
        });

        es.addEventListener("agent_removed", (event: Event) => {
            const e = event as MessageEvent;
            const data = JSON.parse(e.data);
            addEvent("info", `Agent removed: ${data.name}`);

            // Optimization: Update state locally
            setAgents((prev) => prev.filter((a) => a.id !== data.agentId));
        });

        es.addEventListener("measurement_data", (event: Event) => {
            const e = event as MessageEvent;
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
    const handleStart = useCallback(async (id: string) => {
        if (!token) return;
        try {
            await startAgent(token, id);
            toast.success("Agent started successfully", {
                icon: "▶",
                style: {
                    border: "1px solid var(--accent-blue)",
                    color: "var(--accent-blue)",
                },
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            const msg = `Failed to start: ${message}`;
            addEvent("error", msg);
            toast.error(msg);
        }
    }, [token, addEvent]);

    const handleStop = useCallback(async (id: string) => {
        if (!token) return;
        try {
            await stopAgent(token, id);
            toast.success("Agent stopped successfully", {
                icon: "⏹",
                style: {
                    border: "1px solid var(--accent-amber)",
                    color: "var(--accent-amber)",
                },
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            const msg = `Failed to stop: ${message}`;
            addEvent("error", msg);
            toast.error(msg);
        }
    }, [token, addEvent]);

    const handleReset = useCallback(async (id: string) => {
        if (!token) return;
        try {
            await resetAgent(token, id);
            toast.success("Agent reset command sent", {
                icon: "↻",
                style: {
                    border: "1px solid var(--accent-cyan)",
                    color: "var(--accent-cyan)",
                },
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            const msg = `Failed to reset: ${message}`;
            addEvent("error", msg);
            toast.error(msg);
        }
    }, [token, addEvent]);

    const handleDelete = useCallback(async (id: string) => {
        if (!token) return;
        try {
            await deleteAgent(token, id);
            toast.success("Agent deleted successfully", {
                icon: "✕",
                style: {
                    border: "1px solid var(--accent-red)",
                    color: "var(--accent-red)",
                },
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            const msg = `Failed to delete: ${message}`;
            addEvent("error", msg);
            toast.error(msg);
        }
    }, [token, addEvent]);

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
        <motion.div
            className="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className="dashboard-header">
                <h1>Dashboard</h1>
                <div className="dashboard-stats">
                    <motion.div
                        className="stat-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <span className="stat-value">{agents.length}</span>
                        <span className="stat-label">Agents</span>
                    </motion.div>
                    <motion.div
                        className="stat-card stat-running"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <span className="stat-value">
                            {agents.filter((a) => a.status === "running").length}
                        </span>
                        <span className="stat-label">Running</span>
                    </motion.div>
                    <motion.div
                        className="stat-card stat-error"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <span className="stat-value">
                            {agents.filter((a) => a.status === "crashed" || a.status === "unreachable").length}
                        </span>
                        <span className="stat-label">Issues</span>
                    </motion.div>
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
                            <AnimatePresence>
                                {agents.map((agent) => (
                                    <motion.div
                                        key={agent.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <AgentCard
                                            agent={agent}
                                            isAdmin={isAdmin}
                                            onStart={handleStart}
                                            onStop={handleStop}
                                            onReset={handleReset}
                                            onDelete={handleDelete}
                                            highlight={highlightedAgent === agent.id}
                                        />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </section>

                <section className="dashboard-events">
                    <h2>Live Events</h2>
                    <EventLog events={events} />
                </section>
            </div>
        </motion.div>
    );
}
