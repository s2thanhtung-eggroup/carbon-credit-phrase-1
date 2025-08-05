// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("SCF37ContributionTracker_module", (m) => {

  const tracker = m.contract("SCF37ContributionTracker", []);

  return { tracker };
});