const { ethers, network, run } = require("hardhat")
const {
    VERIFICATION_BLOCK_CONFIRMATIONS,
    networkConfig,
    developmentChains,
} = require("../../helper-hardhat-config")
const HARDHAT_CHAIN_ID = 31337


async function deployRaffleEngine(chainId, wynTokenAddress) {
    let VRFCoordinatorV2Mock
    let subscriptionId 
    let vrfCoordinatorAddress
    let keyHash

    if (chainId == HARDHAT_CHAIN_ID) {
        const BASE_FEE = "100000000000000000"
        const GAS_PRICE_LINK = "1000000000" // 0.000000001 LINK per gas

        const VRFCoordinatorV2MockFactory = await ethers.getContractFactory("VRFCoordinatorV2Mock")
        VRFCoordinatorV2Mock = await VRFCoordinatorV2MockFactory.deploy(BASE_FEE, GAS_PRICE_LINK)
        vrfCoordinatorAddress = VRFCoordinatorV2Mock.address

        const fundAmount = networkConfig[chainId]["fundAmount"] || "1000000000000000000"
        const transaction = await VRFCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transaction.wait(1)
        subscriptionId = ethers.BigNumber.from(transactionReceipt.events[0].topics[1])
        await VRFCoordinatorV2Mock.fundSubscription(subscriptionId, fundAmount)
    } else if(chainId == 11155111) {
        subscriptionId =  11906
        vrfCoordinatorAddress = "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625" // sepolia
        keyHash = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c"
    }

    //set log level to ignore non errors
    console.log(wynTokenAddress)
    if( wynTokenAddress == undefined){
        console.error("WynToken address is required")
        return
    }
    ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR)

    const accounts = await ethers.getSigners()
    const deployer = accounts[0]
    const raffleEngineFactory = await ethers.getContractFactory("RaffleEngine")
    raffleEngine= await raffleEngineFactory.connect(deployer).deploy(
                                                                    deployer.address, 
                                                                    wynTokenAddress,
                                                                    subscriptionId,
                                                                    vrfCoordinatorAddress,
                                                                    keyHash
                                                                    , { gasLimit: 30_000_000 })

    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS
    await raffleEngine.deployTransaction.wait(waitBlockConfirmations)

    console.log(`Raffle Engine deployed to ${raffleEngine.address} on ${network.name}`)
    

    // if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    //     await run("verify:verify", {
    //         address: randomNumberConsumerV2.address,
    //         constructorArguments: [subscriptionId, vrfCoordinatorAddress, keyHash],
    //     })
    // }

    if (chainId == HARDHAT_CHAIN_ID) {
        VRFCoordinatorV2Mock.addConsumer(subscriptionId, raffleEngine.address)
    }
    // console.log(`Verifying contract on Etherscan...`);

    // await run(`verify:verify`, {
    //     address: wynToken.address,
    //     constructorArguments: [deployer.address, 200],
    // });
}

module.exports = {
    deployRaffleEngine,
}