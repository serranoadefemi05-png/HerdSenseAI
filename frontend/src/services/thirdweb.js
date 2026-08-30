import { createThirdwebClient } from "thirdweb";
import { inAppWallet } from "thirdweb/wallets";

const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

if (!clientId) {
    console.warn(
        "VITE_THIRDWEB_CLIENT_ID is not configured."
    );
}

export const thirdwebClient = createThirdwebClient({
    clientId,
});


/* ============================================================================
   HERDSENSE AI IN-APP WALLET
============================================================================ */

export const herdSenseWallet = inAppWallet({
    auth: {
        options: [
            "email",
            "google",
            "passkey",
        ],
    },

    metadata: {
        name: "HerdSense AI",
    },
});