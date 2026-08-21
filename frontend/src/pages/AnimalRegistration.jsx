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
    farm_id: "",
};

/* ==========================================================================
   HELPERS
   ========================================================================== */

function getToken() {
    return localStorage.getItem("access_token");
}

function normalizeError(error) {
    const status = error?.response?.status;
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

                if (Array.isArray(item?.loc)) {
                    const field = item.loc[item.loc.length - 1];

                    return `${field}: ${
                        item.msg ||
                        item.message ||
                        "Validation error"
                    }`;
                }

                return (
                    item?.msg ||
                    item?.message ||
                    "Validation error"
                );
            })
            .join(", ");
    }

    if (status === 400) {
        return (
            error?.response?.data?.message ||
            "The animal data could not be accepted."
        );
    }

    if (status === 404) {
        return (
            "The selected farm or animal resource could not be found."
        );
    }

    if (status === 409) {
        return (
            "An animal with this tag ID already exists."
        );
    }

    if (status === 422) {
        return (
            "Some animal information is invalid. Please review the highlighted fields."
        );
    }

    if (status >= 500) {
        return (
            "The HerdSense AI server encountered an error. Please try again."
        );
    }

    return (
        error?.response?.data?.message ||
        error?.message ||
        "Unable to register this animal."
    );
}

