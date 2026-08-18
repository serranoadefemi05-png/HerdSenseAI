/* ==========================================================================
   HERDSENSE AI — LIVE TELEMETRY
   Global enterprise command-center interface
   ========================================================================== */

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { useNavigate } from "react-router-dom";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import AppShell from "../components/AppShell";
import api from "../api/api";
import useTelemetrySocket from "../hooks/useTelemetrySocket";

import "./Telemetry.css";

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

const REFRESH_INTERVAL = 30000;

const THRESHOLDS = {
    temperatureCritical: 41.0,
    temperatureWarning: 39.5,

    heartRateCritical: 140,
    heartRateWarning: 120,

    activityCritical: 10,
    activityWarning: 25,

    batteryCritical: 20,
    batteryWarning: 35,
};

/* ==========================================================================
   SAFE HELPERS
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
        return "—";
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

function formatTime(value) {
    if (!value) {
        return "No signal";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Unknown";
    }

    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

function getTimestamp(value) {
    return firstDefined(
        value?.timestamp,
        value?.recorded_at,
        value?.recordedAt,
        value?.created_at,
        value?.createdAt,
        value?.time
    );
}

function getTimestampMs(value) {
    const timestamp = getTimestamp(value);

    if (!timestamp) {
        return 0;
    }

    const parsed = new Date(timestamp).getTime();

    return Number.isFinite(parsed)
        ? parsed
        : 0;
}

function getAnimalId(animal, telemetry) {
    return firstDefined(
        animal?.id,
        animal?.animal_id,
        animal?.animalId,
        telemetry?.animal_id,
        telemetry?.animalId,
        telemetry?.animal?.id
    );
}

function getAnimalName(animal, telemetry) {
    const id = getAnimalId(
        animal,
        telemetry
    );

    return (
        firstDefined(
            animal?.name,
            animal?.animal_name,
            animal?.animalName,
            telemetry?.animal_name,
            telemetry?.animalName,
            telemetry?.animal?.name
        ) ||
        `Animal #${id ?? "—"}`
    );
}

function getSpecies(animal, telemetry) {
    return (
        firstDefined(
            animal?.species,
            animal?.animal_type,
            animal?.animalType,
            telemetry?.species,
            telemetry?.animal?.species
        ) ||
        "Livestock"
    );
}

function getTagId(animal, telemetry) {
    return (
        firstDefined(
            animal?.tag_id,
            animal?.tagId,
            telemetry?.tag_id,
            telemetry?.tagId
        ) ||
        "Unassigned"
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
            telemetry?.pulse,
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
        telemetry?.gps?.latitude,
        telemetry?.gps?.lat,
        animal?.latitude,
        animal?.lat
    );
}

function getLongitude(animal, telemetry) {
    return firstDefined(
        telemetry?.longitude,
        telemetry?.lng,
        telemetry?.lon,
        telemetry?.gps?.longitude,
        telemetry?.gps?.lng,
        telemetry?.gps?.lon,
        animal?.longitude,
        animal?.lng,
        animal?.lon
    );
}

/* ==========================================================================
   TELEMETRY IDENTIFICATION
   ========================================================================== */

function getTelemetryAnimalId(telemetry) {
    return firstDefined(
        telemetry?.animal_id,
        telemetry?.animalId,
        telemetry?.animal?.id,
        telemetry?.tag_id,
        telemetry?.tagId
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

    const existing = Array.isArray(
        existingReadings
    )
        ? existingReadings
        : [];

    const incoming = Array.isArray(
        incomingReadings
    )
        ? incomingReadings
        : [];

    [
        ...existing,
        ...incoming,
    ].forEach((reading) => {
        if (!reading) {
            return;
        }

        const animalId =
            getTelemetryAnimalId(
                reading
            );

        if (
            animalId === undefined ||
            animalId === null
        ) {
            return;
        }

        const key = String(
            animalId
        );

        const current =
            map.get(key);

        if (!current) {
            map.set(
                key,
                reading
            );

            return;
        }

        if (
            getTimestampMs(
                reading
            ) >=
            getTimestampMs(
                current
            )
        ) {
            map.set(
                key,
                reading
            );
        }
    });

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
        animalId === undefined ||
        animalId === null
    ) {
        return existingReadings;
    }

    const key = String(
        animalId
    );

    const current =
        Array.isArray(
            existingReadings
        )
            ? existingReadings
            : [];

    const index =
        current.findIndex(
            (reading) =>
                String(
                    getTelemetryAnimalId(
                        reading
                    )
                ) === key
        );

    if (index === -1) {
        return [
            liveReading,
            ...current,
        ];
    }

    const existing =
        current[index];

    if (
        getTimestampMs(
            liveReading
        ) > 0 &&
        getTimestampMs(
            existing
        ) > 0 &&
        getTimestampMs(
            liveReading
        ) <
        getTimestampMs(
            existing
        )
    ) {
        return current;
    }

    const updated = [
        ...current,
    ];

    updated[index] =
        liveReading;

    return updated;
}

/* ==========================================================================
   HEALTH ENGINE
   ========================================================================== */

function getHealthStatus(
    animal,
    telemetry
) {
    const explicitStatus =
        firstDefined(
            telemetry?.health_status,
            telemetry?.healthStatus,
            telemetry?.status,
            animal?.health_status,
            animal?.healthStatus,
            animal?.status
        );

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

    if (!telemetry) {
        return "offline";
    }

    const temperature =
        getTemperature(
            animal,
            telemetry
        );

    const heartRate =
        getHeartRate(
            animal,
            telemetry
        );

    const activity =
        getActivity(
            animal,
            telemetry
        );

    if (
        temperature >=
            THRESHOLDS.temperatureCritical ||
        heartRate >=
            THRESHOLDS.heartRateCritical ||
        (
            activity > 0 &&
            activity <=
                THRESHOLDS.activityCritical
        )
    ) {
        return "critical";
    }

    if (
        temperature >=
            THRESHOLDS.temperatureWarning ||
        heartRate >=
            THRESHOLDS.heartRateWarning ||
        (
            activity > 0 &&
            activity <=
                THRESHOLDS.activityWarning
        )
    ) {
        return "warning";
    }

    return "healthy";
}

