"use client";

import { showToast } from "@/components/ui/Toast";
import type { Product, CartItem } from "@/lib/types";

/** Read cart items from localStorage */
export function getCart(): CartItem[] {
    try {
        const raw = localStorage.getItem("cart");
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/** Asynchronously sync cart with the database if user is logged in */
export function syncCartToBackend(cart?: CartItem[]) {
    if (typeof window === "undefined") return;

    try {
        const user = localStorage.getItem("user");
        if (!user) return;

        const currentCart = cart ?? getCart();
        fetch("/api/cart", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                items: currentCart.map((item) => ({
                    productId: Number(item.id ?? item.productId),
                    quantity: item.quantity,
                })),
            }),
        }).catch(() => {});
    } catch {}
}

/** Save cart, notify components, and sync with backend database */
export function saveCart(cart: CartItem[]) {
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
    syncCartToBackend(cart);
}

/** Clear cart and clear database cart */
export function clearCart() {
    localStorage.removeItem("cart");
    window.dispatchEvent(new Event("cartUpdated"));

    if (typeof window !== "undefined") {
        try {
            const user = localStorage.getItem("user");
            if (user) {
                fetch("/api/cart", { method: "DELETE" }).catch(() => {});
            }
        } catch {}
    }
}

/** Add one product without exceeding its available stock */
export function addToCart(product: Product): boolean {
    const availableStock = Math.max(0, product.stock);

    if (availableStock === 0) {
        showToast(
            "error",
            "Out of Stock",
            `${product.name} is currently out of stock.`
        );
        return false;
    }

    const cart = getCart();

    const existing = cart.find(
        (item) => Number(item.id ?? item.productId) === Number(product.id)
    );

    const currentQuantity = existing?.quantity ?? 0;

    if (currentQuantity >= availableStock) {
        showToast(
            "error",
            "Stock Limit",
            `Only ${availableStock} item(s) are available.`
        );
        return false;
    }

    if (existing) {
        existing.quantity += 1;
        existing.price = product.price;
        existing.discount = product.discount;
        existing.stock = product.stock;
        existing.category = product.category;
        existing.image = product.image;
        existing.isDeleted = false;
    } else {
        cart.push({
            id: product.id,
            productId: product.id,
            name: product.name,
            price: product.price,
            discount: product.discount,
            category: product.category,
            image: product.image,
            stock: product.stock,
            quantity: 1,
            isDeleted: false,
        });
    }

    saveCart(cart);

    showToast(
        "success",
        "Added to Cart",
        `${product.name} has been added.`
    );

    return true;
}
