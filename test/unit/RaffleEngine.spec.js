const { network } = require("hardhat")
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers")
const { networkConfig, developmentChains } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Engine Tests", async function () {
          // We define a fixture to reuse the same setup in every test.
          // We use loadFixture to run this setup once, snapshot that state,
          // and reset Hardhat Network to that snapshot in every test.
          const [deployer, accountA, accountB] = await ethers.getSigners()
          async function deployRaffleEngine() {
              /**
               * @dev Read more at https://docs.chain.link/docs/chainlink-vrf/
               */
              const BASE_FEE = "100000000000000000"
              const GAS_PRICE_LINK = "1000000000" // 0.000000001 LINK per gas

              const chainId = network.config.chainId

              const VRFCoordinatorV2MockFactory = await ethers.getContractFactory(
                  "VRFCoordinatorV2Mock"
              )
              const VRFCoordinatorV2Mock = await VRFCoordinatorV2MockFactory.deploy(
                  BASE_FEE,
                  GAS_PRICE_LINK
              )

              const fundAmount = networkConfig[chainId]["fundAmount"] || "1000000000000000000"
              const transaction = await VRFCoordinatorV2Mock.createSubscription()
              const transactionReceipt = await transaction.wait(1)
              const subscriptionId = ethers.BigNumber.from(transactionReceipt.events[0].topics[1])
              await VRFCoordinatorV2Mock.fundSubscription(subscriptionId, fundAmount)

              const vrfCoordinatorAddress = VRFCoordinatorV2Mock.address
              const keyHash =
                  networkConfig[chainId]["keyHash"] ||
                  "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc"
              const wynTokenFactory = await ethers.getContractFactory("WynToken")
              const wynToken = await wynTokenFactory.connect(deployer).deploy(deployer.address, 200)
              const raffleEngineFactory = await ethers.getContractFactory(
                  "RaffleEngine"
              )
              const raffleEngine = await raffleEngineFactory
                  .connect(deployer)
                  .deploy(deployer.address, wynToken.address, subscriptionId, vrfCoordinatorAddress, keyHash)

              await VRFCoordinatorV2Mock.addConsumer(subscriptionId, raffleEngine.address)

              return { raffleEngine, VRFCoordinatorV2Mock, wynToken }
          }

          describe("#RaffleEngine", async function () {
              describe("success", async function () {
                  it("Should have the owner be deployer", async function () {
                      const { raffleEngine } = await loadFixture(
                        deployRaffleEngine
                      )
                    expect(await raffleEngine.owner()).to.be.equal(deployer.address)
                  })
              })
              describe("success", async function () {
                it("Should make a raffle ", async function () {
                    const { raffleEngine, wynToken} = await loadFixture(
                      deployRaffleEngine
                    )
                    let minimumTicketPrice = await raffleEngine.getMinTicketPrice()
                    await wynToken.approve(raffleEngine.address, 10);
                    await raffleEngine.createRaffle(4, 10, minimumTicketPrice);
                    let raffles = await raffleEngine.getMyRaffles();
                    expect(raffles.length).to.be.equal(1)
                })
                it("Should allow someone to participate in a raffle buying tickets", async function () {
                    const { raffleEngine, wynToken} = await loadFixture(
                      deployRaffleEngine
                    )
                    let minimumTicketPrice = await raffleEngine.getMinTicketPrice()
                    await wynToken.approve(raffleEngine.address, 10);
                    await raffleEngine.createRaffle(4, 10, minimumTicketPrice);
                    await wynToken.transfer(accountA.address, minimumTicketPrice);
                    await wynToken.connect(accountA).approve(raffleEngine.address, minimumTicketPrice);
                    await raffleEngine.connect(accountA).buyTickets(0,1)
                    let ticketSold = await raffleEngine.getAllRaffleTicketsById(0);
                    expect(ticketSold.length).to.be.equal(1)
                })
                it("Should complete the raffle if someone buys all the tickets", async function () {
                    const { raffleEngine, wynToken} = await loadFixture(
                      deployRaffleEngine
                    )
                    let minimumTicketPrice = await raffleEngine.getMinTicketPrice()
                    await wynToken.approve(raffleEngine.address, 10);
                    await raffleEngine.createRaffle(4, 10, minimumTicketPrice);
                    await wynToken.transfer(accountA.address, minimumTicketPrice.mul(4));
                    await wynToken.connect(accountA).approve(raffleEngine.address, minimumTicketPrice.mul(4));
                    await raffleEngine.connect(accountA).buyTickets(0,4)
                    
                    
                })
            })
          })
          
      })