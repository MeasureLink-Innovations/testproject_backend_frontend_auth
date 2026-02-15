"use client";

import { motion, AnimatePresence } from "framer-motion";

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
            <AnimatePresence initial={false}>
                {events.map((event) => (
                    <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`event-log-item event-${event.type}`}
                    >
                        <span className="event-time">
                            {event.timestamp.toLocaleTimeString()}
                        </span>
                        <span className="event-type-badge">{event.type}</span>
                        <span className="event-message">{event.message}</span>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

export type { EventLogEntry };
