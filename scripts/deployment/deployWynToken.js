const { ethers, network, run } = require("hardhat")
const {
    VERIFICATION_BLOCK_CONFIRMATIONS,
    networkConfig,
    developmentChains,
} = require("../../helper-hardhat-config")


async function deployWynToken(chainId) {
    //set log level to ignore non errors
    ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR)

    const accounts = await ethers.getSigners()
    const deployer = accounts[0]
    const wynTokenFactory = await ethers.getContractFactory("WynToken")
    wynToken = await wynTokenFactory.connect(deployer).deploy(deployer.address, 200)
    //await wynToken.deployed()
    //console.log(`WynToken deployed to ${wynToken.address}`)
    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS
    await wynToken.deployTransaction.wait(waitBlockConfirmations)
    let wynTokenAddress = await wynToken.address

    console.log(`WynToken deployed to ${wynToken.address} on ${network.name}`)

    console.log(`Verifying contract on Etherscan...`);

    // await run(`verify:verify`, {
    //     address: wynToken.address,
    //     constructorArguments: [deployer.address, 200],
    // });
    return  wynTokenAddress 
}

module.exports = {
    deployWynToken,
}