/* ==========================================================================
   METRIC STATUS
   ========================================================================== */

function getMetricStatus(
    value,
    warning,
    critical,
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
   SIGNAL STATE
   ========================================================================== */

function getSignalState(timestamp) {
    if (!timestamp) {
        return "offline";
    }

    const timestampMs =
        new Date(
            timestamp
        ).getTime();

    if (
        !Number.isFinite(
            timestampMs
        )
    ) {
        return "offline";
    }

    const age =
        Date.now() -
        timestampMs;

    if (age <= 60000) {
        return "live";
    }

    if (age <= 300000) {
        return "recent";
    }

    return "stale";
}

/* ==========================================================================
   STATUS BADGE
   ========================================================================== */

function StatusBadge({
    status,
}) {
    const labels = {
        healthy: "Healthy",
        warning: "Warning",
        critical: "Critical",
        offline: "Awaiting signal",
    };

    return (
        <span
            className={`telemetry-status telemetry-status-${status}`}
        >
            <span className="telemetry-status-dot" />

            {labels[status] ||
                labels.offline}
        </span>
    );
}

/* ==========================================================================
   METRIC
   ========================================================================== */

function TelemetryMetric({
    value,
    unit,
    status = "normal",
}) {
    return (
        <span
            className={`telemetry-metric telemetry-metric-${status}`}
        >
            <strong>
                {value}
            </strong>

            <small>
                {unit}
            </small>
        </span>
    );
}

/* ==========================================================================
   EXPORT HELPERS
   ========================================================================== */

function escapeCsv(value) {
    const text =
        value === undefined ||
        value === null
            ? ""
            : String(value);

    return `"${text.replaceAll(
        '"',
        '""'
    )}"`;
}

function buildTelemetryExportRows(
    rows
) {
    return rows.map(
        (animal) => ({
            animal_id:
                animal.id,

            animal_name:
                animal.name,

            tag_id:
                animal.tagId,

            species:
                animal.species,

            temperature_c:
                animal.temperature,

            heart_rate_bpm:
                animal.heartRate,

            activity_percent:
                animal.activity,

            battery_percent:
                animal.battery,

            latitude:
                animal.latitude ??
                "",

            longitude:
                animal.longitude ??
                "",

            health_status:
                animal.status,

            signal_status:
                getSignalState(
                    animal.lastSignal
                ),

            last_signal:
                animal.lastSignal
                    ? new Date(
                          animal.lastSignal
                      ).toISOString()
                    : "",
        })
    );
}

function buildCsv(rows) {
    if (!rows.length) {
        return "";
    }

    const headers =
        Object.keys(
            rows[0]
        );

    return [
        headers
            .map(
                escapeCsv
            )
            .join(","),

        ...rows.map(
            (row) =>
                headers
                    .map(
                        (header) =>
                            escapeCsv(
                                row[
                                    header
                                ]
                            )
                    )
                    .join(",")
        ),
    ].join("\n");
}

function buildText(rows) {
    const lines = [
        "HERDSENSE AI",
        "LIVE TELEMETRY EXPORT",
        "========================================",
        `Generated: ${new Date().toLocaleString()}`,
        `Records: ${rows.length}`,
        "",
    ];

    rows.forEach(
        (row, index) => {
            lines.push(
                `RECORD ${index + 1}`,
                `Animal: ${row.animal_name}`,
                `Animal ID: ${row.animal_id}`,
                `Tag ID: ${row.tag_id}`,
                `Species: ${row.species}`,
                `Temperature: ${row.temperature_c} °C`,
                `Heart Rate: ${row.heart_rate_bpm} BPM`,
                `Activity: ${row.activity_percent}%`,
                `Battery: ${row.battery_percent}%`,
                `GPS: ${
                    row.latitude !== "" &&
                    row.longitude !== ""
                        ? `${row.latitude}, ${row.longitude}`
                        : "Unavailable"
                }`,
                `Health: ${row.health_status}`,
                `Signal: ${row.signal_status}`,
                `Last Signal: ${
                    row.last_signal ||
                    "Unavailable"
                }`,
                "----------------------------------------"
            );
        }
    );

    return lines.join("\n");
}

function downloadBlob(
    content,
    filename,
    mimeType
) {
    const blob =
        new Blob(
            [content],
            {
                type: mimeType,
            }
        );

    const url =
        URL.createObjectURL(
            blob
        );

    const anchor =
        document.createElement(
            "a"
        );

    anchor.href = url;
    anchor.download =
        filename;

    document.body.appendChild(
        anchor
    );

    anchor.click();

    anchor.remove();

    setTimeout(
        () =>
            URL.revokeObjectURL(
                url
            ),
        1000
    );
}

/* ==========================================================================
   REAL PDF GENERATION
   ========================================================================== */

function generateTelemetryPDF(
    rows
) {
    const doc =
        new jsPDF({
            orientation:
                "landscape",
            unit: "mm",
            format: "a4",
        });

    const generated =
        new Date();

    const generatedText =
        generated.toLocaleString();

    const pageWidth =
        doc.internal.pageSize
            .getWidth();

    const pageHeight =
        doc.internal.pageSize
            .getHeight();

    /* HEADER */

    doc.setFillColor(
        10,
        16,
        26
    );

    doc.rect(
        0,
        0,
        pageWidth,
        32,
        "F"
    );

    doc.setTextColor(
        255,
        255,
        255
    );

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(
        20
    );

    doc.text(
        "HERDSENSE AI",
        14,
        13
    );

    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(
        9
    );

    doc.text(
        "LIVE TELEMETRY INTELLIGENCE REPORT",
        14,
        21
    );

    doc.setTextColor(
        180,
        190,
        205
    );

    doc.text(
        `Generated ${generatedText}`,
        pageWidth - 14,
        13,
        {
            align: "right",
        }
    );

    doc.text(
        `${rows.length} monitored assets`,
        pageWidth - 14,
        21,
        {
            align: "right",
        }
    );

    /* SUMMARY */

    doc.setTextColor(
        40,
        48,
        60
    );

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(
        10
    );

    doc.text(
        "Telemetry Overview",
        14,
        42
    );

    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(
        8
    );

    doc.text(
        "Latest authoritative telemetry snapshot across the HerdSense AI monitoring network.",
        14,
        48
    );

    /* TABLE */

    autoTable(
        doc,
        {
            startY: 55,

            margin: {
                left: 10,
                right: 10,
            },

            head: [[
                "Animal",
                "ID",
                "Tag",
                "Species",
                "Temp",
                "Heart",
                "Activity",
                "Battery",
                "GPS",
                "Health",
                "Signal",
                "Last Signal",
            ]],

            body:
                rows.map(
                    (row) => [
                        row.animal_name,
                        row.animal_id,
                        row.tag_id,
                        row.species,
                        `${row.temperature_c} °C`,
                        `${row.heart_rate_bpm} BPM`,
                        `${row.activity_percent}%`,
                        `${row.battery_percent}%`,
                        row.latitude !== "" &&
                        row.longitude !== ""
                            ? `${row.latitude}, ${row.longitude}`
                            : "Unavailable",
                        row.health_status,
                        row.signal_status,
                        row.last_signal
                            ? new Date(
                                  row.last_signal
                              ).toLocaleString()
                            : "Unavailable",
                    ]
                ),

            theme:
                "grid",

            styles: {
                font:
                    "helvetica",

                fontSize:
                    7,

                cellPadding:
                    3,

                textColor: [
                    35,
                    42,
                    52,
                ],

                lineColor: [
                    220,
                    225,
                    232,
                ],

                lineWidth:
                    0.2,
            },

            headStyles: {
                fillColor: [
                    17,
                    25,
                    38,
                ],

                textColor: [
                    255,
                    255,
                    255,
                ],

                fontStyle:
                    "bold",

                fontSize:
                    7,

                halign:
                    "left",
            },

            alternateRowStyles: {
                fillColor: [
                    247,
                    249,
                    252,
                ],
            },

            didParseCell:
                (data) => {
                    if (
                        data.section ===
                        "body"
                    ) {
                        const value =
                            String(
                                data.cell
                                    .raw ??
                                ""
                            ).toLowerCase();

                        if (
                            value.includes(
                                "critical"
                            )
                        ) {
                            data.cell.styles.textColor =
                                [
                                    190,
                                    35,
                                    35,
                                ];
                        }

                        if (
                            value.includes(
                                "warning"
                            )
                        ) {
                            data.cell.styles.textColor =
                                [
                                    180,
                                    110,
                                    0,
                                ];
                        }
                    }
                },

            foot: [[
                "HerdSense AI",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                `${rows.length} records`,
            ]],

            footStyles: {
                fillColor: [
                    245,
                    247,
                    250,
                ],

                textColor: [
                    80,
                    88,
                    100,
                ],

                fontStyle:
                    "bold",
            },
        }
    );

    /* FOOTER */

    const pageCount =
        doc.getNumberOfPages();

    for (
        let page = 1;
        page <= pageCount;
        page += 1
    ) {
        doc.setPage(
            page
        );

        doc.setFontSize(
            7
        );

        doc.setTextColor(
            120,
            128,
            140
        );

        doc.text(
            "HerdSense AI · Livestock Intelligence Platform",
            10,
            pageHeight - 8
        );

        doc.text(
            `Page ${page} of ${pageCount}`,
            pageWidth - 10,
            pageHeight - 8,
            {
                align:
                    "right",
            }
        );
    }

    doc.save(
        `herdsense-live-telemetry-${Date.now()}.pdf`
    );
}

/* ==========================================================================
   EXPORT MENU
   ========================================================================== */

function ExportMenu({
    onDownload,
    onShare,
    disabled = false,
}) {
    const [
        open,
        setOpen,
    ] = useState(false);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const close =
            (event) => {
                if (
                    !event.target.closest(
                        ".telemetry-export"
                    )
                ) {
                    setOpen(
                        false
                    );
                }
            };

        document.addEventListener(
            "click",
            close
        );

        return () =>
            document.removeEventListener(
                "click",
                close
            );
    }, [open]);

    const handleDownload =
        (format) => {
            setOpen(false);
            onDownload(format);
        };

    return (
        <div className="telemetry-export">

            <button
                type="button"
                className="telemetry-export-button"
                onClick={() =>
                    setOpen(
                        (current) =>
                            !current
                    )
                }
                disabled={disabled}
                aria-expanded={
                    open
                }
            >
                <span className="telemetry-export-icon">
                    ↓
                </span>

                Download

                <span className="telemetry-export-chevron">
                    ▾
                </span>
            </button>

            {open && (
                <div className="telemetry-export-menu">

                    <div className="telemetry-export-menu-label">
                        EXPORT FORMAT
                    </div>

                    {[
                        [
                            "csv",
                            "CSV",
                            "Spreadsheet data",
                        ],
                        [
                            "json",
                            "JSON",
                            "Machine-readable",
                        ],
                        [
                            "txt",
                            "TXT",
                            "Plain text report",
                        ],
                        [
                            "pdf",
                            "PDF",
                            "Professional report",
                        ],
                    ].map(
                        ([
                            value,
                            label,
                            description,
                        ]) => (
                            <button
                                key={
                                    value
                                }
                                type="button"
                                onClick={() =>
                                    handleDownload(
                                        value
                                    )
                                }
                            >
                                <span>
                                    {label}
                                </span>

                                <small>
                                    {
                                        description
                                    }
                                </small>
                            </button>
                        )
                    )}

                </div>
            )}

            <button
                type="button"
                className="telemetry-share-button"
                onClick={onShare}
                disabled={disabled}
            >
                <span>
                    ↗
                </span>

                Share
            </button>

        </div>
    );
}