function validateForm(formData) {
    const errors = {};

    const tagId = formData.tag_id.trim();
    const name = formData.name.trim();
    const species = formData.species.trim();
    const gender = formData.gender.trim();
    const farmId = formData.farm_id.trim();

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

    if (!gender) {
        errors.gender =
            "Gender is required.";
    }

    if (!farmId) {
        errors.farm_id =
            "Select a farm for this animal.";
    }

    /* ----------------------------------------------------------------------
       TAG ID
       ---------------------------------------------------------------------- */

    if (tagId && tagId.length > 100) {
        errors.tag_id =
            "Tag ID must be 100 characters or fewer.";
    }

    /* ----------------------------------------------------------------------
       NAME
       ---------------------------------------------------------------------- */

    if (name && name.length > 150) {
        errors.name =
            "Animal name must be 150 characters or fewer.";
    }

    /* ----------------------------------------------------------------------
       SPECIES
       ---------------------------------------------------------------------- */

    const validSpecies = [
        "Cattle",
        "Goat",
        "Sheep",
        "Pig",
        "Other",
    ];

    if (
        species &&
        !validSpecies.includes(species)
    ) {
        errors.species =
            "Please select a valid species.";
    }

    /* ----------------------------------------------------------------------
       GENDER
       ---------------------------------------------------------------------- */

    const validGenders = [
        "female",
        "male",
    ];

    if (
        gender &&
        !validGenders.includes(
            gender.toLowerCase()
        )
    ) {
        errors.gender =
            "Please select a valid gender.";
    }

    /* ----------------------------------------------------------------------
       FARM
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
                "Please select a valid farm.";
        }
    }

    /* ----------------------------------------------------------------------
       AGE
       ---------------------------------------------------------------------- */

    if (formData.age !== "") {
        const age =
            Number(formData.age);

        if (
            !Number.isFinite(age) ||
            !Number.isInteger(age) ||
            age < 0
        ) {
            errors.age =
                "Age must be a valid non-negative whole number.";
        }
    }

    /* ----------------------------------------------------------------------
       WEIGHT
       ---------------------------------------------------------------------- */

    if (formData.weight !== "") {
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

    const [farms, setFarms] =
        useState([]);

    const [loadingFarms, setLoadingFarms] =
        useState(true);

    const [farmLoadError, setFarmLoadError] =
        useState("");

    const [errors, setErrors] =
        useState({});

    const [submitting, setSubmitting] =
        useState(false);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");

    /* ==========================================================================
       LOAD AUTHENTICATED USER FARMS
       ========================================================================== */

    useEffect(() => {
        let mounted = true;

        const loadFarms = async () => {
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
                setLoadingFarms(true);
                setFarmLoadError("");

                const response =
                    await api.get(
                        "/farms/",
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
                            },
                        }
                    );

                if (!mounted) {
                    return;
                }

                const loadedFarms =
                    Array.isArray(
                        response?.data
                    )
                        ? response.data
                        : [];

                setFarms(
                    loadedFarms
                );

                /*
                 * If the authenticated user has
                 * exactly one farm, automatically
                 * select it.
                 */

                if (
                    loadedFarms.length ===
                    1
                ) {
                    setFormData(
                        (current) => ({
                            ...current,
                            farm_id:
                                String(
                                    loadedFarms[0]
                                        .id
                                ),
                        })
                    );
                }
            } catch (err) {
                console.error(
                    "Farm loading error:",
                    err
                );

                if (!mounted) {
                    return;
                }

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

                setFarmLoadError(
                    normalizeError(err)
                );
            } finally {
                if (mounted) {
                    setLoadingFarms(
                        false
                    );
                }
            }
        };

        loadFarms();

        return () => {
            mounted = false;
        };
    }, [navigate]);

    /* ==========================================================================
       CLEANUP
       ========================================================================== */

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

    /* ==========================================================================
       FORM CHANGE
       ========================================================================== */

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

    /* ==========================================================================
       CANCEL
       ========================================================================== */

    const handleCancel = () => {
        if (submitting) {
            return;
        }

        navigate("/animals");
    };

    /* ==========================================================================
       SUBMIT
       ========================================================================== */

    const handleSubmit =
        async (event) => {
            event.preventDefault();

            if (submitting) {
                return;
            }

            setError("");
            setSuccess("");

            /*
             * Never submit while the farm list
             * is still loading.
             */

            if (loadingFarms) {
                setError(
                    "Please wait while your farms are loaded."
                );

                return;
            }

            /*
             * The authenticated user must have
             * at least one farm.
             */

            if (farms.length === 0) {
                setError(
                    "No farm is available for your account. Create a farm before registering an animal."
                );

                return;
            }

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

            /*
             * Make absolutely sure the selected
             * farm belongs to the farms returned
             * by the authenticated-user endpoint.
             */

            const numericFarmId =
                Number(
                    formData.farm_id
                );

            const selectedFarm =
                farms.find(
                    (farm) =>
                        Number(
                            farm.id
                        ) ===
                        numericFarmId
                );

            if (!selectedFarm) {
                setErrors(
                    (current) => ({
                        ...current,
                        farm_id:
                            "The selected farm is invalid. Please choose one of your available farms.",
                    })
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
                 * Exact payload expected by:
                 *
                 * AnimalCreate
                 *
                 * {
                 *   tag_id: str,
                 *   name: str,
                 *   species: str,
                 *   breed: str | None,
                 *   gender: str,
                 *   age: int | None,
                 *   weight: float | None,
                 *   farm_id: int
                 * }
                 */

                const payload = {
                    tag_id:
                        formData.tag_id
                            .trim()
                            .toUpperCase(),

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
                        formData.gender
                            .trim()
                            .toLowerCase(),

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
                        numericFarmId,
                };

                console.log(
                    "Creating HerdSense animal:",
                    payload
                );

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

                setSuccess(
                    "Animal registered successfully. Returning to the Animals registry..."
                );

                /*
                 * Return to the registry after
                 * successful creation.
                 *
                 * The Animals page should fetch its
                 * current data when mounted.
                 */

                redirectTimer.current =
                    setTimeout(() => {
                        navigate(
                            "/animals",
                            {
                                replace: true,
                                state: {
                                    animalCreated:
                                        true,
                                    animal:
                                        registeredAnimal,
                                },
                            }
                        );
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

                setError(
                    normalizeError(err)
                );
            } finally {
                setSubmitting(false);
            }
        };

    /* ==========================================================================
       RENDER
       ========================================================================== */

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
                                    : loadingFarms
                                    ? "Loading farms"
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
                    FARM LOAD ERROR
                ========================================================== */}

                {farmLoadError && (
                    <div
                        className="registration-message registration-message-error"
                        role="alert"
                    >
                        <div className="registration-message-icon">
                            !
                        </div>

                        <div>
                            <strong>
                                Farm data unavailable
                            </strong>

                            <span>
                                {farmLoadError}
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
                                    animal to one
                                    of your
                                    registered farms.
                                </p>
                            </div>

                        </div>

                        <div className="registration-fields registration-fields-single">

                            <div className="registration-field">

                                <label htmlFor="farm_id">
                                    FARM
                                    <span>
                                        REQUIRED
                                    </span>
                                </label>

                                <select
                                    id="farm_id"
                                    name="farm_id"
                                    value={
                                        formData.farm_id
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    disabled={
                                        submitting ||
                                        loadingFarms ||
                                        farms.length ===
                                            0
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
                                >

                                    <option value="">
                                        {loadingFarms
                                            ? "Loading your farms..."
                                            : farms.length ===
                                              0
                                            ? "No farms available"
                                            : "Select a farm"}
                                    </option>

                                    {farms.map(
                                        (
                                            farm
                                        ) => (
                                            <option
                                                key={
                                                    farm.id
                                                }
                                                value={
                                                    farm.id
                                                }
                                            >
                                                {farm.name}
                                            </option>
                                        )
                                    )}

                                </select>

                                {errors.farm_id && (
                                    <small>
                                        {
                                            errors.farm_id
                                        }
                                    </small>
                                )}

                                {!loadingFarms &&
                                    !farmLoadError &&
                                    farms.length ===
                                        0 && (
                                        <small>
                                            Create a farm
                                            before
                                            registering an
                                            animal.
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
                                submitting ||
                                loadingFarms ||
                                farms.length ===
                                    0
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