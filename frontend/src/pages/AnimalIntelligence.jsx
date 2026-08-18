import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

function getToken() {
    return localStorage.getItem("access_token");
}

function normalizeError(error) {
    const detail = error?.response?.data?.detail;

    if (typeof detail === "string") {
        return detail;
    }

    if (Array.isArray(detail)) {
        return detail
            .map((item) => {
                if (typeof item === "string") {
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

    if (!formData.tag_id.trim()) {
        errors.tag_id =
            "Animal tag ID is required.";
    }

    if (!formData.name.trim()) {
        errors.name =
            "Animal name is required.";
    }

    if (!formData.species.trim()) {
        errors.species =
            "Species is required.";
    }

    if (!formData.gender) {
        errors.gender =
            "Gender is required.";
    }

    if (!formData.farm_id) {
        errors.farm_id =
            "Farm ID is required.";
    }

    if (
        formData.age !== "" &&
        (
            Number.isNaN(
                Number(formData.age)
            ) ||
            Number(formData.age) < 0
        )
    ) {
        errors.age =
            "Age must be a valid positive number.";
    }

    if (
        formData.weight !== "" &&
        (
            Number.isNaN(
                Number(formData.weight)
            ) ||
            Number(formData.weight) <= 0
        )
    ) {
        errors.weight =
            "Weight must be greater than zero.";
    }

    return errors;
}

export default function AnimalRegistration() {
    const navigate = useNavigate();

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

    const handleChange = (event) => {
        const {
            name,
            value,
        } = event.target;

        setFormData((current) => ({
            ...current,
            [name]: value,
        }));

        setErrors((current) => ({
            ...current,
            [name]: "",
        }));

        setError("");
        setSuccess("");
    };

    const handleCancel = () => {
        navigate("/animals");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        const validationErrors =
            validateForm(formData);

        if (
            Object.keys(
                validationErrors
            ).length > 0
        ) {
            setErrors(
                validationErrors
            );
            return;
        }

        const token = getToken();

        if (!token) {
            navigate("/login", {
                replace: true,
            });

            return;
        }

        try {
            setSubmitting(true);

            const payload = {
                tag_id:
                    formData.tag_id.trim(),

                name:
                    formData.name.trim(),

                species:
                    formData.species.trim(),

                breed:
                    formData.breed.trim() ||
                    null,

                gender:
                    formData.gender,

                age:
                    formData.age === ""
                        ? null
                        : Number(
                              formData.age
                          ),

                weight:
                    formData.weight === ""
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

            setSuccess(
                "Animal registered successfully."
            );

            /*
             * Give the operator a brief confirmation
             * before returning to the registry.
             */
            setTimeout(() => {
                const registeredAnimal =
                    response?.data;

                const registeredId =
                    registeredAnimal?.id;

                if (registeredId) {
                    navigate(
                        `/animals/${registeredId}`
                    );
                } else {
                    navigate("/animals");
                }
            }, 900);
        } catch (err) {
            console.error(
                "Animal registration error:",
                err
            );

            if (
                err?.response?.status ===
                401
            ) {
                localStorage.removeItem(
                    "access_token"
                );

                navigate("/login", {
                    replace: true,
                });

                return;
            }

            setError(
                normalizeError(err)
            );
        } finally {
            setSubmitting(false);
        }
    };

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
                                System ready
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
                                    value={
                                        formData.farm_id
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. 1"
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