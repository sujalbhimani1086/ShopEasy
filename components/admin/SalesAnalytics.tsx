"use client";

import { useCallback, useEffect, useState } from "react";
import { OrderStatusChart, SalesTrendChart } from "@/components/admin/SalesChart";
import Skeleton from "@/components/ui/Skeleton";
import type {
    OrderStatusChartPoint,
    OrderStatusFilter,
    SalesChartPoint,
    SalesPeriodFilter,
} from "@/lib/types";

export default function SalesAnalytics() {
    // ── 1. Order Status Chart State ──
    const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("ALL");
    const [statusData, setStatusData] = useState<OrderStatusChartPoint[]>([]);
    const [statusLoading, setStatusLoading] = useState<boolean>(true);

    // ── 2. Sales Trend Chart State ──
    const [salesPeriod, setSalesPeriod] = useState<SalesPeriodFilter>("date");
    const [salesData, setSalesData] = useState<SalesChartPoint[]>([]);
    const [salesLoading, setSalesLoading] = useState<boolean>(true);

    // ==========================================
    // FETCH ORDER STATUS DATA
    // ==========================================
    const fetchStatusData = useCallback(async (status: OrderStatusFilter) => {
        setStatusLoading(true);
        try {
            const res = await fetch(`/api/admin/analytics?type=status&status=${status}`, {
                method: "GET",
                cache: "no-store",
            });
            if (res.ok) {
                const data: OrderStatusChartPoint[] = await res.json();
                setStatusData(data);
            }
        } catch (error) {
            console.error("STATUS ANALYTICS FETCH ERROR:", error);
        } finally {
            setStatusLoading(false);
        }
    }, []);

    // ==========================================
    // FETCH SALES DATA
    // ==========================================
    const fetchSalesData = useCallback(async (period: SalesPeriodFilter) => {
        setSalesLoading(true);
        try {
            const res = await fetch(`/api/admin/analytics?type=sales&period=${period}`, {
                method: "GET",
                cache: "no-store",
            });
            if (res.ok) {
                const data: SalesChartPoint[] = await res.json();
                setSalesData(data);
            }
        } catch (error) {
            console.error("SALES ANALYTICS FETCH ERROR:", error);
        } finally {
            setSalesLoading(false);
        }
    }, []);

    // Trigger status fetch on statusFilter change
    useEffect(() => {
        void fetchStatusData(statusFilter);
    }, [statusFilter, fetchStatusData]);

    // Trigger sales fetch on salesPeriod change
    useEffect(() => {
        void fetchSalesData(salesPeriod);
    }, [salesPeriod, fetchSalesData]);

    // Refetch when orders are modified in Order Management
    useEffect(() => {
        const handleOrdersUpdated = () => {
            void fetchStatusData(statusFilter);
            void fetchSalesData(salesPeriod);
        };

        window.addEventListener("ordersUpdated", handleOrdersUpdated);
        return () => {
            window.removeEventListener("ordersUpdated", handleOrdersUpdated);
        };
    }, [statusFilter, salesPeriod, fetchStatusData, fetchSalesData]);

    // Dynamic title for Sales Chart
    const salesTitle =
        salesPeriod === "month"
            ? "Monthly Sales"
            : salesPeriod === "year"
              ? "Yearly Sales"
              : "Daily Sales";

    return (
        <div className="analytics-two-charts-container">
            {/* ==================================================
                1. ORDER STATUS CHART CARD
            ================================================== */}
            <div className="analytics-card">
                <div className="analytics-card-header">
                    <h3 className="analytics-card-title">Orders by Status</h3>

                    <div className="analytics-control-group">
                        <label
                            htmlFor="order-status-select"
                            className="analytics-control-label"
                        >
                            Order Status:
                        </label>
                        <select
                            id="order-status-select"
                            className="analytics-dropdown"
                            value={statusFilter}
                            onChange={(e) =>
                                setStatusFilter(e.target.value as OrderStatusFilter)
                            }
                        >
                            <option value="ALL">All Orders</option>
                            <option value="PENDING">Pending</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="DELIVERED">Delivered</option>
                        </select>
                    </div>
                </div>

                <div className="analytics-card-body">
                    {statusLoading ? (
                        <div
                            className="analytics-chart-placeholder"
                            aria-busy="true"
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                                gap: "20px",
                                width: "100%",
                                minHeight: "320px",
                                padding: "24px",
                            }}
                        >
                            <Skeleton
                                variant="circle"
                                width="180px"
                                height="180px"
                            />
                            <div
                                style={{
                                    display: "flex",
                                    gap: "16px",
                                    flexWrap: "wrap",
                                    justifyContent: "center",
                                }}
                            >
                                <Skeleton
                                    variant="text"
                                    width="70px"
                                    height="16px"
                                />
                                <Skeleton
                                    variant="text"
                                    width="70px"
                                    height="16px"
                                />
                                <Skeleton
                                    variant="text"
                                    width="70px"
                                    height="16px"
                                />
                            </div>
                        </div>
                    ) : (
                        <OrderStatusChart data={statusData} />
                    )}
                </div>
            </div>

            {/* ==================================================
                2. SALES ANALYTICS LINE CHART CARD
            ================================================== */}
            <div className="analytics-card">
                <div className="analytics-card-header">
                    <h3 className="analytics-card-title">{salesTitle}</h3>

                    <div className="analytics-control-group">
                        <label
                            htmlFor="sales-period-select"
                            className="analytics-control-label"
                        >
                            View By:
                        </label>
                        <select
                            id="sales-period-select"
                            className="analytics-dropdown"
                            value={salesPeriod}
                            onChange={(e) =>
                                setSalesPeriod(e.target.value as SalesPeriodFilter)
                            }
                        >
                            <option value="date">Date</option>
                            <option value="month">Month</option>
                            <option value="year">Year</option>
                        </select>
                    </div>
                </div>

                <div className="analytics-card-body">
                    {salesLoading ? (
                        <div
                            className="analytics-chart-placeholder"
                            aria-busy="true"
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "flex-end",
                                gap: "16px",
                                width: "100%",
                                minHeight: "320px",
                                padding: "24px",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "flex-end",
                                    justifyContent: "space-between",
                                    height: "220px",
                                    gap: "12px",
                                    width: "100%",
                                }}
                            >
                                {[35, 60, 45, 85, 50, 95, 70, 60].map((h, i) => (
                                    <Skeleton
                                        key={i}
                                        variant="card"
                                        width="10%"
                                        height={`${h}%`}
                                        borderRadius="4px"
                                    />
                                ))}
                            </div>
                            <Skeleton
                                variant="text"
                                width="100%"
                                height="16px"
                            />
                        </div>
                    ) : (
                        <SalesTrendChart data={salesData} />
                    )}
                </div>
            </div>
        </div>
    );
}
