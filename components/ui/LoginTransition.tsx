"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export interface LoginTransitionProps {
    active?: boolean;
    destination?: string;
    type?: "login" | "logout";
    onComplete?: () => void;
}

export interface LoginTransitionEventDetail {
    destination?: string;
    type?: "login" | "logout";
    onComplete?: () => void;
}

const LOGIN_EVENT = "shopeasy:login-transition";
const LOGOUT_EVENT = "shopeasy:logout-transition";

// Global tracking to prevent duplicate transitions across instances
let isGlobalTransitionActive = false;
let isRootTransitionMounted = false;

/**
 * Trigger the cinematic login transition globally.
 * Can be called immediately after successful authentication.
 */
export function triggerLoginTransition(options: LoginTransitionEventDetail = {}) {
    if (typeof window !== "undefined") {
        window.dispatchEvent(
            new CustomEvent<LoginTransitionEventDetail>(LOGIN_EVENT, {
                detail: {
                    type: "login",
                    ...options,
                },
            })
        );
    }
}

/**
 * Trigger the cinematic logout transition globally.
 * Can be called immediately upon logout confirmation.
 */
export function triggerLogoutTransition(options: LoginTransitionEventDetail = {}) {
    if (typeof window !== "undefined") {
        window.dispatchEvent(
            new CustomEvent<LoginTransitionEventDetail>(LOGOUT_EVENT, {
                detail: {
                    destination: "/",
                    type: "logout",
                    ...options,
                },
            })
        );
    }
}

type TransitionStage =
    | "idle"
    | "black"
    | "logo-in"
    | "logo-hold"
    | "logo-out"
    | "shutter-open"
    | "complete";

/**
 * Reusable Cinematic Login / Logout Transition Component.
 * - Solid pure #000000 overlay
 * - Subtle fade-in of white ShopEasy logo (/1logo-white.png)
 * - Center-opening black shutter (top moves UP, bottom moves DOWN)
 * - Seamless reveal of the destination page underneath
 * - Full accessibility with prefers-reduced-motion support
 */
