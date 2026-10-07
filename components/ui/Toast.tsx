"use client";

import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info";

type ToastData = {
    id: number;
    type: ToastType;
    title: string;
    message?: string;
};

let toastId = 0;

const listeners: Set<(toast: ToastData) => void> = new Set();

/**
 * Show a toast notification from anywhere.
 * Can be called outside of React components.
 */
export function showToast(
    type: ToastType,
    title: string,
    message?: string
) {
    const toast: ToastData = {
        id: ++toastId,
        type,
        title,
        message,
    };
    listeners.forEach((fn) => fn(toast));
}

const icons: Record<ToastType, string> = {
    success: "✅",
    error: "❌",
    info: "ℹ️",
};

/**
 * Renders toast notifications. Place once in the root layout.
 */
export default function ToastContainer() {
    const [toasts, setToasts] = useState<ToastData[]>([]);
    const [exitingIds, setExitingIds] = useState<number[]>([]);

    function dismiss(id: number) {
        setExitingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
            setExitingIds((prev) => prev.filter((exitId) => exitId !== id));
        }, 260);
    }

    useEffect(() => {
        const handler = (toast: ToastData) => {
            setToasts((prev) => [...prev, toast]);

            setTimeout(() => {
                dismiss(toast.id);
            }, 3200);
        };

        listeners.add(handler);
        return () => {
            listeners.delete(handler);
        };
    }, []);

    if (!toasts.length) return null;

    return (
        <div
            style={{
                position: "fixed",
                bottom: "24px",
                right: "24px",
                zIndex: 1500,
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                pointerEvents: "none",
            }}
        >
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`toast toast-${toast.type}${
                        exitingIds.includes(toast.id) ? " toast-exit" : ""
                    }`}
                    style={{ pointerEvents: "auto" }}
                >
                    <span className="toast-icon">
                        {icons[toast.type]}
                    </span>

                    <div className="toast-content">
                        <strong>{toast.title}</strong>
                        {toast.message && <p>{toast.message}</p>}
                    </div>

                    <button
                        className="toast-close"
                        onClick={() => dismiss(toast.id)}
                        aria-label="Close notification"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}
