import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const HerdSenseRegistryModule = buildModule(
  "HerdSenseRegistryModule",
  (m) => {
    const deployer = m.getAccount(0);

    const registry = m.contract(
      "HerdSenseRegistry",
      [deployer]
    );

    return {
      registry,
    };
  }
);

export default HerdSenseRegistryModule;