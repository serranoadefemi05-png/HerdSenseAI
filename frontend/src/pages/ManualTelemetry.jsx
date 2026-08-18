/* ==========================================================================
   HERDSENSE AI — MANUAL TELEMETRY
   Enterprise telemetry input + reporting console
   ========================================================================== */

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { useNavigate } from "react-router-dom";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import AppShell from "../components/AppShell";
import api from "../api/api";

import "./ManualTelemetry.css";

/* ==========================================================================
   CONSTANTS
   ========================================================================== */

const INITIAL_FORM = {
    animal_id: "",
    temperature: "",
    heart_rate: "",
    activity: "",
    battery: "",
    latitude: "",
    longitude: "",
};

/* ==========================================================================
   HELPERS
   ========================================================================== */

function getToken() {
    return localStorage.getItem(
        "access_token"
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

function getAnimalId(animal) {
    return (
        animal?.id ??
        animal?.animal_id ??
        animal?.animalId
    );
}

function getAnimalName(animal) {
    return (
        animal?.name ||
        animal?.animal_name ||
        animal?.animalName ||
        `Animal #${getAnimalId(animal) ?? "—"}`
    );
}

function getAnimalTag(animal) {
    return (
        animal?.tag_id ||
        animal?.tagId ||
        "Unassigned"
    );
}

function getAnimalSpecies(animal) {
    return (
        animal?.species ||
        animal?.animal_type ||
        animal?.animalType ||
        "Livestock"
    );
}

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
   MANUAL EXPORT DATA
   ========================================================================== */

function buildManualRows(
    telemetry,
    animal,
    animalName
) {
    return [
        {
            animal_id:
                telemetry?.animal_id ??
                getAnimalId(
                    animal
                ),

            animal_name:
                animalName,

            tag_id:
                getAnimalTag(
                    animal
                ),

            species:
                getAnimalSpecies(
                    animal
                ),

            temperature_c:
                telemetry?.temperature,

            heart_rate_bpm:
                telemetry?.heart_rate,

            activity_percent:
                telemetry?.activity,

            battery_percent:
                telemetry?.battery,

            latitude:
                telemetry?.latitude ??
                "",

            longitude:
                telemetry?.longitude ??
                "",

            recorded_at:
                telemetry?.recorded_at ||
                telemetry?.timestamp ||
                new Date().toISOString(),

            source:
                "Manual telemetry",
        },
    ];
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
    const row =
        rows[0];

    if (!row) {
        return "";
    }

    return [
        "HERDSENSE AI",
        "MANUAL TELEMETRY REPORT",
        "========================================",
        `Generated: ${new Date().toLocaleString()}`,
        "",
        `Animal: ${row.animal_name}`,
        `Animal ID: ${row.animal_id}`,
        `Tag ID: ${row.tag_id}`,
        `Species: ${row.species}`,
        "",
        "SENSOR READINGS",
        "----------------------------------------",
        `Temperature: ${row.temperature_c} °C`,
        `Heart Rate: ${row.heart_rate_bpm} BPM`,
        `Activity: ${row.activity_percent}%`,
        `Battery: ${row.battery_percent}%`,
        "",
        "LOCATION",
        "----------------------------------------",
        `Latitude: ${row.latitude || "Unavailable"}`,
        `Longitude: ${row.longitude || "Unavailable"}`,
        "",
        `Recorded: ${row.recorded_at}`,
        `Source: ${row.source}`,
        "========================================",
    ].join("\n");
}

/* ==========================================================================
   REAL PDF GENERATION
   ========================================================================== */

function generateManualTelemetryPDF(
    rows
) {
    const row =
        rows[0];

    if (!row) {
        return;
    }

    const doc =
        new jsPDF({
            orientation:
                "portrait",
            unit: "mm",
            format: "a4",
        });

    const pageWidth =
        doc.internal.pageSize
            .getWidth();

    const pageHeight =
        doc.internal.pageSize
            .getHeight();

    const generated =
        new Date()
            .toLocaleString();

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
        34,
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
        15,
        14
    );

    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(
        9
    );

    doc.text(
        "MANUAL TELEMETRY REPORT",
        15,
        22
    );

    doc.setTextColor(
        180,
        190,
        205
    );

    doc.text(
        generated,
        pageWidth - 15,
        14,
        {
            align:
                "right",
        }
    );

    doc.text(
        "Enterprise telemetry record",
        pageWidth - 15,
        22,
        {
            align:
                "right",
        }
    );

    /* ASSET INFORMATION */

    doc.setTextColor(
        35,
        42,
        52
    );

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(
        11
    );

    doc.text(
        "Animal Profile",
        15,
        46
    );

    autoTable(
        doc,
        {
            startY: 52,

            margin: {
                left: 15,
                right: 15,
            },

            head: [[
                "Field",
                "Value",
            ]],

            body: [
                [
                    "Animal",
                    row.animal_name,
                ],
                [
                    "Animal ID",
                    String(
                        row.animal_id ??
                        "—"
                    ),
                ],
                [
                    "Tag ID",
                    row.tag_id,
                ],
                [
                    "Species",
                    row.species,
                ],
                [
                    "Source",
                    row.source,
                ],
            ],

            theme:
                "grid",

            styles: {
                font:
                    "helvetica",

                fontSize:
                    9,

                cellPadding:
                    4,

                lineColor: [
                    220,
                    225,
                    232,
                ],

                textColor: [
                    35,
                    42,
                    52,
                ],
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
            },

            columnStyles: {
                0: {
                    cellWidth:
                        45,
                },

                1: {
                    cellWidth:
                        130,
                },
            },

            alternateRowStyles: {
                fillColor: [
                    247,
                    249,
                    252,
                ],
            },
        }
    );

    /* SENSOR READINGS */

    const sensorStart =
        (doc.lastAutoTable?.finalY ||
            52) + 14;

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(
        11
    );

    doc.setTextColor(
        35,
        42,
        52
    );

    doc.text(
        "Sensor Readings",
        15,
        sensorStart
    );

    autoTable(
        doc,
        {
            startY:
                sensorStart + 6,

            margin: {
                left: 15,
                right: 15,
            },

            head: [[
                "Measurement",
                "Reading",
                "Unit",
            ]],

            body: [
                [
                    "Temperature",
                    row.temperature_c,
                    "°C",
                ],
                [
                    "Heart Rate",
                    row.heart_rate_bpm,
                    "BPM",
                ],
                [
                    "Activity",
                    row.activity_percent,
                    "%",
                ],
                [
                    "Battery",
                    row.battery_percent,
                    "%",
                ],
            ],

            theme:
                "grid",

            styles: {
                fontSize:
                    9,

                cellPadding:
                    4,

                lineColor: [
                    220,
                    225,
                    232,
                ],

                textColor: [
                    35,
                    42,
                    52,
                ],
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
            },

            alternateRowStyles: {
                fillColor: [
                    247,
                    249,
                    252,
                ],
            },

            columnStyles: {
                0: {
                    cellWidth:
                        70,
                },

                1: {
                    cellWidth:
                        65,
                },

                2: {
                    cellWidth:
                        40,
                },
            },
        }
    );

    /* LOCATION */

    const locationStart =
        (doc.lastAutoTable?.finalY ||
            sensorStart + 50) +
        14;

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(
        11
    );

    doc.text(
        "Location & Timing",
        15,
        locationStart
    );

    autoTable(
        doc,
        {
            startY:
                locationStart + 6,

            margin: {
                left: 15,
                right: 15,
            },

            head: [[
                "Field",
                "Value",
            ]],

            body: [
                [
                    "Latitude",
                    row.latitude ||
                        "Unavailable",
                ],
                [
                    "Longitude",
                    row.longitude ||
                        "Unavailable",
                ],
                [
                    "Recorded At",
                    new Date(
                        row.recorded_at
                    ).toLocaleString(),
                ],
            ],

            theme:
                "grid",

            styles: {
                fontSize:
                    9,

                cellPadding:
                    4,

                lineColor: [
                    220,
                    225,
                    232,
                ],

                textColor: [
                    35,
                    42,
                    52,
                ],
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
            },

            alternateRowStyles: {
                fillColor: [
                    247,
                    249,
                    252,
                ],
            },

            columnStyles: {
                0: {
                    cellWidth:
                        55,
                },

                1: {
                    cellWidth:
                        120,
                },
            },
        }
    );

    /* FOOTER */

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
        15,
        pageHeight - 9
    );

    doc.text(
        "Manual telemetry record",
        pageWidth - 15,
        pageHeight - 9,
        {
            align:
                "right",
        }
    );

    doc.save(
        `herdsense-manual-telemetry-${Date.now()}.pdf`
    );
}

