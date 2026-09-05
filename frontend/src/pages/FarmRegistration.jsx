/*
|--------------------------------------------------------------------------
| HERDSENSE AI — FARM REGISTRATION
|--------------------------------------------------------------------------
| Farmer-facing manual farm registration.
|
| Backend:
| POST /api/v1/farms/
|
| Current supported fields:
| - name
| - location
| - latitude
| - longitude
|
| The authenticated backend user automatically becomes owner_id.
|--------------------------------------------------------------------------
*/

import {
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import AppShell from "../components/AppShell";

import api from "../api/api";

import "./FarmRegistration.css";


/* ==========================================================================
   SAFE NUMBER
========================================================================== */

function parseCoordinate(value) {
    if (
        value === "" ||
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}


/* ==========================================================================
   FARM REGISTRATION
========================================================================== */

export default function FarmRegistration() {
    const navigate = useNavigate();

    const [
        form,
        setForm,
    ] = useState({
        name: "",
        location: "",
        latitude: "",
        longitude: "",
    });

    const [
        submitting,
        setSubmitting,
    ] = useState(false);

    const [
        locating,
        setLocating,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState("");

    const [
        success,
        setSuccess,
    ] = useState("");


    /* ======================================================================
       FIELD CHANGE
    ====================================================================== */

    function handleChange(event) {
        const {
            name,
            value,
        } = event.target;

        setForm(
            (current) => ({
                ...current,
                [name]: value,
            })
        );

        setError("");
        setSuccess("");
    }


    /* ======================================================================
       CURRENT LOCATION
    ====================================================================== */

    function useCurrentLocation() {
        setError("");
        setSuccess("");

        if (
            !navigator.geolocation
        ) {
            setError(
                "Location services are not supported by this browser."
            );

            return;
        }

        setLocating(true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latitude =
                    position.coords.latitude;

                const longitude =
                    position.coords.longitude;

                setForm(
                    (current) => ({
                        ...current,
                        latitude:
                            latitude.toFixed(
                                6
                            ),
                        longitude:
                            longitude.toFixed(
                                6
                            ),
                    })
                );

                setSuccess(
                    "Current farm coordinates captured successfully."
                );

                setLocating(false);
            },
            (locationError) => {
                console.error(
                    "Farm location error:",
                    locationError
                );

                let message =
                    "Unable to determine your current location.";

                if (
                    locationError.code ===
                    1
                ) {
                    message =
                        "Location permission was denied. Please allow location access or enter the coordinates manually.";
                } else if (
                    locationError.code ===
                    2
                ) {
                    message =
                        "Your current location could not be determined. Please enter the coordinates manually.";
                } else if (
                    locationError.code ===
                    3
                ) {
                    message =
                        "Location request timed out. Please try again.";
                }

                setError(
                    message
                );

                setLocating(false);
            },
            {
                enableHighAccuracy:
                    true,

                timeout:
                    15000,

                maximumAge:
                    60000,
            }
        );
    }


    /* ======================================================================
       SUBMIT
    ====================================================================== */

    async function handleSubmit(
        event
    ) {
        event.preventDefault();

        setError("");
        setSuccess("");

        const name =
            form.name.trim();

        const location =
            form.location.trim();

        if (!name) {
            setError(
                "Farm name is required."
            );

            return;
        }

        if (!location) {
            setError(
                "Farm location is required."
            );

            return;
        }

        const latitude =
            parseCoordinate(
                form.latitude
            );

        const longitude =
            parseCoordinate(
                form.longitude
            );

        if (
            latitude === null ||
            longitude === null
        ) {
            setError(
                "Please provide valid latitude and longitude coordinates."
            );

            return;
        }

        if (
            latitude < -90 ||
            latitude > 90
        ) {
            setError(
                "Latitude must be between -90 and 90."
            );

            return;
        }

        if (
            longitude < -180 ||
            longitude > 180
        ) {
            setError(
                "Longitude must be between -180 and 180."
            );

            return;
        }

        setSubmitting(true);

        try {
            const response =
                await api.post(
                    "/farms/",
                    {
                        name,
                        location,
                        latitude,
                        longitude,
                    }
                );

            console.log(
                "[HerdSense AI] Farm registered:",
                response?.data
            );

            setSuccess(
                "Farm registered successfully. Redirecting to your command center..."
            );

            /*
             * Give the success state a short moment to render before
             * returning to the dashboard.
             */
            setTimeout(() => {
                navigate(
                    "/dashboard",
                    {
                        replace:
                            true,
                        state: {
                            farmRegistered:
                                true,
                        },
                    }
                );
            }, 700);
        } catch (
            err
        ) {
            console.error(
                "Farm registration error:",
                err
            );

            const detail =
                err?.response?.data
                    ?.detail;

            if (
                err?.response
                    ?.status === 401
            ) {
                localStorage.removeItem(
                    "access_token"
                );

                localStorage.removeItem(
                    "token"
                );

                localStorage.removeItem(
                    "user_role"
                );

                navigate(
                    "/login",
                    {
                        replace:
                            true,
                    }
                );

                return;
            }

            setError(
                typeof detail ===
                    "string"
                    ? detail
                    : "Unable to register this farm. Please check the information and try again."
            );
        } finally {
            setSubmitting(
                false
            );
        }
    }


    /* ======================================================================
       RENDER
    ====================================================================== */

    return (
        <AppShell>

            <div className="hs-farm-registration">

                <main className="hs-farm-registration-content">

                    {/* ======================================================
                        HEADER
                    ====================================================== */}

                    <div className="hs-farm-registration-header">

                        <button
                            type="button"
                            className="hs-farm-back-button"
                            onClick={() =>
                                navigate(
                                    "/dashboard"
                                )
                            }
                        >
                            ← Back to command center
                        </button>

                        <div className="hs-farm-eyebrow">
                            FARM OPERATIONS
                        </div>

                        <h1>
                            Register your farm.
                        </h1>

                        <p>
                            Establish your farm as an
                            operational location in
                            HerdSense AI. You can add
                            animals and telemetry after
                            registration.
                        </p>

                    </div>


                    {/* ======================================================
                        FORM
                    ====================================================== */}

                    <section className="hs-farm-registration-card">

                        <div className="hs-farm-card-header">

                            <div>

                                <div className="hs-farm-section-label">
                                    FARM PROFILE
                                </div>

                                <h2>
                                    Farm details
                                </h2>

                            </div>

                            <span className="hs-farm-required-note">
                                * Required
                            </span>

                        </div>


                        <form
                            onSubmit={
                                handleSubmit
                            }
                        >

                            {/* =================================================
                                FARM NAME
                            ================================================= */}

                            <div className="hs-farm-field">

                                <label htmlFor="farm-name">
                                    Farm name
                                    <span>*</span>
                                </label>

                                <input
                                    id="farm-name"
                                    name="name"
                                    type="text"
                                    value={
                                        form.name
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. Green Valley Farm"
                                    autoComplete="organization"
                                    disabled={
                                        submitting
                                    }
                                    maxLength={
                                        150
                                    }
                                />

                                <small>
                                    Use the name you
                                    identify the farm
                                    by operationally.
                                </small>

                            </div>


                            {/* =================================================
                                LOCATION
                            ================================================= */}

                            <div className="hs-farm-field">

                                <label htmlFor="farm-location">
                                    Farm location
                                    <span>*</span>
                                </label>

                                <input
                                    id="farm-location"
                                    name="location"
                                    type="text"
                                    value={
                                        form.location
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. Ayobo, Lagos, Nigeria"
                                    autoComplete="street-address"
                                    disabled={
                                        submitting
                                    }
                                    maxLength={
                                        255
                                    }
                                />

                                <small>
                                    Enter the farm's
                                    address, community,
                                    town, or other useful
                                    location description.
                                </small>

                            </div>


                            {/* =================================================
                                GPS
                            ================================================= */}

                            <div className="hs-farm-location-header">

                                <div>

                                    <div className="hs-farm-section-label">
                                        GPS LOCATION
                                    </div>

                                    <h3>
                                        Farm coordinates
                                    </h3>

                                </div>

                                <button
                                    type="button"
                                    className="hs-farm-location-button"
                                    onClick={
                                        useCurrentLocation
                                    }
                                    disabled={
                                        submitting ||
                                        locating
                                    }
                                >
                                    {locating
                                        ? "Locating..."
                                        : "◎ Use my current location"}
                                </button>

                            </div>


                            <div className="hs-farm-coordinate-grid">

                                <div className="hs-farm-field">

                                    <label htmlFor="farm-latitude">
                                        Latitude
                                    </label>

                                    <input
                                        id="farm-latitude"
                                        name="latitude"
                                        type="number"
                                        value={
                                            form.latitude
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="6.5244"
                                        step="any"
                                        min="-90"
                                        max="90"
                                        disabled={
                                            submitting
                                        }
                                    />

                                    <small>
                                        Range: -90 to 90
                                    </small>

                                </div>


                                <div className="hs-farm-field">

                                    <label htmlFor="farm-longitude">
                                        Longitude
                                    </label>

                                    <input
                                        id="farm-longitude"
                                        name="longitude"
                                        type="number"
                                        value={
                                            form.longitude
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="3.3792"
                                        step="any"
                                        min="-180"
                                        max="180"
                                        disabled={
                                            submitting
                                        }
                                    />

                                    <small>
                                        Range: -180 to 180
                                    </small>

                                </div>

                            </div>


                            {/* =================================================
                                COORDINATE NOTE
                            ================================================= */}

                            <div className="hs-farm-gps-note">

                                <div className="hs-farm-gps-icon">
                                    ◎
                                </div>

                                <div>

                                    <strong>
                                        GPS is used for
                                        farm mapping
                                    </strong>

                                    <span>
                                        Accurate coordinates
                                        allow HerdSense AI
                                        to associate your
                                        farm with future
                                        livestock tracking
                                        and geographic
                                        intelligence.
                                    </span>

                                </div>

                            </div>


                            {/* =================================================
                                FEEDBACK
                            ================================================= */}

                            {error && (
                                <div className="hs-farm-form-error">

                                    <strong>
                                        Registration failed
                                    </strong>

                                    <span>
                                        {error}
                                    </span>

                                </div>
                            )}

                            {success && (
                                <div className="hs-farm-form-success">

                                    <strong>
                                        Farm registered
                                    </strong>

                                    <span>
                                        {success}
                                    </span>

                                </div>
                            )}


                            {/* =================================================
                                ACTIONS
                            ================================================= */}

                            <div className="hs-farm-form-actions">

                                <button
                                    type="button"
                                    className="hs-farm-cancel-button"
                                    onClick={() =>
                                        navigate(
                                            "/dashboard"
                                        )
                                    }
                                    disabled={
                                        submitting
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="hs-farm-submit-button"
                                    disabled={
                                        submitting
                                    }
                                >
                                    {submitting
                                        ? "Registering farm..."
                                        : "Register farm →"}
                                </button>

                            </div>

                        </form>

                    </section>


                    {/* ======================================================
                        FOOTER
                    ====================================================== */}

                    <footer className="hs-farm-registration-footer">

                        <span>
                            HerdSense AI
                        </span>

                        <span>
                            Livestock intelligence
                            platform
                        </span>

                        <span>
                            © 2026
                        </span>

                    </footer>

                </main>

            </div>

        </AppShell>
    );
}