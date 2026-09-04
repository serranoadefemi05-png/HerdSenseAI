import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useLocation,
    useNavigate,
} from "react-router-dom";

import api from "../api/api";

import "./AdminDashboard.css";


/* ============================================================================
   HERDSENSE AI
   ADMIN COMMAND CENTER
   ============================================================================ */

const WORKSPACES = {
    OVERVIEW: "overview",
    ACCOUNTS: "accounts",
    FARMS: "farms",
    ANIMALS: "animals",
    MONITORING: "monitoring",
};


const emptyUserForm = {
    email: "",
    full_name: "",
    password: "",
    role: "farmer",
    email_verified: false,
    wallet_address: "",
    wallet_chain: "",
};


const emptyFarmForm = {
    name: "",
    location: "",
    latitude: "",
    longitude: "",
    owner_id: "",
};


const emptyAnimalForm = {
    tag_id: "",
    name: "",
    species: "",
    breed: "",
    gender: "",
    age: "",
    weight: "",
    health_status: "Healthy",
    temperature: "",
    latitude: "",
    longitude: "",
    farm_id: "",
};


export default function AdminDashboard() {

    const navigate = useNavigate();
    const location = useLocation();


    /* ========================================================================
       CORE STATE
       ======================================================================== */

    const [overview, setOverview] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [error, setError] =
        useState("");

    const [lastUpdated, setLastUpdated] =
        useState(null);


    /* ========================================================================
       ADMIN WORKSPACE
       ======================================================================== */

    const [workspace, setWorkspace] =
        useState(WORKSPACES.OVERVIEW);


    const [workspaceLoading, setWorkspaceLoading] =
        useState(false);

    const [workspaceError, setWorkspaceError] =
        useState("");


    const [users, setUsers] =
        useState([]);

    const [farmsList, setFarmsList] =
        useState([]);

    const [animalsList, setAnimalsList] =
        useState([]);


    /* ========================================================================
       MANAGEMENT UI STATE
       ======================================================================== */

    const [userSearch, setUserSearch] =
        useState("");

    const [farmSearch, setFarmSearch] =
        useState("");

    const [animalSearch, setAnimalSearch] =
        useState("");


    const [showUserForm, setShowUserForm] =
        useState(false);

    const [showFarmForm, setShowFarmForm] =
        useState(false);

    const [showAnimalForm, setShowAnimalForm] =
        useState(false);


    const [editingUser, setEditingUser] =
        useState(null);

    const [editingFarm, setEditingFarm] =
        useState(null);

    const [editingAnimal, setEditingAnimal] =
        useState(null);


    const [userForm, setUserForm] =
        useState(emptyUserForm);

    const [farmForm, setFarmForm] =
        useState(emptyFarmForm);

    const [animalForm, setAnimalForm] =
        useState(emptyAnimalForm);


    const [saving, setSaving] =
        useState(false);

    const [deletingId, setDeletingId] =
        useState(null);


    /* ========================================================================
       ADMIN PROFILE
       ======================================================================== */

    const administrator =
        useMemo(() => {

            try {

                return JSON.parse(
                    localStorage.getItem(
                        "herdsense_user"
                    )
                ) || {};

            } catch {

                return {};

            }

        }, []);


    /* ========================================================================
       AUTH FAILURE
       ======================================================================== */

    const handleUnauthorized = useCallback(() => {

        localStorage.removeItem(
            "access_token"
        );

        localStorage.removeItem(
            "token"
        );

        localStorage.removeItem(
            "user_role"
        );

        localStorage.removeItem(
            "herdsense_user"
        );

        navigate(
            "/login",
            {
                replace: true,
            }
        );

    }, [navigate]);


    /* ========================================================================
       ERROR HANDLER
       ======================================================================== */

    const handleApiError = useCallback(
        (
            err,
            fallback = "Unable to complete administrator request."
        ) => {

            console.error(
                "Admin command center error:",
                err
            );


            if (
                err.response?.status ===
                401
            ) {

                handleUnauthorized();

                return "Your administrator session has expired.";

            }


            if (
                err.response?.status ===
                403
            ) {

                return "Administrator access required.";

            }


            return (
                err.response?.data?.detail ||
                fallback
            );

        },
        [handleUnauthorized]
    );


    /* ========================================================================
       FETCH OVERVIEW
       ======================================================================== */

    const fetchOverview =
        useCallback(
            async (silent = false) => {

                try {

                    if (!silent) {
                        setRefreshing(true);
                    }

                    setError("");

                    const response =
                        await api.get(
                            "/admin/overview"
                        );

                    setOverview(
                        response.data
                    );

                    setLastUpdated(
                        new Date()
                    );

                } catch (err) {

                    const message =
                        handleApiError(
                            err,
                            "Unable to load administrator overview."
                        );

                    setError(message);

                } finally {

                    setLoading(false);
                    setRefreshing(false);

                }

            },
            [handleApiError]
        );


    /* ========================================================================
       FETCH USERS
       ======================================================================== */

    const fetchUsers =
        useCallback(
            async () => {

                try {

                    setWorkspaceLoading(true);
                    setWorkspaceError("");

                    const response =
                        await api.get(
                            "/admin/users"
                        );

                    setUsers(
                        Array.isArray(
                            response.data
                        )
                            ? response.data
                            : []
                    );

                } catch (err) {

                    setWorkspaceError(
                        handleApiError(
                            err,
                            "Unable to load platform accounts."
                        )
                    );

                } finally {

                    setWorkspaceLoading(false);

                }

            },
            [handleApiError]
        );


    /* ========================================================================
       FETCH FARMS
       ======================================================================== */

    const fetchFarms =
        useCallback(
            async () => {

                try {

                    setWorkspaceLoading(true);
                    setWorkspaceError("");

                    const response =
                        await api.get(
                            "/admin/farms"
                        );

                    setFarmsList(
                        Array.isArray(
                            response.data
                        )
                            ? response.data
                            : []
                    );

                } catch (err) {

                    setWorkspaceError(
                        handleApiError(
                            err,
                            "Unable to load farm network."
                        )
                    );

                } finally {

                    setWorkspaceLoading(false);

                }

            },
            [handleApiError]
        );


    /* ========================================================================
       FETCH ANIMALS
       ======================================================================== */

    const fetchAnimals =
        useCallback(
            async () => {

                try {

                    setWorkspaceLoading(true);
                    setWorkspaceError("");

                    const response =
                        await api.get(
                            "/admin/animals"
                        );

                    setAnimalsList(
                        Array.isArray(
                            response.data
                        )
                            ? response.data
                            : []
                    );

                } catch (err) {

                    setWorkspaceError(
                        handleApiError(
                            err,
                            "Unable to load animal registry."
                        )
                    );

                } finally {

                    setWorkspaceLoading(false);

                }

            },
            [handleApiError]
        );


    /* ========================================================================
       INITIAL LOAD
       ======================================================================== */

    useEffect(() => {

        fetchOverview();

        const interval =
            setInterval(
                () => fetchOverview(true),
                30000
            );

        return () => {
            clearInterval(interval);
        };

    }, [fetchOverview]);


    /* ========================================================================
       LOAD WORKSPACE DATA
       ======================================================================== */

    useEffect(() => {

        if (workspace === WORKSPACES.ACCOUNTS) {
            fetchUsers();
        }

        if (workspace === WORKSPACES.FARMS) {
            fetchUsers();
            fetchFarms();
        }

        if (workspace === WORKSPACES.ANIMALS) {
            fetchFarms();
            fetchAnimals();
        }

    }, [
        workspace,
        fetchUsers,
        fetchFarms,
        fetchAnimals,
    ]);


    /* ========================================================================
       HEALTH
       ======================================================================== */

    const health =
        useMemo(() => {

            if (!overview) {

                return {
                    percentage: 0,
                    label: "Loading",
                    description:
                        "Collecting system intelligence.",
                    state: "loading",
                };

            }


            const animalData =
                overview.animals || {};

            const totalAnimals =
                Number(
                    animalData.total || 0
                );

            const healthyAnimals =
                Number(
                    animalData.healthy || 0
                );


            const animalHealth =
                totalAnimals > 0
                    ? (
                        healthyAnimals /
                        totalAnimals
                    ) * 100
                    : 100;


            const apiHealthy =
                overview.system?.api ===
                "healthy";


            const databaseHealthy =
                overview.system?.database ===
                "healthy";


            const infrastructureScore =
                (
                    (apiHealthy ? 100 : 0) +
                    (databaseHealthy ? 100 : 0)
                ) / 2;


            let percentage =
                Math.round(
                    (
                        infrastructureScore *
                        0.5
                    ) +
                    (
                        animalHealth *
                        0.5
                    )
                );


            percentage =
                Math.max(
                    0,
                    Math.min(
                        100,
                        percentage
                    )
                );


            let label = "Critical";

            let description =
                "Immediate attention required.";

            let state = "critical";


            if (percentage >= 95) {

                label = "Excellent";

                description =
                    "System operating at peak health.";

                state = "excellent";

            } else if (percentage >= 85) {

                label = "Healthy";

                description =
                    "System operating normally.";

                state = "healthy";

            } else if (percentage >= 70) {

                label = "Stable";

                description =
                    "System operational with some risk.";

                state = "stable";

            } else if (percentage >= 50) {

                label = "At Risk";

                description =
                    "Several operational conditions require attention.";

                state = "risk";

            }


            return {
                percentage,
                label,
                description,
                state,
            };

        }, [overview]);


    /* ========================================================================
       RING
       ======================================================================== */

    const ringRadius = 88;

    const ringCircumference =
        2 *
        Math.PI *
        ringRadius;

    const ringOffset =
        ringCircumference -
        (
            health.percentage /
            100
        ) *
        ringCircumference;


    /* ========================================================================
       OVERVIEW DATA
       ======================================================================== */

    const overviewUsers =
        overview?.users || {};

    const farms =
        overview?.farms || {};

    const animals =
        overview?.animals || {};

    const telemetry =
        overview?.telemetry || {};

    const alerts =
        overview?.alerts || {};

    const system =
        overview?.system || {};


    /* ========================================================================
       WORKSPACE NAVIGATION
       ======================================================================== */

    const selectWorkspace = (
        nextWorkspace
    ) => {

        setWorkspace(
            nextWorkspace
        );

        setWorkspaceError("");

        setShowUserForm(false);
        setShowFarmForm(false);
        setShowAnimalForm(false);

        setEditingUser(null);
        setEditingFarm(null);
        setEditingAnimal(null);

    };


    /* ========================================================================
       SIDEBAR NAVIGATION
       ======================================================================== */

    const navGroups = [

        {
            label: "COMMAND",
            items: [
                {
                    label: "Overview",
                    workspace:
                        WORKSPACES.OVERVIEW,
                    icon: "⌂",
                },
            ],
        },

        {
            label: "ADMINISTRATION",
            items: [
                {
                    label: "Accounts",
                    workspace:
                        WORKSPACES.ACCOUNTS,
                    icon: "◎",
                },
                {
                    label: "Farms",
                    workspace:
                        WORKSPACES.FARMS,
                    icon: "⌂",
                },
                {
                    label: "Animals",
                    workspace:
                        WORKSPACES.ANIMALS,
                    icon: "◉",
                },
            ],
        },

        {
            label: "MONITORING",
            items: [
                {
                    label: "Monitoring",
                    workspace:
                        WORKSPACES.MONITORING,
                    icon: "⌁",
                },
            ],
        },

        {
            label: "INTELLIGENCE",
            items: [
                {
                    label: "Analytics",
                    path: "/analytics",
                    icon: "◫",
                },
                {
                    label: "Prediction",
                    path: "/prediction",
                    icon: "◇",
                },
                {
                    label: "Reports",
                    path: "/reports",
                    icon: "▤",
                },
            ],
        },

        {
            label: "SYSTEM",
            items: [
                {
                    label: "Settings",
                    path: "/settings",
                    icon: "⚙",
                },
            ],
        },

    ];


    const isActive = (item) => {

        if (item.workspace) {

            return (
                workspace ===
                item.workspace
            );

        }

        return location.pathname.startsWith(
            item.path
        );

    };


    /* ========================================================================
       LOGOUT
       ======================================================================== */

    const handleLogout = () => {

        handleUnauthorized();

    };


    /* ========================================================================
       USER FORM
       ======================================================================== */

    const openCreateUser = () => {

        setEditingUser(null);

        setUserForm(
            {
                ...emptyUserForm,
            }
        );

        setShowUserForm(true);

    };


    const openEditUser = (user) => {

        setEditingUser(user);

        setUserForm(
            {
                email:
                    user.email || "",

                full_name:
                    user.full_name || "",

                password:
                    "",

                role:
                    user.role || "farmer",

                email_verified:
                    Boolean(
                        user.email_verified ??
                        user.is_email_verified
                    ),

                wallet_address:
                    user.wallet_address || "",

                wallet_chain:
                    user.wallet_chain || "",
            }
        );

        setShowUserForm(true);

    };


    const closeUserForm = () => {

        if (saving) {
            return;
        }

        setShowUserForm(false);
        setEditingUser(null);

    };


    const handleUserChange = (
        event
    ) => {

        const {
            name,
            value,
            type,
            checked,
        } = event.target;

        setUserForm(
            (current) => ({
                ...current,
                [name]:
                    type === "checkbox"
                        ? checked
                        : value,
            })
        );

    };


    const submitUser = async (
        event
    ) => {

        event.preventDefault();

        try {

            setSaving(true);
            setWorkspaceError("");

            const payload = {
                email:
                    userForm.email.trim(),

                full_name:
                    userForm.full_name.trim(),

                role:
                    userForm.role,

                email_verified:
                    Boolean(
                        userForm.email_verified
                    ),
            };


            if (
                userForm.password.trim()
            ) {

                payload.password =
                    userForm.password;

            }


            if (
                userForm.wallet_address.trim()
            ) {

                payload.wallet_address =
                    userForm.wallet_address.trim();

            }


            if (
                userForm.wallet_chain.trim()
            ) {

                payload.wallet_chain =
                    userForm.wallet_chain.trim();

            }


            if (editingUser) {

                await api.put(
                    `/admin/users/${editingUser.id}`,
                    payload
                );

            } else {

                if (!userForm.password.trim()) {

                    throw new Error(
                        "A password is required when creating an account."
                    );

                }

                await api.post(
                    "/admin/users",
                    {
                        ...payload,
                        password:
                            userForm.password,
                    }
                );

            }


            setShowUserForm(false);
            setEditingUser(null);

            await fetchUsers();
            await fetchOverview(true);

        } catch (err) {

            const message =
                err instanceof Error &&
                !err.response
                    ? err.message
                    : handleApiError(
                        err,
                        "Unable to save account."
                    );

            setWorkspaceError(
                message
            );

        } finally {

            setSaving(false);

        }

    };


    /* ========================================================================
       DELETE USER
       ======================================================================== */

    const deleteUser = async (
        user
    ) => {

        const confirmed =
            window.confirm(
                `Delete account "${user.full_name || user.email}"?\n\nThis is a destructive administrator action and may remove associated farm data. Continue?`
            );

        if (!confirmed) {
            return;
        }


        try {

            setDeletingId(
                `user-${user.id}`
            );

            setWorkspaceError("");

            await api.delete(
                `/admin/users/${user.id}`
            );

            await fetchUsers();
            await fetchOverview(true);

        } catch (err) {

            setWorkspaceError(
                handleApiError(
                    err,
                    "Unable to delete account."
                )
            );

        } finally {

            setDeletingId(null);

        }

    };


    /* ========================================================================
       FARM FORM
       ======================================================================== */

    const openCreateFarm = () => {

        setEditingFarm(null);

        setFarmForm(
            {
                ...emptyFarmForm,
            }
        );

        setShowFarmForm(true);

    };


    const openEditFarm = (farm) => {

        setEditingFarm(farm);

        setFarmForm(
            {
                name:
                    farm.name || "",

                location:
                    farm.location || "",

                latitude:
                    farm.latitude ??
                    "",

                longitude:
                    farm.longitude ??
                    "",

                owner_id:
                    farm.owner_id ??
                    "",
            }
        );

        setShowFarmForm(true);

    };


    const closeFarmForm = () => {

        if (saving) {
            return;
        }

        setShowFarmForm(false);
        setEditingFarm(null);

    };


    const handleFarmChange = (
        event
    ) => {

        const {
            name,
            value,
        } = event.target;

        setFarmForm(
            (current) => ({
                ...current,
                [name]: value,
            })
        );

    };


    const submitFarm = async (
        event
    ) => {

        event.preventDefault();

        try {

            setSaving(true);
            setWorkspaceError("");

            const payload = {
                name:
                    farmForm.name.trim(),

                location:
                    farmForm.location.trim(),

                owner_id:
                    Number(
                        farmForm.owner_id
                    ),
            };


            if (
                farmForm.latitude !== ""
            ) {

                payload.latitude =
                    Number(
                        farmForm.latitude
                    );

            }


            if (
                farmForm.longitude !== ""
            ) {

                payload.longitude =
                    Number(
                        farmForm.longitude
                    );

            }


            if (editingFarm) {

                await api.put(
                    `/admin/farms/${editingFarm.id}`,
                    payload
                );

            } else {

                await api.post(
                    "/admin/farms",
                    payload
                );

            }


            setShowFarmForm(false);
            setEditingFarm(null);

            await fetchFarms();
            await fetchOverview(true);

        } catch (err) {

            setWorkspaceError(
                handleApiError(
                    err,
                    "Unable to save farm."
                )
            );

        } finally {

            setSaving(false);

        }

    };


    /* ========================================================================
       DELETE FARM
       ======================================================================== */

    const deleteFarm = async (
        farm
    ) => {

        const confirmed =
            window.confirm(
                `Delete farm "${farm.name}"?\n\nThis is destructive. Animals and related farm data may also be removed through the database relationship cascade. Continue?`
            );

        if (!confirmed) {
            return;
        }


        try {

            setDeletingId(
                `farm-${farm.id}`
            );

            setWorkspaceError("");

            await api.delete(
                `/admin/farms/${farm.id}`
            );

            await fetchFarms();
            await fetchOverview(true);

        } catch (err) {

            setWorkspaceError(
                handleApiError(
                    err,
                    "Unable to delete farm."
                )
            );

        } finally {

            setDeletingId(null);

        }

    };


    /* ========================================================================
       ANIMAL FORM
       ======================================================================== */

    const openCreateAnimal = () => {

        setEditingAnimal(null);

        setAnimalForm(
            {
                ...emptyAnimalForm,
            }
        );

        setShowAnimalForm(true);

    };


    const openEditAnimal = (
        animal
    ) => {

        setEditingAnimal(animal);

        setAnimalForm(
            {
                tag_id:
                    animal.tag_id || "",

                name:
                    animal.name || "",

                species:
                    animal.species || "",

                breed:
                    animal.breed || "",

                gender:
                    animal.gender || "",

                age:
                    animal.age ??
                    "",

                weight:
                    animal.weight ??
                    "",

                health_status:
                    animal.health_status ||
                    "Healthy",

                temperature:
                    animal.temperature ??
                    "",

                latitude:
                    animal.latitude ??
                    "",

                longitude:
                    animal.longitude ??
                    "",

                farm_id:
                    animal.farm_id ??
                    "",
            }
        );

        setShowAnimalForm(true);

    };


    const closeAnimalForm = () => {

        if (saving) {
            return;
        }

        setShowAnimalForm(false);
        setEditingAnimal(null);

    };


    const handleAnimalChange = (
        event
    ) => {

        const {
            name,
            value,
        } = event.target;

        setAnimalForm(
            (current) => ({
                ...current,
                [name]: value,
            })
        );

    };


    const submitAnimal = async (
        event
    ) => {

        event.preventDefault();

        try {

            setSaving(true);
            setWorkspaceError("");

            const payload = {
                tag_id:
                    animalForm.tag_id.trim(),

                name:
                    animalForm.name.trim(),

                species:
                    animalForm.species.trim(),

                gender:
                    animalForm.gender.trim(),

                health_status:
                    animalForm.health_status,

                farm_id:
                    Number(
                        animalForm.farm_id
                    ),
            };


            if (
                animalForm.breed.trim()
            ) {

                payload.breed =
                    animalForm.breed.trim();

            }


            if (
                animalForm.age !== ""
            ) {

                payload.age =
                    Number(
                        animalForm.age
                    );

            }


            if (
                animalForm.weight !== ""
            ) {

                payload.weight =
                    Number(
                        animalForm.weight
                    );

            }


            if (
                animalForm.temperature !== ""
            ) {

                payload.temperature =
                    Number(
                        animalForm.temperature
                    );

            }


            if (
                animalForm.latitude !== ""
            ) {

                payload.latitude =
                    Number(
                        animalForm.latitude
                    );

            }


            if (
                animalForm.longitude !== ""
            ) {

                payload.longitude =
                    Number(
                        animalForm.longitude
                    );

            }


            if (editingAnimal) {

                await api.put(
                    `/admin/animals/${editingAnimal.id}`,
                    payload
                );

            } else {

                await api.post(
                    "/admin/animals",
                    payload
                );

            }


            setShowAnimalForm(false);
            setEditingAnimal(null);

            await fetchAnimals();
            await fetchOverview(true);

        } catch (err) {

            setWorkspaceError(
                handleApiError(
                    err,
                    "Unable to save animal."
                )
            );

        } finally {

            setSaving(false);

        }

    };


    /* ========================================================================
       DELETE ANIMAL
       ======================================================================== */

    const deleteAnimal = async (
        animal
    ) => {

        const confirmed =
            window.confirm(
                `Delete animal "${animal.name || animal.tag_id}"?\n\nThis is a destructive administrator action. Continue?`
            );

        if (!confirmed) {
            return;
        }


        try {

            setDeletingId(
                `animal-${animal.id}`
            );

            setWorkspaceError("");

            await api.delete(
                `/admin/animals/${animal.id}`
            );

            await fetchAnimals();
            await fetchOverview(true);

        } catch (err) {

            setWorkspaceError(
                handleApiError(
                    err,
                    "Unable to delete animal."
                )
            );

        } finally {

            setDeletingId(null);

        }

    };


    /* ========================================================================
       FILTERED DATA
       ======================================================================== */

    const filteredUsers =
        useMemo(() => {

            const query =
                userSearch
                    .trim()
                    .toLowerCase();

            if (!query) {
                return users;
            }

            return users.filter(
                (user) =>
                    String(
                        user.id
                    ).includes(query) ||
                    String(
                        user.email || ""
                    )
                        .toLowerCase()
                        .includes(query) ||
                    String(
                        user.full_name || ""
                    )
                        .toLowerCase()
                        .includes(query) ||
                    String(
                        user.role || ""
                    )
                        .toLowerCase()
                        .includes(query)
            );

        }, [
            users,
            userSearch,
        ]);


    const filteredFarms =
        useMemo(() => {

            const query =
                farmSearch
                    .trim()
                    .toLowerCase();

            if (!query) {
                return farmsList;
            }

            return farmsList.filter(
                (farm) =>
                    String(
                        farm.id
                    ).includes(query) ||
                    String(
                        farm.name || ""
                    )
                        .toLowerCase()
                        .includes(query) ||
                    String(
                        farm.location || ""
                    )
                        .toLowerCase()
                        .includes(query)
            );

        }, [
            farmsList,
            farmSearch,
        ]);


    const filteredAnimals =
        useMemo(() => {

            const query =
                animalSearch
                    .trim()
                    .toLowerCase();

            if (!query) {
                return animalsList;
            }

            return animalsList.filter(
                (animal) =>
                    String(
                        animal.id
                    ).includes(query) ||
                    String(
                        animal.tag_id || ""
                    )
                        .toLowerCase()
                        .includes(query) ||
                    String(
                        animal.name || ""
                    )
                        .toLowerCase()
                        .includes(query) ||
                    String(
                        animal.species || ""
                    )
                        .toLowerCase()
                        .includes(query) ||
                    String(
                        animal.health_status || ""
                    )
                        .toLowerCase()
                        .includes(query)
            );

        }, [
            animalsList,
            animalSearch,
        ]);


    /* ========================================================================
       LOADING
       ======================================================================== */

    if (loading) {

        return (
            <div className="admin-command-loading">

                <div className="command-loader">
                    <span />
                </div>

                <div>
                    <strong>
                        HERDSENSE AI
                    </strong>

                    <span>
                        Initializing command center...
                    </span>
                </div>

            </div>
        );

    }


    /* ========================================================================
       ERROR
       ======================================================================== */

    if (error && !overview) {

        return (
            <div className="admin-command-loading">

                <div className="command-error">

                    <div className="command-error-mark">
                        !
                    </div>

                    <strong>
                        Command center unavailable
                    </strong>

                    <span>
                        {error}
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            fetchOverview()
                        }
                    >
                        Retry connection
                    </button>

                </div>

            </div>
        );

    }


    /* ========================================================================
       RENDER
       ======================================================================== */

    return (
        <div className="admin-shell">


            {/* ==================================================================
                SIDEBAR
            ================================================================== */}

            <aside className="admin-sidebar">

                <div className="sidebar-brand">

                    <div className="sidebar-brand-mark">
                        HS
                    </div>

                    <div className="sidebar-brand-copy">

                        <strong>
                            HerdSense
                        </strong>

                        <span>
                            AI SYSTEMS
                        </span>

                    </div>

                </div>


                <div className="sidebar-system">

                    <span className="sidebar-status-dot" />

                    <div>

                        <strong>
                            SYSTEM ONLINE
                        </strong>

                        <span>
                            Command infrastructure
                        </span>

                    </div>

                </div>


                <nav className="admin-navigation">

                    {navGroups.map(
                        (group) => (

                            <div
                                className="nav-group"
                                key={group.label}
                            >

                                <span className="nav-group-label">
                                    {group.label}
                                </span>

                                <div className="nav-group-items">

                                    {group.items.map(
                                        (item) => (

                                            <button
                                                type="button"
                                                key={
                                                    item.workspace ||
                                                    item.path
                                                }
                                                className={
                                                    `admin-nav-item ${
                                                        isActive(item)
                                                            ? "active"
                                                            : ""
                                                    }`
                                                }
                                                onClick={() => {

                                                    if (
                                                        item.workspace
                                                    ) {

                                                        selectWorkspace(
                                                            item.workspace
                                                        );

                                                    } else {

                                                        navigate(
                                                            item.path
                                                        );

                                                    }

                                                }}
                                            >

                                                <span className="nav-icon">
                                                    {item.icon}
                                                </span>

                                                <span>
                                                    {item.label}
                                                </span>

                                            </button>

                                        )
                                    )}

                                </div>

                            </div>

                        )
                    )}

                </nav>


                <div className="sidebar-bottom">

                    <div className="sidebar-admin">

                        <div className="sidebar-avatar">

                            {administrator.full_name
                                ?.charAt(0)
                                ?.toUpperCase() ||
                                "A"}

                        </div>

                        <div className="sidebar-admin-copy">

                            <strong>
                                {administrator.full_name ||
                                    "Administrator"}
                            </strong>

                            <span>
                                Administrator
                            </span>

                        </div>

                    </div>


                    <button
                        type="button"
                        className="sidebar-logout"
                        onClick={
                            handleLogout
                        }
                    >
                        Sign out
                    </button>

                </div>

            </aside>


            {/* ==================================================================
                MAIN
            ================================================================== */}

            <main className="admin-main">


                {/* ==============================================================
                    TOP BAR
                ============================================================== */}

                <header className="admin-topbar">

                    <div>

                        <span className="topbar-eyebrow">

                            HERDSENSE AI

                            <span>
                                /
                            </span>

                            ADMINISTRATION

                        </span>

                        <h1>
                            {workspace === WORKSPACES.OVERVIEW
                                ? "System Command Center"
                                : workspace === WORKSPACES.ACCOUNTS
                                    ? "Account Command"
                                    : workspace === WORKSPACES.FARMS
                                        ? "Farm Network Control"
                                        : workspace === WORKSPACES.ANIMALS
                                            ? "Animal Registry Control"
                                            : "Monitoring Command"}

                        </h1>

                    </div>


                    <div className="topbar-actions">

                        <div className="topbar-network">

                            <span className="status-dot" />

                            BASE

                            <strong>
                                {system.blockchain ||
                                    "SEPOLIA"}
                            </strong>

                        </div>


                        <div className="topbar-time">

                            <span>
                                LAST SYNC
                            </span>

                            <strong>
                                {lastUpdated
                                    ? lastUpdated.toLocaleTimeString()
                                    : "--:--:--"}
                            </strong>

                        </div>


                        <button
                            type="button"
                            className={
                                `command-refresh ${
                                    refreshing
                                        ? "refreshing"
                                        : ""
                                }`
                            }
                            onClick={() => {

                                fetchOverview();

                                if (
                                    workspace ===
                                    WORKSPACES.ACCOUNTS
                                ) {
                                    fetchUsers();
                                }

                                if (
                                    workspace ===
                                    WORKSPACES.FARMS
                                ) {
                                    fetchUsers();
                                    fetchFarms();
                                }

                                if (
                                    workspace ===
                                    WORKSPACES.ANIMALS
                                ) {
                                    fetchFarms();
                                    fetchAnimals();
                                }

                            }}
                            disabled={
                                refreshing ||
                                workspaceLoading
                            }
                        >

                            <span>
                                ↻
                            </span>

                            {refreshing
                                ? "Syncing"
                                : "Sync"}

                        </button>

                    </div>

                </header>


                {/* ==============================================================
                    ADMIN CONTENT
                ============================================================== */}

                <div className="admin-content">


                    {workspace ===
                        WORKSPACES.OVERVIEW && (

                        <OverviewWorkspace
                            system={system}
                            users={overviewUsers}
                            farms={farms}
                            animals={animals}
                            telemetry={telemetry}
                            alerts={alerts}
                            health={health}
                            ringRadius={ringRadius}
                            ringCircumference={
                                ringCircumference
                            }
                            ringOffset={
                                ringOffset
                            }
                            navigate={navigate}
                            fetchOverview={
                                fetchOverview
                            }
                        />

                    )}


                    {workspace ===
                        WORKSPACES.ACCOUNTS && (

                        <AccountsWorkspace
                            users={filteredUsers}
                            totalUsers={
                                users.length
                            }
                            search={userSearch}
                            setSearch={
                                setUserSearch
                            }
                            loading={
                                workspaceLoading
                            }
                            error={
                                workspaceError
                            }
                            onRetry={
                                fetchUsers
                            }
                            onCreate={
                                openCreateUser
                            }
                            onEdit={
                                openEditUser
                            }
                            onDelete={
                                deleteUser
                            }
                            deletingId={
                                deletingId
                            }
                        />

                    )}


                    {workspace ===
                        WORKSPACES.FARMS && (

                        <FarmsWorkspace
                            farms={
                                filteredFarms
                            }
                            users={users}
                            totalFarms={
                                farmsList.length
                            }
                            search={
                                farmSearch
                            }
                            setSearch={
                                setFarmSearch
                            }
                            loading={
                                workspaceLoading
                            }
                            error={
                                workspaceError
                            }
                            onRetry={
                                fetchFarms
                            }
                            onCreate={
                                openCreateFarm
                            }
                            onEdit={
                                openEditFarm
                            }
                            onDelete={
                                deleteFarm
                            }
                            deletingId={
                                deletingId
                            }
                        />

                    )}


                    {workspace ===
                        WORKSPACES.ANIMALS && (

                        <AnimalsWorkspace
                            animals={
                                filteredAnimals
                            }
                            farms={
                                farmsList
                            }
                            totalAnimals={
                                animalsList.length
                            }
                            search={
                                animalSearch
                            }
                            setSearch={
                                setAnimalSearch
                            }
                            loading={
                                workspaceLoading
                            }
                            error={
                                workspaceError
                            }
                            onRetry={
                                fetchAnimals
                            }
                            onCreate={
                                openCreateAnimal
                            }
                            onEdit={
                                openEditAnimal
                            }
                            onDelete={
                                deleteAnimal
                            }
                            deletingId={
                                deletingId
                            }
                        />

                    )}


                    {workspace ===
                        WORKSPACES.MONITORING && (

                        <MonitoringWorkspace
                            alerts={alerts}
                            telemetry={telemetry}
                            animals={animals}
                            health={health}
                            navigate={navigate}
                        />

                    )}

                </div>


                {/* ==============================================================
                    MODALS
                ============================================================== */}

                {showUserForm && (

                    <UserModal
                        editing={
                            editingUser
                        }
                        form={
                            userForm
                        }
                        saving={
                            saving
                        }
                        onChange={
                            handleUserChange
                        }
                        onSubmit={
                            submitUser
                        }
                        onClose={
                            closeUserForm
                        }
                    />

                )}


                {showFarmForm && (

                    <FarmModal
                        editing={
                            editingFarm
                        }
                        form={
                            farmForm
                        }
                        users={
                            users
                        }
                        saving={
                            saving
                        }
                        onChange={
                            handleFarmChange
                        }
                        onSubmit={
                            submitFarm
                        }
                        onClose={
                            closeFarmForm
                        }
                    />

                )}


                {showAnimalForm && (

                    <AnimalModal
                        editing={
                            editingAnimal
                        }
                        form={
                            animalForm
                        }
                        farms={
                            farmsList
                        }
                        saving={
                            saving
                        }
                        onChange={
                            handleAnimalChange
                        }
                        onSubmit={
                            submitAnimal
                        }
                        onClose={
                            closeAnimalForm
                        }
                    />

                )}


                {/* ==============================================================
                    FOOTER
                ============================================================== */}

                <footer className="admin-footer">

                    <span>
                        HERDSENSE AI / ADMINISTRATION
                    </span>

                    <span>
                        SECURE COMMAND ENVIRONMENT
                    </span>

                    <span>
                        © 2026
                    </span>

                </footer>

            </main>

        </div>
    );
}


