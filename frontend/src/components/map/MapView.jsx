import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    MapContainer,
    Marker,
    Popup,
    TileLayer,
    useMap,
} from "react-leaflet";

import L from "leaflet";

import {
    useLiveData,
} from "../../context/LiveDataContext";

import "leaflet/dist/leaflet.css";
import "./MapView.css";


/* ============================================================
   MARKER ICON
============================================================ */

const createMarkerIcon = (
    status = "unknown"
) => {
    const value =
        String(status).toLowerCase();

    let state = "unknown";

    if (value.includes("critical")) {
        state = "critical";
    } else if (
        value.includes("warning") ||
        value.includes("elevated")
    ) {
        state = "warning";
    } else if (
        value.includes("healthy") ||
        value.includes("normal")
    ) {
        state = "healthy";
    }

    return L.divIcon({
        className:
            "map-animal-icon-wrapper",

        html: `
            <div class="map-animal-marker map-animal-marker--${state}">
                <span class="map-animal-marker-dot"></span>
                <span class="map-animal-marker-pulse"></span>
            </div>
        `,

        iconSize: [28, 28],

        iconAnchor: [14, 14],

        popupAnchor: [0, -16],
    });
};


/* ============================================================
   HELPERS
============================================================ */

const getId = (item) =>
    item?.animal_id ??
    item?.animalId ??
    item?.animal?.id ??
    item?.id ??
    null;


const getName = (item) =>
    item?.animal_name ??
    item?.animalName ??
    item?.animal?.name ??
    item?.name ??
    null;


const getLatitude = (item) => {
    const value =
        item?.latitude ??
        item?.lat ??
        item?.gps?.latitude ??
        item?.gps?.lat ??
        item?.location?.latitude ??
        item?.location?.lat;

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : null;
};


const getLongitude = (item) => {
    const value =
        item?.longitude ??
        item?.lng ??
        item?.lon ??
        item?.gps?.longitude ??
        item?.gps?.lng ??
        item?.gps?.lon ??
        item?.location?.longitude ??
        item?.location?.lng ??
        item?.location?.lon;

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : null;
};


const getStatus = (item) =>
    item?.health_status ??
    item?.healthStatus ??
    item?.status ??
    "Unknown";


const getSpecies = (item) =>
    item?.species ??
    item?.type ??
    item?.animal?.species ??
    "Livestock";


const getBattery = (item) =>
    item?.battery ??
    item?.battery_level ??
    item?.batteryLevel ??
    item?.device_battery ??
    null;


const getTimestamp = (item) =>
    item?.recorded_at ??
    item?.timestamp ??
    item?.created_at ??
    item?.createdAt ??
    item?.time ??
    null;


/* ============================================================
   DATE FORMATTER
============================================================ */

