/* ==========================================================================
   HERDSENSE AI — SETTINGS
   Global enterprise command-center interface
   ========================================================================== */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import "./Settings.css";

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

const REFRESH_OPTIONS = [
    {
        value: "15",
        label: "15 seconds",
    },
    {
        value: "30",
        label: "30 seconds",
    },
    {
        value: "60",
        label: "1 minute",
    },
    {
        value: "120",
        label: "2 minutes",
    },
];

const DEFAULT_SETTINGS = {
    theme: "light",
    refreshInterval: "30",
    criticalAlerts: true,
    warningAlerts: true,
    systemNotifications: true,
};

/* ==========================================================================
   STORAGE HELPERS
   ========================================================================== */

function readBoolean(key, fallback = true) {
    const value = localStorage.getItem(key);

    if (value === null) {
        return fallback;
    }

    return value !== "false";
}

/* ==========================================================================
   COMPONENT
   ========================================================================== */

export default function Settings() {
    const navigate = useNavigate();

    /* ======================================================================
       STATE
       ====================================================================== */

    const [darkMode, setDarkMode] = useState(() => {
        return (
            localStorage.getItem("theme") === "dark"
        );
    });

    const [refreshInterval, setRefreshInterval] =
        useState(() => {
            return (
                localStorage.getItem(
                    "telemetry_refresh_interval"
                ) || DEFAULT_SETTINGS.refreshInterval
            );
        });

    const [criticalAlerts, setCriticalAlerts] =
        useState(() =>
            readBoolean(
                "critical_alert_notifications",
                DEFAULT_SETTINGS.criticalAlerts
            )
        );

    const [warningAlerts, setWarningAlerts] =
        useState(() =>
            readBoolean(
                "warning_alert_notifications",
                DEFAULT_SETTINGS.warningAlerts
            )
        );

    const [systemNotifications, setSystemNotifications] =
        useState(() =>
            readBoolean(
                "system_notifications",
                DEFAULT_SETTINGS.systemNotifications
            )
        );

    const [saved, setSaved] = useState(false);

    /* ======================================================================
       CURRENT SYSTEM STATE
       ====================================================================== */

    const systemState = useMemo(
        () => ({
            api: true,
            authentication:
                Boolean(
                    localStorage.getItem(
                        "access_token"
                    )
                ),
            telemetry: true,
        }),
        []
    );

    /* ======================================================================
       THEME SYNCHRONIZATION
       ====================================================================== */

    useEffect(() => {
        const theme = darkMode
            ? "dark"
            : "light";

        document.documentElement.setAttribute(
            "data-theme",
            theme
        );

        localStorage.setItem(
            "theme",
            theme
        );
    }, [darkMode]);

    /* ======================================================================
       SAVE FEEDBACK
       ====================================================================== */

    const showSavedState = () => {
        setSaved(true);

        window.setTimeout(() => {
            setSaved(false);
        }, 2500);
    };

    /* ======================================================================
       SAVE SETTINGS
       ====================================================================== */

    const saveSettings = () => {
        localStorage.setItem(
            "theme",
            darkMode
                ? "dark"
                : "light"
        );

        localStorage.setItem(
            "telemetry_refresh_interval",
            refreshInterval
        );

        localStorage.setItem(
            "critical_alert_notifications",
            String(criticalAlerts)
        );

        localStorage.setItem(
            "warning_alert_notifications",
            String(warningAlerts)
        );

        localStorage.setItem(
            "system_notifications",
            String(systemNotifications)
        );

        showSavedState();
    };

    /* ======================================================================
       RESET
       ====================================================================== */

    const resetSettings = () => {
        setDarkMode(
            DEFAULT_SETTINGS.theme === "dark"
        );

        setRefreshInterval(
            DEFAULT_SETTINGS.refreshInterval
        );

        setCriticalAlerts(
            DEFAULT_SETTINGS.criticalAlerts
        );

        setWarningAlerts(
            DEFAULT_SETTINGS.warningAlerts
        );

        setSystemNotifications(
            DEFAULT_SETTINGS.systemNotifications
        );

        localStorage.setItem(
            "theme",
            DEFAULT_SETTINGS.theme
        );

        localStorage.setItem(
            "telemetry_refresh_interval",
            DEFAULT_SETTINGS.refreshInterval
        );

        localStorage.setItem(
            "critical_alert_notifications",
            String(
                DEFAULT_SETTINGS.criticalAlerts
            )
        );

        localStorage.setItem(
            "warning_alert_notifications",
            String(
                DEFAULT_SETTINGS.warningAlerts
            )
        );

        localStorage.setItem(
            "system_notifications",
            String(
                DEFAULT_SETTINGS.systemNotifications
            )
        );

        showSavedState();
    };

    /* ======================================================================
       LOGOUT
       ====================================================================== */

    const handleLogout = () => {
        localStorage.removeItem(
            "access_token"
        );

        navigate("/login", {
            replace: true,
        });
    };

    /* ======================================================================
       RENDER
       ====================================================================== */

    return (
        <AppShell>
            <div className="hs-settings-page">

                {/* ==========================================================
                    HEADER
                ========================================================== */}

                <header className="hs-settings-header">

                    <div className="hs-settings-heading">

                        <div className="hs-section-label">
                            SYSTEM CONTROL
                        </div>

                        <div className="hs-settings-title-row">

                            <h1>
                                Settings
                            </h1>

                            <span className="hs-settings-version">
                                v1.0
                            </span>

                        </div>

                        <p>
                            Configure the HerdSense AI
                            command center, monitoring
                            behavior and operational
                            preferences.
                        </p>

                    </div>

                    <div className="hs-settings-header-actions">

                        {saved && (
                            <span className="hs-settings-saved">
                                <span>
                                    ✓
                                </span>

                                Changes saved
                            </span>
                        )}

                        <button
                            type="button"
                            className="hs-settings-reset"
                            onClick={
                                resetSettings
                            }
                        >
                            Reset
                        </button>

                        <button
                            type="button"
                            className="hs-settings-save"
                            onClick={
                                saveSettings
                            }
                        >
                            Save changes
                            <span>
                                →
                            </span>
                        </button>

                    </div>

                </header>

                {/* ==========================================================
                    SYSTEM OVERVIEW
                ========================================================== */}

                <section className="hs-settings-overview">

                    <div className="hs-overview-main">

                        <div className="hs-overview-kicker">
                            COMMAND CENTER
                        </div>

                        <strong>
                            HerdSense AI
                        </strong>

                        <span>
                            Livestock intelligence
                            infrastructure
                        </span>

                    </div>

                    <div className="hs-overview-status">

                        <SystemIndicator
                            label="API"
                            active={
                                systemState.api
                            }
                        />

                        <SystemIndicator
                            label="AUTH"
                            active={
                                systemState.authentication
                            }
                        />

                        <SystemIndicator
                            label="TELEMETRY"
                            active={
                                systemState.telemetry
                            }
                        />

                    </div>

                </section>

                {/* ==========================================================
                    ACCOUNT
                ========================================================== */}

                <SettingsSection
                    index="01"
                    icon="◉"
                    title="Account"
                    description="Administrator identity and access context."
                >

                    <div className="hs-settings-card">

                        <div className="hs-account-profile">

                            <div className="hs-account-avatar">
                                SA
                            </div>

                            <div className="hs-account-info">

                                <div className="hs-account-name-row">

                                    <strong>
                                        Serrano Adefemi
                                    </strong>

                                    <span className="hs-account-badge">
                                        ADMIN
                                    </span>

                                </div>

                                <span>
                                    Administrator
                                    account
                                </span>

                            </div>

                            <div className="hs-account-live">

                                <span />

                                SESSION ACTIVE

                            </div>

                        </div>

                        <div className="hs-settings-divider" />

                        <div className="hs-account-details">

                            <AccountDetail
                                label="ROLE"
                                value="Administrator"
                            />

                            <AccountDetail
                                label="ACCESS"
                                value="Full command center"
                            />

                            <AccountDetail
                                label="AUTHENTICATION"
                                value={
                                    systemState.authentication
                                        ? "JWT authenticated"
                                        : "Session unavailable"
                                }
                            />

                        </div>

                    </div>

                </SettingsSection>

                {/* ==========================================================
                    APPEARANCE
                ========================================================== */}

                <SettingsSection
                    index="02"
                    icon="◐"
                    title="Appearance"
                    description="Control the visual environment of the command center."
                >

                    <div className="hs-settings-card">

                        <SettingsToggle
                            title="Dark mode"
                            description="Use the dark command-center interface optimized for extended monitoring sessions."
                            value={
                                darkMode
                            }
                            onChange={
                                setDarkMode
                            }
                            meta={
                                darkMode
                                    ? "ACTIVE"
                                    : "OFF"
                            }
                        />

                    </div>

                </SettingsSection>

                {/* ==========================================================
                    MONITORING
                ========================================================== */}

                <SettingsSection
                    index="03"
                    icon="⌁"
                    title="Monitoring"
                    description="Configure live telemetry and dashboard refresh behavior."
                >

                    <div className="hs-settings-card">

                        <div className="hs-settings-row">

                            <div className="hs-settings-row-content">

                                <div className="hs-row-title">
                                    <strong>
                                        Dashboard refresh
                                    </strong>

                                    <span className="hs-row-chip">
                                        REST
                                    </span>
                                </div>

                                <span>
                                    Controls how frequently
                                    dashboard data is
                                    refreshed from the API.
                                </span>

                            </div>

                            <select
                                className="hs-settings-select"
                                value={
                                    refreshInterval
                                }
                                onChange={(event) =>
                                    setRefreshInterval(
                                        event.target.value
                                    )
                                }
                                aria-label="Dashboard refresh interval"
                            >

                                {REFRESH_OPTIONS.map(
                                    (option) => (
                                        <option
                                            key={
                                                option.value
                                            }
                                            value={
                                                option.value
                                            }
                                        >
                                            {
                                                option.label
                                            }
                                        </option>
                                    )
                                )}

                            </select>

                        </div>

                        <div className="hs-settings-divider" />

                        <div className="hs-settings-row">

                            <div className="hs-settings-row-content">

                                <div className="hs-row-title">

                                    <strong>
                                        Live telemetry
                                    </strong>

                                    <span className="hs-row-chip live">
                                        REAL-TIME
                                    </span>

                                </div>

                                <span>
                                    WebSocket monitoring
                                    remains active for
                                    real-time sensor events.
                                </span>

                            </div>

                            <StatusPill
                                label="LIVE"
                                active
                            />

                        </div>

                    </div>

                </SettingsSection>

                {/* ==========================================================
                    ALERTS
                ========================================================== */}

                <SettingsSection
                    index="04"
                    icon="!"
                    title="Alerts"
                    description="Control operational notifications generated by the intelligence engine."
                >

                    <div className="hs-settings-card">

                        <SettingsToggle
                            title="Critical alerts"
                            description="Receive notifications when an animal enters a critical health condition."
                            value={
                                criticalAlerts
                            }
                            onChange={
                                setCriticalAlerts
                            }
                            meta="PRIORITY"
                        />

                        <div className="hs-settings-divider" />

                        <SettingsToggle
                            title="Warning alerts"
                            description="Receive notifications for warning-level animal conditions."
                            value={
                                warningAlerts
                            }
                            onChange={
                                setWarningAlerts
                            }
                            meta="MONITOR"
                        />

                        <div className="hs-settings-divider" />

                        <SettingsToggle
                            title="System notifications"
                            description="Receive notifications about monitoring and platform status."
                            value={
                                systemNotifications
                            }
                            onChange={
                                setSystemNotifications
                            }
                            meta="SYSTEM"
                        />

                    </div>

                </SettingsSection>

                {/* ==========================================================
                    SYSTEM
                ========================================================== */}

                <SettingsSection
                    index="05"
                    icon="◌"
                    title="System"
                    description="Current HerdSense AI infrastructure status."
                >

                    <div className="hs-settings-card hs-system-card">

                        <SystemStatusRow
                            title="API service"
                            description="FastAPI backend"
                            status="Operational"
                        />

                        <div className="hs-settings-divider" />

                        <SystemStatusRow
                            title="Authentication"
                            description="JWT session"
                            status={
                                systemState.authentication
                                    ? "Active"
                                    : "Unavailable"
                            }
                            active={
                                systemState.authentication
                            }
                        />

                        <div className="hs-settings-divider" />

                        <SystemStatusRow
                            title="Telemetry network"
                            description="Live WebSocket monitoring"
                            status="Monitoring"
                        />

                    </div>

                </SettingsSection>

                {/* ==========================================================
                    SECURITY
                ========================================================== */}

                <SettingsSection
                    index="06"
                    icon="◈"
                    title="Security"
                    description="Manage the current command-center session."
                >

                    <div className="hs-settings-card">

                        <div className="hs-security-row">

                            <div className="hs-security-identity">

                                <div className="hs-security-icon">
                                    ✓
                                </div>

                                <div>

                                    <strong>
                                        Current session
                                    </strong>

                                    <span>
                                        Authenticated
                                        administrator
                                        session.
                                    </span>

                                </div>

                            </div>

                            <button
                                type="button"
                                className="hs-settings-logout"
                                onClick={
                                    handleLogout
                                }
                            >
                                Sign out
                            </button>

                        </div>

                    </div>

                </SettingsSection>

                {/* ==========================================================
                    FOOTER
                ========================================================== */}

                <footer className="hs-settings-footer">

                    <div className="hs-footer-brand">

                        <strong>
                            HerdSense AI
                        </strong>

                        <span>
                            Livestock intelligence
                            platform
                        </span>

                    </div>

                    <div className="hs-footer-meta">

                        <span>
                            SYSTEM CONTROL
                        </span>

                        <i />

                        <span>
                            © 2026
                        </span>

                    </div>

                </footer>

            </div>
        </AppShell>
    );
}

