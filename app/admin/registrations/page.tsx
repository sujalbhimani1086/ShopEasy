"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageLayout from "@/components/layout/PageLayout";
import RegistrationManagement from "@/components/admin/RegistrationManagement";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { showToast } from "@/components/ui/Toast";

export default function AdminRegistrationsPage() {
    return (
        <Suspense
            fallback={
                <PageLayout>
                    <div className="container section" aria-busy="true">
                        <TableSkeleton columns={6} rows={6} />
                    </div>
                </PageLayout>
            }
        >
            <AdminRegistrationsContent />
        </Suspense>
    );
}

function AdminRegistrationsContent() {
    const router = useRouter();
    const [authorized, setAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        try {
            const stored = localStorage.getItem("user");
            if (!stored) {
                router.push("/login");
                return;
            }

            const parsed = JSON.parse(stored);
            if (parsed.role !== "ADMIN") {
                showToast("error", "Access Denied", "Admin access required.");
                router.push("/");
                return;
            }

            setAuthorized(true);
        } catch {
            router.push("/login");
        }
    }, [router]);

    if (!authorized) {
        return (
            <PageLayout>
                <div className="container section" aria-busy="true">
                    <TableSkeleton columns={6} rows={6} />
                </div>
            </PageLayout>
        );
    }

    return (
        <PageLayout>
            <div style={{ paddingTop: "20px", paddingBottom: "40px" }}>
                <RegistrationManagement />
            </div>
        </PageLayout>
    );
}
