"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import PageLayout from "@/components/layout/PageLayout";
import { showToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function Register() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [nameError, setNameError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");

    const [loading, setLoading] = useState(false);

    function validateForm() {
        let valid = true;

        setNameError("");
        setEmailError("");
        setPasswordError("");

        if (!name.trim()) {
            setNameError(
                "Please enter your name."
            );
            valid = false;
        }

        if (!email.trim()) {
            setEmailError(
                "Please enter your email."
            );
            valid = false;
        } else if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                email.trim()
            )
        ) {
            setEmailError(
                "Please enter a valid email."
            );
            valid = false;
        }

        if (!password) {
            setPasswordError(
                "Please enter a password."
            );
            valid = false;
        } else if (password.length < 6) {
            setPasswordError(
                "Password must be at least 6 characters."
            );
            valid = false;
        }

        return valid;
    }

    async function register() {
        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                "/api/register",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        name: name.trim(),
                        email: email.trim(),
                        password,
                    }),
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                if (data.status === "PENDING") {
                    showToast(
                        "info",
                        "Pending Approval",
                        data.message || "Your registration is waiting for admin approval."
                    );
                    router.push(
                        `/register/pending?email=${encodeURIComponent(email.trim())}`
                    );
                    return;
                }

                if (data.status === "DECLINED") {
                    showToast(
                        "error",
                        "Registration Declined",
                        data.message || "Your previous registration was declined."
                    );
                    router.push(
                        `/register/pending?email=${encodeURIComponent(email.trim())}&status=DECLINED`
                    );
                    return;
                }

                setEmailError(
                    data.message ||
                        "Could not create account."
                );

                return;
            }

            showToast(
                "success",
                "Registration Submitted!",
                "Your account is waiting for administrator approval."
            );

            router.push(
                `/register/pending?email=${encodeURIComponent(email.trim())}`
            );
        } catch {
            showToast(
                "error",
                "Error",
                "Something went wrong. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <PageLayout>
            <section className="container">
                <div className="auth-container">
                    <div className="auth-card">

                        {/* HEADER */}

                        <div className="auth-header">
                            <div className="auth-header-icon">
                                <Image
                                    src="/logo-icon.png"
                                    alt="ShopEasy Logo"
                                    width={38}
                                    height={38}
                                    unoptimized
                                    priority
                                    style={{
                                        objectFit: "contain",
                                        display: "block",
                                    }}
                                />
                            </div>

                            <h2>
                                Create Account
                            </h2>

                            <p>
                                Join ShopEasy and start shopping
                            </p>
                        </div>

                        {/* FORM */}

                        <div className="auth-form">
                            {/* FULL NAME */}
                            <div className="form-group">
                                <Input
                                    id="register-name"
                                    name="register-name"
                                    label="Full Name"
                                    type="text"
                                    placeholder="Enter your name"
                                    value={name}
                                    error={nameError ? `⚠ ${nameError}` : undefined}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        if (e.target.value.trim()) {
                                            setNameError("");
                                        }
                                    }}
                                />
                            </div>

                            {/* EMAIL */}
                            <div className="form-group">
                                <Input
                                    id="register-email"
                                    name="register-email"
                                    label="Email"
                                    type="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    error={emailError ? `⚠ ${emailError}` : undefined}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (e.target.value.trim()) {
                                            setEmailError("");
                                        }
                                    }}
                                />
                            </div>

                            {/* PASSWORD */}
                            <div className="form-group">
                                <Input
                                    id="register-password"
                                    name="register-password"
                                    label="Password"
                                    type="password"
                                    placeholder="Create a password"
                                    value={password}
                                    error={passwordError ? `⚠ ${passwordError}` : undefined}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (e.target.value.length >= 6) {
                                            setPasswordError("");
                                        }
                                    }}
                                />
                            </div>

                            {/* SUBMIT */}
                            <Button
                                type="button"
                                variant="primary"
                                size="lg"
                                fullWidth
                                onClick={register}
                                loading={loading}
                            >
                                Create Account
                            </Button>
                        </div>

                        {/* FOOTER */}

                        <div className="auth-footer">
                            Already have an account?{" "}

                            <Link href="/login">
                                Sign In
                            </Link>
                        </div>

                    </div>
                </div>
            </section>
        </PageLayout>
    );
}