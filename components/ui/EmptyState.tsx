import React from "react";
import Link from "next/link";
import Button from "./Button";

export interface EmptyStateProps {
    title: string;
    message?: string;
    description?: string;
    icon?: React.ReactNode;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
    className?: string;
    children?: React.ReactNode;
}

/**
 * Reusable empty state component shown when there's no data.
 * Used for empty cart, no products, no orders, no search results, etc.
 */
export default function EmptyState({
    title,
    message,
    description,
    icon = "📦",
    actionLabel,
    actionHref,
    onAction,
    className = "",
    children,
}: EmptyStateProps) {
    const text = message || description;

    return (
        <div className={`empty-state ${className}`.trim()}>
            {icon && <span className="empty-state-icon">{icon}</span>}
            <h3>{title}</h3>
            {text && <p>{text}</p>}
            {children}
            {actionLabel && (
                actionHref ? (
                    <Link
                        href={actionHref}
                        className="btn btn-primary btn-lg"
                    >
                        {actionLabel}
                    </Link>
                ) : onAction ? (
                    <Button
                        size="lg"
                        variant="primary"
                        onClick={onAction}
                    >
                        {actionLabel}
                    </Button>
                ) : null
            )}
        </div>
    );
}
