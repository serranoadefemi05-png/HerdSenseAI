import {
    useEffect,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import AppShell from "../components/AppShell";
import api from "../api/api";

import "./DiseasePrediction.css";

export default function DiseasePrediction() {
    const navigate = useNavigate();

    const [animals, setAnimals] = useState([]);
    const [selectedAnimal, setSelectedAnimal] =
        useState("");

    const [prediction, setPrediction] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [predicting, setPredicting] =
        useState(false);

    const [error, setError] =
        useState("");

    useEffect(() => {
        const loadAnimals = async () => {
            try {
                const response =
                    await api.get("/animals/");

                const data =
                    Array.isArray(response?.data)
                        ? response.data
                        : response?.data?.items || [];

                setAnimals(data);

                if (data.length > 0) {
                    const firstId =
                        data[0]?.id ??
                        data[0]?.animal_id ??
                        data[0]?.tag_id;

                    if (
                        firstId !== undefined &&
                        firstId !== null
                    ) {
                        setSelectedAnimal(
                            String(firstId)
                        );
                    }
                }
            } catch (err) {
                console.error(
                    "Disease prediction animal loading error:",
                    err
                );

                setError(
                    "Unable to load monitored animals."
                );
            } finally {
                setLoading(false);
            }
        };

        loadAnimals();
    }, []);

    const runPrediction = async () => {
        if (!selectedAnimal) {
            return;
        }

        setPredicting(true);
        setError("");
        setPrediction(null);

        try {
            const response =
                await api.get(
                    `/intelligence/animal/${selectedAnimal}/disease-risk`
                );

            /*
             * Backend contract:
             *
             * {
             *   animal_id,
             *   animal_name,
             *   prediction: {
             *      status,
             *      overall_risk_score,
             *      overall_risk_level,
             *      confidence,
             *      confidence_score,
             *      predictions,
             *      highest_risk,
             *      recommendation,
             *      diagnosis,
             *      disclaimer,
             *      engine
             *   }
             * }
             */

            const result =
                response?.data?.prediction ??
                response?.data ??
                null;

            setPrediction(result);

        } catch (err) {
            console.error(
                "Disease prediction error:",
                err
            );

            if (
                err?.response?.status === 404
            ) {
                setError(
                    "The selected animal could not be found."
                );
            } else if (
                err?.response?.status === 500
            ) {
                setError(
                    "The disease-risk engine could not complete the analysis."
                );
            } else {
                setError(
                    "Unable to retrieve disease-risk intelligence."
                );
            }
        } finally {
            setPredicting(false);
        }
    };

    const selectedAnimalData =
        animals.find((animal) => {
            const id =
                animal?.id ??
                animal?.animal_id ??
                animal?.tag_id;

            return (
                String(id) ===
                String(selectedAnimal)
            );
        });

    const selectedName =
        selectedAnimalData?.name ??
        selectedAnimalData?.animal_name ??
        `Animal #${selectedAnimal}`;

    return (
        <AppShell>
            <div className="hs-prediction-page">

                {/* =====================================================
                    PAGE HEADER
                ===================================================== */}

                <header className="hs-intelligence-header">

                    <div>
                        <div className="hs-page-kicker">
                            INTELLIGENCE
                        </div>

                        <h1>
                            Disease Prediction
                        </h1>

                        <p>
                            Animal-specific disease-risk
                            intelligence generated from
                            available health and telemetry
                            signals.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="hs-prediction-secondary"
                        onClick={() =>
                            navigate("/animals")
                        }
                    >
                        View animals →
                    </button>

                </header>

                {/* =====================================================
                    ERROR
                ===================================================== */}

                {error && (
                    <div className="hs-prediction-error">
                        {error}
                    </div>
                )}

                {/* =====================================================
                    MAIN INTELLIGENCE LAYOUT
                ===================================================== */}

                <section className="hs-prediction-layout">

                    {/* =================================================
                        ANIMAL SELECTION
                    ================================================= */}

                    <div className="hs-prediction-selector">

                        <div className="hs-panel-kicker">
                            ANIMAL SELECTION
                        </div>

                        <h2>
                            Select monitored animal
                        </h2>

                        <p>
                            Disease-risk analysis is
                            performed at the individual
                            animal level.
                        </p>

                        {loading ? (
                            <div className="hs-prediction-empty">
                                Loading animals...
                            </div>
                        ) : animals.length === 0 ? (
                            <div className="hs-prediction-empty">
                                No monitored animals
                                available.
                            </div>
                        ) : (
                            <>
                                <select
                                    value={
                                        selectedAnimal
                                    }
                                    onChange={(event) => {
                                        setSelectedAnimal(
                                            event.target.value
                                        );

                                        setPrediction(
                                            null
                                        );

                                        setError("");
                                    }}
                                >
                                    {animals.map(
                                        (animal) => {
                                            const id =
                                                animal?.id ??
                                                animal?.animal_id ??
                                                animal?.tag_id;

                                            const name =
                                                animal?.name ??
                                                animal?.animal_name ??
                                                `Animal #${id}`;

                                            return (
                                                <option
                                                    key={String(id)}
                                                    value={String(id)}
                                                >
                                                    {name}
                                                    {" "}
                                                    — ID #
                                                    {id}
                                                </option>
                                            );
                                        }
                                    )}
                                </select>

                                <button
                                    type="button"
                                    className="hs-prediction-primary"
                                    onClick={
                                        runPrediction
                                    }
                                    disabled={
                                        predicting ||
                                        !selectedAnimal
                                    }
                                >
                                    {predicting
                                        ? "Analyzing..."
                                        : "Run disease-risk analysis"}
                                </button>
                            </>
                        )}

                    </div>

                    {/* =================================================
                        RESULT
                    ================================================= */}

                    <div className="hs-prediction-result">

                        <div className="hs-panel-kicker">
                            INTELLIGENCE RESULT
                        </div>

                        <h2>
                            {prediction
                                ? "Risk assessment"
                                : "Awaiting analysis"}
                        </h2>

                        {!prediction ? (
                            <div className="hs-prediction-placeholder">

                                <div className="hs-prediction-symbol">
                                    ✦
                                </div>

                                <strong>
                                    {selectedName}
                                </strong>

                                <span>
                                    Run an analysis to
                                    retrieve animal-specific
                                    disease-risk intelligence.
                                </span>

                            </div>
                        ) : (
                            <PredictionResult
                                prediction={
                                    prediction
                                }
                            />
                        )}

                    </div>

                </section>

                {/* =====================================================
                    INTELLIGENCE BOUNDARY
                ===================================================== */}

                <section className="hs-prediction-notice">

                    <strong>
                        Intelligence boundary
                    </strong>

                    <span>
                        Disease prediction is intentionally
                        kept outside the Command Center
                        dashboard. The dashboard reports
                        operational health and alerts; this
                        module handles animal-specific
                        disease-risk intelligence.
                    </span>

                </section>

            </div>
        </AppShell>
    );
}


/* ================================================================
   PREDICTION RESULT
================================================================ */

function PredictionResult({
    prediction,
}) {
    const riskLevel =
        prediction?.overall_risk_level ??
        prediction?.highest_risk?.risk_level ??
        "unknown";

    const riskScore =
        prediction?.overall_risk_score ??
        prediction?.highest_risk?.risk_score ??
        null;

    const confidence =
        prediction?.confidence ??
        "low";

    const confidenceScore =
        prediction?.confidence_score ??
        null;

    const status =
        prediction?.status ??
        "unknown";

    const recommendation =
        prediction?.recommendation ??
        "Continue monitoring the animal.";

    const disclaimer =
        prediction?.disclaimer ??
        "These results are operational health-risk patterns and are not a veterinary diagnosis.";

    const predictions =
        Array.isArray(
            prediction?.predictions
        )
            ? prediction.predictions
            : [];

    const highestRisk =
        prediction?.highest_risk ??
        null;

    return (
        <div className="hs-prediction-output">

            {/* ========================================================
                OVERALL RISK
            ======================================================== */}

            <div className="hs-risk-overview">

                <div className="hs-risk-display">

                    <span>
                        OVERALL RISK
                    </span>

                    <strong>
                        {formatRiskLevel(
                            riskLevel
                        )}
                    </strong>

                </div>

                <div className="hs-risk-score">

                    <span>
                        Risk score
                    </span>

                    <strong>
                        {riskScore !== null
                            ? `${Math.round(
                                  Number(riskScore)
                              )}%`
                            : "—"}
                    </strong>

                </div>

                <div className="hs-risk-status">

                    <span>
                        STATUS
                    </span>

                    <strong>
                        {formatStatus(
                            status
                        )}
                    </strong>

                </div>

            </div>

            {/* ========================================================
                CONFIDENCE
            ======================================================== */}

            <div className="hs-prediction-confidence">

                <div>
                    <span>
                        Prediction confidence
                    </span>

                    <strong>
                        {formatConfidence(
                            confidence
                        )}
                    </strong>
                </div>

                {confidenceScore !== null && (
                    <span>
                        {Math.round(
                            Number(
                                confidenceScore
                            )
                        )}
                        %
                    </span>
                )}

            </div>

            {/* ========================================================
                HIGHEST RISK
            ======================================================== */}

            {highestRisk && (
                <div className="hs-highest-risk">

                    <span>
                        PRIMARY RISK PATTERN
                    </span>

                    <strong>
                        {highestRisk.label}
                    </strong>

                    <small>
                        {Math.round(
                            Number(
                                highestRisk.risk_score
                            )
                        )}
                        % risk
                    </small>

                </div>
            )}

            {/* ========================================================
                RISK PATTERNS
            ======================================================== */}

            {predictions.length > 0 && (
                <div className="hs-risk-patterns">

                    <div className="hs-risk-patterns-header">
                        <span>
                            RISK PATTERNS
                        </span>

                        <span>
                            {predictions.length}
                        </span>
                    </div>

                    {predictions.map(
                        (item) => (
                            <RiskPattern
                                key={
                                    item.prediction
                                }
                                prediction={
                                    item
                                }
                            />
                        )
                    )}

                </div>
            )}

            {/* ========================================================
                RECOMMENDATION
            ======================================================== */}

            <div className="hs-risk-recommendation">

                <span>
                    RECOMMENDED ACTION
                </span>

                <p>
                    {recommendation}
                </p>

            </div>

            {/* ========================================================
                DISCLAIMER
            ======================================================== */}

            <div className="hs-risk-disclaimer">

                <span>
                    ⚠
                </span>

                <p>
                    {disclaimer}
                </p>

            </div>

        </div>
    );
}


/* ================================================================
   RISK PATTERN
================================================================ */

function RiskPattern({
    prediction,
}) {
    const score =
        Number(
            prediction?.risk_score ?? 0
        );

    const level =
        prediction?.risk_level ??
        "unknown";

    return (
        <div className="hs-risk-pattern">

            <div className="hs-risk-pattern-main">

                <strong>
                    {prediction?.label ??
                        prediction?.prediction ??
                        "Risk pattern"}
                </strong>

                <span>
                    {prediction?.confidence
                        ? `${prediction.confidence} confidence`
                        : "Assessment available"}
                </span>

            </div>

            <div className="hs-risk-pattern-meter">

                <div
                    className="hs-risk-pattern-track"
                >
                    <div
                        className={`hs-risk-pattern-fill risk-${level}`}
                        style={{
                            width: `${Math.min(
                                Math.max(
                                    score,
                                    0
                                ),
                                100
                            )}%`,
                        }}
                    />
                </div>

                <strong>
                    {Math.round(score)}%
                </strong>

            </div>

        </div>
    );
}


/* ================================================================
   FORMATTERS
================================================================ */

function formatRiskLevel(
    value
) {
    const normalized =
        String(value)
            .toLowerCase();

    if (
        normalized === "high" ||
        normalized === "critical"
    ) {
        return "High";
    }

    if (
        normalized === "moderate" ||
        normalized === "medium"
    ) {
        return "Moderate";
    }

    if (
        normalized === "low"
    ) {
        return "Low";
    }

    return "Unknown";
}


function formatConfidence(
    value
) {
    const normalized =
        String(value)
            .toLowerCase();

    if (normalized === "high") {
        return "High";
    }

    if (normalized === "medium") {
        return "Medium";
    }

    return "Low";
}


function formatStatus(
    value
) {
    const normalized =
        String(value)
            .toLowerCase();

    if (
        normalized ===
        "action_required"
    ) {
        return "Action required";
    }

    if (
        normalized ===
        "monitor"
    ) {
        return "Monitor";
    }

    if (
        normalized ===
        "normal"
    ) {
        return "Normal";
    }

    if (
        normalized ===
        "insufficient_data"
    ) {
        return "Insufficient data";
    }

    return "Unknown";
}