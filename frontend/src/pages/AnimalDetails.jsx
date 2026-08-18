import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import api from "../api/api";
import "./AnimalDetails.css";

const REFRESH_INTERVAL = 15000;

const THRESHOLDS = {
    temperatureCritical: 41,
    temperatureWarning: 39.5,
    heartRateCritical: 140,
    heartRateWarning: 120,
    activityCritical: 10,
    activityWarning: 25,
};

function firstDefined(...values) {
    return values.find(
        (value) =>
            value !== undefined &&
            value !== null &&
            value !== ""
    );
}

function normalizeArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
}

function number(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function format(value, decimals = 0) {
    const n = Number(value);

    if (!Number.isFinite(n)) return "0";

    return n.toFixed(decimals);
}

function dateFormat(value) {
    if (!value) return "No signal";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString();
}

function getAnimalId(animal) {
    return firstDefined(
        animal?.id,
        animal?.animal_id,
        animal?.animalId
    );
}

function getName(animal) {
    return (
        firstDefined(
            animal?.name,
            animal?.animal_name,
            animal?.animalName,
            animal?.tag_name,
            animal?.tagName
        ) ||
        `Animal #${getAnimalId(animal) ?? "—"}`
    );
}

function getTemperature(animal, telemetry) {
    return number(
        firstDefined(
            telemetry?.temperature,
            telemetry?.body_temperature,
            telemetry?.bodyTemperature,
            telemetry?.temp,
            animal?.temperature,
            animal?.body_temperature,
            animal?.bodyTemperature
        )
    );
}

function getHeartRate(animal, telemetry) {
    return number(
        firstDefined(
            telemetry?.heart_rate,
            telemetry?.heartRate,
            animal?.heart_rate,
            animal?.heartRate
        )
    );
}

function getActivity(animal, telemetry) {
    return number(
        firstDefined(
            telemetry?.activity,
            telemetry?.activity_level,
            telemetry?.activityLevel,
            animal?.activity,
            animal?.activity_level,
            animal?.activityLevel
        )
    );
}

function getBattery(animal, telemetry) {
    return number(
        firstDefined(
            telemetry?.battery,
            telemetry?.battery_level,
            telemetry?.batteryLevel,
            animal?.battery,
            animal?.battery_level,
            animal?.batteryLevel
        )
    );
}

function getLatitude(animal, telemetry) {
    return firstDefined(
        telemetry?.latitude,
        telemetry?.lat,
        animal?.latitude,
        animal?.lat
    );
}

function getLongitude(animal, telemetry) {
    return firstDefined(
        telemetry?.longitude,
        telemetry?.lng,
        telemetry?.lon,
        animal?.longitude,
        animal?.lng,
        animal?.lon
    );
}

function getTimestamp(item) {
    return firstDefined(
        item?.recorded_at,
        item?.timestamp,
        item?.created_at,
        item?.createdAt,
        item?.time
    );
}

function getStatus(animal, telemetry) {
    const temperature = getTemperature(
        animal,
        telemetry
    );

    const heartRate = getHeartRate(
        animal,
        telemetry
    );

    const activity = getActivity(
        animal,
        telemetry
    );

    if (
        temperature >=
            THRESHOLDS.temperatureCritical ||
        heartRate >=
            THRESHOLDS.heartRateCritical ||
        activity <=
            THRESHOLDS.activityCritical
    ) {
        return "critical";
    }

    if (
        temperature >=
            THRESHOLDS.temperatureWarning ||
        heartRate >=
            THRESHOLDS.heartRateWarning ||
        activity <=
            THRESHOLDS.activityWarning
    ) {
        return "warning";
    }

    return "healthy";
}

function StatusBadge({ status }) {
    const labels = {
        healthy: "Healthy",
        warning: "Warning",
        critical: "Critical",
    };

    return (
        <span
            className={`animal-detail-status ${status}`}
        >
            <span className="status-dot" />
            {labels[status] || "Unknown"}
        </span>
    );
}

function MetricCard({
    label,
    value,
    unit,
    status = "normal",
    description,
}) {
    return (
        <div className="animal-metric-card">
            <span className="animal-metric-label">
                {label}
            </span>

            <div className="animal-metric-value-row">
                <strong className={status}>
                    {value}
                </strong>

                {unit && (
                    <span className="animal-metric-unit">
                        {unit}
                    </span>
                )}
            </div>

            {description && (
                <span className="animal-metric-description">
                    {description}
                </span>
            )}
        </div>
    );
}

function SignalBar({
    label,
    value,
    unit,
    max,
    status,
}) {
    const percentage = Math.max(
        0,
        Math.min(
            100,
            (Number(value) / max) * 100
        )
    );

    return (
        <div className="signal-row">
            <div className="signal-row-header">
                <span>{label}</span>

                <strong className={status}>
                    {format(value, 1)}
                    {unit}
                </strong>
            </div>

            <div className="signal-track">
                <div
                    className={`signal-fill ${status}`}
                    style={{
                        width: `${percentage}%`,
                    }}
                />
            </div>
        </div>
    );
}

export default function AnimalDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [animal, setAnimal] =
        useState(null);

    const [telemetry, setTelemetry] =
        useState([]);

    const [alerts, setAlerts] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [apiOnline, setApiOnline] =
        useState(false);

    const [error, setError] =
        useState("");

    const loadData = useCallback(
        async (isRefresh = false) => {
            const token =
                localStorage.getItem(
                    "access_token"
                );

            if (!token) {
                navigate("/login", {
                    replace: true,
                });

                return;
            }

            try {
                if (isRefresh) {
                    setRefreshing(true);
                } else {
                    setLoading(true);
                }

                setError("");

                const config = {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                };

                const [
                    animalsResponse,
                    telemetryResponse,
                    alertsResponse,
                ] =
                    await Promise.allSettled([
                        api.get(
                            "/animals/",
                            config
                        ),

                        api.get(
                            "/telemetry/",
                            config
                        ),

                        api.get(
                            "/alerts/",
                            config
                        ),
                    ]);

                const unauthorized = [
                    animalsResponse,
                    telemetryResponse,
                    alertsResponse,
                ].some(
                    (result) =>
                        result.status ===
                            "rejected" &&
                        result.reason?.response
                            ?.status === 401
                );

                if (unauthorized) {
                    localStorage.removeItem(
                        "access_token"
                    );

                    navigate("/login", {
                        replace: true,
                    });

                    return;
                }

                if (
                    animalsResponse.status ===
                    "fulfilled"
                ) {
                    const allAnimals =
                        normalizeArray(
                            animalsResponse
                                .value.data
                        );

                    const found =
                        allAnimals.find(
                            (item) =>
                                String(
                                    getAnimalId(
                                        item
                                    )
                                ) ===
                                String(id)
                        );

                    setAnimal(found || null);
                }

                if (
                    telemetryResponse.status ===
                    "fulfilled"
                ) {
                    const allTelemetry =
                        normalizeArray(
                            telemetryResponse
                                .value.data
                        );

                    const animalTelemetry =
                        allTelemetry
                            .filter(
                                (item) => {
                                    const telemetryAnimalId =
                                        firstDefined(
                                            item?.animal_id,
                                            item?.animalId,
                                            item?.animal?.id
                                        );

                                    return (
                                        String(
                                            telemetryAnimalId
                                        ) ===
                                        String(id)
                                    );
                                }
                            )
                            .sort(
                                (a, b) => {
                                    const dateA =
                                        new Date(
                                            getTimestamp(
                                                a
                                            ) || 0
                                        ).getTime();

                                    const dateB =
                                        new Date(
                                            getTimestamp(
                                                b
                                            ) || 0
                                        ).getTime();

                                    return (
                                        dateB -
                                        dateA
                                    );
                                }
                            );

                    setTelemetry(
                        animalTelemetry
                    );
                }

                if (
                    alertsResponse.status ===
                    "fulfilled"
                ) {
                    const allAlerts =
                        normalizeArray(
                            alertsResponse
                                .value.data
                        );

                    const animalAlerts =
                        allAlerts.filter(
                            (item) => {
                                const alertAnimalId =
                                    firstDefined(
                                        item?.animal_id,
                                        item?.animalId,
                                        item?.animal?.id
                                    );

                                return (
                                    String(
                                        alertAnimalId
                                    ) ===
                                    String(id)
                                );
                            }
                        );

                    setAlerts(
                        animalAlerts
                    );
                }

                setApiOnline(true);
            } catch (err) {
                console.error(
                    "Animal detail error:",
                    err
                );

                if (
                    err?.response?.status ===
                    401
                ) {
                    localStorage.removeItem(
                        "access_token"
                    );

                    navigate("/login", {
                        replace: true,
                    });

                    return;
                }

                setApiOnline(false);

                setError(
                    "Unable to load this animal's intelligence data."
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [id, navigate]
    );

    useEffect(() => {
        loadData();

        const interval =
            setInterval(() => {
                loadData(true);
            }, REFRESH_INTERVAL);

        return () =>
            clearInterval(interval);
    }, [loadData]);

    const latestTelemetry =
        telemetry[0] || {};

    const metrics = useMemo(() => {
        const temperature =
            getTemperature(
                animal,
                latestTelemetry
            );

        const heartRate =
            getHeartRate(
                animal,
                latestTelemetry
            );

        const activity =
            getActivity(
                animal,
                latestTelemetry
            );

        const battery =
            getBattery(
                animal,
                latestTelemetry
            );

        return {
            temperature,
            heartRate,
            activity,
            battery,

            temperatureStatus:
                temperature >=
                THRESHOLDS.temperatureCritical
                    ? "critical"
                    : temperature >=
                      THRESHOLDS.temperatureWarning
                    ? "warning"
                    : "healthy",

            heartRateStatus:
                heartRate >=
                THRESHOLDS.heartRateCritical
                    ? "critical"
                    : heartRate >=
                      THRESHOLDS.heartRateWarning
                    ? "warning"
                    : "healthy",

            activityStatus:
                activity <=
                THRESHOLDS.activityCritical
                    ? "critical"
                    : activity <=
                      THRESHOLDS.activityWarning
                    ? "warning"
                    : "healthy",

            batteryStatus:
                battery <= 20
                    ? "critical"
                    : battery <= 35
                    ? "warning"
                    : "healthy",
        };
    }, [animal, latestTelemetry]);

    const status = useMemo(
        () =>
            getStatus(
                animal,
                latestTelemetry
            ),
        [animal, latestTelemetry]
    );

    const latitude = getLatitude(
        animal,
        latestTelemetry
    );

    const longitude = getLongitude(
        animal,
        latestTelemetry
    );

    const recentTelemetry =
        telemetry.slice(0, 8);

    if (loading) {
        return (
            <AppShell>
                <div className="animal-detail-loading">
                    <div>HS</div>

                    <strong>
                        Loading animal intelligence...
                    </strong>

                    <span>
                        Connecting to live telemetry
                    </span>
                </div>
            </AppShell>
        );
    }

    if (!animal) {
        return (
            <AppShell>
                <div className="animal-not-found">
                    <div className="animal-not-found-icon">
                        ?
                    </div>

                    <h1>
                        Animal not found
                    </h1>

                    <p>
                        No registered animal with
                        ID #{id} could be found.
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/animals"
                            )
                        }
                    >
                        ← Back to Animals
                    </button>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="animal-detail-page">

                {/* HEADER */}

                <div className="animal-detail-topbar">

                    <button
                        type="button"
                        className="animal-back-button"
                        onClick={() =>
                            navigate(
                                "/animals"
                            )
                        }
                    >
                        ← Animals
                    </button>

                    <div className="animal-detail-actions">

                        <div
                            className={`animal-api-indicator ${
                                apiOnline
                                    ? "online"
                                    : "offline"
                            }`}
                        >
                            <span />
                            {apiOnline
                                ? "LIVE"
                                : "OFFLINE"}
                        </div>

                        <button
                            type="button"
                            className="animal-refresh"
                            onClick={() =>
                                loadData(true)
                            }
                            disabled={
                                refreshing
                            }
                        >
                            ↻{" "}
                            {refreshing
                                ? "Refreshing"
                                : "Refresh"}
                        </button>

                    </div>

                </div>

                {error && (
                    <div className="animal-detail-error">
                        {error}
                    </div>
                )}

                {/* HERO */}

                <section className="animal-profile-hero">

                    <div className="animal-profile-identity">

                        <div className="animal-profile-avatar">
                            {getName(
                                animal
                            )
                                .charAt(0)
                                .toUpperCase()}
                        </div>

                        <div>
                            <span className="animal-profile-eyebrow">
                                ANIMAL INTELLIGENCE
                            </span>

                            <h1>
                                {getName(
                                    animal
                                )}
                            </h1>

                            <p>
                                Animal #
                                {getAnimalId(
                                    animal
                                )}
                                {" · "}
                                {firstDefined(
                                    animal?.species,
                                    animal?.type,
                                    "Livestock"
                                )}
                            </p>
                        </div>

                    </div>

                    <div className="animal-profile-status">

                        <span>
                            CURRENT CONDITION
                        </span>

                        <StatusBadge
                            status={status}
                        />

                    </div>

                </section>

                {/* PRIMARY METRICS */}

                <section className="animal-primary-metrics">

                    <MetricCard
                        label="BODY TEMPERATURE"
                        value={format(
                            metrics.temperature,
                            1
                        )}
                        unit="°C"
                        status={
                            metrics.temperatureStatus
                        }
                        description={
                            metrics.temperatureStatus ===
                            "critical"
                                ? "Critical temperature"
                                : "Current body temperature"
                        }
                    />

                    <MetricCard
                        label="HEART RATE"
                        value={format(
                            metrics.heartRate
                        )}
                        unit="BPM"
                        status={
                            metrics.heartRateStatus
                        }
                        description={
                            metrics.heartRateStatus ===
                            "critical"
                                ? "Elevated heart rate"
                                : "Current heart rate"
                        }
                    />

                    <MetricCard
                        label="ACTIVITY"
                        value={format(
                            metrics.activity
                        )}
                        unit="%"
                        status={
                            metrics.activityStatus
                        }
                        description={
                            metrics.activityStatus ===
                            "critical"
                                ? "Very low activity"
                                : "Current activity level"
                        }
                    />

                    <MetricCard
                        label="BATTERY"
                        value={format(
                            metrics.battery
                        )}
                        unit="%"
                        status={
                            metrics.batteryStatus
                        }
                        description="Device battery"
                    />

                </section>

                {/* SECONDARY GRID */}

                <section className="animal-intelligence-grid">

                    {/* SIGNAL ANALYSIS */}

                    <div className="animal-section-card">

                        <div className="animal-section-header">

                            <div>
                                <span>
                                    HEALTH SIGNALS
                                </span>

                                <h2>
                                    Current readings
                                </h2>
                            </div>

                            <div className="signal-live">
                                <span />
                                LIVE
                            </div>

                        </div>

                        <div className="signal-list">

                            <SignalBar
                                label="Temperature"
                                value={
                                    metrics.temperature
                                }
                                unit="°C"
                                max={45}
                                status={
                                    metrics.temperatureStatus
                                }
                            />

                            <SignalBar
                                label="Heart rate"
                                value={
                                    metrics.heartRate
                                }
                                unit=" BPM"
                                max={180}
                                status={
                                    metrics.heartRateStatus
                                }
                            />

                            <SignalBar
                                label="Activity"
                                value={
                                    metrics.activity
                                }
                                unit="%"
                                max={100}
                                status={
                                    metrics.activityStatus
                                }
                            />

                            <SignalBar
                                label="Battery"
                                value={
                                    metrics.battery
                                }
                                unit="%"
                                max={100}
                                status={
                                    metrics.batteryStatus
                                }
                            />

                        </div>

                    </div>

                    {/* LOCATION */}

                    <div className="animal-section-card">

                        <div className="animal-section-header">

                            <div>
                                <span>
                                    LOCATION
                                </span>

                                <h2>
                                    GPS position
                                </h2>
                            </div>

                            <span className="gps-live">
                                GPS
                            </span>

                        </div>

                        <div className="animal-gps-display">

                            <div className="gps-icon">
                                ⌖
                            </div>

                            <strong>
                                {latitude !==
                                    undefined &&
                                longitude !==
                                    undefined
                                    ? `${latitude}, ${longitude}`
                                    : "GPS unavailable"}
                            </strong>

                            <span>
                                Latest known position
                            </span>

                        </div>

                        <div className="animal-last-signal">

                            <span>
                                LAST SIGNAL
                            </span>

                            <strong>
                                {dateFormat(
                                    getTimestamp(
                                        latestTelemetry
                                    )
                                )}
                            </strong>

                        </div>

                    </div>

                </section>

                {/* TELEMETRY HISTORY */}

                <section className="animal-section-card animal-history-card">

                    <div className="animal-section-header">

                        <div>
                            <span>
                                TELEMETRY
                            </span>

                            <h2>
                                Recent sensor history
                            </h2>
                        </div>

                        <span className="history-count">
                            {telemetry.length} readings
                        </span>

                    </div>

                    <div className="animal-history-table">

                        <div className="animal-history-head">
                            <span>
                                TIME
                            </span>

                            <span>
                                TEMPERATURE
                            </span>

                            <span>
                                HEART RATE
                            </span>

                            <span>
                                ACTIVITY
                            </span>

                            <span>
                                BATTERY
                            </span>
                        </div>

                        {recentTelemetry.length ===
                        0 ? (
                            <div className="animal-history-empty">
                                No telemetry history
                                available.
                            </div>
                        ) : (
                            recentTelemetry.map(
                                (reading, index) => (
                                    <div
                                        className="animal-history-row"
                                        key={
                                            reading?.id ??
                                            index
                                        }
                                    >
                                        <span>
                                            {dateFormat(
                                                getTimestamp(
                                                    reading
                                                )
                                            )}
                                        </span>

                                        <strong>
                                            {format(
                                                getTemperature(
                                                    animal,
                                                    reading
                                                ),
                                                1
                                            )}
                                            °C
                                        </strong>

                                        <strong>
                                            {format(
                                                getHeartRate(
                                                    animal,
                                                    reading
                                                )
                                            )}
                                            BPM
                                        </strong>

                                        <strong>
                                            {format(
                                                getActivity(
                                                    animal,
                                                    reading
                                                )
                                            )}
                                            %
                                        </strong>

                                        <strong>
                                            {format(
                                                getBattery(
                                                    animal,
                                                    reading
                                                )
                                            )}
                                            %
                                        </strong>
                                    </div>
                                )
                            )
                        )}

                    </div>

                </section>

                {/* ALERT HISTORY */}

                <section className="animal-section-card animal-alert-card">

                    <div className="animal-section-header">

                        <div>
                            <span>
                                ALERT CENTER
                            </span>

                            <h2>
                                Recent events
                            </h2>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    "/alerts"
                                )
                            }
                        >
                            View all →
                        </button>

                    </div>

                    {alerts.length ===
                    0 ? (
                        <div className="animal-clear-state">
                            <div>
                                ✓
                            </div>

                            <strong>
                                No recorded alerts
                            </strong>

                            <span>
                                This animal has no
                                alert history available.
                            </span>
                        </div>
                    ) : (
                        <div className="animal-alert-list">

                            {alerts
                                .slice(0, 6)
                                .map(
                                    (
                                        alert,
                                        index
                                    ) => {
                                        const severity =
                                            String(
                                                firstDefined(
                                                    alert?.severity,
                                                    alert?.level,
                                                    alert?.status,
                                                    "warning"
                                                )
                                            ).toLowerCase();

                                        return (
                                            <div
                                                className={`animal-alert-item ${severity}`}
                                                key={
                                                    alert?.id ??
                                                    index
                                                }
                                            >
                                                <div className="animal-alert-indicator">
                                                    {severity ===
                                                    "critical"
                                                        ? "!"
                                                        : severity ===
                                                          "warning"
                                                        ? "!"
                                                        : "✓"}
                                                </div>

                                                <div className="animal-alert-content">

                                                    <strong>
                                                        {firstDefined(
                                                            alert?.message,
                                                            alert?.title,
                                                            alert?.description,
                                                            "Animal health event"
                                                        )}
                                                    </strong>

                                                    <span>
                                                        {dateFormat(
                                                            firstDefined(
                                                                alert?.created_at,
                                                                alert?.createdAt,
                                                                alert?.timestamp
                                                            )
                                                        )}
                                                    </span>

                                                </div>

                                                <span className="animal-alert-severity">
                                                    {severity}
                                                </span>
                                            </div>
                                        );
                                    }
                                )}

                        </div>
                    )}

                </section>

                <footer className="animal-detail-footer">
                    HerdSense AI
                    <span>
                        Livestock intelligence platform
                    </span>
                    <span>
                        © 2026
                    </span>
                </footer>

            </div>
        </AppShell>
    );
}