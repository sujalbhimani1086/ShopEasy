"use client";

import React from "react";

export interface SearchBoxProps {
    value: string;
    onChange: (value: string, event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    onClear?: () => void;
    className?: string;
    disabled?: boolean;
    autoFocus?: boolean;
    style?: React.CSSProperties;
}

export default function SearchBox({
    value,
    onChange,
    placeholder = "Search...",
    onClear,
    className = "",
    disabled = false,
    autoFocus = false,
    style,
}: SearchBoxProps) {
    const handleClear = () => {
        if (onClear) {
            onClear();
        } else {
            onChange("", { target: { value: "" } } as React.ChangeEvent<HTMLInputElement>);
        }
    };

    return (
        <div
            className={`search-box-container ${className}`.trim()}
            style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                width: "100%",
                ...style,
            }}
        >
            <span
                style={{
                    position: "absolute",
                    left: "14px",
                    color: "var(--color-text-secondary)",
                    pointerEvents: "none",
                    display: "flex",
                    alignItems: "center",
                    fontSize: "14px",
                }}
            >
                🔍
            </span>
            <input
                type="text"
                className="form-input"
                value={value}
                onChange={(e) => onChange(e.target.value, e)}
                placeholder={placeholder}
                disabled={disabled}
                autoFocus={autoFocus}
                style={{
                    paddingLeft: "40px",
                    paddingRight: value ? "36px" : "14px",
                    width: "100%",
                }}
            />
            {value && (
                <button
                    type="button"
                    onClick={handleClear}
                    aria-label="Clear search"
                    style={{
                        position: "absolute",
                        right: "12px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--color-text-secondary)",
                        padding: "2px 6px",
                        fontSize: "12px",
                        lineHeight: 1,
                        borderRadius: "50%",
                        transition: "color var(--transition-fast), transform var(--transition-fast)",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = "var(--color-text)";
                        e.currentTarget.style.transform = "scale(1.15)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--color-text-secondary)";
                        e.currentTarget.style.transform = "scale(1)";
                    }}
                >
                    ✕
                </button>
            )}
        </div>
    );
}
