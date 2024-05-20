const { network, ethers } = require("hardhat")
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers")
const { networkConfig, developmentChains } = require("../../helper-hardhat-config")
const { numToBytes32 } = require("../../helper-functions")
const { assert, expect } = require("chai")
const { BigNumber } = require("ethers")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("WynToken Unit Tests", async function () {
        const BigNumber = ethers.BigNumber
        const initialWyns = 250
          //set log level to ignore non errors
          ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR)

          // We define a fixture to reuse the same setup in every test.
          // We use loadFixture to run this setup once, snapshot that state,
          // and reset Hardhat Network to that snapshot in every test.
          async function deployAWynTokenFixture() {
              const [deployer] = await ethers.getSigners()

              const chainId = network.config.chainId

              const wynTokenFactory = await ethers.getContractFactory("WynToken")
              const wynToken = await wynTokenFactory
                  .connect(deployer)
                  .deploy(deployer.address, initialWyns)
              return { wynToken, deployer }
          }
          describe("#Basic Setup", async function () {
              describe("success", async function () {
                  it("Deployer should be owner", async function () {
                    const { wynToken, deployer } = await loadFixture(deployAWynTokenFixture)
                    const owner = await wynToken.owner()
                    expect(owner).to.be.equal(deployer.address)
                })
                it(`Should start with ${initialWyns} wyns`, async function () {
                    const { wynToken, deployer } = await loadFixture(deployAWynTokenFixture)
                    const deployerBalance = await wynToken.balanceOf(deployer.address)
                    const intialSupply = BigNumber.from(initialWyns)
                    const decimals = BigNumber.from(await wynToken.decimals())
                    const expectedBalance = intialSupply.mul(BigNumber.from(10).pow(decimals))
                    assert(deployerBalance.eq(expectedBalance), `Deployer balance is not ${initialWyns} wyns`)
                })
              })
          })
      })