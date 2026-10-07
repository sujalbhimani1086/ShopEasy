"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/ui/Toast";

type WishlistItem = {
    productId: number;
};

type WishlistButtonProps = {
    productId: number;
};

// Share one wishlist request between all WishlistButton components.
let wishlistCache: WishlistItem[] | null = null;
let wishlistRequest: Promise<WishlistItem[]> | null = null;

async function getWishlist(): Promise<WishlistItem[]> {
    if (wishlistCache) {
        return wishlistCache;
    }

    if (wishlistRequest) {
        return wishlistRequest;
    }

    wishlistRequest = fetch("/api/wishlist")
        .then(async (response) => {
            if (!response.ok) {
                return [];
            }

            const data: WishlistItem[] = await response.json();
            wishlistCache = data;
            return data;
        })
        .catch(() => [])
        .finally(() => {
            wishlistRequest = null;
        });

    return wishlistRequest;
}

export default function WishlistButton({
    productId,
}: WishlistButtonProps) {
    const router = useRouter();
    const [wishlisted, setWishlisted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [popping, setPopping] = useState(false);

    useEffect(() => {
        const user = localStorage.getItem("user");

        if (!user) return;

        getWishlist().then((wishlist) => {
            setWishlisted(
                wishlist.some(
                    (item) => item.productId === productId
                )
            );
        });
    }, [productId]);

    async function toggleWishlist() {
        const user = localStorage.getItem("user");

        if (!user) {
            showToast(
                "error",
                "Login Required",
                "Please login to use wishlist."
            );

            router.push("/login");
            return;
        }

        if (loading) return;

        setLoading(true);

        try {
            const response = await fetch("/api/wishlist", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    productId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                showToast(
                    "error",
                    "Wishlist Error",
                    data.message || "Something went wrong."
                );
                return;
            }

            setWishlisted(data.wishlisted);
            if (data.wishlisted) {
                setPopping(true);
                setTimeout(() => setPopping(false), 400);
            }

            // Keep the shared cache in sync.
            if (wishlistCache) {
                if (data.wishlisted) {
                    wishlistCache = [
                        ...wishlistCache,
                        { productId },
                    ];
                } else {
                    wishlistCache = wishlistCache.filter(
                        (item) => item.productId !== productId
                    );
                }
            }

            showToast(
                "success",
                data.wishlisted
                    ? "Added to Wishlist"
                    : "Removed from Wishlist",
                data.message
            );

            window.dispatchEvent(
                new Event("wishlistUpdated")
            );
        } catch {
            showToast(
                "error",
                "Error",
                "Could not update wishlist."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <button
            type="button"
            onClick={toggleWishlist}
            disabled={loading}
            aria-label={
                wishlisted
                    ? "Remove from wishlist"
                    : "Add to wishlist"
            }
            className="wishlist-btn-interactive"
            style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "none",
                background: "white",
                cursor: loading ? "wait" : "pointer",
                fontSize: "22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                opacity: loading ? 0.6 : 1,
                transition: "transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
            }}
        >
            <span
                className={popping ? "animate-heart-pop" : ""}
                style={{ display: "inline-block", transformOrigin: "center" }}
            >
                {wishlisted ? "❤️" : "🤍"}
            </span>
        </button>
    );
}
