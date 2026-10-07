import React from "react";

export interface LoaderProps {
    size?: "sm" | "md" | "lg";
    text?: string;
    fullPage?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

export default function Loader({
    size = "md",
    text,
    fullPage = false,
    className = "",
    style,
}: LoaderProps) {
    const dimension = size === "sm" ? 20 : size === "lg" ? 44 : 30;
    const borderWidth = size === "sm" ? 2 : size === "lg" ? 4 : 3;

    const content = (
        <div
            className={`loader-wrapper ${className}`.trim()}
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                padding: fullPage ? 0 : "24px",
                ...style,
            }}
        >
            <div
                style={{
                    width: `${dimension}px`,
                    height: `${dimension}px`,
                    border: `${borderWidth}px solid var(--color-border)`,
                    borderTopColor: "var(--color-text)",
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                }}
                aria-label="Loading"
                role="status"
            />
            {text && (
                <p
                    style={{
                        margin: 0,
                        fontSize: size === "sm" ? "0.8125rem" : "0.9375rem",
                        color: "var(--color-text-secondary)",
                        fontWeight: 500,
                    }}
                >
                    {text}
                </p>
            )}
        </div>
    );

    if (fullPage) {
        return (
            <div
                style={{
                    minHeight: "60vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                }}
            >
                {content}
            </div>
        );
    }

    return content;
}
