/*
|--------------------------------------------------------------------------
| HERDSENSE AI — COMMAND CENTER DASHBOARD
|--------------------------------------------------------------------------
| Production dashboard
|
| Responsibilities:
| - Registered animal population
| - Live telemetry
| - Health classification
| - Alert intelligence
| - WebSocket synchronization
| - Dashboard KPIs
| - Live GPS monitoring
|
| IMPORTANT:
| Disease-risk intelligence is NOT requested from this page.
| Animal-specific disease prediction belongs to:
|
| /api/v1/intelligence/animal/{animal_id}/disease-risk
|--------------------------------------------------------------------------
*/

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { useNavigate } from "react-router-dom";

import AppShell from "../components/AppShell";
import MapView from "../components/Map/MapView";
import api from "../api/api";
import useTelemetrySocket from "../hooks/useTelemetrySocket";

import "./Dashboard.css";

/* ==========================================================================
   CONFIGURATION
========================================================================== */

const REFRESH_INTERVAL = 30000;

/* ==========================================================================
   SAFE HELPERS
========================================================================== */

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

function getAnimalId(animal, reading) {
    return (
        animal?.id ??
        animal?.animal_id ??
        animal?.tag_id ??
        animal?.tagId ??
        reading?.animal_id ??
        reading?.animalId ??
        reading?.tag_id ??
        reading?.tagId ??
        reading?.animal?.id ??
        null
    );
}

function getAnimalName(animal, reading) {
    const id = getAnimalId(
        animal,
        reading
    );

    return (
        animal?.name ??
        animal?.animal_name ??
        animal?.animalName ??
        reading?.animal_name ??
        reading?.animalName ??
        reading?.animal?.name ??
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

function getBattery(reading) {
    return getNumber(
        reading?.battery,
        reading?.battery_level,
        reading?.batteryLevel
    );
}

function getLatitude(reading) {
    return (
        reading?.latitude ??
        reading?.lat ??
        reading?.gps_latitude ??
        reading?.gps_lat ??
        reading?.gps?.latitude ??
        reading?.gps?.lat ??
        reading?.location?.latitude ??
        reading?.location?.lat ??
        reading?.position?.latitude ??
        reading?.position?.lat
    );
}

function getLongitude(reading) {
    return (
        reading?.longitude ??
        reading?.lng ??
        reading?.lon ??
        reading?.gps_longitude ??
        reading?.gps_lng ??
        reading?.gps_lon ??
        reading?.gps?.longitude ??
        reading?.gps?.lng ??
        reading?.gps?.lon ??
        reading?.location?.longitude ??
        reading?.location?.lng ??
        reading?.location?.lon ??
        reading?.position?.longitude ??
        reading?.position?.lng ??
        reading?.position?.lon
    );
}

function getTimestamp(reading) {
    return (
        reading?.timestamp ??
        reading?.created_at ??
        reading?.createdAt ??
        reading?.recorded_at ??
        reading?.recordedAt ??
        reading?.time
    );
}

function getTimestampMs(reading) {
    const timestamp =
        getTimestamp(reading);

    if (!timestamp) {
        return 0;
    }

    const parsed =
        new Date(
            timestamp
        ).getTime();

    return Number.isFinite(
        parsed
    )
        ? parsed
        : 0;
}

function formatDate(value) {
    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value);
    }

    return date.toLocaleString();
}

function getTelemetryAnimalId(reading) {
    return (
        reading?.animal_id ??
        reading?.animalId ??
        reading?.animal?.id ??
        reading?.tag_id ??
        reading?.tagId ??
        null
    );
}

/* ==========================================================================
   TELEMETRY MERGE ENGINE
========================================================================== */

function mergeLatestTelemetry(
    existingReadings,
    incomingReadings
) {
    const map = new Map();

    const existingArray =
        Array.isArray(
            existingReadings
        )
            ? existingReadings
            : [];

    const incomingArray =
        Array.isArray(
            incomingReadings
        )
            ? incomingReadings
            : [];

    [
        ...existingArray,
        ...incomingArray,
    ].forEach(
        (reading) => {
            if (!reading) {
                return;
            }

            const animalId =
                getTelemetryAnimalId(
                    reading
                );

            if (
                animalId ===
                    undefined ||
                animalId ===
                    null
            ) {
                return;
            }

            const key =
                String(
                    animalId
                );

            const existing =
                map.get(key);

            if (!existing) {
                map.set(
                    key,
                    reading
                );

                return;
            }

            const existingTime =
                getTimestampMs(
                    existing
                );

            const incomingTime =
                getTimestampMs(
                    reading
                );

            if (
                incomingTime >=
                existingTime
            ) {
                map.set(
                    key,
                    reading
                );
            }
        }
    );

    return Array.from(
        map.values()
    );
}

