const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("SCF37ContributionFund - Full Test", function () {
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

    // Deploy ContributionFund
    const ContributionFund = await ethers.getContractFactory("SCF37ContributionFund");
    const contributionFund = await ContributionFund.deploy(
      [treasury1.address, treasury2.address],
      usdt.target
    );
    await contributionFund.waitForDeployment();

    // Grant ADMIN_ROLE cho admin
    await contributionFund
      .connect(owner)
      .grantRole(await contributionFund.ADMIN_ROLE(), admin.address);

    return {
      owner,
      user1,
      user2,
      admin,
      treasury1,
      treasury2,
      treasury3,
      usdt,
      contributionFund,
    };
  }

  // ------------------ Deployment ------------------

  it("Should deploy with valid treasury wallets", async () => {
    const { contributionFund, treasury1, treasury2 } = await loadFixture(deployFixture);

    expect(await contributionFund.getTreasuryWalletCount()).to.equal(2);
    expect(await contributionFund.isValidTreasuryWallet(treasury1.address)).to.equal(true);
    expect(await contributionFund.isValidTreasuryWallet(treasury2.address)).to.equal(true);
  });

  it("Should fail deploy with no treasury wallets", async () => {
    const USDT = await ethers.getContractFactory("BEP20USDT");
    const usdt = await USDT.deploy();
    await usdt.waitForDeployment();

    const ContributionFund = await ethers.getContractFactory("SCF37ContributionFund");
    await expect(
      ContributionFund.deploy([], usdt.target)
    ).to.be.revertedWith("Must provide at least one treasury wallet");
  });

  // ------------------ Contribute ------------------

  it("Should allow valid contribution", async () => {
    const { user1, usdt, contributionFund } = await loadFixture(deployFixture);

    await usdt.connect(user1).approve(contributionFund.target, ethers.parseUnits("100", 18));
    await expect(contributionFund.connect(user1).contribute(ethers.parseUnits("100", 18)))
      .to.emit(contributionFund, "Contribute")
      .withArgs(user1.address, ethers.parseUnits("100", 18), anyValue);

    expect(await contributionFund.getTotalContributions()).to.equal(ethers.parseUnits("100", 18));
    expect(await contributionFund.getUserContribution(user1.address)).to.equal(
      ethers.parseUnits("100", 18)
    );
  });

  it("Should fail contribute if below min or above max", async () => {
    const { admin, user1, usdt, contributionFund } = await loadFixture(deployFixture);

    await contributionFund
      .connect(admin)
      .updateContributionLimit(ethers.parseUnits("50", 18), ethers.parseUnits("200", 18));

    await usdt.connect(user1).approve(contributionFund.target, ethers.parseUnits("49", 18));
    await expect(
      contributionFund.connect(user1).contribute(ethers.parseUnits("49", 18))
    ).to.be.revertedWith("Contribution below minimum amount");

    await usdt.connect(user1).approve(contributionFund.target, ethers.parseUnits("201", 18));
    await expect(
      contributionFund.connect(user1).contribute(ethers.parseUnits("201", 18))
    ).to.be.revertedWith("Contribution above maximum amount");
  });

  it("Should fail contribute without allowance or insufficient balance", async () => {
    const { user1, usdt, contributionFund } = await loadFixture(deployFixture);

    // Không approve
    await expect(
      contributionFund.connect(user1).contribute(ethers.parseUnits("10", 18))
    ).to.be.revertedWith("Please approve USDT first");

    // Approve nhưng không đủ balance
    await usdt.connect(user1).approve(contributionFund.target, ethers.parseUnits("2000", 18));
    await expect(
      contributionFund.connect(user1).contribute(ethers.parseUnits("2000", 18))
    ).to.be.revertedWith("Insufficient USDT balance");
  });

  it("Should revert contribute when paused", async () => {
    const { owner, user1, usdt, contributionFund } = await loadFixture(deployFixture);

    await contributionFund.connect(owner).pause();

    await usdt.connect(user1).approve(contributionFund.target, ethers.parseUnits("10", 18));
    await expect(
      contributionFund.connect(user1).contribute(ethers.parseUnits("10", 18))
    ).to.be.reverted;
  });

  // ------------------ Update Contribution Limit ------------------

  it("Should allow admin to update contribution limit", async () => {
    const { admin, contributionFund } = await loadFixture(deployFixture);

    await expect(
      contributionFund
        .connect(admin)
        .updateContributionLimit(ethers.parseUnits("50", 18), ethers.parseUnits("200", 18))
    )
      .to.emit(contributionFund, "UpdateContributionLimit")
      .withArgs(ethers.parseUnits("50", 18), ethers.parseUnits("200", 18));

    expect(await contributionFund.minContributeAmount()).to.equal(ethers.parseUnits("50", 18));
    expect(await contributionFund.maxContributeAmount()).to.equal(ethers.parseUnits("200", 18));
  });

  it("Should not allow non-admin to update contribution limit", async () => {
    const { user1, contributionFund } = await loadFixture(deployFixture);

    await expect(
      contributionFund
        .connect(user1)
        .updateContributionLimit(ethers.parseUnits("50", 18), ethers.parseUnits("200", 18))
    ).to.be.reverted;
  });

  // ------------------ Emergency Withdraw ------------------

  it("Should allow emergency withdraw by admin", async () => {
    const { owner, admin, user1, usdt, treasury1, contributionFund } = await loadFixture(deployFixture);

    await usdt.connect(user1).approve(contributionFund.target, ethers.parseUnits("100", 18));
    await contributionFund.connect(user1).contribute(ethers.parseUnits("100", 18));

    const treasuryBefore = await usdt.balanceOf(treasury1.address);

    await expect(
      contributionFund
        .connect(owner)
        .emergencyWithdraw(treasury1.address, ethers.parseUnits("50", 18))
    )
      .to.emit(contributionFund, "EmergencyWithdraw")
      .withArgs(owner.address, treasury1.address, ethers.parseUnits("50", 18), anyValue);

    const treasuryAfter = await usdt.balanceOf(treasury1.address);
    expect(treasuryAfter - treasuryBefore).to.equal(ethers.parseUnits("50", 18));
  });

  it("Should fail emergency withdraw if invalid treasury or insufficient balance", async () => {
    const { owner, treasury3, contributionFund } = await loadFixture(deployFixture);

    await expect(
      contributionFund.connect(owner).emergencyWithdraw(treasury3.address, 1)
    ).to.be.revertedWith("Not a treasury wallet");

    await expect(
      contributionFund.connect(owner).emergencyWithdraw(treasury3.address, 100)
    ).to.be.reverted;
  });

  it("Should not allow non-admin to emergency withdraw", async () => {
    const { user1, treasury1, contributionFund } = await loadFixture(deployFixture);

    await expect(
      contributionFund.connect(user1).emergencyWithdraw(treasury1.address, 10)
    ).to.be.reverted;
  });

  // ------------------ Treasury Wallet Management ------------------

  it("Should allow default admin to remove treasury wallet", async () => {
    const { owner, treasury2, contributionFund } = await loadFixture(deployFixture);

    await expect(contributionFund.connect(owner).removeTreasuryWallet(treasury2.address))
      .to.emit(contributionFund, "TreasuryWalletRemoved")
      .withArgs(treasury2.address);

    expect(await contributionFund.getTreasuryWalletCount()).to.equal(1);
    expect(await contributionFund.isValidTreasuryWallet(treasury2.address)).to.equal(false);
  });

  it("Should not allow removing last treasury wallet", async () => {
    const { owner, treasury1, treasury2, contributionFund } = await loadFixture(deployFixture);

    // Remove treasury2 trước
    await contributionFund.connect(owner).removeTreasuryWallet(treasury2.address);

    // Còn lại treasury1
    await expect(
      contributionFund.connect(owner).removeTreasuryWallet(treasury1.address)
    ).to.be.revertedWith("Must keep at least one treasury wallet");
  });

  it("Should not allow non-admin to remove treasury wallet", async () => {
    const { user1, treasury2, contributionFund } = await loadFixture(deployFixture);

    await expect(
      contributionFund.connect(user1).removeTreasuryWallet(treasury2.address)
    ).to.be.reverted;
  });

  // ------------------ Default Admin Transfer ------------------

  it("Should transfer default admin role", async () => {
    const { owner, user2, contributionFund } = await loadFixture(deployFixture);

    await expect(contributionFund.connect(owner).transferDefaultAdminRole(user2.address))
      .to.emit(contributionFund, "DefaultAdminTransferred")
      .withArgs(owner.address, user2.address);

    expect(await contributionFund.hasRole(await contributionFund.DEFAULT_ADMIN_ROLE(), user2.address)).to.equal(true);
    expect(await contributionFund.hasRole(await contributionFund.DEFAULT_ADMIN_ROLE(), owner.address)).to.equal(false);
  });

  it("Should fail transfer default admin to zero or self", async () => {
    const { owner, contributionFund } = await loadFixture(deployFixture);

    await expect(
      contributionFund.connect(owner).transferDefaultAdminRole(ethers.ZeroAddress)
    ).to.be.revertedWith("New admin cannot be zero address");

    await expect(
      contributionFund.connect(owner).transferDefaultAdminRole(owner.address)
    ).to.be.revertedWith("Cannot transfer to self");
  });

  // ------------------ Pause/Unpause ------------------

  it("Should pause and unpause contract", async () => {
    const { owner, contributionFund } = await loadFixture(deployFixture);

    await expect(contributionFund.connect(owner).pause()).not.to.be.reverted;
    expect(await contributionFund.paused()).to.equal(true);

    await expect(contributionFund.connect(owner).unpause()).not.to.be.reverted;
    expect(await contributionFund.paused()).to.equal(false);
  });

  it("Should not allow non-admin to pause/unpause", async () => {
    const { user1, contributionFund } = await loadFixture(deployFixture);

    await expect(contributionFund.connect(user1).pause()).to.be.reverted;
    await expect(contributionFund.connect(user1).unpause()).to.be.reverted;
  });

  // ------------------ View Functions ------------------

  it("Should return treasury wallets only for admin", async () => {
    const { admin, user1, contributionFund } = await loadFixture(deployFixture);

    const wallets = await contributionFund.connect(admin).getTreasuryWallets();
    expect(wallets.length).to.equal(2);

    await expect(contributionFund.connect(user1).getTreasuryWallets()).to.be.reverted;
  });
});
