import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import AppShell from "../components/AppShell";
import api from "../api/api";

import "./HealthAnalytics.css";

/* ============================================================
   HELPERS
============================================================ */

function getNumber(...values) {
    for (const value of values) {
        if (
            value !== undefined &&
            value !== null &&
            value !== "" &&
            Number.isFinite(Number(value))
        ) {
            return Number(value);
        }
    }

    return 0;
}

function getAnimalId(animal) {
    return (
        animal?.id ??
        animal?.animal_id ??
        animal?.tag_id ??
        animal?.tagId ??
        null
    );
}

function getAnimalName(animal) {
    const id = getAnimalId(animal);

    return (
        animal?.name ??
        animal?.animal_name ??
        animal?.animalName ??
        (id !== null
            ? `Animal #${id}`
            : "Unknown animal")
    );
}

function getTemperature(reading) {
    return getNumber(
        reading?.temperature,
        reading?.body_temperature,
        reading?.bodyTemperature,
        reading?.temp
    );
}

function getHeartRate(reading) {
    return getNumber(
        reading?.heart_rate,
        reading?.heartRate,
        reading?.pulse
    );
}

function getActivity(reading) {
    return getNumber(
        reading?.activity,
        reading?.activity_level,
        reading?.activityLevel
    );
}

function getTimestamp(reading) {
    return (
        reading?.timestamp ??
        reading?.created_at ??
        reading?.createdAt ??
        reading?.recorded_at ??
        reading?.recordedAt
    );
}

function getHealthStatus(reading, animal) {
    const explicitStatus =
        reading?.health_status ??
        reading?.healthStatus ??
        reading?.status ??
        animal?.health_status ??
        animal?.healthStatus ??
        animal?.status;

    if (explicitStatus) {
        const normalized =
            String(explicitStatus).toLowerCase();

        if (normalized.includes("critical")) {
            return "critical";
        }

        if (
            normalized.includes("warning") ||
            normalized.includes("attention") ||
            normalized.includes("alert")
        ) {
            return "warning";
        }

        if (
            normalized.includes("healthy") ||
            normalized.includes("normal")
        ) {
            return "healthy";
        }
    }

    if (!reading) {
        return "healthy";
    }

    const temperature = getTemperature(reading);
    const heartRate = getHeartRate(reading);
    const activity = getActivity(reading);

    if (
        temperature >= 41 ||
        heartRate >= 140 ||
        (activity > 0 && activity <= 10)
    ) {
        return "critical";
    }

    if (
        temperature >= 40 ||
        heartRate >= 120 ||
        (activity > 0 && activity <= 25)
    ) {
        return "warning";
    }

    return "healthy";
}

/* ============================================================
   PAGE
============================================================ */

