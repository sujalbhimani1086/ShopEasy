"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import PageLayout from "@/components/layout/PageLayout";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { showToast } from "@/components/ui/Toast";

type ApprovalStatus = "PENDING" | "APPROVED" | "DECLINED" | "UNKNOWN";

export default function RegistrationPendingPage() {
    return (
        <Suspense
            fallback={
                <PageLayout>
                    <section className="container">
                        <div className="auth-container">
                            <div className="auth-card" style={{ padding: "40px 28px", textAlign: "center" }}>
                                <Skeleton variant="title" width="60%" height="28px" style={{ margin: "0 auto 16px" }} />
                                <Skeleton variant="text" width="80%" height="16px" style={{ margin: "0 auto 8px" }} />
                                <Skeleton variant="text" width="50%" height="16px" style={{ margin: "0 auto 24px" }} />
                                <Skeleton variant="button" width="100%" height="44px" />
                            </div>
                        </div>
                    </section>
                </PageLayout>
            }
        >
            <RegistrationPendingContent />
        </Suspense>
    );
}

function RegistrationPendingContent() {
    const searchParams = useSearchParams();
    const emailParam = searchParams.get("email") || "";
    const initialStatusParam = searchParams.get("status");

    const [email, setEmail] = useState(emailParam);
    const [status, setStatus] = useState<ApprovalStatus>(() => {
        const s = (initialStatusParam || "").toUpperCase();
        if (s === "APPROVED") return "APPROVED";
        if (s === "DECLINED") return "DECLINED";
        return "PENDING";
    });
    const [userName, setUserName] = useState("");
    const [checking, setChecking] = useState(false);
    const [lastChecked, setLastChecked] = useState<string | null>(null);

    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    const checkStatus = useCallback(async (isManual = false) => {
        if (!email) return;

        if (isManual) {
            setChecking(true);
        }

        try {
            const res = await fetch(`/api/auth/registration-status?email=${encodeURIComponent(email)}`, {
                cache: "no-store",
            });

            if (!res.ok) {
                if (isManual) {
                    showToast("error", "Status Check", "Could not check registration status.");
                }
                return;
            }

            const data = await res.json();
            if (data.status) {
                const currentStatus: ApprovalStatus =
                    data.status === "APPROVED"
                        ? "APPROVED"
                        : data.status === "DECLINED"
                        ? "DECLINED"
                        : "PENDING";

                setStatus(currentStatus);
                if (data.name) {
                    setUserName(data.name);
                }

                setLastChecked(new Date().toLocaleTimeString());

                if (isManual) {
                    if (currentStatus === "APPROVED") {
                        showToast("success", "Approved!", "Your account has been approved! You can now log in.");
                    } else if (currentStatus === "DECLINED") {
                        showToast("error", "Declined", "Your registration request was declined.");
                    } else {
                        showToast("info", "Pending", "Your registration is still awaiting administrator approval.");
                    }
                }
            }
        } catch (error) {
            console.error("STATUS CHECK ERROR:", error);
            if (isManual) {
                showToast("error", "Error", "Network error while checking status.");
            }
        } finally {
            if (isManual) {
                setChecking(false);
            }
        }
    }, [email]);

    // Initial check on mount
    useEffect(() => {
        if (email) {
            void checkStatus(false);
        }
    }, [email, checkStatus]);

    // Lightweight polling every 10 seconds only while status === PENDING
    useEffect(() => {
        if (status !== "PENDING" || !email) {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
            return;
        }

        pollingRef.current = setInterval(() => {
            void checkStatus(false);
        }, 10000);

        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        };
    }, [status, email, checkStatus]);

    return (
        <PageLayout>
            <section className="container">
                <div className="auth-container" style={{ maxWidth: "520px", margin: "40px auto" }}>
                    <div
                        className="auth-card"
                        style={{
                            padding: "36px 30px",
                            textAlign: "center",
                            background: "var(--color-bg)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "12px",
                            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                        }}
                    >
                        {/* BRAND LOGO */}
                        <div style={{ marginBottom: "20px", display: "flex", justifyContent: "center" }}>
                            <Image
                                src="/logo-icon.png"
                                alt="ShopEasy"
                                width={44}
                                height={44}
                                unoptimized
                                priority
                                style={{ objectFit: "contain" }}
                            />
                        </div>

                        {/* STATUS: APPROVED */}
                        {status === "APPROVED" && (
                            <div>
                                <div style={{ marginBottom: "16px" }}>
                                    <Badge variant="success" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
                                        ● Approved
                                    </Badge>
                                </div>

                                <h2 style={{ fontSize: "1.6rem", fontWeight: 700, margin: "0 0 12px", color: "var(--color-text)" }}>
                                    Your Account Has Been Approved
                                </h2>

                                <p style={{ color: "var(--color-text-secondary)", fontSize: "0.95rem", lineHeight: 1.6, margin: "0 0 24px" }}>
                                    {userName ? `Welcome, ${userName}! ` : ""}
                                    Your registration request has been reviewed and approved by the administrator. You now have full access to ShopEasy.
                                </p>

                                <div
                                    style={{
                                        background: "var(--color-bg-subtle)",
                                        border: "1px solid var(--color-border)",
                                        borderRadius: "8px",
                                        padding: "16px",
                                        marginBottom: "24px",
                                        textAlign: "left",
                                    }}
                                >
                                    <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "4px" }}>
                                        Approved Account:
                                    </div>
                                    <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--color-text)" }}>
                                        {email || "Registered Account"}
                                    </div>
                                </div>

                                <Link href="/login" style={{ textDecoration: "none" }}>
                                    <Button variant="primary" size="lg" fullWidth>
                                        Go to Login
                                    </Button>
                                </Link>
                            </div>
                        )}

                        {/* STATUS: DECLINED */}
                        {status === "DECLINED" && (
                            <div>
                                <div style={{ marginBottom: "16px" }}>
                                    <Badge variant="danger" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
                                        ● Registration Declined
                                    </Badge>
                                </div>

                                <h2 style={{ fontSize: "1.6rem", fontWeight: 700, margin: "0 0 12px", color: "var(--color-text)" }}>
                                    Registration Declined
                                </h2>

                                <p style={{ color: "var(--color-text-secondary)", fontSize: "0.95rem", lineHeight: 1.6, margin: "0 0 24px" }}>
                                    Your registration request was not approved by the administrator. Unapproved accounts cannot access the ShopEasy catalog or customer features.
                                </p>

                                <div
                                    style={{
                                        background: "var(--color-bg-subtle)",
                                        border: "1px solid var(--color-border)",
                                        borderRadius: "8px",
                                        padding: "16px",
                                        marginBottom: "24px",
                                        textAlign: "left",
                                    }}
                                >
                                    <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "4px" }}>
                                        Account Email:
                                    </div>
                                    <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--color-text)" }}>
                                        {email || "Registered Account"}
                                    </div>
                                </div>

                                <Link href="/login" style={{ textDecoration: "none" }}>
                                    <Button variant="secondary" size="lg" fullWidth>
                                        Back to Login
                                    </Button>
                                </Link>
                            </div>
                        )}

                        {/* STATUS: PENDING */}
                        {status === "PENDING" && (
                            <div>
                                <div style={{ marginBottom: "16px" }}>
                                    <Badge variant="warning" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
                                        ● Pending Approval
                                    </Badge>
                                </div>

                                <h2 style={{ fontSize: "1.6rem", fontWeight: 700, margin: "0 0 12px", color: "var(--color-text)" }}>
                                    Waiting for Admin Approval
                                </h2>

                                <p style={{ color: "var(--color-text-secondary)", fontSize: "0.95rem", lineHeight: 1.6, margin: "0 0 20px" }}>
                                    Your account registration has been successfully submitted and is currently awaiting administrator review and approval.
                                </p>

                                <div
                                    style={{
                                        background: "var(--color-bg-subtle)",
                                        border: "1px solid var(--color-border)",
                                        borderRadius: "8px",
                                        padding: "18px",
                                        marginBottom: "24px",
                                        textAlign: "left",
                                    }}
                                >
                                    <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "8px", color: "var(--color-text)" }}>
                                        📋 Next Steps:
                                    </div>
                                    <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.85rem", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                                        <li>An administrator reviews pending customer registrations.</li>
                                        <li>Once approved, you will be able to log in with your credentials.</li>
                                        <li>You do not need to register again.</li>
                                    </ul>

                                    {email && (
                                        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--color-border)", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                                            Registered as: <strong style={{ color: "var(--color-text)" }}>{email}</strong>
                                        </div>
                                    )}

                                    {lastChecked && (
                                        <div style={{ marginTop: "6px", fontSize: "0.75rem", color: "var(--color-text-secondary)", opacity: 0.8 }}>
                                            Last checked: {lastChecked}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    {email && (
                                        <Button
                                            type="button"
                                            variant="primary"
                                            size="lg"
                                            fullWidth
                                            onClick={() => checkStatus(true)}
                                            loading={checking}
                                        >
                                            🔄 Check Approval Status
                                        </Button>
                                    )}

                                    <Link href="/login" style={{ textDecoration: "none" }}>
                                        <Button type="button" variant="secondary" size="lg" fullWidth>
                                            Return to Login
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </PageLayout>
    );
}
