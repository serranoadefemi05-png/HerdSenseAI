import {
    Navigate,
    Route,
    Routes,
} from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Alerts from "./pages/Alerts";
import Animals from "./pages/Animals";
import AnimalIntelligence from "./pages/AnimalIntelligence";


/* ============================================================
   PROTECTED ROUTE
============================================================ */

function ProtectedRoute({ children }) {
    const token =
        localStorage.getItem("access_token");

    if (!token) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    return children;
}


/* ============================================================
   APPLICATION ROUTES
============================================================ */

export default function AppRoutes() {
    return (
        <Routes>

            {/* =====================================================
                LOGIN
            ===================================================== */}

            <Route
                path="/login"
                element={<Login />}
            />


            {/* =====================================================
                DASHBOARD
            ===================================================== */}

            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />


            {/* =====================================================
                ALERTS
            ===================================================== */}

            <Route
                path="/alerts"
                element={
                    <ProtectedRoute>
                        <Alerts />
                    </ProtectedRoute>
                }
            />


            {/* =====================================================
                ANIMALS REGISTRY
            ===================================================== */}

            <Route
                path="/animals"
                element={
                    <ProtectedRoute>
                        <Animals />
                    </ProtectedRoute>
                }
            />


            {/* =====================================================
                ANIMAL INTELLIGENCE

                Example:
                /animals/4
                /animals/1
                /animals/2
            ===================================================== */}

            <Route
                path="/animals/:id"
                element={
                    <ProtectedRoute>
                        <AnimalIntelligence />
                    </ProtectedRoute>
                }
            />


            {/* =====================================================
                DEFAULT
            ===================================================== */}

            <Route
                path="/"
                element={
                    <Navigate
                        to="/dashboard"
                        replace
                    />
                }
            />


            {/* =====================================================
                UNKNOWN ROUTES
            ===================================================== */}

            <Route
                path="*"
                element={
                    <Navigate
                        to="/dashboard"
                        replace
                    />
                }
            />

        </Routes>
    );
}