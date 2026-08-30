import { createThirdwebClient } from "thirdweb";

const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

/*
 * Thirdweb must never crash the entire HerdSense AI
 * application when its configuration is unavailable.
 */

export const thirdwebClient = clientId
    ? createThirdwebClient({
        clientId,
    })
    : null;

export const isThirdwebConfigured = Boolean(clientId);