export default function LoginTransition({
    active,
    destination = "/",
    type = "login",
    onComplete,
}: LoginTransitionProps) {
    const router = useRouter();
    const [stage, setStage] = useState<TransitionStage>("idle");
    const timersRef = useRef<NodeJS.Timeout[]>([]);
    const isRunningRef = useRef<boolean>(false);

    // Track active callbacks for current sequence
    const pendingOnCompleteRef = useRef<(() => void) | undefined>(onComplete);

    // Clear all scheduled timers
    const clearAllTimers = useCallback(() => {
        timersRef.current.forEach((id) => clearTimeout(id));
        timersRef.current = [];
    }, []);

    // Safe timer scheduler
    const addTimer = useCallback((fn: () => void, ms: number) => {
        const id = setTimeout(fn, ms);
        timersRef.current.push(id);
        return id;
    }, []);

    // Clean up on component unmount
    useEffect(() => {
        return () => {
            clearAllTimers();
            isGlobalTransitionActive = false;
        };
    }, [clearAllTimers]);

    // Execute the exact cinematic sequence
    const executeSequence = useCallback(
        (targetDest: string, onDone?: () => void) => {
            if (isRunningRef.current) return;
            isRunningRef.current = true;
            isGlobalTransitionActive = true;
            pendingOnCompleteRef.current = onDone || onComplete;

            clearAllTimers();

            // Accessibility: Respect user preference for reduced motion
            const prefersReducedMotion =
                typeof window !== "undefined" &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches;

            if (prefersReducedMotion) {
                // Immediate navigation and brief accessible transition
                setStage("black");
                try {
                    router.push(targetDest);
                } catch {}

                addTimer(() => {
                    setStage("idle");
                    isRunningRef.current = false;
                    isGlobalTransitionActive = false;
                    pendingOnCompleteRef.current?.();
                }, 200);
                return;
            }

            // ========================================================
            // STEP 2: Full Screen Black (0ms)
            // ========================================================
            setStage("black");

            // ========================================================
            // STEP 3 & 4: White Logo Fades In (200ms - 450ms)
            // ========================================================
            addTimer(() => {
                setStage("logo-in");
            }, 200);

            // Navigate under the black screen so destination is loaded beneath shutter
            addTimer(() => {
                try {
                    router.push(targetDest);
                } catch {}
            }, 250);

            // Logo holds cinematic pause (450ms - 780ms)
            addTimer(() => {
                setStage("logo-hold");
            }, 450);

            // Logo begins fading out smoothly before shutter separation (780ms - 800ms)
            addTimer(() => {
                setStage("logo-out");
            }, 780);

            // ========================================================
            // STEP 5: Shutter Opens from Center (800ms - 1320ms)
            // Top panel moves UP: translateY(-100%)
            // Bottom panel moves DOWN: translateY(100%)
            // ========================================================
            addTimer(() => {
                setStage("shutter-open");
            }, 800);

            // ========================================================
            // STEP 6: Reveal Complete & Overlay Removed (1350ms)
            // ========================================================
            addTimer(() => {
                setStage("complete");
                addTimer(() => {
                    setStage("idle");
                    isRunningRef.current = false;
                    isGlobalTransitionActive = false;
                    pendingOnCompleteRef.current?.();
                }, 50);
            }, 1350);
        },
        [addTimer, clearAllTimers, onComplete, router]
    );

    // Root instance registration
    useEffect(() => {
        if (active === undefined) {
            isRootTransitionMounted = true;
            return () => {
                isRootTransitionMounted = false;
            };
        }
    }, [active]);

    // Handle controlled `active` prop
    useEffect(() => {
        if (active !== undefined) {
            if (active && !isRunningRef.current) {
                // If a root layout instance is mounted, delegate to it for cross-route persistence
                if (isRootTransitionMounted && active) {
                    triggerLoginTransition({
                        destination,
                        type,
                        onComplete,
                    });
                } else {
                    executeSequence(destination, onComplete);
                }
            } else if (!active && isRunningRef.current) {
                clearAllTimers();
                setStage("idle");
                isRunningRef.current = false;
                isGlobalTransitionActive = false;
            }
        }
    }, [active, destination, type, onComplete, executeSequence, clearAllTimers]);

    // Handle global event listeners (active === undefined mode for RootLayout)
    useEffect(() => {
        if (active !== undefined) return;

        const handleTransitionEvent = (
            e: CustomEvent<LoginTransitionEventDetail>
        ) => {
            const detail = e.detail || {};
            executeSequence(detail.destination || "/", detail.onComplete);
        };

        window.addEventListener(
            LOGIN_EVENT as any,
            handleTransitionEvent as EventListener
        );
        window.addEventListener(
            LOGOUT_EVENT as any,
            handleTransitionEvent as EventListener
        );

        return () => {
            window.removeEventListener(
                LOGIN_EVENT as any,
                handleTransitionEvent as EventListener
            );
            window.removeEventListener(
                LOGOUT_EVENT as any,
                handleTransitionEvent as EventListener
            );
        };
    }, [active, executeSequence]);

    // If controlled prop is used and delegating to root instance, don't duplicate DOM
    if (active !== undefined && isRootTransitionMounted) {
        return null;
    }

    if (stage === "idle") {
        return null;
    }

    const isLogoVisible = stage === "logo-in" || stage === "logo-hold";
    const isLogoFadeout =
        stage === "logo-out" || stage === "shutter-open" || stage === "complete";
    const isShutterOpen = stage === "shutter-open" || stage === "complete";

    const transitionClasses = [
        "login-transition",
        "is-active",
        isLogoVisible ? "logo-visible" : "",
        isLogoFadeout ? "logo-fadeout" : "",
        isShutterOpen ? "shutter-open" : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div
            className={transitionClasses}
            aria-hidden="true"
            role="presentation"
        >
            {/* TOP SHUTTER PANEL (Moves UP) */}
            <div className="login-shutter login-shutter-top" />

            {/* BOTTOM SHUTTER PANEL (Moves DOWN) */}
            <div className="login-shutter login-shutter-bottom" />

            {/* CENTER WHITE LOGO */}
            <div className="login-transition-logo-wrap">
                <Image
                    src="/1logo-white.png"
                    alt="ShopEasy"
                    width={250}
                    height={91}
                    priority
                    unoptimized
                    className="login-transition-logo"
                />
            </div>
        </div>
    );
}
