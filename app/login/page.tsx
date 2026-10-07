"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import PageLayout from "@/components/layout/PageLayout";
import { showToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import LoginTransition, {
    triggerLoginTransition,
} from "@/components/ui/LoginTransition";

export default function Login() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");

    const [loading, setLoading] = useState(false);
    const [isLoginTransitioning, setIsLoginTransitioning] =
        useState(false);
    const [targetDestination, setTargetDestination] =
        useState("/");

    useEffect(() => {
        localStorage.removeItem("user");

        window.dispatchEvent(
            new Event("userUpdated")
        );
    }, []);

    function validateForm() {
        let valid = true;

        setEmailError("");
        setPasswordError("");

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
                "Please enter your password."
            );
            valid = false;
        }

        return valid;
    }

    async function login() {
        if (loading || isLoginTransitioning) {
            return;
        }

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                "/api/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
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
                    setLoading(false);
                    return;
                }

                if (data.status === "DECLINED") {
                    showToast(
                        "error",
                        "Registration Declined",
                        data.message || "Your registration request was declined."
                    );
                    router.push(
                        `/register/pending?email=${encodeURIComponent(email.trim())}&status=DECLINED`
                    );
                    setLoading(false);
                    return;
                }

                setPasswordError(
                    data.message ||
                        "Invalid email or password."
                );
                setLoading(false);
                return;
            }

            // Authentication succeeded
            localStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );

            window.dispatchEvent(
                new Event("userUpdated")
            );

            showToast(
                "success",
                "Welcome Back!",
                `Logged in as ${
                    data.user.name ||
                    data.user.email
                }`
            );

            const dest =
                data.user.role === "ADMIN"
                    ? "/admin"
                    : "/";

            setTargetDestination(dest);
            setIsLoginTransitioning(true);
            setLoading(false);

            // Trigger the cinematic transition overlay
            triggerLoginTransition({
                destination: dest,
                onComplete: () => {
                    setIsLoginTransitioning(false);
                },
            });
        } catch {
            showToast(
                "error",
                "Error",
                "Something went wrong. Please try again."
            );
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
                                Welcome Back
                            </h2>

                            <p>
                                Sign in to your account to continue
                            </p>
                        </div>

                        {/* FORM */}

                        <form
                            className="auth-form"
                            autoComplete="off"
                            onSubmit={(e) => {
                                e.preventDefault();
                                login();
                            }}
                        >

                            {/* EMAIL */}
                            <div className="form-group">
                                <Input
                                    id="login-email"
                                    name="login-email"
                                    label="Email"
                                    type="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    disabled={loading || isLoginTransitioning}
                                    autoComplete="new-password"
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
                                    id="login-password"
                                    name="login-password"
                                    label="Password"
                                    type="password"
                                    placeholder="Enter your password"
                                    autoComplete="new-password"
                                    value={password}
                                    disabled={loading || isLoginTransitioning}
                                    error={passwordError ? `⚠ ${passwordError}` : undefined}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (e.target.value) {
                                            setPasswordError("");
                                        }
                                    }}
                                />
                            </div>

                            {/* LOGIN BUTTON */}
                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                fullWidth
                                loading={loading || isLoginTransitioning}
                                disabled={loading || isLoginTransitioning}
                            >
                                Sign In
                            </Button>
                        </form>

                        {/* FOOTER */}

                        <div className="auth-footer">
                            Don&apos;t have an account?{" "}

                            <Link href="/register">
                                Create Account
                            </Link>
                        </div>

                    </div>
                </div>

                {/* CINEMATIC TRANSITION COMPONENT */}
                <LoginTransition
                    active={isLoginTransitioning}
                    destination={targetDestination}
                    onComplete={() => setIsLoginTransitioning(false)}
                />
            </section>

        </PageLayout>
    );
}