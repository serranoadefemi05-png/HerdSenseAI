/* ==========================================================================
   HERDSENSE AI — ANIMALS
   Global enterprise command-center interface
   ========================================================================== */

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

import AppShell from "../components/AppShell";
import api from "../api/api";

import "./Animals.css";

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

const REFRESH_INTERVAL = 15000;

const THRESHOLDS = {
    temperatureCritical: 41.0,
    temperatureWarning: 39.5,

    heartRateCritical: 140,
    heartRateWarning: 120,

    activityCritical: 10,
    activityWarning: 25,
};

const BATTERY_THRESHOLDS = {
    critical: 20,
    warning: 35,
};

/* ==========================================================================
   HELPERS
   ========================================================================== */

function getToken() {
    return localStorage.getItem("access_token");
}

function firstDefined(...values) {
    return values.find(
        (value) =>
            value !== undefined &&
            value !== null &&
            value !== ""
    );
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

function toNumber(value, fallback = 0) {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}

function formatNumber(value, decimals = 0) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return number.toFixed(decimals);
}

function formatDate(value) {
    if (!value) {
        return "No signal";
    }

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

function getAnimalName(animal) {
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

function getAnimalSpecies(animal) {
    return (
        firstDefined(
            animal?.species,
            animal?.animal_type,
            animal?.animalType,
            animal?.type
        ) || "Livestock"
    );
}

function getTelemetryAnimalId(item) {
    return firstDefined(
        item?.animal_id,
        item?.animalId,
        item?.animal?.id
    );
}

function getTemperature(animal, telemetry) {
    return toNumber(
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
    return toNumber(
        firstDefined(
            telemetry?.heart_rate,
            telemetry?.heartRate,
            animal?.heart_rate,
            animal?.heartRate
        )
    );
}

function getActivity(animal, telemetry) {
    return toNumber(
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
    return toNumber(
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

function getLastSignal(animal, telemetry) {
    return firstDefined(
        telemetry?.recorded_at,
        telemetry?.timestamp,
        telemetry?.created_at,
        telemetry?.createdAt,
        telemetry?.time,
        animal?.last_signal,
        animal?.lastSignal,
        animal?.updated_at,
        animal?.updatedAt
    );
}

function hasGps(latitude, longitude) {
    return (
        latitude !== undefined &&
        latitude !== null &&
        latitude !== "" &&
        longitude !== undefined &&
        longitude !== null &&
        longitude !== ""
    );
}

/* ==========================================================================
   HEALTH STATUS
   ========================================================================== */

function calculateHealthStatus(animal, telemetry) {
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

/* ==========================================================================
   STATUS BADGE
   ========================================================================== */

function StatusBadge({ status }) {
    const config = {
        healthy: {
            label: "Healthy",
            icon: "✓",
        },

        warning: {
            label: "Warning",
            icon: "!",
        },

        critical: {
            label: "Critical",
            icon: "!",
        },
    };

    const item =
        config[status] || config.healthy;

    return (
        <span
            className={`animal-status animal-status-${status}`}
        >
            <span className="animal-status-icon">
                {item.icon}
            </span>

            <span>
                {item.label}
            </span>
        </span>
    );
}

/* ==========================================================================
   METRIC STATUS
   ========================================================================== */

function getMetricStatus(
    value,
    critical,
    warning,
    inverse = false
) {
    if (inverse) {
        if (value <= critical) {
            return "critical";
        }

        if (value <= warning) {
            return "warning";
        }

        return "normal";
    }

    if (value >= critical) {
        return "critical";
    }

    if (value >= warning) {
        return "warning";
    }

    return "normal";
}

/* ==========================================================================
   COMPONENT
   ========================================================================== */

export default function Animals() {
    const navigate = useNavigate();
    const location = useLocation();

    const [animals, setAnimals] = useState([]);
    const [telemetry, setTelemetry] = useState([]);

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [apiOnline, setApiOnline] =
        useState(false);

    const [error, setError] =
        useState("");

    const [registrationNotice, setRegistrationNotice] =
        useState("");

    const [search, setSearch] =
        useState("");

    const [statusFilter, setStatusFilter] =
        useState("all");

    const [selectedAnimal, setSelectedAnimal] =
        useState(null);

    const [deleteTarget, setDeleteTarget] =
        useState(null);

    const [deleting, setDeleting] =
        useState(false);

    const [deleteError, setDeleteError] =
        useState("");

    /* ======================================================================
       AUTH FAILURE
       ====================================================================== */

    const handleAuthFailure =
        useCallback(() => {
            localStorage.removeItem(
                "access_token"
            );

            navigate("/login", {
                replace: true,
            });
        }, [navigate]);

    /* ======================================================================
       FETCH DATA
       ====================================================================== */

    const fetchAnimals = useCallback(
        async (isRefresh = false) => {
            const token = getToken();

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

                const config = {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                };

                const [
                    animalsResult,
                    telemetryResult,
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
                    ]);

                const animalsFailed =
                    animalsResult.status ===
                    "rejected";

                const telemetryFailed =
                    telemetryResult.status ===
                    "rejected";

                const animalsUnauthorized =
                    animalsFailed &&
                    animalsResult.reason
                        ?.response
                        ?.status === 401;

                const telemetryUnauthorized =
                    telemetryFailed &&
                    telemetryResult.reason
                        ?.response
                        ?.status === 401;

                if (
                    animalsUnauthorized ||
                    telemetryUnauthorized
                ) {
                    handleAuthFailure();
                    return;
                }

                if (
                    animalsResult.status ===
                    "fulfilled"
                ) {
                    setAnimals(
                        normalizeArray(
                            animalsResult
                                .value.data
                        )
                    );
                }

                if (
                    telemetryResult.status ===
                    "fulfilled"
                ) {
                    setTelemetry(
                        normalizeArray(
                            telemetryResult
                                .value.data
                        )
                    );
                }

                const connected =
                    animalsResult.status ===
                        "fulfilled" ||
                    telemetryResult.status ===
                        "fulfilled";

                setApiOnline(connected);

                if (!connected) {
                    setError(
                        "Unable to connect to the HerdSense API."
                    );
                } else if (
                    animalsFailed &&
                    telemetryFailed
                ) {
                    setError(
                        "Animal and telemetry services are currently unavailable."
                    );
                } else if (animalsFailed) {
                    setError(
                        "Animal registry could not be refreshed."
                    );
                } else if (telemetryFailed) {
                    setError(
                        "Telemetry could not be refreshed. Showing the latest animal records."
                    );
                }
            } catch (err) {
                console.error(
                    "Animals fetch error:",
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
                    "Unable to load animal data."
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [handleAuthFailure]
    );

    /* ======================================================================
       REGISTRATION SUCCESS HANDLING
       ====================================================================== */

    useEffect(() => {
        const state =
            location.state;

        if (
            !state?.animalCreated ||
            !state?.animal
        ) {
            return;
        }

        const createdAnimal =
            state.animal;

        const createdId =
            getAnimalId(
                createdAnimal
            );

        /*
         * Optimistically insert the newly
         * created animal immediately.
         *
         * The subsequent API refresh remains
         * the source of truth.
         */

        if (
            createdId !== undefined &&
            createdId !== null
        ) {
            setAnimals(
                (current) => {
                    const alreadyExists =
                        current.some(
                            (animal) =>
                                String(
                                    getAnimalId(
                                        animal
                                    )
                                ) ===
                                String(
                                    createdId
                                )
                        );

                    if (
                        alreadyExists
                    ) {
                        return current;
                    }

                    return [
                        createdAnimal,
                        ...current,
                    ];
                }
            );
        }

        setRegistrationNotice(
            `${getAnimalName(
                createdAnimal
            )} was registered successfully and added to the animal registry.`
        );

        /*
         * Remove router state so that refreshing
         * the page does not display the same
         * registration notice again.
         */

        navigate(
            location.pathname,
            {
                replace: true,
                state: {},
            }
        );

        /*
         * Immediately synchronize with the
         * backend rather than waiting for the
         * 15-second polling interval.
         */

        fetchAnimals(true);

        const timer =
            setTimeout(() => {
                setRegistrationNotice("");
            }, 5000);

        return () => {
            clearTimeout(timer);
        };
    }, [
        location.pathname,
        location.state,
        navigate,
        fetchAnimals,
    ]);

    /* ======================================================================
       INITIAL LOAD + AUTO REFRESH
       ====================================================================== */

    useEffect(() => {
        fetchAnimals();

        const interval =
            setInterval(() => {
                fetchAnimals(true);
            }, REFRESH_INTERVAL);

        return () => {
            clearInterval(interval);
        };
    }, [fetchAnimals]);

    /* ======================================================================
       MERGE ANIMALS + TELEMETRY
       ====================================================================== */

    const animalRows = useMemo(() => {
        const telemetryByAnimal =
            new Map();

        telemetry.forEach((item) => {
            const telemetryAnimalId =
                getTelemetryAnimalId(item);

            if (
                telemetryAnimalId ===
                    undefined ||
                telemetryAnimalId === null
            ) {
                return;
            }

            const key =
                String(
                    telemetryAnimalId
                );

            const existing =
                telemetryByAnimal.get(
                    key
                );

            if (!existing) {
                telemetryByAnimal.set(
                    key,
                    item
                );

                return;
            }

            const existingDate =
                new Date(
                    getLastSignal(
                        {},
                        existing
                    ) || 0
                ).getTime();

            const currentDate =
                new Date(
                    getLastSignal(
                        {},
                        item
                    ) || 0
                ).getTime();

            if (
                currentDate >=
                existingDate
            ) {
                telemetryByAnimal.set(
                    key,
                    item
                );
            }
        });

        return animals.map((animal) => {
            const animalId =
                getAnimalId(animal);

            const matchingTelemetry =
                telemetryByAnimal.get(
                    String(animalId)
                ) || {};

            const temperature =
                getTemperature(
                    animal,
                    matchingTelemetry
                );

            const heartRate =
                getHeartRate(
                    animal,
                    matchingTelemetry
                );

            const activity =
                getActivity(
                    animal,
                    matchingTelemetry
                );

            const battery =
                getBattery(
                    animal,
                    matchingTelemetry
                );

            const latitude =
                getLatitude(
                    animal,
                    matchingTelemetry
                );

            const longitude =
                getLongitude(
                    animal,
                    matchingTelemetry
                );

            return {
                animal,
                telemetry:
                    matchingTelemetry,

                id: animalId,

                name:
                    getAnimalName(
                        animal
                    ),

                species:
                    getAnimalSpecies(
                        animal
                    ),

                temperature,
                heartRate,
                activity,
                battery,
                latitude,
                longitude,

                status:
                    calculateHealthStatus(
                        animal,
                        matchingTelemetry
                    ),

                lastSignal:
                    getLastSignal(
                        animal,
                        matchingTelemetry
                    ),
            };
        });
    }, [animals, telemetry]);

    /* ======================================================================
       FILTERING
       ====================================================================== */

    const filteredAnimals = useMemo(() => {
        const query =
            search
                .trim()
                .toLowerCase();

        return animalRows.filter(
            (animal) => {
                const matchesSearch =
                    !query ||
                    String(animal.name)
                        .toLowerCase()
                        .includes(query) ||
                    String(animal.id)
                        .toLowerCase()
                        .includes(query) ||
                    String(animal.species)
                        .toLowerCase()
                        .includes(query);

                const matchesStatus =
                    statusFilter === "all" ||
                    animal.status ===
                        statusFilter;

                return (
                    matchesSearch &&
                    matchesStatus
                );
            }
        );
    }, [
        animalRows,
        search,
        statusFilter,
    ]);

    /* ======================================================================
       SUMMARY
       ====================================================================== */

    const summary = useMemo(() => {
        return {
            total: animalRows.length,

            healthy:
                animalRows.filter(
                    (animal) =>
                        animal.status ===
                        "healthy"
                ).length,

            warning:
                animalRows.filter(
                    (animal) =>
                        animal.status ===
                        "warning"
                ).length,

            critical:
                animalRows.filter(
                    (animal) =>
                        animal.status ===
                        "critical"
                ).length,
        };
    }, [animalRows]);

    /* ======================================================================
       REGISTRATION
       ====================================================================== */

    const openRegistration = () => {
        navigate("/animals/register");
    };

    /* ======================================================================
       ANIMAL INTELLIGENCE
       ====================================================================== */

    const openAnimalIntelligence =
        useCallback(
            (animalId) => {
                if (
                    animalId ===
                        undefined ||
                    animalId === null
                ) {
                    return;
                }

                setSelectedAnimal(null);

                navigate(
                    `/animals/${animalId}`
                );
            },
            [navigate]
        );

    /* ======================================================================
       DELETE FLOW — OPEN CONFIRMATION
       ====================================================================== */

    const openDeleteConfirmation =
        useCallback((animal) => {
            if (
                animal?.id ===
                    undefined ||
                animal?.id === null
            ) {
                return;
            }

            setDeleteError("");

            setDeleteTarget(animal);
        }, []);

    /* ======================================================================
       DELETE FLOW — CANCEL
       ====================================================================== */

    const closeDeleteConfirmation =
        useCallback(() => {
            if (deleting) {
                return;
            }

            setDeleteTarget(null);
            setDeleteError("");
        }, [deleting]);

    /* ======================================================================
       DELETE FLOW — EXECUTE
       ====================================================================== */

    const deleteAnimal =
        useCallback(async () => {
            if (
                !deleteTarget ||
                deleteTarget.id ===
                    undefined ||
                deleteTarget.id === null ||
                deleting
            ) {
                return;
            }

            const token = getToken();

            if (!token) {
                handleAuthFailure();
                return;
            }

            const deletingId =
                deleteTarget.id;

            try {
                setDeleting(true);
                setDeleteError("");

                await api.delete(
                    `/animals/${deletingId}`,
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                    }
                );

                setAnimals((current) =>
                    current.filter(
                        (animal) =>
                            String(
                                getAnimalId(
                                    animal
                                )
                            ) !==
                            String(
                                deletingId
                            )
                    )
                );

                setTelemetry((current) =>
                    current.filter(
                        (item) => {
                            const telemetryAnimalId =
                                getTelemetryAnimalId(
                                    item
                                );

                            return (
                                String(
                                    telemetryAnimalId
                                ) !==
                                String(
                                    deletingId
                                )
                            );
                        }
                    )
                );

                setSelectedAnimal(null);
                setDeleteTarget(null);

                await fetchAnimals(true);
            } catch (err) {
                console.error(
                    "Animal deletion error:",
                    err
                );

                if (
                    err?.response?.status ===
                    401
                ) {
                    handleAuthFailure();
                    return;
                }

                const detail =
                    err?.response?.data
                        ?.detail;

                const message =
                    typeof detail ===
                    "string"
                        ? detail
                        : "The animal could not be removed. Please try again.";

                setDeleteError(message);
            } finally {
                setDeleting(false);
            }
        }, [
            deleteTarget,
            deleting,
            fetchAnimals,
            handleAuthFailure,
        ]);

    /* ======================================================================
       LOADING
       ====================================================================== */

    if (loading) {
        return (
            <AppShell>
                <div className="animals-loading">
                    <div className="animals-loading-mark">
                        HS
                    </div>

                    <strong>
                        HerdSense AI
                    </strong>

                    <span>
                        Initializing animal registry...
                    </span>
                </div>
            </AppShell>
        );
    }

    /* ======================================================================
       RENDER
       ====================================================================== */

    return (
        <AppShell>
            <div className="animals-page">

                <header className="animals-header">

                    <div className="animals-heading">

                        <div className="animals-eyebrow">
                            OPERATIONS
                        </div>

                        <div className="animals-title-row">

                            <h1>
                                Animals
                            </h1>

                            <span className="animals-count-chip">
                                {summary.total}{" "}
                                registered
                            </span>

                        </div>

                        <p>
                            Monitor every registered
                            animal and its latest
                            health signals.
                        </p>

                    </div>

                    <div className="animals-header-actions">

                        <div
                            className={`animals-api-status ${
                                apiOnline
                                    ? "online"
                                    : "offline"
                            }`}
                        >
                            <span />

                            {apiOnline
                                ? "API operational"
                                : "API unavailable"}
                        </div>

                        <button
                            type="button"
                            className="animals-secondary-button"
                            onClick={() =>
                                fetchAnimals(true)
                            }
                            disabled={
                                refreshing
                            }
                        >
                            <span className="refresh-icon">
                                ↻
                            </span>

                            {refreshing
                                ? "Refreshing"
                                : "Refresh"}
                        </button>

                        <button
                            type="button"
                            className="animals-register-button"
                            onClick={
                                openRegistration
                            }
                        >
                            <span>
                                +
                            </span>

                            Register animal
                        </button>

                    </div>

                </header>

                {registrationNotice && (
                    <div
                        className="animals-registration-success"
                        role="status"
                    >
                        <div className="animals-registration-success-icon">
                            ✓
                        </div>

                        <div>
                            <strong>
                                Animal registered
                            </strong>

                            <span>
                                {
                                    registrationNotice
                                }
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setRegistrationNotice(
                                    ""
                                )
                            }
                            aria-label="Dismiss registration notification"
                        >
                            ×
                        </button>
                    </div>
                )}

                {error && (
                    <div className="animals-error">

                        <div className="animals-error-icon">
                            !
                        </div>

                        <div>
                            <strong>
                                Connection issue
                            </strong>

                            <span>
                                {error}
                            </span>
                        </div>

                    </div>
                )}

                <section className="animals-summary">

                    <div className="animals-summary-card">

                        <div className="summary-card-top">
                            <span>
                                REGISTERED
                            </span>

                            <span className="summary-card-index">
                                01
                            </span>
                        </div>

                        <strong>
                            {summary.total}
                        </strong>

                        <small>
                            Animals monitored
                        </small>

                    </div>

                    <div className="animals-summary-card healthy">

                        <div className="summary-card-top">
                            <span>
                                HEALTHY
                            </span>

                            <span className="summary-status-dot" />
                        </div>

                        <strong>
                            {summary.healthy}
                        </strong>

                        <small>
                            Within normal range
                        </small>

                    </div>

                    <div className="animals-summary-card warning">

                        <div className="summary-card-top">
                            <span>
                                WARNING
                            </span>

                            <span className="summary-status-dot" />
                        </div>

                        <strong>
                            {summary.warning}
                        </strong>

                        <small>
                            Require attention
                        </small>

                    </div>

                    <div className="animals-summary-card critical">

                        <div className="summary-card-top">
                            <span>
                                CRITICAL
                            </span>

                            <span className="summary-status-dot" />
                        </div>

                        <strong>
                            {summary.critical}
                        </strong>

                        <small>
                            Immediate attention
                        </small>

                    </div>

                </section>

                <section className="animals-panel">

                    <div className="animals-panel-header">

                        <div>

                            <div className="animals-eyebrow">
                                ANIMAL REGISTRY
                            </div>

                            <h2>
                                Live animal status
                            </h2>

                            <p>
                                Latest available
                                telemetry for each
                                registered animal.
                            </p>

                        </div>

                        <div className="animals-live-badge">
                            <span />
                            LIVE
                        </div>

                    </div>

                    <div className="animals-toolbar">

                        <div className="animals-search">

                            <span className="animals-search-icon">
                                ⌕
                            </span>

                            <input
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(
                                        event.target.value
                                    )
                                }
                                placeholder="Search by name, ID or species"
                                aria-label="Search animals"
                            />

                            {search && (
                                <button
                                    type="button"
                                    className="animals-search-clear"
                                    onClick={() =>
                                        setSearch("")
                                    }
                                    aria-label="Clear search"
                                >
                                    ×
                                </button>
                            )}

                        </div>

                        <div className="animals-toolbar-right">

                            <select
                                value={
                                    statusFilter
                                }
                                onChange={(event) =>
                                    setStatusFilter(
                                        event.target.value
                                    )
                                }
                                className="animals-filter"
                                aria-label="Filter by status"
                            >
                                <option value="all">
                                    All status
                                </option>

                                <option value="healthy">
                                    Healthy
                                </option>

                                <option value="warning">
                                    Warning
                                </option>

                                <option value="critical">
                                    Critical
                                </option>
                            </select>

                            <span className="animals-result-count">
                                {
                                    filteredAnimals.length
                                }{" "}
                                result
                                {filteredAnimals.length !==
                                1
                                    ? "s"
                                    : ""}
                            </span>

                        </div>

                    </div>

                    <div className="animals-table-wrapper">

                        <table className="animals-table">

                            <thead>
                                <tr>
                                    <th>ANIMAL</th>
                                    <th>TEMPERATURE</th>
                                    <th>HEART RATE</th>
                                    <th>ACTIVITY</th>
                                    <th>BATTERY</th>
                                    <th>GPS</th>
                                    <th>STATUS</th>
                                    <th>LAST SIGNAL</th>
                                </tr>
                            </thead>

                            <tbody>

                                {filteredAnimals.length ===
                                0 ? (
                                    <tr>
                                        <td
                                            colSpan="8"
                                            className="animals-empty"
                                        >
                                            <div className="animals-empty-content">

                                                <div className="animals-empty-icon">
                                                    —
                                                </div>

                                                <strong>
                                                    No animals found
                                                </strong>

                                                <span>
                                                    Try changing
                                                    your search
                                                    or status
                                                    filter.
                                                </span>

                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAnimals.map(
                                        (animal) => {
                                            const temperatureStatus =
                                                getMetricStatus(
                                                    animal.temperature,
                                                    THRESHOLDS.temperatureCritical,
                                                    THRESHOLDS.temperatureWarning
                                                );

                                            const heartRateStatus =
                                                getMetricStatus(
                                                    animal.heartRate,
                                                    THRESHOLDS.heartRateCritical,
                                                    THRESHOLDS.heartRateWarning
                                                );

                                            const activityStatus =
                                                getMetricStatus(
                                                    animal.activity,
                                                    THRESHOLDS.activityCritical,
                                                    THRESHOLDS.activityWarning,
                                                    true
                                                );

                                            const batteryStatus =
                                                animal.battery <=
                                                BATTERY_THRESHOLDS.critical
                                                    ? "critical"
                                                    : animal.battery <=
                                                      BATTERY_THRESHOLDS.warning
                                                    ? "warning"
                                                    : "normal";

                                            return (
                                                <tr
                                                    key={
                                                        animal.id
                                                    }
                                                    className={`animal-row ${
                                                        animal.status ===
                                                        "critical"
                                                            ? "critical-row"
                                                            : ""
                                                    }`}
                                                    onClick={() =>
                                                        setSelectedAnimal(
                                                            animal
                                                        )
                                                    }
                                                >

                                                    <td>
                                                        <div className="animal-identity">

                                                            <div
                                                                className={`animal-avatar ${animal.status}`}
                                                            >
                                                                {String(
                                                                    animal.name
                                                                )
                                                                    .charAt(
                                                                        0
                                                                    )
                                                                    .toUpperCase()}
                                                            </div>

                                                            <div className="animal-identity-copy">

                                                                <strong>
                                                                    {
                                                                        animal.name
                                                                    }
                                                                </strong>

                                                                <span>
                                                                    ID #
                                                                    {
                                                                        animal.id
                                                                    }

                                                                    <i />

                                                                    {
                                                                        animal.species
                                                                    }

                                                                </span>

                                                            </div>

                                                        </div>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`metric metric-${temperatureStatus}`}
                                                        >
                                                            {formatNumber(
                                                                animal.temperature,
                                                                1
                                                            )}

                                                            <small>
                                                                °C
                                                            </small>
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`metric metric-${heartRateStatus}`}
                                                        >
                                                            {formatNumber(
                                                                animal.heartRate
                                                            )}

                                                            <small>
                                                                BPM
                                                            </small>
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`metric metric-${activityStatus}`}
                                                        >
                                                            {formatNumber(
                                                                animal.activity
                                                            )}

                                                            <small>
                                                                %
                                                            </small>
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div className="battery-cell">

                                                            <div className="battery-value">

                                                                <span>
                                                                    {formatNumber(
                                                                        animal.battery
                                                                    )}
                                                                </span>

                                                                <small>
                                                                    %
                                                                </small>

                                                            </div>

                                                            <div className="battery-track">

                                                                <div
                                                                    className={`battery-fill ${batteryStatus}`}
                                                                    style={{
                                                                        width: `${Math.max(
                                                                            0,
                                                                            Math.min(
                                                                                100,
                                                                                animal.battery
                                                                            )
                                                                        )}%`,
                                                                    }}
                                                                />

                                                            </div>

                                                        </div>
                                                    </td>

                                                    <td>
                                                        <div className="gps-value">

                                                            <span
                                                                className={
                                                                    hasGps(
                                                                        animal.latitude,
                                                                        animal.longitude
                                                                    )
                                                                        ? "gps-active"
                                                                        : ""
                                                                }
                                                            />

                                                            {hasGps(
                                                                animal.latitude,
                                                                animal.longitude
                                                            )
                                                                ? `${animal.latitude}, ${animal.longitude}`
                                                                : "No signal"}

                                                        </div>
                                                    </td>

                                                    <td>
                                                        <StatusBadge
                                                            status={
                                                                animal.status
                                                            }
                                                        />
                                                    </td>

                                                    <td>
                                                        <div className="last-signal">

                                                            <strong>
                                                                {formatDate(
                                                                    animal.lastSignal
                                                                )}
                                                            </strong>

                                                            <span>
                                                                Telemetry
                                                            </span>

                                                        </div>
                                                    </td>

                                                </tr>
                                            );
                                        }
                                    )
                                )}

                            </tbody>

                        </table>

                    </div>

                    <div className="animals-panel-footer">

                        <span>
                            Showing{" "}
                            <strong>
                                {
                                    filteredAnimals.length
                                }
                            </strong>{" "}
                            of{" "}
                            <strong>
                                {animalRows.length}
                            </strong>{" "}
                            registered animals
                        </span>

                        <span className="animals-footer-live">
                            <i />
                            Live telemetry
                        </span>

                    </div>

                </section>

            </div>

            {selectedAnimal && (
                <div
                    className="animal-modal-backdrop"
                    onClick={() =>
                        setSelectedAnimal(null)
                    }
                >

                    <div
                        className="animal-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="animal-modal-header">

                            <div>

                                <div className="animals-eyebrow">
                                    ANIMAL PROFILE
                                </div>

                                <h2>
                                    {
                                        selectedAnimal.name
                                    }
                                </h2>

                                <span>
                                    Animal ID #
                                    {
                                        selectedAnimal.id
                                    }
                                </span>

                            </div>

                            <button
                                type="button"
                                className="animal-modal-close"
                                onClick={() =>
                                    setSelectedAnimal(
                                        null
                                    )
                                }
                                aria-label="Close animal profile"
                            >
                                ×
                            </button>

                        </div>

                        <div className="animal-modal-status">

                            <StatusBadge
                                status={
                                    selectedAnimal.status
                                }
                            />

                        </div>

                        <div className="animal-detail-grid">

                            <div>
                                <span>
                                    TEMPERATURE
                                </span>

                                <strong>
                                    {formatNumber(
                                        selectedAnimal.temperature,
                                        1
                                    )}
                                    °C
                                </strong>
                            </div>

                            <div>
                                <span>
                                    HEART RATE
                                </span>

                                <strong>
                                    {formatNumber(
                                        selectedAnimal.heartRate
                                    )}
                                    BPM
                                </strong>
                            </div>

                            <div>
                                <span>
                                    ACTIVITY
                                </span>

                                <strong>
                                    {formatNumber(
                                        selectedAnimal.activity
                                    )}
                                    %
                                </strong>
                            </div>

                            <div>
                                <span>
                                    BATTERY
                                </span>

                                <strong>
                                    {formatNumber(
                                        selectedAnimal.battery
                                    )}
                                    %
                                </strong>
                            </div>

                        </div>

                        <div className="animal-location">

                            <span>
                                GPS LOCATION
                            </span>

                            <strong>
                                {hasGps(
                                    selectedAnimal.latitude,
                                    selectedAnimal.longitude
                                )
                                    ? `${selectedAnimal.latitude}, ${selectedAnimal.longitude}`
                                    : "Location unavailable"}
                            </strong>

                        </div>

                        <div className="animal-signal">

                            <span>
                                LAST SIGNAL
                            </span>

                            <strong>
                                {formatDate(
                                    selectedAnimal.lastSignal
                                )}
                            </strong>

                        </div>

                        <div className="animal-intelligence-action">

                            <button
                                type="button"
                                className="animal-intelligence-button"
                                onClick={() =>
                                    openAnimalIntelligence(
                                        selectedAnimal.id
                                    )
                                }
                            >
                                View Animal Intelligence

                                <span>
                                    →
                                </span>
                            </button>

                        </div>

                        <div className="animal-danger-zone">

                            <div className="animal-danger-copy">

                                <span>
                                    RECORD MANAGEMENT
                                </span>

                                <strong>
                                    Remove animal
                                </strong>

                                <p>
                                    Permanently remove this
                                    animal from the HerdSense
                                    monitoring registry.
                                </p>

                            </div>

                            <button
                                type="button"
                                className="animal-delete-button"
                                onClick={() =>
                                    openDeleteConfirmation(
                                        selectedAnimal
                                    )
                                }
                                disabled={
                                    deleting
                                }
                            >
                                <span className="delete-button-icon">
                                    ×
                                </span>

                                Remove animal
                            </button>

                        </div>

                    </div>

                </div>
            )}

            {deleteTarget && (
                <div
                    className="animal-delete-backdrop"
                    onClick={
                        closeDeleteConfirmation
                    }
                >

                    <div
                        className="animal-delete-dialog"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-animal-title"
                    >

                        <div className="delete-dialog-icon">
                            ×
                        </div>

                        <div className="delete-dialog-content">

                            <span className="delete-dialog-eyebrow">
                                DESTRUCTIVE ACTION
                            </span>

                            <h3 id="delete-animal-title">
                                Remove animal?
                            </h3>

                            <p>
                                You are about to permanently
                                remove{" "}
                                <strong>
                                    {deleteTarget.name}
                                </strong>{" "}
                                from the HerdSense monitoring
                                registry.
                            </p>

                            <div className="delete-target-card">

                                <div className="delete-target-avatar">
                                    {String(
                                        deleteTarget.name
                                    )
                                        .charAt(0)
                                        .toUpperCase()}
                                </div>

                                <div>

                                    <strong>
                                        {
                                            deleteTarget.name
                                        }
                                    </strong>

                                    <span>
                                        Animal ID #
                                        {
                                            deleteTarget.id
                                        }
                                    </span>

                                </div>

                            </div>

                            <div className="delete-warning">

                                <span>
                                    !
                                </span>

                                <p>
                                    This action cannot be
                                    undone.
                                </p>

                            </div>

                            {deleteError && (
                                <div className="delete-error">
                                    <span>!</span>

                                    <p>
                                        {deleteError}
                                    </p>
                                </div>
                            )}

                            <div className="delete-dialog-actions">

                                <button
                                    type="button"
                                    className="delete-cancel-button"
                                    onClick={
                                        closeDeleteConfirmation
                                    }
                                    disabled={
                                        deleting
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    className="delete-confirm-button"
                                    onClick={
                                        deleteAnimal
                                    }
                                    disabled={
                                        deleting
                                    }
                                >
                                    {deleting ? (
                                        <>
                                            <span className="delete-spinner" />
                                            Removing…
                                        </>
                                    ) : (
                                        <>
                                            <span>
                                                ×
                                            </span>

                                            Remove animal
                                        </>
                                    )}
                                </button>

                            </div>

                        </div>

                    </div>

                </div>
            )}

        </AppShell>
    );
}