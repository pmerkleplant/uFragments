import { ethers, upgrades, waffle } from 'hardhat'
import { Contract, Signer, BigNumber } from 'ethers'
import { expect } from 'chai'

const DECIMALS = 9
const INITIAL_SUPPLY = ethers.utils.parseUnits('50', 6 + DECIMALS)

let accounts: Signer[],
  deployer: Signer,
  someSigner: Signer,
  uFragments: Contract,
  flashBorrower: Contract,
  flashBorrowerNoRepay: Contract,
  initialSupply: BigNumber

async function setupContracts() {
  // prepare signers
  accounts = await ethers.getSigners()
  deployer = accounts[0]
  someSigner = accounts[1]
  // deploy upgradable token
  let factory = await ethers.getContractFactory('UFragments')
  uFragments = await upgrades.deployProxy(
    factory,
    [await deployer.getAddress()],
    {
      initializer: 'initialize(address)',
    },
  )
  // fetch initial supply
  initialSupply = await uFragments.totalSupply()

  // deploy FlashBorrower
  factory = await ethers.getContractFactory('FlashBorrower')
  flashBorrower = await factory.deploy(uFragments.address)

  // deploy FlashBorrowerNoRepay
  factory = await ethers.getContractFactory('FlashBorrowerNoRepay')
  flashBorrowerNoRepay = await factory.deploy(uFragments.address)
}

describe('UFragments-ERC3156:FlashFee', () => {
  before('setup contracts', setupContracts)

  const loanAmount = ethers.utils.parseUnits('10', 6 + DECIMALS)

  it('should fetch flashFee equal to zero', async function () {
    expect(await uFragments.flashFee(uFragments.address,
                                     loanAmount))
      .to.eq(0,)
  })

  it('should revert flashFee for address unqueal to own', async function () {
    await expect(uFragments.flashFee(await someSigner.getAddress(),
                                     loanAmount))
      .to.be.reverted
  })

  it('should revert flashFee for amount equal to zero', async function () {
    await expect(uFragments.flashFee(uFragments.address,
                                     ethers.BigNumber.from(0)))
      .to.be.reverted
  })

  it('should revert flashFee for amount > totalSupply', async function () {
    await expect(uFragments.flashFee(uFragments.address,
                                     INITIAL_SUPPLY.add(ethers.BigNumber.from(1))))
      .to.be.reverted
  })
})

describe('UFragments-ERC3156:MaxFlashLoan', () => {
  before('setup contracts', setupContracts)

  it('should fetch maxFlashLoan equal to totalSupply', async function () {
    expect(await uFragments.maxFlashLoan(uFragments.address))
      .to.eq(INITIAL_SUPPLY,)
  })

  it('should revert maxFlashLoan for address unequal to own', async function () {
    await expect(uFragments.maxFlashLoan(await someSigner.getAddress()))
      .to.be.reverted
  })
})

describe('UFragments-ERC3156:FlashLoan', () => {
  before('setup contracts', setupContracts)

  it('should successfully flash loan', async function () {
    expect(await flashBorrower.flashBorrow(uFragments.address,
                                           INITIAL_SUPPLY))
      .to.be.ok
  })

  it('should revert when repay not possible', async function () {
    await expect(flashBorrowerNoRepay.flashBorrow(uFragments.address,
                                                  INITIAL_SUPPLY))
      .to.be.reverted
  })

  it('should have the same supply before and after flash loan', async function () {
    expect(await uFragments.totalSupply()).to.eq(INITIAL_SUPPLY,)

    await flashBorrower.flashBorrow(uFragments.address, INITIAL_SUPPLY)

    expect(await uFragments.totalSupply()).to.eq(INITIAL_SUPPLY,)
  })
})
