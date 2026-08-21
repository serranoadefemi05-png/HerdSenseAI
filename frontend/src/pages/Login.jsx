import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import api from "../api/api";
import "./Login.css";

export default function Login() {
    const navigate = useNavigate();

    const [searchParams] = useSearchParams();

    const verificationToken = searchParams.get("token");

    const [mode, setMode] = useState(
        verificationToken ? "verify" : "login"
    );

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

    const [theme, setTheme] = useState(() => {
        return (
            localStorage.getItem("herdsense-theme") || "dark"
        );
    });

    // =========================================================================
    // THEME
    // =========================================================================

    useEffect(() => {
        document.documentElement.setAttribute(
            "data-theme",
            theme
        );

        localStorage.setItem(
            "herdsense-theme",
            theme
        );
    }, [theme]);

    const toggleTheme = () => {
        setTheme((current) =>
            current === "dark" ? "light" : "dark"
        );
    };

    // =========================================================================
    // VERIFY EMAIL FROM URL
    // =========================================================================

    useEffect(() => {
        if (!verificationToken) {
            return;
        }

        const verifyAccount = async () => {
            setLoading(true);
            setError("");
            setSuccess("");

            try {
                const response = await api.post(
                    "/auth/verify-email",
                    {
                        token: verificationToken,
                    }
                );

                setSuccess(
                    response.data?.message ||
                        "Email verified successfully. You can now sign in."
                );

                setMode("login");
            } catch (err) {
                console.error(
                    "Email verification error:",
                    err
                );

                setError(
                    err.response?.data?.detail ||
                        "This verification link is invalid or has expired."
                );

                setMode("login");
            } finally {
                setLoading(false);
            }
        };

        verifyAccount();
    }, [verificationToken]);

    // =========================================================================
    // MODE
    // =========================================================================

    const switchMode = (newMode) => {
        setMode(newMode);

        setError("");
        setSuccess("");

        setPassword("");
        setConfirmPassword("");

        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    // =========================================================================
    // LOGIN
    // =========================================================================

    const handleLogin = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (!email.trim() || !password) {
            setError(
                "Enter your email and password."
            );

            return;
        }

        setLoading(true);

        try {
            const formData = new URLSearchParams();

            formData.append(
                "username",
                email.trim().toLowerCase()
            );

            formData.append(
                "password",
                password
            );

            const response = await api.post(
                "/auth/login",
                formData,
                {
                    headers: {
                        "Content-Type":
                            "application/x-www-form-urlencoded",
                    },
                }
            );

            const token =
                response.data?.access_token;

            if (!token) {
                throw new Error(
                    "Authentication succeeded but no access token was returned."
                );
            }

            const authenticatedUser =
                response.data?.user;

            if (!authenticatedUser) {
                throw new Error(
                    "Authentication succeeded but no user profile was returned."
                );
            }

            localStorage.setItem(
                "access_token",
                token
            );

            localStorage.setItem(
                "token",
                token
            );

            localStorage.setItem(
                "herdsense_user",
                JSON.stringify(
                    authenticatedUser
                )
            );

            localStorage.setItem(
                "user_role",
                authenticatedUser.role
            );

            if (
                authenticatedUser.role?.toLowerCase() ===
                "admin"
            ) {
                navigate("/admin", {
                    replace: true,
                });

                return;
            }

            navigate("/dashboard", {
                replace: true,
            });
        } catch (err) {
            console.error(
                "Login error:",
                err
            );

            if (err.response?.status === 403) {
                setError(
                    err.response?.data?.detail ||
                        "Please verify your email address before signing in."
                );
            } else if (
                err.response?.status === 401
            ) {
                setError(
                    "Invalid email or password."
                );
            } else if (
                err.response?.data?.detail
            ) {
                setError(
                    typeof err.response.data.detail ===
                        "string"
                        ? err.response.data.detail
                        : "Unable to authenticate."
                );
            } else {
                setError(
                    "Login failed. Please check your connection and try again."
                );
            }
        } finally {
            setLoading(false);
        }
    };

    // =========================================================================
    // REGISTER
    // =========================================================================

    const handleRegister = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (
            !fullName.trim() ||
            !email.trim() ||
            !password ||
            !confirmPassword
        ) {
            setError(
                "Complete all required fields."
            );

            return;
        }

        if (password.length < 8) {
            setError(
                "Password must be at least 8 characters."
            );

            return;
        }

        if (password !== confirmPassword) {
            setError(
                "Passwords do not match."
            );

            return;
        }

        setLoading(true);

        try {
            await api.post(
                "/auth/register",
                {
                    full_name:
                        fullName.trim(),

                    email:
                        email.trim().toLowerCase(),

                    password,
                }
            );

            setSuccess(
                "Account created. Check your Gmail inbox and verify your email before signing in."
            );

            setMode("login");

            setPassword("");
            setConfirmPassword("");
        } catch (err) {
            console.error(
                "Registration error:",
                err
            );

            setError(
                err.response?.data?.detail ||
                    "Registration failed. Please check your connection and try again."
            );
        } finally {
            setLoading(false);
        }
    };

    // =========================================================================
    // FORGOT PASSWORD
    // =========================================================================

    const handleForgotPassword = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (!email.trim()) {
            setError(
                "Enter your email address."
            );

            return;
        }

        setLoading(true);

        try {
            const response = await api.post(
                "/auth/forgot-password",
                {
                    email:
                        email.trim().toLowerCase(),
                }
            );

            setSuccess(
                response.data?.message ||
                    "If an account exists for this email, a password reset link has been sent."
            );
        } catch (err) {
            console.error(
                "Forgot password error:",
                err
            );

            setError(
                err.response?.data?.detail ||
                    "Unable to process your password reset request."
            );
        } finally {
            setLoading(false);
        }
    };

    // =========================================================================
    // RESET PASSWORD
    // =========================================================================

    const handleResetPassword = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (!password || !confirmPassword) {
            setError(
                "Enter and confirm your new password."
            );

            return;
        }

        if (password.length < 8) {
            setError(
                "Password must be at least 8 characters."
            );

            return;
        }

        if (password !== confirmPassword) {
            setError(
                "Passwords do not match."
            );

            return;
        }

        if (!verificationToken) {
            setError(
                "Password reset token is missing."
            );

            return;
        }

        setLoading(true);

        try {
            const response = await api.post(
                "/auth/reset-password",
                {
                    token:
                        verificationToken,

                    new_password:
                        password,
                }
            );

            setSuccess(
                response.data?.message ||
                    "Password reset successfully. You can now sign in."
            );

            setPassword("");
            setConfirmPassword("");

            setMode("login");
        } catch (err) {
            console.error(
                "Password reset error:",
                err
            );

            setError(
                err.response?.data?.detail ||
                    "Unable to reset your password."
            );
        } finally {
            setLoading(false);
        }
    };

    // =========================================================================
    // RESEND VERIFICATION
    // =========================================================================

    const handleResendVerification = async () => {
        setError("");
        setSuccess("");

        if (!email.trim()) {
            setError(
                "Enter your email address first."
            );

            return;
        }

        setLoading(true);

        try {
            const response = await api.post(
                "/auth/resend-verification",
                {
                    email:
                        email.trim().toLowerCase(),
                }
            );

            setSuccess(
                response.data?.message ||
                    "A verification email has been sent."
            );
        } catch (err) {
            console.error(
                "Resend verification error:",
                err
            );

            setError(
                err.response?.data?.detail ||
                    "Unable to resend the verification email."
            );
        } finally {
            setLoading(false);
        }
    };

    // =========================================================================
    // AUTH CONTENT
    // =========================================================================

    const renderAuthContent = () => {
        // ---------------------------------------------------------------------
        // VERIFY
        // ---------------------------------------------------------------------

        if (mode === "verify") {
            return (
                <div className="auth-message-view">
                    <div className="auth-status-icon">
                        {loading ? "..." : "✓"}
                    </div>

                    <h2>
                        {loading
                            ? "Verifying email..."
                            : "Email verification"}
                    </h2>

                    <p className="login-subtitle">
                        {loading
                            ? "Please wait while we activate your HerdSense AI account."
                            : "Your verification request has been processed."}
                    </p>

                    {error && (
                        <div className="login-error">
                            <span>!</span>
                            <p>{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="login-success">
                            <span>✓</span>
                            <p>{success}</p>
                        </div>
                    )}

                    {!loading && (
                        <button
                            type="button"
                            className="login-submit"
                            onClick={() =>
                                switchMode("login")
                            }
                        >
                            <span>
                                Continue to sign in
                            </span>

                            <span className="submit-arrow">
                                →
                            </span>
                        </button>
                    )}
                </div>
            );
        }

        // ---------------------------------------------------------------------
        // RESET PASSWORD
        // ---------------------------------------------------------------------

        if (mode === "reset") {
            return (
                <form
                    onSubmit={
                        handleResetPassword
                    }
                >
                    <div className="field">
                        <label htmlFor="resetPassword">
                            New password
                        </label>

                        <div className="input-shell">
                            <span className="input-icon">
                                •••
                            </span>

                            <input
                                id="resetPassword"
                                type={
                                    showPassword
                                        ? "text"
                                        : "password"
                                }
                                value={password}
                                onChange={(e) =>
                                    setPassword(
                                        e.target.value
                                    )
                                }
                                placeholder="Minimum 8 characters"
                                autoComplete="new-password"
                                required
                            />

                            <button
                                type="button"
                                className="show-password"
                                onClick={() =>
                                    setShowPassword(
                                        (current) =>
                                            !current
                                    )
                                }
                            >
                                {showPassword
                                    ? "Hide"
                                    : "Show"}
                            </button>
                        </div>
                    </div>

                    <div className="field">
                        <label htmlFor="resetConfirmPassword">
                            Confirm new password
                        </label>

                        <div className="input-shell">
                            <span className="input-icon">
                                •••
                            </span>

                            <input
                                id="resetConfirmPassword"
                                type={
                                    showConfirmPassword
                                        ? "text"
                                        : "password"
                                }
                                value={
                                    confirmPassword
                                }
                                onChange={(e) =>
                                    setConfirmPassword(
                                        e.target.value
                                    )
                                }
                                placeholder="Re-enter your password"
                                autoComplete="new-password"
                                required
                            />

                            <button
                                type="button"
                                className="show-password"
                                onClick={() =>
                                    setShowConfirmPassword(
                                        (current) =>
                                            !current
                                    )
                                }
                            >
                                {showConfirmPassword
                                    ? "Hide"
                                    : "Show"}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="login-error">
                            <span>!</span>
                            <p>{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="login-success">
                            <span>✓</span>
                            <p>{success}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="login-submit"
                        disabled={loading}
                    >
                        <span>
                            {loading
                                ? "Updating password..."
                                : "Set new password"}
                        </span>

                        {!loading && (
                            <span className="submit-arrow">
                                →
                            </span>
                        )}
                    </button>

                    <div className="auth-switch">
                        <span>
                            Remember your password?
                        </span>

                        <button
                            type="button"
                            className="auth-switch-button"
                            onClick={() =>
                                switchMode("login")
                            }
                        >
                            Sign in
                        </button>
                    </div>
                </form>
            );
        }

        // ---------------------------------------------------------------------
        // FORGOT PASSWORD
        // ---------------------------------------------------------------------

        if (mode === "forgot") {
            return (
                <form
                    onSubmit={
                        handleForgotPassword
                    }
                >
                    <div className="field">
                        <label htmlFor="forgotEmail">
                            Email address
                        </label>

                        <div className="input-shell">
                            <span className="input-icon">
                                @
                            </span>

                            <input
                                id="forgotEmail"
                                type="email"
                                value={email}
                                onChange={(e) =>
                                    setEmail(
                                        e.target.value
                                    )
                                }
                                placeholder="you@example.com"
                                autoComplete="email"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="login-error">
                            <span>!</span>
                            <p>{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="login-success">
                            <span>✓</span>
                            <p>{success}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="login-submit"
                        disabled={loading}
                    >
                        <span>
                            {loading
                                ? "Sending..."
                                : "Send reset link"}
                        </span>

                        {!loading && (
                            <span className="submit-arrow">
                                →
                            </span>
                        )}
                    </button>

                    <div className="auth-switch">
                        <button
                            type="button"
                            className="auth-switch-button"
                            onClick={() =>
                                switchMode("login")
                            }
                        >
                            ← Back to sign in
                        </button>
                    </div>
                </form>
            );
        }

        // ---------------------------------------------------------------------
        // LOGIN
        // ---------------------------------------------------------------------

        if (mode === "login") {
            return (
                <form
                    onSubmit={handleLogin}
                >
                    <div className="field">
                        <label htmlFor="email">
                            Email address
                        </label>

                        <div className="input-shell">
                            <span className="input-icon">
                                @
                            </span>

                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) =>
                                    setEmail(
                                        e.target.value
                                    )
                                }
                                placeholder="you@example.com"
                                autoComplete="email"
                                required
                            />
                        </div>
                    </div>

                    <div className="field">
                        <div className="password-label-row">
                            <label htmlFor="password">
                                Password
                            </label>

                            <button
                                type="button"
                                className="forgot-link"
                                onClick={() =>
                                    switchMode("forgot")
                                }
                            >
                                Forgot password?
                            </button>
                        </div>

                        <div className="input-shell">
                            <span className="input-icon">
                                •••
                            </span>

                            <input
                                id="password"
                                type={
                                    showPassword
                                        ? "text"
                                        : "password"
                                }
                                value={password}
                                onChange={(e) =>
                                    setPassword(
                                        e.target.value
                                    )
                                }
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                required
                            />

                            <button
                                type="button"
                                className="show-password"
                                onClick={() =>
                                    setShowPassword(
                                        (current) =>
                                            !current
                                    )
                                }
                            >
                                {showPassword
                                    ? "Hide"
                                    : "Show"}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="login-error">
                            <span>!</span>
                            <p>{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="login-success">
                            <span>✓</span>
                            <p>{success}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="login-submit"
                        disabled={loading}
                    >
                        <span>
                            {loading
                                ? "Authenticating..."
                                : "Sign in"}
                        </span>

                        {!loading && (
                            <span className="submit-arrow">
                                →
                            </span>
                        )}
                    </button>

                    <div className="verification-resend">
                        <span>
                            Didn't receive your verification email?
                        </span>

                        <button
                            type="button"
                            className="auth-switch-button"
                            onClick={
                                handleResendVerification
                            }
                            disabled={loading}
                        >
                            Resend verification
                        </button>
                    </div>

                    <div className="auth-switch">
                        <span>
                            New to HerdSense AI?
                        </span>

                        <button
                            type="button"
                            className="auth-switch-button"
                            onClick={() =>
                                switchMode("register")
                            }
                        >
                            Create an account
                        </button>
                    </div>
                </form>
            );
        }

        // ---------------------------------------------------------------------
        // REGISTER
        // ---------------------------------------------------------------------

        return (
            <form
                onSubmit={handleRegister}
            >
                <div className="field">
                    <label htmlFor="fullName">
                        Full name
                    </label>

                    <div className="input-shell">
                        <span className="input-icon">
                            ◉
                        </span>

                        <input
                            id="fullName"
                            type="text"
                            value={fullName}
                            onChange={(e) =>
                                setFullName(
                                    e.target.value
                                )
                            }
                            placeholder="Your full name"
                            autoComplete="name"
                            required
                        />
                    </div>
                </div>

                <div className="field">
                    <label htmlFor="registerEmail">
                        Email address
                    </label>

                    <div className="input-shell">
                        <span className="input-icon">
                            @
                        </span>

                        <input
                            id="registerEmail"
                            type="email"
                            value={email}
                            onChange={(e) =>
                                setEmail(
                                    e.target.value
                                )
                            }
                            placeholder="you@example.com"
                            autoComplete="email"
                            required
                        />
                    </div>
                </div>

                <div className="field">
                    <label htmlFor="registerPassword">
                        Password
                    </label>

                    <div className="input-shell">
                        <span className="input-icon">
                            •••
                        </span>

                        <input
                            id="registerPassword"
                            type={
                                showPassword
                                    ? "text"
                                    : "password"
                            }
                            value={password}
                            onChange={(e) =>
                                setPassword(
                                    e.target.value
                                )
                            }
                            placeholder="Minimum 8 characters"
                            autoComplete="new-password"
                            required
                        />

                        <button
                            type="button"
                            className="show-password"
                            onClick={() =>
                                setShowPassword(
                                    (current) =>
                                        !current
                                )
                            }
                        >
                            {showPassword
                                ? "Hide"
                                : "Show"}
                        </button>
                    </div>
                </div>

                <div className="field">
                    <label htmlFor="confirmPassword">
                        Confirm password
                    </label>

                    <div className="input-shell">
                        <span className="input-icon">
                            •••
                        </span>

                        <input
                            id="confirmPassword"
                            type={
                                showConfirmPassword
                                    ? "text"
                                    : "password"
                            }
                            value={
                                confirmPassword
                            }
                            onChange={(e) =>
                                setConfirmPassword(
                                    e.target.value
                                )
                            }
                            placeholder="Re-enter your password"
                            autoComplete="new-password"
                            required
                        />

                        <button
                            type="button"
                            className="show-password"
                            onClick={() =>
                                setShowConfirmPassword(
                                    (current) =>
                                        !current
                                )
                            }
                        >
                            {showConfirmPassword
                                ? "Hide"
                                : "Show"}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="login-error">
                        <span>!</span>
                        <p>{error}</p>
                    </div>
                )}

                {success && (
                    <div className="login-success">
                        <span>✓</span>
                        <p>{success}</p>
                    </div>
                )}

                <button
                    type="submit"
                    className="login-submit"
                    disabled={loading}
                >
                    <span>
                        {loading
                            ? "Creating account..."
                            : "Create account"}
                    </span>

                    {!loading && (
                        <span className="submit-arrow">
                            →
                        </span>
                    )}
                </button>

                <div className="auth-switch">
                    <span>
                        Already have an account?
                    </span>

                    <button
                        type="button"
                        className="auth-switch-button"
                        onClick={() =>
                            switchMode("login")
                        }
                    >
                        Sign in
                    </button>
                </div>
            </form>
        );
    };

    // =========================================================================
    // TITLES
    // =========================================================================

    const getEyebrow = () => {
        if (mode === "register") {
            return "FARMER REGISTRATION";
        }

        if (mode === "forgot") {
            return "ACCOUNT RECOVERY";
        }

        if (mode === "reset") {
            return "PASSWORD RECOVERY";
        }

        if (mode === "verify") {
            return "EMAIL VERIFICATION";
        }

        return "SECURE ACCESS";
    };

    const getTitle = () => {
        if (mode === "register") {
            return "Create your account.";
        }

        if (mode === "forgot") {
            return "Recover your account.";
        }

        if (mode === "reset") {
            return "Set a new password.";
        }

        if (mode === "verify") {
            return "Verify your account.";
        }

        return "Welcome back.";
    };

    const getSubtitle = () => {
        if (mode === "register") {
            return (
                "Create your HerdSense AI account to begin monitoring your livestock."
            );
        }

        if (mode === "forgot") {
            return (
                "Enter your email and we'll send you a secure password reset link."
            );
        }

        if (mode === "reset") {
            return (
                "Choose a strong new password for your HerdSense AI account."
            );
        }

        if (mode === "verify") {
            return (
                "We're confirming your email address."
            );
        }

        return (
            "Sign in to your HerdSense command center."
        );
    };

    // =========================================================================
    // UI
    // =========================================================================

    return (
        <div className="login-page">
            <div className="login-grid" />

            <div className="login-glow login-glow-one" />

            <div className="login-glow login-glow-two" />

            {/* ================================================================
                HEADER
            ================================================================= */}

            <header className="login-header">
                <button
                    type="button"
                    className="theme-toggle"
                    onClick={toggleTheme}
                    aria-label="Toggle theme"
                >
                    <span className="theme-icon">
                        {theme === "dark"
                            ? "☼"
                            : "☾"}
                    </span>

                    {theme === "dark"
                        ? "Light"
                        : "Dark"}
                </button>
            </header>

            {/* ================================================================
                MAIN
            ================================================================= */}

            <main className="login-main">

                {/* ============================================================
                    HERO
                ============================================================= */}

                <section className="login-hero">

                    <div className="system-status">
                        <span className="system-status-dot" />

                        SYSTEM ONLINE
                    </div>

                    <h1>
                        Intelligence
                        <br />
                        for every animal.
                    </h1>

                    <p className="hero-description">
                        Monitor livestock health,
                        telemetry and alerts from
                        a single operational command
                        center.
                    </p>

                    <div className="feature-list">

                        <div className="feature-item">

                            <span className="feature-number">
                                01
                            </span>

                            <div>
                                <strong>
                                    Live telemetry
                                </strong>

                                <span>
                                    Continuous sensor monitoring
                                </span>
                            </div>

                        </div>

                        <div className="feature-item">

                            <span className="feature-number">
                                02
                            </span>

                            <div>
                                <strong>
                                    Health intelligence
                                </strong>

                                <span>
                                    Detect abnormal animal conditions
                                </span>
                            </div>

                        </div>

                        <div className="feature-item">

                            <span className="feature-number">
                                03
                            </span>

                            <div>
                                <strong>
                                    Operational alerts
                                </strong>

                                <span>
                                    Respond before problems escalate
                                </span>
                            </div>

                        </div>

                    </div>

                </section>

                {/* ============================================================
                    AUTH CARD
                ============================================================= */}

                <section className="login-card">

                    <div className="login-card-inner">

                        {/* OFFICIAL HERDSENSE LOGO */}

                        <div className="login-card-logo">
                            <img
                                src="/Qm6NSEu-_400x400.jpg"
                                alt="herdsense"
                            />
                        </div>

                        <div className="login-eyebrow">
                            {getEyebrow()}
                        </div>

                        <h2>
                            {getTitle()}
                        </h2>

                        <p className="login-subtitle">
                            {getSubtitle()}
                        </p>

                        {renderAuthContent()}

                        <div className="secure-note">

                            <span className="secure-check">
                                ✓
                            </span>

                            Secure connection to HerdSense AI

                        </div>

                    </div>

                </section>

            </main>

            {/* ================================================================
                FOOTER
            ================================================================= */}

            <footer className="login-footer">

                <span>
                    HerdSense AI
                </span>

                <span>
                    Livestock intelligence platform
                </span>

                <span>
                    © 2026
                </span>

            </footer>
        </div>
    );
}