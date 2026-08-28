import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import api from "../api/api";
import "./AnimalVerification.css";


export default function AnimalVerification() {

    const { id } = useParams();

    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");


    async function loadVerification() {

        try {

            setLoading(true);
            setError("");

            const response = await api.get(
                `/base/verify/animal/${id}`
            );

            setRecord(response.data);

        } catch (err) {

            console.error(
                "[Animal Verification]",
                err
            );

            setError(
                err.response?.data?.detail ||
                "Unable to verify this animal."
            );

        } finally {

            setLoading(false);
        }
    }


    useEffect(() => {

        let mounted = true;


        async function load() {

            try {

                setLoading(true);
                setError("");

                const response = await api.get(
                    `/base/verify/animal/${id}`
                );

                if (mounted) {
                    setRecord(response.data);
                }

            } catch (err) {

                console.error(
                    "[Animal Verification]",
                    err
                );

                if (mounted) {

                    setError(
                        err.response?.data?.detail ||
                        "Unable to verify this animal."
                    );
                }

            } finally {

                if (mounted) {
                    setLoading(false);
                }
            }
        }


        if (id) {
            load();
        } else {
            setError(
                "No animal verification ID was provided."
            );
            setLoading(false);
        }


        return () => {
            mounted = false;
        };

    }, [id]);


    /* =========================================================================
       LOADING
    ========================================================================= */

    if (loading) {

        return (
            <main className="verification-page">

                <section className="verification-card">

                    <div className="verification-loader">

                        <div className="verification-spinner" />

                        <span className="verification-eyebrow">
                            HERDSENSE AI
                        </span>

                        <p>
                            Verifying animal record…
                        </p>

                        <small>
                            Checking cryptographic integrity on Base
                        </small>

                    </div>

                </section>

            </main>
        );
    }


    /* =========================================================================
       ERROR
    ========================================================================= */

    if (error || !record) {

        return (
            <main className="verification-page">

                <section className="verification-card verification-error">

                    <div className="verification-icon">
                        !
                    </div>

                    <span className="verification-eyebrow">
                        HERDSENSE AI
                    </span>

                    <h1>
                        Verification unavailable
                    </h1>

                    <p>
                        {error ||
                            "The requested animal record could not be found."}
                    </p>

                    <button
                        type="button"
                        className="verification-retry"
                        onClick={loadVerification}
                    >
                        Try again
                    </button>

                </section>

            </main>
        );
    }


    /* =========================================================================
       DATA
    ========================================================================= */

    const animal =
        record.animal || {};

    const proof =
        record.blockchain_proof || {};

    const telemetry =
        record.latest_telemetry || null;

    const recordStatus =
        record.record || {};

    const verificationPassed =
        Boolean(record.verified);

    const registeredOnBase =
        Boolean(recordStatus.registered_on_base);


    /* =========================================================================
       REGISTERED AT
    ========================================================================= */

    const registeredAt =
        formatTimestamp(
            proof.registered_at
        );


    /* =========================================================================
       RENDER
    ========================================================================= */

    return (
        <main className="verification-page">

            <div className="verification-shell">


                {/* =============================================================
                    HEADER
                ============================================================= */}

                <header className="verification-header">

                    <div>

                        <div className="verification-brand">
                            HERDSENSE AI
                        </div>

                        <div className="verification-subtitle">
                            Digital Animal Verification
                        </div>

                    </div>


                    <div
                        className={
                            verificationPassed
                                ? "verification-status verified"
                                : "verification-status failed"
                        }
                    >

                        <span className="status-dot" />

                        {verificationPassed
                            ? "VERIFIED"
                            : "VERIFICATION FAILED"}

                    </div>

                </header>


                {/* =============================================================
                    HERO
                ============================================================= */}

                <section className="verification-hero">

                    <div>

                        <span className="verification-eyebrow">
                            ANIMAL IDENTITY
                        </span>

                        <h1>
                            {animal.name ||
                                `Animal #${animal.id}`}
                        </h1>

                        <p className="verification-tag">
                            Tag ID{" "}
                            <strong>
                                {animal.tag_id || "—"}
                            </strong>
                        </p>

                    </div>


                    <div className="verification-badge">

                        <span className="badge-check">
                            {verificationPassed
                                ? "✓"
                                : "!"}
                        </span>

                        <div>

                            <strong>
                                {verificationPassed
                                    ? "Cryptographically Verified"
                                    : "Verification Failed"}
                            </strong>

                            <span>
                                {verificationPassed
                                    ? "Record integrity confirmed on Base"
                                    : "The current record does not match Base"}
                            </span>

                        </div>

                    </div>

                </section>


                {/* =============================================================
                    ANIMAL RECORD
                ============================================================= */}

                <section className="verification-section">

                    <div className="section-heading">

                        <span>
                            01
                        </span>

                        <h2>
                            Animal Record
                        </h2>

                    </div>


                    <div className="verification-grid">

                        <InfoItem
                            label="Animal ID"
                            value={
                                animal.id
                                    ? `#${animal.id}`
                                    : "—"
                            }
                        />

                        <InfoItem
                            label="Tag ID"
                            value={animal.tag_id}
                        />

                        <InfoItem
                            label="Name"
                            value={animal.name}
                        />

                        <InfoItem
                            label="Species"
                            value={animal.species}
                        />

                    </div>

                </section>


                {/* =============================================================
                    TELEMETRY
                ============================================================= */}

                <section className="verification-section">

                    <div className="section-heading">

                        <span>
                            02
                        </span>

                        <h2>
                            Latest Telemetry
                        </h2>

                    </div>


                    {telemetry ? (

                        <div className="verification-grid">

                            <InfoItem
                                label="Temperature"
                                value={
                                    telemetry.temperature != null
                                        ? `${telemetry.temperature} °C`
                                        : "—"
                                }
                            />

                            <InfoItem
                                label="Heart Rate"
                                value={
                                    telemetry.heart_rate != null
                                        ? `${telemetry.heart_rate} bpm`
                                        : "—"
                                }
                            />

                            <InfoItem
                                label="Activity"
                                value={
                                    telemetry.activity != null
                                        ? telemetry.activity
                                        : "—"
                                }
                            />

                            <InfoItem
                                label="Battery"
                                value={
                                    telemetry.battery != null
                                        ? `${telemetry.battery}%`
                                        : "—"
                                }
                            />

                        </div>

                    ) : (

                        <div className="verification-empty">
                            No telemetry has been recorded yet.
                        </div>

                    )}

                </section>


                {/* =============================================================
                    BLOCKCHAIN PROOF
                ============================================================= */}

                <section className="verification-section blockchain-section">

                    <div className="section-heading">

                        <span>
                            03
                        </span>

                        <h2>
                            Blockchain Proof
                        </h2>

                    </div>


                    <div
                        className={
                            verificationPassed
                                ? "proof-status"
                                : "proof-status verification-proof-failed"
                        }
                    >

                        <div className="proof-check">
                            {verificationPassed
                                ? "✓"
                                : "!"}
                        </div>

                        <div>

                            <strong>
                                {verificationPassed
                                    ? "Base Network Integrity Confirmed"
                                    : "Base Network Integrity Failed"}
                            </strong>

                            <p>
                                {verificationPassed
                                    ? "The current HerdSense AI record matches the cryptographic fingerprint registered on Base."
                                    : "The current HerdSense AI record does not match the cryptographic fingerprint stored on Base."}
                            </p>

                        </div>

                    </div>


                    <div className="proof-list">

                        <ProofRow
                            label="Network"
                            value={
                                record.network ||
                                "base-sepolia"
                            }
                        />

                        <ProofRow
                            label="Registration"
                            value={
                                registeredOnBase
                                    ? "Registered on Base"
                                    : "Not registered"
                            }
                        />

                        <ProofRow
                            label="Contract"
                            value={
                                proof.contract ||
                                "—"
                            }
                        />

                        <ProofRow
                            label="Registered By"
                            value={
                                proof.registered_by ||
                                "—"
                            }
                        />

                        <ProofRow
                            label="Registered At"
                            value={registeredAt}
                        />

                        <ProofRow
                            label="On-chain Hash"
                            value={
                                proof.onchain_hash ||
                                "—"
                            }
                        />

                        <ProofRow
                            label="Local Hash"
                            value={
                                proof.local_hash ||
                                "—"
                            }
                        />

                    </div>

                </section>


                {/* =============================================================
                    VERIFICATION SUMMARY
                ============================================================= */}

                <section className="verification-section">

                    <div className="verification-summary">

                        <div>

                            <span className="verification-eyebrow">
                                VERIFICATION RESULT
                            </span>

                            <strong>
                                {verificationPassed
                                    ? "This digital animal record is authentic."
                                    : "This digital animal record could not be authenticated."}
                            </strong>

                        </div>


                        <div className="verification-summary-network">

                            <span className="status-dot" />

                            Base ·{" "}
                            {record.network ||
                                "base-sepolia"}

                        </div>

                    </div>

                </section>


                {/* =============================================================
                    FOOTER
                ============================================================= */}

                <footer className="verification-footer">

                    <div>

                        <strong>
                            HerdSense AI
                        </strong>

                        <span>
                            Intelligent livestock infrastructure
                        </span>

                    </div>


                    <div className="footer-network">

                        <span className="status-dot" />

                        Base ·{" "}
                        {record.network ||
                            "base-sepolia"}

                    </div>

                </footer>

            </div>

        </main>
    );
}


