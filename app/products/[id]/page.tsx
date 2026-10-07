"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WishlistButton from "@/components/WishlistButton";
import { showToast } from "@/components/ui/Toast";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
    normalizeImageSrc,
    calculateFinalPrice,
    formatPrice,
    isOutOfStock,
    FALLBACK_IMAGE,
} from "@/lib/utils";
import { addToCart, getCart } from "@/hooks/useCart";
import ProductReviews from "@/components/reviews/ProductReviews";
import type { Product } from "@/lib/types";

export default function ProductDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const productId = String(params.id);

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [cartQuantity, setCartQuantity] = useState(0);
    const [isAdded, setIsAdded] = useState(false);

    const loadProduct = useCallback(async (signal?: AbortSignal) => {
        try {
            const response = await fetch(`/api/products/${productId}`, {
                cache: "no-store",
                signal,
            });

            if (response.status === 404) {
                setProduct(null);
                return;
            }

            if (!response.ok) {
                throw new Error("Failed to load product");
            }

            const data: Product = await response.json();
            setProduct(data);

            const cart = getCart();
            const item = cart.find(
                (entry) => String(entry.id ?? entry.productId) === productId
            );

            setCartQuantity(item?.quantity ?? 0);

            setQuantity((current) =>
                data
                    ? Math.min(
                          Math.max(1, current),
                          Math.max(1, data.stock)
                      )
                    : 1
            );
        } catch (error) {
            if (
                error instanceof Error &&
                error.name !== "AbortError"
            ) {
                showToast(
                    "error",
                    "Error",
                    "Unable to load product details."
                );
            }
        } finally {
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        const controller = new AbortController();

        setLoading(true);
        void loadProduct(controller.signal);

        return () => controller.abort();
    }, [loadProduct]);

    useEffect(() => {
        function refreshCart() {
            const item = getCart().find(
                (entry) => String(entry.id ?? entry.productId) === productId
            );

            setCartQuantity(item?.quantity ?? 0);
        }

        window.addEventListener("cartUpdated", refreshCart);

        return () => {
            window.removeEventListener("cartUpdated", refreshCart);
        };
    }, [productId]);

    useEffect(() => {
        function refreshStock() {
            void loadProduct();
        }

        window.addEventListener("focus", refreshStock);

        return () => {
            window.removeEventListener("focus", refreshStock);
        };
    }, [loadProduct]);

    function handleAddToCart() {
        if (!product) return;

        if (!localStorage.getItem("user")) {
            showToast(
                "error",
                "Login Required",
                "Please login to add items to cart."
            );
            router.push("/login");
            return;
        }

        const remainingStock = product.stock - cartQuantity;

        if (remainingStock <= 0) {
            showToast(
                "error",
                "Stock Limit",
                "You have already added all currently available stock to your cart."
            );
            return;
        }

        if (quantity > remainingStock) {
            showToast(
                "error",
                "Insufficient Stock",
                `Only ${remainingStock} more item(s) can be added to your cart.`
            );
            return;
        }

        let added = 0;

        for (let i = 0; i < quantity; i++) {
            if (!addToCart(product)) break;
            added++;
        }

        if (added > 0) {
            const cart = getCart();
            const item = cart.find(
                (entry) => String(entry.id ?? entry.productId) === productId
            );

            setCartQuantity(item?.quantity ?? 0);
            setQuantity(1);
            setIsAdded(true);
            setTimeout(() => setIsAdded(false), 1200);
        }
    }

    if (loading) {
        return (
            <>
                <Navbar />
                <main className="container section" aria-busy="true">
                    <div style={{ marginBottom: "28px" }}>
                        <Skeleton variant="text" width="220px" height="20px" />
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
                            gap: "40px",
                            alignItems: "start",
                        }}
                    >
                        <div
                            style={{
                                position: "relative",
                                background: "var(--color-bg-subtle)",
                                borderRadius: "16px",
                                overflow: "hidden",
                                minHeight: "420px",
                                height: "480px",
                            }}
                        >
                            <Skeleton
                                variant="image"
                                width="100%"
                                height="100%"
                                style={{ borderRadius: "16px" }}
                            />
                        </div>

                        <div style={{ minWidth: 0 }}>
                            <Skeleton
                                variant="text"
                                width="90px"
                                height="26px"
                                borderRadius="9999px"
                            />

                            <div style={{ margin: "16px 0" }}>
                                <Skeleton
                                    variant="title"
                                    width="80%"
                                    height="38px"
                                    style={{ marginBottom: "10px" }}
                                />
                                <Skeleton
                                    variant="title"
                                    width="50%"
                                    height="38px"
                                />
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "14px",
                                    margin: "24px 0",
                                }}
                            >
                                <Skeleton variant="text" width="140px" height="38px" />
                                <Skeleton variant="text" width="100px" height="26px" />
                                <Skeleton
                                    variant="text"
                                    width="80px"
                                    height="24px"
                                    borderRadius="9999px"
                                />
                            </div>

                            <div style={{ marginBottom: "28px" }}>
                                <Skeleton variant="text" width="180px" height="20px" />
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "18px",
                                    marginBottom: "28px",
                                }}
                            >
                                <Skeleton variant="text" width="70px" height="22px" />
                                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                    <Skeleton
                                        variant="button"
                                        width="52px"
                                        height="52px"
                                        borderRadius="12px"
                                    />
                                    <Skeleton variant="text" width="36px" height="24px" />
                                    <Skeleton
                                        variant="button"
                                        width="52px"
                                        height="52px"
                                        borderRadius="12px"
                                    />
                                </div>
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "stretch",
                                    flexWrap: "wrap",
                                    gap: "14px",
                                }}
                            >
                                <Skeleton
                                    variant="button"
                                    width="240px"
                                    height="56px"
                                    borderRadius="12px"
                                    style={{ flex: "1 1 200px" }}
                                />
                                <Skeleton
                                    variant="button"
                                    width="56px"
                                    height="56px"
                                    borderRadius="12px"
                                />
                            </div>

                            <div style={{ marginTop: "32px" }}>
                                <Skeleton variant="text" width="160px" height="20px" />
                            </div>
                        </div>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    if (!product) {
        return (
            <>
                <Navbar />
                <main className="container section">
                    <EmptyState
                        icon="🔍"
                        title="Product Not Found"
                        description="This product may have been removed."
                        actionLabel="Back to Products"
                        actionHref="/products"
                    />
                </main>
                <Footer />
            </>
        );
    }

    const finalPrice = calculateFinalPrice(
        product.price,
        product.discount
    );

    const outOfStock = isOutOfStock(product.stock);
    const remainingStock = Math.max(
        0,
        product.stock - cartQuantity
    );

    return (
        <>
            <Navbar />

            <main className="container section">
                <p style={{ marginBottom: "28px" }}>
                    <Link href="/">Home</Link>
                    {" / "}
                    <Link href="/products">Products</Link>
                    {" / "}
                    {product.name}
                </p>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
                        gap: "40px",
                        alignItems: "start",
                    }}
                >
                    <div
                        style={{
                            position: "relative",
                            background: "var(--color-bg-subtle)",
                            borderRadius: "16px",
                            overflow: "hidden",
                        }}
                    >
                        <Image
                            src={
                                imageError
                                    ? FALLBACK_IMAGE
                                    : normalizeImageSrc(product.image)
                            }
                            alt={product.name}
                            width={700}
                            height={700}
                            unoptimized
                            onError={() => setImageError(true)}
                            style={{
                                width: "100%",
                                height: "auto",
                                minHeight: "420px",
                                maxHeight: "600px",
                                objectFit: "contain",
                                display: "block",
                                transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                            }}
                        />

                        {product.discount > 0 && (
                            <span
                                className="badge badge-dark"
                                style={{
                                    position: "absolute",
                                    top: "16px",
                                    left: "16px",
                                    padding: "8px 12px",
                                    fontSize: "14px",
                                }}
                            >
                                {product.discount}% OFF
                            </span>
                        )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                        <Badge variant="dark">
                            {product.category}
                        </Badge>

                        <h1
                            style={{
                                fontSize: "clamp(28px, 4vw, 40px)",
                                lineHeight: 1.25,
                                margin: "16px 0",
                            }}
                        >
                            {product.name}
                        </h1>

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: "12px",
                                margin: "24px 0",
                            }}
                        >
                            <strong
                                style={{
                                    fontSize: "clamp(28px, 3vw, 36px)",
                                    color: "var(--color-text)",
                                }}
                            >
                                {formatPrice(finalPrice)}
                            </strong>

                            {product.discount > 0 && (
                                <>
                                    <span
                                        style={{
                                            textDecoration: "line-through",
                                            color: "var(--color-text-muted)",
                                            fontSize: "20px",
                                        }}
                                    >
                                        {formatPrice(product.price)}
                                    </span>

                                    <span
                                        style={{
                                            color: "#059669",
                                            fontWeight: 700,
                                            fontSize: "16px",
                                        }}
                                    >
                                        Save {product.discount}%
                                    </span>
                                </>
                            )}
                        </div>

                        <p
                            style={{
                                marginBottom: "28px",
                                color: "var(--color-text-secondary)",
                                fontSize: "16px",
                            }}
                        >
                            {outOfStock
                                ? "Currently unavailable"
                                : `Available stock: ${remainingStock} item(s)`}
                        </p>

                        {!outOfStock && remainingStock > 0 && (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                    gap: "18px",
                                    marginBottom: "28px",
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: "18px",
                                        fontWeight: 600,
                                    }}
                                >
                                    Quantity
                                </span>

                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "12px",
                                    }}
                                >
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        disabled={quantity <= 1}
                                        onClick={() =>
                                            setQuantity((current) =>
                                                Math.max(1, current - 1)
                                            )
                                        }
                                        aria-label="Decrease quantity"
                                        style={{
                                            width: "52px",
                                            height: "52px",
                                            padding: 0,
                                            fontSize: "24px",
                                            borderRadius: "12px",
                                        }}
                                    >
                                        −
                                    </button>

                                    <strong
                                        style={{
                                            minWidth: "36px",
                                            textAlign: "center",
                                            fontSize: "22px",
                                        }}
                                    >
                                        {quantity}
                                    </strong>

                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        disabled={quantity >= remainingStock}
                                        onClick={() =>
                                            setQuantity((current) =>
                                                Math.min(
                                                    remainingStock,
                                                    current + 1
                                                )
                                            )
                                        }
                                        aria-label="Increase quantity"
                                        style={{
                                            width: "52px",
                                            height: "52px",
                                            padding: 0,
                                            fontSize: "24px",
                                            borderRadius: "12px",
                                        }}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        )}

                        <div
                            style={{
                                display: "flex",
                                alignItems: "stretch",
                                flexWrap: "wrap",
                                gap: "14px",
                            }}
                        >
                            <Button
                                variant={isAdded ? "secondary" : "primary"}
                                className={isAdded ? "animate-button-pop" : ""}
                                size="lg"
                                disabled={outOfStock || remainingStock <= 0}
                                onClick={handleAddToCart}
                                style={{
                                    minWidth: "200px",
                                    minHeight: "56px",
                                    padding: "14px 28px",
                                    fontSize: "17px",
                                    fontWeight: 700,
                                    flex: "1 1 200px",
                                }}
                            >
                                {isAdded
                                    ? "✓ Added to Cart!"
                                    : outOfStock || remainingStock <= 0
                                    ? "Out of Stock"
                                    : "Add to Cart"}
                            </Button>

                            <div
                                style={{
                                    minHeight: "56px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <WishlistButton productId={product.id} />
                            </div>
                        </div>

                        <p style={{ marginTop: "32px" }}>
                            <Link href="/products">
                                ← Continue Shopping
                            </Link>
                        </p>
                    </div>
                </div>

                <ProductReviews productId={product.id} productName={product.name} />
            </main>

            <Footer />
        </>
    );
}