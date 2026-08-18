import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import AppShell from "../components/AppShell";
import api from "../api/api";

import "./AnimalRegistration.css";

/* ==========================================================================
   HERDSENSE AI — ANIMAL REGISTRATION
   Production registration workflow
   ========================================================================== */

const INITIAL_FORM = {
    tag_id: "",
    name: "",
    species: "Cattle",
    breed: "",
    gender: "female",
    age: "",
    weight: "",
    farm_id: "1",
};

/* ==========================================================================
   HELPERS
   ========================================================================== */

function getToken() {
    return localStorage.getItem(
        "access_token"
    );
}

function normalizeError(error) {
    const detail =
        error?.response?.data?.detail;

    if (typeof detail === "string") {
        return detail;
    }

    if (Array.isArray(detail)) {
        return detail
            .map((item) => {
                if (
                    typeof item ===
                    "string"
                ) {
                    return item;
                }

                return (
                    item?.msg ||
                    item?.message ||
                    "Validation error"
                );
            })
            .join(", ");
    }

    return (
        error?.response?.data?.message ||
        "Unable to register this animal."
    );
}

function validateForm(formData) {
    const errors = {};

    const tagId =
        formData.tag_id.trim();

    const name =
        formData.name.trim();

    const species =
        formData.species.trim();

    const farmId =
        formData.farm_id.trim();

    /* ----------------------------------------------------------------------
       REQUIRED FIELDS
       ---------------------------------------------------------------------- */

    if (!tagId) {
        errors.tag_id =
            "Animal tag ID is required.";
    }

    if (!name) {
        errors.name =
            "Animal name is required.";
    }

    if (!species) {
        errors.species =
            "Species is required.";
    }

    if (!formData.gender) {
        errors.gender =
            "Gender is required.";
    }

    if (!farmId) {
        errors.farm_id =
            "Farm ID is required.";
    }

    /* ----------------------------------------------------------------------
       TAG VALIDATION
       ---------------------------------------------------------------------- */

    if (
        tagId &&
        tagId.length >
            100
    ) {
        errors.tag_id =
            "Tag ID must be 100 characters or fewer.";
    }

    /* ----------------------------------------------------------------------
       NAME VALIDATION
       ---------------------------------------------------------------------- */

    if (
        name &&
        name.length >
            150
    ) {
        errors.name =
            "Animal name must be 150 characters or fewer.";
    }

    /* ----------------------------------------------------------------------
       FARM VALIDATION
       ---------------------------------------------------------------------- */

    if (farmId) {
        const numericFarmId =
            Number(farmId);

        if (
            !Number.isInteger(
                numericFarmId
            ) ||
            numericFarmId <= 0
        ) {
            errors.farm_id =
                "Farm ID must be a valid positive number.";
        }
    }

    /* ----------------------------------------------------------------------
       AGE VALIDATION
       ---------------------------------------------------------------------- */

    if (
        formData.age !== ""
    ) {
        const age =
            Number(formData.age);

        if (
            !Number.isFinite(age) ||
            age < 0
        ) {
            errors.age =
                "Age must be a valid non-negative number.";
        }
    }

    /* ----------------------------------------------------------------------
       WEIGHT VALIDATION
       ---------------------------------------------------------------------- */

    if (
        formData.weight !== ""
    ) {
        const weight =
            Number(formData.weight);

        if (
            !Number.isFinite(weight) ||
            weight <= 0
        ) {
            errors.weight =
                "Weight must be greater than zero.";
        }
    }

    return errors;
}

/* ==========================================================================
   COMPONENT
   ========================================================================== */

