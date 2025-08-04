// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("ContributionFund_module", (m) => {

  const listTreasury = JSON.parse(process.env.LIST_TREASURY) || [];
  const usdtAddress = "0x55d398326f99059ff775485246999027b3197955";
  console.log('listTreasury :>> ', listTreasury);

  const contributionFund = m.contract("ContributionFund", [listTreasury, usdtAddress]);

  return { contributionFund };
});