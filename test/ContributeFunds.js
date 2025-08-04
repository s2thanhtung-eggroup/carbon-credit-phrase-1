const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("ContributeFunds - Full Test", function () {
  async function deployFixture() {
    const [owner, user1, user2, admin, treasury1, treasury2, treasury3] =
      await ethers.getSigners();

    // Deploy mock USDT
    const USDT = await ethers.getContractFactory("BEP20USDT");
    const usdt = await USDT.deploy();
    await usdt.waitForDeployment();

    // Mint USDT
    await usdt.transfer(user1.address, ethers.parseUnits("1000", 18));
    await usdt.transfer(user2.address, ethers.parseUnits("1000", 18));

    // Deploy ContributeFunds
    const ContributeFunds = await ethers.getContractFactory("ContributeFunds");
    const contributeFunds = await ContributeFunds.deploy(
      [treasury1.address, treasury2.address],
      usdt.target
    );
    await contributeFunds.waitForDeployment();

    // Grant ADMIN_ROLE cho admin
    await contributeFunds
      .connect(owner)
      .grantRole(await contributeFunds.ADMIN_ROLE(), admin.address);

    return {
      owner,
      user1,
      user2,
      admin,
      treasury1,
      treasury2,
      treasury3,
      usdt,
      contributeFunds,
    };
  }

  // ------------------ Deployment ------------------

  it("Should deploy with valid treasury wallets", async () => {
    const { contributeFunds, treasury1, treasury2 } = await loadFixture(deployFixture);

    expect(await contributeFunds.getTreasuryWalletCount()).to.equal(2);
    expect(await contributeFunds.isValidTreasuryWallet(treasury1.address)).to.equal(true);
    expect(await contributeFunds.isValidTreasuryWallet(treasury2.address)).to.equal(true);
  });

  it("Should fail deploy with no treasury wallets", async () => {
    const USDT = await ethers.getContractFactory("BEP20USDT");
    const usdt = await USDT.deploy();
    await usdt.waitForDeployment();

    const ContributeFunds = await ethers.getContractFactory("ContributeFunds");
    await expect(
      ContributeFunds.deploy([], usdt.target)
    ).to.be.revertedWith("Must provide at least one treasury wallet");
  });

  // ------------------ Contribute ------------------

  it("Should allow valid contribution", async () => {
    const { user1, usdt, contributeFunds } = await loadFixture(deployFixture);

    await usdt.connect(user1).approve(contributeFunds.target, ethers.parseUnits("100", 18));
    await expect(contributeFunds.connect(user1).contribute(ethers.parseUnits("100", 18)))
      .to.emit(contributeFunds, "Contribute")
      .withArgs(user1.address, ethers.parseUnits("100", 18), anyValue);

    expect(await contributeFunds.totalContributions()).to.equal(ethers.parseUnits("100", 18));
    expect(await contributeFunds.getUserContribution(user1.address)).to.equal(
      ethers.parseUnits("100", 18)
    );
  });

  it("Should fail contribute if below min or above max", async () => {
    const { admin, user1, usdt, contributeFunds } = await loadFixture(deployFixture);

    await contributeFunds
      .connect(admin)
      .updateContributionLimit(ethers.parseUnits("50", 18), ethers.parseUnits("200", 18));

    await usdt.connect(user1).approve(contributeFunds.target, ethers.parseUnits("49", 18));
    await expect(
      contributeFunds.connect(user1).contribute(ethers.parseUnits("49", 18))
    ).to.be.revertedWith("Contribution below minimum amount");

    await usdt.connect(user1).approve(contributeFunds.target, ethers.parseUnits("201", 18));
    await expect(
      contributeFunds.connect(user1).contribute(ethers.parseUnits("201", 18))
    ).to.be.revertedWith("Contribution above maximum amount");
  });

  it("Should fail contribute without allowance or insufficient balance", async () => {
    const { user1, usdt, contributeFunds } = await loadFixture(deployFixture);

    // Không approve
    await expect(
      contributeFunds.connect(user1).contribute(ethers.parseUnits("10", 18))
    ).to.be.revertedWith("Please approve USDT first");

    // Approve nhưng không đủ balance
    await usdt.connect(user1).approve(contributeFunds.target, ethers.parseUnits("2000", 18));
    await expect(
      contributeFunds.connect(user1).contribute(ethers.parseUnits("2000", 18))
    ).to.be.revertedWith("Insufficient USDT balance");
  });

  it("Should revert contribute when paused", async () => {
    const { owner, user1, usdt, contributeFunds } = await loadFixture(deployFixture);

    await contributeFunds.connect(owner).pause();

    await usdt.connect(user1).approve(contributeFunds.target, ethers.parseUnits("10", 18));
    await expect(
      contributeFunds.connect(user1).contribute(ethers.parseUnits("10", 18))
    ).to.be.reverted;
  });

  // ------------------ Update Contribution Limit ------------------

  it("Should allow admin to update contribution limit", async () => {
    const { admin, contributeFunds } = await loadFixture(deployFixture);

    await expect(
      contributeFunds
        .connect(admin)
        .updateContributionLimit(ethers.parseUnits("50", 18), ethers.parseUnits("200", 18))
    )
      .to.emit(contributeFunds, "UpdateContributionLimit")
      .withArgs(ethers.parseUnits("50", 18), ethers.parseUnits("200", 18));

    expect(await contributeFunds.minContributeAmount()).to.equal(ethers.parseUnits("50", 18));
    expect(await contributeFunds.maxContributeAmount()).to.equal(ethers.parseUnits("200", 18));
  });

  it("Should not allow non-admin to update contribution limit", async () => {
    const { user1, contributeFunds } = await loadFixture(deployFixture);

    await expect(
      contributeFunds
        .connect(user1)
        .updateContributionLimit(ethers.parseUnits("50", 18), ethers.parseUnits("200", 18))
    ).to.be.reverted;
  });

  // ------------------ Emergency Withdraw ------------------

  it("Should allow emergency withdraw by admin", async () => {
    const { admin, user1, usdt, treasury1, contributeFunds } = await loadFixture(deployFixture);

    await usdt.connect(user1).approve(contributeFunds.target, ethers.parseUnits("100", 18));
    await contributeFunds.connect(user1).contribute(ethers.parseUnits("100", 18));

    const treasuryBefore = await usdt.balanceOf(treasury1.address);

    await expect(
      contributeFunds
        .connect(admin)
        .emergencyWithdraw(treasury1.address, ethers.parseUnits("50", 18))
    )
      .to.emit(contributeFunds, "EmergencyWithdraw")
      .withArgs(admin.address, treasury1.address, ethers.parseUnits("50", 18), anyValue);

    const treasuryAfter = await usdt.balanceOf(treasury1.address);
    expect(treasuryAfter - treasuryBefore).to.equal(ethers.parseUnits("50", 18));
  });

  it("Should fail emergency withdraw if invalid treasury or insufficient balance", async () => {
    const { admin, treasury3, contributeFunds } = await loadFixture(deployFixture);

    await expect(
      contributeFunds.connect(admin).emergencyWithdraw(treasury3.address, 1)
    ).to.be.revertedWith("Not a treasury wallet");

    await expect(
      contributeFunds.connect(admin).emergencyWithdraw(treasury3.address, 100)
    ).to.be.reverted;
  });

  it("Should not allow non-admin to emergency withdraw", async () => {
    const { user1, treasury1, contributeFunds } = await loadFixture(deployFixture);

    await expect(
      contributeFunds.connect(user1).emergencyWithdraw(treasury1.address, 10)
    ).to.be.reverted;
  });

  // ------------------ Treasury Wallet Management ------------------

  it("Should allow default admin to remove treasury wallet", async () => {
    const { owner, treasury2, contributeFunds } = await loadFixture(deployFixture);

    await expect(contributeFunds.connect(owner).removeTreasuryWallet(treasury2.address))
      .to.emit(contributeFunds, "TreasuryWalletRemoved")
      .withArgs(treasury2.address);

    expect(await contributeFunds.getTreasuryWalletCount()).to.equal(1);
    expect(await contributeFunds.isValidTreasuryWallet(treasury2.address)).to.equal(false);
  });

  it("Should not allow removing last treasury wallet", async () => {
    const { owner, treasury1, treasury2, contributeFunds } = await loadFixture(deployFixture);

    // Remove treasury2 trước
    await contributeFunds.connect(owner).removeTreasuryWallet(treasury2.address);

    // Còn lại treasury1
    await expect(
      contributeFunds.connect(owner).removeTreasuryWallet(treasury1.address)
    ).to.be.revertedWith("Must keep at least one treasury wallet");
  });

  it("Should not allow non-admin to remove treasury wallet", async () => {
    const { user1, treasury2, contributeFunds } = await loadFixture(deployFixture);

    await expect(
      contributeFunds.connect(user1).removeTreasuryWallet(treasury2.address)
    ).to.be.reverted;
  });

  // ------------------ Default Admin Transfer ------------------

  it("Should transfer default admin role", async () => {
    const { owner, user2, contributeFunds } = await loadFixture(deployFixture);

    await expect(contributeFunds.connect(owner).transferDefaultAdminRole(user2.address))
      .to.emit(contributeFunds, "DefaultAdminTransferred")
      .withArgs(owner.address, user2.address);

    expect(await contributeFunds.hasRole(await contributeFunds.DEFAULT_ADMIN_ROLE(), user2.address)).to.equal(true);
    expect(await contributeFunds.hasRole(await contributeFunds.DEFAULT_ADMIN_ROLE(), owner.address)).to.equal(false);
  });

  it("Should fail transfer default admin to zero or self", async () => {
    const { owner, contributeFunds } = await loadFixture(deployFixture);

    await expect(
      contributeFunds.connect(owner).transferDefaultAdminRole(ethers.ZeroAddress)
    ).to.be.revertedWith("New admin cannot be zero address");

    await expect(
      contributeFunds.connect(owner).transferDefaultAdminRole(owner.address)
    ).to.be.revertedWith("Cannot transfer to self");
  });

  // ------------------ Pause/Unpause ------------------

  it("Should pause and unpause contract", async () => {
    const { owner, contributeFunds } = await loadFixture(deployFixture);

    await expect(contributeFunds.connect(owner).pause()).not.to.be.reverted;
    expect(await contributeFunds.paused()).to.equal(true);

    await expect(contributeFunds.connect(owner).unpause()).not.to.be.reverted;
    expect(await contributeFunds.paused()).to.equal(false);
  });

  it("Should not allow non-admin to pause/unpause", async () => {
    const { user1, contributeFunds } = await loadFixture(deployFixture);

    await expect(contributeFunds.connect(user1).pause()).to.be.reverted;
    await expect(contributeFunds.connect(user1).unpause()).to.be.reverted;
  });

  // ------------------ View Functions ------------------

  it("Should return treasury wallets only for admin", async () => {
    const { admin, user1, contributeFunds } = await loadFixture(deployFixture);

    const wallets = await contributeFunds.connect(admin).getTreasuryWallets();
    expect(wallets.length).to.equal(2);

    await expect(contributeFunds.connect(user1).getTreasuryWallets()).to.be.reverted;
  });
});