/* ============================================================================
   OVERVIEW
   ============================================================================ */

function OverviewWorkspace({
    system,
    users,
    farms,
    animals,
    telemetry,
    alerts,
    health,
    ringRadius,
    ringCircumference,
    ringOffset,
    navigate,
}) {

    return (
        <>
            <section className="command-banner">

                <div className="banner-left">

                    <div className="banner-live">

                        <span className="status-dot" />

                        LIVE OPERATIONS

                    </div>

                    <h2>
                        Platform intelligence
                        <span>
                            at a glance.
                        </span>
                    </h2>

                    <p>
                        Real-time operational visibility
                        across the HerdSense AI network.
                    </p>

                </div>


                <div className="banner-metrics">

                    <div>
                        <span>
                            ENVIRONMENT
                        </span>

                        <strong>
                            {system.environment ||
                                "DEVELOPMENT"}
                        </strong>
                    </div>

                    <div>
                        <span>
                            VERSION
                        </span>

                        <strong>
                            v{system.version ||
                                "1.0.0"}
                        </strong>
                    </div>

                </div>

            </section>


            <section className="command-panel health-command-panel">

                <div className="command-panel-header">

                    <div>
                        <span>
                            SYSTEM HEALTH
                        </span>

                        <h2>
                            Operational integrity
                        </h2>
                    </div>

                    <div className="panel-live">
                        LIVE
                    </div>

                </div>


                <div className="health-command-body">

                    <div className="health-ring-wrapper">

                        <svg
                            className={
                                `health-ring health-${health.state}`
                            }
                            viewBox="0 0 220 220"
                        >

                            <circle
                                className="health-ring-track"
                                cx="110"
                                cy="110"
                                r={ringRadius}
                            />

                            <circle
                                className="health-ring-progress"
                                cx="110"
                                cy="110"
                                r={ringRadius}
                                strokeDasharray={
                                    ringCircumference
                                }
                                strokeDashoffset={
                                    ringOffset
                                }
                            />

                        </svg>


                        <div className="health-ring-center">

                            <strong>
                                {health.percentage}
                                <small>
                                    %
                                </small>
                            </strong>

                            <span>
                                HEALTH INDEX
                            </span>

                        </div>

                    </div>


                    <div className="health-command-summary">

                        <div className="health-command-status">

                            <span
                                className={
                                    `status-dot ${
                                        health.state
                                    }`
                                }
                            />

                            <strong>
                                {health.label}
                            </strong>

                        </div>

                        <p>
                            {health.description}
                        </p>


                        <div className="health-check-grid">

                            <HealthCheck
                                label="API"
                                value={
                                    system.api ===
                                    "healthy"
                                        ? "OPERATIONAL"
                                        : "OFFLINE"
                                }
                                healthy={
                                    system.api ===
                                    "healthy"
                                }
                            />

                            <HealthCheck
                                label="DATABASE"
                                value={
                                    system.database ===
                                    "healthy"
                                        ? "OPERATIONAL"
                                        : "OFFLINE"
                                }
                                healthy={
                                    system.database ===
                                    "healthy"
                                }
                            />

                            <HealthCheck
                                label="TELEMETRY"
                                value="STREAMING"
                                healthy
                            />

                            <HealthCheck
                                label="BASE NETWORK"
                                value={
                                    system.blockchain ||
                                    "CONNECTED"
                                }
                                healthy
                            />

                        </div>

                    </div>

                </div>

            </section>


            <section className="command-panel alerts-command-panel">

                <div className="command-panel-header">

                    <div>

                        <span>
                            ALERT CENTER
                        </span>

                        <h2>
                            Active incidents
                        </h2>

                    </div>

                    <button
                        type="button"
                        className="text-action"
                        onClick={() =>
                            navigate("/alerts")
                        }
                    >
                        Open center →
                    </button>

                </div>


                <div className="alert-command-total">

                    <strong>
                        {alerts.unresolved ?? 0}
                    </strong>

                    <span>
                        unresolved
                    </span>

                </div>


                <div className="alert-command-grid">

                    <AlertMetric
                        label="CRITICAL"
                        value={
                            alerts.critical ?? 0
                        }
                        type="critical"
                    />

                    <AlertMetric
                        label="WARNING"
                        value={
                            alerts.warning ?? 0
                        }
                        type="warning"
                    />

                    <AlertMetric
                        label="RESOLVED"
                        value={
                            alerts.resolved ?? 0
                        }
                        type="resolved"
                    />

                </div>

            </section>


            <KpiCard
                label="PLATFORM USERS"
                title="User population"
                value={
                    users.total ?? 0
                }
                description="Registered platform users"
                footerLeft="ADMINS"
                footerLeftValue={
                    users.admins ?? 0
                }
                footerRight="FARMERS"
                footerRightValue={
                    users.farmers ?? 0
                }
            />


            <KpiCard
                label="FARM NETWORK"
                title="Registered farms"
                value={
                    farms.total ?? 0
                }
                description="Connected farm operations"
                footerLeft="NETWORK"
                footerLeftValue="ACTIVE"
                footerRight="STATUS"
                footerRightValue="ONLINE"
            />


            <KpiCard
                label="TELEMETRY"
                title="Sensor intelligence"
                value={
                    telemetry.total_records ??
                    0
                }
                description="Telemetry records collected"
                footerLeft="PIPELINE"
                footerLeftValue="LIVE"
                footerRight="STREAM"
                footerRightValue="ACTIVE"
            />


            <KpiCard
                label="ANIMAL INTELLIGENCE"
                title="Monitored livestock"
                value={
                    animals.total ?? 0
                }
                description="Animals under active monitoring"
                footerLeft="HEALTHY"
                footerLeftValue={
                    animals.healthy ?? 0
                }
                footerRight="AT RISK"
                footerRightValue={
                    animals.at_risk ?? 0
                }
            />


            <section className="command-panel animal-health-panel">

                <div className="command-panel-header">

                    <div>

                        <span>
                            ANIMAL INTELLIGENCE
                        </span>

                        <h2>
                            Population health
                        </h2>

                    </div>

                    <button
                        type="button"
                        className="text-action"
                        onClick={() =>
                            navigate("/animals")
                        }
                    >
                        View animals →
                    </button>

                </div>


                <div className="population-health">

                    <div className="population-total">

                        <strong>
                            {animals.total ?? 0}
                        </strong>

                        <span>
                            monitored animals
                        </span>

                    </div>


                    <div className="population-bars">

                        <PopulationBar
                            label="Healthy"
                            value={
                                animals.healthy ?? 0
                            }
                            total={
                                animals.total ?? 0
                            }
                        />

                        <PopulationBar
                            label="At risk"
                            value={
                                animals.at_risk ?? 0
                            }
                            total={
                                animals.total ?? 0
                            }
                            risk
                        />

                    </div>

                </div>

            </section>


            <section className="command-panel infrastructure-panel">

                <div className="command-panel-header">

                    <div>

                        <span>
                            INFRASTRUCTURE
                        </span>

                        <h2>
                            Platform systems
                        </h2>

                    </div>

                </div>


                <div className="infrastructure-grid">

                    <Infrastructure
                        label="API"
                        value={
                            system.api ===
                            "healthy"
                                ? "HEALTHY"
                                : "OFFLINE"
                        }
                        healthy={
                            system.api ===
                            "healthy"
                        }
                    />

                    <Infrastructure
                        label="DATABASE"
                        value={
                            system.database ===
                            "healthy"
                                ? "HEALTHY"
                                : "OFFLINE"
                        }
                        healthy={
                            system.database ===
                            "healthy"
                        }
                    />

                    <Infrastructure
                        label="BASE"
                        value={
                            system.blockchain ||
                            "CONNECTED"
                        }
                        healthy
                    />

                    <Infrastructure
                        label="VERSION"
                        value={
                            system.version ||
                            "1.0.0"
                        }
                        healthy
                    />

                </div>

            </section>
        </>
    );
}


