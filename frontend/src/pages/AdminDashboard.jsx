import { useCallback, useEffect, useState } from "react";
import "./AdminDashboard.css";

const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    "http://127.0.0.1:8000";

function formatNumber(value) {
    return new Intl.NumberFormat().format(value ?? 0);
}

function formatDate(value) {
    if (!value) return "—";

    return new Date(value).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function StatusIndicator({ status }) {
    const healthy =
        String(status).toLowerCase() === "healthy";

    return (
        <span
            className={`admin-status ${
                healthy
                    ? "admin-status--healthy"
                    : "admin-status--danger"
            }`}
        >
            <span className="admin-status__dot" />
            {healthy ? "Healthy" : status}
        </span>
    );
}

function KpiCard({
    label,
    value,
    secondary,
    icon,
    variant = "default",
}) {
    return (
        <div className={`admin-kpi admin-kpi--${variant}`}>
            <div className="admin-kpi__top">
                <span className="admin-kpi__label">
                    {label}
                </span>

                <span className="admin-kpi__icon">
                    {icon}
                </span>
            </div>

            <div className="admin-kpi__value">
                {formatNumber(value)}
            </div>

            {secondary && (
                <div className="admin-kpi__secondary">
                    {secondary}
                </div>
            )}
        </div>
    );
}

export default function AdminDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const fetchOverview = useCallback(
        async (showRefreshState = false) => {
            try {
                if (showRefreshState) {
                    setRefreshing(true);
                } else {
                    setLoading(true);
                }

                setError("");

                const token =
                    localStorage.getItem(
                        "access_token"
                    );

                if (!token) {
                    throw new Error(
                        "Authentication token not found."
                    );
                }

                const response = await fetch(
                    `${API_BASE_URL}/api/v1/admin/overview`,
                    {
                        method: "GET",
                        headers: {
                            Accept:
                                "application/json",
                            Authorization:
                                `Bearer ${token}`,
                        },
                    }
                );

                if (response.status === 401) {
                    throw new Error(
                        "Your session has expired. Please log in again."
                    );
                }

                if (response.status === 403) {
                    throw new Error(
                        "Administrator access required."
                    );
                }

                if (!response.ok) {
                    throw new Error(
                        `Request failed with status ${response.status}.`
                    );
                }

                const result =
                    await response.json();

                setData(result);
            } catch (err) {
                console.error(
                    "Admin overview error:",
                    err
                );

                setError(
                    err.message ||
                        "Unable to load administrator data."
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        []
    );

    useEffect(() => {
        fetchOverview();

        const interval = setInterval(() => {
            fetchOverview(true);
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchOverview]);

    if (loading) {
        return (
            <main className="admin-page admin-page--loading">
                <div className="admin-loading">
                    <div className="admin-loading__spinner" />

                    <div>
                        <h2>
                            Initializing Control Room
                        </h2>

                        <p>
                            Loading platform intelligence...
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    if (error && !data) {
        return (
            <main className="admin-page">
                <div className="admin-error">
                    <div className="admin-error__icon">
                        !
                    </div>

                    <div>
                        <h2>
                            Control Room Unavailable
                        </h2>

                        <p>{error}</p>

                        <button
                            className="admin-button"
                            onClick={() =>
                                fetchOverview()
                            }
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    const system = data?.system || {};
    const users = data?.users || {};
    const farms = data?.farms || {};
    const animals = data?.animals || {};
    const telemetry = data?.telemetry || {};
    const alerts = data?.alerts || {};

    return (
        <main className="admin-page">

            {/* ================================================================
                HEADER
            ================================================================ */}

            <header className="admin-header">

                <div className="admin-header__identity">

                    <div className="admin-command-mark">
                        HS
                    </div>

                    <div>
                        <div className="admin-eyebrow">
                            HERDSENSE AI
                            <span />
                            ADMINISTRATION
                        </div>

                        <h1>
                            Control Room
                        </h1>

                        <p>
                            Platform-wide intelligence,
                            security and operations.
                        </p>
                    </div>

                </div>

                <div className="admin-header__actions">

                    <div className="admin-live">
                        <span />
                        SYSTEM LIVE
                    </div>

                    <button
                        className="admin-refresh"
                        onClick={() =>
                            fetchOverview(true)
                        }
                        disabled={refreshing}
                    >
                        <span
                            className={
                                refreshing
                                    ? "admin-refresh__spin"
                                    : ""
                            }
                        >
                            ↻
                        </span>

                        {refreshing
                            ? "Refreshing"
                            : "Refresh"}
                    </button>

                </div>

            </header>


            {/* ================================================================
                ADMIN IDENTITY
            ================================================================ */}

            <section className="admin-identity">

                <div className="admin-identity__left">

                    <div className="admin-avatar">
                        {data?.administrator
                            ?.full_name
                            ?.split(" ")
                            .map(
                                (name) =>
                                    name[0]
                            )
                            .slice(0, 2)
                            .join("")
                            .toUpperCase() ||
                            "AD"}
                    </div>

                    <div>
                        <span className="admin-identity__label">
                            AUTHENTICATED ADMINISTRATOR
                        </span>

                        <strong>
                            {
                                data
                                    ?.administrator
                                    ?.full_name
                            }
                        </strong>

                        <span>
                            {
                                data
                                    ?.administrator
                                    ?.email
                            }
                        </span>
                    </div>

                </div>

                <div className="admin-identity__right">

                    <div>
                        <span>ROLE</span>
                        <strong>
                            ADMINISTRATOR
                        </strong>
                    </div>

                    <div>
                        <span>ENVIRONMENT</span>
                        <strong>
                            {system.environment}
                        </strong>
                    </div>

                    <div>
                        <span>VERSION</span>
                        <strong>
                            v{system.version}
                        </strong>
                    </div>

                </div>

            </section>


            {/* ================================================================
                PLATFORM KPIs
            ================================================================ */}

            <section className="admin-section">

                <div className="admin-section__heading">

                    <div>
                        <span className="admin-section__eyebrow">
                            PLATFORM OVERVIEW
                        </span>

                        <h2>
                            Operational Metrics
                        </h2>
                    </div>

                    <span className="admin-updated">
                        Updated{" "}
                        {formatDate(
                            data?.generated_at
                        )}
                    </span>

                </div>


                <div className="admin-kpi-grid">

                    <KpiCard
                        label="TOTAL USERS"
                        value={users.total}
                        secondary={`${users.admins} admins · ${users.farmers} farmers`}
                        icon="U"
                    />

                    <KpiCard
                        label="ACTIVE FARMS"
                        value={farms.total}
                        secondary="Registered production locations"
                        icon="F"
                    />

                    <KpiCard
                        label="MONITORED ANIMALS"
                        value={animals.total}
                        secondary={`${animals.healthy} healthy · ${animals.at_risk} at risk`}
                        icon="A"
                        variant={
                            animals.at_risk > 0
                                ? "warning"
                                : "success"
                        }
                    />

                    <KpiCard
                        label="TELEMETRY RECORDS"
                        value={
                            telemetry.total_records
                        }
                        secondary="Sensor data points"
                        icon="T"
                    />

                    <KpiCard
                        label="TOTAL ALERTS"
                        value={alerts.total}
                        secondary={`${alerts.unresolved} unresolved`}
                        icon="!"
                        variant={
                            alerts.unresolved > 0
                                ? "warning"
                                : "success"
                        }
                    />

                    <KpiCard
                        label="CRITICAL ALERTS"
                        value={alerts.critical}
                        secondary={`${alerts.warning} warnings`}
                        icon="!"
                        variant={
                            alerts.critical > 0
                                ? "danger"
                                : "success"
                        }
                    />

                </div>

            </section>


            {/* ================================================================
                SYSTEM HEALTH
            ================================================================ */}

            <section className="admin-grid">

                <div className="admin-panel">

                    <div className="admin-panel__header">

                        <div>
                            <span className="admin-section__eyebrow">
                                INFRASTRUCTURE
                            </span>

                            <h2>
                                System Health
                            </h2>
                        </div>

                        <span className="admin-panel__code">
                            SYS-01
                        </span>

                    </div>


                    <div className="admin-health-list">

                        <div className="admin-health-row">
                            <div>
                                <strong>
                                    API SERVICE
                                </strong>

                                <span>
                                    FastAPI application
                                </span>
                            </div>

                            <StatusIndicator
                                status={system.api}
                            />
                        </div>


                        <div className="admin-health-row">
                            <div>
                                <strong>
                                    DATABASE
                                </strong>

                                <span>
                                    PostgreSQL persistence
                                </span>
                            </div>

                            <StatusIndicator
                                status={
                                    system.database
                                }
                            />
                        </div>


                        <div className="admin-health-row">
                            <div>
                                <strong>
                                    BLOCKCHAIN
                                </strong>

                                <span>
                                    Base network
                                </span>
                            </div>

                            <span className="admin-network">
                                {system.blockchain}
                            </span>
                        </div>


                        <div className="admin-health-row">
                            <div>
                                <strong>
                                    ENVIRONMENT
                                </strong>

                                <span>
                                    Current deployment
                                </span>
                            </div>

                            <span className="admin-network">
                                {system.environment}
                            </span>
                        </div>

                    </div>

                </div>


                {/* ============================================================
                    USER DISTRIBUTION
                ============================================================ */}

                <div className="admin-panel">

                    <div className="admin-panel__header">

                        <div>
                            <span className="admin-section__eyebrow">
                                ACCESS CONTROL
                            </span>

                            <h2>
                                User Distribution
                            </h2>
                        </div>

                        <span className="admin-panel__code">
                            IAM-01
                        </span>

                    </div>


                    <div className="admin-user-total">
                        <span>
                            TOTAL PLATFORM USERS
                        </span>

                        <strong>
                            {formatNumber(users.total)}
                        </strong>
                    </div>


                    <div className="admin-distribution">

                        <div className="admin-distribution__row">

                            <div className="admin-distribution__label">
                                <span className="admin-role-dot admin-role-dot--admin" />
                                Administrators
                            </div>

                            <strong>
                                {users.admins}
                            </strong>

                        </div>


                        <div className="admin-distribution__bar">

                            <span
                                style={{
                                    width: `${
                                        users.total
                                            ? (users.admins /
                                                  users.total) *
                                              100
                                            : 0
                                    }%`,
                                }}
                            />

                        </div>


                        <div className="admin-distribution__row">

                            <div className="admin-distribution__label">
                                <span className="admin-role-dot admin-role-dot--farmer" />
                                Farmers
                            </div>

                            <strong>
                                {users.farmers}
                            </strong>

                        </div>


                        <div className="admin-distribution__bar">

                            <span
                                style={{
                                    width: `${
                                        users.total
                                            ? (users.farmers /
                                                  users.total) *
                                              100
                                            : 0
                                    }%`,
                                }}
                            />

                        </div>

                    </div>

                </div>

            </section>


            {/* ================================================================
                ANIMAL + ALERT INTELLIGENCE
            ================================================================ */}

            <section className="admin-grid">

                <div className="admin-panel">

                    <div className="admin-panel__header">

                        <div>
                            <span className="admin-section__eyebrow">
                                BIOLOGICAL MONITORING
                            </span>

                            <h2>
                                Animal Health
                            </h2>
                        </div>

                        <span className="admin-panel__code">
                            BIO-01
                        </span>

                    </div>


                    <div className="admin-health-summary">

                        <div className="admin-health-stat admin-health-stat--healthy">
                            <span>
                                HEALTHY
                            </span>

                            <strong>
                                {animals.healthy}
                            </strong>

                            <small>
                                {animals.total
                                    ? Math.round(
                                          (animals.healthy /
                                              animals.total) *
                                              100
                                      )
                                    : 0}
                                % of monitored herd
                            </small>
                        </div>


                        <div className="admin-health-stat admin-health-stat--risk">
                            <span>
                                AT RISK
                            </span>

                            <strong>
                                {animals.at_risk}
                            </strong>

                            <small>
                                Requires attention
                            </small>
                        </div>

                    </div>


                    <div className="admin-health-bar">

                        <span
                            style={{
                                width: `${
                                    animals.total
                                        ? (animals.healthy /
                                              animals.total) *
                                          100
                                        : 0
                                }%`,
                            }}
                        />

                    </div>

                </div>


                <div className="admin-panel">

                    <div className="admin-panel__header">

                        <div>
                            <span className="admin-section__eyebrow">
                                THREAT MONITORING
                            </span>

                            <h2>
                                Alert Command
                            </h2>
                        </div>

                        <span className="admin-panel__code">
                            ALT-01
                        </span>

                    </div>


                    <div className="admin-alert-grid">

                        <div className="admin-alert-stat admin-alert-stat--critical">
                            <span>
                                CRITICAL
                            </span>

                            <strong>
                                {alerts.critical}
                            </strong>
                        </div>

                        <div className="admin-alert-stat admin-alert-stat--warning">
                            <span>
                                WARNING
                            </span>

                            <strong>
                                {alerts.warning}
                            </strong>
                        </div>

                        <div className="admin-alert-stat admin-alert-stat--unresolved">
                            <span>
                                UNRESOLVED
                            </span>

                            <strong>
                                {alerts.unresolved}
                            </strong>
                        </div>

                        <div className="admin-alert-stat admin-alert-stat--resolved">
                            <span>
                                RESOLVED
                            </span>

                            <strong>
                                {alerts.resolved}
                            </strong>
                        </div>

                    </div>

                </div>

            </section>


            {/* ================================================================
                PLATFORM STATUS
            ================================================================ */}

            <section className="admin-platform-status">

                <div className="admin-platform-status__identity">

                    <div className="admin-command-mark admin-command-mark--small">
                        HS
                    </div>

                    <div>
                        <strong>
                            HerdSense AI Platform
                        </strong>

                        <span>
                            Production intelligence
                            infrastructure
                        </span>
                    </div>

                </div>


                <div className="admin-platform-status__items">

                    <div>
                        <span>API</span>
                        <StatusIndicator
                            status={system.api}
                        />
                    </div>

                    <div>
                        <span>DATABASE</span>
                        <StatusIndicator
                            status={
                                system.database
                            }
                        />
                    </div>

                    <div>
                        <span>NETWORK</span>

                        <strong>
                            {system.blockchain}
                        </strong>
                    </div>

                </div>

            </section>


            {/* ================================================================
                FOOTER
            ================================================================ */}

            <footer className="admin-footer">

                <span>
                    HERDSENSE AI ADMIN CONTROL ROOM
                </span>

                <span>
                    Secure administrative interface
                </span>

                <span>
                    v{system.version}
                </span>

            </footer>

        </main>
    );
}