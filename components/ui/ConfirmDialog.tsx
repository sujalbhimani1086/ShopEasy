"use client";

import React from "react";
import Modal from "./Modal";
import Button from "./Button";

export interface ConfirmDialogProps {
    open: boolean;
    title?: string;
    message: React.ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    loading?: boolean;
    variant?: "danger" | "primary";
}

export default function ConfirmDialog({
    open,
    title = "Confirm Action",
    message,
    onConfirm,
    onCancel,
    confirmText = "Confirm",
    cancelText = "Cancel",
    loading = false,
    variant = "danger",
}: ConfirmDialogProps) {
    return (
        <Modal
            open={open}
            onClose={loading ? () => {} : onCancel}
            title={title}
            maxWidth="460px"
            footer={
                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", width: "100%" }}>
                    <Button
                        variant="secondary"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant={variant}
                        onClick={onConfirm}
                        loading={loading}
                    >
                        {confirmText}
                    </Button>
                </div>
            }
        >
            <div style={{ color: "var(--color-text-secondary)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
                {message}
            </div>
        </Modal>
    );
}
