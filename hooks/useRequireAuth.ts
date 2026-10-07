"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";

/**
 * Hook that checks localStorage for a logged-in user.
 * Redirects to /login if no user is found.
 *
 * Replaces the identical auth-guard pattern duplicated in:
 * - checkout, cart, orders pages
 *
 * Returns { user, isLoading } so the page can show loading state
 * while the auth check is in progress.
 */
export function useRequireAuth() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const userData = localStorage.getItem("user");

        if (!userData) {
            router.push("/login");
            return;
        }

        try {
            const parsed: User = JSON.parse(userData);

            if (parsed.role !== "ADMIN" && parsed.status && parsed.status !== "APPROVED") {
                const query = parsed.email
                    ? `?email=${encodeURIComponent(parsed.email)}&status=${encodeURIComponent(parsed.status)}`
                    : "";
                router.push(`/register/pending${query}`);
                return;
            }

            setUser(parsed);
        } catch {
            router.push("/login");
            return;
        }

        setIsLoading(false);
    }, [router]);

    return { user, isLoading };
}
