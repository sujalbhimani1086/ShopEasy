"use client";

import React from "react";
import Dropdown from "./Dropdown";

type ProductCountSelectorProps = {
    value: number;
    onChange: (count: number) => void;
    options?: number[];
    prefix?: string;
    suffix?: string;
    disabled?: boolean;
    className?: string;
};

const DEFAULT_OPTIONS = [4, 8, 12, 16, 20, 24, 32, 40, 50];

export default function ProductCountSelector({
    value,
    onChange,
    options = DEFAULT_OPTIONS,
    prefix = "Show",
    suffix = "Products",
    disabled = false,
    className = "",
}: ProductCountSelectorProps) {
    return (
        <div
            className={`product-count-selector ${className}`.trim()}
            style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                justifyContent: "flex-end",
                marginBottom: "15px",
            }}
        >
            {prefix && <span>{prefix}</span>}

            <Dropdown
                value={value}
                disabled={disabled}
                onChange={(val) => onChange(Number(val))}
                options={options}
                style={{
                    width: "90px",
                }}
                aria-label={`${prefix} count ${suffix}`}
            />

            {suffix && <span>{suffix}</span>}
        </div>
    );
}
