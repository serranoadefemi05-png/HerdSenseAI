import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { Link, useNavigate } from "react-router-dom";

import api from "../api/api";
import AppShell from "../components/AppShell";
import useTelemetrySocket from "../hooks/useTelemetrySocket";

import "./Alerts.css";

const REFRESH_INTERVAL = 15000;
const MAX_ALERTS = 200;

function normalizeArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.results)) return data.results;

    return [];
}

function firstDefined(...values) {
    return values.find(
        (value) =>
            value !== undefined &&
            value !== null &&
            value !== ""
    );
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString();
}

function formatRelativeTime(value) {
    if (!value) return "Unknown";

    const timestamp = new Date(value).getTime();

    if (Number.isNaN(timestamp)) return "Unknown";

    const seconds = Math.floor(
        (Date.now() - timestamp) / 1000
    );

    if (seconds < 10) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);

    return `${days}d ago`;
}

function getSeverity(alert) {
    const severity = String(
        firstDefined(
            alert?.severity,
            alert?.level,
            alert?.priority
        ) || "warning"
    ).toLowerCase();

    if (severity.includes("critical")) {
        return "critical";
    }

    if (
        severity.includes("warning") ||
        severity.includes("high")
    ) {
        return "warning";
    }

    if (severity.includes("low")) {
        return "low";
    }

    return "healthy";
}

function getSeverityLabel(severity) {
    switch (severity) {
        case "critical":
            return "CRITICAL";

        case "warning":
            return "WARNING";

        case "low":
            return "LOW";

        default:
            return "HEALTHY";
    }
}

function getAlertTitle(alert) {
    return (
        firstDefined(
            alert?.title,
            alert?.message,
            alert?.description,
            alert?.alert_type,
            alert?.type
        ) || "Health event detected"
    );
}

function getAnimalId(alert) {
    return firstDefined(
        alert?.animal_id,
        alert?.animalId,
        alert?.animal?.id
    );
}

function getAnimalName(alert) {
    const animal = alert?.animal;

    return (
        firstDefined(
            animal?.name,
            animal?.animal_name,
            animal?.animalName,
            alert?.animal_name,
            alert?.animalName
        ) ||
        (getAnimalId(alert)
            ? `Animal #${getAnimalId(alert)}`
            : "Livestock")
    );
}

function getCategory(alert) {
    return (
        firstDefined(
            alert?.category,
            alert?.alert_type,
            alert?.type
        ) || "Health Monitoring"
    );
}

function getTimestamp(alert) {
    return firstDefined(
        alert?.timestamp,
        alert?.created_at,
        alert?.createdAt,
        alert?.updated_at,
        alert?.updatedAt
    );
}

function isResolved(alert) {
    return (
        alert?.resolved === true ||
        alert?.is_resolved === true ||
        String(alert?.status || "").toLowerCase() ===
            "resolved"
    );
}

function normalizeAlert(alert, index = 0) {
    const id = firstDefined(
        alert?.id,
        alert?.alert_id,
        alert?.alertId
    );

    const animalId = getAnimalId(alert);
    const timestamp = getTimestamp(alert);

    return {
        ...alert,

        _id:
            id !== undefined
                ? String(id)
                : `generated-${animalId || "animal"}-${timestamp || index}`,

        _severity: getSeverity(alert),

        _title: getAlertTitle(alert),

        _animalId: animalId,

        _animalName: getAnimalName(alert),

        _category: getCategory(alert),

        _timestamp: timestamp,

        _resolved: isResolved(alert),
    };
}

function mergeAlerts(current, incoming) {
    const map = new Map();

    [...current, ...incoming].forEach(
        (alert) => {
            const normalized =
                alert?._severity
                    ? alert
                    : normalizeAlert(alert);

            map.set(
                String(normalized._id),
                normalized
            );
        }
    );

    return Array.from(map.values())
        .sort((a, b) => {
            const aTime = new Date(
                a._timestamp || 0
            ).getTime();

            const bTime = new Date(
                b._timestamp || 0
            ).getTime();

            return bTime - aTime;
        })
        .slice(0, MAX_ALERTS);
}

