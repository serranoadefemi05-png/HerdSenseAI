import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";

export default function DashboardLayout({ children }) {
    return (
        <div
            style={{
                display: "flex",
                minHeight: "100vh",
                background: "#f3f4f6"
            }}
        >
            <Sidebar />

            <div
                style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column"
                }}
            >
                <Topbar />

                <main
                    style={{
                        flex: 1,
                        padding: "30px"
                    }}
                >
                    {children}
                </main>
            </div>
        </div>
    );
}