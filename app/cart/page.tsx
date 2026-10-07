"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import PageLayout from "@/components/layout/PageLayout";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { showToast } from "@/components/ui/Toast";
import {
    normalizeImageSrc,
    calculateFinalPrice,
    formatPrice,
    FALLBACK_IMAGE,
} from "@/lib/utils";
import { getCart, saveCart, syncCartToBackend } from "@/hooks/useCart";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import type { Product, CartItem } from "@/lib/types";

export default function Cart() {
    const { isLoading: authLoading } = useRequireAuth();

    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;

        const initialCart = getCart();
        setCart(initialCart);
        setLoading(false);

        if (initialCart.length === 0) {
            fetch("/api/cart")
                .then((r) => (r.ok ? r.json() : null))
                .then((data) => {
                    if (data?.items && data.items.length > 0) {
                        setCart(data.items);
                        localStorage.setItem("cart", JSON.stringify(data.items));
                        window.dispatchEvent(new Event("cartUpdated"));
                    }
                })
                .catch(() => {});
            return;
        }

        syncCartToBackend(initialCart);

        // Sync with live product details from the database
        async function syncCartWithDatabase() {
            let changed = false;
            const updated = await Promise.all(
                initialCart.map(async (item) => {
                    const id = Number(item.id ?? item.productId);
                    if (!id) return item;

                    try {
                        const response = await fetch(`/api/products/${id}`, {
                            cache: "no-store",
                        });

                        if (response.ok) {
                            const liveProduct: Product = await response.json();
                            changed = true;
                            return {
                                ...item,
                                id: liveProduct.id,
                                productId: liveProduct.id,
                                name: liveProduct.name,
                                price: liveProduct.price,
                                discount: liveProduct.discount,
                                category: liveProduct.category,
                                image: liveProduct.image,
                                stock: liveProduct.stock,
                                isDeleted: false,
                            };
                        }

                        if (response.status === 404) {
                            changed = true;
                            return {
                                ...item,
                                stock: 0,
                                isDeleted: true,
                            };
                        }
                    } catch {
                        // Network error, retain local cart data
                    }

                    return item;
                })
            );

            if (changed) {
                setCart(updated);
                saveCart(updated);
            }
        }

        void syncCartWithDatabase();

        function handleCartUpdate() {
            setCart(getCart());
        }

        window.addEventListener("cartUpdated", handleCartUpdate);

        return () => {
            window.removeEventListener("cartUpdated", handleCartUpdate);
        };
    }, [authLoading]);

    function updateCart(newCart: CartItem[]) {
        setCart(newCart);
        saveCart(newCart);
    }

    function changeQuantity(id: number, change: number) {
        const currentItem = cart.find(
            (item) => Number(item.id ?? item.productId) === id
        );
        if (!currentItem) return;

        const availableStock =
            currentItem.stock !== undefined ? currentItem.stock : 999;
        const newQuantity = currentItem.quantity + change;

        if (change > 0 && newQuantity > availableStock) {
            showToast(
                "error",
                "Stock Limit",
                `Only ${availableStock} item${availableStock === 1 ? "" : "s"} available.`
            );
            return;
        }

        if (newQuantity <= 0) {
            removeProduct(id);
            return;
        }

        const newCart = cart.map((item) =>
            Number(item.id ?? item.productId) === id
                ? { ...item, quantity: newQuantity }
                : item
        );

        updateCart(newCart);
    }

    function removeProduct(id: number) {
        const newCart = cart.filter(
            (item) => Number(item.id ?? item.productId) !== id
        );
        updateCart(newCart);

        showToast("info", "Removed", "Item removed from cart.");
    }

    const total = cart.reduce((sum, item) => {
        const price = calculateFinalPrice(
            item.price,
            item.discount
        );

        return sum + price * item.quantity;
    }, 0);

    const itemCount = cart.reduce(
        (sum, item) => sum + item.quantity,
        0
    );

    if (loading || authLoading) {
        return (
            <PageLayout>
                <section className="container" aria-busy="true">
                    <SectionHeader title="Shopping Cart" />
                    <div className="cart-layout">
                        <div className="cart-items-card">
                            {[1, 2, 3].map((index) => (
                                <div
                                    className="cart-item"
                                    key={index}
                                    style={{ gap: "20px" }}
                                >
                                    <div className="cart-item-image">
                                        <Skeleton
                                            variant="image"
                                            width="90px"
                                            height="90px"
                                            borderRadius="12px"
                                        />
                                    </div>
                                    <div
                                        className="cart-item-details"
                                        style={{ flex: 1 }}
                                    >
                                        <Skeleton
                                            variant="text"
                                            width="60px"
                                            height="20px"
                                            borderRadius="9999px"
                                            style={{ marginBottom: "8px" }}
                                        />
                                        <Skeleton
                                            variant="title"
                                            width="65%"
                                            height="22px"
                                            style={{ marginBottom: "8px" }}
                                        />
                                        <Skeleton
                                            variant="text"
                                            width="90px"
                                            height="20px"
                                            style={{ marginBottom: "8px" }}
                                        />
                                        <Skeleton
                                            variant="text"
                                            width="75px"
                                            height="16px"
                                        />
                                    </div>
                                    <div className="quantity-control">
                                        <Skeleton
                                            variant="button"
                                            width="36px"
                                            height="36px"
                                            borderRadius="8px"
                                        />
                                        <Skeleton
                                            variant="text"
                                            width="24px"
                                            height="20px"
                                        />
                                        <Skeleton
                                            variant="button"
                                            width="36px"
                                            height="36px"
                                            borderRadius="8px"
                                        />
                                    </div>
                                    <div className="cart-item-total">
                                        <Skeleton
                                            variant="text"
                                            width="70px"
                                            height="24px"
                                        />
                                    </div>
                                    <Skeleton
                                        variant="button"
                                        width="80px"
                                        height="36px"
                                        borderRadius="8px"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="cart-summary">
                            <Skeleton
                                variant="title"
                                width="140px"
                                height="26px"
                                style={{ marginBottom: "20px" }}
                            />
                            <div
                                className="cart-summary-row"
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: "12px",
                                }}
                            >
                                <Skeleton
                                    variant="text"
                                    width="90px"
                                    height="18px"
                                />
                                <Skeleton
                                    variant="text"
                                    width="70px"
                                    height="18px"
                                />
                            </div>
                            <div
                                className="cart-summary-row"
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: "12px",
                                }}
                            >
                                <Skeleton
                                    variant="text"
                                    width="70px"
                                    height="18px"
                                />
                                <Skeleton
                                    variant="text"
                                    width="50px"
                                    height="18px"
                                />
                            </div>
                            <hr className="divider" />
                            <div
                                className="cart-summary-row cart-summary-total"
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    margin: "16px 0",
                                }}
                            >
                                <Skeleton
                                    variant="text"
                                    width="60px"
                                    height="24px"
                                />
                                <Skeleton
                                    variant="text"
                                    width="90px"
                                    height="24px"
                                />
                            </div>
                            <Skeleton
                                variant="button"
                                width="100%"
                                height="48px"
                                borderRadius="8px"
                                style={{ marginTop: "var(--space-5)" }}
                            />
                        </div>
                    </div>
                </section>
            </PageLayout>
        );
    }

    return (
        <PageLayout>
            <section className="container">
                <SectionHeader title="Shopping Cart" />

                {!cart.length ? (
                    <EmptyState
                        icon="🛒"
                        title="Your cart is empty"
                        description="Looks like you haven't added any products yet. Start browsing our collection!"
                        actionLabel="Browse Products"
                        actionHref="/products"
                    />
                ) : (
                    <div className="cart-layout">
                        <div className="cart-items-card animate-fade-in-up">
                            {cart.map((item) => {
                                const itemId = Number(
                                    item.id ?? item.productId
                                );
                                const price = calculateFinalPrice(
                                    item.price,
                                    item.discount
                                );

                                const availableStock =
                                    item.stock !== undefined ? item.stock : 0;
                                const outOfStock =
                                    availableStock <= 0 || item.isDeleted;
                                const maxStockReached =
                                    item.stock !== undefined &&
                                    item.quantity >= availableStock;

                                return (
                                    <div
                                        className="cart-item"
                                        key={itemId || item.name}
                                    >
                                        <div className="cart-item-image">
                                            <Image
                                                src={normalizeImageSrc(
                                                    item.image
                                                )}
                                                alt={item.name}
                                                width={90}
                                                height={90}
                                                onError={(event) => {
                                                    event.currentTarget.src =
                                                        FALLBACK_IMAGE;
                                                }}
                                            />
                                        </div>

                                        <div className="cart-item-details">
                                            {item.category && (
                                                <span
                                                    className="badge badge-dark"
                                                    style={{
                                                        marginBottom: "6px",
                                                        display: "inline-block",
                                                    }}
                                                >
                                                    {item.category}
                                                </span>
                                            )}

                                            <h4>{item.name}</h4>

                                            <div className="price-display">
                                                {item.discount > 0 && (
                                                    <>
                                                        <span className="price-original">
                                                            {formatPrice(
                                                                item.price
                                                            )}
                                                        </span>
                                                        <span className="price-discount">
                                                            {item.discount}% OFF
                                                        </span>
                                                    </>
                                                )}

                                                <span
                                                    className="price-current"
                                                    style={{
                                                        fontSize:
                                                            "var(--text-base)",
                                                    }}
                                                >
                                                    {formatPrice(price)}
                                                </span>
                                            </div>

                                            <small>
                                                Stock:{" "}
                                                {item.stock !== undefined
                                                    ? item.stock
                                                    : "Available"}
                                            </small>

                                            {outOfStock && (
                                                <p
                                                    style={{
                                                        color: "var(--color-danger)",
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {item.isDeleted
                                                        ? "Product is no longer available"
                                                        : "Out of Stock"}
                                                </p>
                                            )}
                                        </div>

                                        <div className="quantity-control">
                                            <button
                                                className="btn-icon"
                                                onClick={() =>
                                                    changeQuantity(
                                                        itemId,
                                                        -1
                                                    )
                                                }
                                            >
                                                −
                                            </button>

                                            <span>{item.quantity}</span>

                                            <button
                                                className="btn-icon"
                                                onClick={() =>
                                                    changeQuantity(
                                                        itemId,
                                                        1
                                                    )
                                                }
                                                disabled={
                                                    maxStockReached ||
                                                    outOfStock
                                                }
                                            >
                                                +
                                            </button>
                                        </div>

                                        <div className="cart-item-total">
                                            {formatPrice(
                                                price * item.quantity
                                            )}
                                        </div>

                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() =>
                                                removeProduct(itemId)
                                            }
                                        >
                                            Remove
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        <div
                            className="cart-summary animate-fade-in-up"
                            style={{ animationDelay: "150ms" }}
                        >
                            <h3>Order Summary</h3>

                            <div className="cart-summary-row">
                                <span>Items ({itemCount})</span>
                                <span>{formatPrice(total)}</span>
                            </div>

                            <div className="cart-summary-row">
                                <span>Shipping</span>
                                <span
                                    style={{
                                        color: "var(--color-success)",
                                        fontWeight: 600,
                                    }}
                                >
                                    FREE
                                </span>
                            </div>

                            <hr className="divider" />

                            <div className="cart-summary-row cart-summary-total">
                                <span>Total</span>
                                <span>{formatPrice(total)}</span>
                            </div>

                            <Link
                                href="/checkout"
                                className="btn btn-lg btn-full"
                                style={{
                                    marginTop: "var(--space-5)",
                                    backgroundColor: "#000000",
                                    color: "#ffffff",
                                    border: "1px solid #000000",
                                    fontWeight: 700,
                                    textAlign: "center",
                                    transition:
                                        "background-color 0.2s ease, color 0.2s ease",
                                }}
                                onMouseEnter={(event) => {
                                    event.currentTarget.style.backgroundColor =
                                        "#222222";
                                }}
                                onMouseLeave={(event) => {
                                    event.currentTarget.style.backgroundColor =
                                        "#000000";
                                }}
                            >
                                Proceed to Checkout
                            </Link>
                        </div>
                    </div>
                )}
            </section>
        </PageLayout>
    );
}