/* ==========================================================================
   COMPONENT
   ========================================================================== */

export default function Telemetry() {
    const navigate =
        useNavigate();

    const [
        animals,
        setAnimals,
    ] = useState([]);

    const [
        telemetry,
        setTelemetry,
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

    const [
        search,
        setSearch,
    ] = useState("");

    const [
        statusFilter,
        setStatusFilter,
    ] = useState("all");

    const [
        selectedAnimal,
        setSelectedAnimal,
    ] = useState(null);

    const [
        exportNotice,
        setExportNotice,
    ] = useState("");

    const telemetryRef =
        useRef([]);

    const requestRef =
        useRef(0);

    /* AUTH */

    const handleAuthFailure =
        useCallback(() => {
            localStorage.removeItem(
                "access_token"
            );

            navigate(
                "/login",
                {
                    replace: true,
                }
            );
        }, [navigate]);

    /* LIVE SOCKET */

    const handleLiveTelemetry =
        useCallback(
            (liveTelemetry) => {
                if (
                    !liveTelemetry
                ) {
                    return;
                }

                const animalId =
                    getTelemetryAnimalId(
                        liveTelemetry
                    );

                if (
                    animalId ===
                        undefined ||
                    animalId ===
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
    } = useTelemetrySocket(
        handleLiveTelemetry
    );

    /* LOAD DATA */

    const loadTelemetry =
        useCallback(
            async (
                manualRefresh = false
            ) => {
                const token =
                    getToken();

                if (!token) {
                    handleAuthFailure();
                    return;
                }

                const requestId =
                    ++requestRef.current;

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
                    const config = {
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                    };

                    const results =
                        await Promise.allSettled(
                            [
                                api.get(
                                    "/animals/",
                                    config
                                ),

                                api.get(
                                    "/telemetry/",
                                    config
                                ),
                            ]
                        );

                    if (
                        requestId !==
                        requestRef.current
                    ) {
                        return;
                    }

                    const animalsResult =
                        results[0];

                    const telemetryResult =
                        results[1];

                    const unauthorized =
                        (
                            animalsResult.status ===
                                "rejected" &&
                            animalsResult.reason
                                ?.response
                                ?.status ===
                                401
                        ) ||
                        (
                            telemetryResult.status ===
                                "rejected" &&
                            telemetryResult.reason
                                ?.response
                                ?.status ===
                                401
                        );

                    if (
                        unauthorized
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
                                    .value
                                    .data
                            )
                        );
                    }

                    if (
                        telemetryResult.status ===
                        "fulfilled"
                    ) {
                        const incoming =
                            normalizeArray(
                                telemetryResult
                                    .value
                                    .data
                            );

                        const merged =
                            mergeLatestTelemetry(
                                telemetryRef.current,
                                incoming
                            );

                        telemetryRef.current =
                            merged;

                        setTelemetry(
                            merged
                        );
                    }

                    const connected =
                        results.some(
                            (result) =>
                                result.status ===
                                "fulfilled"
                        );

                    setApiOnline(
                        connected
                    );

                    if (
                        !connected
                    ) {
                        setError(
                            "Unable to connect to the HerdSense API."
                        );
                    }
                } catch (err) {
                    console.error(
                        "Telemetry loading error:",
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

                    setApiOnline(
                        false
                    );

                    setError(
                        "Unable to load live telemetry."
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
            [
                handleAuthFailure,
            ]
        );

    useEffect(() => {
        loadTelemetry();

        const interval =
            setInterval(
                () =>
                    loadTelemetry(
                        true
                    ),
                REFRESH_INTERVAL
            );

        return () =>
            clearInterval(
                interval
            );
    }, [
        loadTelemetry,
    ]);

    /* MERGED ROWS */

    const animalRows =
        useMemo(() => {
            const animalMap =
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
                        animalMap.set(
                            String(id),
                            animal
                        );
                    }
                }
            );

            const rows =
                Array.from(
                    animalMap.entries()
                ).map(
                    ([
                        id,
                        animal,
                    ]) => {
                        const reading =
                            telemetry.find(
                                (
                                    item
                                ) =>
                                    String(
                                        getTelemetryAnimalId(
                                            item
                                        )
                                    ) ===
                                    String(id)
                            );

                        return {
                            animal,
                            telemetry:
                                reading ||
                                null,

                            id,

                            name:
                                getAnimalName(
                                    animal,
                                    reading
                                ),

                            species:
                                getSpecies(
                                    animal,
                                    reading
                                ),

                            tagId:
                                getTagId(
                                    animal,
                                    reading
                                ),

                            temperature:
                                getTemperature(
                                    animal,
                                    reading
                                ),

                            heartRate:
                                getHeartRate(
                                    animal,
                                    reading
                                ),

                            activity:
                                getActivity(
                                    animal,
                                    reading
                                ),

                            battery:
                                getBattery(
                                    animal,
                                    reading
                                ),

                            latitude:
                                getLatitude(
                                    animal,
                                    reading
                                ),

                            longitude:
                                getLongitude(
                                    animal,
                                    reading
                                ),

                            status:
                                getHealthStatus(
                                    animal,
                                    reading
                                ),

                            lastSignal:
                                getTimestamp(
                                    reading
                                ),
                        };
                    }
                );

            return rows.sort(
                (a, b) =>
                    Number(a.id) -
                    Number(b.id)
            );
        }, [
            animals,
            telemetry,
        ]);

    /* FILTER */

    const filteredAnimals =
        useMemo(() => {
            const query =
                search
                    .trim()
                    .toLowerCase();

            return animalRows.filter(
                (animal) => {
                    const matchesSearch =
                        !query ||
                        String(
                            animal.name
                        )
                            .toLowerCase()
                            .includes(
                                query
                            ) ||
                        String(
                            animal.id
                        )
                            .toLowerCase()
                            .includes(
                                query
                            ) ||
                        String(
                            animal.tagId
                        )
                            .toLowerCase()
                            .includes(
                                query
                            ) ||
                        String(
                            animal.species
                        )
                            .toLowerCase()
                            .includes(
                                query
                            );

                    const matchesStatus =
                        statusFilter ===
                            "all" ||
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

    /* KPIs */

    const metrics =
        useMemo(() => {
            const live =
                animalRows.filter(
                    (animal) =>
                        getSignalState(
                            animal.lastSignal
                        ) === "live"
                ).length;

            const healthy =
                animalRows.filter(
                    (animal) =>
                        animal.status ===
                        "healthy"
                ).length;

            const attention =
                animalRows.filter(
                    (animal) =>
                        animal.status ===
                            "warning" ||
                        animal.status ===
                            "critical"
                ).length;

            return {
                monitored:
                    animalRows.length,

                live,

                healthy,

                attention,
            };
        }, [
            animalRows,
        ]);

    /* LAST UPDATE */

    const latestTimestamp =
        useMemo(() => {
            return telemetry.reduce(
                (
                    latest,
                    reading
                ) => {
                    const timestamp =
                        getTimestamp(
                            reading
                        );

                    if (
                        !timestamp
                    ) {
                        return latest;
                    }

                    if (
                        !latest
                    ) {
                        return timestamp;
                    }

                    return getTimestampMs(
                        reading
                    ) >
                        new Date(
                            latest
                        ).getTime()
                        ? timestamp
                        : latest;
                },
                null
            );
        }, [
            telemetry,
        ]);

    /* EXPORT */

    const exportRows =
        useMemo(
            () =>
                buildTelemetryExportRows(
                    filteredAnimals
                ),
            [
                filteredAnimals,
            ]
        );

    const handleDownload =
        useCallback(
            (format) => {
                if (
                    !exportRows.length
                ) {
                    setExportNotice(
                        "There is no telemetry data available to export."
                    );

                    return;
                }

                const timestamp =
                    new Date()
                        .toISOString()
                        .replace(
                            /[:.]/g,
                            "-"
                        );

                const baseName =
                    `herdsense-live-telemetry-${timestamp}`;

                if (
                    format ===
                    "csv"
                ) {
                    downloadBlob(
                        buildCsv(
                            exportRows
                        ),
                        `${baseName}.csv`,
                        "text/csv;charset=utf-8"
                    );

                    setExportNotice(
                        "CSV telemetry report downloaded."
                    );

                    return;
                }

                if (
                    format ===
                    "json"
                ) {
                    downloadBlob(
                        JSON.stringify(
                            {
                                platform:
                                    "HerdSense AI",

                                report:
                                    "Live Telemetry",

                                generated_at:
                                    new Date().toISOString(),

                                records:
                                    exportRows,
                            },
                            null,
                            2
                        ),
                        `${baseName}.json`,
                        "application/json;charset=utf-8"
                    );

                    setExportNotice(
                        "JSON telemetry report downloaded."
                    );

                    return;
                }

                if (
                    format ===
                    "txt"
                ) {
                    downloadBlob(
                        buildText(
                            exportRows
                        ),
                        `${baseName}.txt`,
                        "text/plain;charset=utf-8"
                    );

                    setExportNotice(
                        "TXT telemetry report downloaded."
                    );

                    return;
                }

                if (
                    format ===
                    "pdf"
                ) {
                    try {
                        generateTelemetryPDF(
                            exportRows
                        );

                        setExportNotice(
                            "Professional PDF telemetry report downloaded."
                        );
                    } catch (err) {
                        console.error(
                            "Telemetry PDF generation error:",
                            err
                        );

                        setExportNotice(
                            "Unable to generate the PDF report."
                        );
                    }
                }
            },
            [
                exportRows,
            ]
        );

    /* SHARE */

    const handleShare =
        useCallback(
            async () => {
                if (
                    !exportRows.length
                ) {
                    setExportNotice(
                        "There is no telemetry data available to share."
                    );

                    return;
                }

                const csv =
                    buildCsv(
                        exportRows
                    );

                const file =
                    new File(
                        [
                            csv,
                        ],
                        "herdsense-live-telemetry.csv",
                        {
                            type:
                                "text/csv",
                        }
                    );

                try {
                    if (
                        navigator.share
                    ) {
                        if (
                            navigator.canShare &&
                            navigator.canShare(
                                {
                                    files: [
                                        file,
                                    ],
                                }
                            )
                        ) {
                            await navigator.share(
                                {
                                    title:
                                        "HerdSense AI — Live Telemetry",

                                    text:
                                        `HerdSense AI live telemetry report — ${exportRows.length} monitored assets.`,

                                    files: [
                                        file,
                                    ],
                                }
                            );
                        } else {
                            await navigator.share(
                                {
                                    title:
                                        "HerdSense AI — Live Telemetry",

                                    text:
                                        buildText(
                                            exportRows
                                        ),
                                }
                            );
                        }

                        setExportNotice(
                            "Telemetry report shared."
                        );

                        return;
                    }

                    await navigator.clipboard.writeText(
                        buildText(
                            exportRows
                        )
                    );

                    setExportNotice(
                        "Telemetry report copied to clipboard."
                    );
                } catch (err) {
                    if (
                        err?.name ===
                        "AbortError"
                    ) {
                        return;
                    }

                    try {
                        await navigator.clipboard.writeText(
                            buildText(
                                exportRows
                            )
                        );

                        setExportNotice(
                            "Telemetry report copied to clipboard."
                        );
                    } catch {
                        setExportNotice(
                            "Unable to share telemetry from this browser."
                        );
                    }
                }
            },
            [
                exportRows,
            ]
        );

    useEffect(() => {
        if (
            !exportNotice
        ) {
            return undefined;
        }

        const timeout =
            setTimeout(
                () =>
                    setExportNotice(
                        ""
                    ),
                5000
            );

        return () =>
            clearTimeout(
                timeout
            );
    }, [
        exportNotice,
    ]);

    /* INTELLIGENCE */

    const openAnimalIntelligence =
        useCallback(
            (animalId) => {
                if (
                    animalId ===
                        undefined ||
                    animalId ===
                        null
                ) {
                    return;
                }

                setSelectedAnimal(
                    null
                );

                navigate(
                    `/animals/${animalId}`
                );
            },
            [navigate]
        );

    /* LOADING */

    if (loading) {
        return (
            <AppShell>
                <div className="telemetry-loading">

                    <div className="telemetry-loading-mark">
                        HS
                    </div>

                    <strong>
                        HerdSense AI
                    </strong>

                    <span>
                        Initializing telemetry network...
                    </span>

                </div>
            </AppShell>
        );
    }

    /* RENDER */

    return (
        <AppShell>

            <div className="telemetry-page">

                <header className="telemetry-header">

                    <div className="telemetry-header-copy">

                        <div className="telemetry-eyebrow">
                            OPERATIONS / TELEMETRY
                        </div>

                        <div className="telemetry-title-row">

                            <h1>
                                Live Telemetry
                            </h1>

                            <span className="telemetry-version">
                                REAL-TIME
                            </span>

                        </div>

                        <p>
                            Continuous visibility into the
                            latest physiological and location
                            signals across the monitoring network.
                        </p>

                    </div>

                    <div className="telemetry-header-actions">

                        <div className="telemetry-network-status">

                            <span
                                className={
                                    websocketConnected
                                        ? "connected"
                                        : "disconnected"
                                }
                            />

                            <div>

                                <strong>
                                    {websocketConnected
                                        ? "Live network"
                                        : "Network offline"}
                                </strong>

                                <small>
                                    {websocketConnected
                                        ? "WebSocket connected"
                                        : "Awaiting connection"}
                                </small>

                            </div>

                        </div>

                        <button
                            type="button"
                            className="telemetry-refresh"
                            onClick={() =>
                                loadTelemetry(
                                    true
                                )
                            }
                            disabled={
                                refreshing
                            }
                        >
                            <span
                                className={
                                    refreshing
                                        ? "is-spinning"
                                        : ""
                                }
                            >
                                ↻
                            </span>

                            {refreshing
                                ? "Syncing"
                                : "Refresh"}
                        </button>

                    </div>

                </header>

                {error && (
                    <div className="telemetry-error">

                        <span className="telemetry-error-icon">
                            !
                        </span>

                        <div>

                            <strong>
                                Telemetry connection issue
                            </strong>

                            <span>
                                {error}
                            </span>

                        </div>

                    </div>
                )}

                {exportNotice && (
                    <div className="telemetry-export-notice">

                        <span>
                            ✓
                        </span>

                        {exportNotice}

                    </div>
                )}

                <section className="telemetry-kpis">

                    <div className="telemetry-kpi">
                        <div className="telemetry-kpi-label">
                            MONITORED
                        </div>

                        <strong>
                            {metrics.monitored}
                        </strong>

                        <span>
                            Registered animals
                        </span>
                    </div>

                    <div className="telemetry-kpi">
                        <div className="telemetry-kpi-label">
                            LIVE SIGNALS
                        </div>

                        <strong>
                            {metrics.live}
                        </strong>

                        <span>
                            Active telemetry
                        </span>
                    </div>

                    <div className="telemetry-kpi">
                        <div className="telemetry-kpi-label">
                            NOMINAL
                        </div>

                        <strong>
                            {metrics.healthy}
                        </strong>

                        <span>
                            Within normal range
                        </span>
                    </div>

                    <div className="telemetry-kpi">

                        <div className="telemetry-kpi-label">
                            ATTENTION
                        </div>

                        <strong
                            className={
                                metrics.attention >
                                0
                                    ? "attention-value"
                                    : ""
                            }
                        >
                            {metrics.attention}
                        </strong>

                        <span>
                            Warning or critical
                        </span>

                    </div>

                </section>

                <section className="telemetry-panel">

                    <div className="telemetry-panel-header">

                        <div>

                            <div className="telemetry-eyebrow">
                                SENSOR NETWORK
                            </div>

                            <h2>
                                Current telemetry
                            </h2>

                            <p>
                                Latest authoritative signal
                                for every registered animal.
                            </p>

                        </div>

                        <div className="telemetry-panel-meta">

                            <div className="telemetry-live-indicator">

                                <span
                                    className={
                                        websocketConnected
                                            ? "live"
                                            : ""
                                    }
                                />

                                {websocketConnected
                                    ? "LIVE"
                                    : "OFFLINE"}

                            </div>

                            <span className="telemetry-last-update">
                                Updated{" "}
                                {formatTime(
                                    latestTimestamp
                                )}
                            </span>

                        </div>

                    </div>

                    <div className="telemetry-toolbar">

                        <div className="telemetry-search">

                            <span>
                                ⌕
                            </span>

                            <input
                                type="text"
                                value={
                                    search
                                }
                                onChange={(
                                    event
                                ) =>
                                    setSearch(
                                        event.target
                                            .value
                                    )
                                }
                                placeholder="Search animal, ID, tag or species"
                                aria-label="Search telemetry"
                            />

                            {search && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSearch(
                                            ""
                                        )
                                    }
                                    aria-label="Clear search"
                                >
                                    ×
                                </button>
                            )}

                        </div>

                        <div className="telemetry-toolbar-right">

                            <div className="telemetry-filter-group">

                                {[
                                    [
                                        "all",
                                        "All",
                                    ],
                                    [
                                        "healthy",
                                        "Healthy",
                                    ],
                                    [
                                        "warning",
                                        "Warning",
                                    ],
                                    [
                                        "critical",
                                        "Critical",
                                    ],
                                    [
                                        "offline",
                                        "No signal",
                                    ],
                                ].map(
                                    ([
                                        value,
                                        label,
                                    ]) => (
                                        <button
                                            key={
                                                value
                                            }
                                            type="button"
                                            className={
                                                statusFilter ===
                                                value
                                                    ? "active"
                                                    : ""
                                            }
                                            onClick={() =>
                                                setStatusFilter(
                                                    value
                                                )
                                            }
                                        >
                                            {label}
                                        </button>
                                    )
                                )}

                            </div>

                            <span className="telemetry-result-count">
                                {
                                    filteredAnimals.length
                                }{" "}
                                monitored
                            </span>

                            <ExportMenu
                                onDownload={
                                    handleDownload
                                }
                                onShare={
                                    handleShare
                                }
                                disabled={
                                    filteredAnimals.length ===
                                    0
                                }
                            />

                        </div>

                    </div>

                    <div className="telemetry-table-wrapper">

                        {filteredAnimals.length ===
                        0 ? (
                            <div className="telemetry-empty">

                                <div className="telemetry-empty-mark">
                                    —
                                </div>

                                <strong>
                                    No telemetry records
                                </strong>

                                <span>
                                    No monitored animals match
                                    the current filter.
                                </span>

                            </div>
                        ) : (
                            <table className="telemetry-table">

                                <thead>

                                    <tr>

                                        <th>
                                            ASSET
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
                                            POSITION
                                        </th>

                                        <th>
                                            SIGNAL
                                        </th>

                                        <th>
                                            STATE
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {filteredAnimals.map(
                                        (
                                            animal
                                        ) => {
                                            const temperatureStatus =
                                                getMetricStatus(
                                                    animal.temperature,
                                                    THRESHOLDS.temperatureWarning,
                                                    THRESHOLDS.temperatureCritical
                                                );

                                            const heartRateStatus =
                                                getMetricStatus(
                                                    animal.heartRate,
                                                    THRESHOLDS.heartRateWarning,
                                                    THRESHOLDS.heartRateCritical
                                                );

                                            const activityStatus =
                                                getMetricStatus(
                                                    animal.activity,
                                                    THRESHOLDS.activityWarning,
                                                    THRESHOLDS.activityCritical,
                                                    true
                                                );

                                            const batteryStatus =
                                                getMetricStatus(
                                                    animal.battery,
                                                    THRESHOLDS.batteryWarning,
                                                    THRESHOLDS.batteryCritical,
                                                    true
                                                );

                                            const signalState =
                                                getSignalState(
                                                    animal.lastSignal
                                                );

                                            const hasGps =
                                                animal.latitude !==
                                                    undefined &&
                                                animal.latitude !==
                                                    null &&
                                                animal.longitude !==
                                                    undefined &&
                                                animal.longitude !==
                                                    null;

                                            return (
                                                <tr
                                                    key={
                                                        animal.id
                                                    }
                                                    className={
                                                        animal.status ===
                                                        "critical"
                                                            ? "telemetry-row-critical"
                                                            : ""
                                                    }
                                                    onClick={() =>
                                                        setSelectedAnimal(
                                                            animal
                                                        )
                                                    }
                                                >

                                                    <td>

                                                        <div className="telemetry-asset">

                                                            <div
                                                                className={`telemetry-avatar telemetry-avatar-${animal.status}`}
                                                            >
                                                                {String(
                                                                    animal.name
                                                                )
                                                                    .charAt(
                                                                        0
                                                                    )
                                                                    .toUpperCase()}
                                                            </div>

                                                            <div className="telemetry-asset-copy">

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
                                                                        animal.tagId
                                                                    }
                                                                </span>

                                                            </div>

                                                        </div>

                                                    </td>

                                                    <td>
                                                        <TelemetryMetric
                                                            value={formatNumber(
                                                                animal.temperature,
                                                                1
                                                            )}
                                                            unit="°C"
                                                            status={
                                                                temperatureStatus
                                                            }
                                                        />
                                                    </td>

                                                    <td>
                                                        <TelemetryMetric
                                                            value={formatNumber(
                                                                animal.heartRate
                                                            )}
                                                            unit="BPM"
                                                            status={
                                                                heartRateStatus
                                                            }
                                                        />
                                                    </td>

                                                    <td>
                                                        <TelemetryMetric
                                                            value={formatNumber(
                                                                animal.activity
                                                            )}
                                                            unit="%"
                                                            status={
                                                                activityStatus
                                                            }
                                                        />
                                                    </td>

                                                    <td>

                                                        <div className="telemetry-battery">

                                                            <div className="telemetry-battery-value">

                                                                <strong>
                                                                    {formatNumber(
                                                                        animal.battery
                                                                    )}
                                                                </strong>

                                                                <span>
                                                                    %
                                                                </span>

                                                            </div>

                                                            <div className="telemetry-battery-track">

                                                                <span
                                                                    className={`telemetry-battery-fill ${batteryStatus}`}
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

                                                        <div
                                                            className={
                                                                hasGps
                                                                    ? "telemetry-position active"
                                                                    : "telemetry-position"
                                                            }
                                                        >

                                                            <span />

                                                            <div>

                                                                <strong>
                                                                    {hasGps
                                                                        ? `${animal.latitude}, ${animal.longitude}`
                                                                        : "No GPS signal"}
                                                                </strong>

                                                                <small>
                                                                    {hasGps
                                                                        ? "Location available"
                                                                        : "Awaiting location"}
                                                                </small>

                                                            </div>

                                                        </div>

                                                    </td>

                                                    <td>

                                                        <div className="telemetry-signal">

                                                            <span
                                                                className={
                                                                    signalState
                                                                }
                                                            />

                                                            <div>

                                                                <strong>
                                                                    {animal.lastSignal
                                                                        ? formatTime(
                                                                              animal.lastSignal
                                                                          )
                                                                        : "No signal"}
                                                                </strong>

                                                                <small>
                                                                    {animal.lastSignal
                                                                        ? formatDate(
                                                                              animal.lastSignal
                                                                          )
                                                                        : "Telemetry unavailable"}
                                                                </small>

                                                            </div>

                                                        </div>

                                                    </td>

                                                    <td>

                                                        <StatusBadge
                                                            status={
                                                                animal.status
                                                            }
                                                        />

                                                    </td>

                                                </tr>
                                            );
                                        }
                                    )}

                                </tbody>

                            </table>
                        )}

                    </div>

                    <div className="telemetry-panel-footer">

                        <span>
                            Showing{" "}
                            <strong>
                                {
                                    filteredAnimals.length
                                }
                            </strong>{" "}
                            of{" "}
                            <strong>
                                {
                                    animalRows.length
                                }
                            </strong>{" "}
                            monitored assets
                        </span>

                        <span>
                            {websocketConnected
                                ? "Live WebSocket stream active"
                                : "WebSocket stream unavailable"}
                        </span>

                    </div>

                </section>

                {selectedAnimal && (
                    <div
                        className="telemetry-drawer-backdrop"
                        onClick={() =>
                            setSelectedAnimal(
                                null
                            )
                        }
                    >

                        <aside
                            className="telemetry-drawer"
                            onClick={(
                                event
                            ) =>
                                event.stopPropagation()
                            }
                        >

                            <div className="telemetry-drawer-header">

                                <div>

                                    <span className="telemetry-eyebrow">
                                        ASSET TELEMETRY
                                    </span>

                                    <h2>
                                        {
                                            selectedAnimal.name
                                        }
                                    </h2>

                                    <span>
                                        ID #
                                        {
                                            selectedAnimal.id
                                        }
                                        {" · "}
                                        {
                                            selectedAnimal.tagId
                                        }
                                    </span>

                                </div>

                                <button
                                    type="button"
                                    className="telemetry-drawer-close"
                                    onClick={() =>
                                        setSelectedAnimal(
                                            null
                                        )
                                    }
                                    aria-label="Close telemetry details"
                                >
                                    ×
                                </button>

                            </div>

                            <div className="telemetry-drawer-state">

                                <StatusBadge
                                    status={
                                        selectedAnimal.status
                                    }
                                />

                                <span>
                                    {
                                        selectedAnimal.species
                                    }
                                </span>

                            </div>

                            <div className="telemetry-drawer-grid">

                                <div className="telemetry-detail-card">
                                    <span>
                                        TEMPERATURE
                                    </span>

                                    <strong>
                                        {formatNumber(
                                            selectedAnimal.temperature,
                                            1
                                        )}

                                        <small>
                                            °C
                                        </small>
                                    </strong>
                                </div>

                                <div className="telemetry-detail-card">
                                    <span>
                                        HEART RATE
                                    </span>

                                    <strong>
                                        {formatNumber(
                                            selectedAnimal.heartRate
                                        )}

                                        <small>
                                            BPM
                                        </small>
                                    </strong>
                                </div>

                                <div className="telemetry-detail-card">
                                    <span>
                                        ACTIVITY
                                    </span>

                                    <strong>
                                        {formatNumber(
                                            selectedAnimal.activity
                                        )}

                                        <small>
                                            %
                                        </small>
                                    </strong>
                                </div>

                                <div className="telemetry-detail-card">
                                    <span>
                                        BATTERY
                                    </span>

                                    <strong>
                                        {formatNumber(
                                            selectedAnimal.battery
                                        )}

                                        <small>
                                            %
                                        </small>
                                    </strong>
                                </div>

                            </div>

                            <div className="telemetry-drawer-section">

                                <span className="telemetry-drawer-section-title">
                                    POSITION
                                </span>

                                <div className="telemetry-drawer-location">

                                    <div className="telemetry-location-icon">
                                        ◎
                                    </div>

                                    <div>

                                        <strong>
                                            {selectedAnimal.latitude !==
                                                undefined &&
                                            selectedAnimal.latitude !==
                                                null &&
                                            selectedAnimal.longitude !==
                                                undefined &&
                                            selectedAnimal.longitude !==
                                                null
                                                ? `${selectedAnimal.latitude}, ${selectedAnimal.longitude}`
                                                : "Location unavailable"}
                                        </strong>

                                        <span>
                                            GPS telemetry
                                        </span>

                                    </div>

                                </div>

                            </div>

                            <div className="telemetry-drawer-section">

                                <span className="telemetry-drawer-section-title">
                                    SIGNAL
                                </span>

                                <div className="telemetry-drawer-signal">

                                    <span
                                        className={
                                            getSignalState(
                                                selectedAnimal.lastSignal
                                            )
                                        }
                                    />

                                    <div>

                                        <strong>
                                            {selectedAnimal.lastSignal
                                                ? formatDate(
                                                      selectedAnimal.lastSignal
                                                  )
                                                : "Awaiting telemetry"}
                                        </strong>

                                        <span>
                                            Last received signal
                                        </span>

                                    </div>

                                </div>

                            </div>

                            <div className="telemetry-drawer-actions">

                                <button
                                    type="button"
                                    className="telemetry-intelligence-button"
                                    onClick={() =>
                                        openAnimalIntelligence(
                                            selectedAnimal.id
                                        )
                                    }
                                >

                                    <span>
                                        Open Animal Intelligence
                                    </span>

                                    <strong>
                                        →
                                    </strong>

                                </button>

                            </div>

                        </aside>

                    </div>
                )}

            </div>

        </AppShell>
    );
}