// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { network, run } = require("hardhat")

const { deployApiConsumer } = require("./deployApiConsumer")
const { deployAutomationCounter } = require("./deployAutomationCounter")
const { deployPriceConsumerV3 } = require("./deployPriceConsumerV3")
const { deployRandomNumberConsumer } = require("./deployRandomNumberConsumer")
const {
    deployRandomNumberDirectFundingConsumer,
} = require("./deployRandomNumberDirectFundingConsumer")
const { deployWynToken } = require("./deployWynToken")
const { deployRaffleEngine } = require("./deployRaffleEngine")

async function main() {
    await run("compile")
    const chainId = network.config.chainId
    // await deployApiConsumer(chainId)
    // await deployAutomationCounter(chainId)
    // await deployPriceConsumerV3(chainId)
    // await deployRandomNumberConsumer(chainId)
    // await deployRandomNumberDirectFundingConsumer(chainId)
    
    //let wynTokenAddress = await deployWynToken(chainId);
    await deployRaffleEngine(chainId, "0x1f1a79326dFd3Cd9C32D4C2702CA404ADd56267F");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
