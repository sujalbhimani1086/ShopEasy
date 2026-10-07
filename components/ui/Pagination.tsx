"use client";

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
    maxVisiblePages,
    variant = "buttons",
    info,
}: PaginationProps) {
    if (totalPages <= 1) return null;

    const visibleCount = Math.min(
        totalPages,
        maxVisiblePages ?? totalPages
    );
    const firstPage = Math.min(
        Math.max(1, currentPage - Math.floor((visibleCount - 1) / 2)),
        totalPages - visibleCount + 1
    );
    const pages = Array.from(
        { length: visibleCount },
        (_, index) => firstPage + index
    );

    if (variant === "circles") {
        return (
            <div className="catalog-pagination">
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    PREVIOUS
                </button>

                {pages.map((page) => {
                    const isActive = currentPage === page;
                    return (
                        <button
                            key={page}
                            type="button"
                            onClick={() => onPageChange(page)}
                            aria-current={isActive ? "page" : undefined}
                            className={isActive ? "active" : undefined}
                        >
                            <span>{page}</span>
                        </button>
                    );
                })}

                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
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
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
            >
                ← Previous
            </button>

            {pages.map((page) => (
                <button
                    key={page}
                    type="button"
                    className={currentPage === page ? "btn btn-primary" : "btn"}
                    onClick={() => onPageChange(page)}
                    style={{ minWidth: "42px" }}
                >
                    {page}
                </button>
            ))}

            <button
                type="button"
                className="btn"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
            >
                Next →
            </button>
        </div>
    );
}
