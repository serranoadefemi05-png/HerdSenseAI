import { useEffect, useState } from "react";

import {
    ConnectButton,
    useActiveAccount,
    useActiveWalletChain,
} from "thirdweb/react";

import { base } from "thirdweb/chains";

import { thirdwebClient } from "../services/thirdweb";

import api from "../services/api";

import AppShell from "../components/AppShell";

import "./Wallet.css";


/* ============================================================================
   HERDSENSE AI
   WALLET COMMAND CENTER

   Scope:
   - Thirdweb wallet connection
   - Base network
   - Save connected wallet to authenticated HerdSense account
   - Load previously saved wallet
   - Remove wallet from HerdSense account

   Web3 remains an optional subsystem. A missing Thirdweb client must never
   prevent the rest of HerdSense AI from functioning.
============================================================================ */


export default function Wallet() {

    const account = useActiveAccount();

    const activeChain = useActiveWalletChain();

    const [savedWallet, setSavedWallet] = useState(null);

    const [loading, setLoading] = useState(true);

    const [saving, setSaving] = useState(false);

    const [disconnecting, setDisconnecting] = useState(false);

    const [copied, setCopied] = useState(false);

    const [error, setError] = useState("");

    const [success, setSuccess] = useState("");


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
        ? "CONNECTED"
        : savedWallet
        ? "LINKED"
        : "NOT CONNECTED";


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

        if (!thirdwebClient || !account?.address) {
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
                    "Wallet successfully linked to your HerdSense AI account."
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

        saveWallet();

        return () => {
            mounted = false;
        };

    }, [
        account?.address,
        activeChain?.id,
    ]);


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

            setTimeout(() => {
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
       FORMAT ADDRESS
    ======================================================================== */

    function formatAddress(address) {

        if (!address) {
            return "";
        }

        if (address.length <= 14) {
            return address;
        }

        return `${address.slice(
            0,
            8
        )}...${address.slice(-8)}`;
    }


    /* ========================================================================
       RENDER
    ======================================================================== */

    return (

        <AppShell>

            <main className="wallet-page">

                {/* ============================================================
                    PAGE HEADER
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
                                        isConnected
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
                            Connect and manage the blockchain
                            identity associated with your
                            HerdSense AI account.
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
                                <span>◈</span>
                            </div>

                            <div>

                                <span className="wallet-label">
                                    WALLET IDENTITY
                                </span>

                                <h2>
                                    {isConnected
                                        ? "Wallet connected"
                                        : savedWallet
                                        ? "Wallet linked"
                                        : "Connect your wallet"
                                    }
                                </h2>

                            </div>

                        </div>


                        <p className="wallet-card-description">

                            {isConnected
                                ? "Your Web3 wallet is currently connected and associated with this HerdSense AI account."
                                : savedWallet
                                ? "A wallet is associated with your HerdSense AI account. Connect it again to access its active session."
                                : "Connect a compatible Web3 wallet to establish your blockchain identity on Base."
                            }

                        </p>


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
                            CONNECT / THIRDWEB
                        ==================================================== */}

                        <div className="wallet-connect-area">

                            {thirdwebClient ? (

                                <ConnectButton
                                    client={thirdwebClient}
                                    chains={[base]}
                                    connectModal={{
                                        size: "wide",
                                        title: "Connect to HerdSense AI",
                                        showThirdwebBranding: false,
                                    }}
                                />

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
                            ACTION STATUS
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
                                    Linking wallet to your HerdSense AI account...
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
                        WEB3 STATUS CARD
                    ======================================================== */}

                    <aside className="wallet-card wallet-status-card">

                        <div className="wallet-card-heading">

                            <span className="wallet-label">
                                SYSTEM STATUS
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
                                        Wallet connection
                                    </span>

                                </div>

                                <strong
                                    className={
                                        isConnected
                                            ? "status-good"
                                            : savedWallet
                                            ? "status-neutral"
                                            : "status-muted"
                                    }
                                >
                                    {isConnected
                                        ? "Active"
                                        : savedWallet
                                        ? "Linked"
                                        : "Inactive"
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

                                <strong className="status-good">
                                    Base
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
                        ACCOUNT LINKAGE CARD
                    ======================================================== */}

                    <article className="wallet-card wallet-info-card">

                        <div className="wallet-info-number">
                            01
                        </div>

                        <div>

                            <span className="wallet-label">
                                ACCOUNT LINKAGE
                            </span>

                            <h3>
                                One account. One blockchain identity.
                            </h3>

                            <p>
                                Your connected wallet is linked to
                                your authenticated HerdSense AI
                                account. This allows blockchain
                                records and future on-chain
                                livestock infrastructure to be
                                associated with your platform identity.
                            </p>

                        </div>

                    </article>


                    {/* ========================================================
                        SECURITY / READINESS CARD
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
                                Built for on-chain infrastructure.
                            </h3>

                            <p>
                                HerdSense AI is designed to connect
                                livestock intelligence with
                                blockchain identity, ownership,
                                traceability and future financial
                                infrastructure.
                            </p>

                        </div>

                    </article>

                </section>


                {/* ============================================================
                    DANGER ZONE
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
                                This removes the wallet association
                                from your HerdSense AI account.
                                It does not transfer funds or modify
                                the blockchain wallet itself.
                            </p>

                        </div>

                        <button
                            type="button"
                            className="wallet-disconnect"
                            onClick={
                                disconnectFromHerdSense
                            }
                            disabled={disconnecting}
                        >
                            {disconnecting
                                ? "Removing..."
                                : "Remove wallet"
                            }
                        </button>

                    </section>

                )}


                {/* ============================================================
                    FOOTER NOTE
                ============================================================ */}

                <footer className="wallet-footer">

                    <span>
                        HERDSENSE AI / WEB3 INFRASTRUCTURE
                    </span>

                    <span>
                        BASE NETWORK
                    </span>

                </footer>

            </main>

        </AppShell>

    );
}