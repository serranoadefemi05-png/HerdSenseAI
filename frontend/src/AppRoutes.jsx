import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";

import Dashboard from "./pages/Dashboard";
import Alerts from "./pages/Alerts";

import Animals from "./pages/Animals";
import AnimalRegistration from "./pages/AnimalRegistration";
import AnimalIntelligence from "./pages/AnimalIntelligence";
import AnimalVerification from "./pages/AnimalVerification";

import ManualTelemetry from "./pages/ManualTelemetry";
import Telemetry from "./pages/Telemetry";

import Map from "./pages/Map";

import HealthAnalytics from "./pages/HealthAnalytics";
import DiseasePrediction from "./pages/DiseasePrediction";

import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

import AdminDashboard from "./pages/AdminDashboard";


/* ============================================================================
   PROTECTED ROUTE
============================================================================ */

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


/* ============================================================================
   ADMIN ROUTE
============================================================================ */

function AdminRoute({ children }) {
    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("user_role");

    if (!token) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    if (role !== "admin") {
        return (
            <Navigate
                to="/dashboard"
                replace
            />
        );
    }

    return children;
}


/* ============================================================================
   APPLICATION ROUTES
============================================================================ */

export default function AppRoutes() {
    return (
        <Routes>

            {/* =================================================================
                PUBLIC ROUTES
            ================================================================= */}

            <Route
                path="/login"
                element={<Login />}
            />


            {/* =================================================================
                PUBLIC BLOCKCHAIN ANIMAL VERIFICATION

                Example:
                    /verify/animal/8
            ================================================================= */}

            <Route
                path="/verify/animal/:id"
                element={
                    <AnimalVerification />
                }
            />


            {/* =================================================================
                ADMIN COMMAND CENTER
            ================================================================= */}

            <Route
                path="/admin"
                element={
                    <AdminRoute>
                        <AdminDashboard />
                    </AdminRoute>
                }
            />


            {/* =================================================================
                FARMER COMMAND CENTER
            ================================================================= */}

            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />


            {/* =================================================================
                ANIMAL OPERATIONS
            ================================================================= */}

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

            {/* -----------------------------------------------------------------
                PRIMARY ANIMAL INTELLIGENCE ROUTE

                Example:
                    /animals/8
            ----------------------------------------------------------------- */}

            <Route
                path="/animals/:id"
                element={
                    <ProtectedRoute>
                        <AnimalIntelligence />
                    </ProtectedRoute>
                }
            />

            {/* -----------------------------------------------------------------
                DEDICATED ANIMAL INTELLIGENCE ROUTE

                Example:
                    /animals/8/intelligence

                This intentionally renders the same production
                AnimalIntelligence interface.
            ----------------------------------------------------------------- */}

            <Route
                path="/animals/:id/intelligence"
                element={
                    <ProtectedRoute>
                        <AnimalIntelligence />
                    </ProtectedRoute>
                }
            />


            {/* =================================================================
                TELEMETRY
            ================================================================= */}

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


            {/* =================================================================
                LOCATION & MONITORING
            ================================================================= */}

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


            {/* =================================================================
                INTELLIGENCE
            ================================================================= */}

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


            {/* =================================================================
                REPORTING
            ================================================================= */}

            <Route
                path="/reports"
                element={
                    <ProtectedRoute>
                        <Reports />
                    </ProtectedRoute>
                }
            />


            {/* =================================================================
                SYSTEM
            ================================================================= */}

            <Route
                path="/settings"
                element={
                    <ProtectedRoute>
                        <Settings />
                    </ProtectedRoute>
                }
            />


            {/* =================================================================
                ROOT ROUTE
            ================================================================= */}

            <Route
                path="/"
                element={
                    <Navigate
                        to="/dashboard"
                        replace
                    />
                }
            />


            {/* =================================================================
                UNKNOWN ROUTES
            ================================================================= */}

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