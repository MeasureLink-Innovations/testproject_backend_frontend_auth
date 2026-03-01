"use client";

interface EventLogEntry {
    id: string;
    type: string;
    message: string;
    timestamp: Date;
}

interface EventLogProps {
    events: EventLogEntry[];
}

export default function EventLog({ events }: EventLogProps) {
    if (events.length === 0) {
        return (
            <div className="event-log-empty">
                <p>No events yet. Events will appear here in real-time.</p>
            </div>
        );
    }

    return (
        <div className="event-log">
            {events.map((event) => (
                <div
                    key={event.id}
                    className={`event-log-item event-${event.type}`}
                >
                    <span className="event-time">
                        {event.timestamp.toLocaleTimeString()}
                    </span>
                    <span className="event-type-badge">{event.type}</span>
                    <span className="event-message">{event.message}</span>
                </div>
            ))}
        </div>
    );
}

export type { EventLogEntry };
