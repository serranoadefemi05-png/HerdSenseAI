import { useEffect, useMemo, useState } from "react";

import {
    NavLink,
    useNavigate,
} from "react-router-dom";

import "./AppShell.css";


/* ============================================================================
   MAIN APPLICATION NAVIGATION
============================================================================ */

const navigation = [
    {
        section: "COMMAND",
        items: [
            {
                label: "Overview",
                path: "/dashboard",
                icon: "⌂",
            },
        ],
    },

    {
        section: "OPERATIONS",
        items: [
            {
                label: "Animals",
                path: "/animals",
                icon: "◉",
            },
            {
                label: "Telemetry",
                path: "/telemetry",
                icon: "⌁",
            },
            {
                label: "Manual Telemetry",
                path: "/manual-telemetry",
                icon: "＋",
            },
            {
                label: "Live Map",
                path: "/map",
                icon: "⌖",
            },
            {
                label: "Alerts",
                path: "/alerts",
                icon: "!",
            },
        ],
    },

    {
        section: "INTELLIGENCE",
        items: [
            {
                label: "Health Analytics",
                path: "/analytics",
                icon: "◌",
            },
            {
                label: "Disease Prediction",
                path: "/prediction",
                icon: "✦",
            },
            {
                label: "Reports",
                path: "/reports",
                icon: "▤",
            },
        ],
    },

    {
        section: "ACCOUNT",
        items: [
            {
                label: "Wallet",
                path: "/wallet",
                icon: "◈",
            },
            {
                label: "Settings",
                path: "/settings",
                icon: "⚙",
            },
        ],
    },
];


/* ============================================================================
   USER HELPERS
============================================================================ */

/**
 * Safely read the authenticated HerdSense user.
 */
function getStoredUser() {
    try {
        const rawUser =
            localStorage.getItem("herdsense_user");

        if (!rawUser) {
            return {};
        }

        const parsedUser =
            JSON.parse(rawUser);

        if (
            !parsedUser ||
            typeof parsedUser !== "object"
        ) {
            return {};
        }

        return parsedUser;

    } catch {
        return {};
    }
}


/**
 * Generate professional initials from a user's name.
 *
 * Examples:
 *   John Doe          -> JD
 *   John Michael Doe -> JD
 *   Adebayo           -> A
 */
function getInitials(name = "") {
    const cleanName =
        String(name)
            .trim()
            .replace(/\s+/g, " ");

    if (!cleanName) {
        return "U";
    }

    const parts =
        cleanName
            .split(" ")
            .filter(Boolean);

    if (parts.length === 1) {
        return parts[0]
            .charAt(0)
            .toUpperCase();
    }

    return (
        parts[0].charAt(0) +
        parts[parts.length - 1].charAt(0)
    ).toUpperCase();
}


/**
 * Convert role values into a clean display label.
 */
function formatRole(role) {
    if (!role) {
        return "User";
    }

    const normalized =
        String(role)
            .trim()
            .toLowerCase();

    if (normalized === "admin") {
        return "Administrator";
    }

    if (normalized === "farmer") {
        return "Farmer";
    }

    if (normalized === "user") {
        return "User";
    }

    return normalized
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (letter) =>
            letter.toUpperCase()
        );
}


/* ============================================================================
   APPLICATION SHELL
============================================================================ */

