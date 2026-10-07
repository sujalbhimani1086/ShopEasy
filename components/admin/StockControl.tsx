"use client";

type StockControlProps = {
    productId: number;
    productName: string;
    stock: number;
    value: string;
    onValueChange: (value: string) => void;
    onSave: () => void;
    isSaving: boolean;
    onDelete?: () => void;
    isDeleting?: boolean;
};

export default function StockControl({
    productName,
    stock,
    value,
    onValueChange,
    onSave,
    isSaving,
    onDelete,
    isDeleting = false,
}: StockControlProps) {
    const handleMinus = () => {
        const current = Number(value || stock);
        const next = Math.max(0, (Number.isFinite(current) ? current : 0) - 1);
        onValueChange(String(next));
    };

    const handlePlus = () => {
        const current = Number(value || stock);
        const next = (Number.isFinite(current) ? current : 0) + 1;
        onValueChange(String(next));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const cleaned = e.target.value.replace(/\D/g, "");
        onValueChange(cleaned);
    };

    return (
        <div
            style={{
                display: "flex",
                gap: "6px",
                marginTop: "8px",
                alignItems: "stretch",
            }}
        >
            {/* MINUS */}
            <button
                type="button"
                className="btn btn-secondary"
                onClick={handleMinus}
                style={{
                    width: "44px",
                    minWidth: "44px",
                    padding: 0,
                    fontSize: "22px",
                    fontWeight: "700",
                }}
                disabled={isSaving || isDeleting}
                aria-label={`Decrease stock for ${productName}`}
            >
                −
            </button>

            {/* NUMERIC INPUT */}
            <input
                className="admin-stock-input"
                type="text"
                inputMode="numeric"
                value={value}
                onChange={handleChange}
                disabled={isSaving || isDeleting}
                aria-label={`Stock for ${productName}`}
            />

            {/* PLUS */}
            <button
                type="button"
                className="btn btn-secondary"
                onClick={handlePlus}
                style={{
                    width: "44px",
                    minWidth: "44px",
                    padding: 0,
                    fontSize: "22px",
                    fontWeight: "700",
                }}
                disabled={isSaving || isDeleting}
                aria-label={`Increase stock for ${productName}`}
            >
                +
            </button>

            {/* SAVE */}
            <button
                type="button"
                className="btn btn-primary stock-save"
                onClick={onSave}
                disabled={isSaving || isDeleting}
                style={{
                    flex: 1,
                    minWidth: "56px",
                    padding: "0 8px",
                }}
            >
                {isSaving ? "Saving..." : "Save"}
            </button>

            {/* DELETE */}
            {onDelete && (
                <button
                    type="button"
                    className="btn btn-danger stock-delete-btn"
                    onClick={() => {
                        if (stock === 0) {
                            onDelete();
                        }
                    }}
                    disabled={stock > 0 || isSaving || isDeleting}
                    style={{
                        opacity: stock > 0 ? 0.5 : 1,
                        cursor: stock > 0 ? "not-allowed" : "pointer",
                    }}
                    title={
                        stock > 0
                            ? "Only products with 0 stock can be deleted"
                            : "Delete product"
                    }
                    aria-label={`Delete product ${productName}`}
                >
                    {isDeleting ? "⏳" : "🗑️"}
                </button>
            )}
        </div>
    );
}