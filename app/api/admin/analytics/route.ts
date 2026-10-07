import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import type { OrderStatusChartPoint, SalesChartPoint } from "@/lib/types";

const MONTH_NAMES = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];

function buildDailySales(
    orders: Array<{ createdAt: Date | string; total: number; status: string }>
): SalesChartPoint[] {
    const validOrders = orders.filter((o) => o.status !== "CANCELLED");

    // Display a clean recent window of 14 days up to today + 2 days ahead
    // so the daily chart always starts at 0, shows recent activity, and returns to 0
    const today = new Date();
    const startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 13,
        12,
        0,
        0
    );
    const endDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 2,
        12,
        0,
        0
    );

    // Sum sales by date string "YYYY-MM-DD"
    const salesByDay = new Map<string, number>();
    validOrders.forEach((o) => {
        const d = new Date(o.createdAt);
        const yr = d.getFullYear();
        const moStr = String(d.getMonth() + 1).padStart(2, "0");
        const dayStr = String(d.getDate()).padStart(2, "0");
        const key = `${yr}-${moStr}-${dayStr}`;
        salesByDay.set(key, (salesByDay.get(key) || 0) + (o.total || 0));
    });

    const result: SalesChartPoint[] = [];
    const cur = new Date(startDate);
    while (cur <= endDate) {
        const yr = cur.getFullYear();
        const mo = cur.getMonth();
        const moStr = String(mo + 1).padStart(2, "0");
        const day = cur.getDate();
        const dayStr = String(day).padStart(2, "0");
        const key = `${yr}-${moStr}-${dayStr}`;

        const monthShort = MONTH_NAMES[mo] || "";
        const label = `${monthShort} ${day}`;
        result.push({
            label,
            sales: salesByDay.get(key) || 0,
        });

        cur.setDate(cur.getDate() + 1);
    }

    return result;
}

function buildYearlySales(
    orders: Array<{ createdAt: Date | string; total: number; status: string }>
): SalesChartPoint[] {
    const validOrders = orders.filter((o) => o.status !== "CANCELLED");
    const currentYear = new Date().getFullYear();
    const orderYears = validOrders
        .map((o) => new Date(o.createdAt).getFullYear())
        .filter((yr) => !Number.isNaN(yr));

    const minYear =
        orderYears.length > 0 ? Math.min(...orderYears, currentYear) : currentYear;
    const maxYear =
        orderYears.length > 0 ? Math.max(...orderYears, currentYear) : currentYear;

    // Start 1 year before earliest order and end 1 year after latest
    const startYear = Math.min(minYear - 1, currentYear - 2);
    const endYear = Math.max(maxYear + 1, currentYear + 1);

    const result: SalesChartPoint[] = [];
    for (let yr = startYear; yr <= endYear; yr++) {
        const yearSales = validOrders
            .filter((o) => new Date(o.createdAt).getFullYear() === yr)
            .reduce((sum, o) => sum + (o.total || 0), 0);

        result.push({
            label: String(yr),
            sales: yearSales,
        });
    }

    return result;
}

export async function GET(request: Request) {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type"); // "status" | "sales" | null
        const statusParam = (searchParams.get("status") || "ALL").toUpperCase();
        const periodParam = (searchParams.get("period") || "date").toLowerCase();

        // Query all orders from SQL Server database
        const orders = await prisma.order.findMany({
            select: {
                id: true,
                total: true,
                status: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: "asc",
            },
        });

        // ── 1. Status Analytics Handler ──
        if (type === "status") {
            const pendingCount = orders.filter((o) => o.status === "PENDING").length;
            const completedCount = orders.filter((o) => o.status === "COMPLETED").length;
            const deliveredCount = orders.filter((o) => o.status === "DELIVERED").length;

            let statusData: OrderStatusChartPoint[] = [];

            if (statusParam === "PENDING") {
                statusData = [{ label: "Pending", count: pendingCount }];
            } else if (statusParam === "COMPLETED") {
                statusData = [{ label: "Completed", count: completedCount }];
            } else if (statusParam === "DELIVERED") {
                statusData = [{ label: "Delivered", count: deliveredCount }];
            } else {
                // "ALL" - show breakdown of all statuses
                statusData = [
                    { label: "Pending", count: pendingCount },
                    { label: "Completed", count: completedCount },
                    { label: "Delivered", count: deliveredCount },
                ];
            }

            return Response.json(statusData, {
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate",
                },
            });
        }

        // ── 2. Sales Analytics Handler ──
        if (type === "sales") {
            let salesData: SalesChartPoint[] = [];

            if (periodParam === "month") {
                // Month-wise sales (Jan - Dec of current year)
                const currentYear = new Date().getFullYear();
                const yearOrders = orders.filter((o) => {
                    const yr = new Date(o.createdAt).getFullYear();
                    return yr === currentYear;
                });

                salesData = MONTH_NAMES.map((name, index) => {
                    const monthOrders = yearOrders.filter((o) => {
                        const d = new Date(o.createdAt);
                        return d.getMonth() === index;
                    });

                    const sales = monthOrders
                        .filter((o) => o.status !== "CANCELLED")
                        .reduce((sum, o) => sum + (o.total || 0), 0);

                    return { label: name, sales };
                });
            } else if (periodParam === "year") {
                salesData = buildYearlySales(orders);
            } else {
                salesData = buildDailySales(orders);
            }

            return Response.json(salesData, {
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate",
                },
            });
        }

        // ── 3. Combined Initial Load Handler (if no type is specified) ──
        const pendingCount = orders.filter((o) => o.status === "PENDING").length;
        const completedCount = orders.filter((o) => o.status === "COMPLETED").length;
        const deliveredCount = orders.filter((o) => o.status === "DELIVERED").length;

        const statusData: OrderStatusChartPoint[] = [
            { label: "Pending", count: pendingCount },
            { label: "Completed", count: completedCount },
            { label: "Delivered", count: deliveredCount },
        ];

        const salesData = buildDailySales(orders);

        return Response.json(
            { statusData, salesData },
            {
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate",
                },
            }
        );
    } catch (error) {
        console.error("ADMIN ANALYTICS ERROR:", error);
        return Response.json(
            { message: "Failed to fetch analytics data" },
            { status: 500 }
        );
    }
}
