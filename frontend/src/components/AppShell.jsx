import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./AppShell.css";

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
        section: "SYSTEM",
        items: [
            {
                label: "Settings",
                path: "/settings",
                icon: "⚙",
            },
        ],
    },
];

export default function AppShell({ children }) {
    const navigate = useNavigate();

    const [sidebarOpen, setSidebarOpen] = useState(true);

    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem("theme") === "dark";
    });

    const toggleTheme = () => {
        const nextTheme = !darkMode;

        setDarkMode(nextTheme);

        localStorage.setItem(
            "theme",
            nextTheme ? "dark" : "light"
        );

        document.documentElement.setAttribute(
            "data-theme",
            nextTheme ? "dark" : "light"
        );
    };

    const handleLogout = () => {
        localStorage.removeItem("access_token");

        navigate("/login", {
            replace: true,
        });
    };

    return (
        <div
            className={`app-shell ${
                sidebarOpen
                    ? "sidebar-open"
                    : "sidebar-collapsed"
            }`}
        >
            {/* =====================================================
                SIDEBAR
            ====================================================== */}

            <aside className="app-sidebar">

                {/* BRAND */}

                <div className="sidebar-brand">

                    <div className="brand-symbol">
                        HS
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

                {/* =================================================
                    NAVIGATION
                ================================================== */}

                <nav
                    className="sidebar-navigation"
                    aria-label="Main navigation"
                >

                    {navigation.map((group) => (
                        <div
                            className="navigation-group"
                            key={group.section}
                        >

                            {sidebarOpen && (
                                <div className="navigation-section">
                                    {group.section}
                                </div>
                            )}

                            {group.items.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
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
                            ))}

                        </div>
                    ))}

                </nav>

                {/* =================================================
                    SIDEBAR BOTTOM
                ================================================== */}

                <div className="sidebar-bottom">

                    {/* THEME */}

                    <button
                        type="button"
                        className="sidebar-action"
                        onClick={toggleTheme}
                        title={
                            !sidebarOpen
                                ? darkMode
                                    ? "Light mode"
                                    : "Dark mode"
                                : undefined
                        }
                    >

                        <span className="navigation-icon">
                            {darkMode ? "☀" : "☾"}
                        </span>

                        {sidebarOpen && (
                            <span>
                                {darkMode
                                    ? "Light mode"
                                    : "Dark mode"}
                            </span>
                        )}

                    </button>

                    {/* LOGOUT */}

                    <button
                        type="button"
                        className="sidebar-action logout-action"
                        onClick={handleLogout}
                        title={
                            !sidebarOpen
                                ? "Sign out"
                                : undefined
                        }
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

            {/* =====================================================
                MAIN APPLICATION
            ====================================================== */}

            <div className="app-content">

                {/* =================================================
                    TOPBAR
                ================================================== */}

                <header className="app-topbar">

                    {/* SIDEBAR TOGGLE */}

                    <button
                        type="button"
                        className="sidebar-toggle"
                        onClick={() =>
                            setSidebarOpen(
                                (value) => !value
                            )
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

                    {/* TOPBAR TITLE */}

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

                    {/* TOPBAR RIGHT */}

                    <div className="topbar-right">

                        {/* SYSTEM STATUS */}

                        <div className="system-status">

                            <span className="system-status-dot" />

                            <span>
                                System operational
                            </span>

                        </div>

                        {/* THEME */}

                        <button
                            type="button"
                            className="topbar-theme"
                            onClick={toggleTheme}
                            aria-label="Toggle theme"
                            title={
                                darkMode
                                    ? "Switch to light mode"
                                    : "Switch to dark mode"
                            }
                        >
                            {darkMode ? "☀" : "☾"}
                        </button>

                        {/* USER */}

                        <div className="user-profile">

                            <div className="user-avatar">
                                SA
                            </div>

                            <div className="user-details">

                                <strong>
                                    Serrano Adefemi
                                </strong>

                                <span>
                                    Administrator
                                </span>

                            </div>

                        </div>

                    </div>

                </header>

                {/* =================================================
                    PAGE CONTENT
                ================================================== */}

                <main className="app-main">
                    {children}
                </main>

            </div>

        </div>
    );
}