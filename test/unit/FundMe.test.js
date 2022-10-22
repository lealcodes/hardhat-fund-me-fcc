// Unit testing is when you test locally one part of the code at a time

// staging is when you test the whole code with a test net (LAST STOP!!)

const { assert, expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", async function () {
      let fundMe;
      let deployer;
      let mockV3Aggregator;
      const sendValue = ethers.utils.parseEther("1"); // 1 ETH (using ethers utility to write one ETH instead of 1 with 18 zeros wei)

      beforeEach(async function () {
        // deploy our fundMe contract
        // using Hardhat-deploy

        //another way to get some accounts from hardhat config:
        // const accounts = await ethers.getSigners()
        // const accountZero = accounts[0]

        // getNamedAccounts is from hre (hardhat runtime enviroemnt) which is basically hardhat so we can import it as shown above
        // const { deployer } = await getNamedAccounts()
        deployer = (await getNamedAccounts()).deployer;
        //fixture is a function of deployments that let you deploy the deploy files based on their tags
        //deploys everything within that folder with just one line!
        await deployments.fixture(["all"]);
        // line below gives FundMe contract in just one line (Hardhat deploy is clutch)
        fundMe = await ethers.getContract("FundMe", deployer);
        mockV3Aggregator = await ethers.getContract(
          "MockV3Aggregator",
          deployer
        );
      });

      //doing a nested describe for each part of the code
      describe("constructor", async function () {
        it("sets the aggregator addresses correctly", async function () {
          const response = await fundMe.s_priceFeed();
          assert.equal(response, mockV3Aggregator.address);
        });
      });

      describe("fund", async function () {
        it("Fails if you don't send enough ETH", async function () {
          // testing if transaction was reverted "expect"
          await expect(fundMe.fund()).to.be.revertedWith(
            "You need to spend more ETH!"
          );
        });
        // can run just the test below with (yarn hardhat test --grep "amount funded")
        it("updated the amount funded data structure", async function () {
          await fundMe.fund({ value: sendValue });
          const response = await fundMe.s_addressToAmountFunded(deployer);
          assert.equal(response.toString(), sendValue.toString());
        });
        it("Adds funder to array of s_funders", async function () {
          await fundMe.fund({ value: sendValue });
          const response = await fundMe.s_funders(0);
          assert.equal(deployer, response);
        });
      });
      describe("withdraw", async function () {
        beforeEach(async function () {
          await fundMe.fund({ value: sendValue });
        });

        it("Withdraw ETH from a single founder", async function () {
          // way to set up test below
          // Arrange
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          ); // gets intial balance of contract
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          ); // gets initial balance of contract deployer
          // Act
          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt; // pulling out an object out of another object with {}
          const gasCost = gasUsed.mul(effectiveGasPrice); // .mul instead of * cuz its Big Number

          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          // Assert
          assert.equal(endingFundMeBalance, 0);
          // here we do .add because we are working with "big number" (look it up)
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          ); // need to include gas cost to deploy function, add gas cost because the actual value in deployers account is less than the first half of assert because they paid the gas cost to deploy withdraw so that is why we add
        });
        it("allows us to withdraw with multiple s_funders", async function () {
          // ARRANGE
          // first get multiple accounts and have each of them call the fund function
          const accounts = await ethers.getSigners();
          // for loop to go through accounts calling. Start w index 1 because 0 is the deployer
          for (let i = 1; i < 6; i++) {
            // right now fundMe is connected to deployer so if we call it the deployer will be doing it
            // so we need to use "connect" to connect the new accounts
            const fundMeConnectedContract = await fundMe.connect(accounts[i]);
            await fundMeConnectedContract.fund({ value: sendValue });
          }
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          ); // gets intial balance of contract
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          // ACT
          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt; // pulling out an object out of another object with {}
          const gasCost = gasUsed.mul(effectiveGasPrice); // .mul instead of * cuz its Big Number

          // ASSERT
          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          assert.equal(endingFundMeBalance, 0);
          // here we do .add because we are working with "big number" (look it up)
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          ); // need to include gas cost to deploy function, add gas cost because the actual value in deployers account is less than the first half of assert because they paid the gas cost to deploy withdraw so that is why we add

          // make sure that the s_funders are reset properly
          await expect(fundMe.s_funders(0)).to.be.reverted; // we expect calling at that index to give an error cuz its an empty array

          // make sure all accounts have balance of zero in mapping
          for (i = 1; i < 6; i++) {
            assert.equal(
              await fundMe.s_addressToAmountFunded(accounts[i].address),
              0
            );
          }
        });
        it("Only allows the owner to withdraw", async function () {
          const accounts = await ethers.getSigners();
          const attacker = accounts[1];
          // FYI attacker is of object account, so the address would be attacker.address
          const attackerConnectedContract = await fundMe.connect(attacker);
          await expect(
            attackerConnectedContract.withdraw()
          ).to.be.revertedWithCustomError(fundMe, "FundMe__NotOwner");
        });

        // it("cheaperWithdraw", async function (){
        //     // ARRANGE
        //     // first get multiple accounts and have each of them call the fund function
        //     const accounts = await ethers.getSigners()
        //     // for loop to go through accounts calling. Start w index 1 because 0 is the deployer
        //     for (let i = 1; i < 6; i++){
        //         // right now fundMe is connected to deployer so if we call it the deployer will be doing it
        //         // so we need to use "connect" to connect the new accounts
        //         const fundMeConnectedContract = await fundMe.connect(accounts[i])
        //         await fundMeConnectedContract.fund({ value: sendValue })
        //     }
        //     const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address) // gets intial balance of contract
        //     const startingDeployerBalance = await fundMe.provider.getBalance(deployer)

        //     // ACT
        //     const transactionResponse = await fundMe.cheaperWithdraw()
        //     const transactionReceipt = await transactionResponse.wait(1)
        //     const { gasUsed, effectiveGasPrice } = transactionReceipt // pulling out an object out of another object with {}
        //     const gasCost = gasUsed.mul(effectiveGasPrice) // .mul instead of * cuz its Big Number

        //     // ASSERT
        //     const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
        //     const endingDeployerBalance = await fundMe.provider.getBalance(deployer)

        //     assert.equal(endingFundMeBalance, 0)
        //     // here we do .add because we are working with "big number" (look it up)
        //     assert.equal(startingFundMeBalance.add(startingDeployerBalance).toString(),
        //     endingDeployerBalance.add(gasCost).toString()) // need to include gas cost to deploy function, add gas cost because the actual value in deployers account is less than the first half of assert because they paid the gas cost to deploy withdraw so that is why we add

        //     // make sure that the s_funders are reset properly
        //     await expect(fundMe.s_funders(0)).to.be.reverted // we expect calling at that index to give an error cuz its an empty array

        //     // make sure all accounts have balance of zero in mapping
        //     for (i = 1; i < 6; i++) {
        //         assert.equal(await fundMe.s_addressToAmountFunded(accounts[i].address), 0)
        //     }
        // })
      });
    });
