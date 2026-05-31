const { ethers } = require("hardhat");

/**
 * Deploys GoalStaker and prints the address to paste into
 * src/lib/contract.ts (CONTRACT_ADDRESS).
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Factory = await ethers.getContractFactory("GoalStaker");
  const goalStaker = await Factory.deploy();
  await goalStaker.waitForDeployment();

  const address = await goalStaker.getAddress();
  console.log("GoalStaker deployed to:", address);
  console.log("\nPaste this into src/lib/contract.ts:");
  console.log(`export const CONTRACT_ADDRESS = "${address}";`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
