import { createThirdwebClient } from "thirdweb";

const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

if (!clientId) {
    console.warn(
        "HerdSense AI: VITE_THIRDWEB_CLIENT_ID is not configured."
    );
}

export const thirdwebClient = createThirdwebClient({
    clientId,
});