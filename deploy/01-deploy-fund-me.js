//usually we do:
// import
// main function
// calling of main function

// with hardhat deploy we do it lil different

//hre -> hardhat run time enviroment
// function deployFunc(hre) {
//     console.log("Hi!");
//     hre.getNamedAccounts()
//     hre.deployments
// }

//import network config ".." means going back a directory
const {
  networkConfig,
  developmentChains,
} = require("../helper-hardhat-config");
const { network } = require("hardhat");
const { verify } = require("../utils/verify");
//above is the same as:
// const helperConfig = require("../helper-hardhat-congif");
// const networkConfig = helperConfig.networkConfig;

// module.exports.default = deployFunc;  // export the function as default for hardhat deploy to look for

//same thing as above but different syntax
// module.exports = async (hre) => {
//     const { getNamedAccounts, deployments } = hre; //these are variables from hre we are gonna use (pull those variables out of hre)
module.exports = async ({ getNamedAccounts, deployments }) => {
  // this is the same thing as above
  // same as hre.getNamedAccounts
  // hre.deployments
  const { deploy, log } = deployments; //pulling those two functions out of deployments
  const { deployer } = await getNamedAccounts(); //getting deployer from that function
  const chainId = network.config.chainId;

  // for priceFeed we can do:
  // if chainId is X use address Y
  // if chainId is Z use address A.... do this in helper-harhat-config.js

  //const ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"];
  let ethUsdPriceFeedAddress;
  if (developmentChains.includes(network.name)) {
    const ethUsdAggregator = await deployments.get("MockV3Aggregator"); //getting the contract
    ethUsdPriceFeedAddress = ethUsdAggregator.address; // priceFeed mock contract's address
  } else {
    ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"];
  }

  // well what happens when we want to change chains?
  // when going for localhost or hardhat network we want to use a mock
  // mock is using fake objects to immitate real ones

  // if the contract doesn't exist, we deploy a minimal version
  // for our local testing (priceFeed for local host or hardhat)
  const args = [ethUsdPriceFeedAddress];
  const fundMe = await deploy("FundMe", {
    from: deployer,
    args: args, //argument for constructor function
    log: true, //console.log here so we don't have to do in terminal or something
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  //lets do verification for a test net
  // if development does not include network.name
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(fundMe.address, args);
  }

  log("--------------------------------------------");
};

module.exports.tags = ["all", "fundme"];
