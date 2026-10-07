"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageLayout from "@/components/layout/PageLayout";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ui/ProductCardSkeleton";
import type { WishlistItem } from "@/lib/types";

export default function WishlistPage() {
    const router = useRouter();
    const [items, setItems] = useState<WishlistItem[]>([]);
    const [loading, setLoading] = useState(true);

    async function loadWishlist() {
        try {
            const response = await fetch("/api/wishlist");

            if (response.status === 401) {
                router.push("/login");
                return;
            }

            if (response.status === 403) {
                router.push("/register/pending");
                return;
            }

            if (!response.ok) {
                setItems([]);
                return;
            }

            const data = await response.json();
            setItems(data);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadWishlist();

        function updateWishlist() {
            loadWishlist();
        }

        window.addEventListener(
            "wishlistUpdated",
            updateWishlist
        );

        return () => {
            window.removeEventListener(
                "wishlistUpdated",
                updateWishlist
            );
        };
    }, []);

    return (
        <PageLayout>
            <section className="container">
                <SectionHeader
                    title="My Wishlist ❤️"
                    subtitle="Your saved products"
                />

                {loading ? (
                    <div className="product-grid" aria-busy="true">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <ProductCardSkeleton key={index} />
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <EmptyState
                        icon="❤️"
                        title="Your wishlist is empty"
                        description="Add products to your wishlist and they will appear here."
                        actionLabel="Browse Products"
                        actionHref="/products"
                    />
                ) : (
                    <div className="product-grid stagger-children">
                        {items.map((item) => (
                            <ProductCard
                                key={item.id}
                                product={item.product}
                            />
                        ))}
                    </div>
                )}
            </section>
        </PageLayout>
    );
}