function replaceLatestTelemetry(
    existingReadings,
    liveReading
) {
    if (!liveReading) {
        return existingReadings;
    }

    const animalId =
        getTelemetryAnimalId(
            liveReading
        );

    if (
        animalId ===
            undefined ||
        animalId === null
    ) {
        return existingReadings;
    }

    const key =
        String(
            animalId
        );

    const current =
        Array.isArray(
            existingReadings
        )
            ? existingReadings
            : [];

    const existingIndex =
        current.findIndex(
            (reading) =>
                String(
                    getTelemetryAnimalId(
                        reading
                    )
                ) === key
        );

    if (
        existingIndex === -1
    ) {
        return [
            liveReading,
            ...current,
        ];
    }

    const existing =
        current[
            existingIndex
        ];

    const existingTime =
        getTimestampMs(
            existing
        );

    const incomingTime =
        getTimestampMs(
            liveReading
        );

    if (
        incomingTime > 0 &&
        existingTime > 0 &&
        incomingTime <
            existingTime
    ) {
        return current;
    }

    const updated =
        [...current];

    updated[
        existingIndex
    ] = liveReading;

    return updated;
}

/* ==========================================================================
   ALERT HELPERS
========================================================================== */

function getAlertSeverity(alert) {
    const severity =
        String(
            alert?.severity ??
                alert?.level ??
                alert?.priority ??
                alert?.status ??
                "warning"
        ).toLowerCase();

    if (
        severity.includes(
            "critical"
        )
    ) {
        return "critical";
    }

    if (
        severity.includes(
            "warning"
        ) ||
        severity.includes(
            "attention"
        ) ||
        severity.includes(
            "alert"
        )
    ) {
        return "warning";
    }

    return "healthy";
}

function isAlertResolved(alert) {
    const status =
        String(
            alert?.status ??
                alert?.state ??
                alert?.resolution_status ??
                ""
        ).toLowerCase();

    return (
        status.includes(
            "resolved"
        ) ||
        status.includes(
            "closed"
        )
    );
}

/* ==========================================================================
   HEALTH ENGINE
========================================================================== */

function getHealthStatus(
    reading,
    animal
) {
    const explicitStatus =
        reading?.health_status ??
        reading?.healthStatus ??
        reading?.status ??
        animal?.health_status ??
        animal?.healthStatus ??
        animal?.status;

    if (explicitStatus) {
        const normalized =
            String(
                explicitStatus
            ).toLowerCase();

        if (
            normalized.includes(
                "critical"
            )
        ) {
            return "critical";
        }

        if (
            normalized.includes(
                "warning"
            ) ||
            normalized.includes(
                "attention"
            ) ||
            normalized.includes(
                "alert"
            )
        ) {
            return "warning";
        }

        if (
            normalized.includes(
                "healthy"
            ) ||
            normalized.includes(
                "normal"
            )
        ) {
            return "healthy";
        }
    }

    if (!reading) {
        return "healthy";
    }

    const temperature =
        getTemperature(
            reading
        );

    const heartRate =
        getHeartRate(
            reading
        );

    const activity =
        getActivity(
            reading
        );

    if (
        temperature >= 41 ||
        heartRate >= 140 ||
        (
            activity > 0 &&
            activity <= 10
        )
    ) {
        return "critical";
    }

    if (
        temperature >= 40 ||
        heartRate >= 120 ||
        (
            activity > 0 &&
            activity <= 25
        )
    ) {
        return "warning";
    }

    return "healthy";
}

/* ==========================================================================
   MAIN DASHBOARD
========================================================================== */

