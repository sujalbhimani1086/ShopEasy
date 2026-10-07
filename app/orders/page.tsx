"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import PageLayout from "@/components/layout/PageLayout";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import OrderStatusBadge from "@/components/ui/OrderStatusBadge";
import Skeleton from "@/components/ui/Skeleton";

import {
    FALLBACK_IMAGE,
    formatDate,
    formatPrice,
    normalizeImageSrc,
} from "@/lib/utils";

import type { Order } from "@/lib/types";

export default function OrdersPage() {
    const router = useRouter();

    const [orders, setOrders] =
        useState<Order[]>([]);

    const [loading, setLoading] =
        useState(true);

    // ==========================================
    // FETCH ORDERS
    // ==========================================

    const fetchOrders = useCallback(
        async (showLoading = false) => {
            if (showLoading) {
                setLoading(true);
            }

            try {
                const response =
                    await fetch(
                        "/api/orders",
                        {
                            method: "GET",
                            cache: "no-store",
                        }
                    );

                // Login required
                if (
                    response.status === 401
                ) {
                    router.push("/login");
                    return;
                }

                // Approval required
                if (
                    response.status === 403
                ) {
                    router.push("/register/pending");
                    return;
                }

                if (!response.ok) {
                    setOrders([]);
                    return;
                }

                const data =
                    await response.json();

                if (Array.isArray(data)) {
                    setOrders(data);
                } else {
                    setOrders([]);
                }
            } catch (error) {
                console.error(
                    "FETCH ORDERS ERROR:",
                    error
                );

                // Don't clear existing orders
                // during a temporary network error.
            } finally {
                if (showLoading) {
                    setLoading(false);
                }
            }
        },
        [router]
    );

    // ==========================================
    // INITIAL LOAD + AUTO REFRESH
    // ==========================================

    useEffect(() => {
        const user =
            localStorage.getItem("user");

        if (!user) {
            router.push("/login");
            return;
        }

        // First load
        void fetchOrders(true);

        // Refresh every 5 seconds
        const interval =
            setInterval(() => {
                void fetchOrders(false);
            }, 5000);

        // Refresh when customer comes back
        // to this browser tab
        function handleVisibility() {
            if (
                document.visibilityState ===
                "visible"
            ) {
                void fetchOrders(false);
            }
        }

        document.addEventListener(
            "visibilitychange",
            handleVisibility
        );

        // Refresh when browser gets focus
        function handleFocus() {
            void fetchOrders(false);
        }

        window.addEventListener(
            "focus",
            handleFocus
        );

        // Refresh if another part of the
        // application announces an order update
        function handleOrdersUpdated() {
            void fetchOrders(false);
        }

        window.addEventListener(
            "ordersUpdated",
            handleOrdersUpdated
        );

        return () => {
            clearInterval(interval);

            document.removeEventListener(
                "visibilitychange",
                handleVisibility
            );

            window.removeEventListener(
                "focus",
                handleFocus
            );

            window.removeEventListener(
                "ordersUpdated",
                handleOrdersUpdated
            );
        };
    }, [router, fetchOrders]);

    // ==========================================
    // PAGE
    // ==========================================

    return (
        <PageLayout>
            <section className="container">

                <SectionHeader
                    title="My Orders"
                    subtitle="Track and view your order history"
                />

                {/* LOADING */}

                {loading ? (
                    <div className="orders-list" aria-busy="true">
                        {[1, 2, 3].map((index) => (
                            <div key={index} className="order-card">
                                <div
                                    className="order-card-header"
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <div
                                        className="order-meta"
                                        style={{
                                            display: "flex",
                                            gap: "16px",
                                            alignItems: "center",
                                        }}
                                    >
                                        <Skeleton
                                            variant="text"
                                            width="100px"
                                            height="20px"
                                        />
                                        <Skeleton
                                            variant="text"
                                            width="140px"
                                            height="18px"
                                        />
                                    </div>
                                    <Skeleton
                                        variant="text"
                                        width="90px"
                                        height="24px"
                                        borderRadius="9999px"
                                    />
                                </div>
                                <div className="order-items">
                                    <div
                                        className="order-item-row"
                                        style={{
                                            display: "flex",
                                            gap: "16px",
                                            alignItems: "center",
                                        }}
                                    >
                                        <Skeleton
                                            variant="image"
                                            width="60px"
                                            height="60px"
                                            borderRadius="8px"
                                        />
                                        <div style={{ flex: 1 }}>
                                            <Skeleton
                                                variant="text"
                                                width="60%"
                                                height="20px"
                                                style={{ marginBottom: "6px" }}
                                            />
                                            <Skeleton
                                                variant="text"
                                                width="40%"
                                                height="16px"
                                            />
                                        </div>
                                        <Skeleton
                                            variant="text"
                                            width="80px"
                                            height="20px"
                                        />
                                    </div>
                                </div>
                                <div
                                    className="order-card-footer"
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginTop: "16px",
                                    }}
                                >
                                    <Skeleton
                                        variant="text"
                                        width="120px"
                                        height="18px"
                                    />
                                    <Skeleton
                                        variant="text"
                                        width="100px"
                                        height="24px"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : orders.length === 0 ? (
                    /* EMPTY */

                    <EmptyState
                        icon="📦"
                        title="No orders yet"
                        description="You haven't placed any orders. Start shopping to see them here!"
                        actionLabel="Browse Products →"
                        actionHref="/products"
                    />
                ) : (
                    /* ORDERS */

                    <div className="orders-list">

                        {orders.map(
                            (order) => (
                                <div
                                    key={
                                        order.id
                                    }
                                    className="order-card"
                                >

                                    {/* =========================
                                        ORDER HEADER
                                    ========================= */}

                                    <div className="order-card-header">

                                        <div className="order-meta">

                                            <span className="order-id">
                                                Order #
                                                {
                                                    order.id
                                                }
                                            </span>

                                            <span className="order-date">
                                                {formatDate(
                                                    order.createdAt
                                                )}
                                            </span>

                                        </div>

                                        {/* STATUS */}

                                        <OrderStatusBadge
                                            status={order.status}
                                        />

                                    </div>

                                    {/* =========================
                                        ORDER ITEMS
                                    ========================= */}

                                    <div className="order-items">

                                        {order.items.map(
                                            (
                                                item
                                            ) => (
                                                <div
                                                    key={
                                                        item.id
                                                    }
                                                    className="order-item-row"
                                                >

                                                    {/* IMAGE */}

                                                    <div className="order-item-image">

                                                        <Image
                                                            src={normalizeImageSrc(
                                                                item.product?.image ||
                                                                    item.productImage ||
                                                                    FALLBACK_IMAGE
                                                            )}
                                                            alt={
                                                                item.product?.name ||
                                                                    item.productName ||
                                                                    "Product"
                                                            }
                                                            width={76}
                                                            height={76}
                                                            unoptimized
                                                            onError={(e) => {
                                                                (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
                                                            }}
                                                        />

                                                    </div>

                                                    {/* PRODUCT INFO */}

                                                    <div className="order-item-info">

                                                        <h4>
                                                            {item.product?.name ||
                                                                item.productName ||
                                                                "Product Unavailable"}
                                                        </h4>

                                                        <span className="order-item-qty">
                                                            Qty:{" "}
                                                            {
                                                                item.quantity
                                                            }
                                                        </span>

                                                        <span className="order-item-unit-price">
                                                            Price:{" "}
                                                            {formatPrice(
                                                                item.price
                                                            )}
                                                        </span>

                                                    </div>

                                                    {/* ITEM TOTAL */}

                                                    <span className="order-item-price">
                                                        {formatPrice(
                                                            item.price *
                                                                item.quantity
                                                        )}
                                                    </span>

                                                </div>
                                            )
                                        )}

                                    </div>

                                    {/* =========================
                                        ORDER FOOTER
                                    ========================= */}

                                    <div className="order-card-footer">

                                        <span className="order-total-label">
                                            Order Total
                                        </span>

                                        <span className="order-total-value">
                                            {formatPrice(
                                                order.total
                                            )}
                                        </span>

                                    </div>

                                </div>
                            )
                        )}

                    </div>
                )}

            </section>
        </PageLayout>
    );
}