"use client";

import { useState, memo } from "react";
import StatusBadge from "./StatusBadge";
import type { Agent } from "@/lib/api";

interface AgentCardProps {
    agent: Agent;
    isAdmin: boolean;
    onStart: (id: string) => Promise<void> | void;
    onStop: (id: string) => Promise<void> | void;
    onReset: (id: string) => Promise<void> | void;
    onDelete: (id: string) => Promise<void> | void;
    highlight?: boolean;
}

function AgentCard({
    agent,
    isAdmin,
    onStart,
    onStop,
    onReset,
    onDelete,
    highlight,
}: AgentCardProps) {
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    const handleAction = async (
        action: string,
        handler: (id: string) => Promise<void> | void
    ) => {
        if (loadingAction) return;
        setLoadingAction(action);
        try {
            await handler(agent.id);
        } finally {
            setLoadingAction(null);
        }
    };

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
                            onClick={() => handleAction("start", onStart)}
                            disabled={loadingAction !== null}
                            aria-label={`Start agent ${agent.name}`}
                        >
                            {loadingAction === "start" ? "Starting..." : "▶ Start"}
                        </button>
                    )}
                    {agent.status === "running" && (
                        <button
                            className="btn btn-warning btn-sm"
                            onClick={() => handleAction("stop", onStop)}
                            disabled={loadingAction !== null}
                            aria-label={`Stop agent ${agent.name}`}
                        >
                            {loadingAction === "stop" ? "Stopping..." : "⏹ Stop"}
                        </button>
                    )}
                    {(agent.status === "crashed" || agent.status === "unreachable") && (
                        <button
                            className="btn btn-info btn-sm"
                            onClick={() => handleAction("reset", onReset)}
                            disabled={loadingAction !== null}
                            aria-label={`Reset agent ${agent.name}`}
                        >
                            {loadingAction === "reset" ? "Resetting..." : "↻ Reset"}
                        </button>
                    )}
                    <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleAction("delete", onDelete)}
                        disabled={loadingAction !== null}
                        aria-label={`Remove agent ${agent.name}`}
                    >
                        {loadingAction === "delete" ? "Removing..." : "✕ Remove"}
                    </button>
                </div>
            )}
        </div>
    );
}

function arePropsEqual(prev: AgentCardProps, next: AgentCardProps) {
    if (
        prev.isAdmin !== next.isAdmin ||
        prev.highlight !== next.highlight ||
        prev.onStart !== next.onStart ||
        prev.onStop !== next.onStop ||
        prev.onReset !== next.onReset ||
        prev.onDelete !== next.onDelete
    ) {
        return false;
    }

    const prevAgent = prev.agent as unknown as Record<string, unknown>;
    const nextAgent = next.agent as unknown as Record<string, unknown>;

    const prevKeys = Object.keys(prevAgent);
    const nextKeys = Object.keys(nextAgent);

    if (prevKeys.length !== nextKeys.length) {
        return false;
    }

    for (const key of prevKeys) {
        if (prevAgent[key] !== nextAgent[key]) {
            return false;
        }
    }

    return true;
}

export default memo(AgentCard, arePropsEqual);