function getPriorityValue(alert) {
    if (alert._resolved) return 0;

    switch (alert._severity) {
        case "critical":
            return 4;

        case "warning":
            return 3;

        case "low":
            return 2;

        default:
            return 1;
    }
}

export default function Alerts() {
    const navigate = useNavigate();

    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [apiOnline, setApiOnline] = useState(false);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("all");
    const [selectedAlert, setSelectedAlert] =
        useState(null);
    const [actionId, setActionId] =
        useState(null);
    const [lastSync, setLastSync] =
        useState(null);

    const [socketEvents, setSocketEvents] =
        useState(0);

    const handleAuthFailure = useCallback(() => {
        localStorage.removeItem(
            "access_token"
        );

        navigate("/login", {
            replace: true,
        });
    }, [navigate]);

    const loadAlerts = useCallback(
        async (isRefresh = false) => {
            const token =
                localStorage.getItem(
                    "access_token"
                );

            if (!token) {
                handleAuthFailure();
                return;
            }

            try {
                if (isRefresh) {
                    setRefreshing(true);
                } else {
                    setLoading(true);
                }

                setError("");

                const response =
                    await api.get(
                        "/alerts/",
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );

                const incoming =
                    normalizeArray(
                        response.data
                    ).map(
                        (alert, index) =>
                            normalizeAlert(
                                alert,
                                index
                            )
                    );

                setAlerts(
                    mergeAlerts(
                        [],
                        incoming
                    )
                );

                setApiOnline(true);
                setLastSync(
                    new Date()
                );
            } catch (err) {
                console.error(
                    "Alert Center API error:",
                    err
                );

                if (
                    err?.response?.status ===
                    401
                ) {
                    handleAuthFailure();
                    return;
                }

                setApiOnline(false);

                setError(
                    "Unable to synchronize with the HerdSense alert service."
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [handleAuthFailure]
    );

    /*
     * --------------------------------------------------------
     * REAL-TIME ALERT
     * --------------------------------------------------------
     */

    const handleTelemetry = useCallback(
        () => {
            setSocketEvents(
                (value) => value + 1
            );
        },
        []
    );

    const handleHealthUpdate =
        useCallback(() => {
            setSocketEvents(
                (value) => value + 1
            );
        }, []);

    const handleSocketAlert =
        useCallback((data) => {
            if (!data) return;

            const incoming =
                normalizeAlert(data);

            setAlerts((current) =>
                mergeAlerts(
                    current,
                    [incoming]
                )
            );

            setSocketEvents(
                (value) => value + 1
            );

            setApiOnline(true);
            setLastSync(new Date());
        }, []);

    const handleAlertStatus =
        useCallback((data) => {
            if (!data) return;

            const alertId = firstDefined(
                data?.id,
                data?.alert_id,
                data?.alertId
            );

            if (alertId === undefined) {
                return;
            }

            setAlerts((current) =>
                current.map((alert) => {
                    if (
                        String(
                            alert._id
                        ) !==
                        String(alertId)
                    ) {
                        return alert;
                    }

                    const updated = {
                        ...alert,
                        resolved:
                            data.resolved ??
                            alert.resolved,

                        _resolved:
                            data.resolved ??
                            alert._resolved,

                        status:
                            data.status ??
                            alert.status,
                    };

                    return normalizeAlert(
                        updated
                    );
                })
            );

            setSocketEvents(
                (value) => value + 1
            );

            setLastSync(new Date());
        }, []);

    useTelemetrySocket({
        enabled: true,
        onTelemetry:
            handleTelemetry,
        onHealthUpdate:
            handleHealthUpdate,
        onAlert:
            handleSocketAlert,
        onAlertStatus:
            handleAlertStatus,
    });

    /*
     * --------------------------------------------------------
     * INITIAL LOAD / FALLBACK REFRESH
     * --------------------------------------------------------
     */

    useEffect(() => {
        loadAlerts();

        const interval =
            setInterval(() => {
                loadAlerts(true);
            }, REFRESH_INTERVAL);

        return () => {
            clearInterval(interval);
        };
    }, [loadAlerts]);

    /*
     * --------------------------------------------------------
     * RESOLVE / REOPEN
     * --------------------------------------------------------
     */

    const updateAlertStatus =
        useCallback(
            async (alert, resolved) => {
                const token =
                    localStorage.getItem(
                        "access_token"
                    );

                if (!token) {
                    handleAuthFailure();
                    return;
                }

                setActionId(
                    alert._id
                );

                try {
                    const response =
                        await api.patch(
                            `/alerts/${alert._id}/resolve`,
                            {
                                resolved,
                            },
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                            }
                        );

                    const updated =
                        normalizeAlert(
                            response.data
                        );

                    setAlerts((current) =>
                        current.map(
                            (item) =>
                                String(
                                    item._id
                                ) ===
                                String(
                                    alert._id
                                )
                                    ? {
                                          ...item,
                                          ...updated,
                                      }
                                    : item
                        )
                    );

                    setSelectedAlert(
                        (current) =>
                            current &&
                            String(
                                current._id
                            ) ===
                                String(
                                    alert._id
                                )
                                ? {
                                      ...current,
                                      ...updated,
                                  }
                                : current
                    );
                } catch (err) {
                    console.error(
                        "Alert status update failed:",
                        err
                    );

                    if (
                        err?.response
                            ?.status ===
                        401
                    ) {
                        handleAuthFailure();
                        return;
                    }

                    setError(
                        "Unable to update alert status."
                    );
                } finally {
                    setActionId(null);
                }
            },
            [handleAuthFailure]
        );

    /*
     * --------------------------------------------------------
     * NORMALIZED DATA
     * --------------------------------------------------------
     */

    const normalizedAlerts =
        useMemo(() => {
            return alerts
                .map((alert) =>
                    alert?._severity
                        ? alert
                        : normalizeAlert(
                              alert
                          )
                )
                .sort((a, b) => {
                    const priorityDifference =
                        getPriorityValue(
                            b
                        ) -
                        getPriorityValue(
                            a
                        );

                    if (
                        priorityDifference !==
                        0
                    ) {
                        return priorityDifference;
                    }

                    const aTime =
                        new Date(
                            a._timestamp ||
                                0
                        ).getTime();

                    const bTime =
                        new Date(
                            b._timestamp ||
                                0
                        ).getTime();

                    return bTime - aTime;
                });
        }, [alerts]);

    const unresolvedAlerts =
        useMemo(
            () =>
                normalizedAlerts.filter(
                    (alert) =>
                        !alert._resolved
                ),
            [normalizedAlerts]
        );

    const counts = useMemo(() => {
        return {
            total:
                unresolvedAlerts.length,

            critical:
                unresolvedAlerts.filter(
                    (alert) =>
                        alert._severity ===
                        "critical"
                ).length,

            warning:
                unresolvedAlerts.filter(
                    (alert) =>
                        alert._severity ===
                        "warning"
                ).length,

            low:
                unresolvedAlerts.filter(
                    (alert) =>
                        alert._severity ===
                        "low"
                ).length,
        };
    }, [unresolvedAlerts]);

    const criticalAlerts =
        useMemo(
            () =>
                unresolvedAlerts.filter(
                    (alert) =>
                        alert._severity ===
                        "critical"
                ),
            [unresolvedAlerts]
        );

    const filteredAlerts =
        useMemo(() => {
            switch (filter) {
                case "unresolved":
                    return unresolvedAlerts;

                case "resolved":
                    return normalizedAlerts.filter(
                        (alert) =>
                            alert._resolved
                    );

                case "critical":
                case "warning":
                case "low":
                    return unresolvedAlerts.filter(
                        (alert) =>
                            alert._severity ===
                            filter
                    );

                default:
                    return normalizedAlerts;
            }
        }, [
            filter,
            normalizedAlerts,
            unresolvedAlerts,
        ]);

    /*
     * --------------------------------------------------------
     * LOADING
     * --------------------------------------------------------
     */

    if (loading) {
        return (
            <AppShell>
                <div className="alerts-loading">
                    <div className="alerts-loading-mark">
                        HS
                    </div>

                    <strong>
                        HERDSENSE AI
                    </strong>

                    <span>
                        Initializing alert
                        intelligence...
                    </span>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="alerts-page">
                {/* =================================================
                    COMMAND HEADER
                ================================================= */}

                <section className="alerts-command-header">
                    <div>
                        <div className="alerts-eyebrow">
                            HERDSENSE AI / OPERATIONS
                        </div>

                        <h1>
                            Alert Command Center
                        </h1>

                        <p>
                            Real-time operational
                            intelligence for
                            livestock health
                            events and response.
                        </p>
                    </div>

                    <div className="alerts-command-status">
                        <div className="alerts-system-state">
                            <span
                                className={`alerts-live-dot ${
                                    apiOnline
                                        ? "online"
                                        : "offline"
                                }`}
                            />

                            <div>
                                <strong>
                                    {apiOnline
                                        ? "SYSTEM OPERATIONAL"
                                        : "SYSTEM DEGRADED"}
                                </strong>

                                <span>
                                    Alert service
                                    {lastSync
                                        ? ` · synced ${formatRelativeTime(
                                              lastSync
                                          )}`
                                        : ""}
                                </span>
                            </div>
                        </div>

                        <div className="alerts-stream-state">
                            <span>
                                LIVE STREAM
                            </span>

                            <strong>
                                {socketEvents}
                            </strong>
                        </div>
                    </div>
                </section>

                {/* =================================================
                    CRITICAL BANNER
                ================================================= */}

                {counts.critical > 0 && (
                    <section className="alerts-critical-banner">
                        <div className="critical-banner-pulse">
                            !
                        </div>

                        <div className="critical-banner-copy">
                            <span>
                                PRIORITY RESPONSE
                            </span>

                            <strong>
                                {counts.critical}{" "}
                                critical{" "}
                                {counts.critical ===
                                1
                                    ? "event"
                                    : "events"}{" "}
                                require immediate
                                attention
                            </strong>

                            <small>
                                Review affected
                                animals and resolve
                                conditions only
                                after operational
                                verification.
                            </small>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setFilter(
                                    "critical"
                                )
                            }
                        >
                            VIEW CRITICAL
                            <span>→</span>
                        </button>
                    </section>
                )}

                {/* =================================================
                    ERROR
                ================================================= */}

                {error && (
                    <div className="alerts-error">
                        <div>
                            <strong>
                                Synchronization
                                warning
                            </strong>

                            <span>
                                {error}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                loadAlerts(true)
                            }
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* =================================================
                    OPERATIONS METRICS
                ================================================= */}

                <section className="alerts-stat-grid">
                    <AlertStat
                        label="Unresolved"
                        value={counts.total}
                        description="Active response queue"
                        type="total"
                    />

                    <AlertStat
                        label="Critical"
                        value={counts.critical}
                        description="Immediate attention"
                        type="critical"
                    />

                    <AlertStat
                        label="Warning"
                        value={counts.warning}
                        description="Requires monitoring"
                        type="warning"
                    />

                    <AlertStat
                        label="Low"
                        value={counts.low}
                        description="Low priority"
                        type="low"
                    />
                </section>

                {/* =================================================
                    CRITICAL QUEUE
                ================================================= */}

                {criticalAlerts.length > 0 && (
                    <section className="alerts-priority-panel">
                        <div className="alerts-panel-header">
                            <div>
                                <span className="alerts-eyebrow">
                                    PRIORITY QUEUE
                                </span>

                                <h2>
                                    Critical response
                                </h2>

                                <p>
                                    Highest-priority
                                    events requiring
                                    operational review.
                                </p>
                            </div>

                            <span className="alerts-panel-counter critical">
                                {criticalAlerts.length}{" "}
                                ACTIVE
                            </span>
                        </div>

                        <div className="critical-queue">
                            {criticalAlerts
                                .slice(0, 5)
                                .map(
                                    (alert) => (
                                        <CriticalAlert
                                            key={
                                                alert._id
                                            }
                                            alert={
                                                alert
                                            }
                                            actionId={
                                                actionId
                                            }
                                            onInspect={() =>
                                                setSelectedAlert(
                                                    alert
                                                )
                                            }
                                            onResolve={() =>
                                                updateAlertStatus(
                                                    alert,
                                                    true
                                                )
                                            }
                                        />
                                    )
                                )}
                        </div>
                    </section>
                )}

                {/* =================================================
                    EVENT STREAM
                ================================================= */}

                <section className="alerts-panel">
                    <div className="alerts-panel-header">
                        <div>
                            <span className="alerts-eyebrow">
                                EVENT STREAM
                            </span>

                            <h2>
                                Alert activity
                            </h2>

                            <p>
                                Live operational
                                events received from
                                monitored livestock.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="alerts-refresh-button"
                            onClick={() =>
                                loadAlerts(true)
                            }
                            disabled={
                                refreshing
                            }
                        >
                            <span>
                                ↻
                            </span>

                            {refreshing
                                ? "SYNCING"
                                : "REFRESH"}
                        </button>
                    </div>

                    {/* =================================================
                        FILTERS
                    ================================================= */}

                    <div className="alerts-filters">
                        <FilterButton
                            active={
                                filter === "all"
                            }
                            onClick={() =>
                                setFilter(
                                    "all"
                                )
                            }
                        >
                            All
                        </FilterButton>

                        <FilterButton
                            active={
                                filter ===
                                "unresolved"
                            }
                            onClick={() =>
                                setFilter(
                                    "unresolved"
                                )
                            }
                        >
                            Active
                        </FilterButton>

                        <FilterButton
                            active={
                                filter ===
                                "critical"
                            }
                            onClick={() =>
                                setFilter(
                                    "critical"
                                )
                            }
                            danger
                        >
                            Critical
                        </FilterButton>

                        <FilterButton
                            active={
                                filter ===
                                "warning"
                            }
                            onClick={() =>
                                setFilter(
                                    "warning"
                                )
                            }
                        >
                            Warning
                        </FilterButton>

                        <FilterButton
                            active={
                                filter === "low"
                            }
                            onClick={() =>
                                setFilter(
                                    "low"
                                )
                            }
                        >
                            Low
                        </FilterButton>

                        <FilterButton
                            active={
                                filter ===
                                "resolved"
                            }
                            onClick={() =>
                                setFilter(
                                    "resolved"
                                )
                            }
                        >
                            Resolved
                        </FilterButton>
                    </div>

                    {/* =================================================
                        TABLE HEADER
                    ================================================= */}

                    <div className="alerts-stream-header">
                        <span>SEVERITY</span>
                        <span>EVENT</span>
                        <span>ANIMAL</span>
                        <span>TIME</span>
                        <span>STATUS</span>
                        <span />
                    </div>

                    <div className="alerts-list">
                        {filteredAlerts.length ===
                        0 ? (
                            <EmptyAlerts
                                filter={
                                    filter
                                }
                            />
                        ) : (
                            filteredAlerts.map(
                                (alert) => (
                                    <AlertRow
                                        key={
                                            alert._id
                                        }
                                        alert={
                                            alert
                                        }
                                        actionId={
                                            actionId
                                        }
                                        onInspect={() =>
                                            setSelectedAlert(
                                                alert
                                            )
                                        }
                                        onResolve={() =>
                                            updateAlertStatus(
                                                alert,
                                                !alert._resolved
                                            )
                                        }
                                    />
                                )
                            )
                        )}
                    </div>
                </section>

                {/* =================================================
                    FOOTER
                ================================================= */}

                <div className="alerts-footer-actions">
                    <Link
                        to="/dashboard"
                        className="alerts-back-link"
                    >
                        ← COMMAND CENTER
                    </Link>

                    <div>
                        <span>
                            {filteredAlerts.length}{" "}
                            events displayed
                        </span>

                        <span className="footer-separator">
                            /
                        </span>

                        <span>
                            AUTO SYNC 15S
                        </span>
                    </div>
                </div>
            </div>

            {/* =================================================
                DETAIL DRAWER
            ================================================= */}

            {selectedAlert && (
                <AlertDetailDrawer
                    alert={
                        selectedAlert
                    }
                    actionId={actionId}
                    onClose={() =>
                        setSelectedAlert(
                            null
                        )
                    }
                    onResolve={() =>
                        updateAlertStatus(
                            selectedAlert,
                            !selectedAlert._resolved
                        )
                    }
                />
            )}
        </AppShell>
    );
}

/*
 * ============================================================
 * STAT CARD
 * ============================================================
 */

function AlertStat({
    label,
    value,
    description,
    type,
}) {
    return (
        <article
            className={`alert-stat-card ${type}`}
        >
            <div className="alert-stat-top">
                <span>
                    {label}
                </span>

                <div
                    className={`alert-stat-icon ${type}`}
                >
                    {type === "critical"
                        ? "!"
                        : type ===
                          "warning"
                        ? "!"
                        : type === "low"
                        ? "·"
                        : "◉"}
                </div>
            </div>

            <strong>
                {value}
            </strong>

            <small>
                {description}
            </small>
        </article>
    );
}

/*
 * ============================================================
 * FILTER
 * ============================================================
 */

function FilterButton({
    active,
    onClick,
    children,
    danger = false,
}) {
    return (
        <button
            type="button"
            className={`alerts-filter ${
                active ? "active" : ""
            } ${
                danger ? "danger" : ""
            }`}
            onClick={onClick}
        >
            {children}
        </button>
    );
}

/*
 * ============================================================
 * CRITICAL ALERT
 * ============================================================
 */

function CriticalAlert({
    alert,
    actionId,
    onInspect,
    onResolve,
}) {
    return (
        <article className="critical-alert">
            <div className="critical-alert-marker">
                !
            </div>

            <div className="critical-alert-main">
                <div className="critical-alert-heading">
                    <div>
                        <span>
                            {alert._category}
                        </span>

                        <h3>
                            {alert._title}
                        </h3>
                    </div>

                    <strong>
                        CRITICAL
                    </strong>
                </div>

                <div className="critical-alert-meta">
                    <span>
                        {alert._animalName}
                    </span>

                    <span>
                        ID #
                        {alert._animalId ??
                            "—"}
                    </span>

                    <span>
                        {formatRelativeTime(
                            alert._timestamp
                        )}
                    </span>
                </div>
            </div>

            <div className="critical-alert-actions">
                <button
                    type="button"
                    onClick={onInspect}
                >
                    INSPECT
                </button>

                <button
                    type="button"
                    onClick={onResolve}
                    disabled={
                        actionId ===
                        alert._id
                    }
                >
                    {actionId ===
                    alert._id
                        ? "..."
                        : "RESOLVE"}
                </button>
            </div>
        </article>
    );
}

/*
 * ============================================================
 * ALERT ROW
 * ============================================================
 */

function AlertRow({
    alert,
    actionId,
    onInspect,
    onResolve,
}) {
    const severity =
        alert._severity;

    return (
        <article
            className={`alert-row ${severity} ${
                alert._resolved
                    ? "resolved"
                    : ""
            }`}
        >
            <div className="alert-row-severity">
                <span>
                    {severity ===
                    "critical"
                        ? "!"
                        : severity ===
                          "warning"
                        ? "!"
                        : severity ===
                          "low"
                        ? "·"
                        : "✓"}
                </span>

                <small>
                    {getSeverityLabel(
                        severity
                    )}
                </small>
            </div>

            <div className="alert-row-event">
                <strong>
                    {alert._title}
                </strong>

                <span>
                    {alert._category}
                </span>
            </div>

            <div className="alert-row-animal">
                <strong>
                    {alert._animalName}
                </strong>

                <span>
                    ID #
                    {alert._animalId ??
                        "—"}
                </span>
            </div>

            <div className="alert-row-time">
                <strong>
                    {formatRelativeTime(
                        alert._timestamp
                    )}
                </strong>

                <span>
                    {formatDate(
                        alert._timestamp
                    )}
                </span>
            </div>

            <div className="alert-row-status">
                <span
                    className={
                        alert._resolved
                            ? "status-resolved"
                            : "status-active"
                    }
                >
                    {alert._resolved
                        ? "RESOLVED"
                        : "ACTIVE"}
                </span>
            </div>

            <div className="alert-row-actions">
                <button
                    type="button"
                    onClick={onInspect}
                    aria-label="Inspect alert"
                >
                    →
                </button>
            </div>
        </article>
    );
}

/*
 * ============================================================
 * DETAIL DRAWER
 * ============================================================
 */

function AlertDetailDrawer({
    alert,
    actionId,
    onClose,
    onResolve,
}) {
    const severity =
        alert._severity;

    return (
        <div
            className="alert-drawer-overlay"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    onClose();
                }
            }}
        >
            <aside className="alert-drawer">
                <div className="alert-drawer-header">
                    <div>
                        <span className="alerts-eyebrow">
                            EVENT INSPECTION
                        </span>

                        <h2>
                            Alert details
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="alert-drawer-close"
                        onClick={onClose}
                        aria-label="Close alert details"
                    >
                        ×
                    </button>
                </div>

                <div
                    className={`alert-detail-severity ${severity}`}
                >
                    <span>
                        {severity ===
                        "critical"
                            ? "!"
                            : severity ===
                              "warning"
                            ? "!"
                            : "·"}
                    </span>

                    <div>
                        <strong>
                            {getSeverityLabel(
                                severity
                            )}
                        </strong>

                        <small>
                            {alert._resolved
                                ? "Event resolved"
                                : "Active operational event"}
                        </small>
                    </div>
                </div>

                <div className="alert-detail-title">
                    <span>
                        {alert._category}
                    </span>

                    <h3>
                        {alert._title}
                    </h3>
                </div>

                <div className="alert-detail-grid">
                    <DetailField
                        label="ANIMAL"
                        value={
                            alert._animalName
                        }
                    />

                    <DetailField
                        label="ANIMAL ID"
                        value={
                            alert._animalId
                                ? `#${alert._animalId}`
                                : "—"
                        }
                    />

                    <DetailField
                        label="SEVERITY"
                        value={getSeverityLabel(
                            severity
                        )}
                    />

                    <DetailField
                        label="STATUS"
                        value={
                            alert._resolved
                                ? "RESOLVED"
                                : "ACTIVE"
                        }
                    />

                    <DetailField
                        label="TIMESTAMP"
                        value={formatDate(
                            alert._timestamp
                        )}
                    />

                    <DetailField
                        label="AGE"
                        value={formatRelativeTime(
                            alert._timestamp
                        )}
                    />
                </div>

                <div className="alert-detail-message">
                    <span>
                        EVENT MESSAGE
                    </span>

                    <p>
                        {alert.message ||
                            alert.description ||
                            alert._title}
                    </p>
                </div>

                <div className="alert-detail-footer">
                    <button
                        type="button"
                        className="alert-detail-secondary"
                        onClick={onClose}
                    >
                        CLOSE
                    </button>

                    <button
                        type="button"
                        className={`alert-detail-primary ${severity}`}
                        onClick={onResolve}
                        disabled={
                            actionId ===
                            alert._id
                        }
                    >
                        {actionId ===
                        alert._id
                            ? "UPDATING..."
                            : alert._resolved
                            ? "REOPEN ALERT"
                            : "MARK RESOLVED"}
                    </button>
                </div>
            </aside>
        </div>
    );
}

function DetailField({
    label,
    value,
}) {
    return (
        <div className="alert-detail-field">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

/*
 * ============================================================
 * EMPTY STATE
 * ============================================================
 */

function EmptyAlerts({
    filter,
}) {
    let title =
        "No matching events";

    let description =
        "The alert stream contains no events matching the current operational filter.";

    if (
        filter === "unresolved"
    ) {
        title =
            "Response queue clear";

        description =
            "There are currently no unresolved alerts requiring operational attention.";
    }

    if (
        filter === "critical"
    ) {
        title =
            "No critical events";

        description =
            "No unresolved critical conditions are currently registered.";
    }

    if (
        filter === "warning"
    ) {
        title =
            "No warning events";

        description =
            "No unresolved warning conditions are currently registered.";
    }

    if (filter === "low") {
        title =
            "No low-priority events";

        description =
            "No unresolved low-priority conditions are currently registered.";
    }

    if (
        filter === "resolved"
    ) {
        title =
            "No resolved events";

        description =
            "There are no resolved alerts in the current event history.";
    }

    return (
        <div className="alerts-empty">
            <div className="alerts-empty-icon">
                ✓
            </div>

            <strong>
                {title}
            </strong>

            <span>
                {description}
            </span>
        </div>
    );
}