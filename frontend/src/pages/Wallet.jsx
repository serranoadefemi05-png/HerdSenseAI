import { useEffect, useState } from "react";

import {
    ConnectButton,
    useActiveAccount,
    useActiveWalletChain,
} from "thirdweb/react";

import { base } from "thirdweb/chains";

import {
    thirdwebClient,
} from "../services/thirdweb";

import api from "../services/api";

import AppShell from "../components/AppShell";

import "./Wallet.css";


/* ============================================================================
   HERDSENSE AI
   WALLET PAGE

   Scope:
   - Thirdweb wallet connection
   - Base network
   - Save connected wallet to authenticated HerdSense account
   - Load previously saved wallet
   - Disconnect wallet

   IMPORTANT:
   - Thirdweb is treated as an optional Web3 subsystem.
   - A missing Thirdweb client ID must NEVER crash the entire application.
   - Authentication, dashboard, telemetry and other application features
     must remain available even when Web3 is unavailable.

   NOT INCLUDED:
   - Subscriptions
   - Payments
   - Private keys
   - Seed phrases
============================================================================ */


export default function Wallet() {

    const account = useActiveAccount();

    const activeChain = useActiveWalletChain();

    const [savedWallet, setSavedWallet] = useState(null);

    const [loading, setLoading] = useState(true);

    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");

    const [success, setSuccess] = useState("");


    /* ========================================================================
       LOAD WALLET FROM HERDSENSE BACKEND
    ======================================================================== */

    useEffect(() => {

        let mounted = true;

        async function loadWallet() {

            try {

                setLoading(true);

                setError("");

                const response = await api.get("/wallet");

                if (!mounted) {
                    return;
                }

                setSavedWallet(
                    response.data?.wallet_address || null
                );

            } catch (err) {

                if (!mounted) {
                    return;
                }

                console.error(
                    "[Wallet] Failed to load wallet:",
                    err
                );

                setError(
                    err?.response?.data?.detail ||
                    "Unable to load your wallet information."
                );

            } finally {

                if (mounted) {
                    setLoading(false);
                }

            }
        }

        loadWallet();

        return () => {
            mounted = false;
        };

    }, []);


    /* ========================================================================
       SAVE CONNECTED THIRDWEB WALLET
    ======================================================================== */

    useEffect(() => {

        /*
         * If Thirdweb is unavailable or there is no connected wallet,
         * there is nothing to save.
         */

        if (!thirdwebClient || !account?.address) {
            return;
        }


        let mounted = true;


        async function saveWallet() {

            try {

                setSaving(true);

                setError("");

                setSuccess("");


                /*
                 * HerdSense currently supports Base.
                 *
                 * Send the canonical chain identifier rather than trusting
                 * arbitrary frontend text.
                 */

                const walletChain =
                    activeChain?.id === base.id
                        ? "base"
                        : String(
                            activeChain?.id ||
                            base.id
                        );


                const response = await api.post(
                    "/wallet/connect",
                    {
                        wallet_address:
                            account.address,

                        wallet_chain:
                            walletChain,
                    }
                );


                if (!mounted) {
                    return;
                }


                setSavedWallet(
                    response.data?.wallet_address ||
                    account.address
                );


                setSuccess(
                    "Wallet connected to your HerdSense AI account."
                );

            } catch (err) {

                if (!mounted) {
                    return;
                }

                console.error(
                    "[Wallet] Failed to save wallet:",
                    err
                );

                setError(
                    err?.response?.data?.detail ||
                    "Wallet connected, but HerdSense could not save it."
                );

            } finally {

                if (mounted) {
                    setSaving(false);
                }

            }
        }


        /*
         * Save whenever the connected address or active chain changes.
         */

        saveWallet();


        return () => {
            mounted = false;
        };

    }, [
        account?.address,
        activeChain?.id,
    ]);


    /* ========================================================================
       DISCONNECT WALLET FROM HERDSENSE ACCOUNT
    ======================================================================== */

    async function disconnectFromHerdSense() {

        try {

            setError("");

            setSuccess("");

            await api.delete("/wallet");

            setSavedWallet(null);

            setSuccess(
                "Wallet removed from your HerdSense AI account."
            );

        } catch (err) {

            console.error(
                "[Wallet] Failed to disconnect wallet:",
                err
            );

            setError(
                err?.response?.data?.detail ||
                "Unable to remove the wallet from your account."
            );
        }
    }


    /* ========================================================================
       FORMAT ADDRESS
    ======================================================================== */

    function formatAddress(address) {

        if (!address) {
            return "";
        }

        if (address.length <= 12) {
            return address;
        }

        return `${address.slice(
            0,
            6
        )}...${address.slice(-6)}`;
    }


    /* ========================================================================
       RENDER
    ======================================================================== */

    return (

        <AppShell>

            <main className="wallet-page">

                {/* ============================================================
                    HEADER
                ============================================================ */}

                <header className="wallet-header">

                    <div>

                        <span className="wallet-eyebrow">
                            HERDSENSE AI
                        </span>

                        <h1>
                            Wallet
                        </h1>

                        <p>
                            Connect your Web3 wallet to
                            your HerdSense AI account.
                        </p>

                    </div>

                </header>


                {/* ============================================================
                    WALLET PANEL
                ============================================================ */}

                <section className="wallet-panel">

                    <div className="wallet-panel-icon">
                        ◉
                    </div>


                    <span className="wallet-label">
                        WALLET CONNECTION
                    </span>


                    <h2>

                        {account
                            ? "Wallet connected"
                            : savedWallet
                            ? "Wallet linked"
                            : "Connect your wallet"}

                    </h2>


                    <p>
                        Connect a compatible Web3 wallet
                        to use HerdSense AI's blockchain
                        features on Base.
                    </p>


                    {/* ========================================================
                        LOADING STATUS
                    ======================================================== */}

                    {loading && (

                        <div className="wallet-status">

                            Loading wallet information...

                        </div>

                    )}


                    {/* ========================================================
                        SAVING STATUS
                    ======================================================== */}

                    {saving && (

                        <div className="wallet-status">

                            Saving wallet to your HerdSense
                            account...

                        </div>

                    )}


                    {/* ========================================================
                        SUCCESS STATUS
                    ======================================================== */}

                    {success && (

                        <div className="wallet-status wallet-success">

                            {success}

                        </div>

                    )}


                    {/* ========================================================
                        ERROR STATUS
                    ======================================================== */}

                    {error && (

                        <div className="wallet-status wallet-error">

                            {error}

                        </div>

                    )}


                    {/* ========================================================
                        THIRDWEB CONNECT BUTTON
                    ======================================================== */}

                    {thirdwebClient ? (

                        <ConnectButton
                            client={thirdwebClient}
                            chains={[base]}
                            connectModal={{
                                size: "wide",
                                title: "HerdSense AI Wallet",
                                showThirdwebBranding: false,
                            }}
                        />

                    ) : (

                        <div className="wallet-status wallet-error">

                            Web3 wallet connection is
                            temporarily unavailable.
                            Please try again later.

                        </div>

                    )}


                    {/* ========================================================
                        ACTIVE WALLET
                    ======================================================== */}

                    {account?.address && (

                        <div className="wallet-address">

                            <span>
                                CONNECTED WALLET
                            </span>

                            <strong>
                                {formatAddress(
                                    account.address
                                )}
                            </strong>

                        </div>

                    )}


                    {/* ========================================================
                        SAVED WALLET
                    ======================================================== */}

                    {!account?.address &&
                        savedWallet && (

                        <div className="wallet-address">

                            <span>
                                SAVED WALLET
                            </span>

                            <strong>
                                {formatAddress(
                                    savedWallet
                                )}
                            </strong>

                        </div>

                    )}


                    {/* ========================================================
                        DISCONNECT FROM HERDSENSE
                    ======================================================== */}

                    {savedWallet && (

                        <button
                            type="button"
                            className="wallet-disconnect"
                            onClick={
                                disconnectFromHerdSense
                            }
                        >
                            Remove wallet from account
                        </button>

                    )}

                </section>

            </main>

        </AppShell>

    );
}