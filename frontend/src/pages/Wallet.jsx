import { useEffect, useMemo, useState } from "react";

import {
    ConnectButton,
    useActiveAccount,
    useActiveWalletChain,
    useConnect,
} from "thirdweb/react";

import { base } from "thirdweb/chains";

import { thirdwebClient, herdSenseWallet } from "../services/thirdweb";

import api from "../services/api";

import AppShell from "../components/AppShell";

import "./Wallet.css";


/* ============================================================================
   HERDSENSE AI
   WALLET COMMAND CENTER

   Wallet architecture:

   - Every authenticated HerdSense account owns its own wallet association.
   - Thirdweb in-app wallets can be created directly from this page.
   - Existing external wallets can also be connected.
   - HerdSense stores ONLY the public wallet address.
   - Private keys are never sent to or stored by HerdSense.
   - Platform / treasury wallets are separate from farmer wallets.
============================================================================ */


export default function Wallet() {

    const account = useActiveAccount();

    const activeChain = useActiveWalletChain();

    const { connect } = useConnect();

    const [savedWallet, setSavedWallet] = useState(null);

    const [loading, setLoading] = useState(true);

    const [creating, setCreating] = useState(false);

    const [saving, setSaving] = useState(false);

    const [disconnecting, setDisconnecting] = useState(false);

    const [copied, setCopied] = useState(false);

    const [error, setError] = useState("");

    const [success, setSuccess] = useState("");

    const [showCreateOptions, setShowCreateOptions] = useState(false);


    /* ========================================================================
       DERIVED STATE
    ======================================================================== */

    const connectedAddress = account?.address || null;

    const displayAddress =
        connectedAddress ||
        savedWallet ||
        null;

    const isConnected = Boolean(connectedAddress);

    const isBaseNetwork =
        !activeChain ||
        activeChain.id === base.id;

    const connectionState = isConnected
        ? isBaseNetwork
            ? "CONNECTED"
            : "WRONG NETWORK"
        : savedWallet
        ? "LINKED"
        : "NOT CONNECTED";


    const shortConnectedAddress = useMemo(
        () => formatAddress(connectedAddress),
        [connectedAddress]
    );


    /* ========================================================================
       LOAD FARMER WALLET FROM HERDSENSE BACKEND
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

                if (
                    err?.response?.status === 401
                ) {

                    localStorage.removeItem(
                        "access_token"
                    );

                    localStorage.removeItem(
                        "token"
                    );

                    localStorage.removeItem(
                        "user_role"
                    );

                    localStorage.removeItem(
                        "herdsense_user"
                    );

                    window.location.href = "/login";

                    return;
                }

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
       SAVE ACTIVE WALLET TO AUTHENTICATED HERDSENSE ACCOUNT
    ======================================================================== */

    useEffect(() => {

        if (
            !thirdwebClient ||
            !account?.address
        ) {
            return;
        }

        let mounted = true;

        async function saveWallet() {

            try {

                setSaving(true);

                setError("");

                setSuccess("");

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
                    "Your wallet is now linked to this HerdSense AI account."
                );

                setShowCreateOptions(false);

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

        saveWallet();

        return () => {
            mounted = false;
        };

    }, [
        account?.address,
        activeChain?.id,
    ]);


    /* ========================================================================
       CREATE HERDSENSE IN-APP WALLET
    ======================================================================== */

    async function createHerdSenseWallet(
        strategy
    ) {

        if (!thirdwebClient) {

            setError(
                "Wallet creation is currently unavailable."
            );

            return;
        }

        try {

            setCreating(true);

            setError("");

            setSuccess("");

            /*
             * Thirdweb in-app wallets are managed by Thirdweb.
             *
             * HerdSense never receives or stores the private key.
             *
             * The resulting public address is subsequently persisted
             * against the currently authenticated HerdSense account.
             */

            await connect(async () => {

                await herdSenseWallet.connect({
                    client: thirdwebClient,
                    chain: base,
                    strategy,
                    ...(strategy === "passkey"
                        ? {
                            type: "sign-up",
                        }
                        : {}),
                });

                return herdSenseWallet;
            });

            setSuccess(
                "Your individual HerdSense wallet has been created. Finalizing your account link..."
            );

        } catch (err) {

            console.error(
                "[Wallet] Failed to create in-app wallet:",
                err
            );

            const message =
                err?.message ||
                err?.response?.data?.detail ||
                "";

            if (
                message
                    .toLowerCase()
                    .includes("cancel")
            ) {

                setError(
                    "Wallet creation was cancelled."
                );

            } else {

                setError(
                    message ||
                    "Unable to create your HerdSense wallet."
                );

            }

        } finally {

            setCreating(false);
        }
    }


    /* ========================================================================
       REMOVE WALLET FROM HERDSENSE ACCOUNT
    ======================================================================== */

    async function disconnectFromHerdSense() {

        try {

            setDisconnecting(true);

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

        } finally {

            setDisconnecting(false);
        }
    }


    /* ========================================================================
       COPY WALLET ADDRESS
    ======================================================================== */

    async function copyAddress() {

        if (!displayAddress) {
            return;
        }

        try {

            await navigator.clipboard.writeText(
                displayAddress
            );

            setCopied(true);

            window.setTimeout(() => {
                setCopied(false);
            }, 1800);

        } catch (err) {

            console.error(
                "[Wallet] Failed to copy address:",
                err
            );
        }
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

                    <div className="wallet-header-copy">

                        <div className="wallet-title-row">

                            <span className="wallet-eyebrow">
                                WEB3 ACCOUNT
                            </span>

                            <span
                                className={
                                    `wallet-header-status ${
                                        isConnected &&
                                        isBaseNetwork
                                            ? "is-connected"
                                            : ""
                                    }`
                                }
                            >

                                <span className="wallet-status-dot" />

                                {connectionState}

                            </span>

                        </div>

                        <h1>
                            Wallet
                        </h1>

                        <p>
                            Create or connect your individual
                            blockchain wallet and associate it
                            securely with your HerdSense AI account.
                        </p>

                    </div>


                    <div className="wallet-network-badge">

                        <span className="network-indicator" />

                        <div>

                            <small>
                                NETWORK
                            </small>

                            <strong>
                                Base
                            </strong>

                        </div>

                    </div>

                </header>


                {/* ============================================================
                    MAIN GRID
                ============================================================ */}

                <section className="wallet-grid">


                    {/* ========================================================
                        PRIMARY WALLET CARD
                    ======================================================== */}

                    <article className="wallet-card wallet-primary-card">

                        <div className="wallet-card-top">

                            <div className="wallet-symbol">
                                <span>
                                    ◈
                                </span>
                            </div>

                            <div>

                                <span className="wallet-label">
                                    YOUR WALLET
                                </span>

                                <h2>

                                    {isConnected
                                        ? "Wallet connected"
                                        : savedWallet
                                        ? "Wallet linked"
                                        : "Create your wallet"
                                    }

                                </h2>

                            </div>

                        </div>


                        <p className="wallet-card-description">

                            {isConnected
                                ? isBaseNetwork
                                    ? "Your individual wallet is connected to HerdSense AI and ready for Base."
                                    : "Your wallet is connected, but it is currently on a network other than Base."
                                : savedWallet
                                ? "This wallet belongs to your HerdSense AI account. Reconnect it to access the active blockchain session."
                                : "Create an individual HerdSense wallet or connect an existing wallet. Your wallet belongs to your account, not to the HerdSense platform."
                            }

                        </p>


                        {/* ====================================================
                            NO WALLET STATE
                        ==================================================== */}

                        {!displayAddress && !loading && (

                            <div className="wallet-create-panel">

                                <div className="wallet-create-panel-icon">
                                    ◇
                                </div>

                                <div className="wallet-create-panel-content">

                                    <span className="wallet-label">
                                        INDIVIDUAL WALLET
                                    </span>

                                    <h3>
                                        Your wallet has not been created yet
                                    </h3>

                                    <p>
                                        Create a personal blockchain
                                        wallet for this HerdSense AI
                                        account. You can use passkey,
                                        Google, or email authentication
                                        through Thirdweb.
                                    </p>

                                    <button
                                        type="button"
                                        className="wallet-create-button"
                                        onClick={() =>
                                            setShowCreateOptions(
                                                (current) =>
                                                    !current
                                            )
                                        }
                                        disabled={creating}
                                    >
                                        {creating
                                            ? "Creating wallet..."
                                            : "Create HerdSense Wallet"
                                        }
                                    </button>

                                </div>

                            </div>

                        )}


                        {/* ====================================================
                            CREATE WALLET OPTIONS
                        ==================================================== */}

                        {showCreateOptions &&
                            !displayAddress && (
                                <div className="wallet-create-options">

                                    <div className="wallet-create-options-heading">

                                        <div>
                                            <span className="wallet-label">
                                                WALLET CREATION
                                            </span>

                                            <strong>
                                                Choose how to secure your wallet
                                            </strong>
                                        </div>

                                        <button
                                            type="button"
                                            className="wallet-option-close"
                                            onClick={() =>
                                                setShowCreateOptions(
                                                    false
                                                )
                                            }
                                            aria-label="Close wallet creation options"
                                        >
                                            ×
                                        </button>

                                    </div>


                                    <button
                                        type="button"
                                        className="wallet-auth-option"
                                        onClick={() =>
                                            createHerdSenseWallet(
                                                "passkey"
                                            )
                                        }
                                        disabled={creating}
                                    >

                                        <span className="wallet-auth-option-icon">
                                            ◉
                                        </span>

                                        <span>

                                            <strong>
                                                Passkey
                                            </strong>

                                            <small>
                                                Use your device biometric or
                                                security key.
                                            </small>

                                        </span>

                                        <span className="wallet-auth-arrow">
                                            →
                                        </span>

                                    </button>


                                    <button
                                        type="button"
                                        className="wallet-auth-option"
                                        onClick={() =>
                                            createHerdSenseWallet(
                                                "google"
                                            )
                                        }
                                        disabled={creating}
                                    >

                                        <span className="wallet-auth-option-icon">
                                            G
                                        </span>

                                        <span>

                                            <strong>
                                                Google
                                            </strong>

                                            <small>
                                                Use your Google identity to
                                                secure the wallet.
                                            </small>

                                        </span>

                                        <span className="wallet-auth-arrow">
                                            →
                                        </span>

                                    </button>


                                    <button
                                        type="button"
                                        className="wallet-auth-option"
                                        onClick={() =>
                                            createHerdSenseWallet(
                                                "email"
                                            )
                                        }
                                        disabled={creating}
                                    >

                                        <span className="wallet-auth-option-icon">
                                            @
                                        </span>

                                        <span>

                                            <strong>
                                                Email
                                            </strong>

                                            <small>
                                                Verify your email through
                                                Thirdweb.
                                            </small>

                                        </span>

                                        <span className="wallet-auth-arrow">
                                            →
                                        </span>

                                    </button>

                                </div>
                            )
                        }


                        {/* ====================================================
                            WALLET ADDRESS
                        ==================================================== */}

                        {displayAddress && (

                            <div className="wallet-address-card">

                                <div className="wallet-address-heading">

                                    <span>
                                        {isConnected
                                            ? "ACTIVE WALLET"
                                            : "SAVED WALLET"
                                        }
                                    </span>

                                    <span className="wallet-address-chain">
                                        BASE
                                    </span>

                                </div>


                                <div className="wallet-address-main">

                                    <div className="wallet-address-icon">
                                        ◇
                                    </div>

                                    <div className="wallet-address-value">

                                        <strong>
                                            {formatAddress(
                                                displayAddress
                                            )}
                                        </strong>

                                        <span>
                                            {displayAddress}
                                        </span>

                                    </div>

                                    <button
                                        type="button"
                                        className="wallet-copy-button"
                                        onClick={copyAddress}
                                        aria-label="Copy wallet address"
                                    >
                                        {copied
                                            ? "✓"
                                            : "Copy"
                                        }
                                    </button>

                                </div>

                            </div>

                        )}


                        {/* ====================================================
                            EXTERNAL WALLET CONNECTION
                        ==================================================== */}

                        <div className="wallet-connect-area">

                            {thirdwebClient ? (

                                <div className="wallet-connect-stack">

                                    <span className="wallet-connect-label">
                                        {displayAddress
                                            ? "SWITCH / CONNECT WALLET"
                                            : "EXISTING WALLET"
                                        }
                                    </span>

                                    <ConnectButton
                                        client={
                                            thirdwebClient
                                        }
                                        chains={[
                                            base
                                        ]}
                                        wallets={[
                                            herdSenseWallet
                                        ]}
                                        connectModal={{
                                            size: "wide",
                                            title:
                                                "Connect to HerdSense AI",
                                            showThirdwebBranding:
                                                false,
                                        }}
                                    />

                                </div>

                            ) : (

                                <div className="wallet-unavailable">

                                    <span>
                                        !
                                    </span>

                                    <div>

                                        <strong>
                                            Web3 unavailable
                                        </strong>

                                        <p>
                                            Wallet connection is
                                            temporarily unavailable.
                                        </p>

                                    </div>

                                </div>

                            )}

                        </div>


                        {/* ====================================================
                            STATUS
                        ==================================================== */}

                        {loading && (

                            <div className="wallet-message wallet-loading">

                                <span className="message-icon">
                                    ◌
                                </span>

                                <span>
                                    Loading wallet information...
                                </span>

                            </div>

                        )}


                        {saving && (

                            <div className="wallet-message wallet-loading">

                                <span className="message-icon">
                                    ◌
                                </span>

                                <span>
                                    Linking your wallet to this HerdSense AI account...
                                </span>

                            </div>

                        )}


                        {success && (

                            <div className="wallet-message wallet-success">

                                <span className="message-icon">
                                    ✓
                                </span>

                                <span>
                                    {success}
                                </span>

                            </div>

                        )}


                        {error && (

                            <div className="wallet-message wallet-error">

                                <span className="message-icon">
                                    !
                                </span>

                                <span>
                                    {error}
                                </span>

                            </div>

                        )}

                    </article>


                    {/* ========================================================
                        STATUS CARD
                    ======================================================== */}

                    <aside className="wallet-card wallet-status-card">

                        <div className="wallet-card-heading">

                            <span className="wallet-label">
                                ACCOUNT STATUS
                            </span>

                            <span className="wallet-live-indicator">
                                LIVE
                            </span>

                        </div>


                        <div className="wallet-status-list">

                            <div className="wallet-status-row">

                                <div className="wallet-status-name">

                                    <span className="status-icon">
                                        ◉
                                    </span>

                                    <span>
                                        Wallet
                                    </span>

                                </div>

                                <strong
                                    className={
                                        isConnected &&
                                        isBaseNetwork
                                            ? "status-good"
                                            : savedWallet
                                            ? "status-neutral"
                                            : "status-muted"
                                    }
                                >
                                    {isConnected &&
                                    isBaseNetwork
                                        ? "Active"
                                        : savedWallet
                                        ? "Linked"
                                        : "Not created"
                                    }
                                </strong>

                            </div>


                            <div className="wallet-status-row">

                                <div className="wallet-status-name">

                                    <span className="status-icon">
                                        ◎
                                    </span>

                                    <span>
                                        Network
                                    </span>

                                </div>

                                <strong
                                    className={
                                        isBaseNetwork
                                            ? "status-good"
                                            : "status-neutral"
                                    }
                                >
                                    {isBaseNetwork
                                        ? "Base"
                                        : activeChain?.id
                                            ? `Chain ${activeChain.id}`
                                            : "Base"
                                    }
                                </strong>

                            </div>


                            <div className="wallet-status-row">

                                <div className="wallet-status-name">

                                    <span className="status-icon">
                                        ◇
                                    </span>

                                    <span>
                                        Account link
                                    </span>

                                </div>

                                <strong
                                    className={
                                        savedWallet
                                            ? "status-good"
                                            : "status-muted"
                                    }
                                >
                                    {savedWallet
                                        ? "Verified"
                                        : "Not linked"
                                    }
                                </strong>

                            </div>


                            <div className="wallet-status-row">

                                <div className="wallet-status-name">

                                    <span className="status-icon">
                                        ⛓
                                    </span>

                                    <span>
                                        Blockchain
                                    </span>

                                </div>

                                <strong className="status-good">
                                    Available
                                </strong>

                            </div>

                        </div>


                        <div className="wallet-network-panel">

                            <div className="base-mark">
                                B
                            </div>

                            <div>

                                <span>
                                    SUPPORTED NETWORK
                                </span>

                                <strong>
                                    Base
                                </strong>

                                <small>
                                    Ethereum Layer 2
                                </small>

                            </div>

                        </div>

                    </aside>


                    {/* ========================================================
                        ACCOUNT OWNERSHIP CARD
                    ======================================================== */}

                    <article className="wallet-card wallet-info-card">

                        <div className="wallet-info-number">
                            01
                        </div>

                        <div>

                            <span className="wallet-label">
                                PERSONAL OWNERSHIP
                            </span>

                            <h3>
                                Your wallet belongs to your account.
                            </h3>

                            <p>
                                Every HerdSense AI farmer account can
                                have its own blockchain wallet. The
                                wallet address is associated with your
                                authenticated account and cannot be
                                simultaneously linked to another
                                HerdSense account.
                            </p>

                        </div>

                    </article>


                    {/* ========================================================
                        WEB3 READINESS CARD
                    ======================================================== */}

                    <article className="wallet-card wallet-info-card">

                        <div className="wallet-info-number">
                            02
                        </div>

                        <div>

                            <span className="wallet-label">
                                WEB3 READINESS
                            </span>

                            <h3>
                                Built for on-chain livestock infrastructure.
                            </h3>

                            <p>
                                Your wallet can become the blockchain
                                identity layer for livestock ownership,
                                verification, traceability, insurance,
                                financing and future Base-native
                                infrastructure.
                            </p>

                        </div>

                    </article>

                </section>


                {/* ============================================================
                    WALLET MANAGEMENT
                ============================================================ */}

                {savedWallet && (

                    <section className="wallet-danger-zone">

                        <div>

                            <span className="wallet-label">
                                WALLET MANAGEMENT
                            </span>

                            <h3>
                                Remove wallet association
                            </h3>

                            <p>
                                This removes the public wallet address
                                from your HerdSense AI account. It does
                                not delete the blockchain wallet, transfer
                                funds, or erase blockchain history.
                            </p>

                        </div>

                        <button
                            type="button"
                            className="wallet-disconnect"
                            onClick={
                                disconnectFromHerdSense
                            }
                            disabled={
                                disconnecting
                            }
                        >
                            {disconnecting
                                ? "Removing..."
                                : "Remove wallet"
                            }
                        </button>

                    </section>

                )}


                {/* ============================================================
                    FOOTER
                ============================================================ */}

                <footer className="wallet-footer">

                    <span>
                        HERDSENSE AI / PERSONAL WEB3 IDENTITY
                    </span>

                    <span>
                        BASE NETWORK
                    </span>

                </footer>

            </main>

        </AppShell>

    );
}


/* ============================================================================
   ADDRESS FORMATTER
============================================================================ */

function formatAddress(address) {

    if (!address) {
        return "";
    }

    if (address.length <= 14) {
        return address;
    }

    return `${address.slice(0, 8)}...${address.slice(-8)}`;
}