import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import AppShell from "../components/AppShell";
import api from "../api/api";

import "./IntelligencePages.css";

export default function Reports() {
    const navigate = useNavigate();

    const [animals, setAnimals] = useState([]);
    const [telemetry, setTelemetry] = useState([]);
    const [alerts, setAlerts] = useState([]);

    const [reportType, setReportType] =
        useState("health");

    const [selectedAnimal, setSelectedAnimal] =
        useState("all");

    const [loading, setLoading] =
        useState(true);

    const [generating, setGenerating] =
        useState(false);

    const [error, setError] =
        useState("");

    const [report, setReport] =
        useState(null);

    // =========================================================
    // LOAD REPORT DATA
    // =========================================================

    useEffect(() => {
        let mounted = true;

        const loadReportData = async () => {
            setLoading(true);
            setError("");

            try {
                const [
                    animalsResponse,
                    telemetryResponse,
                    alertsResponse,
                ] = await Promise.all([
                    api.get("/animals/"),
                    api.get("/telemetry/"),
                    api.get("/alerts/"),
                ]);

                if (!mounted) {
                    return;
                }

                const animalsData =
                    Array.isArray(
                        animalsResponse?.data
                    )
                        ? animalsResponse.data
                        : animalsResponse?.data?.items ||
                          [];

                const telemetryData =
                    Array.isArray(
                        telemetryResponse?.data
                    )
                        ? telemetryResponse.data
                        : telemetryResponse?.data?.items ||
                          [];

                const alertsData =
                    Array.isArray(
                        alertsResponse?.data
                    )
                        ? alertsResponse.data
                        : alertsResponse?.data?.items ||
                          [];

                setAnimals(animalsData);
                setTelemetry(telemetryData);
                setAlerts(alertsData);
            } catch (err) {
                console.error(
                    "Reports data loading error:",
                    err
                );

                if (mounted) {
                    setError(
                        "Unable to load reporting data."
                    );
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadReportData();

        return () => {
            mounted = false;
        };
    }, []);

    // =========================================================
    // HELPERS
    // =========================================================

    const getAnimalId = (animal) =>
        animal?.id ??
        animal?.animal_id ??
        animal?.tag_id;

    const getAnimalName = (animal) =>
        animal?.name ??
        animal?.animal_name ??
        `Animal #${getAnimalId(animal)}`;

    const getTelemetryAnimalId = (item) =>
        item?.animal_id ??
        item?.animalId ??
        item?.animal?.id;

    const getAlertAnimalId = (item) =>
        item?.animal_id ??
        item?.animalId ??
        item?.animal?.id;

    // =========================================================
    // FILTERED DATA
    // =========================================================

    const filteredTelemetry = useMemo(() => {
        if (selectedAnimal === "all") {
            return telemetry;
        }

        return telemetry.filter(
            (item) =>
                String(
                    getTelemetryAnimalId(item)
                ) === String(selectedAnimal)
        );
    }, [
        telemetry,
        selectedAnimal,
    ]);

    const filteredAlerts = useMemo(() => {
        if (selectedAnimal === "all") {
            return alerts;
        }

        return alerts.filter(
            (item) =>
                String(
                    getAlertAnimalId(item)
                ) === String(selectedAnimal)
        );
    }, [
        alerts,
        selectedAnimal,
    ]);

    const selectedAnimalData =
        animals.find(
            (animal) =>
                String(
                    getAnimalId(animal)
                ) ===
                String(selectedAnimal)
        );

    const selectedAnimalName =
        selectedAnimal === "all"
            ? "All monitored animals"
            : getAnimalName(
                  selectedAnimalData
              );

    // =========================================================
    // HEALTH SUMMARY
    // =========================================================

    const healthSummary = useMemo(() => {
        const summary = {
            total: animals.length,
            healthy: 0,
            warning: 0,
            critical: 0,
            unknown: 0,
        };

        animals.forEach((animal) => {
            const status = String(
                animal?.health_status ??
                    animal?.status ??
                    "unknown"
            ).toLowerCase();

            if (
                status.includes("critical")
            ) {
                summary.critical += 1;
            } else if (
                status.includes("warning") ||
                status.includes("elevated")
            ) {
                summary.warning += 1;
            } else if (
                status.includes("healthy") ||
                status.includes("normal")
            ) {
                summary.healthy += 1;
            } else {
                summary.unknown += 1;
            }
        });

        return summary;
    }, [animals]);

    // =========================================================
    // REPORT GENERATION
    // =========================================================

    const generateReport = async () => {
        if (generating) {
            return;
        }

        setGenerating(true);
        setError("");
        setReport(null);

        try {
            if (reportType === "health") {
                await generateHealthReport();
            }

            if (reportType === "telemetry") {
                generateTelemetryReport();
            }

            if (reportType === "alerts") {
                generateAlertReport();
            }
        } catch (err) {
            console.error(
                "Report generation error:",
                err
            );

            if (
                err?.response?.status === 404
            ) {
                setError(
                    "The requested intelligence data could not be found."
                );
            } else if (
                err?.response?.status === 500
            ) {
                setError(
                    "The reporting engine could not complete the analysis."
                );
            } else {
                setError(
                    "Unable to generate this report."
                );
            }
        } finally {
            setGenerating(false);
        }
    };

    // =========================================================
    // HEALTH REPORT
    // =========================================================

    const generateHealthReport =
        async () => {
            let intelligence = null;

            if (
                selectedAnimal !== "all"
            ) {
                const response =
                    await api.get(
                        `/intelligence/animal/${selectedAnimal}`
                    );

                intelligence =
                    response?.data || null;
            } else {
                const response =
                    await api.get(
                        "/intelligence/farm"
                    );

                intelligence =
                    response?.data || null;
            }

            setReport({
                type: "health",
                title:
                    "Health Intelligence Report",
                subject:
                    selectedAnimalName,
                generatedAt:
                    new Date().toLocaleString(),
                data: intelligence,
            });
        };

    // =========================================================
    // TELEMETRY REPORT
    // =========================================================

    const generateTelemetryReport =
        () => {
            const temperatures =
                filteredTelemetry
                    .map((item) =>
                        Number(
                            item?.temperature
                        )
                    )
                    .filter(
                        (value) =>
                            Number.isFinite(
                                value
                            )
                    );

            const heartRates =
                filteredTelemetry
                    .map((item) =>
                        Number(
                            item?.heart_rate ??
                                item?.heartRate
                        )
                    )
                    .filter(
                        (value) =>
                            Number.isFinite(
                                value
                            )
                    );

            const activities =
                filteredTelemetry
                    .map((item) =>
                        Number(
                            item?.activity
                        )
                    )
                    .filter(
                        (value) =>
                            Number.isFinite(
                                value
                            )
                    );

            const average = (
                values
            ) => {
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
            };

            setReport({
                type: "telemetry",
                title:
                    "Telemetry Intelligence Report",
                subject:
                    selectedAnimalName,
                generatedAt:
                    new Date().toLocaleString(),
                data: {
                    readings:
                        filteredTelemetry.length,
                    averageTemperature:
                        average(
                            temperatures
                        ),
                    averageHeartRate:
                        average(
                            heartRates
                        ),
                    averageActivity:
                        average(
                            activities
                        ),
                },
            });
        };

    // =========================================================
    // ALERT REPORT
    // =========================================================

    const generateAlertReport =
        () => {
            let critical = 0;
            let warning = 0;
            let low = 0;
            let resolved = 0;
            let unresolved = 0;

            filteredAlerts.forEach(
                (alert) => {
                    const severity =
                        String(
                            alert?.severity ??
                                alert?.level ??
                                ""
                        ).toLowerCase();

                    if (
                        severity ===
                        "critical"
                    ) {
                        critical += 1;
                    } else if (
                        severity ===
                            "warning" ||
                        severity === "warn"
                    ) {
                        warning += 1;
                    } else if (
                        severity ===
                            "low" ||
                        severity === "info"
                    ) {
                        low += 1;
                    }

                    const isResolved =
                        alert?.resolved ===
                            true ||
                        alert?.is_resolved ===
                            true ||
                        String(
                            alert?.status ??
                                ""
                        ).toLowerCase() ===
                            "resolved";

                    if (isResolved) {
                        resolved += 1;
                    } else {
                        unresolved += 1;
                    }
                }
            );

            setReport({
                type: "alerts",
                title:
                    "Alert Intelligence Report",
                subject:
                    selectedAnimalName,
                generatedAt:
                    new Date().toLocaleString(),
                data: {
                    total:
                        filteredAlerts.length,
                    critical,
                    warning,
                    low,
                    resolved,
                    unresolved,
                },
            });
        };

    // =========================================================
    // REPORT TYPE SELECTION
    // =========================================================

    const selectReportType = (type) => {
        setReportType(type);
        setReport(null);
        setError("");
    };

    // =========================================================
    // RENDER
    // =========================================================

    return (
        <AppShell>
            <div className="intelligence-page reports-page">

                {/* =================================================
                    PAGE HEADER
                ================================================= */}

                <header className="reports-header">

                    <div className="reports-header-copy">

                        <div className="reports-breadcrumb">
                            INTELLIGENCE
                            <span>/</span>
                            REPORTING
                        </div>

                        <div className="reports-title-row">

                            <div className="reports-title-mark">
                                <span />
                                <span />
                                <span />
                            </div>

                            <div>
                                <div className="reports-kicker">
                                    OPERATIONS / REPORTING
                                </div>

                                <h1>
                                    Reports
                                </h1>
                            </div>

                        </div>

                        <p>
                            Operational intelligence
                            and historical analysis
                            for monitored livestock.
                        </p>

                    </div>

                    <div className="reports-header-actions">

                        <div className="reports-system-state">
                            <span className="reports-status-dot" />
                            REPORTING ONLINE
                        </div>

                        <button
                            type="button"
                            className="reports-outline-button"
                            onClick={() =>
                                navigate(
                                    "/animals"
                                )
                            }
                        >
                            View animals
                            <span>→</span>
                        </button>

                    </div>

                </header>

                {/* =================================================
                    ERROR
                ================================================= */}

                {error && (
                    <div className="reports-error">
                        <span className="reports-error-icon">
                            !
                        </span>

                        <div>
                            <strong>
                                Reporting system notice
                            </strong>

                            <p>
                                {error}
                            </p>
                        </div>
                    </div>
                )}

                {/* =================================================
                    REPORT GENERATOR
                ================================================= */}

                <section className="reports-generator">

                    <div className="reports-section-heading">

                        <div>
                            <span className="reports-section-index">
                                01
                            </span>

                            <div>
                                <span className="reports-section-kicker">
                                    REPORT GENERATOR
                                </span>

                                <h2>
                                    Build an intelligence report
                                </h2>

                                <p>
                                    Select an intelligence
                                    domain and reporting
                                    population.
                                </p>
                            </div>
                        </div>

                        <div className="reports-generator-state">
                            <span />
                            LIVE DATA SOURCE
                        </div>

                    </div>

                    <div className="reports-generator-body">

                        <div className="reports-field">

                            <label>
                                REPORT TYPE
                            </label>

                            <select
                                value={
                                    reportType
                                }
                                onChange={(
                                    event
                                ) =>
                                    selectReportType(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                <option value="health">
                                    Health Intelligence
                                </option>

                                <option value="telemetry">
                                    Telemetry Intelligence
                                </option>

                                <option value="alerts">
                                    Alert Intelligence
                                </option>
                            </select>

                        </div>

                        <div className="reports-field">

                            <label>
                                POPULATION
                            </label>

                            <select
                                value={
                                    selectedAnimal
                                }
                                onChange={(
                                    event
                                ) => {
                                    setSelectedAnimal(
                                        event
                                            .target
                                            .value
                                    );

                                    setReport(
                                        null
                                    );

                                    setError("");
                                }}
                            >
                                <option value="all">
                                    All monitored animals
                                </option>

                                {animals.map(
                                    (animal) => {
                                        const id =
                                            getAnimalId(
                                                animal
                                            );

                                        return (
                                            <option
                                                key={String(
                                                    id
                                                )}
                                                value={String(
                                                    id
                                                )}
                                            >
                                                {
                                                    getAnimalName(
                                                        animal
                                                    )
                                                }{" "}
                                                — ID #
                                                {id}
                                            </option>
                                        );
                                    }
                                )}
                            </select>

                        </div>

                        <button
                            type="button"
                            className="reports-generate-button"
                            onClick={
                                generateReport
                            }
                            disabled={
                                loading ||
                                generating
                            }
                        >
                            <span>
                                {generating
                                    ? "Generating intelligence..."
                                    : "Generate report"}
                            </span>

                            <strong>
                                →
                            </strong>
                        </button>

                    </div>

                </section>

                {/* =================================================
                    REPORT MODULES
                ================================================= */}

                <section className="reports-modules">

                    <div className="reports-section-topline">

                        <div>
                            <span className="reports-section-kicker">
                                REPORTING MODULES
                            </span>

                            <h2>
                                Intelligence domains
                            </h2>
                        </div>

                        <span className="reports-module-count">
                            03 MODULES
                        </span>

                    </div>

                    <div className="reports-module-grid">

                        <ReportCard
                            number="01"
                            code="HLTH"
                            title="Health Intelligence"
                            description="Population and individual health-state summaries."
                            status="READY"
                            active={
                                reportType ===
                                "health"
                            }
                            onClick={() =>
                                selectReportType(
                                    "health"
                                )
                            }
                        />

                        <ReportCard
                            number="02"
                            code="TELM"
                            title="Telemetry Intelligence"
                            description="Historical physiological and sensor signal analysis."
                            status="READY"
                            active={
                                reportType ===
                                "telemetry"
                            }
                            onClick={() =>
                                selectReportType(
                                    "telemetry"
                                )
                            }
                        />

                        <ReportCard
                            number="03"
                            code="ALRT"
                            title="Alert Intelligence"
                            description="Alert severity, resolution and operational activity."
                            status="READY"
                            active={
                                reportType ===
                                "alerts"
                            }
                            onClick={() =>
                                selectReportType(
                                    "alerts"
                                )
                            }
                        />

                    </div>

                </section>

                {/* =================================================
                    LIVE DATA
                ================================================= */}

                {!report && (
                    <section className="reports-live-section">

                        <div className="reports-section-topline">

                            <div>
                                <span className="reports-section-kicker">
                                    LIVE DATA
                                </span>

                                <h2>
                                    Reporting availability
                                </h2>
                            </div>

                            <span className="reports-live-time">
                                CURRENT DATASET
                            </span>

                        </div>

                        <div className="reports-command-grid">

                            <ReportCommandMetric
                                code="ANML"
                                label="Monitored animals"
                                value={
                                    loading
                                        ? "—"
                                        : healthSummary.total
                                }
                            />

                            <ReportCommandMetric
                                code="TELM"
                                label="Telemetry readings"
                                value={
                                    loading
                                        ? "—"
                                        : telemetry.length
                                }
                            />

                            <ReportCommandMetric
                                code="ALRT"
                                label="Total alerts"
                                value={
                                    loading
                                        ? "—"
                                        : alerts.length
                                }
                            />

                            <ReportCommandMetric
                                code="CRIT"
                                label="Critical animals"
                                value={
                                    loading
                                        ? "—"
                                        : healthSummary.critical
                                }
                                critical={
                                    healthSummary.critical >
                                    0
                                }
                            />

                        </div>

                        <div className="reports-health-strip">

                            <div>
                                <span>
                                    HEALTH DISTRIBUTION
                                </span>

                                <strong>
                                    {healthSummary.healthy}
                                    {" "}
                                    healthy
                                </strong>
                            </div>

                            <div>
                                <span>
                                    WARNING
                                </span>

                                <strong>
                                    {healthSummary.warning}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    CRITICAL
                                </span>

                                <strong className="critical-text">
                                    {
                                        healthSummary.critical
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    UNKNOWN
                                </span>

                                <strong>
                                    {healthSummary.unknown}
                                </strong>
                            </div>

                        </div>

                    </section>
                )}

                {/* =================================================
                    GENERATED REPORT
                ================================================= */}

                {report && (
                    <ReportOutput
                        report={report}
                    />
                )}

                {/* =================================================
                    REPORTING BOUNDARY
                ================================================= */}

                <section className="reports-boundary">

                    <div className="reports-boundary-mark">
                        !
                    </div>

                    <div>

                        <span>
                            REPORTING BOUNDARY
                        </span>

                        <p>
                            Reports summarize
                            operational data already
                            available within HerdSense
                            AI. They support monitoring
                            and decision-making but do
                            not replace veterinary
                            diagnosis or professional
                            clinical assessment.
                        </p>

                    </div>

                </section>

            </div>
        </AppShell>
    );
}

// =============================================================
// REPORT CARD
// =============================================================

function ReportCard({
    number,
    code,
    title,
    description,
    status,
    active,
    onClick,
}) {
    return (
        <button
            type="button"
            className={`reports-module-card ${
                active
                    ? "active"
                    : ""
            }`}
            onClick={onClick}
        >
            <div className="reports-module-top">

                <span className="reports-module-number">
                    {number}
                </span>

                <span className="reports-module-code">
                    {code}
                </span>

            </div>

            <div className="reports-module-content">

                <h3>
                    {title}
                </h3>

                <p>
                    {description}
                </p>

            </div>

            <div className="reports-module-footer">

                <span>
                    {active
                        ? "SELECTED"
                        : status}
                </span>

                <strong>
                    →
                </strong>

            </div>
        </button>
    );
}

// =============================================================
// COMMAND METRIC
// =============================================================

function ReportCommandMetric({
    code,
    label,
    value,
    critical = false,
}) {
    return (
        <div
            className={`reports-command-metric ${
                critical
                    ? "critical"
                    : ""
            }`}
        >
            <div className="reports-command-top">

                <span>
                    {code}
                </span>

                <i />

            </div>

            <strong>
                {value}
            </strong>

            <span>
                {label}
            </span>
        </div>
    );
}

// =============================================================
// REPORT OUTPUT
// =============================================================

function ReportOutput({
    report,
}) {
    const data =
        report?.data || {};

    return (
        <section className="reports-output">

            <div className="reports-output-header">

                <div>

                    <div className="reports-output-status">
                        <span />
                        GENERATED INTELLIGENCE
                    </div>

                    <h2>
                        {report.title}
                    </h2>

                    <p>
                        {report.subject}
                    </p>

                </div>

                <div className="reports-output-meta">

                    <span>
                        GENERATED
                    </span>

                    <strong>
                        {report.generatedAt}
                    </strong>

                </div>

            </div>

            <div className="reports-output-divider" />

            {report.type ===
                "health" && (
                <HealthReport
                    data={data}
                />
            )}

            {report.type ===
                "telemetry" && (
                <TelemetryReport
                    data={data}
                />
            )}

            {report.type ===
                "alerts" && (
                <AlertReport
                    data={data}
                />
            )}

        </section>
    );
}

// =============================================================
// HEALTH REPORT
// =============================================================

function HealthReport({
    data,
}) {
    const summary =
        data?.summary || data;

    return (
        <div className="reports-generated-content">

            <div className="reports-generated-grid">

                <ReportResultMetric
                    label="Total animals"
                    value={
                        summary?.total_animals ??
                        summary?.total ??
                        "—"
                    }
                />

                <ReportResultMetric
                    label="Healthy"
                    value={
                        summary?.healthy ??
                        "—"
                    }
                />

                <ReportResultMetric
                    label="Critical"
                    value={
                        summary?.critical ??
                        "—"
                    }
                    critical
                />

                <ReportResultMetric
                    label="Risk level"
                    value={
                        summary?.farm_risk_level ??
                        "—"
                    }
                />

            </div>

            {Array.isArray(
                data?.animals
            ) && (
                <div className="reports-animal-analysis">

                    <div className="reports-subsection-heading">

                        <span>
                            ANIMAL ANALYSIS
                        </span>

                        <strong>
                            {data.animals.length}
                        </strong>

                    </div>

                    <div className="reports-animal-list">

                        {data.animals.map(
                            (
                                animal,
                                index
                            ) => (
                                <div
                                    className="reports-animal-row"
                                    key={
                                        animal?.animal_id ??
                                        animal?.id ??
                                        index
                                    }
                                >
                                    <div>

                                        <span>
                                            #{String(
                                                animal?.animal_id ??
                                                    animal?.id ??
                                                    "—"
                                            ).padStart(
                                                2,
                                                "0"
                                            )}
                                        </span>

                                        <strong>
                                            {
                                                animal?.animal_name ??
                                                animal?.name ??
                                                `Animal #${
                                                    animal?.animal_id ??
                                                    animal?.id ??
                                                    "—"
                                                }`
                                            }
                                        </strong>

                                    </div>

                                    <span
                                        className={
                                            getRiskClass(
                                                animal?.risk_level ??
                                                    animal?.health_status
                                            )
                                        }
                                    >
                                        {formatReportStatus(
                                            animal?.risk_level ??
                                                animal?.health_status
                                        )}
                                    </span>
                                </div>
                            )
                        )}

                    </div>

                </div>
            )}

        </div>
    );
}

// =============================================================
// TELEMETRY REPORT
// =============================================================

function TelemetryReport({
    data,
}) {
    return (
        <div className="reports-generated-content">

            <div className="reports-generated-grid">

                <ReportResultMetric
                    label="Telemetry readings"
                    value={
                        data?.readings ??
                        "—"
                    }
                />

                <ReportResultMetric
                    label="Average temperature"
                    value={
                        data?.averageTemperature !==
                            null &&
                        data?.averageTemperature !==
                            undefined
                            ? `${data.averageTemperature.toFixed(
                                  1
                              )}°C`
                            : "—"
                    }
                />

                <ReportResultMetric
                    label="Average heart rate"
                    value={
                        data?.averageHeartRate !==
                            null &&
                        data?.averageHeartRate !==
                            undefined
                            ? `${data.averageHeartRate.toFixed(
                                  0
                              )} BPM`
                            : "—"
                    }
                />

                <ReportResultMetric
                    label="Average activity"
                    value={
                        data?.averageActivity !==
                            null &&
                        data?.averageActivity !==
                            undefined
                            ? `${data.averageActivity.toFixed(
                                  0
                              )}%`
                            : "—"
                    }
                />

            </div>

            <div className="reports-analysis-note">

                <span>
                    TELEMETRY ANALYSIS
                </span>

                <p>
                    The report summarizes
                    available physiological
                    telemetry for the selected
                    reporting population.
                </p>

            </div>

        </div>
    );
}

// =============================================================
// ALERT REPORT
// =============================================================

function AlertReport({
    data,
}) {
    return (
        <div className="reports-generated-content">

            <div className="reports-generated-grid">

                <ReportResultMetric
                    label="Total alerts"
                    value={
                        data?.total ??
                        0
                    }
                />

                <ReportResultMetric
                    label="Critical"
                    value={
                        data?.critical ??
                        0
                    }
                    critical
                />

                <ReportResultMetric
                    label="Warning"
                    value={
                        data?.warning ??
                        0
                    }
                />

                <ReportResultMetric
                    label="Resolved"
                    value={
                        data?.resolved ??
                        0
                    }
                />

                <ReportResultMetric
                    label="Unresolved"
                    value={
                        data?.unresolved ??
                        0
                    }
                />

            </div>

            <div className="reports-alert-distribution">

                <div>
                    <span>
                        CRITICAL
                    </span>

                    <strong className="critical-text">
                        {data?.critical ?? 0}
                    </strong>
                </div>

                <div>
                    <span>
                        WARNING
                    </span>

                    <strong>
                        {data?.warning ?? 0}
                    </strong>
                </div>

                <div>
                    <span>
                        LOW / INFO
                    </span>

                    <strong>
                        {data?.low ?? 0}
                    </strong>
                </div>

                <div>
                    <span>
                        UNRESOLVED
                    </span>

                    <strong>
                        {data?.unresolved ?? 0}
                    </strong>
                </div>

            </div>

        </div>
    );
}

// =============================================================
// RESULT METRIC
// =============================================================

function ReportResultMetric({
    label,
    value,
    critical = false,
}) {
    return (
        <div
            className={`reports-result-metric ${
                critical
                    ? "critical"
                    : ""
            }`}
        >
            <span>
                {label}
            </span>

            <strong>
                {value}
            </strong>
        </div>
    );
}

// =============================================================
// REPORT STATUS HELPERS
// =============================================================

function getRiskClass(value) {
    const normalized =
        String(value ?? "")
            .toLowerCase();

    if (
        normalized.includes(
            "critical"
        ) ||
        normalized.includes(
            "high"
        )
    ) {
        return "critical";
    }

    if (
        normalized.includes(
            "warning"
        ) ||
        normalized.includes(
            "moderate"
        ) ||
        normalized.includes(
            "medium"
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
        ) ||
        normalized.includes(
            "low"
        )
    ) {
        return "healthy";
    }

    return "neutral";
}

function formatReportStatus(value) {
    if (!value) {
        return "Unknown";
    }

    return String(value)
        .replace(
            /_/g,
            " "
        )
        .replace(
            /\b\w/g,
            (character) =>
                character.toUpperCase()
        );
}