/* ============================================================================
   ACCOUNTS
   ============================================================================ */

function AccountsWorkspace({
    users,
    totalUsers,
    search,
    setSearch,
    loading,
    error,
    onRetry,
    onCreate,
    onEdit,
    onDelete,
    deletingId,
}) {

    return (
        <section className="workspace-panel">

            <WorkspaceHeader
                eyebrow="ACCOUNT CONTROL"
                title="Platform accounts"
                description="Review, correct and manage every registered HerdSense AI account."
                count={totalUsers}
                countLabel="accounts"
                actionLabel="+ New account"
                onAction={onCreate}
            />


            <WorkspaceToolbar
                value={search}
                onChange={setSearch}
                placeholder="Search by name, email, role or ID..."
            />


            {error && (
                <WorkspaceError
                    message={error}
                    onRetry={onRetry}
                />
            )}


            {loading ? (
                <WorkspaceLoading
                    label="Loading platform accounts..."
                />
            ) : (
                <div className="admin-table-wrap">

                    <table className="admin-table">

                        <thead>

                            <tr>
                                <th>ID</th>
                                <th>ACCOUNT</th>
                                <th>ROLE</th>
                                <th>VERIFICATION</th>
                                <th>WALLET</th>
                                <th>ACTIONS</th>
                            </tr>

                        </thead>


                        <tbody>

                            {users.length === 0 ? (

                                <EmptyTableRow
                                    colSpan={6}
                                    message="No platform accounts found."
                                />

                            ) : (

                                users.map(
                                    (user) => (

                                        <tr
                                            key={
                                                user.id
                                            }
                                        >

                                            <td>
                                                <span className="table-id">
                                                    #
                                                    {user.id}
                                                </span>
                                            </td>

                                            <td>

                                                <div className="table-primary">
                                                    {user.full_name ||
                                                        "Unnamed user"}
                                                </div>

                                                <div className="table-secondary">
                                                    {user.email}
                                                </div>

                                            </td>

                                            <td>
                                                <StatusBadge
                                                    label={
                                                        user.role ||
                                                        "farmer"
                                                    }
                                                    type={
                                                        user.role ===
                                                        "admin"
                                                            ? "green"
                                                            : "neutral"
                                                    }
                                                />
                                            </td>

                                            <td>
                                                <StatusBadge
                                                    label={
                                                        user.email_verified ??
                                                        user.is_email_verified
                                                            ? "VERIFIED"
                                                            : "UNVERIFIED"
                                                    }
                                                    type={
                                                        user.email_verified ??
                                                        user.is_email_verified
                                                            ? "green"
                                                            : "warning"
                                                    }
                                                />
                                            </td>

                                            <td>

                                                {user.wallet_address ? (

                                                    <div className="wallet-cell">

                                                        <span>
                                                            {shortAddress(
                                                                user.wallet_address
                                                            )}
                                                        </span>

                                                        <small>
                                                            {user.wallet_chain ||
                                                                "CONNECTED"}
                                                        </small>

                                                    </div>

                                                ) : (

                                                    <span className="muted-value">
                                                        Not linked
                                                    </span>

                                                )}

                                            </td>

                                            <td>

                                                <ActionGroup>

                                                    <button
                                                        type="button"
                                                        className="table-action"
                                                        onClick={() =>
                                                            onEdit(user)
                                                        }
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="table-action danger"
                                                        disabled={
                                                            deletingId ===
                                                            `user-${user.id}`
                                                        }
                                                        onClick={() =>
                                                            onDelete(user)
                                                        }
                                                    >
                                                        {deletingId ===
                                                        `user-${user.id}`
                                                            ? "..."
                                                            : "Delete"}
                                                    </button>

                                                </ActionGroup>

                                            </td>

                                        </tr>

                                    )
                                )

                            )}

                        </tbody>

                    </table>

                </div>
            )}

        </section>
    );
}


