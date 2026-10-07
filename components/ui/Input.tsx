import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export default function Input({
    label,
    error,
    helperText,
    id,
    className = "",
    disabled = false,
    ...props
}: InputProps) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
            {label && (
                <label
                    htmlFor={id}
                    className="form-label"
                    style={{
                        marginBottom: 0,
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "var(--color-text)",
                    }}
                >
                    {label}
                    {props.required && <span style={{ color: "var(--color-danger)", marginLeft: "4px" }}>*</span>}
                </label>
            )}
            <input
                id={id}
                className={`form-input ${className}`.trim()}
                disabled={disabled}
                style={{
                    borderColor: error ? "var(--color-danger)" : undefined,
                    ...props.style,
                }}
                {...props}
            />
            {error && (
                <span style={{ fontSize: "0.75rem", color: "var(--color-danger)", marginTop: "2px" }}>
                    {error}
                </span>
            )}
            {!error && helperText && (
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: "2px" }}>
                    {helperText}
                </span>
            )}
        </div>
    );
}
