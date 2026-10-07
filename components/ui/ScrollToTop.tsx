"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function ScrollToTopInner() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "instant",
        });
    }, [pathname, searchParams]);

    return null;
}

export default function ScrollToTop() {
    return (
        <Suspense fallback={null}>
            <ScrollToTopInner />
        </Suspense>
    );
}