/* ============================================================================
   FARMS
   ============================================================================ */

function FarmsWorkspace({
    farms,
    users,
    totalFarms,
    search,
    setSearch,
    loading,
    error,
    onRetry,
    onCreate,
    onEdit,
    onDelete,
    deletingId,
}) {

    return (
        <section className="workspace-panel">

            <WorkspaceHeader
                eyebrow="FARM NETWORK CONTROL"
                title="Registered farms"
                description="Manage farm operations and their assigned platform owners."
                count={totalFarms}
                countLabel="farms"
                actionLabel="+ New farm"
                onAction={onCreate}
            />


            <WorkspaceToolbar
                value={search}
                onChange={setSearch}
                placeholder="Search farm name, location or ID..."
            />


            {error && (
                <WorkspaceError
                    message={error}
                    onRetry={onRetry}
                />
            )}


            {loading ? (
                <WorkspaceLoading
                    label="Loading farm network..."
                />
            ) : (
                <div className="admin-table-wrap">

                    <table className="admin-table">

                        <thead>

                            <tr>
                                <th>ID</th>
                                <th>FARM</th>
                                <th>OWNER</th>
                                <th>LOCATION</th>
                                <th>COORDINATES</th>
                                <th>ACTIONS</th>
                            </tr>

                        </thead>


                        <tbody>

                            {farms.length === 0 ? (

                                <EmptyTableRow
                                    colSpan={6}
                                    message="No farms found."
                                />

                            ) : (

                                farms.map(
                                    (farm) => {

                                        const owner =
                                            users.find(
                                                (user) =>
                                                    Number(
                                                        user.id
                                                    ) ===
                                                    Number(
                                                        farm.owner_id
                                                    )
                                            );

                                        return (
                                            <tr
                                                key={
                                                    farm.id
                                                }
                                            >

                                                <td>
                                                    <span className="table-id">
                                                        #
                                                        {farm.id}
                                                    </span>
                                                </td>

                                                <td>

                                                    <div className="table-primary">
                                                        {farm.name}
                                                    </div>

                                                    <div className="table-secondary">
                                                        Farm operation
                                                    </div>

                                                </td>

                                                <td>

                                                    <div className="table-primary">
                                                        {owner?.full_name ||
                                                            farm.owner_name ||
                                                            `User #${farm.owner_id}`}
                                                    </div>

                                                    <div className="table-secondary">
                                                        {owner?.email ||
                                                            "Assigned farmer"}
                                                    </div>

                                                </td>

                                                <td>
                                                    <span className="table-secondary strong">
                                                        {farm.location}
                                                    </span>
                                                </td>

                                                <td>

                                                    {farm.latitude != null &&
                                                    farm.longitude != null ? (

                                                        <div className="coordinate-cell">

                                                            <span>
                                                                {Number(
                                                                    farm.latitude
                                                                ).toFixed(5)}
                                                            </span>

                                                            <span>
                                                                {Number(
                                                                    farm.longitude
                                                                ).toFixed(5)}
                                                            </span>

                                                        </div>

                                                    ) : (

                                                        <span className="muted-value">
                                                            Not mapped
                                                        </span>

                                                    )}

                                                </td>

                                                <td>

                                                    <ActionGroup>

                                                        <button
                                                            type="button"
                                                            className="table-action"
                                                            onClick={() =>
                                                                onEdit(farm)
                                                            }
                                                        >
                                                            Edit
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="table-action danger"
                                                            disabled={
                                                                deletingId ===
                                                                `farm-${farm.id}`
                                                            }
                                                            onClick={() =>
                                                                onDelete(farm)
                                                            }
                                                        >
                                                            {deletingId ===
                                                            `farm-${farm.id}`
                                                                ? "..."
                                                                : "Delete"}
                                                        </button>

                                                    </ActionGroup>

                                                </td>

                                            </tr>
                                        );

                                    }
                                )

                            )}

                        </tbody>

                    </table>

                </div>
            )}

        </section>
    );
}


