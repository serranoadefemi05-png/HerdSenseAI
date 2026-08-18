import axios from "axios";

/*
 * HerdSense AI API Configuration
 *
 * Development:
 * VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
 *
 * Production:
 * VITE_API_BASE_URL=https://your-production-api-domain/api/v1
 */

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000/api/v1";


const api = axios.create({
    baseURL: API_BASE_URL,

    headers: {
        "Content-Type": "application/json",
    },
});


// ==================================================
// REQUEST INTERCEPTOR
// ==================================================

api.interceptors.request.use(
    (config) => {
        const token =
            localStorage.getItem("access_token");

        if (token) {
            config.headers.Authorization =
                `Bearer ${token}`;
        }

        return config;
    },

    (error) => {
        return Promise.reject(error);
    }
);


// ==================================================
// RESPONSE INTERCEPTOR
// ==================================================

api.interceptors.response.use(
    (response) => {
        return response;
    },

    (error) => {

        if (error.response?.status === 401) {

            console.warn(
                "Authentication expired or invalid."
            );

            localStorage.removeItem(
                "access_token"
            );

            localStorage.removeItem(
                "token"
            );

            window.location.href =
                "/login";
        }

        return Promise.reject(error);
    }
);


export default api;