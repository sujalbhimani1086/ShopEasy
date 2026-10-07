"use client";

import { useCallback, useEffect, useState } from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import StarRating from "@/components/ui/StarRating";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import { showToast } from "@/components/ui/Toast";
import type { AdminReview } from "@/lib/types";

export default function ReviewManagement() {
    const [reviews, setReviews] = useState<AdminReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [ratingFilter, setRatingFilter] = useState("ALL");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const [deleteReviewId, setDeleteReviewId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    const loadReviews = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: "10",
                search,
                rating: ratingFilter,
            });
            const res = await fetch(`/api/admin/reviews?${params.toString()}`, {
                cache: "no-store",
            });
            if (res.ok) {
                const data = await res.json();
                setReviews(data.reviews || []);
                setTotalPages(data.totalPages || 1);
                setTotal(data.total || 0);
            }
        } catch {
            showToast("error", "Error", "Could not load customer reviews.");
        } finally {
            setLoading(false);
        }
    }, [page, search, ratingFilter]);

    useEffect(() => {
        void loadReviews();
    }, [loadReviews]);

    const handleDelete = async () => {
        if (!deleteReviewId) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/reviews/${deleteReviewId}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!res.ok) {
                showToast("error", "Delete Failed", data.message || "Failed to delete review.");
                return;
            }
            showToast("success", "Review Deleted", "The review has been removed.");
            setDeleteReviewId(null);
            void loadReviews();
        } catch {
            showToast("error", "Error", "Could not delete review.");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <section className="container">
            <SectionHeader
                title="Customer Reviews Moderation"
                subtitle={`Manage and moderate all product reviews (${total} total)`}
            />

            {/* Filter Bar */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                    margin: "24px 0",
                }}
            >
                <div style={{ display: "flex", gap: "10px", flex: 1, minWidth: "260px" }}>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Search by product, customer, or comment..."
                        style={{
                            width: "100%",
                            maxWidth: "400px",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            border: "1px solid var(--color-border)",
                            background: "var(--color-bg)",
                            color: "var(--color-text)",
                            fontSize: "14px",
                            outline: "none",
                        }}
                    />

                    <select
                        value={ratingFilter}
                        onChange={(e) => {
                            setRatingFilter(e.target.value);
                            setPage(1);
                        }}
                        style={{
                            padding: "10px 14px",
                            borderRadius: "8px",
                            border: "1px solid var(--color-border)",
                            background: "var(--color-bg)",
                            color: "var(--color-text)",
                            fontSize: "14px",
                            outline: "none",
                            cursor: "pointer",
                        }}
                    >
                        <option value="ALL">All Ratings</option>
                        <option value="5">5 Stars only</option>
                        <option value="4">4 Stars only</option>
                        <option value="3">3 Stars only</option>
                        <option value="2">2 Stars only</option>
                        <option value="1">1 Star only</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <p style={{ color: "var(--color-text-secondary)" }}>Loading reviews...</p>
            ) : reviews.length === 0 ? (
                <EmptyState
                    icon="⭐"
                    title="No reviews found"
                    description="No customer reviews match your search or filters."
                />
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {reviews.map((r) => (
                        <div
                            key={r.id}
                            style={{
                                background: "var(--color-bg-elevated)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "12px",
                                padding: "20px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "10px",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    flexWrap: "wrap",
                                    gap: "12px",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                                    <div style={{ width: "48px", height: "48px", borderRadius: "8px", overflow: "hidden", background: "var(--color-bg-subtle)", flexShrink: 0 }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={r.productImage || "/images/placeholder.png"}
                                            alt={r.productName}
                                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                                        />
                                    </div>

                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--color-text)" }}>
                                            {r.productName}
                                        </div>
                                        <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                                            Reviewed by: <strong>{r.userName}</strong> ({r.userEmail})
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    {r.isVerifiedBuyer && (
                                        <span
                                            style={{
                                                background: "rgba(22, 163, 74, 0.12)",
                                                color: "#16a34a",
                                                fontSize: "12px",
                                                fontWeight: 600,
                                                padding: "2px 8px",
                                                borderRadius: "999px",
                                            }}
                                        >
                                            ✓ Verified Buyer
                                        </span>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => setDeleteReviewId(r.id)}
                                        style={{
                                            background: "rgba(239, 68, 68, 0.1)",
                                            color: "var(--color-danger, #ef4444)",
                                            border: "1px solid rgba(239, 68, 68, 0.3)",
                                            padding: "6px 12px",
                                            borderRadius: "6px",
                                            fontSize: "12px",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Delete Review
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <StarRating rating={r.rating} size="sm" />
                                <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                                    {new Date(r.createdAt).toLocaleDateString()}
                                </span>
                            </div>

                            <p style={{ margin: "4px 0 0", color: "var(--color-text)", fontSize: "14px", lineHeight: 1.5 }}>
                                &ldquo;{r.comment}&rdquo;
                            </p>
                        </div>
                    ))}

                    {totalPages > 1 && (
                        <div style={{ marginTop: "16px" }}>
                            <Pagination
                                currentPage={page}
                                totalPages={totalPages}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </div>
            )}

            <ConfirmDialog
                open={Boolean(deleteReviewId)}
                title="Delete Inappropriate Review?"
                message="Are you sure you want to delete this customer review? This will remove it from the product page. Order records will remain intact."
                variant="danger"
                loading={deleting}
                confirmText="Delete"
                cancelText="Cancel"
                onCancel={() => setDeleteReviewId(null)}
                onConfirm={handleDelete}
            />
        </section>
    );
}
