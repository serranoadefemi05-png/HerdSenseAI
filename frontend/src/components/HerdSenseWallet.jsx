import {
    ConnectButton,
} from "thirdweb/react";

import {
    inAppWallet,
} from "thirdweb/wallets";

import {
    baseSepolia,
} from "thirdweb/chains";

import {
    thirdwebClient,
} from "../lib/thirdweb";


const wallets = [
    inAppWallet({
        auth: {
            options: [
                "email",
                "google",
                "apple",
                "passkey",
            ],
        },
    }),
];


export default function HerdSenseWallet() {
    return (
        <ConnectButton
            client={thirdwebClient}
            wallets={wallets}
            chain={baseSepolia}
            connectModal={{
                size: "compact",
                title: "HerdSense AI Wallet",
                titleIcon: "",
                showThirdwebBranding: false,
            }}
            theme="dark"
        />
    );
}