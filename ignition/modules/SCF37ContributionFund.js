// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const USDT_ADDRESS = process.env.USDT_ADDRESS || "";
const listTreasury = JSON.parse(process.env.LIST_TREASURY) || [];

module.exports = buildModule("SCF37ContributionFund_module", (m) => {

  const contributionFund = m.contract("SCF37ContributionFund", [listTreasury, USDT_ADDRESS]);

  return { contributionFund };
});