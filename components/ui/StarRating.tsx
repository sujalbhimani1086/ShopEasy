"use client";

import { useState } from "react";

type StarRatingProps = {
    rating: number; // 0 to 5
    maxStars?: number;
    interactive?: boolean;
    size?: "sm" | "md" | "lg";
    onChange?: (newRating: number) => void;
    showValue?: boolean;
};

export default function StarRating({
    rating,
    maxStars = 5,
    interactive = false,
    size = "md",
    onChange,
    showValue = false,
}: StarRatingProps) {
    const [hoverRating, setHoverRating] = useState<number | null>(null);

    const activeRating = hoverRating !== null ? hoverRating : rating;

    const sizeMap = {
        sm: { fontSize: "14px", gap: "2px" },
        md: { fontSize: "18px", gap: "3px" },
        lg: { fontSize: "24px", gap: "5px" },
    };

    return (
        <div
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: sizeMap[size].gap,
            }}
            aria-label={`Rating: ${rating} out of ${maxStars} stars`}
        >
            {Array.from({ length: maxStars }).map((_, index) => {
                const starIndex = index + 1;
                const isFilled = starIndex <= activeRating;

                return (
                    <button
                        key={starIndex}
                        type="button"
                        disabled={!interactive}
                        onClick={() => interactive && onChange?.(starIndex)}
                        onMouseEnter={() => interactive && setHoverRating(starIndex)}
                        onMouseLeave={() => interactive && setHoverRating(null)}
                        style={{
                            background: "transparent",
                            border: "none",
                            padding: 0,
                            margin: 0,
                            cursor: interactive ? "pointer" : "default",
                            color: isFilled ? "#f59e0b" : "#cbd5e1",
                            fontSize: sizeMap[size].fontSize,
                            lineHeight: 1,
                            transition: "transform 0.15s ease, color 0.15s ease",
                            transform:
                                interactive && hoverRating === starIndex
                                    ? "scale(1.2)"
                                    : "scale(1)",
                        }}
                        aria-label={interactive ? `${starIndex} star` : undefined}
                    >
                        ★
                    </button>
                );
            })}

            {showValue && (
                <span
                    style={{
                        marginLeft: "6px",
                        fontSize: size === "sm" ? "12px" : "14px",
                        fontWeight: 600,
                        color: "var(--color-text)",
                    }}
                >
                    {rating > 0 ? rating.toFixed(1) : "0.0"}
                </span>
            )}
        </div>
    );
}
