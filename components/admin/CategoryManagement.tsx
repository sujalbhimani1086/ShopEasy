"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import Button from "@/components/ui/Button";
import SearchBox from "@/components/ui/SearchBox";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { showToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import type { Category } from "@/lib/types";

export interface CategoryManagementProps {
    onCategoriesChanged?: () => void;
}

export default function CategoryManagement({
    onCategoriesChanged,
}: CategoryManagementProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Modal state for Add/Edit
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [categoryNameInput, setCategoryNameInput] = useState("");
    const [inputError, setInputError] = useState("");
    const [saving, setSaving] = useState(false);

    // Delete dialog state
    const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Load categories from Admin API
    const loadCategories = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/admin/categories", {
                cache: "no-store",
            });

            if (!response.ok) {
                // Fallback to public categories API
                const fallbackRes = await fetch("/api/categories", {
                    cache: "no-store",
                });
                if (fallbackRes.ok) {
                    const fallbackData = await fallbackRes.json();
                    setCategories(fallbackData);
                    return;
                }
                throw new Error("Failed to load categories");
            }

            const data: Category[] = await response.json();
            setCategories(data);
        } catch (error) {
            console.error("LOAD CATEGORIES ERROR:", error);
            showToast("error", "Error", "Could not load categories. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadCategories();
    }, [loadCategories]);

    // Filter categories based on search query
    const filteredCategories = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return categories;
        return categories.filter((cat) =>
            cat.name.toLowerCase().includes(query)
        );
    }, [categories, search]);

    // Open Add Category Modal
    function openAddModal() {
        setEditingCategory(null);
        setCategoryNameInput("");
        setInputError("");
        setModalOpen(true);
    }

    // Open Edit Category Modal
    function openEditModal(category: Category) {
        setEditingCategory(category);
        setCategoryNameInput(category.name);
        setInputError("");
        setModalOpen(true);
    }

    // Close Modal and clear inputs
    function closeModal() {
        if (saving) return;
        setModalOpen(false);
        setEditingCategory(null);
        setCategoryNameInput("");
        setInputError("");
    }

    // Save Category (Add or Edit)
    async function handleSaveCategory(e?: React.FormEvent) {
        if (e) e.preventDefault();

        const trimmed = categoryNameInput.trim();
        if (!trimmed) {
            setInputError("Category name is required.");
            return;
        }

        if (trimmed.length > 50) {
            setInputError("Category name must be under 50 characters.");
            return;
        }

        // Duplicate check on frontend
        const isDuplicate = categories.some(
            (c) =>
                c.name.toLowerCase() === trimmed.toLowerCase() &&
                (!editingCategory || c.id !== editingCategory.id)
        );

        if (isDuplicate) {
            setInputError("Category already exists.");
            showToast("error", "Duplicate Category", "Category already exists.");
            return;
        }

        setSaving(true);
        setInputError("");

        try {
            if (editingCategory) {
                // EDIT Category
                const response = await fetch(
                    `/api/admin/categories/${editingCategory.id}`,
                    {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: trimmed }),
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    const msg = data.message || "Failed to update category.";
                    setInputError(msg);
                    showToast("error", "Update Failed", msg);
                    return;
                }

                showToast(
                    "success",
                    "Category Updated",
                    `Category updated to "${trimmed}".`
                );
            } else {
                // ADD Category
                const response = await fetch("/api/admin/categories", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: trimmed }),
                });

                const data = await response.json();

                if (!response.ok) {
                    const msg = data.message || "Failed to create category.";
                    setInputError(msg);
                    showToast("error", "Creation Failed", msg);
                    return;
                }

                showToast(
                    "success",
                    "Category Added",
                    `Category "${trimmed}" created successfully.`
                );
            }

            // Close modal and refresh
            setModalOpen(false);
            setEditingCategory(null);
            setCategoryNameInput("");
            await loadCategories();

            // Broadcast event so Navbar and Add Product dropdown update automatically
            window.dispatchEvent(new Event("categoriesUpdated"));
            onCategoriesChanged?.();
        } catch (error) {
            console.error("SAVE CATEGORY ERROR:", error);
            showToast("error", "Error", "Something went wrong. Please try again.");
        } finally {
            setSaving(false);
        }
    }

    // Delete Category with Safety Check
    async function handleDeleteCategory() {
        if (!deleteTarget) return;

        // Check if category has products
        if (deleteTarget.productCount && deleteTarget.productCount > 0) {
            showToast(
                "error",
                "Cannot Delete Category",
                "Cannot delete this category because products are using it."
            );
            setDeleteTarget(null);
            return;
        }

        setDeleting(true);

        try {
            const response = await fetch(
                `/api/admin/categories/${deleteTarget.id}`,
                {
                    method: "DELETE",
                }
            );

            const data = await response.json();

            if (!response.ok) {
                showToast(
                    "error",
                    "Deletion Blocked",
                    data.message ||
                        "Cannot delete this category because products are using it."
                );
                return;
            }

            showToast(
                "success",
                "Category Deleted",
                `Category "${deleteTarget.name}" deleted successfully.`
            );

            setDeleteTarget(null);
            await loadCategories();

            // Broadcast event
            window.dispatchEvent(new Event("categoriesUpdated"));
            onCategoriesChanged?.();
        } catch (error) {
            console.error("DELETE CATEGORY ERROR:", error);
            showToast(
                "error",
                "Error",
                "Could not delete category. Please try again."
            );
        } finally {
            setDeleting(false);
        }
    }

    return (
        <section className="container" style={{ width: "100%", maxWidth: "1200px", margin: "0 auto" }}>
            <SectionHeader
                title="Category Management"
                subtitle="Create, edit, and organize product categories for your store"
            />

            {/* ACTION TOOLBAR */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "16px",
                    marginBottom: "24px",
                    flexWrap: "wrap",
                }}
            >
                <div style={{ flex: "1 1 280px", maxWidth: "400px" }}>
                    <SearchBox
                        value={search}
                        onChange={(val) => setSearch(val)}
                        placeholder="Search categories..."
                        style={{ minHeight: "44px" }}
                    />
                </div>

                <Button
                    variant="primary"
                    onClick={openAddModal}
                    style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                    ➕ Add Category
                </Button>
            </div>

            {/* CONTENT AREA */}
            {loading ? (
                <TableSkeleton columns={4} rows={6} />
            ) : filteredCategories.length === 0 ? (
                <EmptyState
                    icon="📁"
                    title={search ? "No matching categories" : "No categories yet"}
                    description={
                        search
                            ? `No categories found matching "${search}".`
                            : "Get started by adding your first product category."
                    }
                    actionLabel={!search ? "➕ Add Category" : undefined}
                    onAction={!search ? openAddModal : undefined}
                />
            ) : (
                <div
                    style={{
                        overflowX: "auto",
                        background: "var(--color-bg)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "16px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                    }}
                >
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            textAlign: "left",
                            fontSize: "0.9375rem",
                        }}
                    >
                        <thead>
                            <tr
                                style={{
                                    borderBottom: "1px solid var(--color-border)",
                                    background: "var(--color-bg-subtle, #141414)",
                                }}
                            >
                                <th style={{ padding: "14px 18px", fontWeight: 600 }}>Category Name</th>
                                <th style={{ padding: "14px 18px", fontWeight: 600 }}>Products</th>
                                <th style={{ padding: "14px 18px", fontWeight: 600 }}>Created Date</th>
                                <th style={{ padding: "14px 18px", fontWeight: 600, textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCategories.map((cat) => (
                                <tr
                                    key={cat.id}
                                    style={{
                                        borderBottom: "1px solid var(--color-border)",
                                        transition: "background-color 0.15s ease",
                                    }}
                                >
                                    {/* CATEGORY NAME */}
                                    <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <span style={{ fontSize: "1.125rem" }}>📁</span>
                                            <strong style={{ color: "var(--color-text)" }}>
                                                {cat.name}
                                            </strong>
                                        </div>
                                    </td>

                                    {/* PRODUCT COUNT BADGE */}
                                    <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                                        <Badge
                                            variant={
                                                cat.productCount && cat.productCount > 0
                                                    ? "success"
                                                    : "secondary"
                                            }
                                        >
                                            {cat.productCount ?? 0} {cat.productCount === 1 ? "Product" : "Products"}
                                        </Badge>
                                    </td>

                                    {/* CREATED DATE */}
                                    <td style={{ padding: "16px 18px", verticalAlign: "middle", color: "var(--color-text-secondary)" }}>
                                        {cat.createdAt ? formatDate(cat.createdAt) : "—"}
                                    </td>

                                    {/* ACTIONS */}
                                    <td style={{ padding: "16px 18px", verticalAlign: "middle", textAlign: "right" }}>
                                        <div style={{ display: "inline-flex", gap: "8px", justifyContent: "flex-end" }}>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => openEditModal(cat)}
                                            >
                                                Edit
                                            </Button>

                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => setDeleteTarget(cat)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ADD / EDIT CATEGORY MODAL */}
            <Modal
                open={modalOpen}
                onClose={closeModal}
                title={editingCategory ? "Edit Category" : "Add Category"}
                maxWidth="460px"
                footer={
                    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", width: "100%" }}>
                        <Button
                            variant="secondary"
                            onClick={closeModal}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => void handleSaveCategory()}
                            loading={saving}
                        >
                            {editingCategory ? "Save Changes" : "Add Category"}
                        </Button>
                    </div>
                }
            >
                <form onSubmit={handleSaveCategory}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <label
                            htmlFor="category-name-input"
                            style={{
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                color: "var(--color-text)",
                            }}
                        >
                            Category Name
                        </label>
                        <input
                            id="category-name-input"
                            className="form-input"
                            type="text"
                            placeholder="e.g. Gaming, Electronics, Home"
                            value={categoryNameInput}
                            autoFocus
                            disabled={saving}
                            onChange={(e) => {
                                setCategoryNameInput(e.target.value);
                                if (inputError) setInputError("");
                            }}
                            style={{
                                borderColor: inputError ? "var(--color-danger)" : undefined,
                            }}
                        />
                        {inputError && (
                            <span
                                style={{
                                    fontSize: "0.8125rem",
                                    color: "var(--color-danger)",
                                    marginTop: "2px",
                                }}
                            >
                                ⚠ {inputError}
                            </span>
                        )}
                        <small style={{ color: "var(--color-text-secondary)", marginTop: "4px" }}>
                            Category name must be unique and descriptive.
                        </small>
                    </div>
                </form>
            </Modal>

            {/* DELETE CATEGORY CONFIRM DIALOG */}
            <ConfirmDialog
                open={Boolean(deleteTarget)}
                title="Delete Category?"
                variant="danger"
                loading={deleting}
                confirmText="Delete"
                cancelText="Cancel"
                onCancel={() => setDeleteTarget(null)}
                onConfirm={() => void handleDeleteCategory()}
                message={
                    <div>
                        Are you sure you want to delete category{" "}
                        <strong style={{ color: "var(--color-text)" }}>
                            {deleteTarget?.name}
                        </strong>
                        ?
                        {deleteTarget?.productCount && deleteTarget.productCount > 0 ? (
                            <div
                                style={{
                                    marginTop: "12px",
                                    padding: "10px 14px",
                                    borderRadius: "8px",
                                    background: "rgba(239, 68, 68, 0.12)",
                                    border: "1px solid rgba(239, 68, 68, 0.25)",
                                    color: "var(--color-danger)",
                                    fontSize: "0.875rem",
                                }}
                            >
                                ⚠ <strong>Cannot delete:</strong> {deleteTarget.productCount} product(s) are currently categorized under this category. Please reassign or delete those products first.
                            </div>
                        ) : (
                            <p style={{ marginTop: "8px", fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                                This action will remove the category from the store.
                            </p>
                        )}
                    </div>
                }
            />
        </section>
    );
}
