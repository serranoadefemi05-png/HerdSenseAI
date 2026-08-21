/*
|--------------------------------------------------------------------------
| HERDSENSE AI — API CLIENT
|--------------------------------------------------------------------------
| Production-safe Axios client.
|
| Local:
|   http://127.0.0.1:8000/api/v1
|
| Production:
|   https://herdsenseai.onrender.com/api/v1
|--------------------------------------------------------------------------
*/

import axios from "axios";

/* ==========================================================================
   ENVIRONMENT
========================================================================== */

const DEFAULT_LOCAL_API =
    "http://127.0.0.1:8000/api/v1";

const DEFAULT_PRODUCTION_API =
    "https://herdsenseai.onrender.com/api/v1";

const isProduction =
    import.meta.env.PROD === true;

const configuredApiUrl =
    import.meta.env.VITE_API_BASE_URL;

/*
 * Vite exposes environment variables at build time.
 *
 * If VITE_API_BASE_URL exists, use it.
 *
 * Otherwise:
 * - production → Render backend
 * - development → local FastAPI
 */

const API_BASE_URL =
    configuredApiUrl?.trim()
        ? configuredApiUrl.trim().replace(/\/+$/, "")
        : isProduction
        ? DEFAULT_PRODUCTION_API
        : DEFAULT_LOCAL_API;

/* ==========================================================================
   AXIOS INSTANCE
========================================================================== */

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,

    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

/* ==========================================================================
   REQUEST INTERCEPTOR
========================================================================== */

api.interceptors.request.use(
    (config) => {
        const token =
            localStorage.getItem(
                "access_token"
            );

        if (token) {
            config.headers =
                config.headers || {};

            config.headers.Authorization =
                `Bearer ${token}`;
        }

        console.log(
            "[HerdSense AI API]",
            config.method?.toUpperCase(),
            `${API_BASE_URL}${config.url || ""}`
        );

        return config;
    },

    (error) => {
        return Promise.reject(error);
    }
);

/* ==========================================================================
   RESPONSE INTERCEPTOR
========================================================================== */

api.interceptors.response.use(
    (response) => {
        console.log(
            "[HerdSense AI API]",
            response.status,
            response.config?.url
        );

        return response;
    },

    (error) => {
        const status =
            error?.response?.status;

        const url =
            error?.config?.url;

        console.error(
            "[HerdSense AI API ERROR]",
            {
                status,
                url,
                message:
                    error?.message,
                response:
                    error?.response?.data,
            }
        );

        /*
         * Do not automatically delete the token here.
         *
         * Individual pages/authentication flows
         * decide how to handle 401 responses.
         */

        return Promise.reject(error);
    }
);

/* ==========================================================================
   EXPORT
========================================================================== */

export default api;

export {
    API_BASE_URL,
};