/* ============================================================================
   ANIMALS
   ============================================================================ */

function AnimalsWorkspace({
    animals,
    farms,
    totalAnimals,
    search,
    setSearch,
    loading,
    error,
    onRetry,
    onCreate,
    onEdit,
    onDelete,
    deletingId,
}) {

    return (
        <section className="workspace-panel">

            <WorkspaceHeader
                eyebrow="ANIMAL REGISTRY CONTROL"
                title="Livestock registry"
                description="Correct animal identity, health and farm assignment records."
                count={totalAnimals}
                countLabel="animals"
                actionLabel="+ Register animal"
                onAction={onCreate}
            />


            <WorkspaceToolbar
                value={search}
                onChange={setSearch}
                placeholder="Search tag, name, species, health status or ID..."
            />


            {error && (
                <WorkspaceError
                    message={error}
                    onRetry={onRetry}
                />
            )}


            {loading ? (
                <WorkspaceLoading
                    label="Loading animal registry..."
                />
            ) : (
                <div className="admin-table-wrap">

                    <table className="admin-table">

                        <thead>

                            <tr>
                                <th>ID / TAG</th>
                                <th>ANIMAL</th>
                                <th>SPECIES</th>
                                <th>HEALTH</th>
                                <th>FARM</th>
                                <th>TELEMETRY</th>
                                <th>ACTIONS</th>
                            </tr>

                        </thead>


                        <tbody>

                            {animals.length === 0 ? (

                                <EmptyTableRow
                                    colSpan={7}
                                    message="No animals found."
                                />

                            ) : (

                                animals.map(
                                    (animal) => {

                                        const farm =
                                            farms.find(
                                                (item) =>
                                                    Number(
                                                        item.id
                                                    ) ===
                                                    Number(
                                                        animal.farm_id
                                                    )
                                            );

                                        const healthType =
                                            String(
                                                animal.health_status ||
                                                ""
                                            )
                                                .toLowerCase()
                                                .includes(
                                                    "risk"
                                                )
                                                ? "warning"
                                                : String(
                                                    animal.health_status ||
                                                    ""
                                                )
                                                    .toLowerCase()
                                                    .includes(
                                                        "critical"
                                                    )
                                                    ? "danger"
                                                    : "green";

                                        return (
                                            <tr
                                                key={
                                                    animal.id
                                                }
                                            >

                                                <td>

                                                    <div className="table-primary">
                                                        #
                                                        {animal.id}
                                                    </div>

                                                    <div className="table-secondary mono">
                                                        {animal.tag_id}
                                                    </div>

                                                </td>

                                                <td>

                                                    <div className="table-primary">
                                                        {animal.name}
                                                    </div>

                                                    <div className="table-secondary">
                                                        {animal.gender ||
                                                            "Gender unspecified"}
                                                    </div>

                                                </td>

                                                <td>

                                                    <div className="table-primary">
                                                        {animal.species}
                                                    </div>

                                                    <div className="table-secondary">
                                                        {animal.breed ||
                                                            "Breed not specified"}
                                                    </div>

                                                </td>

                                                <td>
                                                    <StatusBadge
                                                        label={
                                                            animal.health_status ||
                                                            "Unknown"
                                                        }
                                                        type={
                                                            healthType
                                                        }
                                                    />
                                                </td>

                                                <td>

                                                    <div className="table-primary">
                                                        {farm?.name ||
                                                            animal.farm_name ||
                                                            `Farm #${animal.farm_id}`}
                                                    </div>

                                                    <div className="table-secondary">
                                                        {farm?.location ||
                                                            ""}
                                                    </div>

                                                </td>

                                                <td>

                                                    <div className="telemetry-cell">

                                                        <span>
                                                            {animal.temperature != null
                                                                ? `${animal.temperature}°`
                                                                : "—"}
                                                        </span>

                                                        <small>
                                                            {animal.latitude != null &&
                                                            animal.longitude != null
                                                                ? "GPS READY"
                                                                : "NO GPS"}
                                                        </small>

                                                    </div>

                                                </td>

                                                <td>

                                                    <ActionGroup>

                                                        <button
                                                            type="button"
                                                            className="table-action"
                                                            onClick={() =>
                                                                onEdit(animal)
                                                            }
                                                        >
                                                            Correct
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="table-action danger"
                                                            disabled={
                                                                deletingId ===
                                                                `animal-${animal.id}`
                                                            }
                                                            onClick={() =>
                                                                onDelete(animal)
                                                            }
                                                        >
                                                            {deletingId ===
                                                            `animal-${animal.id}`
                                                                ? "..."
                                                                : "Delete"}
                                                        </button>

                                                    </ActionGroup>

                                                </td>

                                            </tr>
                                        );

                                    }
                                )

                            )}

                        </tbody>

                    </table>

                </div>
            )}

        </section>
    );
}


