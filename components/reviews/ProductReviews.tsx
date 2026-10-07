"use client";

import { useCallback, useEffect, useState } from "react";
import StarRating from "@/components/ui/StarRating";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { showToast } from "@/components/ui/Toast";
import type { Review, ReviewStats } from "@/lib/types";

type ProductReviewsProps = {
    productId: number;
    productName: string;
};

export default function ProductReviews({
    productId,
    productName,
}: ProductReviewsProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [stats, setStats] = useState<ReviewStats>({
        averageRating: 0,
        totalReviews: 0,
        ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        isEligibleToReview: false,
        userReview: null,
    });
    const [loading, setLoading] = useState(true);

    // Form modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formRating, setFormRating] = useState(5);
    const [formComment, setFormComment] = useState("");

    // Delete dialog state
    const [deleteReviewId, setDeleteReviewId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Current user id from localStorage
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    useEffect(() => {
        try {
            const stored = localStorage.getItem("user");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.id) setCurrentUserId(Number(parsed.id));
            }
        } catch {}
    }, []);

    const fetchReviews = useCallback(async () => {
        try {
            const res = await fetch(`/api/products/${productId}/reviews`, {
                cache: "no-store",
            });
            if (res.ok) {
                const data = await res.json();
                setReviews(data.reviews || []);
                setStats(data.stats || {
                    averageRating: 0,
                    totalReviews: 0,
                    ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                    isEligibleToReview: false,
                    userReview: null,
                });
            }
        } catch (error) {
            console.error("Failed to load reviews:", error);
        } finally {
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        void fetchReviews();
    }, [fetchReviews]);

    const handleOpenWriteModal = () => {
        if (stats.userReview) {
            setFormRating(stats.userReview.rating);
            setFormComment(stats.userReview.comment);
        } else {
            setFormRating(5);
            setFormComment("");
        }
        setIsModalOpen(true);
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formComment.trim() || formComment.trim().length < 3) {
            showToast("error", "Invalid Review", "Comment must be at least 3 characters.");
            return;
        }

        setSubmitting(true);
        try {
            const isEditing = Boolean(stats.userReview);
            const url = isEditing
                ? `/api/reviews/${stats.userReview!.id}`
                : `/api/products/${productId}/reviews`;
            const method = isEditing ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    rating: formRating,
                    comment: formComment.trim(),
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
                data.message || "Thank you for your review!"
            );

            setIsModalOpen(false);
            void fetchReviews();
        } catch {
            showToast("error", "Error", "Something went wrong.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteReview = async () => {
        if (!deleteReviewId) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/reviews/${deleteReviewId}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!res.ok) {
                showToast("error", "Delete Failed", data.message || "Could not delete review.");
                return;
            }

            showToast("success", "Review Deleted", "Your review has been removed.");
            setDeleteReviewId(null);
            void fetchReviews();
        } catch {
            showToast("error", "Error", "Could not delete review.");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <section
            style={{
                marginTop: "48px",
                paddingTop: "36px",
                borderTop: "1px solid var(--color-border)",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "24px",
                    marginBottom: "32px",
                }}
            >
                <div>
                    <h2 style={{ fontSize: "24px", fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
                        Customer Reviews & Ratings
                    </h2>
                    <p style={{ margin: "6px 0 0", color: "var(--color-text-secondary)", fontSize: "14px" }}>
                        Real reviews from verified ShopEasy customers
                    </p>
                </div>

                {/* Write / Edit Review Button */}
                {currentUserId && stats.isEligibleToReview ? (
                    <Button variant="primary" onClick={handleOpenWriteModal}>
                        {stats.userReview ? "✏️ Edit Your Review" : "⭐ Write a Review"}
                    </Button>
                ) : !currentUserId ? (
                    <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                        <a href="/login" style={{ color: "var(--color-primary)", textDecoration: "underline" }}>
                            Log in
                        </a>{" "}
                        to leave a review after purchasing.
                    </span>
                ) : (
                    <div
                        style={{
                            background: "var(--color-bg-subtle)",
                            padding: "8px 14px",
                            borderRadius: "8px",
                            fontSize: "13px",
                            color: "var(--color-text-secondary)",
                            border: "1px solid var(--color-border)",
                        }}
                    >
                        🔒 Verified Buyers who purchased this product can leave a review.
                    </div>
                )}
            </div>

            {/* Rating Breakdown Summary Card */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "32px",
                    background: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "16px",
                    padding: "28px",
                    marginBottom: "36px",
                }}
            >
                {/* Big Score */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        borderRight: "1px solid var(--color-border)",
                        paddingRight: "20px",
                    }}
                >
                    <div style={{ fontSize: "48px", fontWeight: 800, color: "var(--color-text)", lineHeight: 1 }}>
                        {stats.totalReviews > 0 ? stats.averageRating.toFixed(1) : "0.0"}
                    </div>
                    <div style={{ margin: "10px 0 6px" }}>
                        <StarRating rating={stats.averageRating} size="lg" />
                    </div>
                    <div style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                        Based on {stats.totalReviews} {stats.totalReviews === 1 ? "review" : "reviews"}
                    </div>
                </div>

                {/* Star Distribution Progress Bars */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", justifyContent: "center" }}>
                    {[5, 4, 3, 2, 1].map((stars) => {
                        const count = stats.ratingBreakdown[stars as 1 | 2 | 3 | 4 | 5] || 0;
                        const percentage = stats.totalReviews > 0 ? Math.round((count / stats.totalReviews) * 100) : 0;

                        return (
                            <div key={stars} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                                <span style={{ width: "24px", color: "var(--color-text)", fontWeight: 600 }}>
                                    {stars} ★
                                </span>
                                <div
                                    style={{
                                        flex: 1,
                                        height: "8px",
                                        background: "var(--color-bg-subtle)",
                                        borderRadius: "999px",
                                        overflow: "hidden",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: `${percentage}%`,
                                            height: "100%",
                                            background: "#f59e0b",
                                            borderRadius: "999px",
                                            transition: "width 0.4s ease",
                                        }}
                                    />
                                </div>
                                <span style={{ width: "40px", textAlign: "right", color: "var(--color-text-secondary)" }}>
                                    {count} ({percentage}%)
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Reviews List */}
            {loading ? (
                <p style={{ color: "var(--color-text-secondary)" }}>Loading reviews...</p>
            ) : reviews.length === 0 ? (
                <div
                    style={{
                        textAlign: "center",
                        padding: "40px 20px",
                        background: "var(--color-bg-subtle)",
                        borderRadius: "12px",
                        color: "var(--color-text-secondary)",
                    }}
                >
                    <div style={{ fontSize: "36px", marginBottom: "8px" }}>💬</div>
                    <p style={{ fontWeight: 600, color: "var(--color-text)", margin: "0 0 4px" }}>
                        No reviews yet for {productName}
                    </p>
                    <p style={{ fontSize: "14px", margin: 0 }}>
                        Be the first verified customer to share your experience!
                    </p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {reviews.map((r) => {
                        const isOwn = currentUserId === r.userId;

                        return (
                            <div
                                key={r.id}
                                style={{
                                    background: "var(--color-bg-elevated)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "12px",
                                    padding: "20px",
                                    position: "relative",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        flexWrap: "wrap",
                                        gap: "8px",
                                        marginBottom: "8px",
                                    }}
                                >
                                    <div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                            <span style={{ fontWeight: 700, color: "var(--color-text)", fontSize: "15px" }}>
                                                {r.userName}
                                            </span>

                                            {r.isVerifiedBuyer && (
                                                <span
                                                    style={{
                                                        background: "rgba(22, 163, 74, 0.12)",
                                                        color: "#16a34a",
                                                        fontSize: "12px",
                                                        fontWeight: 600,
                                                        padding: "2px 8px",
                                                        borderRadius: "999px",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: "3px",
                                                    }}
                                                >
                                                    ✓ Verified Buyer
                                                </span>
                                            )}

                                            {isOwn && (
                                                <span
                                                    style={{
                                                        background: "var(--color-primary-light)",
                                                        color: "var(--color-primary)",
                                                        fontSize: "11px",
                                                        fontWeight: 600,
                                                        padding: "2px 6px",
                                                        borderRadius: "4px",
                                                    }}
                                                >
                                                    You
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ marginTop: "4px" }}>
                                            <StarRating rating={r.rating} size="sm" />
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                                            {new Date(r.createdAt).toLocaleDateString(undefined, {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </span>

                                        {isOwn && (
                                            <div style={{ display: "flex", gap: "6px" }}>
                                                <button
                                                    type="button"
                                                    onClick={handleOpenWriteModal}
                                                    title="Edit review"
                                                    style={{
                                                        background: "none",
                                                        border: "none",
                                                        cursor: "pointer",
                                                        fontSize: "14px",
                                                    }}
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteReviewId(r.id)}
                                                    title="Delete review"
                                                    style={{
                                                        background: "none",
                                                        border: "none",
                                                        cursor: "pointer",
                                                        fontSize: "14px",
                                                    }}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <p style={{ margin: "10px 0 0", color: "var(--color-text)", fontSize: "14px", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                                    {r.comment}
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Write / Edit Modal */}
            <Modal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={stats.userReview ? `Edit Review for ${productName}` : `Write a Review for ${productName}`}
            >
                <form onSubmit={handleSubmitReview} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                        <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "14px", color: "var(--color-text)" }}>
                            Your Rating
                        </label>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <StarRating
                                rating={formRating}
                                interactive
                                size="lg"
                                onChange={(val) => setFormRating(val)}
                            />
                            <span style={{ fontWeight: 700, color: "#f59e0b", fontSize: "16px" }}>
                                {formRating} / 5
                            </span>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "14px", color: "var(--color-text)" }}>
                            Your Feedback
                        </label>
                        <textarea
                            rows={4}
                            value={formComment}
                            onChange={(e) => setFormComment(e.target.value)}
                            placeholder="What did you like or dislike about this product? How was the quality?"
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
                        <div style={{ textAlign: "right", fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "4px" }}>
                            {formComment.length} / 1000
                        </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                        <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={submitting}>
                            {submitting ? "Submitting..." : stats.userReview ? "Save Changes" : "Submit Review"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                open={Boolean(deleteReviewId)}
                title="Delete Your Review?"
                message="Are you sure you want to permanently delete your review? This action cannot be undone."
                variant="danger"
                loading={deleting}
                confirmText="Delete"
                cancelText="Cancel"
                onCancel={() => setDeleteReviewId(null)}
                onConfirm={handleDeleteReview}
            />
        </section>
    );
}
