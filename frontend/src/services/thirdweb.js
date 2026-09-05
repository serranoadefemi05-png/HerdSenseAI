import { createThirdwebClient } from "thirdweb";
import { inAppWallet } from "thirdweb/wallets";


/* ============================================================================
   HERDSENSE AI
   THIRDWEB CONFIGURATION
============================================================================ */

const clientId =
    import.meta.env.VITE_THIRDWEB_CLIENT_ID;


/*
 * Thirdweb is an optional Web3 subsystem.
 *
 * The main HerdSense AI application must continue to function
 * if the Thirdweb client ID is unavailable.
 */

export const thirdwebClient = clientId
    ? createThirdwebClient({
        clientId,
    })
    : null;


export const isThirdwebConfigured =
    Boolean(clientId);


/* ============================================================================
   HERDSENSE AI INDIVIDUAL IN-APP WALLET
============================================================================ */

/*
 * This wallet is NOT the HerdSense platform / treasury wallet.
 *
 * Thirdweb manages the user's wallet credentials.
 *
 * HerdSense stores only the resulting PUBLIC wallet address
 * against the authenticated farmer account.
 *
 * Supported creation/authentication methods:
 *
 * - Passkey
 * - Google
 * - Email
 *
 * Each Thirdweb in-app wallet is scoped to the Thirdweb client.
 */

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

    /*
     * Do not expose private-key export in the normal wallet UI.
     *
     * The HerdSense backend should never receive or store
     * private keys.
     */

    hidePrivateKeyExport: true,

});