/* ============================================================================
   MONITORING
   ============================================================================ */

function MonitoringWorkspace({
    alerts,
    telemetry,
    animals,
    health,
    navigate,
}) {

    return (
        <>
            <section className="command-banner monitoring-banner">

                <div className="banner-left">

                    <div className="banner-live">

                        <span className="status-dot" />

                        LIVE MONITORING

                    </div>

                    <h2>
                        Operational telemetry
                        <span>
                            across the network.
                        </span>
                    </h2>

                    <p>
                        Monitor livestock intelligence,
                        telemetry flow and active incidents
                        from one administrative control plane.
                    </p>

                </div>


                <div className="banner-metrics">

                    <div>
                        <span>
                            HEALTH INDEX
                        </span>

                        <strong>
                            {health.percentage}%
                        </strong>
                    </div>

                    <div>
                        <span>
                            TELEMETRY RECORDS
                        </span>

                        <strong>
                            {telemetry.total_records ??
                                0}
                        </strong>
                    </div>

                </div>

            </section>


            <section className="monitoring-grid">

                <MonitoringCard
                    eyebrow="TELEMETRY"
                    title="Live telemetry stream"
                    value={
                        telemetry.total_records ??
                        0
                    }
                    description="Telemetry records currently represented in the platform."
                    action="Open telemetry"
                    onClick={() =>
                        navigate("/telemetry")
                    }
                />

                <MonitoringCard
                    eyebrow="ALERT CENTER"
                    title="Active incidents"
                    value={
                        alerts.unresolved ??
                        0
                    }
                    description="Unresolved incidents requiring operational attention."
                    action="Open alerts"
                    onClick={() =>
                        navigate("/alerts")
                    }
                    danger={
                        Number(
                            alerts.unresolved || 0
                        ) > 0
                    }
                />

                <MonitoringCard
                    eyebrow="GEO INTELLIGENCE"
                    title="Animal map"
                    value={
                        animals.total ??
                        0
                    }
                    description="Animals currently represented within the intelligence network."
                    action="Open map"
                    onClick={() =>
                        navigate("/map")
                    }
                />

            </section>


            <section className="command-panel monitoring-summary-panel">

                <div className="command-panel-header">

                    <div>

                        <span>
                            COMMAND STATUS
                        </span>

                        <h2>
                            Monitoring readiness
                        </h2>

                    </div>

                    <div className="panel-live">
                        LIVE
                    </div>

                </div>


                <div className="monitoring-readiness">

                    <div className="readiness-metric">

                        <span>
                            PLATFORM HEALTH
                        </span>

                        <strong>
                            {health.label}
                        </strong>

                    </div>

                    <div className="readiness-metric">

                        <span>
                            TELEMETRY PIPELINE
                        </span>

                        <strong className="healthy">
                            ACTIVE
                        </strong>

                    </div>

                    <div className="readiness-metric">

                        <span>
                            ALERT PIPELINE
                        </span>

                        <strong
                            className={
                                Number(
                                    alerts.unresolved ||
                                    0
                                ) > 0
                                    ? "warning"
                                    : "healthy"
                            }
                        >
                            {Number(
                                alerts.unresolved ||
                                0
                            ) > 0
                                ? "ATTENTION"
                                : "CLEAR"}
                        </strong>

                    </div>

                </div>

            </section>
        </>
    );
}