export default function HealthAnalytics() {
    const [animals, setAnimals] = useState([]);
    const [telemetry, setTelemetry] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadAnalytics = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const [
                animalsResponse,
                telemetryResponse,
            ] = await Promise.all([
                api.get("/animals/"),
                api.get("/telemetry/"),
            ]);

            const animalData =
                Array.isArray(animalsResponse?.data)
                    ? animalsResponse.data
                    : animalsResponse?.data?.items || [];

            const telemetryData =
                Array.isArray(telemetryResponse?.data)
                    ? telemetryResponse.data
                    : telemetryResponse?.data?.items || [];

            setAnimals(animalData);
            setTelemetry(telemetryData);
        } catch (err) {
            console.error(
                "Health analytics loading error:",
                err
            );

            setError(
                "Unable to load health analytics data."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    /* ========================================================
       LATEST TELEMETRY
    ======================================================== */

    const latestTelemetry = useMemo(() => {
        const map = new Map();

        telemetry.forEach((reading) => {
            const animalId =
                reading?.animal_id ??
                reading?.animalId ??
                reading?.animal?.id ??
                reading?.tag_id ??
                reading?.tagId;

            if (
                animalId === undefined ||
                animalId === null
            ) {
                return;
            }

            const key = String(animalId);

            const currentTimestamp = new Date(
                getTimestamp(reading) || 0
            ).getTime();

            const existing = map.get(key);

            const existingTimestamp = existing
                ? new Date(
                      getTimestamp(existing) || 0
                  ).getTime()
                : 0;

            if (
                !existing ||
                currentTimestamp >= existingTimestamp
            ) {
                map.set(key, reading);
            }
        });

        return map;
    }, [telemetry]);

    /* ========================================================
       ANALYTICS
    ======================================================== */

    const analytics = useMemo(() => {
        let healthy = 0;
        let warning = 0;
        let critical = 0;

        const temperatures = [];
        const heartRates = [];
        const activities = [];

        animals.forEach((animal) => {
            const id = getAnimalId(animal);

            const reading =
                latestTelemetry.get(
                    String(id)
                );

            const status =
                getHealthStatus(
                    reading,
                    animal
                );

            if (status === "critical") {
                critical += 1;
            } else if (status === "warning") {
                warning += 1;
            } else {
                healthy += 1;
            }

            if (reading) {
                const temperature =
                    getTemperature(reading);

                const heartRate =
                    getHeartRate(reading);

                const activity =
                    getActivity(reading);

                if (temperature > 0) {
                    temperatures.push(
                        temperature
                    );
                }

                if (heartRate > 0) {
                    heartRates.push(
                        heartRate
                    );
                }

                if (activity > 0) {
                    activities.push(
                        activity
                    );
                }
            }
        });

        const average = (values) => {
            if (!values.length) {
                return 0;
            }

            return (
                values.reduce(
                    (sum, value) =>
                        sum + value,
                    0
                ) / values.length
            );
        };

        return {
            total: animals.length,
            healthy,
            warning,
            critical,
            averageTemperature:
                average(temperatures),
            averageHeartRate:
                average(heartRates),
            averageActivity:
                average(activities),
        };
    }, [
        animals,
        latestTelemetry,
    ]);

    const healthPercentage =
        analytics.total > 0
            ? Math.round(
                  (analytics.healthy /
                      analytics.total) *
                      100
              )
            : 0;

    return (
        <AppShell>
            <div className="hs-analytics-page">

                <header className="hs-intelligence-header">

                    <div>
                        <div className="hs-page-kicker">
                            INTELLIGENCE
                        </div>

                        <h1>
                            Health Analytics
                        </h1>

                        <p>
                            Population-level health
                            trends, classifications
                            and telemetry-derived
                            analytics.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="hs-intelligence-refresh"
                        onClick={loadAnalytics}
                        disabled={loading}
                    >
                        ↻{" "}
                        {loading
                            ? "Loading"
                            : "Refresh"}
                    </button>

                </header>

                {error && (
                    <div className="hs-intelligence-error">
                        {error}
                    </div>
                )}

                <section className="hs-analytics-kpis">

                    <MetricCard
                        label="MONITORED ANIMALS"
                        value={analytics.total}
                        description="Registered population"
                    />

                    <MetricCard
                        label="HEALTHY"
                        value={analytics.healthy}
                        description={`${healthPercentage}% of population`}
                        type="healthy"
                    />

                    <MetricCard
                        label="WARNING"
                        value={analytics.warning}
                        description="Requires observation"
                        type="warning"
                    />

                    <MetricCard
                        label="CRITICAL"
                        value={analytics.critical}
                        description="Immediate attention"
                        type="critical"
                    />

                </section>

                <section className="hs-analytics-grid">

                    <div className="hs-intelligence-panel">

                        <div className="hs-panel-kicker">
                            POPULATION HEALTH
                        </div>

                        <h2>
                            Current health distribution
                        </h2>

                        <div className="hs-health-distribution">

                            <HealthDistribution
                                label="Healthy"
                                value={
                                    analytics.healthy
                                }
                                total={
                                    analytics.total
                                }
                                type="healthy"
                            />

                            <HealthDistribution
                                label="Warning"
                                value={
                                    analytics.warning
                                }
                                total={
                                    analytics.total
                                }
                                type="warning"
                            />

                            <HealthDistribution
                                label="Critical"
                                value={
                                    analytics.critical
                                }
                                total={
                                    analytics.total
                                }
                                type="critical"
                            />

                        </div>

                    </div>

                    <div className="hs-intelligence-panel">

                        <div className="hs-panel-kicker">
                            TELEMETRY SIGNALS
                        </div>

                        <h2>
                            Population averages
                        </h2>

                        <div className="hs-signal-grid">

                            <Signal
                                label="Temperature"
                                value={
                                    analytics.averageTemperature
                                        ? `${analytics.averageTemperature.toFixed(
                                              1
                                          )}°C`
                                        : "—"
                                }
                            />

                            <Signal
                                label="Heart rate"
                                value={
                                    analytics.averageHeartRate
                                        ? `${analytics.averageHeartRate.toFixed(
                                              0
                                          )} BPM`
                                        : "—"
                                }
                            />

                            <Signal
                                label="Activity"
                                value={
                                    analytics.averageActivity
                                        ? `${analytics.averageActivity.toFixed(
                                              0
                                          )}%`
                                        : "—"
                                }
                            />

                        </div>

                    </div>

                </section>

                <section className="hs-intelligence-panel">

                    <div className="hs-panel-kicker">
                        HEALTH CLASSIFICATION
                    </div>

                    <h2>
                        Monitored population
                    </h2>

                    {loading ? (
                        <div className="hs-intelligence-empty">
                            Loading health classifications...
                        </div>
                    ) : animals.length === 0 ? (
                        <div className="hs-intelligence-empty">
                            No registered animals available.
                        </div>
                    ) : (
                        <div className="hs-analytics-table-wrapper">

                            <table className="hs-analytics-table">

                                <thead>
                                    <tr>
                                        <th>ANIMAL</th>
                                        <th>TEMPERATURE</th>
                                        <th>HEART RATE</th>
                                        <th>ACTIVITY</th>
                                        <th>CLASSIFICATION</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {animals.map(
                                        (animal) => {
                                            const id =
                                                getAnimalId(
                                                    animal
                                                );

                                            const reading =
                                                latestTelemetry.get(
                                                    String(
                                                        id
                                                    )
                                                );

                                            const status =
                                                getHealthStatus(
                                                    reading,
                                                    animal
                                                );

                                            return (
                                                <tr
                                                    key={String(
                                                        id
                                                    )}
                                                >
                                                    <td>
                                                        <strong>
                                                            {getAnimalName(
                                                                animal
                                                            )}
                                                        </strong>

                                                        <small>
                                                            ID #
                                                            {id}
                                                        </small>
                                                    </td>

                                                    <td>
                                                        {reading
                                                            ? `${getTemperature(
                                                                  reading
                                                              ).toFixed(
                                                                  1
                                                              )}°C`
                                                            : "—"}
                                                    </td>

                                                    <td>
                                                        {reading
                                                            ? `${getHeartRate(
                                                                  reading
                                                              ).toFixed(
                                                                  0
                                                              )} BPM`
                                                            : "—"}
                                                    </td>

                                                    <td>
                                                        {reading
                                                            ? `${getActivity(
                                                                  reading
                                                              ).toFixed(
                                                                  0
                                                              )}%`
                                                            : "—"}
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`hs-health-status ${status}`}
                                                        >
                                                            <span />
                                                            {status
                                                                .charAt(
                                                                    0
                                                                )
                                                                .toUpperCase() +
                                                                status.slice(
                                                                    1
                                                                )}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    )}
                                </tbody>

                            </table>

                        </div>
                    )}

                </section>

            </div>
        </AppShell>
    );
}

/* ============================================================
   COMPONENTS
============================================================ */

function MetricCard({
    label,
    value,
    description,
    type = "",
}) {
    return (
        <div
            className={`hs-analytics-metric ${type}`}
        >
            <span>
                {label}
            </span>

            <strong>
                {value}
            </strong>

            <small>
                {description}
            </small>
        </div>
    );
}

function HealthDistribution({
    label,
    value,
    total,
    type,
}) {
    const percentage =
        total > 0
            ? Math.round(
                  (value / total) *
                      100
              )
            : 0;

    return (
        <div className="hs-distribution-row">

            <div className="hs-distribution-label">
                <span className={`dot ${type}`} />

                <strong>
                    {label}
                </strong>

                <span>
                    {value}
                </span>
            </div>

            <div className="hs-distribution-track">
                <div
                    className={`hs-distribution-fill ${type}`}
                    style={{
                        width: `${percentage}%`,
                    }}
                />
            </div>

            <small>
                {percentage}%
            </small>

        </div>
    );
}

function Signal({
    label,
    value,
}) {
    return (
        <div className="hs-signal">

            <span>
                {label}
            </span>

            <strong>
                {value}
            </strong>

        </div>
    );
}