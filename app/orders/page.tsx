"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import PageLayout from "@/components/layout/PageLayout";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import OrderStatusBadge from "@/components/ui/OrderStatusBadge";
import Skeleton from "@/components/ui/Skeleton";
import Pagination from "@/components/ui/Pagination";
import ProductCountSelector from "@/components/ui/ProductCountSelector";

import {
    FALLBACK_IMAGE,
    formatDate,
    formatPrice,
    normalizeImageSrc,
} from "@/lib/utils";
import type { Order } from "@/lib/types";

const ORDERS_PER_PAGE_OPTIONS = [5, 10, 15, 20];
const DEFAULT_ORDERS_PER_PAGE = 10;

export default function OrdersPage() {
    const router = useRouter();

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalOrders, setTotalOrders] = useState(0);
    const [ordersPerPage, setOrdersPerPage] = useState(DEFAULT_ORDERS_PER_PAGE);

    const currentPageRef = useRef(currentPage);
    currentPageRef.current = currentPage;

    const ordersPerPageRef = useRef(ordersPerPage);
    ordersPerPageRef.current = ordersPerPage;

    // ==========================================
    // FETCH ORDERS (SERVER-SIDE PAGINATED)
    // ==========================================

    const fetchOrders = useCallback(
        async (
            pageToFetch = currentPageRef.current,
            limitToFetch = ordersPerPageRef.current,
            showLoading = false
        ) => {
            if (showLoading) {
                setLoading(true);
            }

            try {
                const response = await fetch(
                    `/api/orders?page=${pageToFetch}&limit=${limitToFetch}`,
                    {
                        method: "GET",
                        cache: "no-store",
                    }
                );

                // Login required
                if (response.status === 401) {
                    router.push("/login");
                    return;
                }

                // Approval required
                if (response.status === 403) {
                    router.push("/register/pending");
                    return;
                }

                if (!response.ok) {
                    setOrders([]);
                    setTotalOrders(0);
                    setTotalPages(1);
                    return;
                }

                const data = await response.json();

                if (data && Array.isArray(data.orders)) {
                    const total = data.total ?? 0;
                    const pages = data.totalPages ?? 1;

                    setTotalOrders(total);
                    setTotalPages(pages);

                    // Safety: if the current page no longer exists after deletions
                    if (total > 0 && pageToFetch > pages) {
                        setCurrentPage(pages);
                        return;
                    }

                    setOrders(data.orders);
                } else if (Array.isArray(data)) {
                    // Backward-compatible fallback
                    setOrders(data);
                    setTotalOrders(data.length);
                    setTotalPages(Math.max(1, Math.ceil(data.length / limitToFetch)));
                } else {
                    setOrders([]);
                    setTotalOrders(0);
                    setTotalPages(1);
                }
            } catch (error) {
                console.error("FETCH ORDERS ERROR:", error);
            } finally {
                if (showLoading) {
                    setLoading(false);
                }
            }
        },
        [router]
    );

    const handleOrdersPerPageChange = (newCount: number) => {
        setOrdersPerPage(newCount);
        setCurrentPage(1);
    };

    // ==========================================
    // PAGE & LIMIT CHANGE EFFECT
    // ==========================================

    useEffect(() => {
        void fetchOrders(currentPage, ordersPerPage, true);
    }, [currentPage, ordersPerPage, fetchOrders]);

    // ==========================================
    // INITIAL AUTH CHECK + AUTO REFRESH
    // ==========================================

    useEffect(() => {
        const user = localStorage.getItem("user");
        if (!user) {
            router.push("/login");
            return;
        }

        // Refresh every 5 seconds
        const interval = setInterval(() => {
            void fetchOrders(currentPageRef.current, ordersPerPageRef.current, false);
        }, 5000);

        // Refresh when customer comes back to this browser tab
        function handleVisibility() {
            if (document.visibilityState === "visible") {
                void fetchOrders(currentPageRef.current, ordersPerPageRef.current, false);
            }
        }

        document.addEventListener("visibilitychange", handleVisibility);

        // Refresh when browser gets focus
        function handleFocus() {
            void fetchOrders(currentPageRef.current, ordersPerPageRef.current, false);
        }

        window.addEventListener("focus", handleFocus);

        // Refresh if another part of the application announces an order update
        function handleOrdersUpdated() {
            void fetchOrders(currentPageRef.current, ordersPerPageRef.current, false);
        }

        window.addEventListener("ordersUpdated", handleOrdersUpdated);

        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", handleVisibility);
            window.removeEventListener("focus", handleFocus);
            window.removeEventListener("ordersUpdated", handleOrdersUpdated);
        };
    }, [router, fetchOrders]);

    // ==========================================
    // RENDER SHORT ORDER LISTING
    // ==========================================

    return (
        <PageLayout>
            <section className="container">
                <SectionHeader
                    title="My Orders"
                    subtitle={
                        totalOrders > 0
                            ? `Showing page ${currentPage} of ${totalPages} • ${totalOrders} ${totalOrders === 1 ? "order" : "orders"} total`
                            : "Track and view your order history"
                    }
                />

                {/* ITEMS PER PAGE SELECTOR */}
                {(totalOrders > 0 || orders.length > 0) && (
                    <ProductCountSelector
                        value={ordersPerPage}
                        onChange={handleOrdersPerPageChange}
                        options={ORDERS_PER_PAGE_OPTIONS}
                        prefix="Show"
                        suffix="Orders"
                        disabled={loading}
                    />
                )}

                {/* LOADING SKELETON */}
                {loading ? (
                    <div className="orders-list" aria-busy="true">
                        {[1, 2, 3].map((index) => (
                            <div
                                key={index}
                                className="order-card order-history-card"
                            >
                                <div className="order-thumbnail-grid">
                                    <Skeleton variant="image" width="64px" height="64px" borderRadius="8px" />
                                </div>
                                <div className="order-history-info">
                                    <div className="order-history-header">
                                        <Skeleton variant="text" width="120px" height="22px" />
                                        <Skeleton variant="text" width="80px" height="22px" borderRadius="12px" />
                                    </div>
                                    <div className="order-history-meta">
                                        <Skeleton variant="text" width="280px" height="16px" />
                                    </div>
                                </div>
                                <div className="order-history-action">
                                    <Skeleton variant="text" width="100px" height="34px" borderRadius="8px" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : orders.length === 0 ? (
                    /* EMPTY STATE */
                    <EmptyState
                        icon="📦"
                        title="No orders yet"
                        description="You haven't placed any orders. Start shopping to see them here!"
                        actionLabel="Browse Products →"
                        actionHref="/products"
                    />
                ) : (
                    /* SHORT ORDER LIST */
                    <div className="orders-list">
                        {orders.map((order) => {
                            const itemCount =
                                order.items?.reduce(
                                    (sum, item) => sum + (item.quantity || 1),
                                    0
                                ) || order.items?.length || 0;

                            const orderItems = order.items || [];

                            return (
                                <div
                                    key={order.id}
                                    className="order-card order-history-card"
                                >
                                    {/* LEFT: 3-COLUMN PRODUCT IMAGE GRID */}
                                    <div className="order-thumbnail-grid">
                                        {orderItems.length > 0 ? (
                                            orderItems.map((item, idx) => {
                                                const itemImage =
                                                    item.product?.image ||
                                                    item.productImage ||
                                                    FALLBACK_IMAGE;
                                                const itemName =
                                                    item.product?.name ||
                                                    item.productName ||
                                                    "Product";

                                                return (
                                                    <div
                                                        key={item.id || idx}
                                                        className="order-thumbnail-item"
                                                        title={itemName}
                                                    >
                                                        <Image
                                                            src={normalizeImageSrc(itemImage)}
                                                            alt={itemName}
                                                            fill
                                                            sizes="64px"
                                                            unoptimized
                                                            onError={(e) => {
                                                                (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
                                                            }}
                                                        />
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div
                                                className="order-thumbnail-item"
                                                style={{ fontSize: "24px" }}
                                            >
                                                📦
                                            </div>
                                        )}
                                    </div>

                                    {/* MIDDLE: ORDER INFORMATION */}
                                    <div className="order-history-info">
                                        <div className="order-history-header">
                                            <span className="order-id">
                                                Order #{order.id}
                                            </span>
                                            <OrderStatusBadge status={order.status} />
                                        </div>

                                        <div className="order-history-meta">
                                            <span>Placed: {formatDate(order.createdAt)}</span>
                                            <span className="order-meta-dot">•</span>
                                            <span>
                                                {itemCount} {itemCount === 1 ? "Item" : "Items"}
                                            </span>
                                            <span className="order-meta-dot">•</span>
                                            <span className="order-meta-total">
                                                Total: {formatPrice(order.total)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* RIGHT: VIEW ORDER BUTTON */}
                                    <div className="order-history-action">
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={() => router.push(`/orders/${order.id}`)}
                                        >
                                            View Order →
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {/* STANDARDIZED PAGINATION */}
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={(page) => {
                                setCurrentPage(page);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            variant="buttons"
                        />
                    </div>
                )}
            </section>
        </PageLayout>
    );
}