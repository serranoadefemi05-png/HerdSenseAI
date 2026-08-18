export default function StatCard({
    title,
    value,
    color
}) {
    return (
        <div
            style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "20px",
                minWidth: "220px",
                flex: 1,
                boxShadow: "0 4px 10px rgba(0,0,0,0.08)"
            }}
        >
            <h4
                style={{
                    color: "#6b7280",
                    marginBottom: "12px"
                }}
            >
                {title}
            </h4>

            <h1
                style={{
                    color: color,
                    margin: 0,
                    fontSize: "40px"
                }}
            >
                {value}
            </h1>
        </div>
    );
}