/* ==========================================================================
   EXPORT MENU
   ========================================================================== */

function ExportMenu({
    onDownload,
    onShare,
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
                        ".manual-export"
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

    return (
        <div className="manual-export">

            <button
                type="button"
                className="manual-export-download"
                onClick={() =>
                    setOpen(
                        (current) =>
                            !current
                    )
                }
            >
                <span>
                    ↓
                </span>

                Download

                <small>
                    ▾
                </small>
            </button>

            {open && (
                <div className="manual-export-menu">

                    <div>
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
                                onClick={() => {
                                    setOpen(
                                        false
                                    );

                                    onDownload(
                                        value
                                    );
                                }}
                            >
                                <strong>
                                    {label}
                                </strong>

                                <span>
                                    {
                                        description
                                    }
                                </span>
                            </button>
                        )
                    )}

                </div>
            )}

            <button
                type="button"
                className="manual-export-share"
                onClick={
                    onShare
                }
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

export default function ManualTelemetry() {
    const navigate =
        useNavigate();

    const [
        animals,
        setAnimals,
    ] = useState([]);

    const [
        form,
        setForm,
    ] = useState(
        INITIAL_FORM
    );

    const [
        loadingAnimals,
        setLoadingAnimals,
    ] = useState(true);

    const [
        submitting,
        setSubmitting,
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
        success,
        setSuccess,
    ] = useState(null);

    const [
        exportNotice,
        setExportNotice,
    ] = useState("");

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

    /* LOAD ANIMALS */

    const fetchAnimals =
        useCallback(
            async () => {
                const token =
                    getToken();

                if (!token) {
                    handleAuthFailure();
                    return;
                }

                try {
                    setLoadingAnimals(
                        true
                    );

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

                    setAnimals(
                        normalizeArray(
                            response.data
                        )
                    );

                    setApiOnline(
                        true
                    );
                } catch (err) {
                    console.error(
                        "Manual telemetry animal fetch error:",
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
                        "Unable to load registered animals."
                    );
                } finally {
                    setLoadingAnimals(
                        false
                    );
                }
            },
            [
                handleAuthFailure,
            ]
        );

    useEffect(() => {
        fetchAnimals();
    }, [
        fetchAnimals,
    ]);

    /* FORM */

    const handleChange =
        (event) => {
            const {
                name,
                value,
            } =
                event.target;

            setForm(
                (current) => ({
                    ...current,
                    [name]:
                        value,
                })
            );

            if (error) {
                setError(
                    ""
                );
            }

            if (success) {
                setSuccess(
                    null
                );
            }
        };

    /* SUBMIT */

    const handleSubmit =
        async (event) => {
            event.preventDefault();

            const token =
                getToken();

            if (!token) {
                handleAuthFailure();
                return;
            }

            setError("");
            setSuccess(null);

            if (
                !form.animal_id
            ) {
                setError(
                    "Select an animal before submitting telemetry."
                );

                return;
            }

            if (
                form.temperature ===
                    "" ||
                form.heart_rate ===
                    "" ||
                form.activity ===
                    "" ||
                form.battery ===
                    ""
            ) {
                setError(
                    "Temperature, heart rate, activity and battery are required."
                );

                return;
            }

            const payload = {
                animal_id:
                    Number(
                        form.animal_id
                    ),

                temperature:
                    Number(
                        form.temperature
                    ),

                heart_rate:
                    Number(
                        form.heart_rate
                    ),

                activity:
                    Number(
                        form.activity
                    ),

                battery:
                    Number(
                        form.battery
                    ),

                latitude:
                    form.latitude ===
                    ""
                        ? null
                        : Number(
                              form.latitude
                          ),

                longitude:
                    form.longitude ===
                    ""
                        ? null
                        : Number(
                              form.longitude
                          ),
            };

            if (
                !Number.isFinite(
                    payload.temperature
                ) ||
                payload.temperature <
                    20 ||
                payload.temperature >
                    50
            ) {
                setError(
                    "Temperature must be between 20°C and 50°C."
                );

                return;
            }

            if (
                !Number.isFinite(
                    payload.heart_rate
                ) ||
                payload.heart_rate <
                    0 ||
                payload.heart_rate >
                    300
            ) {
                setError(
                    "Heart rate must be between 0 and 300 BPM."
                );

                return;
            }

            if (
                !Number.isFinite(
                    payload.activity
                ) ||
                payload.activity <
                    0 ||
                payload.activity >
                    100
            ) {
                setError(
                    "Activity must be between 0% and 100%."
                );

                return;
            }

            if (
                !Number.isFinite(
                    payload.battery
                ) ||
                payload.battery <
                    0 ||
                payload.battery >
                    100
            ) {
                setError(
                    "Battery must be between 0% and 100%."
                );

                return;
            }

            if (
                payload.latitude !==
                    null &&
                (
                    !Number.isFinite(
                        payload.latitude
                    ) ||
                    payload.latitude <
                        -90 ||
                    payload.latitude >
                        90
                )
            ) {
                setError(
                    "Latitude must be between -90 and 90."
                );

                return;
            }

            if (
                payload.longitude !==
                    null &&
                (
                    !Number.isFinite(
                        payload.longitude
                    ) ||
                    payload.longitude <
                        -180 ||
                    payload.longitude >
                        180
                )
            ) {
                setError(
                    "Longitude must be between -180 and 180."
                );

                return;
            }

            try {
                setSubmitting(
                    true
                );

                const response =
                    await api.post(
                        "/telemetry/",
                        payload,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
                            },
                        }
                    );

                setApiOnline(
                    true
                );

                const selectedAnimal =
                    animals.find(
                        (animal) =>
                            String(
                                getAnimalId(
                                    animal
                                )
                            ) ===
                            String(
                                form.animal_id
                            )
                    );

                setSuccess({
                    telemetry:
                        response.data,

                    animal:
                        selectedAnimal,

                    animalName:
                        getAnimalName(
                            selectedAnimal
                        ),
                });

                setForm(
                    INITIAL_FORM
                );
            } catch (err) {
                console.error(
                    "Manual telemetry submission error:",
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
                    Boolean(
                        err?.response
                    )
                );

                const detail =
                    err?.response
                        ?.data
                        ?.detail;

                if (
                    Array.isArray(
                        detail
                    )
                ) {
                    setError(
                        detail
                            .map(
                                (
                                    item
                                ) =>
                                    item?.msg ||
                                    "Invalid telemetry data."
                            )
                            .join(
                                " "
                            )
                    );
                } else if (
                    typeof detail ===
                    "string"
                ) {
                    setError(
                        detail
                    );
                } else {
                    setError(
                        "Unable to submit telemetry."
                    );
                }
            } finally {
                setSubmitting(
                    false
                );
            }
        };

    /* CLEAR */

    const handleClear =
        () => {
            setForm(
                INITIAL_FORM
            );

            setError("");
            setSuccess(null);
        };

    /* EXPORT DATA */

    const exportRows =
        useMemo(() => {
            if (
                !success?.telemetry
            ) {
                return [];
            }

            return buildManualRows(
                success.telemetry,
                success.animal,
                success.animalName
            );
        }, [
            success,
        ]);

    const handleDownload =
        useCallback(
            (format) => {
                if (
                    !exportRows.length
                ) {
                    setExportNotice(
                        "Submit a telemetry reading before exporting."
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
                    `herdsense-manual-telemetry-${timestamp}`;

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
                        "CSV report downloaded."
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
                                    "Manual Telemetry",

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
                        "JSON report downloaded."
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
                        "TXT report downloaded."
                    );

                    return;
                }

                if (
                    format ===
                    "pdf"
                ) {
                    try {
                        generateManualTelemetryPDF(
                            exportRows
                        );

                        setExportNotice(
                            "Professional PDF telemetry report downloaded."
                        );
                    } catch (err) {
                        console.error(
                            "Manual telemetry PDF error:",
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
                        "Submit a telemetry reading before sharing."
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
                        "herdsense-manual-telemetry.csv",
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
                                        "HerdSense AI — Manual Telemetry",

                                    text:
                                        `Manual telemetry report for ${exportRows[0].animal_name}.`,

                                    files: [
                                        file,
                                    ],
                                }
                            );
                        } else {
                            await navigator.share(
                                {
                                    title:
                                        "HerdSense AI — Manual Telemetry",

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

    /* LOADING */

    if (
        loadingAnimals
    ) {
        return (
            <AppShell>

                <div className="manual-telemetry-loading">

                    <div className="manual-telemetry-loading-mark">
                        HS
                    </div>

                    <strong>
                        HerdSense AI
                    </strong>

                    <span>
                        Loading telemetry interface...
                    </span>

                </div>

            </AppShell>
        );
    }

    /* RENDER */

    return (
        <AppShell>

            <div className="manual-telemetry-page">

                <section className="manual-telemetry-header">

                    <div>

                        <span className="manual-telemetry-eyebrow">
                            OPERATIONS / TELEMETRY
                        </span>

                        <div className="manual-telemetry-title-row">

                            <h1>
                                Manual Telemetry
                            </h1>

                            <span className="manual-telemetry-mode">
                                MANUAL INPUT
                            </span>

                        </div>

                        <p>
                            Enter a sensor reading manually
                            for any registered animal.
                        </p>

                    </div>

                    <div className="manual-telemetry-header-actions">

                        <div
                            className={`manual-telemetry-api-status ${
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
                            className="manual-telemetry-back-button"
                            onClick={() =>
                                navigate(
                                    "/animals"
                                )
                            }
                        >
                            ← Animals
                        </button>

                    </div>

                </section>

                {error && (
                    <div className="manual-telemetry-error">

                        <div className="manual-telemetry-error-icon">
                            !
                        </div>

                        <div>

                            <strong>
                                Submission issue
                            </strong>

                            <span>
                                {error}
                            </span>

                        </div>

                    </div>
                )}

                {exportNotice && (
                    <div className="manual-telemetry-export-notice">

                        <span>
                            ✓
                        </span>

                        {exportNotice}

                    </div>
                )}

                <div className="manual-telemetry-layout">

                    <section className="manual-telemetry-panel">

                        <div className="manual-telemetry-panel-header">

                            <div>

                                <span className="manual-telemetry-section-label">
                                    SENSOR INPUT
                                </span>

                                <h2>
                                    Enter telemetry
                                </h2>

                                <p>
                                    Manual readings use the same
                                    intelligence pipeline as hardware
                                    telemetry.
                                </p>

                            </div>

                            <div className="manual-telemetry-panel-indicator">
                                MANUAL
                            </div>

                        </div>

                        <form
                            className="manual-telemetry-form"
                            onSubmit={
                                handleSubmit
                            }
                        >

                            <div className="manual-telemetry-field full">

                                <label htmlFor="animal_id">
                                    ANIMAL
                                </label>

                                <select
                                    id="animal_id"
                                    name="animal_id"
                                    value={
                                        form.animal_id
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    required
                                >

                                    <option value="">
                                        Select registered animal
                                    </option>

                                    {animals.map(
                                        (
                                            animal
                                        ) => (
                                            <option
                                                key={
                                                    getAnimalId(
                                                        animal
                                                    )
                                                }
                                                value={
                                                    getAnimalId(
                                                        animal
                                                    )
                                                }
                                            >
                                                {
                                                    getAnimalName(
                                                        animal
                                                    )
                                                }
                                                {" — ID #"}
                                                {
                                                    getAnimalId(
                                                        animal
                                                    )
                                                }
                                            </option>
                                        )
                                    )}

                                </select>

                            </div>

                            <div className="manual-telemetry-field">

                                <label htmlFor="temperature">
                                    TEMPERATURE
                                </label>

                                <div className="manual-telemetry-input-unit">

                                    <input
                                        id="temperature"
                                        name="temperature"
                                        type="number"
                                        step="0.1"
                                        min="20"
                                        max="50"
                                        value={
                                            form.temperature
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="38.5"
                                        required
                                    />

                                    <span>
                                        °C
                                    </span>

                                </div>

                                <small>
                                    Values at or above
                                    39.5°C trigger temperature
                                    intelligence.
                                </small>

                            </div>

                            <div className="manual-telemetry-field">

                                <label htmlFor="heart_rate">
                                    HEART RATE
                                </label>

                                <div className="manual-telemetry-input-unit">

                                    <input
                                        id="heart_rate"
                                        name="heart_rate"
                                        type="number"
                                        min="0"
                                        max="300"
                                        value={
                                            form.heart_rate
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="85"
                                        required
                                    />

                                    <span>
                                        BPM
                                    </span>

                                </div>

                                <small>
                                    Values at or above
                                    120 BPM trigger heart-rate
                                    intelligence.
                                </small>

                            </div>

                            <div className="manual-telemetry-field">

                                <label htmlFor="activity">
                                    ACTIVITY
                                </label>

                                <div className="manual-telemetry-input-unit">

                                    <input
                                        id="activity"
                                        name="activity"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={
                                            form.activity
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="72"
                                        required
                                    />

                                    <span>
                                        %
                                    </span>

                                </div>

                                <small>
                                    Values at or below
                                    25% indicate reduced activity.
                                </small>

                            </div>

                            <div className="manual-telemetry-field">

                                <label htmlFor="battery">
                                    BATTERY
                                </label>

                                <div className="manual-telemetry-input-unit">

                                    <input
                                        id="battery"
                                        name="battery"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={
                                            form.battery
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="94"
                                        required
                                    />

                                    <span>
                                        %
                                    </span>

                                </div>

                                <small>
                                    Current animal tag battery
                                    level.
                                </small>

                            </div>

                            <div className="manual-telemetry-subsection">

                                <div>

                                    <span className="manual-telemetry-section-label">
                                        LOCATION
                                    </span>

                                    <h3>
                                        GPS coordinates
                                    </h3>

                                    <p>
                                        Optional. Providing
                                        coordinates enables
                                        geofence intelligence.
                                    </p>

                                </div>

                            </div>

                            <div className="manual-telemetry-field">

                                <label htmlFor="latitude">
                                    LATITUDE
                                </label>

                                <input
                                    id="latitude"
                                    name="latitude"
                                    type="number"
                                    step="any"
                                    min="-90"
                                    max="90"
                                    value={
                                        form.latitude
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="6.5244"
                                />

                                <small>
                                    Optional. Range:
                                    -90 to 90.
                                </small>

                            </div>

                            <div className="manual-telemetry-field">

                                <label htmlFor="longitude">
                                    LONGITUDE
                                </label>

                                <input
                                    id="longitude"
                                    name="longitude"
                                    type="number"
                                    step="any"
                                    min="-180"
                                    max="180"
                                    value={
                                        form.longitude
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="3.3792"
                                />

                                <small>
                                    Optional. Range:
                                    -180 to 180.
                                </small>

                            </div>

                            <div className="manual-telemetry-actions">

                                <button
                                    type="button"
                                    className="manual-telemetry-clear"
                                    onClick={
                                        handleClear
                                    }
                                    disabled={
                                        submitting
                                    }
                                >
                                    Clear
                                </button>

                                <button
                                    type="submit"
                                    className="manual-telemetry-submit"
                                    disabled={
                                        submitting ||
                                        animals.length ===
                                            0
                                    }
                                >
                                    {submitting
                                        ? "Processing..."
                                        : "Submit Reading →"}
                                </button>

                            </div>

                        </form>

                    </section>

                    <aside className="manual-telemetry-info">

                        <div className="manual-telemetry-info-card manual-telemetry-primary-card">

                            <span className="manual-telemetry-section-label">
                                INTELLIGENCE PIPELINE
                            </span>

                            <h2>
                                Same intelligence.
                                <br />
                                No hardware required.
                            </h2>

                            <p>
                                Manual readings are processed
                                through the same health analysis,
                                alert intelligence and real-time
                                synchronization system used by
                                connected animal hardware.
                            </p>

                            <div className="manual-telemetry-pipeline">

                                {[
                                    [
                                        "01",
                                        "Sensor input",
                                        "Manual telemetry",
                                    ],
                                    [
                                        "02",
                                        "Health analysis",
                                        "Threshold evaluation",
                                    ],
                                    [
                                        "03",
                                        "Alert intelligence",
                                        "Risk detection",
                                    ],
                                    [
                                        "04",
                                        "Live command center",
                                        "Dashboard synchronization",
                                    ],
                                ].map(
                                    (item) => (
                                        <div
                                            key={
                                                item[0]
                                            }
                                        >
                                            <span>
                                                {
                                                    item[0]
                                                }
                                            </span>

                                            <strong>
                                                {
                                                    item[1]
                                                }
                                            </strong>

                                            <small>
                                                {
                                                    item[2]
                                                }
                                            </small>
                                        </div>
                                    )
                                )}

                            </div>

                        </div>

                        <div className="manual-telemetry-info-card">

                            <span className="manual-telemetry-section-label">
                                TESTING
                            </span>

                            <h3>
                                Critical-condition test
                            </h3>

                            <p>
                                Use values above your configured
                                health thresholds to verify that
                                the dashboard and Alert Center
                                react correctly.
                            </p>

                            <div className="manual-telemetry-example">

                                <div>
                                    <span>
                                        TEMPERATURE
                                    </span>

                                    <strong>
                                        41.5°C
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        HEART RATE
                                    </span>

                                    <strong>
                                        150 BPM
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        ACTIVITY
                                    </span>

                                    <strong>
                                        8%
                                    </strong>
                                </div>

                            </div>

                        </div>

                        <div className="manual-telemetry-info-card compact">

                            <span className="manual-telemetry-section-label">
                                HARDWARE
                            </span>

                            <p>
                                When physical monitoring hardware
                                becomes available, it can continue
                                using the standard telemetry API.
                                No dashboard redesign is required.
                            </p>

                        </div>

                    </aside>

                </div>

                {success && (
                    <section className="manual-telemetry-success">

                        <div className="manual-telemetry-success-icon">
                            ✓
                        </div>

                        <div className="manual-telemetry-success-copy">

                            <span className="manual-telemetry-section-label">
                                TELEMETRY ACCEPTED
                            </span>

                            <h2>
                                Reading processed successfully
                            </h2>

                            <p>
                                {
                                    success.animalName
                                }{" "}
                                telemetry has been sent
                                through the HerdSense AI
                                intelligence pipeline.
                            </p>

                        </div>

                        <div className="manual-telemetry-success-actions">

                            <ExportMenu
                                onDownload={
                                    handleDownload
                                }
                                onShare={
                                    handleShare
                                }
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    navigate(
                                        "/dashboard"
                                    )
                                }
                            >
                                View Dashboard →
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    navigate(
                                        "/alerts"
                                    )
                                }
                            >
                                View Alerts →
                            </button>

                        </div>

                    </section>
                )}

            </div>

        </AppShell>
    );
}