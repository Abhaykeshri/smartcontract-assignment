const hre = require("hardhat");

async function main() {
  const tokenAddress = process.env.ZYNC_TOKEN_ADDRESS;
  if (!tokenAddress) {
    throw new Error("ZYNC_TOKEN_ADDRESS is required");
  }
  const normalizedTokenAddress = hre.ethers.getAddress(tokenAddress.toLowerCase());

  const initialFunding =
    process.env.INITIAL_FUNDING_WEI !== undefined && process.env.INITIAL_FUNDING_WEI !== ""
      ? BigInt(process.env.INITIAL_FUNDING_WEI)
      : 0n;

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying vesting with:", deployer.address);
  console.log("Using token:", normalizedTokenAddress);

  const Vesting = await hre.ethers.getContractFactory("ZyncVesting");
  const vesting = await Vesting.deploy(normalizedTokenAddress, 0);
  await vesting.waitForDeployment();

  const vestingAddress = await vesting.getAddress();
  console.log("ZyncVesting:", vestingAddress);

  if (initialFunding > 0n) {
    const token = await hre.ethers.getContractAt("ZyncToken", normalizedTokenAddress);
    await (await token.approve(vestingAddress, initialFunding)).wait();
    await (await vesting.fund(initialFunding)).wait();
    console.log("Funded:", initialFunding.toString());
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
