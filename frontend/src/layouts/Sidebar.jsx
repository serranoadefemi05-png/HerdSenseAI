import { Link } from "react-router-dom";

export default function Sidebar() {
    const linkStyle = {
        display: "block",
        color: "white",
        textDecoration: "none",
        padding: "12px 0",
        fontSize: "16px"
    };

    return (
        <aside
            style={{
                width: "250px",
                background: "#111827",
                color: "white",
                padding: "20px",
                minHeight: "100vh"
            }}
        >
            <h2 style={{ marginBottom: "30px" }}>
                HerdSense AI
            </h2>

            <nav>
                <Link to="/dashboard" style={linkStyle}>Dashboard</Link>
                <Link to="/animals" style={linkStyle}>Animals</Link>
                <Link to="/farms" style={linkStyle}>Farms</Link>
                <Link to="/telemetry" style={linkStyle}>Telemetry</Link>
                <Link to="/alerts" style={linkStyle}>Alerts</Link>
                <Link to="/settings" style={linkStyle}>Settings</Link>
            </nav>
        </aside>
    );
}