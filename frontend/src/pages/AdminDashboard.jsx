import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useLocation,
    useNavigate,
} from "react-router-dom";

import api from "../api/api";

import "./AdminDashboard.css";


/* ============================================================================
   ADMIN COMMAND CENTER
   ============================================================================ */

export default function AdminDashboard() {

    const navigate = useNavigate();
    const location = useLocation();


    const [overview, setOverview] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [error, setError] =
        useState("");

    const [lastUpdated, setLastUpdated] =
        useState(null);


    /* ========================================================================
       ADMIN PROFILE
       ======================================================================== */

    const administrator =
        useMemo(() => {

            try {

                return JSON.parse(
                    localStorage.getItem(
                        "herdsense_user"
                    )
                ) || {};

            } catch {

                return {};

            }

        }, []);


    /* ========================================================================
       FETCH OVERVIEW
       ======================================================================== */

    const fetchOverview =
        useCallback(
            async (silent = false) => {

                try {

                    if (!silent) {
                        setRefreshing(true);
                    }

                    setError("");

                    const response =
                        await api.get(
                            "/admin/overview"
                        );

                    setOverview(
                        response.data
                    );

                    setLastUpdated(
                        new Date()
                    );

                } catch (err) {

                    console.error(
                        "Admin overview error:",
                        err
                    );


                    if (
                        err.response?.status ===
                        401
                    ) {

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

                        navigate(
                            "/login",
                            {
                                replace: true,
                            }
                        );

                        return;
                    }


                    if (
                        err.response?.status ===
                        403
                    ) {

                        setError(
                            "Administrator access required."
                        );

                        return;
                    }


                    setError(
                        err.response?.data?.detail ||
                        "Unable to load administrator overview."
                    );

                } finally {

                    setLoading(false);
                    setRefreshing(false);

                }

            },
            [navigate]
        );


    /* ========================================================================
       INITIAL LOAD + LIVE REFRESH
       ======================================================================== */

    useEffect(() => {

        fetchOverview();

        const interval =
            setInterval(
                () => fetchOverview(true),
                30000
            );

        return () => {
            clearInterval(interval);
        };

    }, [fetchOverview]);


    /* ========================================================================
       HEALTH
       ======================================================================== */

    const health =
        useMemo(() => {

            if (!overview) {

                return {
                    percentage: 0,
                    label: "Loading",
                    description:
                        "Collecting system intelligence.",
                    state: "loading",
                };

            }


            const animals =
                overview.animals || {};

            const totalAnimals =
                Number(
                    animals.total || 0
                );

            const healthyAnimals =
                Number(
                    animals.healthy || 0
                );


            const animalHealth =
                totalAnimals > 0
                    ? (
                        healthyAnimals /
                        totalAnimals
                    ) * 100
                    : 100;


            const apiHealthy =
                overview.system?.api ===
                "healthy";


            const databaseHealthy =
                overview.system?.database ===
                "healthy";


            const infrastructureScore =
                (
                    (apiHealthy ? 100 : 0) +
                    (databaseHealthy ? 100 : 0)
                ) / 2;


            let percentage =
                Math.round(
                    (
                        infrastructureScore *
                        0.5
                    ) +
                    (
                        animalHealth *
                        0.5
                    )
                );


            percentage =
                Math.max(
                    0,
                    Math.min(
                        100,
                        percentage
                    )
                );


            let label = "Critical";
            let description =
                "Immediate attention required.";

            let state = "critical";


            if (percentage >= 95) {

                label = "Excellent";

                description =
                    "System operating at peak health.";

                state = "excellent";

            } else if (percentage >= 85) {

                label = "Healthy";

                description =
                    "System operating normally.";

                state = "healthy";

            } else if (percentage >= 70) {

                label = "Stable";

                description =
                    "System operational with some risk.";

                state = "stable";

            } else if (percentage >= 50) {

                label = "At Risk";

                description =
                    "Several operational conditions require attention.";

                state = "risk";

            }


            return {
                percentage,
                label,
                description,
                state,
            };

        }, [overview]);


    /* ========================================================================
       RING
       ======================================================================== */

    const ringRadius = 88;

    const ringCircumference =
        2 *
        Math.PI *
        ringRadius;

    const ringOffset =
        ringCircumference -
        (
            health.percentage /
            100
        ) *
        ringCircumference;


    /* ========================================================================
       DATA
       ======================================================================== */

    const users =
        overview?.users || {};

    const farms =
        overview?.farms || {};

    const animals =
        overview?.animals || {};

    const telemetry =
        overview?.telemetry || {};

    const alerts =
        overview?.alerts || {};

    const system =
        overview?.system || {};


    /* ========================================================================
       SIDEBAR NAVIGATION
       ======================================================================== */

    const navGroups = [

        {
            label: "COMMAND",
            items: [
                {
                    label: "Overview",
                    path: "/admin",
                    icon: "⌂",
                },
            ],
        },

        {
            label: "OPERATIONS",
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
                    label: "Alerts",
                    path: "/alerts",
                    icon: "!",
                },
                {
                    label: "Map",
                    path: "/map",
                    icon: "⌖",
                },
            ],
        },

        {
            label: "INTELLIGENCE",
            items: [
                {
                    label: "Analytics",
                    path: "/analytics",
                    icon: "◫",
                },
                {
                    label: "Prediction",
                    path: "/prediction",
                    icon: "◇",
                },
                {
                    label: "Reports",
                    path: "/reports",
                    icon: "▤",
                },
            ],
        },

        {
            label: "SYSTEM",
            items: [
                {
                    label: "Settings",
                    path: "/settings",
                    icon: "⚙",
                },
            ],
        },

    ];


    /* ========================================================================
       ACTIVE
       ======================================================================== */

    const isActive = (path) => {

        if (path === "/admin") {
            return location.pathname === "/admin";
        }

        return location.pathname.startsWith(
            path
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

        navigate(
            "/login",
            {
                replace: true,
            }
        );

    };


    /* ========================================================================
       LOADING
       ======================================================================== */

    if (loading) {

        return (
            <div className="admin-command-loading">

                <div className="command-loader">
                    <span />
                </div>

                <div>
                    <strong>
                        HERDSENSE AI
                    </strong>

                    <span>
                        Initializing command center...
                    </span>
                </div>

            </div>
        );

    }


    /* ========================================================================
       ERROR
       ======================================================================== */

    if (error && !overview) {

        return (
            <div className="admin-command-loading">

                <div className="command-error">

                    <div className="command-error-mark">
                        !
                    </div>

                    <strong>
                        Command center unavailable
                    </strong>

                    <span>
                        {error}
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            fetchOverview()
                        }
                    >
                        Retry connection
                    </button>

                </div>

            </div>
        );

    }


    /* ========================================================================
       RENDER
       ======================================================================== */

    return (
        <div className="admin-shell">


            {/* ==================================================================
                SIDEBAR
            ================================================================== */}

            <aside className="admin-sidebar">


                <div className="sidebar-brand">

                    <div className="sidebar-brand-mark">
                        HS
                    </div>

                    <div className="sidebar-brand-copy">

                        <strong>
                            HerdSense
                        </strong>

                        <span>
                            AI SYSTEMS
                        </span>

                    </div>

                </div>


                <div className="sidebar-system">

                    <span className="sidebar-status-dot" />

                    <div>

                        <strong>
                            SYSTEM ONLINE
                        </strong>

                        <span>
                            Command infrastructure
                        </span>

                    </div>

                </div>


                <nav className="admin-navigation">

                    {navGroups.map(
                        (group) => (

                            <div
                                className="nav-group"
                                key={group.label}
                            >

                                <span className="nav-group-label">
                                    {group.label}
                                </span>


                                <div className="nav-group-items">

                                    {group.items.map(
                                        (item) => (

                                            <button
                                                type="button"
                                                key={item.path}
                                                className={
                                                    `admin-nav-item ${
                                                        isActive(
                                                            item.path
                                                        )
                                                            ? "active"
                                                            : ""
                                                    }`
                                                }
                                                onClick={() =>
                                                    navigate(
                                                        item.path
                                                    )
                                                }
                                            >

                                                <span className="nav-icon">
                                                    {item.icon}
                                                </span>

                                                <span>
                                                    {item.label}
                                                </span>

                                            </button>

                                        )
                                    )}

                                </div>

                            </div>

                        )
                    )}

                </nav>


                <div className="sidebar-bottom">

                    <div className="sidebar-admin">

                        <div className="sidebar-avatar">

                            {administrator.full_name
                                ?.charAt(0)
                                ?.toUpperCase() ||
                                "A"}

                        </div>

                        <div className="sidebar-admin-copy">

                            <strong>
                                {administrator.full_name ||
                                    "Administrator"}
                            </strong>

                            <span>
                                Administrator
                            </span>

                        </div>

                    </div>


                    <button
                        type="button"
                        className="sidebar-logout"
                        onClick={
                            handleLogout
                        }
                    >
                        Sign out
                    </button>

                </div>

            </aside>


            {/* ==================================================================
                MAIN
            ================================================================== */}

            <main className="admin-main">


                {/* ==============================================================
                    TOP BAR
                ============================================================== */}

                <header className="admin-topbar">

                    <div>

                        <span className="topbar-eyebrow">
                            HERDSENSE AI
                            <span>/</span>
                            ADMINISTRATION
                        </span>

                        <h1>
                            System Command Center
                        </h1>

                    </div>


                    <div className="topbar-actions">

                        <div className="topbar-network">

                            <span className="status-dot" />

                            BASE

                            <strong>
                                {system.blockchain ||
                                    "SEPOLIA"}
                            </strong>

                        </div>


                        <div className="topbar-time">

                            <span>
                                LAST SYNC
                            </span>

                            <strong>
                                {lastUpdated
                                    ? lastUpdated.toLocaleTimeString()
                                    : "--:--:--"}
                            </strong>

                        </div>


                        <button
                            type="button"
                            className={
                                `command-refresh ${
                                    refreshing
                                        ? "refreshing"
                                        : ""
                                }`
                            }
                            onClick={() =>
                                fetchOverview()
                            }
                            disabled={refreshing}
                        >

                            <span>
                                ↻
                            </span>

                            {refreshing
                                ? "Syncing"
                                : "Sync"}

                        </button>

                    </div>

                </header>


                {/* ==============================================================
                    CONTENT
                ============================================================== */}

                <div className="admin-content">


                    {/* ==========================================================
                        MISSION STATUS
                    ========================================================== */}

                    <section className="command-banner">

                        <div className="banner-left">

                            <div className="banner-live">

                                <span className="status-dot" />

                                LIVE OPERATIONS

                            </div>

                            <h2>
                                Platform intelligence
                                <span>
                                    at a glance.
                                </span>
                            </h2>

                            <p>
                                Real-time operational visibility
                                across the HerdSense AI network.
                            </p>

                        </div>


                        <div className="banner-metrics">

                            <div>

                                <span>
                                    ENVIRONMENT
                                </span>

                                <strong>
                                    {system.environment ||
                                        "DEVELOPMENT"}
                                </strong>

                            </div>

                            <div>

                                <span>
                                    VERSION
                                </span>

                                <strong>
                                    v{system.version ||
                                        "1.0.0"}
                                </strong>

                            </div>

                        </div>

                    </section>


                    {/* ==========================================================
                        HEALTH
                    ========================================================== */}

                    <section className="command-panel health-command-panel">

                        <div className="command-panel-header">

                            <div>

                                <span>
                                    SYSTEM HEALTH
                                </span>

                                <h2>
                                    Operational integrity
                                </h2>

                            </div>

                            <div className="panel-live">
                                LIVE
                            </div>

                        </div>


                        <div className="health-command-body">


                            <div className="health-ring-wrapper">

                                <svg
                                    className={
                                        `health-ring health-${health.state}`
                                    }
                                    viewBox="0 0 220 220"
                                >

                                    <circle
                                        className="health-ring-track"
                                        cx="110"
                                        cy="110"
                                        r={ringRadius}
                                    />

                                    <circle
                                        className="health-ring-progress"
                                        cx="110"
                                        cy="110"
                                        r={ringRadius}
                                        strokeDasharray={
                                            ringCircumference
                                        }
                                        strokeDashoffset={
                                            ringOffset
                                        }
                                    />

                                </svg>


                                <div className="health-ring-center">

                                    <strong>
                                        {health.percentage}
                                        <small>
                                            %
                                        </small>
                                    </strong>

                                    <span>
                                        HEALTH INDEX
                                    </span>

                                </div>

                            </div>


                            <div className="health-command-summary">

                                <div className="health-command-status">

                                    <span
                                        className={
                                            `status-dot ${
                                                health.state
                                            }`
                                        }
                                    />

                                    <strong>
                                        {health.label}
                                    </strong>

                                </div>

                                <p>
                                    {health.description}
                                </p>


                                <div className="health-check-grid">

                                    <HealthCheck
                                        label="API"
                                        value={
                                            system.api ===
                                            "healthy"
                                                ? "OPERATIONAL"
                                                : "OFFLINE"
                                        }
                                        healthy={
                                            system.api ===
                                            "healthy"
                                        }
                                    />

                                    <HealthCheck
                                        label="DATABASE"
                                        value={
                                            system.database ===
                                            "healthy"
                                                ? "OPERATIONAL"
                                                : "OFFLINE"
                                        }
                                        healthy={
                                            system.database ===
                                            "healthy"
                                        }
                                    />

                                    <HealthCheck
                                        label="TELEMETRY"
                                        value="STREAMING"
                                        healthy
                                    />

                                    <HealthCheck
                                        label="BASE NETWORK"
                                        value={
                                            system.blockchain ||
                                            "CONNECTED"
                                        }
                                        healthy
                                    />

                                </div>

                            </div>

                        </div>

                    </section>


                    {/* ==========================================================
                        ALERTS
                    ========================================================== */}

                    <section className="command-panel alerts-command-panel">

                        <div className="command-panel-header">

                            <div>

                                <span>
                                    ALERT CENTER
                                </span>

                                <h2>
                                    Active incidents
                                </h2>

                            </div>

                            <button
                                type="button"
                                className="text-action"
                                onClick={() =>
                                    navigate(
                                        "/alerts"
                                    )
                                }
                            >
                                Open center →
                            </button>

                        </div>


                        <div className="alert-command-total">

                            <strong>
                                {alerts.unresolved ??
                                    0}
                            </strong>

                            <span>
                                unresolved
                            </span>

                        </div>


                        <div className="alert-command-grid">

                            <AlertMetric
                                label="CRITICAL"
                                value={
                                    alerts.critical ??
                                    0
                                }
                                type="critical"
                            />

                            <AlertMetric
                                label="WARNING"
                                value={
                                    alerts.warning ??
                                    0
                                }
                                type="warning"
                            />

                            <AlertMetric
                                label="RESOLVED"
                                value={
                                    alerts.resolved ??
                                    0
                                }
                                type="resolved"
                            />

                        </div>

                    </section>


                    {/* ==========================================================
                        KPI ROW
                    ========================================================== */}

                    <KpiCard
                        label="PLATFORM USERS"
                        title="User population"
                        value={
                            users.total ?? 0
                        }
                        description="Registered platform users"
                        footerLeft="ADMINS"
                        footerLeftValue={
                            users.admins ?? 0
                        }
                        footerRight="FARMERS"
                        footerRightValue={
                            users.farmers ?? 0
                        }
                    />


                    <KpiCard
                        label="FARM NETWORK"
                        title="Registered farms"
                        value={
                            farms.total ?? 0
                        }
                        description="Connected farm operations"
                        footerLeft="NETWORK"
                        footerLeftValue="ACTIVE"
                        footerRight="STATUS"
                        footerRightValue="ONLINE"
                    />


                    <KpiCard
                        label="TELEMETRY"
                        title="Sensor intelligence"
                        value={
                            telemetry.total_records ??
                            0
                        }
                        description="Telemetry records collected"
                        footerLeft="PIPELINE"
                        footerLeftValue="LIVE"
                        footerRight="STREAM"
                        footerRightValue="ACTIVE"
                    />


                    <KpiCard
                        label="ANIMAL INTELLIGENCE"
                        title="Monitored livestock"
                        value={
                            animals.total ?? 0
                        }
                        description="Animals under active monitoring"
                        footerLeft="HEALTHY"
                        footerLeftValue={
                            animals.healthy ?? 0
                        }
                        footerRight="AT RISK"
                        footerRightValue={
                            animals.at_risk ?? 0
                        }
                    />


                    {/* ==========================================================
                        ANIMAL HEALTH
                    ========================================================== */}

                    <section className="command-panel animal-health-panel">

                        <div className="command-panel-header">

                            <div>

                                <span>
                                    ANIMAL INTELLIGENCE
                                </span>

                                <h2>
                                    Population health
                                </h2>

                            </div>

                            <button
                                type="button"
                                className="text-action"
                                onClick={() =>
                                    navigate(
                                        "/animals"
                                    )
                                }
                            >
                                View animals →
                            </button>

                        </div>


                        <div className="population-health">

                            <div className="population-total">

                                <strong>
                                    {animals.total ??
                                        0}
                                </strong>

                                <span>
                                    monitored animals
                                </span>

                            </div>


                            <div className="population-bars">

                                <PopulationBar
                                    label="Healthy"
                                    value={
                                        animals.healthy ??
                                        0
                                    }
                                    total={
                                        animals.total ??
                                        0
                                    }
                                />

                                <PopulationBar
                                    label="At risk"
                                    value={
                                        animals.at_risk ??
                                        0
                                    }
                                    total={
                                        animals.total ??
                                        0
                                    }
                                    risk
                                />

                            </div>

                        </div>

                    </section>


                    {/* ==========================================================
                        INFRASTRUCTURE
                    ========================================================== */}

                    <section className="command-panel infrastructure-panel">

                        <div className="command-panel-header">

                            <div>

                                <span>
                                    INFRASTRUCTURE
                                </span>

                                <h2>
                                    Platform systems
                                </h2>

                            </div>

                        </div>


                        <div className="infrastructure-grid">

                            <Infrastructure
                                label="API"
                                value={
                                    system.api ===
                                    "healthy"
                                        ? "HEALTHY"
                                        : "OFFLINE"
                                }
                                healthy={
                                    system.api ===
                                    "healthy"
                                }
                            />

                            <Infrastructure
                                label="DATABASE"
                                value={
                                    system.database ===
                                    "healthy"
                                        ? "HEALTHY"
                                        : "OFFLINE"
                                }
                                healthy={
                                    system.database ===
                                    "healthy"
                                }
                            />

                            <Infrastructure
                                label="BASE"
                                value={
                                    system.blockchain ||
                                    "CONNECTED"
                                }
                                healthy
                            />

                            <Infrastructure
                                label="VERSION"
                                value={
                                    system.version ||
                                    "1.0.0"
                                }
                                healthy
                            />

                        </div>

                    </section>


                </div>


                {/* ==============================================================
                    FOOTER
                ============================================================== */}

                <footer className="admin-footer">

                    <span>
                        HERDSENSE AI / ADMINISTRATION
                    </span>

                    <span>
                        SECURE COMMAND ENVIRONMENT
                    </span>

                    <span>
                        © 2026
                    </span>

                </footer>

            </main>

        </div>
    );
}


