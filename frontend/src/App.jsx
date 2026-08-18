import AppRoutes from "./AppRoutes";
import { LiveDataProvider } from "./context/LiveDataContext";

export default function App() {
    return (
        <LiveDataProvider>
            <AppRoutes />
        </LiveDataProvider>
    );
}