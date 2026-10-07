"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import Button from "@/components/ui/Button";
import SearchBox from "@/components/ui/SearchBox";
import Dropdown from "@/components/ui/Dropdown";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import TableSkeleton from "@/components/ui/TableSkeleton";
import Pagination from "@/components/ui/Pagination";
import { showToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import type { RegistrationRequest, RegistrationStatus } from "@/lib/types";

const ITEMS_PER_PAGE = 10;

export interface RegistrationManagementProps {
    onRegistrationsChanged?: (pendingCount: number) => void;
}

export default function RegistrationManagement({
    onRegistrationsChanged,
}: RegistrationManagementProps) {
    const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
    const [pendingCount, setPendingCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [currentPage, setCurrentPage] = useState(1);

    // State for approving/declining
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [declineTarget, setDeclineTarget] = useState<RegistrationRequest | null>(null);
    const [declining, setDeclining] = useState(false);

    const loadRegistrations = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter && statusFilter !== "ALL") {
                params.set("status", statusFilter);
            }
            if (search.trim()) {
                params.set("search", search.trim());
            }

            const response = await fetch(`/api/admin/registrations?${params.toString()}`, {
                cache: "no-store",
            });

            if (!response.ok) {
                throw new Error("Failed to load registrations");
            }

            const data = await response.json();
            setRegistrations(data.registrations || []);
            setPendingCount(data.pendingCount || 0);

            if (onRegistrationsChanged) {
                onRegistrationsChanged(data.pendingCount || 0);
            }

            // Dispatch global event for navbar update
            window.dispatchEvent(
                new CustomEvent("registrationRequestsUpdated", {
                    detail: { pendingCount: data.pendingCount || 0 },
                })
            );
        } catch (error) {
            console.error("LOAD REGISTRATIONS ERROR:", error);
            showToast("error", "Error", "Could not load registration requests.");
        } finally {
            setLoading(false);
        }
    }, [statusFilter, search, onRegistrationsChanged]);

    useEffect(() => {
        void loadRegistrations();
    }, [loadRegistrations]);

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, statusFilter]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(registrations.length / ITEMS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedRegistrations = useMemo(() => {
        const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
        return registrations.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [registrations, safePage]);

    // Handle Approve
    async function handleApprove(user: RegistrationRequest) {
        setUpdatingId(user.id);
        try {
            const response = await fetch(`/api/admin/registrations/${user.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    status: "APPROVED",
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                showToast("error", "Approval Failed", data.message || "Could not approve registration.");
                return;
            }

            showToast("success", "Approved", "Customer registration approved.");
            await loadRegistrations();
        } catch {
            showToast("error", "Error", "Something went wrong while approving.");
        } finally {
            setUpdatingId(null);
        }
    }

    // Handle Decline Confirmation
    async function handleConfirmDecline() {
        if (!declineTarget) return;

        setDeclining(true);
        try {
            const response = await fetch(`/api/admin/registrations/${declineTarget.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    status: "DECLINED",
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                showToast("error", "Decline Failed", data.message || "Could not decline registration.");
                return;
            }

            showToast("success", "Declined", "Customer registration declined.");
            setDeclineTarget(null);
            await loadRegistrations();
        } catch {
            showToast("error", "Error", "Something went wrong while declining.");
        } finally {
            setDeclining(false);
        }
    }

    function renderStatusBadge(status: RegistrationStatus | string) {
        switch (status) {
            case "PENDING":
                return <Badge variant="warning">● Pending</Badge>;
            case "APPROVED":
                return <Badge variant="success">● Approved</Badge>;
            case "DECLINED":
                return <Badge variant="danger">● Declined</Badge>;
            default:
                return <Badge variant="default">{status}</Badge>;
        }
    }

    return (
        <section className="container section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
                <div>
                    <SectionHeader
                        title="Customer Registration Requests"
                        subtitle="Review, approve, or decline new customer accounts before they can access ShopEasy"
                    />
                </div>

                {pendingCount > 0 && (
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px 16px",
                            background: "var(--color-bg-subtle)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: 600,
                        }}
                    >
                        <span>Pending Review:</span>
                        <Badge variant="warning">{pendingCount} Waiting</Badge>
                    </div>
                )}
            </div>

            {/* CONTROLS: SEARCH & FILTER */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "16px",
                    marginBottom: "20px",
                    flexWrap: "wrap",
                }}
            >
                <div style={{ display: "flex", gap: "12px", flex: 1, minWidth: "280px", maxWidth: "600px", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: "200px" }}>
                        <SearchBox
                            value={search}
                            onChange={(val) => setSearch(val)}
                            placeholder="Search by name or email..."
                            style={{ width: "100%" }}
                        />
                    </div>

                    <div style={{ width: "180px" }}>
                        <Dropdown
                            value={statusFilter}
                            onChange={(val) => setStatusFilter(val)}
                            options={[
                                { label: "All Statuses", value: "ALL" },
                                { label: "Pending", value: "PENDING" },
                                { label: "Approved", value: "APPROVED" },
                                { label: "Declined", value: "DECLINED" },
                            ]}
                        />
                    </div>
                </div>

                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => loadRegistrations()}
                    loading={loading}
                >
                    🔄 Refresh
                </Button>
            </div>

            {/* CONTENT AREA */}
            {loading ? (
                <TableSkeleton
                    columns={6}
                    rows={5}
                    headers={["Request ID", "Customer", "Email", "Status", "Date Submitted", "Actions"]}
                />
            ) : registrations.length === 0 ? (
                <EmptyState
                    icon="📝"
                    title={search || statusFilter !== "ALL" ? "No matching registration requests" : "No registration requests found"}
                    description={
                        search || statusFilter !== "ALL"
                            ? "Try adjusting your search query or status filter."
                            : "New customer registrations will appear here for administrator review."
                    }
                />
            ) : (
                <>
                    <div
                        style={{
                            width: "100%",
                            overflowX: "auto",
                            background: "var(--color-bg)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "10px",
                        }}
                    >
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                minWidth: "800px",
                            }}
                        >
                            <thead>
                                <tr style={{ background: "var(--color-bg-subtle)" }}>
                                    <th style={{ textAlign: "left", padding: "14px 16px", borderBottom: "1px solid var(--color-border)", fontSize: "13px", fontWeight: 600 }}>
                                        ID
                                    </th>
                                    <th style={{ textAlign: "left", padding: "14px 16px", borderBottom: "1px solid var(--color-border)", fontSize: "13px", fontWeight: 600 }}>
                                        Customer
                                    </th>
                                    <th style={{ textAlign: "left", padding: "14px 16px", borderBottom: "1px solid var(--color-border)", fontSize: "13px", fontWeight: 600 }}>
                                        Email
                                    </th>
                                    <th style={{ textAlign: "left", padding: "14px 16px", borderBottom: "1px solid var(--color-border)", fontSize: "13px", fontWeight: 600 }}>
                                        Status
                                    </th>
                                    <th style={{ textAlign: "left", padding: "14px 16px", borderBottom: "1px solid var(--color-border)", fontSize: "13px", fontWeight: 600 }}>
                                        Registered
                                    </th>
                                    <th style={{ textAlign: "right", padding: "14px 16px", borderBottom: "1px solid var(--color-border)", fontSize: "13px", fontWeight: 600 }}>
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedRegistrations.map((user, index) => {
                                    const displayId = (safePage - 1) * ITEMS_PER_PAGE + index + 1;

                                    return (
                                        <tr
                                            key={user.id}
                                            style={{
                                                borderBottom: "1px solid var(--color-border)",
                                                transition: "background 0.15s ease",
                                            }}
                                        >
                                            <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                                                <strong>#{displayId}</strong>
                                            </td>
                                        <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                                            <div style={{ fontWeight: 600 }}>{user.name}</div>
                                            <small style={{ color: "var(--color-text-secondary)" }}>Role: {user.role}</small>
                                        </td>
                                        <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                                            <span>{user.email}</span>
                                        </td>
                                        <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                                            {renderStatusBadge(user.status)}
                                        </td>
                                        <td style={{ padding: "14px 16px", verticalAlign: "middle", fontSize: "13px", color: "var(--color-text-secondary)" }}>
                                            {formatDate(user.createdAt)}
                                        </td>
                                        <td style={{ padding: "14px 16px", verticalAlign: "middle", textAlign: "right" }}>
                                            <div style={{ display: "inline-flex", gap: "8px", justifyContent: "flex-end" }}>
                                                {user.status === "PENDING" && (
                                                    <>
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            onClick={() => handleApprove(user)}
                                                            disabled={updatingId === user.id}
                                                            loading={updatingId === user.id}
                                                        >
                                                            ✓ Approve
                                                        </Button>

                                                        <Button
                                                            variant="danger"
                                                            size="sm"
                                                            onClick={() => setDeclineTarget(user)}
                                                            disabled={updatingId === user.id}
                                                        >
                                                            ✕ Decline
                                                        </Button>
                                                    </>
                                                )}

                                                {user.status === "DECLINED" && (
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() => handleApprove(user)}
                                                        disabled={updatingId === user.id}
                                                        loading={updatingId === user.id}
                                                    >
                                                        ✓ Approve
                                                    </Button>
                                                )}

                                                {user.status === "APPROVED" && (
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() => setDeclineTarget(user)}
                                                        disabled={updatingId === user.id}
                                                    >
                                                        ✕ Decline
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div style={{ marginTop: "24px" }}>
                            <Pagination
                                currentPage={safePage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </>
            )}

            {/* CONFIRM DECLINE DIALOG */}
            <ConfirmDialog
                open={Boolean(declineTarget)}
                title="Decline Registration?"
                message={
                    declineTarget ? (
                        <div>
                            <p style={{ margin: "0 0 10px" }}>
                                Are you sure you want to decline this registration request?
                            </p>
                            <div
                                style={{
                                    padding: "10px 12px",
                                    background: "var(--color-bg-subtle)",
                                    borderRadius: "6px",
                                    border: "1px solid var(--color-border)",
                                }}
                            >
                                <strong>{declineTarget.name}</strong> ({declineTarget.email})
                            </div>
                            <p style={{ margin: "10px 0 0", fontSize: "13px" }}>
                                Declined accounts will not be able to log in or access ShopEasy.
                            </p>
                        </div>
                    ) : null
                }
                confirmText="Decline"
                cancelText="Cancel"
                variant="danger"
                loading={declining}
                onConfirm={handleConfirmDecline}
                onCancel={() => {
                    if (!declining) {
                        setDeclineTarget(null);
                    }
                }}
            />
        </section>
    );
}
