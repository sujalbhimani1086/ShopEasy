"use client";

import { useEffect, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { formatPrice } from "@/lib/utils";
import type { OrderStatusChartPoint, SalesChartPoint } from "@/lib/types";

// ORDER STATUS BAR CHART

interface OrderStatusChartProps {
    data: OrderStatusChartPoint[];
}

function OrderStatusTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
}) {
    if (active && payload?.length) {
        const count = payload[0].value ?? 0;

        return (
            <div className="analytics-tooltip">
                <p className="analytics-tooltip-label">{label}</p>
                <p className="analytics-tooltip-count">
                    {count} {count === 1 ? "order" : "orders"}
                </p>
            </div>
        );
    }

    return null;
}

export function OrderStatusChart({ data }: OrderStatusChartProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="analytics-chart-placeholder">
                Loading orders chart...
            </div>
        );
    }

    if (!data?.length) {
        return (
            <div className="analytics-chart-placeholder">
                No order data available.
            </div>
        );
    }

    return (
        <div className="analytics-chart-wrapper">
            <ResponsiveContainer width="100%" height={360}>
                <BarChart
                    data={data}
                    margin={{ top: 16, right: 20, left: 8, bottom: 12 }}
                >
                    <CartesianGrid
                        vertical={false}
                        stroke="var(--color-border, #e5e7eb)"
                        strokeDasharray="3 3"
                    />

                    <XAxis
                        dataKey="label"
                        tickLine={false}
                        fontSize={12}
                        stroke="var(--color-text-secondary, #6b7280)"
                    />

                    <YAxis
                        domain={[0, "auto"]}
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                        stroke="var(--color-text-secondary, #6b7280)"
                    />

                    <Tooltip content={<OrderStatusTooltip />} />

                    <Bar
                        dataKey="count"
                        fill="#3b82f6"
                        radius={[5, 5, 0, 0]}
                        maxBarSize={56}
                        isAnimationActive={true}
                        animationBegin={0}
                        animationDuration={1200}
                        animationEasing="ease-in-out"
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// SALES LINE CHART

interface SalesTrendChartProps {
    data: SalesChartPoint[];
}

function SalesTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
}) {
    if (active && payload?.length) {
        return (
            <div className="analytics-tooltip">
                <p className="analytics-tooltip-label">{label}</p>
                <p className="analytics-tooltip-sales">
                    Sales Revenue: {formatPrice(payload[0].value ?? 0)}
                </p>
            </div>
        );
    }

    return null;
}

export function SalesTrendChart({ data }: SalesTrendChartProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="analytics-chart-placeholder">
                Loading sales chart...
            </div>
        );
    }

    if (!data?.length) {
        return (
            <div className="analytics-chart-placeholder">
                No sales data recorded.
            </div>
        );
    }

    const chartData = data.map((item) => ({
        ...item,
        sales: Math.max(0, Number(item.sales) || 0),
    }));

    return (
        <div
            className="analytics-chart-wrapper"
            style={{
                height: 380,
                width: "100%",
                minWidth: 0,
            }}
        >
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={{ top: 16, right: 20, left: 12, bottom: 12 }}
                >
                    <CartesianGrid
                        vertical={false}
                        stroke="var(--color-border, #e5e7eb)"
                        strokeDasharray="3 3"
                    />

                    <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={{
                            stroke: "var(--color-border, #e5e7eb)",
                        }}
                        tick={{
                            fontSize: 12,
                            fill: "var(--color-text-secondary, #6b7280)",
                        }}
                        interval="preserveStartEnd"
                        minTickGap={12}
                    />

                    <YAxis
                        domain={[0, "auto"]}
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        width={68}
                        tick={{
                            fontSize: 11,
                            fill: "var(--color-text-secondary, #6b7280)",
                        }}
                        tickFormatter={(value: number) =>
                            formatPrice(value)
                        }
                    />

                    <Tooltip content={<SalesTooltip />} />

                    <Line
                        type="monotone"
                        dataKey="sales"
                        name="Sales Revenue"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#10b981" }}
                        activeDot={{ r: 6 }}
                        connectNulls
                        isAnimationActive={true}
                        animationBegin={0}
                        animationDuration={1800}
                        animationEasing="ease-in-out"
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}