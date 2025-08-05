// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const USDT_ADDRESS = process.env.USDT_ADDRESS || "";
module.exports = buildModule("SCF37ContributionFund_module", (m) => {

  const listTreasury = JSON.parse(process.env.LIST_TREASURY) || [];
  console.log('listTreasury :>> ', listTreasury);

  const contributionFund = m.contract("SCF37ContributionFund", [listTreasury, USDT_ADDRESS]);

  return { contributionFund };
});