/* ============================================================================
   WORKSPACE HEADER
   ============================================================================ */

function WorkspaceHeader({
    eyebrow,
    title,
    description,
    count,
    countLabel,
    actionLabel,
    onAction,
}) {

    return (
        <div className="workspace-header">

            <div>

                <span className="workspace-eyebrow">
                    {eyebrow}
                </span>

                <h2>
                    {title}
                </h2>

                <p>
                    {description}
                </p>

            </div>


            <div className="workspace-header-actions">

                <div className="workspace-count">

                    <strong>
                        {count}
                    </strong>

                    <span>
                        {countLabel}
                    </span>

                </div>


                <button
                    type="button"
                    className="workspace-primary-action"
                    onClick={onAction}
                >
                    {actionLabel}
                </button>

            </div>

        </div>
    );
}


/* ============================================================================
   TOOLBAR
   ============================================================================ */

function WorkspaceToolbar({
    value,
    onChange,
    placeholder,
}) {

    return (
        <div className="workspace-toolbar">

            <div className="workspace-search">

                <span>
                    ⌕
                </span>

                <input
                    type="search"
                    value={value}
                    onChange={(event) =>
                        onChange(
                            event.target.value
                        )
                    }
                    placeholder={
                        placeholder
                    }
                />

            </div>

        </div>
    );
}


/* ============================================================================
   WORKSPACE STATES
   ============================================================================ */

function WorkspaceLoading({
    label,
}) {

    return (
        <div className="workspace-state">

            <div className="command-loader" />

            <span>
                {label}
            </span>

        </div>
    );
}


function WorkspaceError({
    message,
    onRetry,
}) {

    return (
        <div className="workspace-error">

            <span>
                !
            </span>

            <div>

                <strong>
                    Command operation failed
                </strong>

                <p>
                    {message}
                </p>

            </div>

            <button
                type="button"
                onClick={onRetry}
            >
                Retry
            </button>

        </div>
    );
}


function EmptyTableRow({
    colSpan,
    message,
}) {

    return (
        <tr>

            <td
                colSpan={colSpan}
                className="empty-table-cell"
            >
                {message}
            </td>

        </tr>
    );
}


/* ============================================================================
   TABLE COMPONENTS
   ============================================================================ */

function StatusBadge({
    label,
    type = "neutral",
}) {

    return (
        <span
            className={
                `admin-status-badge ${type}`
            }
        >
            <i />
            {label}
        </span>
    );
}


function ActionGroup({
    children,
}) {

    return (
        <div className="table-actions">
            {children}
        </div>
    );
}


function shortAddress(
    address
) {

    if (!address) {
        return "—";
    }

    if (address.length <= 14) {
        return address;
    }

    return `${address.slice(0, 6)}…${address.slice(-5)}`;
}


/* ============================================================================
   USER MODAL
   ============================================================================ */

function UserModal({
    editing,
    form,
    saving,
    onChange,
    onSubmit,
    onClose,
}) {

    return (
        <ModalShell
            title={
                editing
                    ? "Edit platform account"
                    : "Create platform account"
            }
            eyebrow="ACCOUNT CONTROL"
            onClose={onClose}
            saving={saving}
        >

            <form
                className="admin-form"
                onSubmit={onSubmit}
            >

                <FormField
                    label="FULL NAME"
                    name="full_name"
                    value={
                        form.full_name
                    }
                    onChange={
                        onChange
                    }
                    placeholder="Full name"
                    required
                />

                <FormField
                    label="EMAIL"
                    name="email"
                    type="email"
                    value={
                        form.email
                    }
                    onChange={
                        onChange
                    }
                    placeholder="name@example.com"
                    required
                />

                <FormField
                    label={
                        editing
                            ? "NEW PASSWORD (OPTIONAL)"
                            : "PASSWORD"
                    }
                    name="password"
                    type="password"
                    value={
                        form.password
                    }
                    onChange={
                        onChange
                    }
                    placeholder={
                        editing
                            ? "Leave blank to keep current password"
                            : "Secure account password"
                    }
                    required={!editing}
                />


                <div className="form-grid">

                    <FormSelect
                        label="ROLE"
                        name="role"
                        value={
                            form.role
                        }
                        onChange={
                            onChange
                        }
                        options={[
                            {
                                value: "farmer",
                                label: "Farmer",
                            },
                            {
                                value: "admin",
                                label: "Administrator",
                            },
                        ]}
                    />

                    <FormField
                        label="WALLET CHAIN"
                        name="wallet_chain"
                        value={
                            form.wallet_chain
                        }
                        onChange={
                            onChange
                        }
                        placeholder="Base"
                    />

                </div>


                <FormField
                    label="WALLET ADDRESS"
                    name="wallet_address"
                    value={
                        form.wallet_address
                    }
                    onChange={
                        onChange
                    }
                    placeholder="0x..."
                />


                <label className="form-checkbox">

                    <input
                        type="checkbox"
                        name="email_verified"
                        checked={
                            Boolean(
                                form.email_verified
                            )
                        }
                        onChange={
                            onChange
                        }
                    />

                    <span>
                        Mark email as verified
                    </span>

                </label>


                <ModalActions
                    saving={saving}
                    onClose={onClose}
                    submitLabel={
                        editing
                            ? "Save account"
                            : "Create account"
                    }
                />

            </form>

        </ModalShell>
    );
}


/* ============================================================================
   FARM MODAL
   ============================================================================ */

function FarmModal({
    editing,
    form,
    users,
    saving,
    onChange,
    onSubmit,
    onClose,
}) {

    const farmers =
        users.filter(
            (user) =>
                user.role ===
                "farmer"
        );


    return (
        <ModalShell
            title={
                editing
                    ? "Edit farm"
                    : "Register farm"
            }
            eyebrow="FARM NETWORK CONTROL"
            onClose={onClose}
            saving={saving}
        >

            <form
                className="admin-form"
                onSubmit={onSubmit}
            >

                <FormField
                    label="FARM NAME"
                    name="name"
                    value={
                        form.name
                    }
                    onChange={
                        onChange
                    }
                    placeholder="Farm name"
                    required
                />

                <FormField
                    label="LOCATION"
                    name="location"
                    value={
                        form.location
                    }
                    onChange={
                        onChange
                    }
                    placeholder="Farm location"
                    required
                />


                <FormSelect
                    label="FARM OWNER"
                    name="owner_id"
                    value={
                        form.owner_id
                    }
                    onChange={
                        onChange
                    }
                    required
                    options={[
                        {
                            value: "",
                            label: "Select farmer",
                        },
                        ...farmers.map(
                            (farmer) => ({
                                value:
                                    farmer.id,
                                label:
                                    `${farmer.full_name || farmer.email} — ${farmer.email}`,
                            })
                        ),
                    ]}
                />


                <div className="form-grid">

                    <FormField
                        label="LATITUDE"
                        name="latitude"
                        type="number"
                        step="any"
                        value={
                            form.latitude
                        }
                        onChange={
                            onChange
                        }
                        placeholder="6.5244"
                    />

                    <FormField
                        label="LONGITUDE"
                        name="longitude"
                        type="number"
                        step="any"
                        value={
                            form.longitude
                        }
                        onChange={
                            onChange
                        }
                        placeholder="3.3792"
                    />

                </div>


                <ModalActions
                    saving={saving}
                    onClose={onClose}
                    submitLabel={
                        editing
                            ? "Save farm"
                            : "Register farm"
                    }
                />

            </form>

        </ModalShell>
    );
}


/* ============================================================================
   ANIMAL MODAL
   ============================================================================ */

