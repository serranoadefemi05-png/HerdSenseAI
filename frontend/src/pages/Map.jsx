import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import AppShell from "../components/AppShell";
import MapView from "../components/map/MapView";
import api from "../api/api";

import "./Map.css";

/* ==========================================================================
   CONFIGURATION
========================================================================== */

const REFRESH_INTERVAL = 15000;

/* ==========================================================================
   HELPERS
========================================================================== */

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

/* ==========================================================================
   MAP PAGE
========================================================================== */

export default function Map() {
    const navigate = useNavigate();

    const [animals, setAnimals] = useState([]);

    const [loading, setLoading] = useState(true);

    const [refreshing, setRefreshing] = useState(false);

    const [error, setError] = useState("");

    const [apiOnline, setApiOnline] = useState(false);

    /* ======================================================================
       LOAD REGISTERED ANIMALS
    ====================================================================== */

    const loadAnimals = useCallback(
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

                const response =
                    await api.get(
                        "/animals/",
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
                            },
                        }
                    );

                const registeredAnimals =
                    normalizeArray(
                        response.data
                    );

                setAnimals(
                    registeredAnimals
                );

                setApiOnline(true);
            } catch (err) {
                console.error(
                    "Map animal loading error:",
                    err
                );

                if (
                    err?.response?.status ===
                    401
                ) {
                    localStorage.removeItem(
                        "access_token"
                    );

                    localStorage.removeItem(
                        "token"
                    );

                    navigate("/login", {
                        replace: true,
                    });

                    return;
                }

                setApiOnline(false);

                setError(
                    "Unable to load registered animals for live GPS tracking."
                );
            } finally {
                setLoading(false);

                setRefreshing(false);
            }
        },
        [navigate]
    );

    /* ======================================================================
       INITIAL LOAD + PERIODIC REFRESH
    ====================================================================== */

    useEffect(() => {
        loadAnimals();

        const interval =
            setInterval(() => {
                loadAnimals(true);
            }, REFRESH_INTERVAL);

        return () =>
            clearInterval(interval);
    }, [loadAnimals]);

    /* ======================================================================
       RENDER
    ====================================================================== */

    return (
        <AppShell>

            <div className="map-page">

                {/* ==========================================================
                   ERROR
                ========================================================== */}

                {error && (
                    <div className="map-page__error">

                        <span className="map-page__error-dot" />

                        {error}

                    </div>
                )}

                {/* ==========================================================
                   MAP
                ========================================================== */}

                <MapView
                    animals={animals}
                    title="Live GPS Monitoring"
                    showHeader={true}
                />

                {/* ==========================================================
                   STATUS BAR
                ========================================================== */}

                <div className="map-page__status-bar">

                    <div className="map-page__status-group">

                        <span
                            className={`map-page__connection ${
                                apiOnline
                                    ? "is-online"
                                    : "is-offline"
                            }`}
                        >

                            <span />

                            {apiOnline
                                ? "API ONLINE"
                                : "API OFFLINE"}

                        </span>

                        <span className="map-page__registered">

                            <strong>
                                {animals.length}
                            </strong>

                            REGISTERED ANIMALS

                        </span>

                    </div>

                    <div className="map-page__status-group">

                        {loading && (
                            <span>
                                Loading animal registry...
                            </span>
                        )}

                        {!loading &&
                            refreshing && (
                                <span>
                                    Syncing registry...
                                </span>
                            )}

                        {!loading &&
                            !refreshing && (
                                <span>
                                    Registry synchronized
                                </span>
                            )}

                    </div>

                </div>

            </div>

        </AppShell>
    );
}