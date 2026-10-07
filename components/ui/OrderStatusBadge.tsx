"use client";

import { getStatusBadgeClass } from "@/lib/utils";

type OrderStatusBadgeProps = {
    status: string;
    className?: string;
    showIcon?: boolean;
};

export default function OrderStatusBadge({
    status,
    className = "",
    showIcon = false,
}: OrderStatusBadgeProps) {
    const badgeClass = getStatusBadgeClass(status);
    const upper = status ? status.toUpperCase() : "UNKNOWN";

    const getIcon = () => {
        switch (upper) {
            case "DELIVERED":
            case "COMPLETED":
                return "✓ ";
            case "CANCELLED":
                return "✕ ";
            case "PENDING":
                return "⏳ ";
            default:
                return "";
        }
    };

    return (
        <span className={`${badgeClass} ${className}`.trim()}>
            {showIcon && getIcon()}
            {upper}
        </span>
    );
}
