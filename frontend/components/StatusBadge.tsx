"use client";

interface StatusBadgeProps {
    status: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    idle: { label: "Idle", className: "status-idle" },
    running: { label: "Running", className: "status-running" },
    crashed: { label: "Crashed", className: "status-crashed" },
    unreachable: { label: "Unreachable", className: "status-unreachable" },
    unknown: { label: "Unknown", className: "status-unknown" },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;

    return (
        <span className={`status-badge ${config.className}`}>
            <span className="status-dot" />
            {config.label}
        </span>
    );
}
