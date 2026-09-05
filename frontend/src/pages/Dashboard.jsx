import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    useLocation,
    useNavigate,
} from "react-router-dom";

import AppShell from "../components/AppShell";
import MapView from "../components/map/MapView";
import api from "../api/api";
import useTelemetrySocket from "../hooks/useTelemetrySocket";
import "./Dashboard.css";

const REFRESH_INTERVAL = 30000;

/* ==========================================================================
   DATA HELPERS
   ========================================================================== */

const getNumber = (value, fallback = null) => {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
};

const getAnimalId = (animal) => {
    if (!animal) {
        return undefined;
    }

    return (
        animal.id ??
        animal.animal_id ??
        animal.animalId ??
        animal.tag_id ??
        animal.tagId
    );
};

const getAnimalName = (animal) => {
    if (!animal) {
        return "Unknown animal";
    }

    return (
        animal.name ||
        animal.animal_name ||
        animal.tag_id ||
        animal.tagId ||
        `Animal #${getAnimalId(animal) ?? "—"}`
    );
};

const getTemperature = (animal) =>
    getNumber(
        animal?.temperature ??
            animal?.temp ??
            animal?.temperature_c
    );

const getHeartRate = (animal) =>
    getNumber(
        animal?.heart_rate ??
            animal?.heartRate ??
            animal?.hr
    );

const getActivity = (animal) =>
    getNumber(
        animal?.activity ??
            animal?.activity_level
    );

const getBattery = (animal) =>
    getNumber(
        animal?.battery ??
            animal?.battery_level ??
            animal?.batteryLevel
    );

const getLatitude = (animal) =>
    getNumber(
        animal?.latitude ??
            animal?.lat
    );

const getLongitude = (animal) =>
    getNumber(
        animal?.longitude ??
            animal?.lng ??
            animal?.lon
    );

const getTimestamp = (animal) =>
    animal?.timestamp ||
    animal?.recorded_at ||
    animal?.created_at ||
    animal?.updated_at ||
    null;

const getTimestampMs = (animal) => {
    const timestamp = getTimestamp(animal);

    if (!timestamp) {
        return 0;
    }

    const parsed = new Date(timestamp).getTime();

    return Number.isFinite(parsed)
        ? parsed
        : 0;
};

const formatDate = (value) => {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const getTelemetryAnimalId = (telemetry) => {
    if (!telemetry) {
        return undefined;
    }

    return (
        telemetry.animal_id ??
        telemetry.animalId ??
        telemetry.id
    );
};

/* ==========================================================================
   TELEMETRY MERGING
   ========================================================================== */

const mergeLatestTelemetry = (
    existing,
    incoming
) => {
    const combined = [
        ...(Array.isArray(existing)
            ? existing
            : []),
        ...(Array.isArray(incoming)
            ? incoming
            : []),
    ];

    const byAnimal = new Map();

    combined.forEach((item) => {
        const id = getTelemetryAnimalId(item);

        if (
            id === undefined ||
            id === null
        ) {
            return;
        }

        const current = byAnimal.get(id);

        if (
            !current ||
            getTimestampMs(item) >=
                getTimestampMs(current)
        ) {
            byAnimal.set(id, item);
        }
    });

    return Array.from(
        byAnimal.values()
    );
};

const replaceLatestTelemetry = (
    existing,
    incoming
) => {
    const incomingId =
        getTelemetryAnimalId(incoming);

    if (
        incomingId === undefined ||
        incomingId === null
    ) {
        return existing;
    }

    const current = Array.isArray(existing)
        ? [...existing]
        : [];

    const index = current.findIndex(
        (item) =>
            String(
                getTelemetryAnimalId(item)
            ) === String(incomingId)
    );

    if (index === -1) {
        current.push(incoming);
    } else {
        current[index] = incoming;
    }

    return current;
};

/* ==========================================================================
   ALERT HELPERS
   ========================================================================== */

const isAlertResolved = (alert) =>
    Boolean(
        alert?.resolved ??
            alert?.is_resolved ??
            alert?.closed
    );

const getAlertSeverity = (alert) => {
    const severity = String(
        alert?.severity ||
            alert?.level ||
            alert?.priority ||
            "warning"
    ).toLowerCase();

    if (
        severity.includes("critical") ||
        severity.includes("danger")
    ) {
        return "critical";
    }

    if (
        severity.includes("info") ||
        severity.includes("normal")
    ) {
        return "info";
    }

    return "warning";
};

/* ==========================================================================
   HEALTH
   ========================================================================== */

const getHealthStatus = (
    animal,
    telemetry
) => {
    const source = {
        ...(animal || {}),
        ...(telemetry || {}),
    };

    const temperature =
        getTemperature(source);

    const heartRate =
        getHeartRate(source);

    const activity =
        getActivity(source);

    const battery =
        getBattery(source);

    if (
        temperature !== null &&
        temperature >= 41
    ) {
        return "critical";
    }

    if (
        heartRate !== null &&
        heartRate >= 140
    ) {
        return "critical";
    }

    if (
        activity !== null &&
        activity <= 10
    ) {
        return "critical";
    }

    if (
        battery !== null &&
        battery <= 20
    ) {
        return "critical";
    }

    if (
        temperature !== null &&
        temperature >= 39.5
    ) {
        return "warning";
    }

    if (
        heartRate !== null &&
        heartRate >= 120
    ) {
        return "warning";
    }

    if (
        activity !== null &&
        activity <= 25
    ) {
        return "warning";
    }

    if (
        battery !== null &&
        battery <= 35
    ) {
        return "warning";
    }

    return "healthy";
};

const getInitials = (name) => {
    if (!name) {
        return "AN";
    }

    return name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) =>
            part.charAt(0).toUpperCase()
        )
        .join("");
};

