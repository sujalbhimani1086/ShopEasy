"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageLayout from "@/components/layout/PageLayout";
import SectionHeader from "@/components/ui/SectionHeader";
import { showToast } from "@/components/ui/Toast";
import Skeleton from "@/components/ui/Skeleton";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import { clearCart, getCart } from "@/hooks/useCart";
import CouponInput, { type AppliedCouponData } from "@/components/checkout/CouponInput";
import { calculateFinalPrice, formatPrice } from "@/lib/utils";

import type { Product, CartItem } from "@/lib/types";

export default function Checkout() {
    const router = useRouter();

    const { isLoading: authLoading } =
        useRequireAuth();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
    const [pincode, setPincode] = useState("");

    const [nameError, setNameError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [addressError, setAddressError] = useState("");
    const [cityError, setCityError] = useState("");
    const [pincodeError, setPincodeError] = useState("");

    const [cart, setCart] =
        useState<CartItem[]>([]);

    const [products, setProducts] =
        useState<Product[]>([]);

    const [loading, setLoading] =
        useState(false);

    const [appliedCoupon, setAppliedCoupon] =
        useState<AppliedCouponData | null>(null);

    const subtotal = cart.reduce((sum, item) => {
        const price = calculateFinalPrice(item.price, item.discount);
        return sum + price * item.quantity;
    }, 0);

    const itemCount = cart.reduce(
        (sum, item) => sum + item.quantity,
        0
    );

    const finalTotal = Math.max(0, subtotal - (appliedCoupon?.discountAmount || 0));

    // -----------------------------
    // LOAD CART + PRODUCTS
    // -----------------------------

    useEffect(() => {
        if (authLoading) return;

        const savedCart = getCart();
        setCart(savedCart);

        if (savedCart.length === 0) return;

        async function loadCartProducts() {
            try {
                const fetched = await Promise.all(
                    savedCart.map(async (item) => {
                        const id = Number(item.id ?? item.productId);
                        if (!id) return null;
                        try {
                            const res = await fetch(`/api/products/${id}`, {
                                cache: "no-store",
                            });
                            if (res.ok) {
                                return (await res.json()) as Product;
                            }
                        } catch {
                            // ignore network error
                        }
                        return null;
                    })
                );

                const valid = fetched.filter(
                    (p): p is Product => p !== null
                );
                setProducts(valid);
            } catch {
                showToast(
                    "error",
                    "Error",
                    "Could not load product stock."
                );
            }
        }

        void loadCartProducts();
    }, [authLoading]);

    // -----------------------------
    // VALIDATE DELIVERY DETAILS
    // -----------------------------

    function validateForm() {
        let valid = true;

        setNameError("");
        setEmailError("");
        setAddressError("");
        setCityError("");
        setPincodeError("");

        if (!name.trim()) {
            setNameError(
                "Please enter your full name."
            );
            valid = false;
        }

        if (!email.trim()) {
            setEmailError(
                "Please enter your email."
            );
            valid = false;
        } else if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                email.trim()
            )
        ) {
            setEmailError(
                "Please enter a valid email."
            );
            valid = false;
        }

        if (!address.trim()) {
            setAddressError(
                "Please enter your delivery address."
            );
            valid = false;
        }

        if (!city.trim()) {
            setCityError(
                "Please enter your city."
            );
            valid = false;
        }

        if (!pincode.trim()) {
            setPincodeError(
                "Please enter your pincode."
            );
            valid = false;
        } else if (
            !/^\d{6}$/.test(pincode.trim())
        ) {
            setPincodeError(
                "Pincode must be 6 digits."
            );
            valid = false;
        }

        return valid;
    }

    // -----------------------------
    // PLACE ORDER
    // -----------------------------

    async function placeOrder() {
        if (!validateForm()) {
            return;
        }

        if (!cart.length) {
            showToast(
                "error",
                "Empty Cart",
                "Your cart is empty."
            );

            router.push("/cart");
            return;
        }

        // -----------------------------
        // CHECK STOCK
        // -----------------------------

        for (const item of cart) {
            const itemId = Number(item.id ?? item.productId);
            const product = products.find(
                (p) => p.id === itemId
            );

            if (product) {
                if (product.stock <= 0) {
                    showToast(
                        "error",
                        "Out of Stock",
                        `${product.name} is out of stock.`
                    );

                    return;
                }

                if (
                    item.quantity >
                    product.stock
                ) {
                    showToast(
                        "error",
                        "Stock Limit",
                        `Only ${product.stock} ${product.name} available.`
                    );

                    return;
                }
            }
        }

        setLoading(true);

        try {
            const response = await fetch(
                "/api/orders",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        name: name.trim(),
                        email: email.trim(),
                        address: address.trim(),
                        city: city.trim(),
                        pincode: pincode.trim(),
                        couponCode: appliedCoupon?.code || undefined,

                        items: cart.map(
                            (item) => ({
                                productId:
                                    Number(
                                        item.id ?? item.productId
                                    ),
                                quantity:
                                    Number(
                                        item.quantity
                                    ),
                            })
                        ),
                    }),
                }
            );

            // -----------------------------
            // READ RESPONSE SAFELY
            // -----------------------------

            const responseText =
                await response.text();

            let data: {
                message?: string;
                success?: boolean;
            } = {};

            try {
                data =
                    responseText
                        ? JSON.parse(
                              responseText
                          )
                        : {};
            } catch {
                data = {
                    message:
                        responseText ||
                        "Server returned an invalid response.",
                };
            }

            // -----------------------------
            // ORDER FAILED
            // -----------------------------

            if (!response.ok) {
                console.error(
                    "ORDER API ERROR:",
                    response.status,
                    data
                );

                showToast(
                    "error",
                    "Order Failed",
                    data.message ||
                        `Server error (${response.status}).`
                );

                // Refresh latest stock for cart items
                try {
                    const refreshed = await Promise.all(
                        cart.map(async (item) => {
                            const id = Number(
                                item.id ?? item.productId
                            );
                            if (!id) return null;
                            const res = await fetch(
                                `/api/products/${id}`,
                                { cache: "no-store" }
                            );
                            return res.ok
                                ? ((await res.json()) as Product)
                                : null;
                        })
                    );

                    setProducts(
                        refreshed.filter(
                            (p): p is Product => p !== null
                        )
                    );
                } catch {
                    // Ignore stock refresh error
                }

                return;
            }

            // -----------------------------
            // ORDER SUCCESS
            // -----------------------------

            clearCart();

            window.dispatchEvent(
                new Event("cartUpdated")
            );

            window.dispatchEvent(
                new Event("ordersUpdated")
            );

            showToast(
                "success",
                "Order Placed!",
                "Thank you for your purchase."
            );

            router.push(
                "/order-success"
            );
        } catch (error) {
            console.error(
                "CHECKOUT ERROR:",
                error
            );

            showToast(
                "error",
                "Error",
                error instanceof Error
                    ? error.message
                    : "Could not place your order."
            );
        } finally {
            setLoading(false);
        }
    }

    // -----------------------------
    // PAGE
    // -----------------------------

    if (authLoading) {
        return (
            <PageLayout>
                <section className="container" aria-busy="true">
                    <SectionHeader
                        title="Checkout"
                        subtitle="Complete your order details"
                    />

                    <div className="checkout-layout">
                        <div className="checkout-card">
                            <Skeleton
                                variant="title"
                                width="180px"
                                height="28px"
                                style={{ marginBottom: "var(--space-6)" }}
                            />

                            <div className="checkout-form-grid">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div className="form-group" key={i}>
                                        <Skeleton
                                            variant="text"
                                            width="90px"
                                            height="16px"
                                            style={{ marginBottom: "6px" }}
                                        />
                                        <Skeleton
                                            variant="button"
                                            width="100%"
                                            height={i === 3 ? "80px" : "44px"}
                                            borderRadius="8px"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="checkout-actions">
                                <Skeleton
                                    variant="button"
                                    width="100%"
                                    height="48px"
                                    borderRadius="8px"
                                />
                                <Skeleton
                                    variant="button"
                                    width="100%"
                                    height="48px"
                                    borderRadius="8px"
                                />
                            </div>
                        </div>
                    </div>
                </section>
            </PageLayout>
        );
    }

    return (
        <PageLayout>
            <section className="container">
                <SectionHeader
                    title="Checkout"
                    subtitle="Complete your order details"
                />

                <div className="checkout-layout">
                    <div className="checkout-card">

                        <h3>
                            Delivery Details
                        </h3>

                        <div className="checkout-form-grid">

                            {/* NAME */}

                            <div className="form-group">
                                <label className="form-label">
                                    Full Name
                                </label>

                                <input
                                    className={`form-input ${
                                        nameError
                                            ? "input-error"
                                            : ""
                                    }`}
                                    type="text"
                                    value={name}
                                    onChange={(e) => {
                                        setName(
                                            e.target.value
                                        );

                                        if (
                                            e.target.value.trim()
                                        ) {
                                            setNameError("");
                                        }
                                    }}
                                    placeholder="Enter your name"
                                />

                                {nameError && (
                                    <small className="field-error">
                                        ⚠ {nameError}
                                    </small>
                                )}
                            </div>

                            {/* EMAIL */}

                            <div className="form-group">
                                <label className="form-label">
                                    Email
                                </label>

                                <input
                                    className={`form-input ${
                                        emailError
                                            ? "input-error"
                                            : ""
                                    }`}
                                    type="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(
                                            e.target.value
                                        );

                                        if (
                                            e.target.value.trim()
                                        ) {
                                            setEmailError("");
                                        }
                                    }}
                                    placeholder="Enter your email"
                                />

                                {emailError && (
                                    <small className="field-error">
                                        ⚠ {emailError}
                                    </small>
                                )}
                            </div>

                            {/* ADDRESS */}

                            <div className="form-group">
                                <label className="form-label">
                                    Address
                                </label>

                                <textarea
                                    className={`form-input ${
                                        addressError
                                            ? "input-error"
                                            : ""
                                    }`}
                                    value={address}
                                    onChange={(e) => {
                                        setAddress(
                                            e.target.value
                                        );

                                        if (
                                            e.target.value.trim()
                                        ) {
                                            setAddressError("");
                                        }
                                    }}
                                    placeholder="Enter your delivery address"
                                    rows={3}
                                    style={{
                                        resize:
                                            "vertical",
                                    }}
                                />

                                {addressError && (
                                    <small className="field-error">
                                        ⚠ {addressError}
                                    </small>
                                )}
                            </div>

                            {/* CITY */}

                            <div className="form-group">
                                <label className="form-label">
                                    City
                                </label>

                                <input
                                    className={`form-input ${
                                        cityError
                                            ? "input-error"
                                            : ""
                                    }`}
                                    type="text"
                                    value={city}
                                    onChange={(e) => {
                                        setCity(
                                            e.target.value
                                        );

                                        if (
                                            e.target.value.trim()
                                        ) {
                                            setCityError("");
                                        }
                                    }}
                                    placeholder="Enter your city"
                                />

                                {cityError && (
                                    <small className="field-error">
                                        ⚠ {cityError}
                                    </small>
                                )}
                            </div>

                            {/* PINCODE */}

                            <div className="form-group">
                                <label className="form-label">
                                    Pincode
                                </label>

                                <input
                                    className={`form-input ${
                                        pincodeError
                                            ? "input-error"
                                            : ""
                                    }`}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={pincode}
                                    onChange={(e) => {
                                        setPincode(
                                            e.target.value
                                        );

                                        if (
                                            e.target.value.trim()
                                        ) {
                                            setPincodeError("");
                                        }
                                    }}
                                    placeholder="Enter pincode"
                                />

                                {pincodeError && (
                                    <small className="field-error">
                                        ⚠ {pincodeError}
                                    </small>
                                )}
                            </div>

                        </div>

                        {/* ORDER & COUPON SUMMARY */}
                        <div style={{ marginTop: "var(--space-6)", paddingTop: "var(--space-6)", borderTop: "1px solid var(--color-border)" }}>
                            <h4 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-semibold)", marginBottom: "var(--space-4)", color: "var(--color-text)" }}>
                                Order Summary
                            </h4>

                            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-5)", fontSize: "var(--text-sm)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-text-secondary)" }}>
                                    <span>Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"}):</span>
                                    <span style={{ fontWeight: "var(--font-medium)", color: "var(--color-text)" }}>{formatPrice(subtotal)}</span>
                                </div>
                                {appliedCoupon && (
                                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-success)" }}>
                                        <span>Discount ({appliedCoupon.code}):</span>
                                        <span style={{ fontWeight: "var(--font-semibold)" }}>-{formatPrice(appliedCoupon.discountAmount)}</span>
                                    </div>
                                )}
                                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-text-secondary)" }}>
                                    <span>Shipping:</span>
                                    <span style={{ color: "var(--color-success)", fontWeight: "var(--font-semibold)" }}>FREE</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "var(--space-3)", marginTop: "var(--space-2)", borderTop: "1px dashed var(--color-border)", fontSize: "var(--text-base)", fontWeight: "var(--font-bold)", color: "var(--color-text)" }}>
                                    <span>Total Payable:</span>
                                    <span style={{ color: "var(--color-primary-600)" }}>{formatPrice(finalTotal)}</span>
                                </div>
                            </div>

                            <CouponInput
                                subtotal={subtotal}
                                appliedCoupon={appliedCoupon}
                                onApply={setAppliedCoupon}
                                onRemove={() => setAppliedCoupon(null)}
                            />
                        </div>

                        {/* BUTTONS */}

                        <div className="checkout-actions">
                            <Link
                                href="/cart"
                                className="btn btn-secondary btn-lg"
                            >
                                ← Back to Cart
                            </Link>

                            <button
                                className="btn btn-primary btn-lg"
                                onClick={
                                    placeOrder
                                }
                                disabled={loading}
                            >
                                {loading
                                    ? "Processing..."
                                    : "Place Order"}
                            </button>
                        </div>

                    </div>
                </div>
            </section>
        </PageLayout>
    );
}