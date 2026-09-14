import { network } from "hardhat";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const { ethers } = await network.connect();

  console.log("Deploying SolarSettle contract...");

  const SolarSettle = await ethers.getContractFactory("SolarSettle");
  const contract = await SolarSettle.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const { chainId } = await ethers.provider.getNetwork();

  console.log("✅ SolarSettle deployed to:", address, "on chain", Number(chainId));

  // Keep the frontend in sync automatically — no manual ABI/address copying.
  const outPath = path.resolve(__dirname, "../frontend/src/deployedAddress.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        address,
        chainId: Number(chainId),
        deployedAt: new Date().toISOString(),
      },
      null,
      2
    ) + "\n"
  );
  console.log("📝 Frontend address synced at:", outPath);

  if (Number(chainId) === 91562037) {
    const frontendEnvPath = path.resolve(__dirname, "../frontend/.env.production");
    fs.writeFileSync(
      frontendEnvPath,
      `REACT_APP_MST_CONTRACT_ADDRESS=${address}\n`
    );
    console.log("📝 Frontend production environment synced at:", frontendEnvPath);
  }

  const abiPath = path.resolve(__dirname, "../artifacts/contracts/SolarSettle.sol/SolarSettle.json");
  const artifact = JSON.parse(fs.readFileSync(abiPath, "utf8"));
  fs.writeFileSync(
    path.resolve(__dirname, "../frontend/src/SolarSettleABI.json"),
    JSON.stringify({ abi: artifact.abi }, null, 2) + "\n"
  );
  console.log("📝 Frontend ABI synced.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});