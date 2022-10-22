const { network } = require("hardhat");
const {
  developmentChains,
  DECIMALS,
  INITIAL_ANSWER,
} = require("../helper-hardhat-config");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments; //pulling those two functions out of deployments
  const { deployer } = await getNamedAccounts(); //getting deployer from that function
  const chainId = network.config.chainId;

  if (chainId == 31337) {
    log("Local network detected! Deploying mocks...");
    await deploy("MockV3Aggregator", {
      contract: "MockV3Aggregator",
      from: deployer,
      log: true, // means it will show address and gas from deploying on terminal
      args: [DECIMALS, INITIAL_ANSWER],
    });
    log("Mocks deployed!");
    log("------------------------------------------------------");
  }
};

module.exports.tags = ["all", "mocks"];
// with the line above we can do "yarn hardhat deploy --tags mocks" and it only deploys scripts with that tag
