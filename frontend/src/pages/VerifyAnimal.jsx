import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import api from "../api/api";

import "./VerifyAnimal.css";


/* ============================================================================
   HELPERS
   ============================================================================ */

function formatDate(value) {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString(
        undefined,
        {
            dateStyle: "medium",
            timeStyle: "short",
        }
    );
}


function formatNumber(value, suffix = "") {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "—";
    }

    return `${value}${suffix}`;
}


function shortenHash(hash) {
    if (!hash) {
        return "—";
    }

    if (hash.length <= 24) {
        return hash;
    }

    return `${hash.slice(0, 12)}…${hash.slice(-10)}`;
}


/* ============================================================================
   ICONS
   ============================================================================ */

function ShieldIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <path
                d="M12 3 20 6v5.8c0 4.7-3.2 8.9-8 10.2-4.8-1.3-8-5.5-8-10.2V6l8-3Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
            <path
                d="m8.5 12 2.2 2.2 4.8-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}


function CheckIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <path
                d="m5 12.5 4.3 4.3L19 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}


function AlertIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <path
                d="M12 4 21 20H3L12 4Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
            <path
                d="M12 9v5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <circle
                cx="12"
                cy="17"
                r="0.9"
                fill="currentColor"
            />
        </svg>
    );
}


function ActivityIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <path
                d="M3 12h4l2-6 4 12 2-6h6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}


function LocationIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <path
                d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
            />
            <circle
                cx="12"
                cy="10"
                r="2.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
            />
        </svg>
    );
}


/* ============================================================================
   PAGE
   ============================================================================ */

