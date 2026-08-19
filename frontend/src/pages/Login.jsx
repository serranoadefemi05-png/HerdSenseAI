import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/api";
import "./Login.css";


export default function Login() {

    const navigate = useNavigate();

    const [mode, setMode] =
        useState("login");

    const [email, setEmail] =
        useState("farmer@herdsense.ai");

    const [password, setPassword] =
        useState("");

    const [fullName, setFullName] =
        useState("");

    const [confirmPassword, setConfirmPassword] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");

    const [showPassword, setShowPassword] =
        useState(false);

    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);


    const [theme, setTheme] =
        useState(() => {
            return (
                localStorage.getItem(
                    "herdsense-theme"
                ) || "dark"
            );
        });


    /* ========================================================================
       THEME
       ======================================================================== */

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
            current === "dark"
                ? "light"
                : "dark"
        );

    };


    /* ========================================================================
       MODE
       ======================================================================== */

    const switchMode = (newMode) => {

        setMode(newMode);

        setError("");
        setSuccess("");

        setPassword("");
        setConfirmPassword("");

        setShowPassword(false);
        setShowConfirmPassword(false);

    };


    /* ========================================================================
       LOGIN
       ======================================================================== */

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

            const formData =
                new URLSearchParams();

            formData.append(
                "username",
                email.trim().toLowerCase()
            );

            formData.append(
                "password",
                password
            );


            const response =
                await api.post(
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


            /* ==================================================================
               STORE TOKEN
            ================================================================== */

            localStorage.setItem(
                "access_token",
                token
            );

            localStorage.setItem(
                "token",
                token
            );


            /* ==================================================================
               STORE USER
            ================================================================== */

            localStorage.setItem(
                "herdsense_user",
                JSON.stringify(
                    authenticatedUser
                )
            );


            /* ==================================================================
               STORE ROLE
            ================================================================== */

            localStorage.setItem(
                "user_role",
                authenticatedUser.role
            );


            console.log(
                "HerdSense AI authentication successful:",
                authenticatedUser
            );


            /* ==================================================================
               ROLE ROUTING
            ================================================================== */

            if (
                authenticatedUser.role
                    ?.toLowerCase() ===
                "admin"
            ) {

                navigate(
                    "/admin",
                    {
                        replace: true,
                    }
                );

                return;
            }


            /* ==================================================================
               FARMER
            ================================================================== */

            navigate(
                "/dashboard",
                {
                    replace: true,
                }
            );

        } catch (err) {

            console.error(
                "Login error:",
                err
            );


            if (
                err.response?.status ===
                401
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

            } else if (
                err.message
            ) {

                setError(
                    err.message
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


    /* ========================================================================
       REGISTER
       ======================================================================== */

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


        if (
            password !==
            confirmPassword
        ) {

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
                        email.trim()
                            .toLowerCase(),

                    password,
                }
            );


            setSuccess(
                "Account created successfully. You can now sign in."
            );


            setMode("login");

            setPassword("");
            setConfirmPassword("");

        } catch (err) {

            console.error(
                "Registration error:",
                err
            );


            if (
                err.response?.data?.detail
            ) {

                setError(
                    typeof err.response.data.detail ===
                        "string"
                        ? err.response.data.detail
                        : "Unable to create the account."
                );

            } else {

                setError(
                    "Registration failed. Please check your connection and try again."
                );

            }

        } finally {

            setLoading(false);

        }

    };


    /* ========================================================================
       UI
       ======================================================================== */

    return (
        <div className="login-page">

            <div className="login-grid" />

            <div className="login-glow login-glow-one" />

            <div className="login-glow login-glow-two" />


            {/* HEADER */}

            <header className="login-header">

                <div className="login-brand">

                    <div className="login-brand-mark">
                        HS
                    </div>

                    <div className="login-brand-text">

                        <strong>
                            HerdSense AI
                        </strong>

                        <span>
                            Livestock intelligence platform
                        </span>

                    </div>

                </div>


                <button
                    type="button"
                    className="theme-toggle"
                    onClick={toggleTheme}
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


            {/* MAIN */}

            <main className="login-main">

                {/* HERO */}

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


                {/* AUTH */}

                <section className="login-card">

                    <div className="login-card-inner">

                        <div className="login-eyebrow">

                            {mode === "login"
                                ? "SECURE ACCESS"
                                : "FARMER REGISTRATION"}

                        </div>


                        <h2>

                            {mode === "login"
                                ? "Welcome back."
                                : "Create your account."}

                        </h2>


                        <p className="login-subtitle">

                            {mode === "login"
                                ? "Sign in to your HerdSense command center."
                                : "Create your HerdSense AI account to begin monitoring your livestock."}

                        </p>


                        {mode === "login" ? (

                            <form
                                onSubmit={
                                    handleLogin
                                }
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

                                    <label htmlFor="password">
                                        Password
                                    </label>

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

                                        <p>
                                            {error}
                                        </p>

                                    </div>

                                )}


                                {success && (

                                    <div className="login-success">

                                        <span>✓</span>

                                        <p>
                                            {success}
                                        </p>

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


                                <div className="auth-switch">

                                    <span>
                                        New to HerdSense AI?
                                    </span>

                                    <button
                                        type="button"
                                        className="auth-switch-button"
                                        onClick={() =>
                                            switchMode(
                                                "register"
                                            )
                                        }
                                    >
                                        Create an account
                                    </button>

                                </div>

                            </form>

                        ) : (

                            <form
                                onSubmit={
                                    handleRegister
                                }
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

                                        <p>
                                            {error}
                                        </p>

                                    </div>

                                )}


                                {success && (

                                    <div className="login-success">

                                        <span>✓</span>

                                        <p>
                                            {success}
                                        </p>

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
                                            switchMode(
                                                "login"
                                            )
                                        }
                                    >
                                        Sign in
                                    </button>

                                </div>

                            </form>

                        )}


                        <div className="secure-note">

                            <span className="secure-check">
                                ✓
                            </span>

                            Secure connection to HerdSense AI

                        </div>

                    </div>

                </section>

            </main>


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