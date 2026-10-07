"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import PageLayout from "@/components/layout/PageLayout";
import OrderStatusBadge from "@/components/ui/OrderStatusBadge";
import OrderTrackingTimeline from "@/components/orders/OrderTrackingTimeline";
import Skeleton from "@/components/ui/Skeleton";
import StarRating from "@/components/ui/StarRating";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";

import {
    FALLBACK_IMAGE,
    formatDate,
    formatPrice,
    normalizeImageSrc,
} from "@/lib/utils";

import type { Order, OrderItem, Review } from "@/lib/types";

export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = Number(params?.id);

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);

    // Review Modal State
    const [selectedProduct, setSelectedProduct] = useState<{
        id: number;
        name: string;
    } | null>(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);
    const [existingReviews, setExistingReviews] = useState<Record<number, Review | null>>({});

    // ==========================================
    // FETCH SINGLE ORDER
    // ==========================================

    const fetchOrderDetail = useCallback(async () => {
        if (!orderId || Number.isNaN(orderId)) {
            setError("Invalid order ID.");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`/api/orders/${orderId}`, {
                method: "GET",
                cache: "no-store",
            });

            if (res.status === 401) {
                router.push("/login");
                return;
            }

            if (res.status === 403) {
                setError("You are not authorized to view this order.");
                setLoading(false);
                return;
            }

            if (res.status === 404) {
                setError("Order not found.");
                setLoading(false);
                return;
            }

            if (!res.ok) {
                setError("Failed to load order details.");
                setLoading(false);
                return;
            }

            const data = await res.json();
            if (data?.order) {
                setOrder(data.order);
                // Check review status for each product in the order
                void checkProductReviews(data.order.items || []);
            } else {
                setError("Order not found.");
            }
        } catch (err) {
            console.error("FETCH ORDER DETAIL ERROR:", err);
            setError("Could not load order details.");
        } finally {
            setLoading(false);
        }
    }, [orderId, router]);

    // Check if the current user already reviewed any of these products
    const checkProductReviews = async (items: OrderItem[]) => {
        const reviewMap: Record<number, Review | null> = {};
        for (const item of items) {
            const prodId = item.productId || item.product?.id;
            if (prodId) {
                try {
                    const res = await fetch(`/api/products/${prodId}/reviews`, { cache: "no-store" });
                    if (res.ok) {
                        const json = await res.json();
                        if (json?.stats?.userReview) {
                            reviewMap[prodId] = json.stats.userReview;
                        } else {
                            reviewMap[prodId] = null;
                        }
                    }
                } catch {
                    // Ignore individual review fetch errors
                }
            }
        }
        setExistingReviews((prev) => ({ ...prev, ...reviewMap }));
    };

    useEffect(() => {
        const user = localStorage.getItem("user");
        if (!user) {
            router.push("/login");
            return;
        }
        void fetchOrderDetail();
    }, [fetchOrderDetail, router]);

    // ==========================================
    // DOWNLOAD INVOICE
    // ==========================================

    const handleDownloadInvoice = async () => {
        if (!order) return;
        setDownloading(true);
        try {
            const res = await fetch(`/api/orders/${order.id}/invoice`);
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                showToast("error", "Error", data.message || "Could not download invoice.");
                return;
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ShopEasy-Invoice-ORD-${order.id}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showToast("success", "Invoice Downloaded", `Invoice for Order #${order.id} saved.`);
        } catch {
            showToast("error", "Error", "Could not download invoice.");
        } finally {
            setDownloading(false);
        }
    };

    // ==========================================
    // REVIEW MODAL HANDLERS
    // ==========================================

    const handleOpenReviewModal = (productId: number, productName: string) => {
        setSelectedProduct({ id: productId, name: productName });
        const existing = existingReviews[productId];
        if (existing) {
            setReviewRating(existing.rating);
            setReviewComment(existing.comment);
        } else {
            setReviewRating(5);
            setReviewComment("");
        }
        setIsReviewModalOpen(true);
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;

        if (!reviewComment.trim() || reviewComment.trim().length < 3) {
            showToast("error", "Invalid Review", "Comment must be at least 3 characters.");
            return;
        }

        setSubmittingReview(true);
        try {
            const existing = existingReviews[selectedProduct.id];
            const isEditing = Boolean(existing);
            const url = isEditing
                ? `/api/reviews/${existing!.id}`
                : `/api/products/${selectedProduct.id}/reviews`;
            const method = isEditing ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    rating: reviewRating,
                    comment: reviewComment.trim(),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                showToast("error", "Error", data.message || "Failed to submit review.");
                return;
            }

            showToast(
                "success",
                isEditing ? "Review Updated" : "Review Submitted",
                data.message || "Thank you for your feedback!"
            );

            setIsReviewModalOpen(false);

            // Refresh review status for this product
            if (selectedProduct.id) {
                const refreshed = await fetch(`/api/products/${selectedProduct.id}/reviews`, { cache: "no-store" });
                if (refreshed.ok) {
                    const json = await refreshed.json();
                    setExistingReviews((prev) => ({
                        ...prev,
                        [selectedProduct.id]: json?.stats?.userReview || null,
                    }));
                }
            }
        } catch {
            showToast("error", "Error", "Something went wrong while submitting the review.");
        } finally {
            setSubmittingReview(false);
        }
    };

    // ==========================================
    // RENDER STATES
    // ==========================================

    if (loading) {
        return (
            <PageLayout>
                <section className="container" style={{ maxWidth: "860px", margin: "0 auto", padding: "2rem 1rem" }}>
                    <div style={{ marginBottom: "20px" }}>
                        <Skeleton variant="text" width="160px" height="24px" />
                    </div>
                    <div className="order-card" style={{ padding: "24px", marginBottom: "20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                            <Skeleton variant="text" width="180px" height="28px" />
                            <Skeleton variant="text" width="100px" height="28px" borderRadius="999px" />
                        </div>
                        <Skeleton variant="text" width="220px" height="18px" />
                        <div style={{ marginTop: "24px" }}>
                            <Skeleton variant="text" width="100%" height="60px" borderRadius="10px" />
                        </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {[1, 2].map((i) => (
                            <div key={i} className="order-card" style={{ padding: "20px" }}>
                                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                                    <Skeleton variant="image" width="70px" height="70px" borderRadius="8px" />
                                    <div style={{ flex: 1 }}>
                                        <Skeleton variant="text" width="60%" height="20px" style={{ marginBottom: "8px" }} />
                                        <Skeleton variant="text" width="30%" height="16px" />
                                    </div>
                                    <Skeleton variant="text" width="120px" height="34px" borderRadius="8px" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </PageLayout>
        );
    }

    if (error || !order) {
        return (
            <PageLayout>
                <section className="container" style={{ maxWidth: "600px", margin: "4rem auto", textAlign: "center" }}>
                    <div className="order-card" style={{ padding: "40px 24px" }}>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
                        <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "8px", color: "var(--color-text)" }}>
                            {error || "Order Not Found"}
                        </h2>
                        <p style={{ color: "var(--color-text-secondary)", marginBottom: "24px", fontSize: "14px" }}>
                            We couldn&apos;t load the requested order details. Please check the order number or return to your orders list.
                        </p>
                        <Link href="/orders" className="btn btn-primary" style={{ display: "inline-block", padding: "10px 22px" }}>
                            ← Back to My Orders
                        </Link>
                    </div>
                </section>
            </PageLayout>
        );
    }

    const subtotal = order.subtotal ?? (order.total + (order.discount || 0));

    return (
        <PageLayout>
            <section
                className="container"
                style={{
                    maxWidth: "860px",
                    margin: "0 auto",
                    padding: "2rem 1rem",
                }}
            >
                {/* BACK NAVIGATION */}
                <div style={{ marginBottom: "20px" }}>
                    <Link
                        href="/orders"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "var(--color-text-secondary)",
                            textDecoration: "none",
                            transition: "color 0.15s ease",
                        }}
                    >
                        ← Back to My Orders
                    </Link>
                </div>

                {/* ==========================================
                    ORDER HEADER CARD
                ========================================== */}
                <div
                    className="order-card"
                    style={{
                        padding: "24px",
                        marginBottom: "24px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "12px",
                            marginBottom: "8px",
                        }}
                    >
                        <h1
                            style={{
                                fontSize: "24px",
                                fontWeight: 800,
                                margin: 0,
                                color: "var(--color-text)",
                            }}
                        >
                            Order #{order.id}
                        </h1>

                        <OrderStatusBadge status={order.status} />
                    </div>

                    <div
                        style={{
                            fontSize: "14px",
                            color: "var(--color-text-secondary)",
                            marginBottom: "16px",
                        }}
                    >
                        Placed on: <strong>{formatDate(order.createdAt)}</strong>
                    </div>

                    {/* ORDER TRACKING TIMELINE (SELECTED ORDER ONLY) */}
                    <OrderTrackingTimeline status={order.status} />
                </div>

                {/* ==========================================
                    PRODUCTS IN THIS ORDER (INDIVIDUAL CARDS)
                ========================================== */}
                <div style={{ marginBottom: "28px" }}>
                    <h2
                        style={{
                            fontSize: "18px",
                            fontWeight: 700,
                            marginBottom: "16px",
                            color: "var(--color-text)",
                            letterSpacing: "-0.01em",
                        }}
                    >
                        Products in this Order ({order.items.length})
                    </h2>

                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {order.items.map((item, index) => {
                            const productId = item.productId || item.product?.id || 0;
                            const productName =
                                item.product?.name || item.productName || "Product";
                            const productImage =
                                item.product?.image || item.productImage || FALLBACK_IMAGE;
                            const existingReview = productId ? existingReviews[productId] : null;

                            return (
                                <div
                                    key={item.id || index}
                                    className="order-card"
                                    style={{
                                        padding: "18px 22px",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: "18px",
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        {/* PRODUCT DETAILS */}
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "16px",
                                                flex: "1 1 280px",
                                                minWidth: "240px",
                                            }}
                                        >
                                            {/* PRODUCT IMAGE */}
                                            <div
                                                style={{
                                                    width: "74px",
                                                    height: "74px",
                                                    position: "relative",
                                                    flexShrink: 0,
                                                    borderRadius: "10px",
                                                    overflow: "hidden",
                                                    background: "var(--color-bg-subtle)",
                                                    border: "1px solid var(--color-border)",
                                                }}
                                            >
                                                <Image
                                                    src={normalizeImageSrc(productImage)}
                                                    alt={productName}
                                                    fill
                                                    sizes="74px"
                                                    unoptimized
                                                    style={{ objectFit: "cover" }}
                                                    onError={(e) => {
                                                        (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
                                                    }}
                                                />
                                            </div>

                                            {/* NAME, QTY, PRICE */}
                                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                                <h3
                                                    style={{
                                                        fontSize: "16px",
                                                        fontWeight: 700,
                                                        margin: 0,
                                                        color: "var(--color-text)",
                                                    }}
                                                >
                                                    {productName}
                                                </h3>

                                                <div
                                                    style={{
                                                        fontSize: "13px",
                                                        color: "var(--color-text-secondary)",
                                                        display: "flex",
                                                        gap: "12px",
                                                    }}
                                                >
                                                    <span>Qty: <strong>{item.quantity}</strong></span>
                                                    <span>•</span>
                                                    <span>Price: <strong>{formatPrice(item.price)}</strong></span>
                                                </div>

                                                {item.quantity > 1 && (
                                                    <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                                                        Item Total: {formatPrice(item.price * item.quantity)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* WRITE / EDIT REVIEW ACTION */}
                                        <div>
                                            {productId > 0 && (
                                                <button
                                                    type="button"
                                                    className={existingReview ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm"}
                                                    onClick={() => handleOpenReviewModal(productId, productName)}
                                                    style={{
                                                        padding: "8px 16px",
                                                        fontSize: "13px",
                                                        fontWeight: 600,
                                                        borderRadius: "8px",
                                                        cursor: "pointer",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: "6px",
                                                    }}
                                                >
                                                    {existingReview ? (
                                                        <>
                                                            <span>★ {existingReview.rating}</span>
                                                            <span>•</span>
                                                            <span>Edit Review</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>⭐</span>
                                                            <span>Write a Product Review</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ==========================================
                    ORDER SUMMARY & INVOICE CARD
                ========================================== */}
                <div
                    className="order-card"
                    style={{
                        padding: "24px",
                    }}
                >
                    <h2
                        style={{
                            fontSize: "18px",
                            fontWeight: 700,
                            marginBottom: "16px",
                            color: "var(--color-text)",
                            letterSpacing: "-0.01em",
                        }}
                    >
                        Order Summary
                    </h2>

                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                            fontSize: "14px",
                            color: "var(--color-text-secondary)",
                            paddingBottom: "16px",
                            borderBottom: "1px solid var(--color-border)",
                            marginBottom: "16px",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Items Subtotal</span>
                            <span style={{ color: "var(--color-text)", fontWeight: 500 }}>
                                {formatPrice(subtotal)}
                            </span>
                        </div>

                        {order.discount && order.discount > 0 ? (
                            <div style={{ display: "flex", justifyContent: "space-between", color: "#16a34a" }}>
                                <span>
                                    Discount Applied {order.couponCode ? `(${order.couponCode})` : ""}
                                </span>
                                <span style={{ fontWeight: 600 }}>
                                    -₹{order.discount}
                                </span>
                            </div>
                        ) : null}

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "16px",
                                fontWeight: 700,
                                color: "var(--color-text)",
                                paddingTop: "6px",
                            }}
                        >
                            <span>Order Total</span>
                            <span style={{ color: "var(--color-primary, #2563eb)" }}>
                                {formatPrice(order.total)}
                            </span>
                        </div>
                    </div>

                    {/* ACTIONS */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "14px",
                            marginTop: "8px",
                        }}
                    >
                        <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={downloading}
                            onClick={handleDownloadInvoice}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                                fontSize: "13px",
                                fontWeight: 600,
                                padding: "9px 18px",
                                borderRadius: "8px",
                                cursor: "pointer",
                            }}
                        >
                            {downloading ? "⏳ Preparing PDF..." : "📄 Download Invoice"}
                        </button>

                        <Link
                            href="/orders"
                            className="btn btn-secondary"
                            style={{
                                fontSize: "13px",
                                fontWeight: 600,
                                padding: "9px 18px",
                                borderRadius: "8px",
                                textDecoration: "none",
                            }}
                        >
                            ← Back to Orders
                        </Link>
                    </div>
                </div>

                {/* ==========================================
                    PRODUCT REVIEW MODAL (REUSED SYSTEM)
                ========================================== */}
                <Modal
                    open={isReviewModalOpen}
                    onClose={() => setIsReviewModalOpen(false)}
                    title={
                        selectedProduct && existingReviews[selectedProduct.id]
                            ? `Edit Review for ${selectedProduct.name}`
                            : `Write a Product Review for ${selectedProduct?.name || "Product"}`
                    }
                >
                    <form
                        onSubmit={handleSubmitReview}
                        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
                    >
                        <div>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: "8px",
                                    fontWeight: 600,
                                    fontSize: "14px",
                                    color: "var(--color-text)",
                                }}
                            >
                                Your Rating
                            </label>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <StarRating
                                    rating={reviewRating}
                                    interactive
                                    size="lg"
                                    onChange={(val) => setReviewRating(val)}
                                />
                                <span style={{ fontWeight: 700, color: "#f59e0b", fontSize: "16px" }}>
                                    {reviewRating} / 5
                                </span>
                            </div>
                        </div>

                        <div>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: "8px",
                                    fontWeight: 600,
                                    fontSize: "14px",
                                    color: "var(--color-text)",
                                }}
                            >
                                Your Feedback
                            </label>
                            <textarea
                                rows={4}
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                                placeholder="How was this product? Share your experience with other shoppers."
                                required
                                maxLength={1000}
                                style={{
                                    width: "100%",
                                    padding: "12px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--color-border)",
                                    background: "var(--color-bg)",
                                    color: "var(--color-text)",
                                    fontSize: "14px",
                                    outline: "none",
                                    boxSizing: "border-box",
                                    resize: "vertical",
                                }}
                            />
                            <div
                                style={{
                                    textAlign: "right",
                                    fontSize: "12px",
                                    color: "var(--color-text-secondary)",
                                    marginTop: "4px",
                                }}
                            >
                                {reviewComment.length} / 1000
                            </div>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: "10px",
                                marginTop: "8px",
                            }}
                        >
                            <Button
                                variant="secondary"
                                type="button"
                                onClick={() => setIsReviewModalOpen(false)}
                                disabled={submittingReview}
                            >
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit" disabled={submittingReview}>
                                {submittingReview
                                    ? "Submitting..."
                                    : selectedProduct && existingReviews[selectedProduct.id]
                                    ? "Save Changes"
                                    : "Submit Review"}
                            </Button>
                        </div>
                    </form>
                </Modal>
            </section>
        </PageLayout>
    );
}