export default function VerifyAnimal() {
    const { animalId } = useParams();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);


    /* ------------------------------------------------------------------------
       LOAD PUBLIC VERIFICATION RECORD
       ------------------------------------------------------------------------ */

    useEffect(() => {
        let mounted = true;

        async function loadVerification() {
            setLoading(true);
            setError(null);

            try {
                const response = await api.get(
                    `/base/verify/animal/${animalId}`,
                    {
                        /*
                         * This endpoint is public.
                         *
                         * Do not rely on authentication being present.
                         * The backend does not require a JWT.
                         */
                        headers: {
                            Authorization: undefined,
                        },
                    }
                );

                if (mounted) {
                    setData(response.data);
                }
            } catch (requestError) {
                console.error(
                    "[HerdSense AI] Public verification error:",
                    requestError
                );

                if (!mounted) {
                    return;
                }

                const status =
                    requestError.response?.status;

                if (status === 404) {
                    setError(
                        "This animal record could not be found."
                    );
                } else if (status === 502) {
                    setError(
                        requestError.response?.data?.detail ||
                        "Blockchain verification is temporarily unavailable."
                    );
                } else {
                    setError(
                        requestError.response?.data?.detail ||
                        "Unable to verify this animal right now."
                    );
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        if (animalId) {
            loadVerification();
        }

        return () => {
            mounted = false;
        };
    }, [animalId]);


    /* ------------------------------------------------------------------------
       DERIVED DATA
       ------------------------------------------------------------------------ */

    const verified =
        Boolean(data?.verified);

    const animal =
        data?.animal || {};

    const telemetry =
        data?.latest_telemetry || null;

    const proof =
        data?.blockchain_proof || {};

    const network =
        data?.network ||
        data?.blockchain?.network ||
        "base-sepolia";


    const verificationLabel = useMemo(
        () => {
            if (verified) {
                return "Verified on Base";
            }

            if (
                data?.record?.registered_on_base
            ) {
                return "Verification failed";
            }

            return "Not registered";
        },
        [
            verified,
            data,
        ]
    );


    /* =========================================================================
       LOADING
       ========================================================================= */

    if (loading) {
        return (
            <main className="verify-page">
                <div className="verify-shell">

                    <header className="verify-header">
                        <div className="verify-brand">
                            <div className="verify-brand-mark">
                                HS
                            </div>

                            <div>
                                <strong>
                                    HerdSense AI
                                </strong>

                                <span>
                                    Digital Animal Passport
                                </span>
                            </div>
                        </div>
                    </header>


                    <section className="verify-loading">
                        <div className="verify-spinner" />

                        <h1>
                            Verifying animal identity
                        </h1>

                        <p>
                            Checking the HerdSense record
                            against Base blockchain data.
                        </p>
                    </section>

                </div>
            </main>
        );
    }


    /* =========================================================================
       ERROR
       ========================================================================= */

    if (error || !data) {
        return (
            <main className="verify-page">
                <div className="verify-shell">

                    <header className="verify-header">
                        <Link
                            to="/"
                            className="verify-brand"
                        >
                            <div className="verify-brand-mark">
                                HS
                            </div>

                            <div>
                                <strong>
                                    HerdSense AI
                                </strong>

                                <span>
                                    Digital Animal Passport
                                </span>
                            </div>
                        </Link>
                    </header>


                    <section className="verify-error">

                        <div className="verify-error-icon">
                            <AlertIcon />
                        </div>

                        <div>
                            <span className="verify-eyebrow">
                                VERIFICATION UNAVAILABLE
                            </span>

                            <h1>
                                We couldn't verify this animal.
                            </h1>

                            <p>
                                {error ||
                                    "The requested verification record is unavailable."}
                            </p>

                            <div className="verify-error-actions">
                                <button
                                    type="button"
                                    onClick={() =>
                                        window.location.reload()
                                    }
                                >
                                    Try again
                                </button>

                                <Link to="/">
                                    Return to HerdSense AI
                                </Link>
                            </div>
                        </div>

                    </section>

                </div>
            </main>
        );
    }


    /* =========================================================================
       VERIFIED PASSPORT
       ========================================================================= */

    return (
        <main className="verify-page">

            <div className="verify-shell">

                {/* ============================================================
                    HEADER
                   ============================================================ */}

                <header className="verify-header">

                    <Link
                        to="/"
                        className="verify-brand"
                    >
                        <div className="verify-brand-mark">
                            HS
                        </div>

                        <div>
                            <strong>
                                HerdSense AI
                            </strong>

                            <span>
                                Digital Animal Passport
                            </span>
                        </div>
                    </Link>


                    <div className="verify-network">
                        <span className="network-dot" />
                        <span>
                            {network}
                        </span>
                    </div>

                </header>


                {/* ============================================================
                    HERO
                   ============================================================ */}

                <section
                    className={
                        verified
                            ? "verify-hero verified"
                            : "verify-hero failed"
                    }
                >

                    <div className="verify-hero-icon">
                        {verified ? (
                            <CheckIcon />
                        ) : (
                            <AlertIcon />
                        )}
                    </div>


                    <div className="verify-hero-content">

                        <span className="verify-eyebrow">
                            BLOCKCHAIN IDENTITY
                        </span>

                        <h1>
                            {verificationLabel}
                        </h1>

                        <p>
                            {data.message ||
                                (
                                    verified
                                        ? "This animal's digital identity matches the cryptographic fingerprint recorded on Base."
                                        : "This animal's current record could not be cryptographically verified."
                                )}
                        </p>

                    </div>


                    <div className="verify-chain-badge">
                        <ShieldIcon />

                        <span>
                            Base
                        </span>
                    </div>

                </section>


                {/* ============================================================
                    ANIMAL IDENTITY
                   ============================================================ */}

                <section className="verify-card">

                    <div className="verify-card-header">

                        <div>
                            <span className="verify-eyebrow">
                                ANIMAL IDENTITY
                            </span>

                            <h2>
                                {animal.name ||
                                    "Unnamed animal"}
                            </h2>
                        </div>

                        <div className="animal-tag">
                            {animal.tag_id ||
                                `ANIMAL-${animal.id}`}
                        </div>

                    </div>


                    <div className="identity-grid">

                        <div className="identity-item">
                            <span>
                                Species
                            </span>

                            <strong>
                                {animal.species || "—"}
                            </strong>
                        </div>


                        <div className="identity-item">
                            <span>
                                Animal ID
                            </span>

                            <strong>
                                #{animal.id}
                            </strong>
                        </div>


                        <div className="identity-item">
                            <span>
                                Blockchain
                            </span>

                            <strong>
                                Base
                            </strong>
                        </div>


                        <div className="identity-item">
                            <span>
                                Network
                            </span>

                            <strong>
                                {network}
                            </strong>
                        </div>

                    </div>

                </section>


                {/* ============================================================
                    TELEMETRY
                   ============================================================ */}

                {telemetry && (
                    <section className="verify-card">

                        <div className="verify-card-header">

                            <div>
                                <span className="verify-eyebrow">
                                    LATEST TELEMETRY
                                </span>

                                <h2>
                                    Live animal snapshot
                                </h2>
                            </div>

                            <div className="telemetry-time">
                                {formatDate(
                                    telemetry.timestamp
                                )}
                            </div>

                        </div>


                        <div className="telemetry-grid">

                            <div className="telemetry-item">

                                <div className="telemetry-icon">
                                    <ActivityIcon />
                                </div>

                                <div>
                                    <span>
                                        Temperature
                                    </span>

                                    <strong>
                                        {formatNumber(
                                            telemetry.temperature,
                                            " °C"
                                        )}
                                    </strong>
                                </div>

                            </div>


                            <div className="telemetry-item">

                                <div className="telemetry-icon">
                                    <ActivityIcon />
                                </div>

                                <div>
                                    <span>
                                        Heart rate
                                    </span>

                                    <strong>
                                        {formatNumber(
                                            telemetry.heart_rate,
                                            " bpm"
                                        )}
                                    </strong>
                                </div>

                            </div>


                            <div className="telemetry-item">

                                <div className="telemetry-icon">
                                    <ActivityIcon />
                                </div>

                                <div>
                                    <span>
                                        Activity
                                    </span>

                                    <strong>
                                        {telemetry.activity ||
                                            "—"}
                                    </strong>
                                </div>

                            </div>


                            <div className="telemetry-item">

                                <div className="telemetry-icon">
                                    <ActivityIcon />
                                </div>

                                <div>
                                    <span>
                                        Device battery
                                    </span>

                                    <strong>
                                        {formatNumber(
                                            telemetry.battery,
                                            "%"
                                        )}
                                    </strong>
                                </div>

                            </div>

                        </div>


                        {(telemetry.latitude !== null &&
                            telemetry.latitude !== undefined) && (
                            <div className="location-row">

                                <LocationIcon />

                                <span>
                                    Location recorded
                                </span>

                                <strong>
                                    {telemetry.latitude},{" "}
                                    {telemetry.longitude}
                                </strong>

                            </div>
                        )}

                    </section>
                )}


                {/* ============================================================
                    BLOCKCHAIN PROOF
                   ============================================================ */}

                <section className="verify-card proof-card">

                    <div className="verify-card-header">

                        <div>
                            <span className="verify-eyebrow">
                                CRYPTOGRAPHIC PROOF
                            </span>

                            <h2>
                                Blockchain verification
                            </h2>
                        </div>

                        <div
                            className={
                                verified
                                    ? "proof-status verified"
                                    : "proof-status"
                            }
                        >
                            <span className="network-dot" />

                            {verified
                                ? "Integrity confirmed"
                                : "Integrity not confirmed"}
                        </div>

                    </div>


                    <div className="proof-list">

                        <div className="proof-row">

                            <span>
                                Contract
                            </span>

                            <code>
                                {proof.contract ||
                                    data.blockchain?.contract ||
                                    "—"}
                            </code>

                        </div>


                        <div className="proof-row">

                            <span>
                                Local fingerprint
                            </span>

                            <code title={proof.local_hash}>
                                {shortenHash(
                                    proof.local_hash
                                )}
                            </code>

                        </div>


                        <div className="proof-row">

                            <span>
                                Base fingerprint
                            </span>

                            <code title={proof.onchain_hash}>
                                {shortenHash(
                                    proof.onchain_hash
                                )}
                            </code>

                        </div>


                        <div className="proof-row">

                            <span>
                                Registered by
                            </span>

                            <code>
                                {proof.registered_by ||
                                    "—"}
                            </code>

                        </div>


                        <div className="proof-row">

                            <span>
                                Registered at
                            </span>

                            <strong>
                                {proof.registered_at
                                    ? formatDate(
                                        Number(
                                            proof.registered_at
                                        ) * 1000
                                    )
                                    : "—"}
                            </strong>

                        </div>

                    </div>

                </section>


                {/* ============================================================
                    TRUST FOOTER
                   ============================================================ */}

                <footer className="verify-footer">

                    <div>
                        <ShieldIcon />

                        <div>
                            <strong>
                                Independently verifiable
                            </strong>

                            <span>
                                HerdSense AI uses cryptographic
                                fingerprints to verify animal
                                records against Base.
                            </span>
                        </div>
                    </div>


                    <span className="verify-footer-id">
                        Passport #{animal.id}
                    </span>

                </footer>

            </div>

        </main>
    );
}