/* ============================================================================
   HEALTH CHECK
   ============================================================================ */

function HealthCheck({
    label,
    value,
    healthy,
}) {

    return (
        <div className="health-check">

            <span>
                {label}
            </span>

            <strong
                className={
                    healthy
                        ? "healthy"
                        : "offline"
                }
            >

                <i
                    className={
                        healthy
                            ? "healthy"
                            : "offline"
                    }
                />

                {value}

            </strong>

        </div>
    );
}


/* ============================================================================
   ALERT METRIC
   ============================================================================ */

function AlertMetric({
    label,
    value,
    type,
}) {

    return (
        <div
            className={
                `alert-metric ${type}`
            }
        >

            <span>
                {label}
            </span>

            <strong>
                {value}
            </strong>

        </div>
    );
}


/* ============================================================================
   KPI CARD
   ============================================================================ */

function KpiCard({
    label,
    title,
    value,
    description,
    footerLeft,
    footerLeftValue,
    footerRight,
    footerRightValue,
}) {

    return (
        <section className="command-panel kpi-command-panel">

            <div className="command-panel-header">

                <div>

                    <span>
                        {label}
                    </span>

                    <h2>
                        {title}
                    </h2>

                </div>

            </div>


            <div className="kpi-value">
                {value}
            </div>

            <p className="kpi-description">
                {description}
            </p>


            <div className="kpi-footer">

                <div>

                    <span>
                        {footerLeft}
                    </span>

                    <strong>
                        {footerLeftValue}
                    </strong>

                </div>

                <div>

                    <span>
                        {footerRight}
                    </span>

                    <strong>
                        {footerRightValue}
                    </strong>

                </div>

            </div>

        </section>
    );
}