/* ============================================================================
   SMALL COMPONENTS
============================================================================ */


function InfoItem({
    label,
    value,
}) {

    return (
        <div className="verification-info">

            <span>
                {label}
            </span>

            <strong>
                {value ?? "—"}
            </strong>

        </div>
    );
}


function ProofRow({
    label,
    value,
}) {

    return (
        <div className="proof-row">

            <span>
                {label}
            </span>

            <code>
                {value ?? "—"}
            </code>

        </div>
    );
}


/* ============================================================================
   TIMESTAMP FORMATTER
============================================================================ */

function formatTimestamp(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "Unavailable";
    }


    try {

        let date;


        if (
            typeof value === "number" ||
            !Number.isNaN(Number(value))
        ) {

            const numericValue =
                Number(value);

            /*
             * Base/web3 timestamps are normally
             * Unix seconds. If the value is already
             * milliseconds, preserve it.
             */

            date =
                numericValue < 100000000000
                    ? new Date(
                        numericValue * 1000
                    )
                    : new Date(
                        numericValue
                    );

        } else {

            date = new Date(value);
        }


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "Unavailable";
        }


        return date.toLocaleString(
            undefined,
            {
                dateStyle: "medium",
                timeStyle: "short",
            }
        );

    } catch {

        return "Unavailable";
    }
}