import axios from "axios";

/*
 * ============================================================
 * HERDSENSE AI API
 * ============================================================
 *
 * Development:
 * http://127.0.0.1:8000/api/v1
 *
 * Production:
 * https://herdsenseai.onrender.com/api/v1
 */

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000/api/v1";


console.log(
    "[HerdSense AI] API Base URL:",
    API_BASE_URL
);


/*
 * ============================================================
 * AXIOS INSTANCE
 * ============================================================
 */

const api = axios.create({
    baseURL: API_BASE_URL,

    timeout: 15000,

    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});


/*
 * ============================================================
 * REQUEST INTERCEPTOR
 * ============================================================
 */

api.interceptors.request.use(
    (config) => {

        const token =
            localStorage.getItem("access_token");

        if (token) {
            config.headers = {
                ...config.headers,

                Authorization:
                    `Bearer ${token}`,
            };
        }

        console.log(
            "[HerdSense AI API]",
            config.method?.toUpperCase(),
            `${config.baseURL}${config.url}`
        );

        return config;
    },

    (error) => {

        console.error(
            "[HerdSense AI API] Request error:",
            error
        );

        return Promise.reject(error);
    }
);


/*
 * ============================================================
 * RESPONSE INTERCEPTOR
 * ============================================================
 */

api.interceptors.response.use(

    (response) => {

        console.log(
            "[HerdSense AI API]",
            response.status,
            response.config.url
        );

        return response;
    },

    (error) => {

        if (!error.response) {

            console.error(
                "[HerdSense AI API] Network error.",
                {
                    message: error.message,
                    baseURL: error.config?.baseURL,
                    url: error.config?.url,
                }
            );

            return Promise.reject(error);
        }


        if (
            error.response.status === 401
        ) {

            console.warn(
                "[HerdSense AI API] Authentication expired or invalid."
            );

            localStorage.removeItem(
                "access_token"
            );

            localStorage.removeItem(
                "token"
            );

            localStorage.removeItem(
                "herdsense_user"
            );

            localStorage.removeItem(
                "user_role"
            );

            window.location.href =
                "/login";
        }


        return Promise.reject(error);
    }
);


export default api;