export default function AppShell({ children }) {

    const navigate = useNavigate();


    /* ========================================================================
       SIDEBAR STATE
    ======================================================================== */

    const [sidebarOpen, setSidebarOpen] =
        useState(true);


    /* ========================================================================
       THEME STATE
    ======================================================================== */

    const [darkMode, setDarkMode] =
        useState(() => {
            return (
                localStorage.getItem("theme") ===
                "dark"
            );
        });


    /* ========================================================================
       AUTHENTICATED USER
    ======================================================================== */

    const [user, setUser] =
        useState(() => getStoredUser());


    /* ========================================================================
       REFRESH USER PROFILE
    ======================================================================== */

    useEffect(() => {

        const refreshUser =
            () => {
                setUser(
                    getStoredUser()
                );
            };


        /*
         * Storage events handle changes made from another browser tab.
         */

        window.addEventListener(
            "storage",
            refreshUser
        );


        /*
         * Custom event allows the application to refresh
         * the profile immediately after authentication.
         */

        window.addEventListener(
            "herdsense-auth-changed",
            refreshUser
        );


        return () => {

            window.removeEventListener(
                "storage",
                refreshUser
            );

            window.removeEventListener(
                "herdsense-auth-changed",
                refreshUser
            );

        };

    }, []);


    /* ========================================================================
       NORMALIZE USER DATA
    ======================================================================== */

    const userName =
        useMemo(() => {

            return (
                user?.full_name ||
                user?.name ||
                user?.email ||
                "User"
            );

        }, [user]);


    const userInitials =
        useMemo(() => {

            return getInitials(
                userName
            );

        }, [userName]);


    const userRole =
        useMemo(() => {

            /*
             * herdsense_user is the primary source.
             * user_role is retained as a fallback for
             * compatibility with the existing authentication flow.
             */

            return (
                user?.role ||
                localStorage.getItem(
                    "user_role"
                ) ||
                "user"
            );

        }, [user]);


    const isAdmin =
        String(userRole)
            .trim()
            .toLowerCase() === "admin";


    const displayRole =
        formatRole(userRole);


    /* ========================================================================
       ADMIN NAVIGATION
    ======================================================================== */

    const adminNavigation =
        useMemo(() => {

            if (!isAdmin) {
                return [];
            }

            return [
                {
                    section: "ADMINISTRATION",
                    items: [
                        {
                            label: "Admin Dashboard",
                            path: "/admin",
                            icon: "▣",
                        },
                    ],
                },
            ];

        }, [isAdmin]);


    const allNavigation =
        useMemo(() => {

            return [
                ...navigation,
                ...adminNavigation,
            ];

        }, [adminNavigation]);


    /* ========================================================================
       APPLY THEME
    ======================================================================== */

    useEffect(() => {

        document.documentElement.setAttribute(
            "data-theme",
            darkMode
                ? "dark"
                : "light"
        );

    }, [darkMode]);


    /* ========================================================================
       THEME TOGGLE
    ======================================================================== */

    const toggleTheme = () => {

        const nextTheme =
            !darkMode;

        setDarkMode(
            nextTheme
        );

        localStorage.setItem(
            "theme",
            nextTheme
                ? "dark"
                : "light"
        );

        document.documentElement.setAttribute(
            "data-theme",
            nextTheme
                ? "dark"
                : "light"
        );

    };


    /* ========================================================================
       SIDEBAR TOGGLE
    ======================================================================== */

    const toggleSidebar = () => {

        setSidebarOpen(
            (value) => !value
        );

    };


    /* ========================================================================
       LOGOUT
    ======================================================================== */

    const handleLogout = () => {

        localStorage.removeItem(
            "access_token"
        );

        localStorage.removeItem(
            "token"
        );

        localStorage.removeItem(
            "user_role"
        );

        localStorage.removeItem(
            "herdsense_user"
        );

        setUser({});

        navigate(
            "/login",
            {
                replace: true,
            }
        );

    };


    /* ========================================================================
       RENDER
    ======================================================================== */

    return (

        <div
            className={
                `app-shell ${
                    sidebarOpen
                        ? "sidebar-open"
                        : "sidebar-collapsed"
                }`
            }
        >

            {/* ================================================================
                SIDEBAR
            ================================================================ */}

            <aside className="app-sidebar">


                {/* ============================================================
                    BRAND
                ============================================================= */}

                <div className="sidebar-brand">

                    <div className="brand-logo-container">

                        <img
                            src="/Qm6NSEu-_400x400.jpg"
                            alt="HerdSense AI"
                            className="brand-logo"
                        />

                    </div>


                    {sidebarOpen && (

                        <div className="brand-copy">

                            <strong>
                                HerdSense AI
                            </strong>

                            <span>
                                Livestock intelligence
                            </span>

                        </div>

                    )}

                </div>


                <div className="sidebar-divider" />


                {/* ============================================================
                    NAVIGATION
                ============================================================= */}

                <nav
                    className="sidebar-navigation"
                    aria-label="Main navigation"
                >

                    {allNavigation.map(
                        (group) => (

                            <div
                                className="navigation-group"
                                key={
                                    group.section
                                }
                            >

                                {sidebarOpen && (

                                    <div className="navigation-section">

                                        {group.section}

                                    </div>

                                )}


                                {group.items.map(
                                    (item) => (

                                        <NavLink
                                            key={
                                                item.path
                                            }
                                            to={
                                                item.path
                                            }
                                            title={
                                                !sidebarOpen
                                                    ? item.label
                                                    : undefined
                                            }
                                            className={({ isActive }) =>
                                                `navigation-item ${
                                                    isActive
                                                        ? "active"
                                                        : ""
                                                }`
                                            }
                                        >

                                            <span className="navigation-icon">

                                                {item.icon}

                                            </span>


                                            {sidebarOpen && (

                                                <span className="navigation-label">

                                                    {item.label}

                                                </span>

                                            )}

                                        </NavLink>

                                    )
                                )}

                            </div>

                        )
                    )}

                </nav>


                {/* ============================================================
                    SIDEBAR BOTTOM
                ============================================================= */}

                <div className="sidebar-bottom">


                    {/* ========================================================
                        THEME
                    ========================================================= */}

                    <button
                        type="button"
                        className="sidebar-action"
                        onClick={
                            toggleTheme
                        }
                        title={
                            !sidebarOpen
                                ? darkMode
                                    ? "Light mode"
                                    : "Dark mode"
                                : undefined
                        }
                        aria-label={
                            darkMode
                                ? "Switch to light mode"
                                : "Switch to dark mode"
                        }
                    >

                        <span className="navigation-icon">

                            {darkMode
                                ? "☀"
                                : "☾"}

                        </span>


                        {sidebarOpen && (

                            <span>

                                {darkMode
                                    ? "Light mode"
                                    : "Dark mode"}

                            </span>

                        )}

                    </button>


                    {/* ========================================================
                        LOGOUT
                    ========================================================= */}

                    <button
                        type="button"
                        className="sidebar-action logout-action"
                        onClick={
                            handleLogout
                        }
                        title={
                            !sidebarOpen
                                ? "Sign out"
                                : undefined
                        }
                        aria-label="Sign out"
                    >

                        <span className="navigation-icon">
                            ↪
                        </span>


                        {sidebarOpen && (

                            <span>
                                Sign out
                            </span>

                        )}

                    </button>

                </div>

            </aside>


            {/* ================================================================
                MAIN APPLICATION
            ================================================================ */}

            <div className="app-content">


                {/* ============================================================
                    TOPBAR
                ============================================================= */}

                <header className="app-topbar">


                    {/* ========================================================
                        SIDEBAR TOGGLE
                    ========================================================= */}

                    <button
                        type="button"
                        className="sidebar-toggle"
                        onClick={
                            toggleSidebar
                        }
                        aria-label="Toggle navigation"
                        title={
                            sidebarOpen
                                ? "Collapse navigation"
                                : "Expand navigation"
                        }
                    >
                        ☰
                    </button>


                    {/* ========================================================
                        TOPBAR TITLE
                    ========================================================= */}

                    <div className="topbar-title">

                        <span className="topbar-label">
                            HERDSENSE AI
                        </span>

                        <span className="topbar-separator">
                            /
                        </span>

                        <span className="topbar-current">
                            Command Center
                        </span>

                    </div>


                    {/* ========================================================
                        TOPBAR RIGHT
                    ========================================================= */}

                    <div className="topbar-right">


                        {/* ====================================================
                            SYSTEM STATUS
                        ===================================================== */}

                        <div className="system-status">

                            <span className="system-status-dot" />

                            <span>
                                System operational
                            </span>

                        </div>


                        {/* ====================================================
                            THEME
                        ===================================================== */}

                        <button
                            type="button"
                            className="topbar-theme"
                            onClick={
                                toggleTheme
                            }
                            aria-label="Toggle theme"
                            title={
                                darkMode
                                    ? "Switch to light mode"
                                    : "Switch to dark mode"
                            }
                        >

                            {darkMode
                                ? "☀"
                                : "☾"}

                        </button>


                        {/* ====================================================
                            USER PROFILE
                        ===================================================== */}

                        <button
                            type="button"
                            className="user-profile"
                            onClick={() =>
                                navigate(
                                    "/settings"
                                )
                            }
                            title="Open account settings"
                            aria-label={
                                `${userName}, ${displayRole}`
                            }
                        >

                            <div className="user-avatar">

                                {userInitials}

                            </div>


                            <div className="user-details">

                                <strong>
                                    {userName}
                                </strong>

                                <span>
                                    {displayRole}
                                </span>

                            </div>

                        </button>

                    </div>

                </header>


                {/* =============================================================
                    PAGE CONTENT
                ============================================================= */}

                <main className="app-main">

                    {children}

                </main>

            </div>

        </div>

    );

}