export default function Dashboard() {
    const navigate =
        useNavigate();

    /* ======================================================================
       STATE
    ====================================================================== */

    const [
        dashboard,
        setDashboard,
    ] = useState(null);

    const [
        animals,
        setAnimals,
    ] = useState([]);

    const [
        telemetry,
        setTelemetry,
    ] = useState([]);

    const [
        alerts,
        setAlerts,
    ] = useState([]);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        refreshing,
        setRefreshing,
    ] = useState(false);

    const [
        apiOnline,
        setApiOnline,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState("");

    /*
     * Reference to the live map section.
     *
     * The dashboard's LIVE MAP button uses this
     * reference to bring the map into view without
     * requiring a separate /map route.
     */

    const mapSectionRef =
        useRef(null);

    const telemetryRef =
        useRef([]);

    const dashboardRequestRef =
        useRef(0);

    /* ======================================================================
       LIVE TELEMETRY
    ====================================================================== */

    const handleLiveTelemetry =
        useCallback(
            (liveTelemetry) => {
                if (
                    !liveTelemetry
                ) {
                    return;
                }

                console.log(
                    "📡 Dashboard live telemetry:",
                    liveTelemetry
                );

                const incomingAnimalId =
                    getTelemetryAnimalId(
                        liveTelemetry
                    );

                if (
                    incomingAnimalId ===
                        undefined ||
                    incomingAnimalId ===
                        null
                ) {
                    return;
                }

                setTelemetry(
                    (current) => {
                        const updated =
                            replaceLatestTelemetry(
                                current,
                                liveTelemetry
                            );

                        telemetryRef.current =
                            updated;

                        return updated;
                    }
                );

                setApiOnline(
                    true
                );

                setError("");
            },
            []
        );

    const {
        connected:
            websocketConnected,
    } =
        useTelemetrySocket(
            handleLiveTelemetry
        );

    /* ======================================================================
       LOAD DASHBOARD
    ====================================================================== */

    const loadDashboard =
        useCallback(
            async (
                manualRefresh = false
            ) => {
                const requestId =
                    ++dashboardRequestRef.current;

                if (
                    manualRefresh
                ) {
                    setRefreshing(
                        true
                    );
                } else {
                    setLoading(
                        true
                    );
                }

                setError("");

                try {
                    const [
                        dashboardResponse,
                        animalsResponse,
                        telemetryResponse,
                        alertsResponse,
                    ] =
                        await Promise.all(
                            [
                                api.get(
                                    "/dashboard/"
                                ),
                                api.get(
                                    "/animals/"
                                ),
                                api.get(
                                    "/telemetry/"
                                ),
                                api.get(
                                    "/alerts/"
                                ),
                            ]
                        );

                    if (
                        requestId !==
                        dashboardRequestRef.current
                    ) {
                        return;
                    }

                    const dashboardData =
                        dashboardResponse?.data ||
                        {};

                    const animalData =
                        Array.isArray(
                            animalsResponse?.data
                        )
                            ? animalsResponse.data
                            : animalsResponse
                                  ?.data
                                  ?.items ||
                              [];

                    const telemetryData =
                        Array.isArray(
                            telemetryResponse?.data
                        )
                            ? telemetryResponse.data
                            : telemetryResponse
                                  ?.data
                                  ?.items ||
                              [];

                    const alertData =
                        Array.isArray(
                            alertsResponse?.data
                        )
                            ? alertsResponse.data
                            : alertsResponse
                                  ?.data
                                  ?.items ||
                              [];

                    const mergedTelemetry =
                        mergeLatestTelemetry(
                            telemetryRef.current,
                            telemetryData
                        );

                    telemetryRef.current =
                        mergedTelemetry;

                    setDashboard(
                        dashboardData
                    );

                    setAnimals(
                        animalData
                    );

                    setTelemetry(
                        mergedTelemetry
                    );

                    setAlerts(
                        alertData
                    );

                    setApiOnline(
                        true
                    );
                } catch (
                    err
                ) {
                    console.error(
                        "Dashboard loading error:",
                        err
                    );

                    if (
                        err?.response
                            ?.status ===
                        401
                    ) {
                        localStorage.removeItem(
                            "access_token"
                        );

                        navigate(
                            "/login",
                            {
                                replace:
                                    true,
                            }
                        );

                        return;
                    }

                    setApiOnline(
                        false
                    );

                    setError(
                        "Unable to load live dashboard data. Check that the API is running."
                    );
                } finally {
                    setLoading(
                        false
                    );

                    setRefreshing(
                        false
                    );
                }
            },
            [navigate]
        );

    /* ======================================================================
       INITIAL LOAD
    ====================================================================== */

    useEffect(() => {
        loadDashboard(
            false
        );

        const interval =
            setInterval(
                () => {
                    loadDashboard(
                        true
                    );
                },
                REFRESH_INTERVAL
            );

        return () => {
            clearInterval(
                interval
            );
        };
    }, [
        loadDashboard,
    ]);

    /* ======================================================================
       REGISTERED ANIMAL MAP
    ====================================================================== */

    const animalMap =
        useMemo(() => {
            const map =
                new Map();

            animals.forEach(
                (animal) => {
                    const id =
                        getAnimalId(
                            animal,
                            null
                        );

                    if (
                        id !==
                            undefined &&
                        id !== null
                    ) {
                        map.set(
                            String(
                                id
                            ),
                            animal
                        );
                    }
                }
            );

            return map;
        }, [
            animals,
        ]);

    /* ======================================================================
       LATEST TELEMETRY PER ANIMAL
    ====================================================================== */

    const latestTelemetry =
        useMemo(() => {
            const map =
                new Map();

            telemetry.forEach(
                (reading) => {
                    const animalId =
                        getTelemetryAnimalId(
                            reading
                        );

                    if (
                        animalId ===
                            undefined ||
                        animalId ===
                            null
                    ) {
                        return;
                    }

                    const key =
                        String(
                            animalId
                        );

                    const existing =
                        map.get(
                            key
                        );

                    if (
                        !existing
                    ) {
                        map.set(
                            key,
                            reading
                        );

                        return;
                    }

                    const currentTime =
                        getTimestampMs(
                            reading
                        );

                    const existingTime =
                        getTimestampMs(
                            existing
                        );

                    if (
                        currentTime >=
                        existingTime
                    ) {
                        map.set(
                            key,
                            reading
                        );
                    }
                }
            );

            return map;
        }, [
            telemetry,
        ]);

    /* ======================================================================
       AUTHORITATIVE ANIMAL ROWS
    ====================================================================== */

    const animalRows =
        useMemo(() => {
            return Array.from(
                animalMap.entries()
            ).map(
                ([
                    animalId,
                    animal,
                ]) => ({
                    animal,
                    reading:
                        latestTelemetry.get(
                            String(
                                animalId
                            )
                        ) ||
                        null,
                })
            );
        }, [
            animalMap,
            latestTelemetry,
        ]);

    /* ======================================================================
       MAP ANIMAL DATA
    ====================================================================== */

    /*
     * MapView accepts the registered animals separately and
     * receives live telemetry through LiveDataContext.
     *
     * We enrich registered animals with their latest dashboard
     * telemetry here so GPS coordinates are available even when
     * the telemetry context is not populated from the same REST
     * request.
     */

    const mapAnimals =
        useMemo(() => {
            return animalRows.map(
                ({
                    animal,
                    reading,
                }) => ({
                    ...animal,
                    animal_id:
                        getAnimalId(
                            animal,
                            reading
                        ),
                    animal_name:
                        getAnimalName(
                            animal,
                            reading
                        ),
                    latitude:
                        getLatitude(
                            reading
                        ) ??
                        getLatitude(
                            animal
                        ),
                    longitude:
                        getLongitude(
                            reading
                        ) ??
                        getLongitude(
                            animal
                        ),
                    temperature:
                        getTemperature(
                            reading
                        ),
                    heart_rate:
                        getHeartRate(
                            reading
                        ),
                    activity:
                        getActivity(
                            reading
                        ),
                    health_status:
                        getHealthStatus(
                            reading,
                            animal
                        ),
                })
            );
        }, [
            animalRows,
        ]);

    /* ======================================================================
       HEALTH SUMMARY
    ====================================================================== */

    const computedHealth =
        useMemo(() => {
            let healthy = 0;
            let warning = 0;
            let critical = 0;

            animalRows.forEach(
                ({
                    animal,
                    reading,
                }) => {
                    const status =
                        getHealthStatus(
                            reading,
                            animal
                        );

                    if (
                        status ===
                        "critical"
                    ) {
                        critical +=
                            1;
                    } else if (
                        status ===
                        "warning"
                    ) {
                        warning +=
                            1;
                    } else {
                        healthy +=
                            1;
                    }
                }
            );

            return {
                total:
                    animalRows.length,
                healthy,
                warning,
                critical,
            };
        }, [
            animalRows,
        ]);

    const registeredAnimals =
        computedHealth.total;

    const healthyAnimals =
        computedHealth.healthy;

    const warningAnimals =
        computedHealth.warning;

    const criticalAnimals =
        computedHealth.critical;

    /* ======================================================================
       HEALTH PERCENTAGES
    ====================================================================== */

    const healthyPercentage =
        registeredAnimals > 0
            ? Math.round(
                  (healthyAnimals /
                      registeredAnimals) *
                      100
              )
            : 0;

    const warningPercentage =
        registeredAnimals > 0
            ? Math.round(
                  (warningAnimals /
                      registeredAnimals) *
                      100
              )
            : 0;

    const criticalPercentage =
        registeredAnimals > 0
            ? Math.round(
                  (criticalAnimals /
                      registeredAnimals) *
                      100
              )
            : 0;

    /* ======================================================================
       AVERAGE TEMPERATURE
    ====================================================================== */

    const averageTemperature =
        useMemo(() => {
            const values =
                animalRows
                    .map(
                        ({
                            reading,
                        }) =>
                            getTemperature(
                                reading
                            )
                    )
                    .filter(
                        (value) =>
                            value > 0
                    );

            if (
                values.length ===
                0
            ) {
                return getNumber(
                    dashboard?.average_temperature,
                    dashboard?.averageTemperature
                );
            }

            return (
                values.reduce(
                    (
                        sum,
                        value
                    ) =>
                        sum +
                        value,
                    0
                ) /
                values.length
            );
        }, [
            animalRows,
            dashboard,
        ]);

    /* ======================================================================
       ALERT INTELLIGENCE
    ====================================================================== */

    const unresolvedAlerts =
        useMemo(() => {
            return alerts
                .filter(
                    (alert) =>
                        !isAlertResolved(
                            alert
                        )
                )
                .sort(
                    (
                        a,
                        b
                    ) => {
                        const severityRank =
                            {
                                critical:
                                    3,
                                warning:
                                    2,
                                healthy:
                                    1,
                            };

                        const aRank =
                            severityRank[
                                getAlertSeverity(
                                    a
                                )
                            ] || 0;

                        const bRank =
                            severityRank[
                                getAlertSeverity(
                                    b
                                )
                            ] || 0;

                        if (
                            bRank !==
                            aRank
                        ) {
                            return (
                                bRank -
                                aRank
                            );
                        }

                        const aTime =
                            new Date(
                                a?.timestamp ??
                                    a?.created_at ??
                                    a?.createdAt ??
                                    0
                            ).getTime();

                        const bTime =
                            new Date(
                                b?.timestamp ??
                                    b?.created_at ??
                                    b?.createdAt ??
                                    0
                            ).getTime();

                        return (
                            bTime -
                            aTime
                        );
                    }
                );
        }, [
            alerts,
        ]);

    const criticalAlerts =
        useMemo(() => {
            return unresolvedAlerts.filter(
                (alert) =>
                    getAlertSeverity(
                        alert
                    ) ===
                    "critical"
            );
        }, [
            unresolvedAlerts,
        ]);

    /* ======================================================================
       HEALTH RING
    ====================================================================== */

    const ringBackground =
        useMemo(() => {
            if (
                registeredAnimals ===
                0
            ) {
                return "conic-gradient(#27272a 0deg 360deg)";
            }

            const healthyDegrees =
                healthyPercentage *
                3.6;

            const warningDegrees =
                warningPercentage *
                3.6;

            return `
                conic-gradient(
                    #32d74b
                    0deg
                    ${healthyDegrees}deg,

                    #f5b83d
                    ${healthyDegrees}deg
                    ${
                        healthyDegrees +
                        warningDegrees
                    }deg,

                    #ff453a
                    ${
                        healthyDegrees +
                        warningDegrees
                    }deg
                    360deg
                )
            `;
        }, [
            registeredAnimals,
            healthyPercentage,
            warningPercentage,
        ]);

    /* ======================================================================
       TEMPERATURE POSITION
    ====================================================================== */

    const temperaturePosition =
        useMemo(() => {
            const percentage =
                ((averageTemperature -
                    37) /
                    6) *
                100;

            return Math.min(
                100,
                Math.max(
                    0,
                    percentage
                )
            );
        }, [
            averageTemperature,
        ]);

    /* ======================================================================
       MAP NAVIGATION
    ====================================================================== */

    const scrollToMap =
        useCallback(() => {
            mapSectionRef.current?.scrollIntoView(
                {
                    behavior:
                        "smooth",
                    block:
                        "start",
                }
            );
        }, []);

    /* ======================================================================
       RENDER
    ====================================================================== */

    return (
        <AppShell>
            <div className="hs-dashboard">

                {/* =========================================================
                    TOP BAR
                ========================================================= */}

                <div className="hs-dashboard-topbar">

                    <div>
                        <div className="hs-breadcrumb">
                            COMMAND CENTER
                            <span>/</span>
                            <strong>
                                Overview
                            </strong>
                        </div>
                    </div>

                    <div className="hs-top-actions">

                        {/* LIVE MAP BUTTON */}

                        <button
                            className="hs-action-button hs-map-action-button"
                            type="button"
                            onClick={
                                scrollToMap
                            }
                        >
                            ◎{" "}
                            Live Map
                        </button>

                        <span className="hs-status-pill">
                            <span
                                className={`hs-status-dot ${
                                    apiOnline
                                        ? "green"
                                        : "red"
                                }`}
                            />

                            {apiOnline
                                ? "API operational"
                                : "API offline"}
                        </span>

                        <span className="hs-status-pill">
                            <span
                                className={`hs-status-dot ${
                                    websocketConnected
                                        ? "green"
                                        : "red"
                                }`}
                            />

                            {websocketConnected
                                ? "Live monitoring"
                                : "Reconnecting"}
                        </span>

                        <button
                            className="hs-action-button"
                            type="button"
                            onClick={() =>
                                loadDashboard(
                                    true
                                )
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

                {/* =========================================================
                    MAIN
                ========================================================= */}

                <main className="hs-dashboard-content">

                    {/* HERO */}

                    <section className="hs-dashboard-hero">

                        <div>

                            <div className="hs-section-label">
                                COMMAND CENTER
                            </div>

                            <h1>
                                Herd intelligence,
                                <br />
                                at a glance.
                            </h1>

                            <p>
                                Real-time livestock
                                monitoring, health
                                signals and
                                operational
                                intelligence in one
                                place.
                            </p>

                        </div>

                        <div className="hs-live-indicator">

                            <span
                                className={`hs-status-dot ${
                                    websocketConnected
                                        ? "green"
                                        : "red"
                                }`}
                            />

                            {websocketConnected
                                ? "LIVE · Sensor network"
                                : "RECONNECTING · Sensor network"}

                        </div>

                    </section>

                    {/* ERROR */}

                    {error && (
                        <div className="hs-dashboard-error">

                            <strong>
                                Connection issue
                            </strong>

                            <span>
                                {error}
                            </span>

                        </div>
                    )}

                    {/* =====================================================
                        KPI GRID
                    ===================================================== */}

                    <section className="hs-kpi-grid">

                        <div className="hs-kpi-card">

                            <div className="hs-kpi-label">
                                REGISTERED ANIMALS
                            </div>

                            <div className="hs-kpi-value">
                                {loading
                                    ? "—"
                                    : registeredAnimals}
                            </div>

                            <div className="hs-kpi-description">
                                Animals currently
                                monitored
                            </div>

                            <div className="hs-kpi-icon neutral">
                                ◉
                            </div>

                        </div>

                        <div className="hs-kpi-card">

                            <div className="hs-kpi-label">
                                HEALTHY
                            </div>

                            <div className="hs-kpi-value">
                                {loading
                                    ? "—"
                                    : healthyAnimals}
                            </div>

                            <div className="hs-kpi-description">
                                Within normal
                                health range
                            </div>

                            <div className="hs-kpi-icon healthy">
                                ✓
                            </div>

                        </div>

                        <div className="hs-kpi-card">

                            <div className="hs-kpi-label">
                                NEEDS ATTENTION
                            </div>

                            <div className="hs-kpi-value">
                                {loading
                                    ? "—"
                                    : warningAnimals +
                                      criticalAnimals}
                            </div>

                            <div className="hs-kpi-description">
                                Warning or critical
                                condition
                            </div>

                            <div className="hs-kpi-icon warning">
                                !
                            </div>

                        </div>

                        <div
                            className={`hs-kpi-card ${
                                unresolvedAlerts.length >
                                0
                                    ? "critical-card"
                                    : ""
                            }`}
                        >

                            <div className="hs-kpi-label">
                                UNRESOLVED ALERTS
                            </div>

                            <div className="hs-kpi-value">
                                {loading
                                    ? "—"
                                    : unresolvedAlerts.length}
                            </div>

                            <div className="hs-kpi-description">
                                {criticalAlerts.length}{" "}
                                Critical
                            </div>

                            <div className="hs-kpi-icon critical">
                                ⚠
                            </div>

                        </div>

                    </section>

                    {/* =====================================================
                        HEALTH + ENVIRONMENT
                    ===================================================== */}

                    <section className="hs-analysis-grid">

                        {/* HEALTH */}

                        <div className="hs-panel hs-health-panel">

                            <div className="hs-panel-header">

                                <div>

                                    <div className="hs-section-label">
                                        HERD HEALTH
                                    </div>

                                    <h2>
                                        Current condition
                                    </h2>

                                </div>

                                <div className="hs-panel-total">

                                    <strong>
                                        {
                                            registeredAnimals
                                        }
                                    </strong>

                                    <span>
                                        animals monitored
                                    </span>

                                </div>

                            </div>

                            <div className="hs-health-content">

                                <div className="hs-ring-wrapper">

                                    <div
                                        className="hs-health-ring"
                                        style={{
                                            background:
                                                ringBackground,
                                        }}
                                    >

                                        <div className="hs-health-ring-inner">

                                            <strong>
                                                {
                                                    healthyPercentage
                                                }
                                                %
                                            </strong>

                                            <span>
                                                healthy
                                            </span>

                                        </div>

                                    </div>

                                </div>

                                <div className="hs-health-bars">

                                    <HealthBar
                                        label="Healthy"
                                        value={
                                            healthyAnimals
                                        }
                                        percentage={
                                            healthyPercentage
                                        }
                                        type="healthy"
                                    />

                                    <HealthBar
                                        label="Warning"
                                        value={
                                            warningAnimals
                                        }
                                        percentage={
                                            warningPercentage
                                        }
                                        type="warning"
                                    />

                                    <HealthBar
                                        label="Critical"
                                        value={
                                            criticalAnimals
                                        }
                                        percentage={
                                            criticalPercentage
                                        }
                                        type="critical"
                                    />

                                </div>

                            </div>

                        </div>

                        {/* TEMPERATURE */}

                        <div className="hs-panel hs-temperature-panel">

                            <div className="hs-panel-header">

                                <div>

                                    <div className="hs-section-label">
                                        ENVIRONMENTAL
                                        SIGNAL
                                    </div>

                                    <h2>
                                        Average temperature
                                    </h2>

                                </div>

                                <button
                                    className="hs-panel-icon"
                                    type="button"
                                    title="Temperature information"
                                >
                                    °
                                </button>

                            </div>

                            <div className="hs-temperature-value">

                                {averageTemperature.toFixed(
                                    2
                                )}

                                <span>
                                    °C
                                </span>

                            </div>

                            <p className="hs-temperature-description">
                                Current herd-wide
                                average calculated
                                from available
                                telemetry.
                            </p>

                            <div className="hs-temperature-scale">

                                <div className="hs-scale-labels">

                                    <span>
                                        Normal
                                    </span>

                                    <span>
                                        Elevated
                                    </span>

                                    <span>
                                        Critical
                                    </span>

                                </div>

                                <div className="hs-temperature-line">

                                    <span className="normal" />

                                    <span className="elevated" />

                                    <span className="critical" />

                                    <i
                                        style={{
                                            left: `${temperaturePosition}%`,
                                        }}
                                    />

                                </div>

                            </div>

                        </div>

                    </section>

                    {/* =====================================================
                        LIVE GPS MAP
                    ===================================================== */}

                    <section
                        ref={
                            mapSectionRef
                        }
                        className="hs-map-section"
                    >

                        <MapView
                            animals={
                                mapAnimals
                            }
                            title="Live GPS Monitoring"
                            showHeader={
                                true
                            }
                        />

                    </section>

                    {/* =====================================================
                        TELEMETRY
                    ===================================================== */}

                    <section className="hs-panel hs-telemetry-panel">

                        <div className="hs-panel-header">

                            <div>

                                <div className="hs-section-label">
                                    TELEMETRY
                                </div>

                                <h2>
                                    Live animal signals
                                </h2>

                                <p>
                                    Latest sensor reading
                                    for each monitored
                                    animal.
                                </p>

                            </div>

                            <div className="hs-live-badge">

                                <span
                                    className={`hs-status-dot ${
                                        websocketConnected
                                            ? "green"
                                            : "red"
                                    }`}
                                />

                                {websocketConnected
                                    ? "LIVE"
                                    : "OFFLINE"}

                            </div>

                        </div>

                        {animalRows.length ===
                        0 ? (

                            <div className="hs-empty-state">
                                No registered animal
                                telemetry is currently
                                available.
                            </div>

                        ) : (

                            <div className="hs-table-wrapper">

                                <table className="hs-telemetry-table">

                                    <thead>

                                        <tr>

                                            <th>
                                                ANIMAL
                                            </th>

                                            <th>
                                                TEMPERATURE
                                            </th>

                                            <th>
                                                HEART RATE
                                            </th>

                                            <th>
                                                ACTIVITY
                                            </th>

                                            <th>
                                                BATTERY
                                            </th>

                                            <th>
                                                GPS
                                            </th>

                                            <th>
                                                STATUS
                                            </th>

                                            <th>
                                                LAST SIGNAL
                                            </th>

                                        </tr>

                                    </thead>

                                    <tbody>

                                        {animalRows.map(
                                            ({
                                                animal,
                                                reading,
                                            }) => {

                                                const status =
                                                    getHealthStatus(
                                                        reading,
                                                        animal
                                                    );

                                                const animalId =
                                                    getAnimalId(
                                                        animal,
                                                        reading
                                                    );

                                                const animalName =
                                                    getAnimalName(
                                                        animal,
                                                        reading
                                                    );

                                                const temperature =
                                                    getTemperature(
                                                        reading
                                                    );

                                                const heartRate =
                                                    getHeartRate(
                                                        reading
                                                    );

                                                const activity =
                                                    getActivity(
                                                        reading
                                                    );

                                                const battery =
                                                    getBattery(
                                                        reading
                                                    );

                                                const latitude =
                                                    getLatitude(
                                                        reading
                                                    );

                                                const longitude =
                                                    getLongitude(
                                                        reading
                                                    );

                                                return (

                                                    <tr
                                                        key={String(
                                                            animalId
                                                        )}
                                                    >

                                                        <td>

                                                            <button
                                                                type="button"
                                                                className="hs-animal-cell hs-animal-cell-button"
                                                                onClick={() =>
                                                                    navigate(
                                                                        `/animals/${animalId}/intelligence`
                                                                    )
                                                                }
                                                            >

                                                                <div className="hs-animal-avatar">
                                                                    {String(
                                                                        animalName
                                                                    )
                                                                        .slice(
                                                                            0,
                                                                            2
                                                                        )
                                                                        .toUpperCase()}
                                                                </div>

                                                                <div>

                                                                    <strong>
                                                                        {
                                                                            animalName
                                                                        }
                                                                    </strong>

                                                                    <small>
                                                                        ID #
                                                                        {
                                                                            animalId
                                                                        }
                                                                    </small>

                                                                </div>

                                                            </button>

                                                        </td>

                                                        <td>
                                                            <strong>
                                                                {temperature >
                                                                0
                                                                    ? `${temperature.toFixed(
                                                                          1
                                                                      )}°C`
                                                                    : "—"}
                                                            </strong>
                                                        </td>

                                                        <td>
                                                            {heartRate >
                                                            0
                                                                ? `${heartRate.toFixed(
                                                                      0
                                                                  )} BPM`
                                                                : "—"}
                                                        </td>

                                                        <td>
                                                            {activity >
                                                            0
                                                                ? `${activity.toFixed(
                                                                      0
                                                                  )}%`
                                                                : "—"}
                                                        </td>

                                                        <td>

                                                            <div className="hs-battery-cell">

                                                                <span>
                                                                    {battery >
                                                                    0
                                                                        ? `${battery.toFixed(
                                                                              0
                                                                          )}%`
                                                                        : "—"}
                                                                </span>

                                                                {battery >
                                                                    0 && (
                                                                    <div className="hs-battery-bar">

                                                                        <i
                                                                            style={{
                                                                                width: `${Math.min(
                                                                                    100,
                                                                                    Math.max(
                                                                                        0,
                                                                                        battery
                                                                                    )
                                                                                )}%`,
                                                                            }}
                                                                        />

                                                                    </div>
                                                                )}

                                                            </div>

                                                        </td>

                                                        <td>

                                                            {latitude !==
                                                                undefined &&
                                                            latitude !==
                                                                null &&
                                                            longitude !==
                                                                undefined &&
                                                            longitude !==
                                                                null
                                                                ? `${Number(
                                                                      latitude
                                                                  ).toFixed(
                                                                      4
                                                                  )}, ${Number(
                                                                      longitude
                                                                  ).toFixed(
                                                                      4
                                                                  )}`
                                                                : "—"}

                                                        </td>

                                                        <td>

                                                            <StatusBadge
                                                                status={
                                                                    status
                                                                }
                                                            />

                                                        </td>

                                                        <td>
                                                            {formatDate(
                                                                getTimestamp(
                                                                    reading
                                                                )
                                                            )}
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

                    {/* =====================================================
                        ALERT CENTER
                    ===================================================== */}

                    <section className="hs-panel hs-alert-panel">

                        <div className="hs-panel-header">

                            <div>

                                <div className="hs-section-label">
                                    ALERT CENTER
                                </div>

                                <h2>
                                    Recent alerts
                                </h2>

                                <p>
                                    Latest unresolved events
                                    requiring attention.
                                </p>

                            </div>

                            <button
                                className="hs-view-all"
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

                        {unresolvedAlerts.length ===
                        0 ? (

                            <div className="hs-alert-empty">

                                <div className="hs-alert-empty-icon">
                                    ✓
                                </div>

                                <div>

                                    <strong>
                                        No unresolved alerts
                                    </strong>

                                    <span>
                                        All monitored animals
                                        are currently clear.
                                    </span>

                                </div>

                            </div>

                        ) : (

                            <div className="hs-alert-list">

                                {unresolvedAlerts
                                    .slice(
                                        0,
                                        6
                                    )
                                    .map(
                                        (
                                            alert,
                                            index
                                        ) => (

                                            <AlertRow
                                                key={
                                                    alert?.id ??
                                                    `${alert?.animal_id}-${index}`
                                                }
                                                alert={
                                                    alert
                                                }
                                                onAnimalClick={
                                                    (
                                                        animalId
                                                    ) =>
                                                        animalId &&
                                                        navigate(
                                                            `/animals/${animalId}/intelligence`
                                                        )
                                                }
                                            />

                                        )
                                    )}

                            </div>

                        )}

                    </section>

                    {/* =====================================================
                        FOOTER
                    ===================================================== */}

                    <footer className="hs-dashboard-footer">

                        <span>
                            HerdSense AI
                        </span>

                        <span>
                            Livestock intelligence
                            platform
                        </span>

                        <span>
                            © 2026
                        </span>

                    </footer>

                </main>
            </div>
        </AppShell>
    );
}

/* ==========================================================================
   HEALTH BAR
========================================================================== */

function HealthBar({
    label,
    value,
    percentage,
    type,
}) {
    return (
        <div className="hs-health-row">

            <div className="hs-health-row-top">

                <span
                    className={`health-dot ${type}`}
                />

                <span className="hs-health-label">
                    {label}
                </span>

                <strong>
                    {value}
                </strong>

                <span className="hs-health-percentage">
                    {percentage}%
                </span>

            </div>

            <div className="hs-health-progress">

                <div
                    className={`hs-health-progress-fill ${type}`}
                    style={{
                        width: `${Math.min(
                            100,
                            Math.max(
                                0,
                                percentage
                            )
                        )}%`,
                    }}
                />

            </div>

        </div>
    );
}

/* ==========================================================================
   STATUS BADGE
========================================================================== */

function StatusBadge({
    status,
}) {
    const safeStatus =
        status === "critical" ||
        status === "warning"
            ? status
            : "healthy";

    const label =
        safeStatus
            .charAt(0)
            .toUpperCase() +
        safeStatus.slice(1);

    return (
        <span
            className={`hs-status-badge ${safeStatus}`}
        >
            <span />
            {label}
        </span>
    );
}

/* ==========================================================================
   ALERT ROW
========================================================================== */

function AlertRow({
    alert,
    onAnimalClick,
}) {
    const severity =
        getAlertSeverity(
            alert
        );

    const title =
        alert?.message ??
        alert?.description ??
        alert?.title ??
        alert?.alert_message ??
        "Livestock event detected";

    const animalId =
        alert?.animal_id ??
        alert?.animalId ??
        alert?.animal?.id ??
        null;

    const animalName =
        alert?.animal_name ??
        alert?.animalName ??
        alert?.animal?.name ??
        (animalId
            ? `Animal #${animalId}`
            : "Unknown animal");

    const category =
        alert?.category ??
        alert?.type ??
        alert?.alert_type ??
        "Health Monitoring";

    const timestamp =
        alert?.timestamp ??
        alert?.created_at ??
        alert?.createdAt ??
        alert?.time;

    return (
        <div
            className={`hs-alert-row ${severity}`}
        >

            <div className="hs-alert-icon">

                {severity ===
                "critical"
                    ? "!"
                    : severity ===
                      "warning"
                    ? "!"
                    : "✓"}

            </div>

            <div className="hs-alert-content">

                <strong>
                    {title}
                </strong>

                <div className="hs-alert-meta">

                    {animalId ? (

                        <button
                            type="button"
                            onClick={() =>
                                onAnimalClick?.(
                                    animalId
                                )
                            }
                            className="hs-alert-animal-link"
                        >
                            {animalName}
                        </button>

                    ) : (

                        <span>
                            {animalName}
                        </span>

                    )}

                    <span>
                        ·
                    </span>

                    <span>
                        {category}
                    </span>

                </div>

            </div>

            <div className="hs-alert-right">

                <StatusBadge
                    status={
                        severity
                    }
                />

                <time>
                    {formatDate(
                        timestamp
                    )}
                </time>

            </div>

        </div>
    );
}