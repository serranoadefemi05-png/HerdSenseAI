import { createThirdwebClient } from "thirdweb";
import { inAppWallet } from "thirdweb/wallets";

const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

/*
 * Thirdweb is an optional Web3 subsystem.
 *
 * The main HerdSense AI application must continue to load
 * even when the Thirdweb client ID is unavailable.
 */

export const thirdwebClient = clientId
    ? createThirdwebClient({
        clientId,
    })
    : null;

export const isThirdwebConfigured = Boolean(clientId);


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