function AnimalModal({
    editing,
    form,
    farms,
    saving,
    onChange,
    onSubmit,
    onClose,
}) {

    return (
        <ModalShell
            title={
                editing
                    ? "Correct animal record"
                    : "Register animal"
            }
            eyebrow="ANIMAL REGISTRY CONTROL"
            onClose={onClose}
            saving={saving}
        >

            <form
                className="admin-form"
                onSubmit={onSubmit}
            >

                <div className="form-grid">

                    <FormField
                        label="TAG ID"
                        name="tag_id"
                        value={
                            form.tag_id
                        }
                        onChange={
                            onChange
                        }
                        placeholder="HS-001"
                        required
                    />

                    <FormField
                        label="ANIMAL NAME"
                        name="name"
                        value={
                            form.name
                        }
                        onChange={
                            onChange
                        }
                        placeholder="Bella"
                        required
                    />

                </div>


                <div className="form-grid">

                    <FormField
                        label="SPECIES"
                        name="species"
                        value={
                            form.species
                        }
                        onChange={
                            onChange
                        }
                        placeholder="Cattle"
                        required
                    />

                    <FormField
                        label="BREED"
                        name="breed"
                        value={
                            form.breed
                        }
                        onChange={
                            onChange
                        }
                        placeholder="Breed"
                    />

                </div>


                <div className="form-grid">

                    <FormField
                        label="GENDER"
                        name="gender"
                        value={
                            form.gender
                        }
                        onChange={
                            onChange
                        }
                        placeholder="Female"
                        required
                    />

                    <FormSelect
                        label="HEALTH STATUS"
                        name="health_status"
                        value={
                            form.health_status
                        }
                        onChange={
                            onChange
                        }
                        options={[
                            {
                                value: "Healthy",
                                label: "Healthy",
                            },
                            {
                                value: "At Risk",
                                label: "At Risk",
                            },
                            {
                                value: "Critical",
                                label: "Critical",
                            },
                        ]}
                    />

                </div>


                <FormSelect
                    label="ASSIGNED FARM"
                    name="farm_id"
                    value={
                        form.farm_id
                    }
                    onChange={
                        onChange
                    }
                    required
                    options={[
                        {
                            value: "",
                            label: "Select farm",
                        },
                        ...farms.map(
                            (farm) => ({
                                value:
                                    farm.id,
                                label:
                                    `${farm.name} — ${farm.location}`,
                            })
                        ),
                    ]}
                />


                <div className="form-grid">

                    <FormField
                        label="AGE"
                        name="age"
                        type="number"
                        min="0"
                        value={
                            form.age
                        }
                        onChange={
                            onChange
                        }
                        placeholder="24"
                    />

                    <FormField
                        label="WEIGHT"
                        name="weight"
                        type="number"
                        min="0"
                        step="any"
                        value={
                            form.weight
                        }
                        onChange={
                            onChange
                        }
                        placeholder="450"
                    />

                </div>


                <FormField
                    label="TEMPERATURE °C"
                    name="temperature"
                    type="number"
                    step="0.1"
                    value={
                        form.temperature
                    }
                    onChange={
                        onChange
                    }
                    placeholder="38.5"
                />


                <div className="form-grid">

                    <FormField
                        label="LATITUDE"
                        name="latitude"
                        type="number"
                        step="any"
                        value={
                            form.latitude
                        }
                        onChange={
                            onChange
                        }
                        placeholder="6.5244"
                    />

                    <FormField
                        label="LONGITUDE"
                        name="longitude"
                        type="number"
                        step="any"
                        value={
                            form.longitude
                        }
                        onChange={
                            onChange
                        }
                        placeholder="3.3792"
                    />

                </div>


                <ModalActions
                    saving={saving}
                    onClose={onClose}
                    submitLabel={
                        editing
                            ? "Save correction"
                            : "Register animal"
                    }
                />

            </form>

        </ModalShell>
    );
}


/* ============================================================================
   MODAL PRIMITIVES
   ============================================================================ */

function ModalShell({
    eyebrow,
    title,
    children,
    onClose,
    saving,
}) {

    return (
        <div className="admin-modal-backdrop">

            <div
                className="admin-modal"
                role="dialog"
                aria-modal="true"
            >

                <div className="admin-modal-header">

                    <div>

                        <span>
                            {eyebrow}
                        </span>

                        <h2>
                            {title}
                        </h2>

                    </div>

                    <button
                        type="button"
                        className="modal-close"
                        onClick={onClose}
                        disabled={saving}
                    >
                        ×
                    </button>

                </div>


                <div className="admin-modal-body">
                    {children}
                </div>

            </div>

        </div>
    );
}


function ModalActions({
    saving,
    onClose,
    submitLabel,
}) {

    return (
        <div className="modal-actions">

            <button
                type="button"
                className="modal-secondary"
                onClick={onClose}
                disabled={saving}
            >
                Cancel
            </button>

            <button
                type="submit"
                className="modal-primary"
                disabled={saving}
            >
                {saving
                    ? "Saving..."
                    : submitLabel}
            </button>

        </div>
    );
}


/* ============================================================================
   FORM COMPONENTS
   ============================================================================ */

function FormField({
    label,
    name,
    value,
    onChange,
    type = "text",
    placeholder,
    required = false,
    min,
    step,
}) {

    return (
        <label className="form-field">

            <span>
                {label}
            </span>

            <input
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                min={min}
                step={step}
                autoComplete="off"
            />

        </label>
    );
}


function FormSelect({
    label,
    name,
    value,
    onChange,
    options,
    required = false,
}) {

    return (
        <label className="form-field">

            <span>
                {label}
            </span>

            <select
                name={name}
                value={value}
                onChange={onChange}
                required={required}
            >

                {options.map(
                    (option) => (

                        <option
                            key={
                                String(
                                    option.value
                                )
                            }
                            value={
                                option.value
                            }
                        >
                            {option.label}
                        </option>

                    )
                )}

            </select>

        </label>
    );
}


/* ============================================================================
   MONITORING CARD
   ============================================================================ */

function MonitoringCard({
    eyebrow,
    title,
    value,
    description,
    action,
    onClick,
    danger = false,
}) {

    return (
        <section
            className={
                `command-panel monitoring-card ${
                    danger
                        ? "danger-card"
                        : ""
                }`
            }
        >

            <div className="monitoring-card-eyebrow">
                {eyebrow}
            </div>

            <h2>
                {title}
            </h2>

            <strong className="monitoring-card-value">
                {value}
            </strong>

            <p>
                {description}
            </p>

            <button
                type="button"
                className="text-action"
                onClick={onClick}
            >
                {action} →
            </button>

        </section>
    );
}


/* ============================================================================
   HEALTH CHECK
   ============================================================================ */

function HealthCheck({
    label,
    value,
    healthy,
}) {

    return (
        <div className="health-check">

            <span>
                {label}
            </span>

            <strong
                className={
                    healthy
                        ? "healthy"
                        : "offline"
                }
            >

                <i
                    className={
                        healthy
                            ? "healthy"
                            : "offline"
                    }
                />

                {value}

            </strong>

        </div>
    );
}


/* ============================================================================
   ALERT METRIC
   ============================================================================ */

function AlertMetric({
    label,
    value,
    type,
}) {

    return (
        <div
            className={
                `alert-metric ${type}`
            }
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


/* ============================================================================
   KPI CARD
   ============================================================================ */

function KpiCard({
    label,
    title,
    value,
    description,
    footerLeft,
    footerLeftValue,
    footerRight,
    footerRightValue,
}) {

    return (
        <section className="command-panel kpi-command-panel">

            <div className="command-panel-header">

                <div>

                    <span>
                        {label}
                    </span>

                    <h2>
                        {title}
                    </h2>

                </div>

            </div>


            <div className="kpi-value">
                {value}
            </div>

            <p className="kpi-description">
                {description}
            </p>


            <div className="kpi-footer">

                <div>

                    <span>
                        {footerLeft}
                    </span>

                    <strong>
                        {footerLeftValue}
                    </strong>

                </div>

                <div>

                    <span>
                        {footerRight}
                    </span>

                    <strong>
                        {footerRightValue}
                    </strong>

                </div>

            </div>

        </section>
    );
}


/* ============================================================================
   POPULATION BAR
   ============================================================================ */

function PopulationBar({
    label,
    value,
    total,
    risk = false,
}) {

    const percentage =
        total > 0
            ? Math.min(
                100,
                Math.round(
                    (value / total) *
                    100
                )
            )
            : 0;


    return (
        <div className="population-row">

            <div className="population-row-header">

                <span>
                    {label}
                </span>

                <strong>
                    {value}
                </strong>

            </div>


            <div
                className={
                    `population-track ${
                        risk
                            ? "risk"
                            : ""
                    }`
                }
            >

                <span
                    style={{
                        width:
                            `${percentage}%`,
                    }}
                />

            </div>


            <small>
                {percentage}% of population
            </small>

        </div>
    );
}


/* ============================================================================
   INFRASTRUCTURE
   ============================================================================ */

function Infrastructure({
    label,
    value,
    healthy,
}) {

    return (
        <div className="infrastructure-item">

            <div className="infrastructure-label">

                <span
                    className={
                        `status-dot ${
                            healthy
                                ? "healthy"
                                : "critical"
                        }`
                    }
                />

                {label}

            </div>

            <strong
                className={
                    healthy
                        ? "healthy"
                        : "offline"
                }
            >
                {value}
            </strong>

        </div>
    );
}