export default function AnimalRegistration() {
    const navigate =
        useNavigate();

    const redirectTimer =
        useRef(null);

    const [formData, setFormData] =
        useState(INITIAL_FORM);

    const [errors, setErrors] =
        useState({});

    const [submitting, setSubmitting] =
        useState(false);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");

    /* ======================================================================
       CLEANUP
       ====================================================================== */

    useEffect(() => {
        return () => {
            if (
                redirectTimer.current
            ) {
                clearTimeout(
                    redirectTimer.current
                );
            }
        };
    }, []);

    /* ======================================================================
       FORM CHANGE
       ====================================================================== */

    const handleChange = (
        event
    ) => {
        const {
            name,
            value,
        } = event.target;

        setFormData(
            (current) => ({
                ...current,
                [name]: value,
            })
        );

        setErrors(
            (current) => ({
                ...current,
                [name]: "",
            })
        );

        setError("");
        setSuccess("");
    };

    /* ======================================================================
       CANCEL
       ====================================================================== */

    const handleCancel = () => {
        if (submitting) {
            return;
        }

        navigate("/animals");
    };

    /* ======================================================================
       SUBMIT
       ====================================================================== */

    const handleSubmit =
        async (event) => {
            event.preventDefault();

            if (submitting) {
                return;
            }

            setError("");
            setSuccess("");

            const validationErrors =
                validateForm(
                    formData
                );

            if (
                Object.keys(
                    validationErrors
                ).length > 0
            ) {
                setErrors(
                    validationErrors
                );

                /*
                 * Move focus to the first
                 * invalid field when possible.
                 */
                const firstError =
                    Object.keys(
                        validationErrors
                    )[0];

                requestAnimationFrame(
                    () => {
                        document
                            .getElementById(
                                firstError
                            )
                            ?.focus();
                    }
                );

                return;
            }

            const token =
                getToken();

            if (!token) {
                navigate(
                    "/login",
                    {
                        replace: true,
                    }
                );

                return;
            }

            try {
                setSubmitting(true);

                /*
                 * Keep the payload compatible
                 * with the existing FastAPI
                 * animal creation schema.
                 */

                const payload = {
                    tag_id:
                        formData.tag_id
                            .trim(),

                    name:
                        formData.name
                            .trim(),

                    species:
                        formData.species
                            .trim(),

                    breed:
                        formData.breed
                            .trim() ||
                        null,

                    gender:
                        formData.gender,

                    age:
                        formData.age ===
                        ""
                            ? null
                            : Number(
                                  formData.age
                              ),

                    weight:
                        formData.weight ===
                        ""
                            ? null
                            : Number(
                                  formData.weight
                              ),

                    farm_id:
                        Number(
                            formData.farm_id
                        ),
                };

                const response =
                    await api.post(
                        "/animals/",
                        payload,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
                            },
                        }
                    );

                const registeredAnimal =
                    response?.data;

                const registeredId =
                    registeredAnimal?.id;

                setSuccess(
                    "Animal registered successfully."
                );

                /*
                 * Give the operator a short
                 * confirmation before opening
                 * the newly-created animal.
                 */

                redirectTimer.current =
                    setTimeout(() => {
                        if (
                            registeredId !==
                                undefined &&
                            registeredId !==
                                null
                        ) {
                            navigate(
                                `/animals/${registeredId}`,
                                {
                                    replace: true,
                                }
                            );
                        } else {
                            navigate(
                                "/animals",
                                {
                                    replace: true,
                                }
                            );
                        }
                    }, 900);
            } catch (err) {
                console.error(
                    "Animal registration error:",
                    err
                );

                if (
                    err?.response
                        ?.status === 401
                ) {
                    localStorage.removeItem(
                        "access_token"
                    );

                    navigate(
                        "/login",
                        {
                            replace: true,
                        }
                    );

                    return;
                }

                /*
                 * FastAPI commonly returns 400/409
                 * for duplicate or invalid records.
                 * We surface the backend message
                 * instead of hiding it.
                 */

                setError(
                    normalizeError(err)
                );
            } finally {
                setSubmitting(false);
            }
        };

    /* ======================================================================
       RENDER
       ====================================================================== */

    return (
        <AppShell>
            <main className="animal-registration-page">

                {/* ==========================================================
                    PAGE HEADER
                ========================================================== */}

                <section className="registration-header">

                    <div className="registration-header-copy">

                        <button
                            type="button"
                            className="registration-back"
                            onClick={
                                handleCancel
                            }
                            disabled={
                                submitting
                            }
                        >
                            <span>
                                ←
                            </span>

                            Animals
                        </button>

                        <span className="registration-eyebrow">
                            ANIMAL OPERATIONS
                        </span>

                        <h1>
                            Register animal
                        </h1>

                        <p>
                            Add a new monitored
                            animal to the
                            HerdSense AI
                            intelligence network.
                        </p>

                    </div>

                    <div className="registration-header-status">

                        <span className="registration-status-dot" />

                        <div>
                            <strong>
                                REGISTRATION
                            </strong>

                            <span>
                                {submitting
                                    ? "Processing request"
                                    : "System ready"}
                            </span>
                        </div>

                    </div>

                </section>

                {/* ==========================================================
                    SYSTEM ERROR
                ========================================================== */}

                {error && (
                    <div
                        className="registration-message registration-message-error"
                        role="alert"
                    >
                        <div className="registration-message-icon">
                            !
                        </div>

                        <div>
                            <strong>
                                Registration failed
                            </strong>

                            <span>
                                {error}
                            </span>
                        </div>
                    </div>
                )}

                {/* ==========================================================
                    SUCCESS
                ========================================================== */}

                {success && (
                    <div
                        className="registration-message registration-message-success"
                        role="status"
                    >
                        <div className="registration-message-icon">
                            ✓
                        </div>

                        <div>
                            <strong>
                                Registration complete
                            </strong>

                            <span>
                                {success}
                            </span>
                        </div>
                    </div>
                )}

                {/* ==========================================================
                    FORM
                ========================================================== */}

                <form
                    className="registration-form"
                    onSubmit={
                        handleSubmit
                    }
                    noValidate
                >

                    {/* ======================================================
                        IDENTITY
                    ====================================================== */}

                    <section className="registration-card">

                        <div className="registration-card-header">

                            <div className="registration-section-number">
                                01
                            </div>

                            <div>
                                <span>
                                    IDENTITY
                                </span>

                                <h2>
                                    Animal identification
                                </h2>

                                <p>
                                    Establish the
                                    animal's unique
                                    identity within
                                    the monitoring
                                    system.
                                </p>
                            </div>

                        </div>

                        <div className="registration-fields">

                            <div className="registration-field">

                                <label htmlFor="tag_id">
                                    TAG ID
                                    <span>
                                        REQUIRED
                                    </span>
                                </label>

                                <input
                                    id="tag_id"
                                    name="tag_id"
                                    type="text"
                                    value={
                                        formData.tag_id
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. HS-001"
                                    autoComplete="off"
                                    maxLength={100}
                                    disabled={
                                        submitting
                                    }
                                    aria-invalid={
                                        Boolean(
                                            errors.tag_id
                                        )
                                    }
                                    className={
                                        errors.tag_id
                                            ? "field-error"
                                            : ""
                                    }
                                />

                                {errors.tag_id && (
                                    <small>
                                        {
                                            errors.tag_id
                                        }
                                    </small>
                                )}

                            </div>

                            <div className="registration-field">

                                <label htmlFor="name">
                                    ANIMAL NAME
                                    <span>
                                        REQUIRED
                                    </span>
                                </label>

                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    value={
                                        formData.name
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. Bella"
                                    autoComplete="off"
                                    maxLength={150}
                                    disabled={
                                        submitting
                                    }
                                    aria-invalid={
                                        Boolean(
                                            errors.name
                                        )
                                    }
                                    className={
                                        errors.name
                                            ? "field-error"
                                            : ""
                                    }
                                />

                                {errors.name && (
                                    <small>
                                        {
                                            errors.name
                                        }
                                    </small>
                                )}

                            </div>

                        </div>

                    </section>

                    {/* ======================================================
                        BIOLOGICAL PROFILE
                    ====================================================== */}

                    <section className="registration-card">

                        <div className="registration-card-header">

                            <div className="registration-section-number">
                                02
                            </div>

                            <div>
                                <span>
                                    BIOLOGICAL PROFILE
                                </span>

                                <h2>
                                    Animal characteristics
                                </h2>

                                <p>
                                    Record the
                                    animal's
                                    biological and
                                    physical profile.
                                </p>
                            </div>

                        </div>

                        <div className="registration-fields">

                            <div className="registration-field">

                                <label htmlFor="species">
                                    SPECIES
                                    <span>
                                        REQUIRED
                                    </span>
                                </label>

                                <select
                                    id="species"
                                    name="species"
                                    value={
                                        formData.species
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    disabled={
                                        submitting
                                    }
                                    aria-invalid={
                                        Boolean(
                                            errors.species
                                        )
                                    }
                                    className={
                                        errors.species
                                            ? "field-error"
                                            : ""
                                    }
                                >
                                    <option value="Cattle">
                                        Cattle
                                    </option>

                                    <option value="Goat">
                                        Goat
                                    </option>

                                    <option value="Sheep">
                                        Sheep
                                    </option>

                                    <option value="Pig">
                                        Pig
                                    </option>

                                    <option value="Other">
                                        Other
                                    </option>
                                </select>

                                {errors.species && (
                                    <small>
                                        {
                                            errors.species
                                        }
                                    </small>
                                )}

                            </div>

                            <div className="registration-field">

                                <label htmlFor="breed">
                                    BREED
                                    <span>
                                        OPTIONAL
                                    </span>
                                </label>

                                <input
                                    id="breed"
                                    name="breed"
                                    type="text"
                                    value={
                                        formData.breed
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. White Fulani"
                                    autoComplete="off"
                                    disabled={
                                        submitting
                                    }
                                />

                            </div>

                            <div className="registration-field">

                                <label htmlFor="gender">
                                    GENDER
                                    <span>
                                        REQUIRED
                                    </span>
                                </label>

                                <select
                                    id="gender"
                                    name="gender"
                                    value={
                                        formData.gender
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    disabled={
                                        submitting
                                    }
                                    aria-invalid={
                                        Boolean(
                                            errors.gender
                                        )
                                    }
                                    className={
                                        errors.gender
                                            ? "field-error"
                                            : ""
                                    }
                                >
                                    <option value="female">
                                        Female
                                    </option>

                                    <option value="male">
                                        Male
                                    </option>
                                </select>

                                {errors.gender && (
                                    <small>
                                        {
                                            errors.gender
                                        }
                                    </small>
                                )}

                            </div>

                            <div className="registration-field">

                                <label htmlFor="age">
                                    AGE
                                    <span>
                                        OPTIONAL
                                    </span>
                                </label>

                                <div className="registration-input-unit">

                                    <input
                                        id="age"
                                        name="age"
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={
                                            formData.age
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="e.g. 3"
                                        disabled={
                                            submitting
                                        }
                                        aria-invalid={
                                            Boolean(
                                                errors.age
                                            )
                                        }
                                        className={
                                            errors.age
                                                ? "field-error"
                                                : ""
                                        }
                                    />

                                    <span>
                                        years
                                    </span>

                                </div>

                                {errors.age && (
                                    <small>
                                        {
                                            errors.age
                                        }
                                    </small>
                                )}

                            </div>

                            <div className="registration-field">

                                <label htmlFor="weight">
                                    WEIGHT
                                    <span>
                                        OPTIONAL
                                    </span>
                                </label>

                                <div className="registration-input-unit">

                                    <input
                                        id="weight"
                                        name="weight"
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={
                                            formData.weight
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="e.g. 420"
                                        disabled={
                                            submitting
                                        }
                                        aria-invalid={
                                            Boolean(
                                                errors.weight
                                            )
                                        }
                                        className={
                                            errors.weight
                                                ? "field-error"
                                                : ""
                                        }
                                    />

                                    <span>
                                        kg
                                    </span>

                                </div>

                                {errors.weight && (
                                    <small>
                                        {
                                            errors.weight
                                        }
                                    </small>
                                )}

                            </div>

                        </div>

                    </section>

                    {/* ======================================================
                        FARM ASSIGNMENT
                    ====================================================== */}

                    <section className="registration-card">

                        <div className="registration-card-header">

                            <div className="registration-section-number">
                                03
                            </div>

                            <div>
                                <span>
                                    FARM ASSIGNMENT
                                </span>

                                <h2>
                                    Monitoring environment
                                </h2>

                                <p>
                                    Assign this
                                    animal to the
                                    farm that will
                                    receive its
                                    telemetry and
                                    intelligence
                                    events.
                                </p>
                            </div>

                        </div>

                        <div className="registration-fields registration-fields-single">

                            <div className="registration-field">

                                <label htmlFor="farm_id">
                                    FARM ID
                                    <span>
                                        REQUIRED
                                    </span>
                                </label>

                                <input
                                    id="farm_id"
                                    name="farm_id"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={
                                        formData.farm_id
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. 1"
                                    disabled={
                                        submitting
                                    }
                                    aria-invalid={
                                        Boolean(
                                            errors.farm_id
                                        )
                                    }
                                    className={
                                        errors.farm_id
                                            ? "field-error"
                                            : ""
                                    }
                                />

                                {errors.farm_id && (
                                    <small>
                                        {
                                            errors.farm_id
                                        }
                                    </small>
                                )}

                            </div>

                        </div>

                    </section>

                    {/* ======================================================
                        SYSTEM NOTE
                    ====================================================== */}

                    <div className="registration-system-note">

                        <div className="registration-system-icon">
                            i
                        </div>

                        <div>
                            <strong>
                                Intelligence activation
                            </strong>

                            <span>
                                After registration,
                                the animal becomes
                                available in the
                                Animals registry.
                                Telemetry can then be
                                associated with its
                                unique tag and animal
                                ID.
                            </span>
                        </div>

                    </div>

                    {/* ======================================================
                        ACTION BAR
                    ====================================================== */}

                    <div className="registration-actions">

                        <button
                            type="button"
                            className="registration-cancel"
                            onClick={
                                handleCancel
                            }
                            disabled={
                                submitting
                            }
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="registration-submit"
                            disabled={
                                submitting
                            }
                        >
                            {submitting ? (
                                <>
                                    <span className="registration-spinner" />

                                    Registering...
                                </>
                            ) : (
                                <>
                                    Register animal

                                    <span>
                                        →
                                    </span>
                                </>
                            )}
                        </button>

                    </div>

                </form>

            </main>
        </AppShell>
    );
}