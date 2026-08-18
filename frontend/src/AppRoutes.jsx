import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Alerts from "./pages/Alerts";
import Animals from "./pages/Animals";
import AnimalRegistration from "./pages/AnimalRegistration";
import AnimalIntelligence from "./pages/AnimalIntelligence";
import ManualTelemetry from "./pages/ManualTelemetry";
import Telemetry from "./pages/Telemetry";
import Map from "./pages/Map";

import HealthAnalytics from "./pages/HealthAnalytics";
import DiseasePrediction from "./pages/DiseasePrediction";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

import AdminDashboard from "./pages/AdminDashboard";


/* ==========================================================================
   PROTECTED ROUTE
   ========================================================================== */

function ProtectedRoute({ children }) {
    const token = localStorage.getItem("access_token");

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


/* ==========================================================================
   ADMIN ROUTE
   ========================================================================== */

function AdminRoute({ children }) {
    const token = localStorage.getItem("access_token");

    if (!token) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    /*
     * The backend remains the authoritative security layer.
     *
     * We also check the locally stored user object here so that
     * ordinary farmers do not even enter the admin interface.
     */

    let user = null;

    try {
        const storedUser = localStorage.getItem("user");

        if (storedUser) {
            user = JSON.parse(storedUser);
        }
    } catch {
        user = null;
    }

    if (!user || user.role !== "admin") {
        return (
            <Navigate
                to="/dashboard"
                replace
            />
        );
    }

    return children;
}


/* ==========================================================================
   APPLICATION ROUTES
   ========================================================================== */

export default function AppRoutes() {
    return (
        <Routes>

            {/* ==================================================================
                AUTHENTICATION
            ================================================================== */}

            <Route
                path="/login"
                element={<Login />}
            />


            {/* ==================================================================
                FARMER COMMAND CENTER
            ================================================================== */}

            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />


            {/* ==================================================================
                OPERATIONS
            ================================================================== */}

            <Route
                path="/animals"
                element={
                    <ProtectedRoute>
                        <Animals />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/animals/register"
                element={
                    <ProtectedRoute>
                        <AnimalRegistration />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/telemetry"
                element={
                    <ProtectedRoute>
                        <Telemetry />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/manual-telemetry"
                element={
                    <ProtectedRoute>
                        <ManualTelemetry />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/map"
                element={
                    <ProtectedRoute>
                        <Map />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/alerts"
                element={
                    <ProtectedRoute>
                        <Alerts />
                    </ProtectedRoute>
                }
            />


            {/* ==================================================================
                ANIMAL INTELLIGENCE
            ================================================================== */}

            <Route
                path="/animals/:id"
                element={
                    <ProtectedRoute>
                        <AnimalIntelligence />
                    </ProtectedRoute>
                }
            />


            {/* ==================================================================
                INTELLIGENCE
            ================================================================== */}

            <Route
                path="/analytics"
                element={
                    <ProtectedRoute>
                        <HealthAnalytics />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/prediction"
                element={
                    <ProtectedRoute>
                        <DiseasePrediction />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/reports"
                element={
                    <ProtectedRoute>
                        <Reports />
                    </ProtectedRoute>
                }
            />


            {/* ==================================================================
                SYSTEM
            ================================================================== */}

            <Route
                path="/settings"
                element={
                    <ProtectedRoute>
                        <Settings />
                    </ProtectedRoute>
                }
            />


            {/* ==================================================================
                ADMIN CONTROL ROOM
            ================================================================== */}

            <Route
                path="/admin"
                element={
                    <AdminRoute>
                        <AdminDashboard />
                    </AdminRoute>
                }
            />


            {/* ==================================================================
                ROOT
            ================================================================== */}

            <Route
                path="/"
                element={
                    <Navigate
                        to="/dashboard"
                        replace
                    />
                }
            />


            {/* ==================================================================
                UNKNOWN ROUTES
            ================================================================== */}

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