/* ==========================================================================
   COMPONENT
   ========================================================================== */

export default function Dashboard() {
    const navigate = useNavigate();
    const location = useLocation();

    const userRole =
        localStorage.getItem("user_role") ||
        "";

    const isFarmer =
        userRole.toLowerCase() === "farmer";

    const [dashboard, setDashboard] =
        useState(null);

    const [animals, setAnimals] =
        useState([]);

    const [telemetry, setTelemetry] =
        useState([]);

    const [alerts, setAlerts] =
        useState([]);

    const [farms, setFarms] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [apiOnline, setApiOnline] =
        useState(false);

    const [error, setError] =
        useState("");

    const mapSectionRef =
        useRef(null);

    const telemetryRef =
        useRef([]);

    const dashboardRequestRef =
        useRef(0);

    /* ----------------------------------------------------------------------
       LIVE TELEMETRY
       ---------------------------------------------------------------------- */

    const handleLiveTelemetry =
        useCallback(
            (liveTelemetry) => {
                if (!liveTelemetry) {
                    return;
                }

                const incomingAnimalId =
                    getTelemetryAnimalId(
                        liveTelemetry
                    );

                if (
                    incomingAnimalId ===
                        undefined ||
                    incomingAnimalId === null
                ) {
                    return;
                }

                setTelemetry((current) => {
                    const updated =
                        replaceLatestTelemetry(
                            current,
                            liveTelemetry
                        );

                    telemetryRef.current =
                        updated;

                    return updated;
                });

                setApiOnline(true);
                setError("");
            },
            []
        );

    const {
        connected: websocketConnected,
    } = useTelemetrySocket(
        handleLiveTelemetry
    );

    /* ----------------------------------------------------------------------
       LOAD DASHBOARD
       ---------------------------------------------------------------------- */

    const loadDashboard =
        useCallback(
            async (manualRefresh = false) => {
                const requestId =
                    ++dashboardRequestRef.current;

                if (manualRefresh) {
                    setRefreshing(true);
                } else {
                    setLoading(true);
                }

                setError("");

                try {
                    const requests = [
                        api.get("/dashboard/"),
                        api.get("/animals/"),
                        api.get("/telemetry/"),
                        api.get("/alerts/"),
                    ];

                    if (isFarmer) {
                        requests.push(
                            api.get("/farms/")
                        );
                    }

                    const responses =
                        await Promise.all(
                            requests
                        );

                    if (
                        requestId !==
                        dashboardRequestRef.current
                    ) {
                        return;
                    }

                    const [
                        dashboardResponse,
                        animalsResponse,
                        telemetryResponse,
                        alertsResponse,
                        farmsResponse,
                    ] = responses;

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

                    const farmData =
                        isFarmer &&
                        farmsResponse
                            ? Array.isArray(
                                  farmsResponse?.data
                              )
                                ? farmsResponse.data
                                : farmsResponse
                                      ?.data
                                      ?.items ||
                                  []
                            : [];

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

                    setAlerts(alertData);

                    if (isFarmer) {
                        setFarms(
                            farmData
                        );
                    }

                    setApiOnline(true);
                } catch (err) {
                    console.error(
                        "Dashboard loading error:",
                        err
                    );

                    if (
                        err?.response
                            ?.status === 401
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

                    setApiOnline(false);

                    setError(
                        "Unable to load live dashboard data. Check that the API is running."
                    );
                } finally {
                    setLoading(false);
                    setRefreshing(false);
                }
            },
            [isFarmer, navigate]
        );

    /* ----------------------------------------------------------------------
       INITIAL LOAD
       ---------------------------------------------------------------------- */

    useEffect(() => {
        loadDashboard(false);

        const interval =
            setInterval(() => {
                loadDashboard(true);
            }, REFRESH_INTERVAL);

        return () => {
            clearInterval(interval);
        };
    }, [loadDashboard]);

    /* ----------------------------------------------------------------------
       FARM REGISTRATION SUCCESS
       ---------------------------------------------------------------------- */

    useEffect(() => {
        if (
            location.state
                ?.farmRegistered
        ) {
            loadDashboard(true);

            navigate(
                location.pathname,
                {
                    replace: true,
                    state: {},
                }
            );
        }
    }, [
        location.pathname,
        location.state,
        loadDashboard,
        navigate,
    ]);

    /* ==========================================================================
       DERIVED DATA
       ========================================================================== */

    const animalMap = useMemo(() => {
        const map = new Map();

        animals.forEach((animal) => {
            const id =
                getAnimalId(animal);

            if (
                id !== undefined &&
                id !== null
            ) {
                map.set(
                    String(id),
                    animal
                );
            }
        });

        return map;
    }, [animals]);

    const latestTelemetry = useMemo(
        () => {
            const map = new Map();

            telemetry.forEach(
                (item) => {
                    const id =
                        getTelemetryAnimalId(
                            item
                        );

                    if (
                        id !==
                            undefined &&
                        id !== null
                    ) {
                        map.set(
                            String(id),
                            item
                        );
                    }
                }
            );

            return map;
        },
        [telemetry]
    );

    const animalRows = useMemo(
        () =>
            animals.map(
                (animal) => {
                    const id =
                        getAnimalId(
                            animal
                        );

                    const live =
                        latestTelemetry.get(
                            String(id)
                        );

                    const source = {
                        ...animal,
                        ...(live || {}),
                    };

                    return {
                        animal,
                        telemetry:
                            live,
                        id,
                        name:
                            getAnimalName(
                                animal
                            ),
                        temperature:
                            getTemperature(
                                source
                            ),
                        heartRate:
                            getHeartRate(
                                source
                            ),
                        activity:
                            getActivity(
                                source
                            ),
                        battery:
                            getBattery(
                                source
                            ),
                        timestamp:
                            getTimestamp(
                                source
                            ),
                        health:
                            getHealthStatus(
                                animal,
                                live
                            ),
                    };
                }
            ),
        [
            animals,
            latestTelemetry,
        ]
    );

    const mapAnimals = useMemo(
        () =>
            animals
                .map((animal) => {
                    const id =
                        getAnimalId(
                            animal
                        );

                    const live =
                        latestTelemetry.get(
                            String(id)
                        );

                    return {
                        ...animal,
                        ...(live || {}),
                    };
                })
                .filter(
                    (animal) =>
                        getLatitude(
                            animal
                        ) !== null &&
                        getLongitude(
                            animal
                        ) !== null
                ),
        [
            animals,
            latestTelemetry,
        ]
    );

    const computedHealth =
        useMemo(() => {
            const result = {
                healthy: 0,
                warning: 0,
                critical: 0,
            };

            animalRows.forEach(
                (row) => {
                    result[row.health] =
                        (result[
                            row.health
                        ] || 0) + 1;
                }
            );

            return result;
        }, [animalRows]);

    const registeredAnimals =
        animals.length;

    const healthyAnimals =
        computedHealth.healthy;

    const warningAnimals =
        computedHealth.warning;

    const criticalAnimals =
        computedHealth.critical;

    const needsAttention =
        warningAnimals +
        criticalAnimals;

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

    const averageTemperature =
        useMemo(() => {
            const values =
                animalRows
                    .map(
                        (row) =>
                            row.temperature
                    )
                    .filter(
                        (value) =>
                            value !==
                                null &&
                            Number.isFinite(
                                value
                            )
                    );

            if (!values.length) {
                return null;
            }

            return (
                values.reduce(
                    (sum, value) =>
                        sum + value,
                    0
                ) / values.length
            );
        }, [animalRows]);

    const unresolvedAlerts =
        alerts.filter(
            (alert) =>
                !isAlertResolved(
                    alert
                )
        );

    const criticalAlerts =
        unresolvedAlerts.filter(
            (alert) =>
                getAlertSeverity(
                    alert
                ) === "critical"
        );

    const ringBackground = `conic-gradient(
        #38d996 0deg ${healthyPercentage * 3.6}deg,
        #ffb65c ${healthyPercentage * 3.6}deg ${
        (healthyPercentage +
            warningPercentage) *
        3.6
    }deg,
        #ff5e6c ${
            (healthyPercentage +
                warningPercentage) *
            3.6
        }deg 360deg
    )`;

    const temperaturePosition =
        averageTemperature ===
        null
            ? 0
            : Math.min(
                  100,
                  Math.max(
                      0,
                      ((averageTemperature -
                          35) /
                          8) *
                          100
                  )
              );

    const temperatureStatus =
        averageTemperature === null
            ? "No signal"
            : averageTemperature >= 41
            ? "Critical"
            : averageTemperature >= 39.5
            ? "Elevated"
            : "Within range";

    const scrollToMap =
        useCallback(() => {
            mapSectionRef.current?.scrollIntoView(
                {
                    behavior: "smooth",
                    block: "start",
                }
            );
        }, []);

    /* ==========================================================================
       RENDER
       ========================================================================== */

    return (
        <AppShell>
            <div className="hs-dashboard">
                {/* ================================================================
                    COMMAND BAR
                   ================================================================ */}

                <header className="hs-dashboard-topbar">
                    <div className="hs-dashboard-title">
                        <span className="hs-dashboard-eyebrow">
                            COMMAND CENTER
                        </span>

                        <span className="hs-dashboard-page-title">
                            Overview
                        </span>
                    </div>

                    <div className="hs-dashboard-actions">
                        {isFarmer && (
                            <button
                                className="hs-action-button hs-action-button-primary"
                                type="button"
                                onClick={() =>
                                    navigate(
                                        "/farms/register"
                                    )
                                }
                            >
                                <span>+</span>
                                Register Farm
                            </button>
                        )}

                        <button
                            className="hs-action-button"
                            type="button"
                            onClick={
                                scrollToMap
                            }
                        >
                            Live Map
                        </button>

                        <div className="hs-system-status">
                            <span
                                className={`hs-status-dot ${
                                    apiOnline
                                        ? "online"
                                        : "offline"
                                }`}
                            />

                            <span>
                                API{" "}
                                {apiOnline
                                    ? "Online"
                                    : "Offline"}
                            </span>
                        </div>

                        <div className="hs-system-status">
                            <span
                                className={`hs-status-dot ${
                                    websocketConnected
                                        ? "online"
                                        : "offline"
                                }`}
                            />

                            <span>
                                WS{" "}
                                {websocketConnected
                                    ? "Live"
                                    : "Standby"}
                            </span>
                        </div>

                        <button
                            className="hs-refresh-button"
                            type="button"
                            onClick={() =>
                                loadDashboard(
                                    true
                                )
                            }
                            disabled={
                                refreshing
                            }
                            aria-label="Refresh dashboard"
                            title="Refresh dashboard"
                        >
                            <span
                                className={
                                    refreshing
                                        ? "hs-refresh-icon spinning"
                                        : "hs-refresh-icon"
                                }
                            >
                                ↻
                            </span>
                        </button>
                    </div>
                </header>

                {/* ================================================================
                    CONTENT
                   ================================================================ */}

                <main className="hs-dashboard-content">
                    {/* HERO */}

                    <section className="hs-dashboard-hero">
                        <div className="hs-dashboard-hero-main">
                            <span className="hs-section-kicker">
                                LIVE OPERATIONS
                            </span>

                            <h1>
                                Herd intelligence,
                                <br />
                                at a glance.
                            </h1>

                            <p>
                                Monitor animal health,
                                telemetry, location and
                                operational risk from one
                                control surface.
                            </p>
                        </div>

                        <div className="hs-dashboard-hero-meta">
                            <div>
                                <span>
                                    LAST SYNCHRONIZED
                                </span>

                                <strong>
                                    {dashboard
                                        ?.updated_at
                                        ? formatDate(
                                              dashboard.updated_at
                                          )
                                        : apiOnline
                                        ? "Live"
                                        : "Awaiting data"}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    TELEMETRY STREAM
                                </span>

                                <strong>
                                    <i
                                        className={`hs-meta-indicator ${
                                            websocketConnected
                                                ? "active"
                                                : ""
                                        }`}
                                    />

                                    {websocketConnected
                                        ? "Connected"
                                        : "Standby"}
                                </strong>
                            </div>
                        </div>
                    </section>

                    {/* ERROR */}

                    {error && (
                        <div className="hs-dashboard-error">
                            <div className="hs-error-icon">
                                !
                            </div>

                            <div className="hs-error-content">
                                <strong>
                                    Data connection
                                    issue
                                </strong>

                                <span>
                                    {error}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    loadDashboard(
                                        true
                                    )
                                }
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {/* ============================================================
                        FARM OPERATIONS
                       ============================================================ */}

                    {isFarmer && (
                        <section className="hs-farm-operations">
                            <div className="hs-section-heading">
                                <div>
                                    <span className="hs-section-kicker">
                                        FARM OPERATIONS
                                    </span>

                                    <h2>
                                        {farms.length ===
                                        0
                                            ? "Set up your farm"
                                            : "Your farms"}
                                    </h2>

                                    <p>
                                        {farms.length ===
                                        0
                                            ? "Register a farm to begin building your livestock intelligence workspace."
                                            : `${farms.length} farm${
                                                  farms.length ===
                                                  1
                                                      ? ""
                                                      : "s"
                                              } connected to your account.`}
                                    </p>
                                </div>

                                <button
                                    className="hs-farm-primary-action"
                                    type="button"
                                    onClick={() =>
                                        navigate(
                                            "/farms/register"
                                        )
                                    }
                                >
                                    <span>+</span>

                                    {farms.length ===
                                    0
                                        ? "Register Farm"
                                        : "Add Farm"}
                                </button>
                            </div>

                            {farms.length ===
                            0 ? (
                                <div className="hs-farm-empty-state">
                                    <div className="hs-farm-empty-icon">
                                        ⌂
                                    </div>

                                    <div className="hs-farm-empty-copy">
                                        <strong>
                                            No farm
                                            registered
                                        </strong>

                                        <span>
                                            Your farm
                                            becomes the
                                            foundation
                                            for animal
                                            records,
                                            telemetry
                                            and health
                                            intelligence.
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate(
                                                "/farms/register"
                                            )
                                        }
                                    >
                                        Start registration
                                        <span>→</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="hs-farm-list">
                                    {farms.map(
                                        (
                                            farm
                                        ) => (
                                            <article
                                                className="hs-farm-card"
                                                key={
                                                    farm.id
                                                }
                                            >
                                                <div className="hs-farm-card-top">
                                                    <div className="hs-farm-identity">
                                                        <div className="hs-farm-avatar">
                                                            {getInitials(
                                                                farm.name
                                                            )}
                                                        </div>

                                                        <div>
                                                            <strong>
                                                                {
                                                                    farm.name
                                                                }
                                                            </strong>

                                                            <span>
                                                                {
                                                                    farm.location
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <span className="hs-farm-status">
                                                        <i />
                                                        ACTIVE
                                                    </span>
                                                </div>

                                                <div className="hs-farm-card-bottom">
                                                    <div className="hs-farm-coordinates">
                                                        <div>
                                                            <span>
                                                                LATITUDE
                                                            </span>

                                                            <strong>
                                                                {getNumber(
                                                                    farm.latitude
                                                                )?.toFixed(
                                                                    5
                                                                ) ||
                                                                    "—"}
                                                            </strong>
                                                        </div>

                                                        <div>
                                                            <span>
                                                                LONGITUDE
                                                            </span>

                                                            <strong>
                                                                {getNumber(
                                                                    farm.longitude
                                                                )?.toFixed(
                                                                    5
                                                                ) ||
                                                                    "—"}
                                                            </strong>
                                                        </div>
                                                    </div>

                                                    <button
                                                        className="hs-farm-secondary-action"
                                                        type="button"
                                                        onClick={() =>
                                                            navigate(
                                                                "/animals/register",
                                                                {
                                                                    state: {
                                                                        farmId:
                                                                            farm.id,
                                                                        farmName:
                                                                            farm.name,
                                                                    },
                                                                }
                                                            )
                                                        }
                                                    >
                                                        + Add Animal
                                                    </button>
                                                </div>
                                            </article>
                                        )
                                    )}
                                </div>
                            )}
                        </section>
                    )}

                    {/* ============================================================
                        KPI GRID
                       ============================================================ */}

                    <section className="hs-kpi-grid">
                        <article className="hs-kpi-card">
                            <div className="hs-kpi-top">
                                <span className="hs-kpi-label">
                                    REGISTERED ANIMALS
                                </span>

                                <span className="hs-kpi-symbol">
                                    ◉
                                </span>
                            </div>

                            <strong className="hs-kpi-value">
                                {loading
                                    ? "—"
                                    : registeredAnimals}
                            </strong>

                            <div className="hs-kpi-foot">
                                <span className="hs-kpi-neutral">
                                    LIVE INVENTORY
                                </span>

                                <span>
                                    Animal identities
                                </span>
                            </div>
                        </article>

                        <article className="hs-kpi-card">
                            <div className="hs-kpi-top">
                                <span className="hs-kpi-label">
                                    HEALTHY
                                </span>

                                <span className="hs-kpi-symbol healthy">
                                    ✓
                                </span>
                            </div>

                            <strong className="hs-kpi-value">
                                {loading
                                    ? "—"
                                    : healthyAnimals}
                            </strong>

                            <div className="hs-kpi-foot">
                                <span className="hs-kpi-positive">
                                    {healthyPercentage}%
                                </span>

                                <span>
                                    Within thresholds
                                </span>
                            </div>
                        </article>

                        <article
                            className={`hs-kpi-card ${
                                needsAttention > 0
                                    ? "has-warning"
                                    : ""
                            }`}
                        >
                            <div className="hs-kpi-top">
                                <span className="hs-kpi-label">
                                    NEEDS ATTENTION
                                </span>

                                <span className="hs-kpi-symbol warning">
                                    !
                                </span>
                            </div>

                            <strong className="hs-kpi-value">
                                {loading
                                    ? "—"
                                    : needsAttention}
                            </strong>

                            <div className="hs-kpi-foot">
                                <span className="hs-kpi-warning">
                                    {warningAnimals}{" "}
                                    warning
                                </span>

                                <span>
                                    {criticalAnimals}{" "}
                                    critical
                                </span>
                            </div>
                        </article>

                        <article
                            className={`hs-kpi-card ${
                                criticalAlerts.length >
                                0
                                    ? "has-critical"
                                    : ""
                            }`}
                        >
                            <div className="hs-kpi-top">
                                <span className="hs-kpi-label">
                                    UNRESOLVED ALERTS
                                </span>

                                <span className="hs-kpi-symbol critical">
                                    !
                                </span>
                            </div>

                            <strong className="hs-kpi-value">
                                {loading
                                    ? "—"
                                    : unresolvedAlerts.length}
                            </strong>

                            <div className="hs-kpi-foot">
                                <span
                                    className={
                                        criticalAlerts.length >
                                        0
                                            ? "hs-kpi-critical"
                                            : "hs-kpi-positive"
                                    }
                                >
                                    {
                                        criticalAlerts.length
                                    }{" "}
                                    critical
                                </span>

                                <span>
                                    Active alerts
                                </span>
                            </div>
                        </article>
                    </section>

                    {/* ============================================================
                        HEALTH + ENVIRONMENT
                       ============================================================ */}

                    <section className="hs-dashboard-grid">
                        <article className="hs-panel hs-health-panel">
                            <div className="hs-panel-header">
                                <div>
                                    <span className="hs-section-kicker">
                                        HERD HEALTH
                                    </span>

                                    <h2>
                                        Current health
                                        distribution
                                    </h2>
                                </div>

                                <span className="hs-panel-live">
                                    LIVE
                                </span>
                            </div>

                            <div className="hs-health-content">
                                <div className="hs-health-ring-wrap">
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

                                <div className="hs-health-legend">
                                    <div className="hs-health-legend-row">
                                        <span className="hs-legend-dot healthy" />

                                        <div>
                                            <strong>
                                                {
                                                    healthyAnimals
                                                }
                                            </strong>

                                            <span>
                                                Healthy
                                            </span>
                                        </div>

                                        <b>
                                            {
                                                healthyPercentage
                                            }
                                            %
                                        </b>
                                    </div>

                                    <div className="hs-health-legend-row">
                                        <span className="hs-legend-dot warning" />

                                        <div>
                                            <strong>
                                                {
                                                    warningAnimals
                                                }
                                            </strong>

                                            <span>
                                                Warning
                                            </span>
                                        </div>

                                        <b>
                                            {
                                                warningPercentage
                                            }
                                            %
                                        </b>
                                    </div>

                                    <div className="hs-health-legend-row">
                                        <span className="hs-legend-dot critical" />

                                        <div>
                                            <strong>
                                                {
                                                    criticalAnimals
                                                }
                                            </strong>

                                            <span>
                                                Critical
                                            </span>
                                        </div>

                                        <b>
                                            {
                                                criticalPercentage
                                            }
                                            %
                                        </b>
                                    </div>
                                </div>
                            </div>
                        </article>

                        <article className="hs-panel hs-environment-panel">
                            <div className="hs-panel-header">
                                <div>
                                    <span className="hs-section-kicker">
                                        ENVIRONMENTAL
                                        SIGNAL
                                    </span>

                                    <h2>
                                        Average
                                        temperature
                                    </h2>
                                </div>

                                <span
                                    className={`hs-panel-live ${
                                        temperatureStatus ===
                                        "Critical"
                                            ? "critical"
                                            : temperatureStatus ===
                                              "Elevated"
                                            ? "warning"
                                            : ""
                                    }`}
                                >
                                    {temperatureStatus}
                                </span>
                            </div>

                            <div className="hs-temperature-display">
                                <strong>
                                    {averageTemperature !==
                                    null
                                        ? averageTemperature.toFixed(
                                              1
                                          )
                                        : "—"}
                                </strong>

                                <span>
                                    °C
                                </span>
                            </div>

                            <div className="hs-temperature-scale">
                                <div className="hs-temperature-track">
                                    <div className="hs-temperature-normal" />

                                    <div className="hs-temperature-warning" />

                                    <div className="hs-temperature-critical" />

                                    <i
                                        className="hs-temperature-marker"
                                        style={{
                                            left: `${temperaturePosition}%`,
                                        }}
                                    />
                                </div>

                                <div className="hs-temperature-labels">
                                    <span>
                                        35°C
                                    </span>

                                    <span>
                                        Normal range
                                    </span>

                                    <span>
                                        43°C
                                    </span>
                                </div>
                            </div>

                            <div className="hs-environment-footer">
                                <span>
                                    Aggregated across
                                    monitored animals
                                </span>

                                <strong>
                                    {
                                        registeredAnimals
                                    }{" "}
                                    animals
                                </strong>
                            </div>
                        </article>
                    </section>

                    {/* ============================================================
                        GPS MAP
                       ============================================================ */}

                    <section
                        className="hs-panel hs-map-panel"
                        ref={
                            mapSectionRef
                        }
                    >
                        <div className="hs-panel-header">
                            <div>
                                <span className="hs-section-kicker">
                                    LIVE GPS MONITORING
                                </span>

                                <h2>
                                    Animal locations
                                </h2>
                            </div>

                            <div className="hs-map-header-meta">
                                <span className="hs-map-count">
                                    {
                                        mapAnimals.length
                                    }{" "}
                                    positioned
                                </span>

                                <span
                                    className={`hs-panel-live ${
                                        websocketConnected
                                            ? ""
                                            : "offline"
                                    }`}
                                >
                                    {websocketConnected
                                        ? "LIVE"
                                        : "STANDBY"}
                                </span>
                            </div>
                        </div>

                        <div className="hs-map-container">
                            {mapAnimals.length >
                            0 ? (
                                <MapView
                                    animals={
                                        mapAnimals
                                    }
                                />
                            ) : (
                                <div className="hs-map-empty">
                                    <div className="hs-map-empty-icon">
                                        ◎
                                    </div>

                                    <strong>
                                        No GPS positions
                                        available
                                    </strong>

                                    <span>
                                        Animals with
                                        location
                                        telemetry will
                                        appear here.
                                    </span>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ============================================================
                        LIVE TELEMETRY
                       ============================================================ */}

                    <section className="hs-panel hs-telemetry-panel">
                        <div className="hs-panel-header">
                            <div>
                                <span className="hs-section-kicker">
                                    TELEMETRY
                                </span>

                                <h2>
                                    Live animal signals
                                </h2>
                            </div>

                            <span className="hs-panel-live">
                                {websocketConnected
                                    ? "STREAMING"
                                    : "POLLING"}
                            </span>
                        </div>

                        <div className="hs-table-wrapper">
                            <table className="hs-telemetry-table">
                                <thead>
                                    <tr>
                                        <th>
                                            ANIMAL
                                        </th>

                                        <th>
                                            HEALTH
                                        </th>

                                        <th>
                                            TEMP.
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
                                            LAST UPDATE
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {animalRows.length ===
                                    0 ? (
                                        <tr>
                                            <td
                                                colSpan={
                                                    7
                                                }
                                                className="hs-table-empty"
                                            >
                                                <div>
                                                    <strong>
                                                        {loading
                                                            ? "Loading animal telemetry"
                                                            : "No animals registered"}
                                                    </strong>

                                                    <span>
                                                        {loading
                                                            ? "Synchronizing the latest animal signals."
                                                            : isFarmer &&
                                                              farms.length ===
                                                                  0
                                                            ? "Register a farm and add animals to begin monitoring."
                                                            : "Registered animals will appear here when telemetry is available."}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        animalRows.map(
                                            (
                                                row
                                            ) => (
                                                <tr
                                                    key={
                                                        row.id
                                                    }
                                                >
                                                    <td>
                                                        <button
                                                            className="hs-animal-cell-button"
                                                            type="button"
                                                            onClick={() =>
                                                                navigate(
                                                                    `/animals/${row.id}`
                                                                )
                                                            }
                                                        >
                                                            <span className="hs-animal-avatar">
                                                                {getInitials(
                                                                    row.name
                                                                )}
                                                            </span>

                                                            <span className="hs-animal-cell">
                                                                <strong>
                                                                    {
                                                                        row.name
                                                                    }
                                                                </strong>

                                                                <small>
                                                                    #
                                                                    {
                                                                        row.id
                                                                    }
                                                                </small>
                                                            </span>
                                                        </button>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`hs-health-badge ${row.health}`}
                                                        >
                                                            <i />

                                                            {row.health}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span className="hs-table-value">
                                                            {row.temperature !==
                                                            null
                                                                ? `${row.temperature.toFixed(
                                                                      1
                                                                  )}°C`
                                                                : "—"}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        {row.heartRate !==
                                                        null
                                                            ? `${Math.round(
                                                                  row.heartRate
                                                              )} bpm`
                                                            : "—"}
                                                    </td>

                                                    <td>
                                                        {row.activity !==
                                                        null
                                                            ? Math.round(
                                                                  row.activity
                                                              )
                                                            : "—"}
                                                    </td>

                                                    <td>
                                                        <div className="hs-battery-cell">
                                                            <span>
                                                                {row.battery !==
                                                                null
                                                                    ? `${Math.round(
                                                                          row.battery
                                                                      )}%`
                                                                    : "—"}
                                                            </span>

                                                            {row.battery !==
                                                                null && (
                                                                <div className="hs-battery-bar">
                                                                    <i
                                                                        style={{
                                                                            width: `${Math.min(
                                                                                100,
                                                                                Math.max(
                                                                                    0,
                                                                                    row.battery
                                                                                )
                                                                            )}%`,
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="hs-table-time">
                                                        {formatDate(
                                                            row.timestamp
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* ============================================================
                        ALERT CENTER
                       ============================================================ */}

                    <section className="hs-panel hs-alert-panel">
                        <div className="hs-panel-header">
                            <div>
                                <span className="hs-section-kicker">
                                    ALERT CENTER
                                </span>

                                <h2>
                                    Operational attention
                                </h2>
                            </div>

                            <button
                                className="hs-panel-link"
                                type="button"
                                onClick={() =>
                                    navigate(
                                        "/alerts"
                                    )
                                }
                            >
                                View all alerts
                                <span>→</span>
                            </button>
                        </div>

                        <div className="hs-alert-list">
                            {unresolvedAlerts.length ===
                            0 ? (
                                <div className="hs-alert-empty">
                                    <span className="hs-alert-empty-icon">
                                        ✓
                                    </span>

                                    <div>
                                        <strong>
                                            No unresolved
                                            alerts
                                        </strong>

                                        <span>
                                            All current
                                            operational
                                            conditions are
                                            within the
                                            alert workflow.
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                unresolvedAlerts
                                    .slice(
                                        0,
                                        6
                                    )
                                    .map(
                                        (
                                            alert,
                                            index
                                        ) => {
                                            const severity =
                                                getAlertSeverity(
                                                    alert
                                                );

                                            const animalId =
                                                alert?.animal_id ??
                                                alert?.animalId;

                                            const animal =
                                                animalMap.get(
                                                    String(
                                                        animalId
                                                    )
                                                );

                                            const title =
                                                alert?.title ||
                                                alert?.message ||
                                                alert?.description ||
                                                "Operational alert";

                                            return (
                                                <div
                                                    className="hs-alert-row"
                                                    key={
                                                        alert?.id ??
                                                        `${animalId}-${index}`
                                                    }
                                                >
                                                    <span
                                                        className={`hs-alert-severity ${severity}`}
                                                    />

                                                    <div className="hs-alert-main">
                                                        <strong>
                                                            {
                                                                title
                                                            }
                                                        </strong>

                                                        <span>
                                                            {animal
                                                                ? getAnimalName(
                                                                      animal
                                                                  )
                                                                : animalId
                                                                ? `Animal #${animalId}`
                                                                : "System alert"}
                                                        </span>
                                                    </div>

                                                    <span className="hs-alert-time">
                                                        {formatDate(
                                                            alert?.created_at ||
                                                                alert?.timestamp ||
                                                                alert?.updated_at
                                                        )}
                                                    </span>
                                                </div>
                                            );
                                        }
                                    )
                            )}
                        </div>
                    </section>
                </main>

                {/* ================================================================
                    FOOTER
                   ================================================================ */}

                <footer className="hs-dashboard-footer">
                    <span>
                        HERDSENSE AI
                    </span>

                    <span>
                        Livestock Intelligence
                        Platform
                    </span>

                    <span>
                        <i
                            className={`hs-footer-status ${
                                apiOnline
                                    ? "active"
                                    : ""
                            }`}
                        />

                        System{" "}
                        {apiOnline
                            ? "operational"
                            : "offline"}
                    </span>
                </footer>
            </div>
        </AppShell>
    );
}