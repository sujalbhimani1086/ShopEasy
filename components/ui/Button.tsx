import React from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    loading?: boolean;
}

export default function Button({
    children,
    type = "button",
    variant = "primary",
    size = "md",
    fullWidth = false,
    loading = false,
    disabled = false,
    className = "",
    ...props
}: ButtonProps) {
    const variantClass = variant === "outline" ? "btn-secondary" : `btn-${variant}`;
    const sizeClass = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";
    const fullClass = fullWidth ? "btn-full" : "";

    const combinedClassName = [
        "btn",
        variantClass,
        sizeClass,
        fullClass,
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <button
            type={type}
            className={combinedClassName}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <span
                        style={{
                            display: "inline-block",
                            width: "14px",
                            height: "14px",
                            border: "2px solid currentColor",
                            borderRightColor: "transparent",
                            borderRadius: "50%",
                            animation: "spin 0.7s linear infinite",
                        }}
                    />
                    <span>{children}</span>
                </span>
            ) : (
                children
            )}
        </button>
    );
}
