import React from "react";

export type DropdownOption = {
    label: string;
    value: string | number;
};

export interface DropdownProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> {
    options: (DropdownOption | string | number)[];
    value?: string | number;
    onChange: (value: string, event: React.ChangeEvent<HTMLSelectElement>) => void;
    placeholder?: string;
    label?: string;
    className?: string;
}

export default function Dropdown({
    options,
    value,
    onChange,
    placeholder,
    label,
    id,
    disabled = false,
    className = "",
    style,
    ...props
}: DropdownProps) {
    const formattedOptions: DropdownOption[] = options.map((opt) =>
        typeof opt === "object" && opt !== null && "value" in opt
            ? opt
            : { label: String(opt), value: opt }
    );

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange(e.target.value, e);
    };

    return (
        <div style={{ display: "inline-flex", flexDirection: "column", gap: "6px", width: style?.width ? undefined : "auto" }}>
            {label && (
                <label htmlFor={id} className="form-label" style={{ marginBottom: 0 }}>
                    {label}
                </label>
            )}
            <select
                id={id}
                className={`dropdown-select form-select ${className}`.trim()}
                value={value}
                disabled={disabled}
                onChange={handleChange}
                style={{
                    backgroundColor: "#1a1a1a",
                    color: "#ffffff",
                    borderColor: "#444444",
                    ...style,
                }}
                {...props}
            >
                {placeholder && (
                    <option value="" style={{ backgroundColor: "#1a1a1a", color: "#ffffff" }}>
                        {placeholder}
                    </option>
                )}
                {formattedOptions.map((opt) => (
                    <option
                        key={opt.value}
                        value={opt.value}
                        style={{ backgroundColor: "#1a1a1a", color: "#ffffff" }}
                    >
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
