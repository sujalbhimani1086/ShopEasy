"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Skeleton from "@/components/ui/Skeleton";
import { normalizeImageSrc, FALLBACK_IMAGE } from "@/lib/utils";
import type { Product } from "@/lib/types";

type HeroProps = {
    initialProducts?: Product[];
};

export default function Hero({ initialProducts = [] }: HeroProps) {
    const router = useRouter();

    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [transition, setTransition] = useState(true);

    useEffect(() => {
        async function loadProducts() {
            try {
                const response = await fetch("/api/products?banner=true");

                if (!response.ok) return;

                const data = await response.json();

                const items: Product[] = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.products)
                        ? data.products
                        : [];

                if (items.length > 0) {
                    setProducts(items);
                }
            } catch (error) {
                console.error(
                    "Failed to load banner products:",
                    error
                );
            }
        }

        void loadProducts();
    }, []);

    /*
     * Select one in-stock product from each category (memoized).
     * If a product from a category is out of stock (stock === 0),
     * automatically find an available in-stock replacement (stock > 0)
     * from the same category. Never show an out-of-stock product.
     */
    const categoryProducts: Product[] = useMemo(() => {
        const result: Product[] = [];
        const categories = Array.from(
            new Set(
                products
                    .map((product) => product.category)
                    .filter(Boolean)
            )
        );

        for (const category of categories) {
            // Find an in-stock product from this category that is not yet selected
            const inStockProduct =
                products.find(
                    (product) =>
                        product.category === category &&
                        product.stock > 0 &&
                        !result.some(
                            (selected) => selected.id === product.id
                        )
                ) ||
                products.find(
                    (product) =>
                        product.category === category &&
                        product.stock > 0
                );

            // Only add products that are strictly in stock (stock > 0)
            if (
                inStockProduct &&
                !result.some(
                    (selected) => selected.id === inStockProduct.id
                )
            ) {
                result.push(inStockProduct);
            }
        }

        return result;
    }, [products]);

    /*
     * Three copies create the infinite carousel.
     */
    const carouselProducts = useMemo(() => {
        return categoryProducts.length > 0
            ? [
                  ...categoryProducts,
                  ...categoryProducts,
                  ...categoryProducts,
              ]
            : [];
    }, [categoryProducts]);

    /*
     * Start from the middle copy.
     * This allows both previous and next buttons
     * to work smoothly.
     */
    useEffect(() => {
        if (categoryProducts.length > 3) {
            setTransition(false);
            setCurrentIndex(categoryProducts.length);

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setTransition(true);
                });
            });
        }
    }, [categoryProducts.length]);

    /*
     * Auto-slide every 5 seconds.
     */
    useEffect(() => {
        if (categoryProducts.length <= 3) {
            return;
        }

        const interval = setInterval(() => {
            setCurrentIndex((prev) => prev + 1);
        }, 5000);

        return () => {
            clearInterval(interval);
        };
    }, [categoryProducts.length]);

    /*
     * Keep carousel inside the middle copy.
     */
    useEffect(() => {
        const total = categoryProducts.length;

        if (total <= 3) {
            return;
        }

        /*
         * Moved too far to the right.
         */
        if (currentIndex >= total * 2) {
            const timeout = setTimeout(() => {
                setTransition(false);
                setCurrentIndex(total);

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setTransition(true);
                    });
                });
            }, 650);

            return () => clearTimeout(timeout);
        }

        /*
         * Moved too far to the left.
         */
        if (currentIndex < total) {
            const timeout = setTimeout(() => {
                setTransition(false);
                setCurrentIndex(total + (total - 1));

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setTransition(true);
                    });
                });
            }, 650);

            return () => clearTimeout(timeout);
        }
    }, [
        currentIndex,
        categoryProducts.length,
    ]);

    /*
     * Next card.
     */
    function nextCard() {
        if (categoryProducts.length <= 3) {
            return;
        }

        setCurrentIndex((prev) => prev + 1);
    }

    /*
     * Previous card.
     */
    function previousCard() {
        if (categoryProducts.length <= 3) {
            return;
        }

        setCurrentIndex((prev) => prev - 1);
    }

    /*
     * Open category products page.
     */
    function openCategory(category?: string) {
        if (!category || category.trim() === "" || category.toLowerCase() === "all") {
            router.push("/products");
            return;
        }

        router.push(
            `/products?category=${encodeURIComponent(category.trim())}`
        );
    }


    return (
        <section className="hero-products">

            {/* Header */}
            <div className="hero-products-header">
                <div>
                    <span className="hero-products-badge">
                        🛍️ ShopEasy Deals
                    </span>

                    <h1>
                        Discover Great Products
                    </h1>

                    <p>
                        Explore products from all categories at
                        amazing prices.
                    </p>
                </div>

                <button
                    type="button"
                    className="hero-products-view-all"
                    onClick={() =>
                        router.push("/products")
                    }
                    style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                    }}
                >
                    View All Products →
                </button>
            </div>

            {/* Loading */}
            {categoryProducts.length === 0 ? (
                <div
                    className="hero-products-grid"
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(3, minmax(0, 1fr))",
                        gap: "20px",
                    }}
                >
                    {Array.from({
                        length: 3,
                    }).map((_, index) => (
                        <div
                            className="hero-product-banner"
                            key={index}
                            style={{
                                padding: "24px",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                minHeight: "260px",
                            }}
                            aria-hidden="true"
                        >
                            <div>
                                <Skeleton
                                    width={90}
                                    height={20}
                                    borderRadius={999}
                                    style={{ marginBottom: "12px" }}
                                />
                                <Skeleton
                                    variant="title"
                                    width="80%"
                                    height={24}
                                    style={{ marginBottom: "10px" }}
                                />
                                <Skeleton
                                    width="50%"
                                    height={16}
                                />
                            </div>
                            <div
                                style={{
                                    marginTop: "24px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <Skeleton
                                    width={90}
                                    height={26}
                                />
                                <Skeleton
                                    variant="button"
                                    width={100}
                                    height={36}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (

                /* Carousel */
                <div
                    style={{
                        position: "relative",
                        width: "100%",
                        overflow: "visible",
                        padding: "10px 55px 20px",
                        boxSizing: "border-box",
                    }}
                >

                    {/* Previous Button */}
                    <button
                        type="button"
                        onClick={previousCard}
                        aria-label="Previous category"
                        style={{
                            position: "absolute",
                            left: "5px",
                            top: "50%",
                            transform:
                                "translateY(-50%)",
                            zIndex: 30,

                            width: "48px",
                            height: "70px",

                            border: "none",
                            borderRadius: "14px",

                            background:
                                "rgba(255,255,255,0.95)",

                            color: "#111827",
                            fontSize: "34px",
                            fontWeight: "bold",

                            cursor: "pointer",

                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",

                            boxShadow:
                                "0 6px 20px rgba(0,0,0,0.20)",

                            transition:
                                "transform 0.2s ease, box-shadow 0.2s ease",
                        }}
                        onMouseEnter={(event) => {
                            event.currentTarget.style.transform =
                                "translateY(-50%) scale(1.08)";

                            event.currentTarget.style.boxShadow =
                                "0 10px 28px rgba(0,0,0,0.28)";
                        }}
                        onMouseLeave={(event) => {
                            event.currentTarget.style.transform =
                                "translateY(-50%) scale(1)";

                            event.currentTarget.style.boxShadow =
                                "0 6px 20px rgba(0,0,0,0.20)";
                        }}
                    >
                        ‹
                    </button>

                    {/* Cards Viewport */}
                    <div
                        style={{
                            width: "100%",
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                gap: "20px",

                                transform: `translateX(calc(-${currentIndex} * ((100% - 40px) / 3 + 20px)))`,

                                transition: transition
                                    ? "transform 0.6s ease"
                                    : "none",
                            }}
                        >
                            {carouselProducts.map(
                                (product, index) => (
                                    <div
                                        key={`${product.id}-${index}`}
                                        className={`hero-product-banner hero-product-${
                                            (index % 5) + 1
                                        }`}
                                        onClick={() =>
                                            openCategory(
                                                product.category
                                            )
                                        }
                                        onKeyDown={(
                                            event
                                        ) => {
                                            if (
                                                event.key ===
                                                    "Enter" ||
                                                event.key ===
                                                    " "
                                            ) {
                                                event.preventDefault();

                                                openCategory(
                                                    product.category
                                                );
                                            }
                                        }}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`View all ${product.category} products`}
                                        style={{
                                            flex: "0 0 calc((100% - 40px) / 3)",
                                            minWidth: 0,

                                            height: "330px",
                                            minHeight:
                                                "330px",

                                            borderRadius:
                                                "20px",

                                            cursor:
                                                "pointer",

                                            position:
                                                "relative",

                                            overflow:
                                                "hidden",
                                        }}
                                    >
                                        {/* Card Content */}
                                        <div
                                            className="hero-product-info"
                                            style={{
                                                width:
                                                    "58%",
                                                padding:
                                                    "30px",
                                            }}
                                        >
                                            <span className="hero-product-category">
                                                {
                                                    product.category
                                                }
                                            </span>

                                            <h2
                                                style={{
                                                    fontSize:
                                                        "25px",
                                                    lineHeight:
                                                        "1.25",
                                                }}
                                            >
                                                {
                                                    product.name
                                                }
                                            </h2>

                                            <p
                                                style={{
                                                    fontSize:
                                                        "17px",
                                                }}
                                            >
                                                {product.discount >
                                                0
                                                    ? `Up to ${product.discount}% OFF`
                                                    : "Special Deal"}
                                            </p>

                                            <span
                                                className="hero-product-link"
                                                style={{
                                                    fontSize:
                                                        "16px",
                                                }}
                                            >
                                                Shop Now →
                                            </span>
                                        </div>

                                        {/* Product Image */}
                                        <div
                                            className="hero-product-image"
                                            style={{
                                                width:
                                                    "48%",
                                                height:
                                                    "75%",
                                                right:
                                                    "10px",
                                                bottom:
                                                    "5px",
                                            }}
                                        >
                                            <Image
                                                src={normalizeImageSrc(
                                                    product.image
                                                )}
                                                alt={
                                                    product.name
                                                }
                                                width={240}
                                                height={180}
                                                unoptimized
                                                onError={(e) => {
                                                    (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
                                                }}
                                                style={{
                                                    width:
                                                        "100%",
                                                    height:
                                                        "100%",
                                                    objectFit:
                                                        "contain",
                                                    pointerEvents:
                                                        "none",
                                                }}
                                            />
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* Next Button */}
                    <button
                        type="button"
                        onClick={nextCard}
                        aria-label="Next category"
                        style={{
                            position: "absolute",
                            right: "5px",
                            top: "50%",
                            transform:
                                "translateY(-50%)",
                            zIndex: 30,

                            width: "48px",
                            height: "70px",

                            border: "none",
                            borderRadius: "14px",

                            background:
                                "rgba(255,255,255,0.95)",

                            color: "#111827",
                            fontSize: "34px",
                            fontWeight: "bold",

                            cursor: "pointer",

                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",

                            boxShadow:
                                "0 6px 20px rgba(0,0,0,0.20)",

                            transition:
                                "transform 0.2s ease, box-shadow 0.2s ease",
                        }}
                        onMouseEnter={(event) => {
                            event.currentTarget.style.transform =
                                "translateY(-50%) scale(1.08)";

                            event.currentTarget.style.boxShadow =
                                "0 10px 28px rgba(0,0,0,0.28)";
                        }}
                        onMouseLeave={(event) => {
                            event.currentTarget.style.transform =
                                "translateY(-50%) scale(1)";

                            event.currentTarget.style.boxShadow =
                                "0 6px 20px rgba(0,0,0,0.20)";
                        }}
                    >
                        ›
                    </button>

                </div>
            )}
        </section>
    );
}
