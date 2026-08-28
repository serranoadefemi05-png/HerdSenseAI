import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useNavigate,
    useParams,
} from "react-router-dom";

import AppShell from "../components/AppShell";
import api from "../api/api";

import "./AnimalIntelligence.css";

/* ==========================================================================
   HERDSENSE AI
   ANIMAL INTELLIGENCE

   Production individual-animal intelligence interface.

   Responsibilities:
   - Load one authenticated animal
   - Load animal intelligence
   - Load telemetry history
   - Display current physiological state
   - Display intelligence risk factors
   - Display trends
   - Display GPS location
   - Display telemetry history
   - Display Base verification state
   - Auto-refresh intelligence/telemetry
   - Handle authentication failures
   - Preserve existing API architecture

   Important:
   Disease prediction is NOT presented from this page.
   The intelligence endpoint is the rule-based physiological intelligence layer.
========================================================================== */


/* ==========================================================================
   CONFIGURATION
========================================================================== */

const REFRESH_INTERVAL = 30000;


/* ==========================================================================
   SAFE HELPERS
========================================================================== */

function getToken() {
    return localStorage.getItem("access_token");
}


function normalizeArray(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.items)) {
        return data.items;
    }

    if (Array.isArray(data?.data)) {
        return data.data;
    }

    if (Array.isArray(data?.results)) {
        return data.results;
    }

    return [];
}


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

    return null;
}


function getAnimalId(animal) {
    return (
        animal?.id ??
        animal?.animal_id ??
        animal?.animalId ??
        animal?.tag_id ??
        animal?.tagId ??
        null
    );
}


function getAnimalName(animal, intelligence) {
    return (
        animal?.name ??
        animal?.animal_name ??
        animal?.animalName ??
        intelligence?.animal_name ??
        `Animal #${getAnimalId(animal) ?? "—"}`
    );
}


function getSpecies(animal) {
    return (
        animal?.species ??
        animal?.animal_species ??
        animal?.animalSpecies ??
        "Unknown species"
    );
}


function getBreed(animal) {
    return (
        animal?.breed ??
        animal?.breed_name ??
        animal?.breedName ??
        "Breed not specified"
    );
}


function getTagId(animal) {
    return (
        animal?.tag_id ??
        animal?.tagId ??
        animal?.tag ??
        "No tag"
    );
}


function getSex(animal) {
    return (
        animal?.sex ??
        animal?.gender ??
        "Not specified"
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
        reading?.gps?.latitude ??
        reading?.gps?.lat ??
        null
    );
}


function getLongitude(reading) {
    return (
        reading?.longitude ??
        reading?.lng ??
        reading?.lon ??
        reading?.gps?.longitude ??
        reading?.gps?.lng ??
        reading?.gps?.lon ??
        null
    );
}


function getTimestamp(reading) {
    return (
        reading?.timestamp ??
        reading?.created_at ??
        reading?.createdAt ??
        reading?.recorded_at ??
        reading?.recordedAt ??
        reading?.time ??
        null
    );
}


function timestampMs(reading) {
    const value = getTimestamp(reading);

    if (!value) {
        return 0;
    }

    const parsed = new Date(value).getTime();

    return Number.isFinite(parsed)
        ? parsed
        : 0;
}


function formatTimestamp(value) {
    if (!value) {
        return "No signal recorded";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Unknown time";
    }

    return date.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}


function formatRelativeTime(value) {
    if (!value) {
        return "No signal";
    }

    const timestamp = new Date(value).getTime();

    if (!Number.isFinite(timestamp)) {
        return "Unknown";
    }

    const difference = Date.now() - timestamp;

    if (difference < 0) {
        return "Just now";
    }

    const seconds = Math.floor(
        difference / 1000
    );

    if (seconds < 60) {
        return `${seconds}s ago`;
    }

    const minutes = Math.floor(
        seconds / 60
    );

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(
        minutes / 60
    );

    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days = Math.floor(
        hours / 24
    );

    return `${days}d ago`;
}


function formatCoordinate(value) {
    const number = getNumber(value);

    if (number === null) {
        return "Unavailable";
    }

    return number.toFixed(5);
}


function normalizeStatus(value) {
    const status = String(
        value || "Healthy"
    ).toLowerCase();

    if (
        status === "critical" ||
        status === "danger" ||
        status === "dangerous"
    ) {
        return "critical";
    }

    if (
        status === "warning" ||
        status === "caution"
    ) {
        return "warning";
    }

    return "healthy";
}