const formatTimestamp = (value) => {
    if (!value) {
        return "No signal";
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
};


/* ============================================================
   MAP RESIZE CONTROLLER
============================================================ */

function ResizeController({
    fullscreen,
}) {
    const map = useMap();

    useEffect(() => {
        const timers = [
            setTimeout(
                () =>
                    map.invalidateSize(
                        true
                    ),
                50
            ),

            setTimeout(
                () =>
                    map.invalidateSize(
                        true
                    ),
                300
            ),

            setTimeout(
                () =>
                    map.invalidateSize(
                        true
                    ),
                700
            ),
        ];

        return () =>
            timers.forEach(
                clearTimeout
            );
    }, [
        fullscreen,
        map,
    ]);

    return null;
}


/* ============================================================
   MAP BOUNDS CONTROLLER
============================================================ */

function BoundsController({
    animals,
}) {
    const map = useMap();

    /*
     * Stores the IDs that have already
     * been seen by the map.
     */
    const previousAnimalIds =
        useRef(new Set());

    useEffect(() => {
        if (!animals.length) {
            return;
        }

        const currentIds =
            new Set(
                animals.map(
                    (animal) =>
                        String(
                            animal.animal_id
                        )
                )
            );

        /*
         * Detect newly registered animals.
         */
        const hasNewAnimal =
            Array.from(
                currentIds
            ).some(
                (id) =>
                    !previousAnimalIds.current.has(
                        id
                    )
            );

        /*
         * Create bounds from all animals
         * currently having valid GPS coordinates.
         */
        const bounds =
            L.latLngBounds(
                animals.map(
                    (animal) => [
                        animal.latitude,
                        animal.longitude,
                    ]
                )
            );

        if (!bounds.isValid()) {
            return;
        }

        /*
         * Initial GPS load:
         *
         * Fit the map around the registered
         * animals with known coordinates.
         */
        const firstLoad =
            previousAnimalIds.current
                .size === 0;

        /*
         * New animal:
         *
         * Automatically bring the new
         * animal into view.
         */
        if (
            firstLoad ||
            hasNewAnimal
        ) {
            map.fitBounds(
                bounds,
                {
                    padding: [
                        70,
                        70,
                    ],

                    maxZoom: 17,

                    animate: true,
                }
            );
        }

        /*
         * Store current IDs.
         */
        previousAnimalIds.current =
            currentIds;

    }, [
        animals,
        map,
    ]);

    return null;
}


/* ============================================================
   MAP VIEW
============================================================ */

export default function MapView({
    animals = [],

    title =
        "Live GPS Monitoring",

    showHeader = true,
}) {
    const {
        connected,
        latestTelemetry,
    } = useLiveData();


    /* ========================================================
       FULLSCREEN
    ======================================================== */

    const [
        fullscreen,
        setFullscreen,
    ] = useState(false);


    /* ========================================================
       ESCAPE KEY
    ======================================================== */

    useEffect(() => {
        const handleKey = (
            event
        ) => {
            if (
                event.key ===
                "Escape"
            ) {
                setFullscreen(
                    false
                );
            }
        };

        window.addEventListener(
            "keydown",
            handleKey
        );

        return () =>
            window.removeEventListener(
                "keydown",
                handleKey
            );
    }, []);


    /* ========================================================
       BODY SCROLL LOCK
    ======================================================== */

    useEffect(() => {
        if (fullscreen) {
            document.body.style.overflow =
                "hidden";
        } else {
            document.body.style.overflow =
                "";
        }

        return () => {
            document.body.style.overflow =
                "";
        };
    }, [
        fullscreen,
    ]);


    /* ========================================================
       NORMALIZE LIVE TELEMETRY
    ======================================================== */

    const telemetry =
        useMemo(() => {
            if (
                !latestTelemetry
            ) {
                return [];
            }

            if (
                Array.isArray(
                    latestTelemetry
                )
            ) {
                return latestTelemetry;
            }

            if (
                Array.isArray(
                    latestTelemetry.items
                )
            ) {
                return (
                    latestTelemetry.items
                );
            }

            if (
                Array.isArray(
                    latestTelemetry.data
                )
            ) {
                return (
                    latestTelemetry.data
                );
            }

            if (
                Array.isArray(
                    latestTelemetry.results
                )
            ) {
                return (
                    latestTelemetry.results
                );
            }

            return [
                latestTelemetry,
            ];
        }, [
            latestTelemetry,
        ]);


    /* ========================================================
       MERGE REGISTERED ANIMALS
       WITH LIVE TELEMETRY
    ======================================================== */

    const mapAnimals =
        useMemo(() => {
            const map =
                new Map();


            /* ==================================================
               REGISTERED ANIMALS
            ================================================== */

            animals.forEach(
                (animal) => {
                    const id =
                        getId(
                            animal
                        );

                    if (
                        id ===
                        null ||
                        id ===
                        undefined
                    ) {
                        return;
                    }

                    map.set(
                        String(id),
                        {
                            ...animal,

                            animal_id:
                                id,

                            animal_name:
                                getName(
                                    animal
                                ) ||
                                `Animal #${id}`,

                            species:
                                getSpecies(
                                    animal
                                ),

                            latitude:
                                getLatitude(
                                    animal
                                ),

                            longitude:
                                getLongitude(
                                    animal
                                ),

                            health_status:
                                getStatus(
                                    animal
                                ),

                            battery:
                                getBattery(
                                    animal
                                ),

                            last_signal:
                                getTimestamp(
                                    animal
                                ),
                        }
                    );
                }
            );


            /* ==================================================
               LIVE TELEMETRY
            ================================================== */

            telemetry.forEach(
                (reading) => {
                    const id =
                        getId(
                            reading
                        );

                    if (
                        id ===
                        null ||
                        id ===
                        undefined
                    ) {
                        return;
                    }

                    const key =
                        String(id);

                    const current =
                        map.get(
                            key
                        ) || {
                            animal_id:
                                id,
                        };


                    const latitude =
                        getLatitude(
                            reading
                        );

                    const longitude =
                        getLongitude(
                            reading
                        );


                    map.set(
                        key,
                        {
                            ...current,

                            ...reading,

                            animal_id:
                                id,

                            animal_name:
                                getName(
                                    reading
                                ) ||
                                current.animal_name ||
                                `Animal #${id}`,

                            species:
                                getSpecies(
                                    reading
                                ) ||
                                current.species ||
                                "Livestock",

                            /*
                             * Live GPS takes
                             * priority over the
                             * registered location.
                             */
                            latitude:
                                latitude ??
                                current.latitude ??
                                null,

                            longitude:
                                longitude ??
                                current.longitude ??
                                null,

                            health_status:
                                getStatus(
                                    reading
                                ) ||
                                current.health_status ||
                                "Unknown",

                            battery:
                                getBattery(
                                    reading
                                ) ??
                                current.battery ??
                                null,

                            last_signal:
                                getTimestamp(
                                    reading
                                ) ||
                                current.last_signal ||
                                null,
                        }
                    );
                }
            );


            /*
             * Only animals with valid GPS
             * coordinates are displayed
             * as markers.
             *
             * Registered animals without
             * GPS remain in the backend but
             * are not placed at a fake location.
             */

            return Array.from(
                map.values()
            ).filter(
                (animal) =>
                    Number.isFinite(
                        Number(
                            animal.latitude
                        )
                    ) &&
                    Number.isFinite(
                        Number(
                            animal.longitude
                        )
                    )
            );
        }, [
            animals,
            telemetry,
        ]);


    /* ========================================================
       TRACKING COUNTS
    ======================================================== */

    const registeredCount =
        animals.length;

    const trackingCount =
        mapAnimals.length;

    const gpsUnavailableCount =
        Math.max(
            0,
            registeredCount -
                trackingCount
        );


    /* ========================================================
       RENDER
    ======================================================== */

    return (
        <section
            className={`map-view ${
                fullscreen
                    ? "map-view--fullscreen"
                    : ""
            }`}
        >

            {/* ==================================================
               HEADER
            ================================================== */}

            {showHeader && (
                <div className="map-view__header">

                    <div>

                        <div className="map-view__eyebrow">
                            GPS / LIVE TELEMETRY
                        </div>

                        <h2 className="map-view__title">
                            {title}
                        </h2>

                        <p className="map-view__description">
                            Real-time location
                            intelligence for
                            monitored animals.
                        </p>

                    </div>


                    <div className="map-view__header-actions">

                        <div className="map-view__status">

                            <span
                                className={`map-view__status-dot ${
                                    connected
                                        ? "is-connected"
                                        : "is-disconnected"
                                }`}
                            />

                            {connected
                                ? "LIVE"
                                : "OFFLINE"}

                        </div>


                        <button
                            type="button"
                            className="map-view__fullscreen-button"
                            onClick={() =>
                                setFullscreen(
                                    (value) =>
                                        !value
                                )
                            }
                            aria-label={
                                fullscreen
                                    ? "Exit full screen map"
                                    : "Open full screen map"
                            }
                        >
                            {fullscreen
                                ? "✕ Exit Full Screen"
                                : "⛶ Full Screen"}
                        </button>

                    </div>

                </div>
            )}


            {/* ==================================================
               MAP BODY
            ================================================== */}

            <div className="map-view__body">

                <MapContainer
                    center={[
                        6.5244,
                        3.3792,
                    ]}
                    zoom={12}
                    scrollWheelZoom={
                        true
                    }
                    className="map-view__leaflet"
                >

                    <TileLayer
                        attribution="© OpenStreetMap"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />


                    <ResizeController
                        fullscreen={
                            fullscreen
                        }
                    />


                    <BoundsController
                        animals={
                            mapAnimals
                        }
                    />


                    {/* ==========================================
                       ANIMAL MARKERS
                    ========================================== */}

                    {mapAnimals.map(
                        (animal) => (
                            <Marker
                                key={
                                    animal.animal_id
                                }
                                position={[
                                    Number(
                                        animal.latitude
                                    ),
                                    Number(
                                        animal.longitude
                                    ),
                                ]}
                                icon={createMarkerIcon(
                                    animal.health_status
                                )}
                            >

                                <Popup>

                                    <div className="animal-map-popup">

                                        <span>
                                            MONITORED ANIMAL
                                        </span>


                                        <h3>
                                            {
                                                animal.animal_name
                                            }
                                        </h3>


                                        <strong>
                                            ID #
                                            {
                                                animal.animal_id
                                            }
                                        </strong>


                                        <div>
                                            {
                                                animal.species
                                            }
                                        </div>


                                        <div className="animal-map-popup__coordinates">

                                            {Number(
                                                animal.latitude
                                            ).toFixed(
                                                6
                                            )}

                                            {" / "}

                                            {Number(
                                                animal.longitude
                                            ).toFixed(
                                                6
                                            )}

                                        </div>


                                        <div className="animal-map-popup__status">

                                            <span>
                                                STATUS
                                            </span>

                                            <strong>
                                                {
                                                    animal.health_status ||
                                                    "Unknown"
                                                }
                                            </strong>

                                        </div>


                                        {animal.battery !==
                                            null &&
                                            animal.battery !==
                                                undefined && (
                                                <div className="animal-map-popup__battery">

                                                    <span>
                                                        BATTERY
                                                    </span>

                                                    <strong>
                                                        {
                                                            animal.battery
                                                        }
                                                        %
                                                    </strong>

                                                </div>
                                            )}


                                        <div className="animal-map-popup__signal">

                                            <span>
                                                LAST SIGNAL
                                            </span>

                                            <strong>
                                                {formatTimestamp(
                                                    animal.last_signal
                                                )}
                                            </strong>

                                        </div>

                                    </div>

                                </Popup>

                            </Marker>
                        )
                    )}

                </MapContainer>


                {/* ==================================================
                   MAP OVERLAY
                ================================================== */}

                <div className="map-view__overlay">

                    <div className="map-view__counter">

                        GPS TRACKING

                        <strong>
                            {
                                trackingCount
                            }
                        </strong>

                        animals

                        {gpsUnavailableCount >
                            0 && (
                            <span
                                style={{
                                    marginLeft:
                                        "8px",
                                    opacity:
                                        0.55,
                                }}
                            >
                                •{" "}
                                {
                                    gpsUnavailableCount
                                }{" "}
                                awaiting GPS
                            </span>
                        )}

                    </div>


                    <div className="map-view__legend">

                        <span>

                            <i className="legend-dot legend-dot--healthy" />

                            Healthy

                        </span>


                        <span>

                            <i className="legend-dot legend-dot--warning" />

                            Warning

                        </span>


                        <span>

                            <i className="legend-dot legend-dot--critical" />

                            Critical

                        </span>

                    </div>

                </div>


                {/* ==================================================
                   EMPTY GPS STATE
                ================================================== */}

                {registeredCount >
                    0 &&
                    trackingCount ===
                        0 && (
                        <div
                            style={{
                                position:
                                    "absolute",
                                top: "50%",
                                left: "50%",
                                transform:
                                    "translate(-50%, -50%)",
                                zIndex: 600,
                                padding:
                                    "18px 22px",
                                border:
                                    "1px solid rgba(255,255,255,.1)",
                                borderRadius:
                                    "10px",
                                background:
                                    "rgba(9,13,18,.92)",
                                color:
                                    "#dfe5ea",
                                textAlign:
                                    "center",
                                pointerEvents:
                                    "none",
                            }}
                        >
                            <strong
                                style={{
                                    display:
                                        "block",
                                    marginBottom:
                                        "6px",
                                    fontSize:
                                        "12px",
                                }}
                            >
                                GPS SIGNALS
                                UNAVAILABLE
                            </strong>

                            <span
                                style={{
                                    color:
                                        "#8993a0",
                                    fontSize:
                                        "10px",
                                }}
                            >
                                {
                                    registeredCount
                                }{" "}
                                registered{" "}
                                {registeredCount ===
                                1
                                    ? "animal"
                                    : "animals"}{" "}
                                are awaiting
                                location
                                telemetry.
                            </span>

                        </div>
                    )}

            </div>

        </section>
    );
}