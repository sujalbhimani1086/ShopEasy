"use client";

import React from "react";

type PaginationProps = {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    maxVisiblePages?: number;
    variant?: "buttons" | "circles";
    info?: string;
};

export default function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    variant = "buttons",
    info,
}: PaginationProps) {
    if (totalPages <= 0) return null;

    // Standardized rule: Maximum visible numbered buttons = 3
    // Always shows only the first 3 page numbers: 1, 2, 3 (no ellipsis)
    const buttonCount = Math.min(3, Math.max(1, totalPages));
    const pageItems = Array.from({ length: buttonCount }, (_, i) => i + 1);

    const isPrevDisabled = currentPage <= 1;
    const isNextDisabled = currentPage >= totalPages;

    const handlePrev = () => {
        if (!isPrevDisabled) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (!isNextDisabled) {
            onPageChange(currentPage + 1);
        }
    };

    if (variant === "circles") {
        return (
            <div className="catalog-pagination">
                <button
                    type="button"
                    onClick={handlePrev}
                    disabled={isPrevDisabled}
                >
                    PREVIOUS
                </button>

                {pageItems.map((pageNumber) => {
                    const isActive = currentPage === pageNumber;
                    return (
                        <button
                            key={pageNumber}
                            type="button"
                            onClick={() => onPageChange(pageNumber)}
                            aria-current={isActive ? "page" : undefined}
                            className={isActive ? "active" : undefined}
                        >
                            <span>{pageNumber}</span>
                        </button>
                    );
                })}

                <button
                    type="button"
                    onClick={handleNext}
                    disabled={isNextDisabled}
                >
                    NEXT
                </button>

                {info && <span>{info}</span>}
            </div>
        );
    }

    return (
        <div className="admin-pagination">
            <button
                type="button"
                className="btn"
                onClick={handlePrev}
                disabled={isPrevDisabled}
            >
                ← Previous
            </button>

            {pageItems.map((pageNumber) => {
                const isActive = currentPage === pageNumber;
                return (
                    <button
                        key={pageNumber}
                        type="button"
                        className={isActive ? "btn btn-primary" : "btn"}
                        onClick={() => onPageChange(pageNumber)}
                        style={{ minWidth: "42px" }}
                    >
                        {pageNumber}
                    </button>
                );
            })}

            <button
                type="button"
                className="btn"
                onClick={handleNext}
                disabled={isNextDisabled}
            >
                Next →
            </button>

            {info && (
                <span
                    style={{
                        fontSize: "13px",
                        color: "var(--color-text-secondary)",
                        marginLeft: "8px",
                        alignSelf: "center",
                    }}
                >
                    {info}
                </span>
            )}
        </div>
    );
}