function displayStatus(value) {
    const normalized = normalizeStatus(value);

    if (normalized === "critical") {
        return "Critical";
    }

    if (normalized === "warning") {
        return "Warning";
    }

    return "Healthy";
}


function trendLabel(value) {
    const trend = String(
        value || ""
    ).toLowerCase();

    if (trend === "increasing") {
        return "Increasing";
    }

    if (trend === "decreasing") {
        return "Decreasing";
    }

    if (trend === "stable") {
        return "Stable";
    }

    return "Insufficient data";
}


function metricClass(
    metric,
    value
) {
    if (value === null || value === undefined) {
        return "normal";
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "normal";
    }

    if (metric === "temperature") {
        if (number >= 41) {
            return "critical";
        }

        if (number >= 39.5) {
            return "warning";
        }
    }

    if (metric === "heart_rate") {
        if (number >= 140) {
            return "critical";
        }

        if (number >= 120) {
            return "warning";
        }
    }

    if (metric === "activity") {
        if (number <= 10) {
            return "critical";
        }

        if (number <= 25) {
            return "warning";
        }
    }

    return "normal";
}


function telemetryAnimalId(record) {
    return (
        record?.animal_id ??
        record?.animalId ??
        record?.animal?.id ??
        null
    );
}


function sortNewestFirst(records) {
    return [...records].sort(
        (a, b) =>
            timestampMs(b) -
            timestampMs(a)
    );
}


function extractErrorMessage(error) {
    return (
        error?.response?.data?.detail ??
        error?.response?.data?.message ??
        error?.message ??
        "Unable to load animal intelligence."
    );
}


/* ==========================================================================
   COMPONENT
========================================================================== */

