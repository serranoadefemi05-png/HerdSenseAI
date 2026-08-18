import { useEffect, useState } from "react";
import api from "../api/api";

export default function Farms() {
    const [farms, setFarms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        name: "",
        location: "",
        latitude: "",
        longitude: ""
    });

    const fetchFarms = async () => {
        try {
            setLoading(true);

            const response = await api.get("/farms/");

            setFarms(response.data);
            setError("");
        } catch (err) {
            console.error("Failed to fetch farms:", err);

            if (err.response?.data?.detail) {
                setError(err.response.data.detail);
            } else {
                setError("Unable to load farms.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFarms();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setSaving(true);
            setError("");

            await api.post("/farms/", {
                name: form.name,
                location: form.location,
                latitude: Number(form.latitude),
                longitude: Number(form.longitude)
            });

            setForm({
                name: "",
                location: "",
                latitude: "",
                longitude: ""
            });

            setShowForm(false);

            await fetchFarms();
        } catch (err) {
            console.error("Failed to create farm:", err);

            if (err.response?.data?.detail) {
                setError(err.response.data.detail);
            } else {
                setError("Failed to create farm.");
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            style={{
                padding: 40,
                background: "#f3f4f6",
                minHeight: "100vh"
            }}
        >
            {/* HEADER */}

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 30
                }}
            >
                <div>
                    <h1 style={{ margin: 0 }}>
                        🌾 Farms
                    </h1>

                    <p style={{ color: "#6b7280" }}>
                        Manage farms connected to HerdSense AI
                    </p>
                </div>

                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        background: "#16a34a",
                        color: "white",
                        border: "none",
                        borderRadius: 10,
                        padding: "12px 20px",
                        cursor: "pointer",
                        fontWeight: "bold"
                    }}
                >
                    {showForm ? "Close Form" : "+ Add Farm"}
                </button>
            </div>

            {/* ERROR */}

            {error && (
                <div
                    style={{
                        background: "#fee2e2",
                        color: "#991b1b",
                        padding: 15,
                        borderRadius: 10,
                        marginBottom: 20
                    }}
                >
                    {error}
                </div>
            )}

            {/* ADD FARM FORM */}

            {showForm && (
                <form
                    onSubmit={handleSubmit}
                    style={{
                        background: "white",
                        padding: 25,
                        borderRadius: 16,
                        marginBottom: 30,
                        boxShadow:
                            "0 4px 12px rgba(0,0,0,0.08)"
                    }}
                >
                    <h2>Register New Farm</h2>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: 20
                        }}
                    >
                        <input
                            name="name"
                            placeholder="Farm name"
                            value={form.name}
                            onChange={handleChange}
                            required
                            style={inputStyle}
                        />

                        <input
                            name="location"
                            placeholder="Farm location"
                            value={form.location}
                            onChange={handleChange}
                            required
                            style={inputStyle}
                        />

                        <input
                            name="latitude"
                            type="number"
                            step="any"
                            placeholder="Latitude"
                            value={form.latitude}
                            onChange={handleChange}
                            required
                            style={inputStyle}
                        />

                        <input
                            name="longitude"
                            type="number"
                            step="any"
                            placeholder="Longitude"
                            value={form.longitude}
                            onChange={handleChange}
                            required
                            style={inputStyle}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        style={{
                            marginTop: 25,
                            background: "#2563eb",
                            color: "white",
                            border: "none",
                            borderRadius: 10,
                            padding: "12px 25px",
                            cursor: "pointer",
                            fontWeight: "bold"
                        }}
                    >
                        {saving
                            ? "Creating..."
                            : "Create Farm"}
                    </button>
                </form>
            )}

            {/* FARM LIST */}

            <div
                style={{
                    background: "white",
                    borderRadius: 16,
                    padding: 20,
                    boxShadow:
                        "0 4px 12px rgba(0,0,0,0.08)",
                    overflowX: "auto"
                }}
            >
                <h2>Registered Farms</h2>

                {loading ? (
                    <p>Loading farms...</p>
                ) : farms.length === 0 ? (
                    <p>No farms registered yet.</p>
                ) : (
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse"
                        }}
                    >
                        <thead>
                            <tr
                                style={{
                                    textAlign: "left",
                                    borderBottom:
                                        "2px solid #e5e7eb"
                                }}
                            >
                                <th style={{ padding: 12 }}>
                                    ID
                                </th>

                                <th style={{ padding: 12 }}>
                                    Farm Name
                                </th>

                                <th style={{ padding: 12 }}>
                                    Location
                                </th>

                                <th style={{ padding: 12 }}>
                                    Latitude
                                </th>

                                <th style={{ padding: 12 }}>
                                    Longitude
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {farms.map((farm) => (
                                <tr
                                    key={farm.id}
                                    style={{
                                        borderBottom:
                                            "1px solid #e5e7eb"
                                    }}
                                >
                                    <td style={{ padding: 12 }}>
                                        {farm.id}
                                    </td>

                                    <td style={{ padding: 12 }}>
                                        <strong>
                                            {farm.name}
                                        </strong>
                                    </td>

                                    <td style={{ padding: 12 }}>
                                        {farm.location}
                                    </td>

                                    <td style={{ padding: 12 }}>
                                        {farm.latitude}
                                    </td>

                                    <td style={{ padding: 12 }}>
                                        {farm.longitude}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

const inputStyle = {
    padding: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "15px",
    width: "100%",
    boxSizing: "border-box"
};