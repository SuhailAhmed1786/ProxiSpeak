const weeks = [
    {
        label: "Week 1 — Signaling & Movement",
        status: "done",
        items: [
            "Canvas world + avatar rendering",
            "Keyboard movement (WASD/arrows)",
            "Socket.io connection",
            "player:join / player:move / player:leave",
            "Multiple players visible",
            "MongoDB player schema + cleanup",
        ],
    },
    {
        label: "Week 2 — Proximity + WebRTC",
        status: "in-progress",
        items: [
            "MongoDB $near proximity queries",
            "100px radius offer/answer logic",
            "WebRTC peer connections (getUserMedia)",
        ],
    },
    {
        label: "Week 3 — Mesh Scaling + Audio",
        status: "todo",
        items: [
            "Redis Pub/Sub for Socket.io scaling",
            "Web Audio API volume attenuation",
        ],
    },
    {
        label: "Week 4 — Persistence + Polish",
        status: "todo",
        items: [
            "Room/layout + obstacle persistence",
            "3D audio panning",
            "60 FPS canvas polish",
        ],
    },
];

const statusStyles = {
    done: { color: "#22c55e", label: "✓ Done" },
    "in-progress": { color: "#eab308", label: "In Progress" },
    todo: { color: "#6b7280", label: "To Do" },
};

const ProgressTracker = () => {
    return (
        <div
            style={{
                fontFamily: "Arial",
                maxWidth: 480,
                margin: "20px auto",
                color: "#e5e7eb",
            }}
        >
            <h2 style={{ marginBottom: 16 }}>ProxiSpeak — Progress</h2>
            {weeks.map((week) => (
                <div
                    key={week.label}
                    style={{
                        border: "1px solid #374151",
                        borderRadius: 8,
                        padding: "12px 16px",
                        marginBottom: 12,
                        background: "#111827",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 8,
                        }}
                    >
                        <strong>{week.label}</strong>
                        <span
                            style={{
                                color: statusStyles[week.status].color,
                                fontSize: 13,
                                fontWeight: "bold",
                            }}
                        >
                            {statusStyles[week.status].label}
                        </span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>
                        {week.items.map((item) => (
                            <li key={item} style={{ marginBottom: 4 }}>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
};

export default ProgressTracker;