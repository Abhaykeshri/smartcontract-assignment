const { expect } = require("chai");
const hre = require("hardhat");

async function setTime(timestamp) {
  await hre.network.provider.send("evm_setNextBlockTimestamp", [Number(timestamp)]);
}

async function deployFixture() {
  const [owner, beneficiary, outsider] = await hre.ethers.getSigners();
  const Token = await hre.ethers.getContractFactory("ZyncToken");
  const token = await Token.deploy(hre.ethers.parseEther("1"));
  await token.waitForDeployment();

  const Vesting = await hre.ethers.getContractFactory("ZyncVesting");
  const vesting = await Vesting.deploy(await token.getAddress(), 0);
  await vesting.waitForDeployment();

  return { token, vesting, owner, beneficiary, outsider };
}

describe("ZyncVesting", function () {
  it("funds, creates schedules, and releases vested tokens linearly after the cliff", async function () {
    const { token, vesting, owner, beneficiary } = await deployFixture();
    const funding = hre.ethers.parseEther("100");
    const amount = hre.ethers.parseEther("100");

    await token.mintTo(owner.address, funding);
    await token.connect(owner).approve(await vesting.getAddress(), funding);
    await expect(vesting.fund(funding)).to.emit(vesting, "Funded").withArgs(owner.address, funding);

    const latest = await hre.ethers.provider.getBlock("latest");
    const start = BigInt(latest.timestamp + 100);
    const cliff = 50n;
    const duration = 150n;

    await expect(vesting.createVestingSchedule(beneficiary.address, amount, start, cliff, duration))
      .to.emit(vesting, "VestingScheduleCreated")
      .withArgs(0n, beneficiary.address, amount, start, cliff, duration);

    await setTime(start + cliff - 1n);
    await expect(vesting.connect(beneficiary).release()).to.be.revertedWithCustomError(
      vesting,
      "NothingToRelease"
    );

    await setTime(start + 100n);
    await expect(vesting.connect(beneficiary).release())
      .to.emit(vesting, "Released")
      .withArgs(beneficiary.address, hre.ethers.parseEther("50"));

    expect(await token.balanceOf(beneficiary.address)).to.equal(hre.ethers.parseEther("50"));

    await setTime(start + duration);
    await expect(vesting.connect(beneficiary).release())
      .to.emit(vesting, "Released")
      .withArgs(beneficiary.address, hre.ethers.parseEther("50"));

    expect(await token.balanceOf(beneficiary.address)).to.equal(hre.ethers.parseEther("100"));

    await expect(vesting.connect(beneficiary).release()).to.be.revertedWithCustomError(
      vesting,
      "NothingToRelease"
    );
  });

  it("rejects schedule creation without enough funded tokens", async function () {
    const { vesting, beneficiary } = await deployFixture();
    const latest = await hre.ethers.provider.getBlock("latest");
    const start = BigInt(latest.timestamp + 100);

    await expect(
      vesting.createVestingSchedule(beneficiary.address, hre.ethers.parseEther("1"), start, 10, 20)
    ).to.be.revertedWithCustomError(vesting, "InsufficientFunding");
  });
});
