import { network } from "hardhat";

const REGISTRY_ADDRESS =
  "0x0746B127D66D12Be3E9aC4a312dd58036DEda780";

const EXPECTED_OWNER =
  "0x7e866a40d35253b7df8F0B4CD1Ae4009d64800cC";

const { viem } = await network.create();

const registry = await viem.getContractAt(
  "HerdSenseRegistry",
  REGISTRY_ADDRESS
);

const owner = await registry.read.owner();

const writerAuthorized = await registry.read.authorizedWriters([
  EXPECTED_OWNER,
]);

console.log("HerdSenseRegistry:", REGISTRY_ADDRESS);
console.log("Owner:", owner);
console.log("Expected owner:", EXPECTED_OWNER);
console.log("Authorized writer:", writerAuthorized);

if (owner.toLowerCase() !== EXPECTED_OWNER.toLowerCase()) {
  throw new Error("Owner address does not match deployment wallet.");
}

if (!writerAuthorized) {
  throw new Error("Deployment wallet is not an authorized writer.");
}

console.log("✅ HerdSenseRegistry verification passed.");