"use client";

import React, { useState, useEffect } from "react";
import Button from "./Button";

export interface ImageUploadProps {
    file?: File | null;
    imageUrl?: string;
    onFileChange: (file: File | null) => void;
    onUrlChange?: (url: string) => void;
    label?: string;
    helperText?: string;
    disabled?: boolean;
    className?: string;
}

export default function ImageUpload({
    file,
    imageUrl,
    onFileChange,
    onUrlChange,
    label = "Product Image",
    helperText,
    disabled = false,
    className = "",
}: ImageUploadProps) {
    const [preview, setPreview] = useState<string>("");

    useEffect(() => {
        if (file) {
            const objectUrl = URL.createObjectURL(file);
            setPreview(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        } else if (imageUrl) {
            setPreview(imageUrl);
        } else {
            setPreview("");
        }
    }, [file, imageUrl]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null;
        onFileChange(selectedFile);
        if (selectedFile && onUrlChange) {
            onUrlChange("");
        }
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (onUrlChange) {
            onUrlChange(val);
        }
        if (val.trim()) {
            onFileChange(null);
        }
    };

    const handleClear = () => {
        onFileChange(null);
        if (onUrlChange) {
            onUrlChange("");
        }
        setPreview("");
    };

    return (
        <div className={`form-group image-upload-group ${className}`.trim()}>
            {label && <label className="form-label">{label}</label>}

            {/* Preview Box */}
            {preview && (
                <div
                    style={{
                        position: "relative",
                        width: "120px",
                        height: "120px",
                        borderRadius: "var(--radius-lg)",
                        overflow: "hidden",
                        border: "1px solid var(--color-border)",
                        marginBottom: "12px",
                        background: "var(--color-bg-subtle)",
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={preview}
                        alt="Upload preview"
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                        }}
                    />
                    <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={handleClear}
                        disabled={disabled}
                        aria-label="Remove image"
                        style={{
                            position: "absolute",
                            top: "4px",
                            right: "4px",
                            padding: "2px 6px",
                            fontSize: "12px",
                            lineHeight: 1,
                            minWidth: "auto",
                        }}
                    >
                        ✕
                    </Button>
                </div>
            )}

            <div className="file-input-wrapper">
                <input
                    type="file"
                    accept="image/*"
                    disabled={disabled}
                    onChange={handleFileChange}
                />
            </div>

            {onUrlChange && (
                <>
                    <small style={{ display: "block", marginTop: "8px", color: "var(--color-text-secondary)" }}>
                        Or enter an online image URL:
                    </small>
                    <input
                        className="form-input"
                        type="url"
                        value={imageUrl || ""}
                        disabled={disabled}
                        onChange={handleUrlChange}
                        placeholder="https://example.com/product.jpg"
                        style={{ marginTop: "6px" }}
                    />
                </>
            )}

            {helperText && (
                <small style={{ display: "block", marginTop: "6px", color: "var(--color-text-secondary)" }}>
                    {helperText}
                </small>
            )}
        </div>
    );
}
