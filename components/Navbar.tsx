"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { syncCartToBackend } from "@/hooks/useCart";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { triggerLogoutTransition } from "@/components/ui/LoginTransition";

import type { CartItem, Product, User } from "@/lib/types";

export default function Navbar() {
    const router = useRouter();

    const [dark, setDark] = useState(false);
    const [cartCount, setCartCount] = useState(0);
    const [user, setUser] = useState<User | null>(null);
    const [checked, setChecked] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const [categories, setCategories] = useState<string[]>([]);
    const [showCategories, setShowCategories] = useState(false);
    const [pendingRegistrationsCount, setPendingRegistrationsCount] =
        useState(0);

    const categoryIcons: Record<string, string> = {
        Accessories: "💍",
        Bags: "🎒",
        Beauty: "💄",
        Books: "📚",
        Clothing: "👕",
        Electronics: "💻",
        Footwear: "👟",
        "Home & Kitchen": "🏠",
        Sports: "⚽",
        Toys: "🧸",
    };

    useEffect(() => {
        function checkUser() {
            const userData = localStorage.getItem("user");

            if (!userData) {
                setUser(null);
                setCartCount(0);
                setChecked(true);
                return;
            }

            try {
                const parsedUser = JSON.parse(userData);

                setUser(parsedUser);

                const cart: CartItem[] = JSON.parse(
                    localStorage.getItem("cart") || "[]"
                );

                const count = cart.reduce(
                    (total, item) => total + item.quantity,
                    0
                );

                setCartCount(count);

                if (cart.length > 0) {
                    syncCartToBackend(cart);
                }
            } catch {
                setUser(null);
                setCartCount(0);
            }

            setChecked(true);
        }

        checkUser();

        window.addEventListener("userUpdated", checkUser);
        window.addEventListener("cartUpdated", checkUser);

        return () => {
            window.removeEventListener("userUpdated", checkUser);
            window.removeEventListener("cartUpdated", checkUser);
        };
    }, []);

    useEffect(() => {
        async function loadCategories() {
            try {
                const response = await fetch("/api/categories");

                if (response.ok) {
                    const data: { id: number; name: string }[] =
                        await response.json();

                    if (Array.isArray(data)) {
                        setCategories(
                            data
                                .map((c) => c.name)
                                .filter(Boolean)
                                .sort()
                        );

                        return;
                    }
                }

                // Fallback to /api/products
                const fallbackRes = await fetch("/api/products");

                if (fallbackRes.ok) {
                    const data: {
                        products: Product[];
                        categories: string[];
                    } = await fallbackRes.json();

                    setCategories(
                        data.categories?.filter(Boolean).sort() || []
                    );
                }
            } catch (error) {
                console.error("CATEGORY LOAD ERROR:", error);
            }
        }

        void loadCategories();

        const handleCategoriesUpdated = () => {
            void loadCategories();
        };

        window.addEventListener(
            "categoriesUpdated",
            handleCategoriesUpdated
        );

        return () => {
            window.removeEventListener(
                "categoriesUpdated",
                handleCategoriesUpdated
            );
        };
    }, []);

    useEffect(() => {
        function syncTheme() {
            try {
                const savedTheme = localStorage.getItem("theme");

                if (savedTheme === "dark") {
                    setDark(true);
                    document.body.classList.add("dark");
                    document.documentElement.classList.add("dark");
                } else if (savedTheme === "light") {
                    setDark(false);
                    document.body.classList.remove("dark");
                    document.documentElement.classList.remove("dark");
                } else {
                    const isDark =
                        document.body.classList.contains("dark") ||
                        document.documentElement.classList.contains("dark");

                    setDark(isDark);
                }
            } catch {}
        }

        syncTheme();

        window.addEventListener("storage", syncTheme);
        window.addEventListener("themeChanged", syncTheme);

        return () => {
            window.removeEventListener("storage", syncTheme);
            window.removeEventListener("themeChanged", syncTheme);
        };
    }, []);

    function toggleTheme() {
        const newDark = !dark;

        setDark(newDark);

        if (newDark) {
            document.body.classList.add("dark");
            document.documentElement.classList.add("dark");

            try {
                localStorage.setItem("theme", "dark");
            } catch {}
        } else {
            document.body.classList.remove("dark");
            document.documentElement.classList.remove("dark");

            try {
                localStorage.setItem("theme", "light");
            } catch {}
        }

        window.dispatchEvent(new Event("themeChanged"));
    }

    function logout() {
        // 1. Trigger existing cinematic transition to Home
        triggerLogoutTransition({
            destination: "/",
        });

        // 2. Perform existing logout cleanup
        localStorage.removeItem("user");
        localStorage.removeItem("cart");

        document.cookie =
            "token=; Path=/; Max-Age=0; SameSite=Lax";

        setUser(null);
        setCartCount(0);

        window.dispatchEvent(new Event("userUpdated"));
    }

    function handleLogoutClick() {
        setShowLogoutConfirm(true);
    }

    function confirmLogout() {
        setShowLogoutConfirm(false);
        logout();
    }

    const isLoggedIn = checked && user !== null;
    const isAdmin = user?.role === "ADMIN";

    function openCategory(category: string) {
        setShowCategories(false);

        if (category === "all") {
            router.push("/products");
            return;
        }

        router.push(
            `/products?category=${encodeURIComponent(category)}`
        );
    }

    useEffect(() => {
        if (!isAdmin) {
            setPendingRegistrationsCount(0);
            return;
        }

        async function fetchPendingCount() {
            try {
                const res = await fetch(
                    "/api/admin/registrations",
                    {
                        cache: "no-store",
                    }
                );

                if (res.ok) {
                    const data = await res.json();

                    setPendingRegistrationsCount(
                        data.pendingCount || 0
                    );
                }
            } catch {}
        }

        void fetchPendingCount();

        const handleUpdate = (e: Event) => {
            const customEvent =
                e as CustomEvent<{ pendingCount?: number }>;

            if (
                customEvent.detail &&
                typeof customEvent.detail.pendingCount === "number"
            ) {
                setPendingRegistrationsCount(
                    customEvent.detail.pendingCount
                );
            } else {
                void fetchPendingCount();
            }
        };

        window.addEventListener(
            "registrationRequestsUpdated",
            handleUpdate
        );

        return () => {
            window.removeEventListener(
                "registrationRequestsUpdated",
                handleUpdate
            );
        };
    }, [isAdmin]);

    return (
        <nav className="navbar">
            <div className="logo">
                <Link href={isAdmin ? "/admin" : "/"}>
                    <Image
                        src="/1logo-white.png"
                        alt="ShopEasy"
                        width={120}
                        height={55}
                        priority
                        className="site-logo"
                    />
                </Link>
            </div>

            <div className="nav-center">
                {isAdmin ? (
                    <>
                        <Link href="/admin?section=products">
                            ✏️ Product Details
                        </Link>

                        <Link href="/admin?section=orders">
                            📦 Order Management
                        </Link>

                        <Link href="/admin?section=coupons">
                            🎟️ Coupons
                        </Link>

                        <Link href="/admin?section=reviews">
                            ⭐ Reviews
                        </Link>

                        <Link href="/admin?section=analytics">
                            📊 Analytics
                        </Link>

                        <Link href="/admin?section=users">
                            👥 Users
                        </Link>

                        <Link href="/admin?section=categories">
                            📂 Categories
                        </Link>

                        <Link
                            href="/admin?section=registrations"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                            }}
                        >
                            <span>📝 Registrations</span>

                            {pendingRegistrationsCount > 0 && (
                                <span
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        background: "#dc2626",
                                        color: "#ffffff",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        borderRadius: "9999px",
                                        padding: "1px 7px",
                                        lineHeight: "16px",
                                        minWidth: "18px",
                                    }}
                                >
                                    {pendingRegistrationsCount}
                                </span>
                            )}
                        </Link>
                    </>
                ) : (
                    <>
                        <Link href="/">
                            🏠 Home
                        </Link>

                        <Link href="/products">
                            🛍️ Products
                        </Link>

                        <div
                            style={{
                                position: "relative",
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                            }}
                            onMouseEnter={() =>
                                setShowCategories(true)
                            }
                            onMouseLeave={() =>
                                setShowCategories(false)
                            }
                        >
                            <button
                                type="button"
                                className="category-nav-button"
                                onClick={() =>
                                    setShowCategories(
                                        (previous) => !previous
                                    )
                                }
                            >
                                📂 Categories ▾
                            </button>

                            {showCategories && (
                                <div
                                    className="animate-slide-down"
                                    style={{
                                        position: "absolute",
                                        top: "100%",
                                        left: 0,
                                        minWidth: "210px",
                                        background:
                                            "var(--color-bg, #fff)",
                                        border:
                                            "1px solid var(--color-border, #ddd)",
                                        borderRadius:
                                            "0 0 10px 10px",
                                        boxShadow:
                                            "0 8px 25px rgba(0,0,0,0.15)",
                                        padding: "8px",
                                        zIndex: 1000,
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={() =>
                                            openCategory("all")
                                        }
                                        style={{
                                            display: "block",
                                            width: "100%",
                                            textAlign: "left",
                                            border: "none",
                                            background: "transparent",
                                            color: "inherit",
                                            padding: "10px 12px",
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                            fontSize: "14px",
                                            transition:
                                                "all 0.2s ease",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background =
                                                "var(--color-bg-subtle, #f3f4f6)";
                                            e.currentTarget.style.color =
                                                "var(--color-primary)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background =
                                                "transparent";
                                            e.currentTarget.style.color =
                                                "inherit";
                                        }}
                                    >
                                        🛍️ All Categories
                                    </button>

                                    {categories.map((category) => (
                                        <button
                                            key={category}
                                            type="button"
                                            onClick={() =>
                                                openCategory(category)
                                            }
                                            style={{
                                                display: "block",
                                                width: "100%",
                                                textAlign: "left",
                                                border: "none",
                                                background:
                                                    "transparent",
                                                color: "inherit",
                                                padding: "10px 12px",
                                                borderRadius: "6px",
                                                cursor: "pointer",
                                                fontSize: "14px",
                                                transition:
                                                    "all 0.2s ease",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background =
                                                    "var(--color-bg-subtle, #f3f4f6)";
                                                e.currentTarget.style.color =
                                                    "var(--color-primary)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background =
                                                    "transparent";
                                                e.currentTarget.style.color =
                                                    "inherit";
                                            }}
                                        >
                                            {categoryIcons[category] ||
                                                "📁"}{" "}
                                            {category}
                                        </button>
                                    ))}

                                    {categories.length === 0 && (
                                        <div
                                            style={{
                                                padding: "10px 12px",
                                                fontSize: "14px",
                                                opacity: 0.7,
                                            }}
                                        >
                                            No categories found
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {isLoggedIn && (
                            <Link href="/wishlist">
                                ❤️ Wishlist
                            </Link>
                        )}

                        {isLoggedIn && (
                            <Link href="/orders">
                                📦 My Orders
                            </Link>
                        )}

                        <Link
                            href="/cart"
                            className="cart-badge"
                        >
                            🛒 Cart

                            {isLoggedIn && cartCount > 0 && (
                                <span className="cart-count">
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                    </>
                )}
            </div>

            <div className="nav-right">
                <label className="theme-switch">
                    <input
                        type="checkbox"
                        checked={dark}
                        onChange={toggleTheme}
                    />
                    <span className="slider" />
                </label>

                {isLoggedIn ? (
                    <>
                        {!isAdmin && (
                            <span className="user-name">
                                Hi, {user.name || user.email}
                            </span>
                        )}

                        <button
                            type="button"
                            className="nav-btn-logout"
                            onClick={handleLogoutClick}
                        >
                            Logout
                        </button>
                    </>
                ) : (
                    <Link
                        href="/login"
                        className="nav-link-login"
                    >
                        Login
                    </Link>
                )}
            </div>

            <ConfirmDialog
                open={showLogoutConfirm}
                title="Logout Confirmation"
                message="Are you sure you want to logout?"
                confirmText="Logout"
                cancelText="Cancel"
                variant="danger"
                onConfirm={confirmLogout}
                onCancel={() =>
                    setShowLogoutConfirm(false)
                }
            />
        </nav>
    );
}