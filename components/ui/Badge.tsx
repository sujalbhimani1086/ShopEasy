import React from "react";

export type BadgeVariant =
    | "default"
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "dark";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    children: React.ReactNode;
    variant?: BadgeVariant;
    className?: string;
}

export default function Badge({
    children,
    variant = "default",
    className = "",
    style,
    ...props
}: BadgeProps) {
    const variantClass = variant === "default" ? "badge-primary" : `badge-${variant}`;

    return (
        <span
            className={`badge ${variantClass} ${className}`.trim()}
            style={style}
            {...props}
        >
            {children}
        </span>
    );
}
