/**
 * Shared utility functions used across the application.
 * Centralizes formatting, price calculation, stock handling,
 * and image normalization to eliminate duplication across pages and components.
 */

import type { CartTotals } from "@/lib/types";

/* ── Image Utilities ── */

/** Fallback image when a product image fails to load or is missing */
export const FALLBACK_IMAGE = "/file.svg";

/**
 * Normalizes an image path so it always starts with "/".
 * Handles bare filenames from the DB (e.g. "shoes.jpg" → "/shoes.jpg")
 * and leaves absolute URLs or already-prefixed paths untouched.
 */
export function normalizeImageSrc(src?: string | null): string {
    if (!src || !src.trim()) return FALLBACK_IMAGE;
    const cleanSrc = src.trim();
    if (
        cleanSrc.startsWith("/") ||
        cleanSrc.startsWith("http://") ||
        cleanSrc.startsWith("https://")
    ) {
        return cleanSrc;
    }
    return `/${cleanSrc}`;
}

/* ── Price & Formatting ── */

/**
 * Calculates the final price after applying a percentage discount.
 * Used in product cards, cart, and order placement.
 */
export function calculateFinalPrice(price: number, discount: number = 0): number {
    if (!discount || discount <= 0) return Math.max(0, Math.round(price));
    const effectiveDiscount = Math.min(100, Math.max(0, discount));
    return Math.max(0, Math.round(price - (price * effectiveDiscount) / 100));
}

/**
 * Calculates discount amount saved in currency.
 */
export function calculateSavings(price: number, discount: number = 0): number {
    return Math.max(0, price - calculateFinalPrice(price, discount));
}

/**
 * Formats a number as Indian Rupee currency string.
 * e.g. 79999 → "₹79,999"
 */
export function formatPrice(amount: number): string {
    if (Number.isNaN(amount) || amount === null || amount === undefined) {
        return "₹0";
    }
    return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

/**
 * Calculates aggregate totals for cart items.
 */
export function calculateCartTotals(
    items: { price: number; discount?: number; quantity: number }[]
): CartTotals {
    let subtotal = 0;
    let total = 0;
    let itemCount = 0;

    for (const item of items) {
        const qty = Math.max(0, item.quantity || 1);
        const itemOriginal = item.price * qty;
        const itemFinal = calculateFinalPrice(item.price, item.discount || 0) * qty;

        subtotal += itemOriginal;
        total += itemFinal;
        itemCount += qty;
    }

    return {
        subtotal,
        discountTotal: Math.max(0, subtotal - total),
        total,
        itemCount,
    };
}

/* ── Date & Time Utilities ── */

/**
 * Formats an ISO date string or Date object into human-readable Indian locale format.
 * e.g. "2026-10-01T..." → "1 Oct 2026, 02:30 pm"
 */
export function formatDate(dateInput?: string | Date | null): string {
    if (!dateInput) return "—";
    try {
        const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleDateString("en-IN", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return "—";
    }
}

/**
 * Formats a date into a short date string.
 * e.g. "1 Oct 2026"
 */
export function formatShortDate(dateInput?: string | Date | null): string {
    if (!dateInput) return "—";
    try {
        const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleDateString("en-IN", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return "—";
    }
}

/* ── Stock Utilities ── */

/**
 * Checks if a product or item is out of stock.
 */
export function isOutOfStock(stock?: number | null): boolean {
    return stock === null || stock === undefined || stock <= 0;
}

/**
 * Returns user-friendly stock label and badge class.
 */
export function getStockStatus(stock: number): {
    label: string;
    badgeClass: string;
    isAvailable: boolean;
} {
    if (stock <= 0) {
        return {
            label: "Out of Stock",
            badgeClass: "badge badge-danger",
            isAvailable: false,
        };
    }
    if (stock <= 5) {
        return {
            label: `Only ${stock} left!`,
            badgeClass: "badge badge-primary",
            isAvailable: true,
        };
    }
    return {
        label: "In Stock",
        badgeClass: "badge badge-success",
        isAvailable: true,
    };
}

/* ── Status Utilities ── */

/**
 * Returns the CSS badge class for a given order status.
 * Keeps status → styling mapping in one place.
 */
export function getStatusBadgeClass(status?: string | null): string {
    if (!status) return "badge badge-dark";
    switch (status.toUpperCase()) {
        case "DELIVERED":
            return "badge badge-success";
        case "CANCELLED":
            return "badge badge-danger";
        case "PENDING":
            return "badge badge-primary";
        case "COMPLETED":
            return "badge badge-success";
        default:
            return "badge badge-dark";
    }
}

/**
 * Formats order status into a readable capitalized string.
 */
export function formatOrderStatus(status?: string | null): string {
    if (!status) return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

/* ── CSS Class Names Helper ── */

/**
 * Conditionally joins CSS class names.
 */
export function cn(
    ...classes: (string | boolean | undefined | null | Record<string, boolean>)[]
): string {
    const result: string[] = [];
    for (const item of classes) {
        if (!item) continue;
        if (typeof item === "string") {
            result.push(item);
        } else if (typeof item === "object") {
            for (const [key, value] of Object.entries(item)) {
                if (value) result.push(key);
            }
        }
    }
    return result.join(" ");
}
