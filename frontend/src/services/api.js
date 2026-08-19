import axios from "axios";


const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    "http://127.0.0.1:8000/api/v1";


const api = axios.create({
    baseURL: API_BASE_URL,

    headers: {
        "Content-Type": "application/json",
    },

    timeout: 15000,
});


/* ============================================================================
   REQUEST INTERCEPTOR
   ============================================================================ */

api.interceptors.request.use(
    (config) => {

        const token =
            localStorage.getItem("access_token");

        if (token) {
            config.headers.Authorization =
                `Bearer ${token}`;
        }

        console.log(
            "[HerdSense AI API]",
            config.method?.toUpperCase(),
            `${config.baseURL}${config.url}`
        );

        return config;
    },

    (error) => {
        return Promise.reject(error);
    }
);


/* ============================================================================
   RESPONSE INTERCEPTOR
   ============================================================================ */

api.interceptors.response.use(

    (response) => {

        return response;
    },

    (error) => {

        if (!error.response) {

            console.error(
                "[HerdSense AI API] Network error.",
                {
                    message: error.message,
                    url: error.config?.url,
                    baseURL: error.config?.baseURL,
                }
            );

        }

        else if (error.response.status === 401) {

            console.warn(
                "[HerdSense AI API] Unauthorized request."
            );

        }

        else if (error.response.status === 403) {

            console.warn(
                "[HerdSense AI API] Forbidden request."
            );

        }

        return Promise.reject(error);
    }
);


export default api;