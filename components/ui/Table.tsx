import React from "react";
import Loader from "./Loader";

export interface Column<T> {
    key: string;
    header: React.ReactNode;
    render?: (item: T, index: number) => React.ReactNode;
    align?: "left" | "center" | "right";
    width?: string | number;
}

export interface TableProps<T> {
    columns: Column<T>[];
    data: T[];
    keyExtractor: (item: T, index: number) => string | number;
    loading?: boolean;
    emptyText?: string;
    className?: string;
    minWidth?: string | number;
}

export default function Table<T>({
    columns,
    data,
    keyExtractor,
    loading = false,
    emptyText = "No records found.",
    className = "",
    minWidth = "800px",
}: TableProps<T>) {
    return (
        <div
            className={`table-responsive ${className}`.trim()}
            style={{
                width: "100%",
                overflowX: "auto",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-xl)",
                background: "var(--color-bg-elevated)",
            }}
        >
            <table
                style={{
                    width: "100%",
                    minWidth: minWidth,
                    borderCollapse: "collapse",
                    textAlign: "left",
                }}
            >
                <thead>
                    <tr
                        style={{
                            borderBottom: "1px solid var(--color-border)",
                            background: "var(--color-bg-subtle)",
                        }}
                    >
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                style={{
                                    padding: "14px 16px",
                                    fontSize: "0.8125rem",
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.04em",
                                    color: "var(--color-text)",
                                    textAlign: col.align || "left",
                                    width: col.width,
                                }}
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr>
                            <td
                                colSpan={columns.length}
                                style={{
                                    padding: "40px 16px",
                                    textAlign: "center",
                                }}
                            >
                                <Loader text="Loading data..." />
                            </td>
                        </tr>
                    ) : data.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length}
                                style={{
                                    padding: "48px 16px",
                                    textAlign: "center",
                                    color: "var(--color-text-secondary)",
                                    fontSize: "0.9375rem",
                                }}
                            >
                                {emptyText}
                            </td>
                        </tr>
                    ) : (
                        data.map((item, index) => (
                            <tr
                                key={keyExtractor(item, index)}
                                style={{
                                    borderBottom: "1px solid var(--color-border)",
                                    transition: "background 0.15s ease",
                                }}
                            >
                                {columns.map((col) => (
                                    <td
                                        key={col.key}
                                        style={{
                                            padding: "14px 16px",
                                            verticalAlign: "middle",
                                            textAlign: col.align || "left",
                                            color: "var(--color-text)",
                                            fontSize: "0.875rem",
                                        }}
                                    >
                                        {col.render
                                            ? col.render(item, index)
                                            : ((item as Record<string, unknown>)[col.key] as React.ReactNode)}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
