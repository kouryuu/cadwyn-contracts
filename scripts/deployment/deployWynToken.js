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
    console.log(`Deploying on ${chainId} with ${deployer.address}`)
    let wynTokenOwner = deployer.address
    if(chainId == 137){
        wynTokenOwner = "0xb2f48E0740D8292dD8AC7eD9bE447928255d4Aa1"
        console.log(`Deploying WynToken to Polygon Mainnet with owner ${wynTokenOwner}`)
    }
    wynToken = await wynTokenFactory.connect(deployer).deploy(wynTokenOwner, 200)
    await wynToken.deployed()
    console.log(`WynToken deployed to ${wynToken.address}`)
    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS
    await wynToken.deployTransaction.wait(waitBlockConfirmations)
    let wynTokenAddress = await wynToken.address

    console.log(`WynToken deployed to ${wynToken.address} on ${network.name}`)

    console.log(`Verifying contract on Etherscan...`);

    await run(`verify:verify`, {
        address: wynToken.address,
        constructorArguments: [wynTokenOwner, 200],
    });
    return  wynTokenAddress 
}

module.exports = {
    deployWynToken,
}
