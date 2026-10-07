"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";

export type AppliedCouponData = {
    id: number;
    code: string;
    discountType: string;
    discountValue: number;
    discountAmount: number;
};

type CouponInputProps = {
    subtotal: number;
    appliedCoupon: AppliedCouponData | null;
    onApply: (coupon: AppliedCouponData) => void;
    onRemove: () => void;
};

export default function CouponInput({
    subtotal,
    appliedCoupon,
    onApply,
    onRemove,
}: CouponInputProps) {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = code.trim().toUpperCase();
        if (!trimmed) {
            showToast("error", "Invalid Code", "Please enter a coupon code.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/coupons/validate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: trimmed,
                    subtotal,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                showToast("error", "Coupon Rejected", data.message || "Invalid coupon.");
                return;
            }

            onApply(data.coupon);
            setCode("");
            showToast("success", "Coupon Applied!", data.message);
        } catch {
            showToast("error", "Error", "Could not apply coupon.");
        } finally {
            setLoading(false);
        }
    };

    if (appliedCoupon) {
        return (
            <div
                style={{
                    background: "rgba(22, 163, 74, 0.08)",
                    border: "1px solid rgba(22, 163, 74, 0.25)",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    margin: "12px 0",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "18px" }}>🎟️</span>
                    <div>
                        <div style={{ fontWeight: 700, color: "#16a34a", fontSize: "14px" }}>
                            {appliedCoupon.code} Applied
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                            Saving ₹{appliedCoupon.discountAmount} (
                            {appliedCoupon.discountType === "PERCENTAGE"
                                ? `${appliedCoupon.discountValue}% OFF`
                                : `₹${appliedCoupon.discountValue} OFF`}
                            )
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        onRemove();
                        showToast("info", "Coupon Removed", "Discount has been removed.");
                    }}
                    style={{
                        background: "none",
                        border: "none",
                        color: "var(--color-danger, #ef4444)",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: "4px 8px",
                    }}
                >
                    Remove
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleApply} style={{ margin: "14px 0" }}>
            <label
                style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    marginBottom: "6px",
                    color: "var(--color-text)",
                }}
            >
                Have a Promo Code?
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
                <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SAVE10"
                    maxLength={20}
                    disabled={loading}
                    style={{
                        flex: 1,
                        padding: "10px 14px",
                        fontSize: "14px",
                        fontWeight: 600,
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        border: "1px solid var(--color-border)",
                        borderRadius: "8px",
                        background: "var(--color-bg)",
                        color: "var(--color-text)",
                        outline: "none",
                    }}
                />
                <Button
                    variant="primary"
                    type="submit"
                    disabled={loading || !code.trim()}
                    style={{ minWidth: "90px" }}
                >
                    {loading ? "..." : "Apply"}
                </Button>
            </div>
        </form>
    );
}
