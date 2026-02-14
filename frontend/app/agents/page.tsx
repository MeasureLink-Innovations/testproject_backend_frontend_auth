"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import AgentCard from "@/components/AgentCard";
import {
    Agent,
    getAgents,
    registerAgent,
    startAgent,
    stopAgent,
    resetAgent,
    deleteAgent,
} from "@/lib/api";

export default function AgentsPage() {
    const { data: session } = useSession();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState("");
    const [baseUrl, setBaseUrl] = useState("");
    const [registering, setRegistering] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const token = (session as unknown as { accessToken: string })?.accessToken as string | undefined;
    const roles = (session as unknown as { roles: string[] })?.roles as string[] | undefined;
    const isAdmin = roles?.includes("admin") ?? false;

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

    useEffect(() => {
        fetchAgents();
        const interval = setInterval(fetchAgents, 5000);
        return () => clearInterval(interval);
    }, [fetchAgents]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !name || !baseUrl) return;

        setRegistering(true);
        setError(null);

        try {
            await registerAgent(token, name, baseUrl);
            setName("");
            setBaseUrl("");
            await fetchAgents();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
        } finally {
            setRegistering(false);
        }
    };

    const handleAction = useCallback(async (action: (t: string, id: string) => Promise<void>, id: string) => {
        if (!token) return;
        try {
            await action(token, id);
            await fetchAgents();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
        }
    }, [token, fetchAgents]);

    const onStart = useCallback((id: string) => handleAction(startAgent, id), [handleAction]);
    const onStop = useCallback((id: string) => handleAction(stopAgent, id), [handleAction]);
    const onReset = useCallback((id: string) => handleAction(resetAgent, id), [handleAction]);
    const onDelete = useCallback((id: string) => handleAction(deleteAgent, id), [handleAction]);

    if (!session) {
        return (
            <div className="page-unauthenticated">
                <p>Please sign in to manage agents.</p>
            </div>
        );
    }

    return (
        <div className="agents-page">
            <div className="page-header">
                <h1>Agent Management</h1>
            </div>

            {isAdmin && (
                <div className="register-card">
                    <h2>Register New Agent</h2>
                    <form onSubmit={handleRegister} className="register-form">
                        <div className="form-group">
                            <label htmlFor="agent-name">Name</label>
                            <input
                                id="agent-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Lab Sensor 3"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="agent-url">Base URL</label>
                            <input
                                id="agent-url"
                                type="url"
                                value={baseUrl}
                                onChange={(e) => setBaseUrl(e.target.value)}
                                placeholder="e.g. http://measurement-agent-1:5100"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={registering}
                        >
                            {registering ? "Registering..." : "Register Agent"}
                        </button>
                    </form>
                    {error && <p className="form-error">{error}</p>}
                </div>
            )}

            <section className="agents-section">
                <h2>Registered Agents ({agents.length})</h2>
                {loading ? (
                    <div className="spinner" />
                ) : agents.length === 0 ? (
                    <div className="empty-state">
                        <p>No agents registered. Use the form above to add one.</p>
                    </div>
                ) : (
                    <div className="agents-grid">
                        {agents.map((agent) => (
                            <AgentCard
                                key={agent.id}
                                agent={agent}
                                isAdmin={isAdmin}
                                onStart={onStart}
                                onStop={onStop}
                                onReset={onReset}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
