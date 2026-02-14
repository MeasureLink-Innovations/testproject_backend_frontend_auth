"use client";

import StatusBadge from "./StatusBadge";
import type { Agent } from "@/lib/api";

interface AgentCardProps {
    agent: Agent;
    isAdmin: boolean;
    onStart: (id: string) => void;
    onStop: (id: string) => void;
    onReset: (id: string) => void;
    onDelete: (id: string) => void;
    highlight?: boolean;
}

export default function AgentCard({
    agent,
    isAdmin,
    onStart,
    onStop,
    onReset,
    onDelete,
    highlight,
}: AgentCardProps) {
    return (
        <div className={`agent-card ${highlight ? "agent-card-highlight" : ""}`}>
            <div className="agent-card-header">
                <div className="agent-card-title">
                    <h3>{agent.name}</h3>
                    <StatusBadge status={agent.status} />
                </div>
                <span className="agent-card-url">{agent.baseUrl}</span>
            </div>

            <div className="agent-card-meta">
                <div className="meta-item">
                    <span className="meta-label">Created</span>
                    <span className="meta-value">
                        {new Date(agent.createdAt).toLocaleString()}
                    </span>
                </div>
                <div className="meta-item">
                    <span className="meta-label">Last Check</span>
                    <span className="meta-value">
                        {new Date(agent.lastCheckedAt).toLocaleString()}
                    </span>
                </div>
                {agent.lastError && (
                    <div className="meta-item meta-error">
                        <span className="meta-label">Error</span>
                        <span className="meta-value">{agent.lastError}</span>
                    </div>
                )}
            </div>

            {isAdmin && (
                <div className="agent-card-actions">
                    {(agent.status === "idle" || agent.status === "unknown") && (
                        <button
                            className="btn btn-success btn-sm"
                            onClick={() => onStart(agent.id)}
                        >
                            ▶ Start
                        </button>
                    )}
                    {agent.status === "running" && (
                        <button
                            className="btn btn-warning btn-sm"
                            onClick={() => onStop(agent.id)}
                        >
                            ⏹ Stop
                        </button>
                    )}
                    {(agent.status === "crashed" || agent.status === "unreachable") && (
                        <button
                            className="btn btn-info btn-sm"
                            onClick={() => onReset(agent.id)}
                        >
                            ↻ Reset
                        </button>
                    )}
                    <button
                        className="btn btn-danger btn-sm"
                        onClick={() => onDelete(agent.id)}
                    >
                        ✕ Remove
                    </button>
                </div>
            )}
        </div>
    );
}
