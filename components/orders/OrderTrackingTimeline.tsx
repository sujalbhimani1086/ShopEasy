"use client";

type OrderTrackingTimelineProps = {
    status: string;
};

const STAGES = [
    { key: "PENDING", label: "Ordered", icon: "📝" },
    { key: "CONFIRMED", label: "Confirmed", icon: "✓" },
    { key: "PACKED", label: "Packed", icon: "📦" },
    { key: "SHIPPED", label: "Shipped", icon: "🚚" },
    { key: "DELIVERED", label: "Delivered", icon: "🏠" },
];

export default function OrderTrackingTimeline({
    status,
}: OrderTrackingTimelineProps) {
    const upperStatus = (status || "PENDING").toUpperCase();

    if (upperStatus === "CANCELLED") {
        return (
            <div
                style={{
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    margin: "16px 0",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    color: "var(--color-danger, #ef4444)",
                    fontSize: "13px",
                    fontWeight: 600,
                }}
            >
                <span>⚠️</span>
                <span>This order was cancelled.</span>
            </div>
        );
    }

    // Determine current stage index (0 to 4)
    let activeIndex = 0;
    if (upperStatus === "CONFIRMED") activeIndex = 1;
    else if (upperStatus === "PACKED") activeIndex = 2;
    else if (upperStatus === "SHIPPED") activeIndex = 3;
    else if (upperStatus === "DELIVERED" || upperStatus === "COMPLETED") activeIndex = 4;

    return (
        <div
            style={{
                margin: "18px 0 22px",
                padding: "16px",
                background: "var(--color-bg-subtle)",
                borderRadius: "12px",
                border: "1px solid var(--color-border)",
            }}
            aria-label={`Order tracking timeline: Current status is ${upperStatus}`}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    position: "relative",
                    width: "100%",
                }}
            >
                {STAGES.map((stage, idx) => {
                    const isCompleted = idx < activeIndex;
                    const isCurrent = idx === activeIndex;
                    const isUpcoming = idx > activeIndex;

                    return (
                        <div
                            key={stage.key}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                flex: 1,
                                position: "relative",
                                zIndex: 1,
                            }}
                        >
                            {/* Circle Indicator */}
                            <div
                                style={{
                                    width: isCurrent ? "32px" : "26px",
                                    height: isCurrent ? "32px" : "26px",
                                    borderRadius: "50%",
                                    background: isCompleted
                                        ? "#16a34a" // Green
                                        : isCurrent
                                        ? "var(--color-primary, #2563eb)" // Brand blue
                                        : "var(--color-bg-elevated)",
                                    border: isUpcoming
                                        ? "2px solid var(--color-border)"
                                        : "none",
                                    color: isUpcoming ? "var(--color-text-secondary)" : "#ffffff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: isCurrent ? "14px" : "12px",
                                    fontWeight: 700,
                                    boxShadow: isCurrent
                                        ? "0 0 0 4px rgba(37, 99, 235, 0.2)"
                                        : "none",
                                    transition: "all 0.3s ease",
                                }}
                            >
                                {isCompleted ? "✓" : isCurrent ? stage.icon : idx + 1}
                            </div>

                            {/* Label */}
                            <span
                                style={{
                                    marginTop: "6px",
                                    fontSize: "12px",
                                    fontWeight: isCurrent ? 700 : isCompleted ? 600 : 500,
                                    color: isCurrent
                                        ? "var(--color-text)"
                                        : isCompleted
                                        ? "#16a34a"
                                        : "var(--color-text-secondary)",
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {stage.label}
                            </span>
                        </div>
                    );
                })}

                {/* Connecting Progress Line */}
                <div
                    style={{
                        position: "absolute",
                        top: "13px",
                        left: "10%",
                        right: "10%",
                        height: "3px",
                        background: "var(--color-border)",
                        zIndex: 0,
                    }}
                >
                    <div
                        style={{
                            height: "100%",
                            width: `${(activeIndex / (STAGES.length - 1)) * 100}%`,
                            background: activeIndex === 4 ? "#16a34a" : "var(--color-primary, #2563eb)",
                            transition: "width 0.4s ease",
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
