const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("SCF37ContributionTracker", function () {

  async function deployFixture() {
    const [admin, manager, user1, user2] = await ethers.getSigners();

    const Contribution = await ethers.getContractFactory("SCF37ContributionTracker");
    const contribution = await Contribution.deploy();

    return { contribution, admin, manager, user1, user2 };
  }

  // ---------------- ACCESS CONTROL ----------------
  describe("AccessControl", function () {
    it("Should have admin roles after deploy", async function () {
      const { contribution, admin } = await loadFixture(deployFixture);
      const DEFAULT_ADMIN_ROLE = await contribution.DEFAULT_ADMIN_ROLE();
      const ADMIN_ROLE = await contribution.ADMIN_ROLE();

      expect(await contribution.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await contribution.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("Only DEFAULT_ADMIN_ROLE can grant/revoke roles", async function () {
      const { contribution, admin, manager, user1 } = await loadFixture(deployFixture);
      const ADMIN_ROLE = await contribution.ADMIN_ROLE();

      // Grant role
      await expect(contribution.grantRole(ADMIN_ROLE, manager.address))
        .to.emit(contribution, "RoleGranted")
        .withArgs(ADMIN_ROLE, manager.address, admin.address);

      expect(await contribution.hasRole(ADMIN_ROLE, manager.address)).to.be.true;

      // Revoke role
      await expect(contribution.revokeRole(ADMIN_ROLE, manager.address))
        .to.emit(contribution, "RoleRevoked")
        .withArgs(ADMIN_ROLE, manager.address, admin.address);

      expect(await contribution.hasRole(ADMIN_ROLE, manager.address)).to.be.false;

      // Non-admin tries to grant role → revert
      await expect(contribution.connect(user1).grantRole(ADMIN_ROLE, user1.address))
        .to.be.revertedWithCustomError(contribution, "AccessControlUnauthorizedAccount");
    });

    it("Non-admin cannot call restricted functions", async function () {
      const { contribution, user1 } = await loadFixture(deployFixture);
      const txhash = ethers.keccak256(ethers.toUtf8Bytes("hash"));

      await expect(contribution.connect(user1).recordContribution(
        user1.address, 100, Math.floor(Date.now()/1000), txhash, "test"
      )).to.be.revertedWithCustomError(contribution, "AccessControlUnauthorizedAccount");
    });
  });

  // ---------------- RECORD CONTRIBUTION ----------------
  describe("recordContribution", function () {
    it("Should record multiple contributions and accumulate correctly", async function () {
      const { contribution, user1 } = await loadFixture(deployFixture);

      const txhash1 = ethers.keccak256(ethers.toUtf8Bytes("tx1"));
      const txhash2 = ethers.keccak256(ethers.toUtf8Bytes("tx2"));

      await contribution.recordContribution(user1.address, 100, Math.floor(Date.now()/1000), txhash1, "");
      await contribution.recordContribution(user1.address, 50, Math.floor(Date.now()/1000), txhash2, "");

      expect(await contribution.getTotalByUser(user1.address)).to.equal(150);
      expect(await contribution.getTotalSystem()).to.equal(150);

      const historyCount = await contribution.getHistoryCount(user1.address);
      expect(historyCount).to.equal(2);
    });

    it("Should revert when amount = 0", async function () {
      const { contribution, user1 } = await loadFixture(deployFixture);
      const txhash = ethers.keccak256(ethers.toUtf8Bytes("tx"));
      await expect(contribution.recordContribution(user1.address, 0, Math.floor(Date.now()/1000), txhash, "fail"))
        .to.be.revertedWith("Amount must be > 0");
    });

    it("Should revert when user = address(0)", async function () {
      const { contribution } = await loadFixture(deployFixture);
      const txhash = ethers.keccak256(ethers.toUtf8Bytes("tx"));
      await expect(contribution.recordContribution(ethers.ZeroAddress, 100, Math.floor(Date.now()/1000), txhash, "fail"))
        .to.be.revertedWith("Invalid user address");
    });
  });

  // ---------------- UPDATE HISTORY ----------------
  describe("updateHistory", function () {
    it("Should increase amount and adjust totals", async function () {
      const { contribution, user1 } = await loadFixture(deployFixture);
      const txhash1 = ethers.keccak256(ethers.toUtf8Bytes("tx1"));
      const txhash2 = ethers.keccak256(ethers.toUtf8Bytes("tx2"));

      await contribution.recordContribution(user1.address, 100, Math.floor(Date.now()/1000), txhash1, "init");
      await contribution.updateHistory(user1.address, 0, 200, txhash1, true, "increase");

      expect(await contribution.getTotalByUser(user1.address)).to.equal(200);
      expect(await contribution.getTotalSystem()).to.equal(200);

      const history = await contribution.getHistoryEntry(user1.address, 0);
      expect(history.amount).to.equal(200);
      expect(history.action).to.equal(1); // Update
    });

    it("Should decrease amount and adjust totals", async function () {
      const { contribution, user1 } = await loadFixture(deployFixture);
      const txhash1 = ethers.keccak256(ethers.toUtf8Bytes("tx1"));
      const txhash2 = ethers.keccak256(ethers.toUtf8Bytes("tx2"));

      await contribution.recordContribution(user1.address, 200, Math.floor(Date.now()/1000), txhash1, "init");
      await contribution.updateHistory(user1.address, 0, 50, txhash1, true, "decrease");

      expect(await contribution.getTotalByUser(user1.address)).to.equal(50);
      expect(await contribution.getTotalSystem()).to.equal(50);
    });

    it("Should not change note if changeNote = false", async function () {
      const { contribution, user1 } = await loadFixture(deployFixture);
      const txhash1 = ethers.keccak256(ethers.toUtf8Bytes("tx1"));
      const txhash2 = ethers.keccak256(ethers.toUtf8Bytes("tx2"));

      await contribution.recordContribution(user1.address, 100, Math.floor(Date.now()/1000), txhash1, "initial note");
      await contribution.updateHistory(user1.address, 0, 120, txhash1, false, "new note ignored");

      const history = await contribution.getHistoryEntry(user1.address, 0);
      expect(history.note).to.equal("initial note");
    });

    it("Should revert if index out of range", async function () {
      const { contribution, user1 } = await loadFixture(deployFixture);
      const txhash = ethers.keccak256(ethers.toUtf8Bytes("tx"));
      await expect(contribution.updateHistory(user1.address, 0, 50, txhash, true, "fail"))
        .to.be.revertedWith("Invalid index");
    });
  });

  // ---------------- SET USER TOTAL ----------------
  describe("setUserTotal", function () {
    it("Should increase user total", async function () {
      const { contribution, user1 } = await loadFixture(deployFixture);
      await contribution.setUserTotal(user1.address, 300, "set direct");
      expect(await contribution.getTotalByUser(user1.address)).to.equal(300);
      expect(await contribution.getTotalSystem()).to.equal(300);
    });

    it("Should decrease user total", async function () {
      const { contribution, user1 } = await loadFixture(deployFixture);
      await contribution.setUserTotal(user1.address, 200, "set 200");
      await contribution.setUserTotal(user1.address, 50, "set 50");
      expect(await contribution.getTotalSystem()).to.equal(50);
    });

    it("Should handle no change in total", async function () {
      const { contribution, user1 } = await loadFixture(deployFixture);
      await contribution.setUserTotal(user1.address, 100, "first");
      await contribution.setUserTotal(user1.address, 100, "no change");
      expect(await contribution.getTotalSystem()).to.equal(100);
    });
  });

  // ---------------- PAUSE / UNPAUSE ----------------
  describe("Pause/Unpause", function () {
    it("Should block functions when paused", async function () {
      const { contribution, user1 } = await loadFixture(deployFixture);
      await contribution.pause();

      const txhash = ethers.keccak256(ethers.toUtf8Bytes("tx"));
      await expect(contribution.recordContribution(
        user1.address, 100, Math.floor(Date.now()/1000), txhash, "paused"
      )).to.be.revertedWithCustomError(contribution, "EnforcedPause");

      await contribution.unpause();
      await expect(contribution.recordContribution(
        user1.address, 100, Math.floor(Date.now()/1000), txhash, "unpaused"
      )).not.to.be.reverted;
    });
  });

  // ---------------- VIEW FUNCTIONS ----------------
  describe("View Functions", function () {
    it("Should return correct history data", async function () {
      const { contribution, user1 } = await loadFixture(deployFixture);

      const txhash1 = ethers.keccak256(ethers.toUtf8Bytes("tx1"));
      const txhash2 = ethers.keccak256(ethers.toUtf8Bytes("tx2"));

      await contribution.recordContribution(user1.address, 100, Math.floor(Date.now()/1000), txhash1, "first");
      await contribution.recordContribution(user1.address, 200, Math.floor(Date.now()/1000), txhash2, "second");

      const histories = await contribution.getHistoryByUser(user1.address);
      expect(histories.length).to.equal(2);
      expect(histories[0].amount).to.equal(100);
      expect(histories[1].amount).to.equal(200);

      const count = await contribution.getHistoryCount(user1.address);
      expect(count).to.equal(2);

      const singleEntry = await contribution.getHistoryEntry(user1.address, 1);
      expect(singleEntry.note).to.equal("second");
    });
  });

});