/* ==========================================================================
   SETTINGS SECTION
   ========================================================================== */

function SettingsSection({
    index,
    icon,
    title,
    description,
    children,
}) {
    return (
        <section className="hs-settings-section">

            <div className="hs-settings-section-header">

                <div className="hs-section-marker">
                    {index}
                </div>

                <div className="hs-settings-section-icon">
                    {icon}
                </div>

                <div className="hs-settings-section-heading">

                    <h2>
                        {title}
                    </h2>

                    <p>
                        {description}
                    </p>

                </div>

            </div>

            {children}

        </section>
    );
}

/* ==========================================================================
   ACCOUNT DETAIL
   ========================================================================== */

function AccountDetail({
    label,
    value,
}) {
    return (
        <div className="hs-account-detail">

            <span>
                {label}
            </span>

            <strong>
                {value}
            </strong>

        </div>
    );
}

/* ==========================================================================
   SETTINGS TOGGLE
   ========================================================================== */

function SettingsToggle({
    title,
    description,
    value,
    onChange,
    meta,
}) {
    return (
        <div className="hs-settings-row">

            <div className="hs-settings-row-content">

                <div className="hs-row-title">

                    <strong>
                        {title}
                    </strong>

                    {meta && (
                        <span className="hs-row-chip">
                            {meta}
                        </span>
                    )}

                </div>

                <span>
                    {description}
                </span>

            </div>

            <button
                type="button"
                className={`hs-settings-toggle ${
                    value
                        ? "active"
                        : ""
                }`}
                onClick={() =>
                    onChange(
                        (current) =>
                            !current
                    )
                }
                aria-label={`Toggle ${title}`}
                aria-pressed={
                    value
                }
            >

                <span />

            </button>

        </div>
    );
}

/* ==========================================================================
   SYSTEM INDICATOR
   ========================================================================== */

function SystemIndicator({
    label,
    active,
}) {
    return (
        <div
            className={`hs-overview-indicator ${
                active
                    ? "active"
                    : "inactive"
            }`}
        >

            <span />

            <strong>
                {label}
            </strong>

        </div>
    );
}

/* ==========================================================================
   STATUS PILL
   ========================================================================== */

function StatusPill({
    label,
    active = false,
}) {
    return (
        <span
            className={`hs-settings-status ${
                active
                    ? "operational"
                    : ""
            }`}
        >

            <span />

            {label}

        </span>
    );
}

/* ==========================================================================
   SYSTEM STATUS ROW
   ========================================================================== */

function SystemStatusRow({
    title,
    description,
    status,
    active = true,
}) {
    return (
        <div className="hs-system-status-row">

            <div>

                <div className="hs-system-title">
                    <strong>
                        {title}
                    </strong>

                    <span>
                        {description}
                    </span>
                </div>

            </div>

            <StatusPill
                label={status}
                active={active}
            />

        </div>
    );
}