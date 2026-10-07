"use client";

import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

export interface ProductEntranceAnimationProps {
    enabled?: boolean;
    triggerKey?: string | number;
    totalCount?: number;
    children:
        | React.ReactNode
        | ((state: {
              isEntranceActive: boolean;
          }) => React.ReactNode);
}

export const ProductEntranceContext = React.createContext<{
    isEntranceActive: boolean;
}>({
    isEntranceActive: false,
});

export default function ProductEntranceAnimation({
    enabled = true,
    triggerKey,
    totalCount = 12,
    children,
}: ProductEntranceAnimationProps) {
    const [isEntranceActive, setIsEntranceActive] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const startAnimation = useCallback(() => {
        if (!enabled) {
            setIsEntranceActive(false);
            return;
        }

        // Check prefers-reduced-motion
        if (
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
            setIsEntranceActive(false);
            return;
        }

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        setIsEntranceActive(true);

        // Calculate total duration for all staggered items to settle cleanly
        // Hero takes ~1200ms; each subsequent item starts at index * 90ms + 100ms
        const safeCount = Math.min(Math.max(totalCount, 1), 16);
        const duration = Math.min(2600, Math.max(1600, safeCount * 90 + 1100));

        timerRef.current = setTimeout(() => {
            setIsEntranceActive(false);
        }, duration);
    }, [enabled, totalCount]);

    // Initial mount and triggerKey changes
    useEffect(() => {
        startAnimation();

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [triggerKey, startAnimation]);

    // Context value
    const contextValue = {
        isEntranceActive,
    };

    return (
        <ProductEntranceContext.Provider value={contextValue}>
            <div
                className={`cinematic-entrance-scope ${
                    isEntranceActive
                        ? "cinematic-scope-active"
                        : "cinematic-scope-settled"
                }`}
                style={{ position: "relative" }}
            >
                {typeof children === "function"
                    ? children({ isEntranceActive })
                    : children}
            </div>
        </ProductEntranceContext.Provider>
    );
}
