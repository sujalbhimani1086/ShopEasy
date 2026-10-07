"use client";

import { useCallback, useEffect, useState } from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import { showToast } from "@/components/ui/Toast";
import type { Coupon } from "@/lib/types";

export default function CouponManagement() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Modal state for create/edit
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

    // Form fields
    const [code, setCode] = useState("");
    const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
    const [discountValue, setDiscountValue] = useState("");
    const [minOrderAmount, setMinOrderAmount] = useState("");
    const [maxDiscount, setMaxDiscount] = useState("");
    const [usageLimit, setUsageLimit] = useState("");
    const [expiresAt, setExpiresAt] = useState("");
    const [isActive, setIsActive] = useState(true);

    // Delete dialog
    const [deleteCouponId, setDeleteCouponId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    const loadCoupons = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search.trim()) params.set("search", search.trim());
            const res = await fetch(`/api/admin/coupons?${params.toString()}`, {
                cache: "no-store",
            });
            if (res.ok) {
                const data = await res.json();
                setCoupons(data || []);
            }
        } catch {
            showToast("error", "Error", "Could not load discount coupons.");
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        void loadCoupons();
    }, [loadCoupons]);

    const handleOpenCreateModal = () => {
        setEditingCoupon(null);
        setCode("");
        setDiscountType("PERCENTAGE");
        setDiscountValue("");
        setMinOrderAmount("0");
        setMaxDiscount("");
        setUsageLimit("");
        setExpiresAt("");
        setIsActive(true);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (c: Coupon) => {
        setEditingCoupon(c);
        setCode(c.code);
        setDiscountType(c.discountType);
        setDiscountValue(String(c.discountValue));
        setMinOrderAmount(String(c.minOrderAmount || 0));
        setMaxDiscount(c.maxDiscount ? String(c.maxDiscount) : "");
        setUsageLimit(c.usageLimit ? String(c.usageLimit) : "");
        setExpiresAt(c.expiresAt ? c.expiresAt.split("T")[0] : "");
        setIsActive(c.isActive);
        setIsModalOpen(true);
    };

    const handleSaveCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedCode = code.trim().toUpperCase();
        const val = Number.parseInt(discountValue, 10);

        if (!trimmedCode) {
            showToast("error", "Invalid Code", "Coupon code is required.");
            return;
        }

        if (Number.isNaN(val) || val <= 0) {
            showToast("error", "Invalid Value", "Discount value must be greater than 0.");
            return;
        }

        if (discountType === "PERCENTAGE" && val > 100) {
            showToast("error", "Invalid Percentage", "Percentage cannot exceed 100%.");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                code: trimmedCode,
                discountType,
                discountValue: val,
                minOrderAmount: Number.parseInt(minOrderAmount, 10) || 0,
                maxDiscount: maxDiscount ? Number.parseInt(maxDiscount, 10) : null,
                usageLimit: usageLimit ? Number.parseInt(usageLimit, 10) : null,
                expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
                isActive,
            };

            const url = editingCoupon
                ? `/api/admin/coupons/${editingCoupon.id}`
                : `/api/admin/coupons`;
            const method = editingCoupon ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) {
                showToast("error", "Error", data.message || "Failed to save coupon.");
                return;
            }

            showToast(
                "success",
                editingCoupon ? "Coupon Updated" : "Coupon Created",
                data.message || `Coupon ${trimmedCode} is ready!`
            );

            setIsModalOpen(false);
            void loadCoupons();
        } catch {
            showToast("error", "Error", "Something went wrong.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleActive = async (c: Coupon) => {
        try {
            const res = await fetch(`/api/admin/coupons/${c.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !c.isActive }),
            });
            if (res.ok) {
                showToast("success", "Status Updated", `Coupon ${c.code} is now ${!c.isActive ? "active" : "inactive"}.`);
                void loadCoupons();
            }
        } catch {
            showToast("error", "Error", "Could not toggle coupon status.");
        }
    };

    const handleDelete = async () => {
        if (!deleteCouponId) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/coupons/${deleteCouponId}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!res.ok) {
                showToast("error", "Delete Failed", data.message || "Could not delete coupon.");
                return;
            }
            showToast("success", "Coupon Deleted", "Coupon removed successfully.");
            setDeleteCouponId(null);
            void loadCoupons();
        } catch {
            showToast("error", "Error", "Could not delete coupon.");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <section className="container">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                <SectionHeader
                    title="Promo Codes & Coupons Management"
                    subtitle="Create, edit, and track customer discount coupons"
                />

                <Button variant="primary" onClick={handleOpenCreateModal}>
                    ➕ Create Coupon
                </Button>
            </div>

            <div style={{ margin: "20px 0" }}>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by coupon code (e.g. SAVE10)..."
                    style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid var(--color-border)",
                        background: "var(--color-bg)",
                        color: "var(--color-text)",
                        fontSize: "14px",
                        width: "100%",
                        maxWidth: "360px",
                        outline: "none",
                    }}
                />
            </div>

            {loading ? (
                <p style={{ color: "var(--color-text-secondary)" }}>Loading coupons...</p>
            ) : coupons.length === 0 ? (
                <EmptyState
                    icon="🎟️"
                    title="No coupons found"
                    description="Click 'Create Coupon' to add your first store promo code."
                />
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
                    {coupons.map((c) => {
                        const isExpired = c.expiresAt ? new Date(c.expiresAt) < new Date() : false;

                        return (
                            <div
                                key={c.id}
                                style={{
                                    background: "var(--color-bg-elevated)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "14px",
                                    padding: "20px",
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                    gap: "14px",
                                    opacity: c.isActive && !isExpired ? 1 : 0.75,
                                }}
                            >
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                        <span
                                            style={{
                                                fontSize: "18px",
                                                fontWeight: 800,
                                                letterSpacing: "1px",
                                                color: "var(--color-primary)",
                                                background: "var(--color-primary-light)",
                                                padding: "4px 10px",
                                                borderRadius: "6px",
                                            }}
                                        >
                                            {c.code}
                                        </span>

                                        <span
                                            style={{
                                                fontSize: "12px",
                                                fontWeight: 700,
                                                padding: "2px 8px",
                                                borderRadius: "999px",
                                                background: !c.isActive
                                                    ? "rgba(100, 116, 139, 0.15)"
                                                    : isExpired
                                                    ? "rgba(239, 68, 68, 0.15)"
                                                    : "rgba(22, 163, 74, 0.15)",
                                                color: !c.isActive
                                                    ? "#64748b"
                                                    : isExpired
                                                    ? "#ef4444"
                                                    : "#16a34a",
                                            }}
                                        >
                                            {!c.isActive ? "Inactive" : isExpired ? "Expired" : "Active"}
                                        </span>
                                    </div>

                                    <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-text)", margin: "8px 0 4px" }}>
                                        {c.discountType === "PERCENTAGE" ? `${c.discountValue}% OFF` : `₹${c.discountValue} FLAT OFF`}
                                    </div>

                                    <div style={{ fontSize: "13px", color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: "4px" }}>
                                        <div>Min. Order: ₹{c.minOrderAmount}</div>
                                        {c.maxDiscount && <div>Max Discount: ₹{c.maxDiscount}</div>}
                                        <div>
                                            Usage: {c.usedCount}
                                            {c.usageLimit ? ` / ${c.usageLimit} max` : " (Unlimited)"}
                                        </div>
                                        <div>
                                            Expires: {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "Never"}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: "8px", paddingTop: "12px", borderTop: "1px solid var(--color-border)" }}>
                                    <button
                                        type="button"
                                        onClick={() => handleToggleActive(c)}
                                        style={{
                                            flex: 1,
                                            padding: "8px",
                                            borderRadius: "6px",
                                            border: "1px solid var(--color-border)",
                                            background: "var(--color-bg)",
                                            color: "var(--color-text)",
                                            fontSize: "12px",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                        }}
                                    >
                                        {c.isActive ? "Deactivate" : "Activate"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleOpenEditModal(c)}
                                        style={{
                                            padding: "8px 14px",
                                            borderRadius: "6px",
                                            border: "1px solid var(--color-border)",
                                            background: "var(--color-bg)",
                                            color: "var(--color-text)",
                                            fontSize: "12px",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setDeleteCouponId(c.id)}
                                        style={{
                                            padding: "8px 12px",
                                            borderRadius: "6px",
                                            border: "1px solid rgba(239, 68, 68, 0.3)",
                                            background: "rgba(239, 68, 68, 0.1)",
                                            color: "var(--color-danger, #ef4444)",
                                            fontSize: "12px",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCoupon ? `Edit Coupon "${editingCoupon.code}"` : "Create New Coupon"}
            >
                <form onSubmit={handleSaveCoupon} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                            Coupon Code *
                        </label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="e.g. SAVE10"
                            required
                            disabled={Boolean(editingCoupon)}
                            style={{
                                width: "100%",
                                padding: "10px",
                                borderRadius: "8px",
                                border: "1px solid var(--color-border)",
                                background: "var(--color-bg)",
                                color: "var(--color-text)",
                                fontSize: "14px",
                                fontWeight: 700,
                                letterSpacing: "1px",
                                textTransform: "uppercase",
                                boxSizing: "border-box",
                            }}
                        />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                                Discount Type
                            </label>
                            <select
                                value={discountType}
                                onChange={(e) => setDiscountType(e.target.value as "PERCENTAGE" | "FIXED")}
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--color-border)",
                                    background: "var(--color-bg)",
                                    color: "var(--color-text)",
                                    fontSize: "14px",
                                    boxSizing: "border-box",
                                }}
                            >
                                <option value="PERCENTAGE">Percentage (%)</option>
                                <option value="FIXED">Fixed Amount (₹)</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                                Discount Value *
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={discountValue}
                                onChange={(e) => setDiscountValue(e.target.value)}
                                placeholder={discountType === "PERCENTAGE" ? "e.g. 15 for 15%" : "e.g. 200 for ₹200"}
                                required
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--color-border)",
                                    background: "var(--color-bg)",
                                    color: "var(--color-text)",
                                    fontSize: "14px",
                                    boxSizing: "border-box",
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                                Min. Order Amount (₹)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={minOrderAmount}
                                onChange={(e) => setMinOrderAmount(e.target.value)}
                                placeholder="e.g. 500"
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--color-border)",
                                    background: "var(--color-bg)",
                                    color: "var(--color-text)",
                                    fontSize: "14px",
                                    boxSizing: "border-box",
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                                Max Discount Cap (₹)
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={maxDiscount}
                                onChange={(e) => setMaxDiscount(e.target.value)}
                                placeholder="Optional cap"
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--color-border)",
                                    background: "var(--color-bg)",
                                    color: "var(--color-text)",
                                    fontSize: "14px",
                                    boxSizing: "border-box",
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                                Usage Limit
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={usageLimit}
                                onChange={(e) => setUsageLimit(e.target.value)}
                                placeholder="Unlimited if blank"
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--color-border)",
                                    background: "var(--color-bg)",
                                    color: "var(--color-text)",
                                    fontSize: "14px",
                                    boxSizing: "border-box",
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                                Expiry Date
                            </label>
                            <input
                                type="date"
                                value={expiresAt}
                                onChange={(e) => setExpiresAt(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--color-border)",
                                    background: "var(--color-bg)",
                                    color: "var(--color-text)",
                                    fontSize: "14px",
                                    boxSizing: "border-box",
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                        <input
                            type="checkbox"
                            id="coupon-active-chk"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            style={{ width: "18px", height: "18px", cursor: "pointer" }}
                        />
                        <label htmlFor="coupon-active-chk" style={{ fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                            Active and ready for customer use
                        </label>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                        <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={submitting}>
                            {submitting ? "Saving..." : editingCoupon ? "Update Coupon" : "Create Coupon"}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                open={Boolean(deleteCouponId)}
                title="Delete Coupon?"
                message="Are you sure you want to permanently delete this coupon? Existing orders that used this coupon will maintain their discount history."
                variant="danger"
                loading={deleting}
                confirmText="Delete"
                cancelText="Cancel"
                onCancel={() => setDeleteCouponId(null)}
                onConfirm={handleDelete}
            />
        </section>
    );
}
