"use client";

import React, { useEffect } from "react";

export interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: string | number;
    className?: string;
}

export default function Modal({
    open,
    onClose,
    title,
    children,
    footer,
    maxWidth = "600px",
    className = "",
}: ModalProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && open) {
                onClose();
            }
        };

        if (open) {
            document.body.style.overflow = "hidden";
            window.addEventListener("keydown", handleKeyDown);
        }

        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="user-modal-overlay"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className={`user-modal-container ${className}`.trim()}
                style={{ maxWidth }}
                onClick={(e) => e.stopPropagation()}
            >
                {title && (
                    <div className="user-modal-header">
                        <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--color-text)" }}>
                            {title}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close modal"
                            style={{
                                background: "transparent",
                                border: "none",
                                fontSize: "20px",
                                lineHeight: 1,
                                cursor: "pointer",
                                color: "var(--color-text-secondary)",
                                padding: "4px 8px",
                                borderRadius: "var(--radius-md)",
                            }}
                        >
                            ✕
                        </button>
                    </div>
                )}

                <div className="user-modal-body">
                    {children}
                </div>

                {footer && (
                    <div className="user-modal-footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