export default function AnimalIntelligence() {
    const {
        id,
    } = useParams();

    const navigate = useNavigate();


    /* ======================================================================
       STATE
    ====================================================================== */

    const [animal, setAnimal] =
        useState(null);

    const [intelligence, setIntelligence] =
        useState(null);

    const [telemetry, setTelemetry] =
        useState([]);

    const [baseRecord, setBaseRecord] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [apiOnline, setApiOnline] =
        useState(false);

    const [error, setError] =
        useState("");

    const [lastUpdated, setLastUpdated] =
        useState(null);


    /* ======================================================================
       AUTH FAILURE
    ====================================================================== */

    const handleAuthFailure =
        useCallback(() => {
            localStorage.removeItem(
                "access_token"
            );

            localStorage.removeItem(
                "user_role"
            );

            navigate("/login", {
                replace: true,
            });
        }, [navigate]);


    /* ======================================================================
       LOAD ANIMAL INTELLIGENCE
    ====================================================================== */

    const fetchIntelligence =
        useCallback(
            async (
                isRefresh = false
            ) => {
                const token =
                    getToken();

                if (!token) {
                    handleAuthFailure();
                    return false;
                }

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

                try {
                    /*
                     * Individual animal record.
                     */
                    const animalResult =
                        await api.get(
                            `/animals/${id}`,
                            config
                        );


                    /*
                     * Intelligence endpoint.
                     *
                     * Backend contract:
                     * /api/v1/intelligence/animal/{animal_id}
                     */
                    const intelligenceResult =
                        await api.get(
                            `/intelligence/animal/${id}`,
                            config
                        );


                    /*
                     * Telemetry history.
                     */
                    const telemetryResult =
                        await api.get(
                            `/telemetry/animal/${id}`,
                            config
                        );


                    setAnimal(
                        animalResult.data
                    );

                    setIntelligence(
                        intelligenceResult.data
                    );

                    setTelemetry(
                        sortNewestFirst(
                            normalizeArray(
                                telemetryResult.data
                            )
                        )
                    );


                    setApiOnline(true);

                    setLastUpdated(
                        new Date()
                    );

                    return true;

                } catch (err) {
                    console.error(
                        "Animal intelligence fetch error:",
                        err
                    );

                    if (
                        err?.response?.status ===
                        401
                    ) {
                        handleAuthFailure();
                        return false;
                    }

                    setApiOnline(false);

                    setError(
                        extractErrorMessage(err)
                    );

                    return false;

                } finally {
                    setLoading(false);
                    setRefreshing(false);
                }
            },
            [
                id,
                handleAuthFailure,
            ]
        );


    /* ======================================================================
       LOAD BASE RECORD

       This is intentionally independent from intelligence.
       If Base is unavailable, the intelligence page still works.
    ====================================================================== */

    const fetchBaseRecord =
        useCallback(
            async () => {
                const token =
                    getToken();

                if (!token) {
                    return;
                }

                try {
                    const response =
                        await api.get(
                            `/base/animals/${id}/record`,
                            {
                                headers: {
                                    Authorization:
                                        `Bearer ${token}`,
                                },
                            }
                        );

                    setBaseRecord(
                        response.data
                    );

                } catch (err) {
                    /*
                     * Base integration is supplemental.
                     * Do not make animal intelligence fail
                     * because blockchain preparation is unavailable.
                     */

                    if (
                        err?.response?.status ===
                        401
                    ) {
                        handleAuthFailure();
                    }

                    console.warn(
                        "Base animal record unavailable:",
                        err
                    );

                    setBaseRecord(null);
                }
            },
            [
                id,
                handleAuthFailure,
            ]
        );


    /* ======================================================================
       INITIAL LOAD
    ====================================================================== */

    useEffect(() => {
        if (!id) {
            setLoading(false);
            setError(
                "No animal identifier was provided."
            );
            return;
        }

        fetchIntelligence(false);
        fetchBaseRecord();

        const interval =
            setInterval(() => {
                fetchIntelligence(true);
            }, REFRESH_INTERVAL);

        return () => {
            clearInterval(interval);
        };
    }, [
        id,
        fetchIntelligence,
        fetchBaseRecord,
    ]);


    /* ======================================================================
       REFRESH
    ====================================================================== */

    const handleRefresh =
        useCallback(() => {
            fetchIntelligence(true);
            fetchBaseRecord();
        }, [
            fetchIntelligence,
            fetchBaseRecord,
        ]);


    /* ======================================================================
       DERIVED DATA
    ====================================================================== */

    const current =
        intelligence?.current || {};

    const healthScore =
        getNumber(
            intelligence?.health_score
        );

    const riskScore =
        getNumber(
            intelligence?.risk_score
        );

    const healthStatus =
        intelligence?.health_status ||
        animal?.health_status ||
        "Healthy";

    const statusClass =
        normalizeStatus(
            healthStatus
        );

    const currentTemperature =
        getNumber(
            current.temperature
        );

    const currentHeartRate =
        getNumber(
            current.heart_rate
        );

    const currentActivity =
        getNumber(
            current.activity
        );

    const currentBattery =
        getNumber(
            current.battery
        );

    const currentLatitude =
        getLatitude(current);

    const currentLongitude =
        getLongitude(current);

    const currentTimestamp =
        current.timestamp;


    const recentTelemetry =
        useMemo(() => {
            return sortNewestFirst(
                telemetry
            ).slice(0, 20);
        }, [telemetry]);


    const latestTelemetry =
        recentTelemetry[0] || null;


    /*
     * Intelligence current telemetry is the
     * authoritative current reading.
     *
     * The fallback to latestTelemetry protects
     * against a temporarily incomplete intelligence
     * response.
     */
    const effectiveTemperature =
        currentTemperature ??
        getTemperature(
            latestTelemetry
        );

    const effectiveHeartRate =
        currentHeartRate ??
        getHeartRate(
            latestTelemetry
        );

    const effectiveActivity =
        currentActivity ??
        getActivity(
            latestTelemetry
        );

    const effectiveBattery =
        currentBattery ??
        getBattery(
            latestTelemetry
        );

    const effectiveLatitude =
        currentLatitude ??
        getLatitude(
            latestTelemetry
        );

    const effectiveLongitude =
        currentLongitude ??
        getLongitude(
            latestTelemetry
        );

    const effectiveTimestamp =
        currentTimestamp ??
        getTimestamp(
            latestTelemetry
        );


    const animalName =
        getAnimalName(
            animal,
            intelligence
        );

    const species =
        getSpecies(animal);

    const breed =
        getBreed(animal);

    const tagId =
        getTagId(animal);

    const sex =
        getSex(animal);


    const trends =
        intelligence?.trend || {};


    const riskFactors =
        Array.isArray(
            intelligence?.risk_factors
        )
            ? intelligence.risk_factors
            : [];


    const recommendation =
        intelligence?.recommendation ||
        "Continue monitoring the animal's current physiological signals.";


    const dataStatus =
        intelligence?.data_status ||
        "insufficient_data";


    const telemetryCount =
        getNumber(
            intelligence?.telemetry_count
        ) ?? recentTelemetry.length;


    const healthDescription =
        statusClass === "critical"
            ? "Current telemetry indicates a critical physiological condition requiring immediate attention."
            : statusClass === "warning"
                ? "Current telemetry shows deviations that require closer monitoring."
                : "Current physiological signals are within the configured healthy range.";


    const signalDescription =
        dataStatus === "sufficient"
            ? `${telemetryCount} telemetry records are available for intelligence analysis.`
            : dataStatus === "limited"
                ? `${telemetryCount} telemetry record${telemetryCount === 1 ? "" : "s"} available. More history will improve trend confidence.`
                : "No usable telemetry history is currently available.";


    const baseNetwork =
        baseRecord?.network ??
        baseRecord?.blockchain ??
        null;


    const baseHash =
        baseRecord?.data_hash ??
        null;


    /* ======================================================================
       LOADING
    ====================================================================== */

    if (loading && !animal && !intelligence) {
        return (
            <AppShell>
                <main className="intelligence-page">
                    <div className="intelligence-loading">
                        <div className="intelligence-loading-mark">
                            AI
                        </div>

                        <strong>
                            Loading animal intelligence
                        </strong>

                        <span>
                            Synchronizing animal profile, telemetry and health signals.
                        </span>
                    </div>
                </main>
            </AppShell>
        );
    }


    /* ======================================================================
       NOT FOUND / INVALID STATE
    ====================================================================== */

    if (
        !animal &&
        !intelligence
    ) {
        return (
            <AppShell>
                <main className="intelligence-page">
                    <section className="intelligence-empty">

                        <div className="intelligence-empty-mark">
                            !
                        </div>

                        <h1>
                            Animal unavailable
                        </h1>

                        <p>
                            HerdSense AI could not load the requested animal intelligence record.
                        </p>

                        {error && (
                            <p>
                                {error}
                            </p>
                        )}

                        <button
                            type="button"
                            className="intelligence-primary-button"
                            onClick={() =>
                                navigate("/animals")
                            }
                        >
                            Back to animals
                        </button>

                    </section>
                </main>
            </AppShell>
        );
    }


    /* ======================================================================
       RENDER
    ====================================================================== */

    return (
        <AppShell>

            <main className="intelligence-page">

                {/* ==========================================================
                    HEADER
                ========================================================== */}

                <header className="intelligence-header">

                    <div>

                        <button
                            type="button"
                            className="intelligence-back-button"
                            onClick={() =>
                                navigate("/animals")
                            }
                        >
                            ← Animals
                        </button>

                        <span className="intelligence-eyebrow">
                            INDIVIDUAL ANIMAL INTELLIGENCE
                        </span>

                        <h1>
                            {animalName}
                        </h1>

                        <p>
                            Real-time physiological intelligence,
                            telemetry history and operational signals
                            for this animal.
                        </p>

                    </div>


                    <div className="intelligence-header-actions">

                        <div
                            className={`intelligence-api-status ${
                                apiOnline
                                    ? "online"
                                    : "offline"
                            }`}
                        >
                            <span />

                            {apiOnline
                                ? "API CONNECTED"
                                : "API OFFLINE"}
                        </div>


                        <button
                            type="button"
                            className="intelligence-refresh-button"
                            onClick={
                                handleRefresh
                            }
                            disabled={
                                refreshing
                            }
                        >
                            {refreshing
                                ? "Refreshing..."
                                : "Refresh"}
                        </button>

                    </div>

                </header>


                {/* ==========================================================
                    ERROR
                ========================================================== */}

                {error && (
                    <div className="intelligence-error">

                        <strong>
                            Connection issue
                        </strong>

                        <span>
                            {error}
                        </span>

                    </div>
                )}


                {/* ==========================================================
                    OVERVIEW
                ========================================================== */}

                <section className="intelligence-overview">

                    {/* ------------------------------------------------------
                        IDENTITY
                    ------------------------------------------------------ */}

                    <article className="intelligence-identity-card">

                        <div className="intelligence-animal-avatar">
                            {animalName
                                .charAt(0)
                                .toUpperCase()}
                        </div>

                        <div>

                            <span className="intelligence-label">
                                {species}
                            </span>

                            <strong>
                                {animalName}
                            </strong>

                            <small>
                                {tagId}
                            </small>

                        </div>

                    </article>


                    {/* ------------------------------------------------------
                        HEALTH
                    ------------------------------------------------------ */}

                    <article
                        className={`intelligence-health-card ${statusClass}`}
                    >

                        <span className="intelligence-label">
                            CURRENT HEALTH STATE
                        </span>

                        <div className="intelligence-health-row">

                            <div
                                className={`intelligence-status ${statusClass}`}
                            >
                                <span>
                                    {statusClass === "critical"
                                        ? "!"
                                        : statusClass === "warning"
                                            ? "!"
                                            : "✓"}
                                </span>

                                {displayStatus(
                                    healthStatus
                                )}
                            </div>

                        </div>

                        <p>
                            {healthDescription}
                        </p>

                    </article>


                    {/* ------------------------------------------------------
                        SIGNAL
                    ------------------------------------------------------ */}

                    <article className="intelligence-signal-card">

                        <span className="intelligence-label">
                            DATA SIGNAL
                        </span>

                        <strong>
                            {formatRelativeTime(
                                effectiveTimestamp
                            )}
                        </strong>

                        <small>
                            Last telemetry signal
                        </small>

                    </article>

                </section>


                {/* ==========================================================
                    CORE METRICS
                ========================================================== */}

                <section className="intelligence-section">

                    <div className="intelligence-section-heading">

                        <div>
                            <h2>
                                Physiological signals
                            </h2>

                            <p>
                                Current measurements from the latest available telemetry.
                            </p>
                        </div>

                        <div className="intelligence-live-badge">
                            <span />
                            LIVE SIGNAL
                        </div>

                    </div>


                    <div className="intelligence-metrics-grid">

                        {/* --------------------------------------------------
                            TEMPERATURE
                        -------------------------------------------------- */}

                        <article className="intelligence-metric-card">

                            <span className="intelligence-label">
                                BODY TEMPERATURE
                            </span>

                            <strong
                                className={metricClass(
                                    "temperature",
                                    effectiveTemperature
                                )}
                            >
                                {effectiveTemperature !== null
                                    ? effectiveTemperature.toFixed(1)
                                    : "—"}

                                <span className="metric-unit">
                                    °C
                                </span>
                            </strong>

                            <small>
                                Trend:{" "}
                                {trendLabel(
                                    trends.temperature
                                )}
                            </small>

                        </article>


                        {/* --------------------------------------------------
                            HEART RATE
                        -------------------------------------------------- */}

                        <article className="intelligence-metric-card">

                            <span className="intelligence-label">
                                HEART RATE
                            </span>

                            <strong
                                className={metricClass(
                                    "heart_rate",
                                    effectiveHeartRate
                                )}
                            >
                                {effectiveHeartRate !== null
                                    ? Math.round(
                                        effectiveHeartRate
                                    )
                                    : "—"}

                                <span className="metric-unit">
                                    BPM
                                </span>
                            </strong>

                            <small>
                                Trend:{" "}
                                {trendLabel(
                                    trends.heart_rate
                                )}
                            </small>

                        </article>


                        {/* --------------------------------------------------
                            ACTIVITY
                        -------------------------------------------------- */}

                        <article className="intelligence-metric-card">

                            <span className="intelligence-label">
                                ACTIVITY
                            </span>

                            <strong
                                className={metricClass(
                                    "activity",
                                    effectiveActivity
                                )}
                            >
                                {effectiveActivity !== null
                                    ? Math.round(
                                        effectiveActivity
                                    )
                                    : "—"}

                                <span className="metric-unit">
                                    %
                                </span>
                            </strong>

                            <small>
                                Trend:{" "}
                                {trendLabel(
                                    trends.activity
                                )}
                            </small>

                        </article>


                        {/* --------------------------------------------------
                            BATTERY
                        -------------------------------------------------- */}

                        <article className="intelligence-metric-card">

                            <span className="intelligence-label">
                                DEVICE BATTERY
                            </span>

                            <strong
                                className={
                                    effectiveBattery !== null &&
                                    effectiveBattery < 20
                                        ? "warning"
                                        : "normal"
                                }
                            >
                                {effectiveBattery !== null
                                    ? Math.round(
                                        effectiveBattery
                                    )
                                    : "—"}

                                <span className="metric-unit">
                                    %
                                </span>
                            </strong>

                            <div className="intelligence-battery-track">

                                <div
                                    className={`intelligence-battery-fill ${
                                        effectiveBattery !== null &&
                                        effectiveBattery < 20
                                            ? "low"
                                            : ""
                                    }`}
                                    style={{
                                        width: `${Math.max(
                                            0,
                                            Math.min(
                                                100,
                                                effectiveBattery ?? 0
                                            )
                                        )}%`,
                                    }}
                                />

                            </div>

                            <small>
                                Device signal power
                            </small>

                        </article>

                    </div>

                </section>


                {/* ==========================================================
                    INTELLIGENCE + LOCATION
                ========================================================== */}

                <section className="intelligence-two-column">

                    {/* ------------------------------------------------------
                        INTELLIGENCE FINDINGS
                    ------------------------------------------------------ */}

                    <article className="intelligence-panel">

                        <div className="intelligence-panel-header">

                            <div>

                                <span className="intelligence-eyebrow">
                                    AI SIGNAL ANALYSIS
                                </span>

                                <h2>
                                    Intelligence findings
                                </h2>

                                <p>
                                    Automated interpretation of the animal's current physiological signals.
                                </p>

                            </div>

                        </div>


                        <div className="intelligence-findings">

                            {riskFactors.length > 0 ? (
                                riskFactors.map(
                                    (factor, index) => {

                                        const severity =
                                            normalizeStatus(
                                                factor?.severity
                                            );

                                        return (
                                            <div
                                                className={`intelligence-finding ${severity}`}
                                                key={`${factor?.signal || "finding"}-${index}`}
                                            >

                                                <div className="intelligence-finding-icon">
                                                    {severity === "critical"
                                                        ? "!"
                                                        : severity === "warning"
                                                            ? "!"
                                                            : "✓"}
                                                </div>

                                                <div>

                                                    <strong>
                                                        {factor?.signal
                                                            ? String(
                                                                factor.signal
                                                            )
                                                                .replaceAll(
                                                                    "_",
                                                                    " "
                                                                )
                                                                .replace(
                                                                    /^\w/,
                                                                    (letter) =>
                                                                        letter.toUpperCase()
                                                                )
                                                            : "Signal finding"}
                                                    </strong>

                                                    <span>
                                                        {factor?.message ||
                                                            "A telemetry deviation has been detected."}
                                                    </span>

                                                </div>

                                            </div>
                                        );
                                    }
                                )
                            ) : (
                                <div className="intelligence-finding healthy">

                                    <div className="intelligence-finding-icon">
                                        ✓
                                    </div>

                                    <div>

                                        <strong>
                                            No active risk factors
                                        </strong>

                                        <span>
                                            Current telemetry does not contain any configured physiological risk signals.
                                        </span>

                                    </div>

                                </div>
                            )}


                            {/* ------------------------------------------------
                                RECOMMENDATION
                            ------------------------------------------------ */}

                            <div className="intelligence-finding healthy">

                                <div className="intelligence-finding-icon">
                                    →
                                </div>

                                <div>

                                    <strong>
                                        Recommended action
                                    </strong>

                                    <span>
                                        {recommendation}
                                    </span>

                                </div>

                            </div>

                        </div>

                    </article>


                    {/* ------------------------------------------------------
                        LOCATION
                    ------------------------------------------------------ */}

                    <article className="intelligence-panel">

                        <div className="intelligence-panel-header">

                            <div>

                                <span className="intelligence-eyebrow">
                                    LIVE LOCATION
                                </span>

                                <h2>
                                    Animal position
                                </h2>

                                <p>
                                    Latest GPS coordinates reported by telemetry.
                                </p>

                            </div>

                        </div>


                        <div className="intelligence-location">

                            <div>

                                <span>
                                    LATITUDE
                                </span>

                                <strong>
                                    {formatCoordinate(
                                        effectiveLatitude
                                    )}
                                </strong>

                            </div>


                            <div>

                                <span>
                                    LONGITUDE
                                </span>

                                <strong>
                                    {formatCoordinate(
                                        effectiveLongitude
                                    )}
                                </strong>

                            </div>

                        </div>


                        <div className="intelligence-location-footer">

                            {effectiveLatitude !== null &&
                            effectiveLongitude !== null
                                ? "GPS position available from the latest telemetry signal."
                                : "GPS coordinates are not currently available for this animal."}

                        </div>

                    </article>

                </section>


                {/* ==========================================================
                    TELEMETRY HISTORY
                ========================================================== */}

                <section className="intelligence-section intelligence-history-panel">

                    <div className="intelligence-section-heading">

                        <div>

                            <h2>
                                Telemetry history
                            </h2>

                            <p>
                                Recent physiological and device signals for this animal.
                            </p>

                        </div>

                        <div className="intelligence-live-badge">
                            <span />
                            {telemetryCount} RECORDS
                        </div>

                    </div>


                    <div className="intelligence-panel">

                        <div className="intelligence-history-table-wrapper">

                            <table className="intelligence-history-table">

                                <thead>

                                    <tr>

                                        <th>
                                            Timestamp
                                        </th>

                                        <th>
                                            Temperature
                                        </th>

                                        <th>
                                            Heart rate
                                        </th>

                                        <th>
                                            Activity
                                        </th>

                                        <th>
                                            Battery
                                        </th>

                                        <th>
                                            Position
                                        </th>

                                    </tr>

                                </thead>


                                <tbody>

                                    {recentTelemetry.length > 0 ? (
                                        recentTelemetry.map(
                                            (
                                                record,
                                                index
                                            ) => {

                                                const temperature =
                                                    getTemperature(
                                                        record
                                                    );

                                                const heartRate =
                                                    getHeartRate(
                                                        record
                                                    );

                                                const activity =
                                                    getActivity(
                                                        record
                                                    );

                                                const battery =
                                                    getBattery(
                                                        record
                                                    );

                                                const latitude =
                                                    getLatitude(
                                                        record
                                                    );

                                                const longitude =
                                                    getLongitude(
                                                        record
                                                    );

                                                return (
                                                    <tr
                                                        key={
                                                            record?.id ??
                                                            `${timestampMs(record)}-${index}`
                                                        }
                                                    >

                                                        <td>
                                                            {formatTimestamp(
                                                                getTimestamp(
                                                                    record
                                                                )
                                                            )}
                                                        </td>


                                                        <td
                                                            className={metricClass(
                                                                "temperature",
                                                                temperature
                                                            )}
                                                        >
                                                            {temperature !== null
                                                                ? `${temperature.toFixed(1)}°C`
                                                                : "—"}
                                                        </td>


                                                        <td
                                                            className={metricClass(
                                                                "heart_rate",
                                                                heartRate
                                                            )}
                                                        >
                                                            {heartRate !== null
                                                                ? `${Math.round(
                                                                    heartRate
                                                                )} BPM`
                                                                : "—"}
                                                        </td>


                                                        <td
                                                            className={metricClass(
                                                                "activity",
                                                                activity
                                                            )}
                                                        >
                                                            {activity !== null
                                                                ? `${Math.round(
                                                                    activity
                                                                )}%`
                                                                : "—"}
                                                        </td>


                                                        <td>
                                                            {battery !== null
                                                                ? `${Math.round(
                                                                    battery
                                                                )}%`
                                                                : "—"}
                                                        </td>


                                                        <td>
                                                            {latitude !== null &&
                                                            longitude !== null
                                                                ? `${Number(
                                                                    latitude
                                                                ).toFixed(
                                                                    3
                                                                )}, ${Number(
                                                                    longitude
                                                                ).toFixed(
                                                                    3
                                                                )}`
                                                                : "Unavailable"}
                                                        </td>

                                                    </tr>
                                                );
                                            }
                                        )
                                    ) : (
                                        <tr>

                                            <td
                                                colSpan="6"
                                                className="intelligence-history-empty"
                                            >
                                                No telemetry history is available for this animal.
                                            </td>

                                        </tr>
                                    )}

                                </tbody>

                            </table>

                        </div>

                    </div>

                </section>


                {/* ==========================================================
                    OPERATIONAL SUMMARY
                ========================================================== */}

                <section className="intelligence-section">

                    <div className="intelligence-section-heading">

                        <div>

                            <h2>
                                Intelligence summary
                            </h2>

                            <p>
                                Operational state derived from the current intelligence report.
                            </p>

                        </div>

                    </div>


                    <div className="intelligence-metrics-grid">

                        {/* --------------------------------------------------
                            HEALTH SCORE
                        -------------------------------------------------- */}

                        <article className="intelligence-metric-card">

                            <span className="intelligence-label">
                                HEALTH SCORE
                            </span>

                            <strong
                                className={
                                    healthScore !== null &&
                                    healthScore <= 40
                                        ? "critical"
                                        : healthScore !== null &&
                                          healthScore <= 65
                                            ? "warning"
                                            : "normal"
                                }
                            >
                                {healthScore !== null
                                    ? Math.round(
                                        healthScore
                                    )
                                    : "—"}

                                <span className="metric-unit">
                                    /100
                                </span>
                            </strong>

                            <small>
                                Physiological signal score
                            </small>

                        </article>


                        {/* --------------------------------------------------
                            RISK SCORE
                        -------------------------------------------------- */}

                        <article className="intelligence-metric-card">

                            <span className="intelligence-label">
                                RISK SCORE
                            </span>

                            <strong
                                className={
                                    riskScore !== null &&
                                    riskScore >= 60
                                        ? "critical"
                                        : riskScore !== null &&
                                          riskScore >= 35
                                            ? "warning"
                                            : "normal"
                                }
                            >
                                {riskScore !== null
                                    ? Math.round(
                                        riskScore
                                    )
                                    : "—"}

                                <span className="metric-unit">
                                    /100
                                </span>
                            </strong>

                            <small>
                                Derived physiological risk
                            </small>

                        </article>


                        {/* --------------------------------------------------
                            DATA STATUS
                        -------------------------------------------------- */}

                        <article className="intelligence-metric-card">

                            <span className="intelligence-label">
                                DATA QUALITY
                            </span>

                            <strong className="normal">
                                {dataStatus === "sufficient"
                                    ? "Good"
                                    : dataStatus === "limited"
                                        ? "Limited"
                                        : "Insufficient"}
                            </strong>

                            <small>
                                {signalDescription}
                            </small>

                        </article>


                        {/* --------------------------------------------------
                            LAST SIGNAL
                        -------------------------------------------------- */}

                        <article className="intelligence-metric-card">

                            <span className="intelligence-label">
                                LAST SIGNAL
                            </span>

                            <strong className="normal">
                                {formatRelativeTime(
                                    effectiveTimestamp
                                )}
                            </strong>

                            <small>
                                {formatTimestamp(
                                    effectiveTimestamp
                                )}
                            </small>

                        </article>

                    </div>

                </section>


                {/* ==========================================================
                    ANIMAL PROFILE
                ========================================================== */}

                <section className="intelligence-section">

                    <div className="intelligence-section-heading">

                        <div>

                            <h2>
                                Animal profile
                            </h2>

                            <p>
                                Registered identity information associated with this intelligence record.
                            </p>

                        </div>

                    </div>


                    <div className="intelligence-panel">

                        <div className="intelligence-location">

                            <div>

                                <span>
                                    ANIMAL
                                </span>

                                <strong>
                                    {animalName}
                                </strong>

                            </div>


                            <div>

                                <span>
                                    TAG ID
                                </span>

                                <strong>
                                    {tagId}
                                </strong>

                            </div>


                            <div>

                                <span>
                                    SPECIES
                                </span>

                                <strong>
                                    {species}
                                </strong>

                            </div>


                            <div>

                                <span>
                                    BREED
                                </span>

                                <strong>
                                    {breed}
                                </strong>

                            </div>


                            <div>

                                <span>
                                    SEX
                                </span>

                                <strong>
                                    {sex}
                                </strong>

                            </div>


                            <div>

                                <span>
                                    RECORD ID
                                </span>

                                <strong>
                                    #{getAnimalId(animal) ?? id}
                                </strong>

                            </div>

                        </div>

                    </div>

                </section>


                {/* ==========================================================
                    BASE BLOCKCHAIN STATE
                ========================================================== */}

                <section className="intelligence-section">

                    <div className="intelligence-section-heading">

                        <div>

                            <h2>
                                Digital identity
                            </h2>

                            <p>
                                HerdSense AI Base integration state for this animal.
                            </p>

                        </div>

                    </div>


                    <div className="intelligence-panel">

                        <div className="intelligence-location">

                            <div>

                                <span>
                                    NETWORK
                                </span>

                                <strong>
                                    {baseNetwork ||
                                        "Not prepared"}
                                </strong>

                            </div>


                            <div>

                                <span>
                                    ONCHAIN DATA
                                </span>

                                <strong>
                                    {baseHash
                                        ? "Prepared"
                                        : "Not prepared"}
                                </strong>

                            </div>

                        </div>


                        <div className="intelligence-location-footer">

                            {baseHash
                                ? `Blockchain data fingerprint: ${baseHash}`
                                : "This animal does not currently have a prepared Base blockchain record."}

                        </div>

                    </div>

                </section>


                {/* ==========================================================
                    FOOTER ACTIONS
                ========================================================== */}

                <footer className="intelligence-footer-actions">

                    <button
                        type="button"
                        className="intelligence-secondary-button"
                        onClick={() =>
                            navigate("/telemetry")
                        }
                    >
                        Open telemetry
                    </button>


                    <button
                        type="button"
                        className="intelligence-secondary-button"
                        onClick={() =>
                            navigate("/manual-telemetry")
                        }
                    >
                        Add manual reading
                    </button>


                    <button
                        type="button"
                        className="intelligence-primary-button"
                        onClick={() =>
                            navigate("/animals")
                        }
                    >
                        Back to animals
                    </button>

                </footer>


                {/* ==========================================================
                    SYSTEM FOOTNOTE
                ========================================================== */}

                <div
                    style={{
                        marginTop: "18px",
                        color:
                            "var(--intelligence-text-muted)",
                        fontSize: "10px",
                        lineHeight: 1.5,
                        textAlign: "right",
                    }}
                >
                    {lastUpdated
                        ? `Intelligence synchronized ${formatRelativeTime(
                            lastUpdated
                        )}.`
                        : "Intelligence synchronization pending."}
                </div>

            </main>

        </AppShell>
    );
}