/* ============================================================================
   POPULATION BAR
   ============================================================================ */

function PopulationBar({
    label,
    value,
    total,
    risk = false,
}) {

    const percentage =
        total > 0
            ? Math.min(
                100,
                Math.round(
                    (value / total) *
                    100
                )
            )
            : 0;


    return (
        <div className="population-row">

            <div className="population-row-header">

                <span>
                    {label}
                </span>

                <strong>
                    {value}
                </strong>

            </div>


            <div
                className={
                    `population-track ${
                        risk
                            ? "risk"
                            : ""
                    }`
                }
            >

                <span
                    style={{
                        width:
                            `${percentage}%`,
                    }}
                />

            </div>


            <small>
                {percentage}% of population
            </small>

        </div>
    );
}


/* ============================================================================
   INFRASTRUCTURE
   ============================================================================ */

function Infrastructure({
    label,
    value,
    healthy,
}) {

    return (
        <div className="infrastructure-item">

            <div className="infrastructure-label">

                <span
                    className={
                        `status-dot ${
                            healthy
                                ? "healthy"
                                : "critical"
                        }`
                    }
                />

                {label}

            </div>

            <strong
                className={
                    healthy
                        ? "healthy"
                        : "offline"
                }
            >
                {value}
            </strong>

        </div>
    );
}