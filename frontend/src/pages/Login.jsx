import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import api from "../api/api";
import "./Login.css";

export default function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // -------------------------------------------------------------------------
    // SUPPORT BOTH VERIFICATION AND PASSWORD RESET LINKS
    // -------------------------------------------------------------------------

    const verificationToken =
        searchParams.get("token") ||
        searchParams.get("verify_token");

    const resetToken =
        searchParams.get("reset_token") ||
        searchParams.get("token");

    const urlMode = searchParams.get("mode");

    const initialMode =
        urlMode === "reset"
            ? "reset"
            : verificationToken
              ? "verify"
              : "login";

    const [mode, setMode] = useState(initialMode);

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
            localStorage.getItem("herdsense-theme") ||
            "dark"
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
    // EMAIL VERIFICATION
    // =========================================================================

    useEffect(() => {
        if (!verificationToken || urlMode === "reset") {
            return;
        }

        const verifyAccount = async () => {
            setLoading(true);
            setError("");
            setSuccess("");

            try {
                const response = await api.get(
                    "/auth/verify-email",
                    {
                        params: {
                            token: verificationToken,
                        },
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
    }, [verificationToken, urlMode]);

    // =========================================================================
    // MODE SWITCH
    // =========================================================================

    const switchMode = (newMode) => {
        setMode(newMode);

        setError("");
        setSuccess("");

        if (newMode === "login") {
            setPassword("");
            setConfirmPassword("");
        }

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

        const normalizedEmail =
            email.trim().toLowerCase();

        if (!normalizedEmail || !password) {
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
                normalizedEmail
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
                authenticatedUser.role || "farmer"
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

        const normalizedEmail =
            email.trim().toLowerCase();

        const normalizedName =
            fullName.trim();

        if (
            !normalizedName ||
            !normalizedEmail ||
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
                    full_name: normalizedName,
                    email: normalizedEmail,
                    password,
                }
            );

            setEmail(normalizedEmail);
            setPassword("");
            setConfirmPassword("");

            setSuccess(
                "Account created successfully. Check your email and verify your account before signing in."
            );

            setMode("login");
        } catch (err) {
            console.error(
                "Registration error:",
                err
            );

            setError(
                typeof err.response?.data?.detail ===
                    "string"
                    ? err.response.data.detail
                    : "Registration failed. Please check your connection and try again."
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

        const normalizedEmail =
            email.trim().toLowerCase();

        if (!normalizedEmail) {
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
                    email: normalizedEmail,
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

        if (!resetToken) {
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
                    token: resetToken,
                    new_password: password,
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

        const normalizedEmail =
            email.trim().toLowerCase();

        if (!normalizedEmail) {
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
                    email: normalizedEmail,
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
    // SHARED MESSAGES
    // =========================================================================

    const renderMessages = () => (
        <>
            {error && (
                <div
                    className="login-error"
                    role="alert"
                >
                    <span>!</span>
                    <p>{error}</p>
                </div>
            )}

            {success && (
                <div
                    className="login-success"
                    role="status"
                >
                    <span>✓</span>
                    <p>{success}</p>
                </div>
            )}
        </>
    );

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

                    <div className="login-eyebrow">
                        ACCOUNT VERIFICATION
                    </div>

                    <h2>
                        {loading
                            ? "Verifying email"
                            : "Email verification"}
                    </h2>

                    <p className="login-subtitle">
                        {loading
                            ? "Please wait while we activate your HerdSense AI account."
                            : "Your verification request has been processed."}
                    </p>

                    {renderMessages()}

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
        // RESET
        // ---------------------------------------------------------------------

        if (mode === "reset") {
            return (
                <form
                    onSubmit={
                        handleResetPassword
                    }
                    noValidate
                >
                    <div className="login-eyebrow">
                        ACCOUNT SECURITY
                    </div>

                    <h2>Reset password</h2>

                    <p className="login-subtitle">
                        Create a new secure password
                        for your HerdSense AI account.
                    </p>

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

                    {renderMessages()}

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
        // FORGOT
        // ---------------------------------------------------------------------

        if (mode === "forgot") {
            return (
                <form
                    onSubmit={
                        handleForgotPassword
                    }
                    noValidate
                >
                    <div className="login-eyebrow">
                        ACCOUNT RECOVERY
                    </div>

                    <h2>Forgot password?</h2>

                    <p className="login-subtitle">
                        Enter your email and we'll
                        send you a secure password
                        reset link.
                    </p>

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

                    {renderMessages()}

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
        // REGISTER
        // ---------------------------------------------------------------------

        if (mode === "register") {
            return (
                <form
                    onSubmit={handleRegister}
                    noValidate
                >
                    <div className="login-eyebrow">
                        HERDSENSE AI ACCESS
                    </div>

                    <h2>Create your account</h2>

                    <p className="login-subtitle">
                        Create an account to access
                        your livestock intelligence
                        platform.
                    </p>

                    <div className="field">
                        <label htmlFor="fullName">
                            Full name
                        </label>

                        <div className="input-shell">
                            <span className="input-icon">
                                •
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

                    {renderMessages()}

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
        }

        // ---------------------------------------------------------------------
        // LOGIN
        // ---------------------------------------------------------------------

        return (
            <form
                onSubmit={handleLogin}
                noValidate
            >
                <div className="login-eyebrow">
                    HERDSENSE AI ACCESS
                </div>

                <h2>Welcome back</h2>

                <p className="login-subtitle">
                    Sign in to your livestock
                    intelligence command center.
                </p>

                <div className="field">
                    <label htmlFor="loginEmail">
                        Email address
                    </label>

                    <div className="input-shell">
                        <span className="input-icon">
                            @
                        </span>

                        <input
                            id="loginEmail"
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
                        <label htmlFor="loginPassword">
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
                            id="loginPassword"
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

                {renderMessages()}

                <button
                    type="submit"
                    className="login-submit"
                    disabled={loading}
                >
                    <span>
                        {loading
                            ? "Signing in..."
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
                        Didn't verify your email?
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
                        Don't have an account?
                    </span>

                    <button
                        type="button"
                        className="auth-switch-button"
                        onClick={() =>
                            switchMode("register")
                        }
                    >
                        Create account
                    </button>
                </div>

                <div className="secure-note">
                    <span className="secure-check">
                        ✓
                    </span>

                    <span>
                        Secure authentication
                        protected by HerdSense AI
                    </span>
                </div>
            </form>
        );
    };

    // =========================================================================
    // PAGE
    // =========================================================================

    return (
        <div className="login-page">
            <div className="login-grid" />

            <div className="login-glow login-glow-one" />
            <div className="login-glow login-glow-two" />

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

                    <span>
                        {theme === "dark"
                            ? "Light"
                            : "Dark"}
                    </span>
                </button>
            </header>

            <main className="login-main">
                <section className="login-hero">
                    <div className="system-status">
                        <span className="system-status-dot" />
                        <span>
                            HERDSENSE AI ·
                            INTELLIGENCE SYSTEM
                        </span>
                    </div>

                    <h1>
                        Intelligence
                        <br />
                        for every
                        <br />
                        animal.
                    </h1>

                    <p className="hero-description">
                        A unified livestock
                        intelligence platform for
                        monitoring animal health,
                        telemetry, environmental
                        conditions and actionable
                        insights.
                    </p>

                    <div className="feature-list">
                        <div className="feature-item">
                            <span className="feature-number">
                                01
                            </span>

                            <div>
                                <strong>
                                    LIVE ANIMAL
                                    INTELLIGENCE
                                </strong>

                                <span>
                                    Monitor health and
                                    behavioral signals
                                    in real time.
                                </span>
                            </div>
                        </div>

                        <div className="feature-item">
                            <span className="feature-number">
                                02
                            </span>

                            <div>
                                <strong>
                                    TELEMETRY
                                    ANALYTICS
                                </strong>

                                <span>
                                    Transform animal
                                    data into
                                    operational
                                    decisions.
                                </span>
                            </div>
                        </div>

                        <div className="feature-item">
                            <span className="feature-number">
                                03
                            </span>

                            <div>
                                <strong>
                                    PROACTIVE
                                    ALERTS
                                </strong>

                                <span>
                                    Identify abnormal
                                    conditions before
                                    they escalate.
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="login-card">
                    <div className="login-card-inner">
                        <div className="login-card-logo">
                            <img
                                src="/herdsense-logo.jpg"
                                alt="HerdSense AI"
                                className="herdsense-logo-image"
                                onError={(event) => {
                                    console.error(
                                        "HerdSense AI logo failed to load:",
                                        event.currentTarget.src
                                    );
                                }}
                            />
                        </div>

                        {renderAuthContent()}
                    </div>
                </section>
            </main>

            <footer className="login-footer">
                <span>
                    © 2026 HerdSense AI
                </span>

                <span>
                    LIVESTOCK INTELLIGENCE
                    PLATFORM
                </span>

                <span>
                    SECURE ACCESS
                </span>
            </footer>
        </div>
    );
}