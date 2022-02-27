/* eslint-disable node/no-missing-import */
/* eslint-disable no-unused-vars */
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { BigNumber, BigNumberish, ContractTransaction } from 'ethers'
import { ethers } from 'hardhat'

import { evmSnapshot, evmRevert } from './utils'

import MerkleTree, { MerkleTreeLeaf } from '../src/merkleTree'
import { Grebz } from '../typechain'

const ZERO_BYTES =
  '0x0000000000000000000000000000000000000000000000000000000000000000'
const PLACEHOLDER_URI = 'https://example.com'

// Test parameters.
const MAX_TREE_SIZE_TO_TEST = 9

describe('Grebz unit tests', () => {
  // EVM snapshot.
  let initSnapshot: string

  // Contract instance.
  let contract: Grebz
  let contractAsUser: Grebz
  let contractAsOwner: Grebz

  // Accounts.
  let accounts: SignerWithAddress[]
  let addrs: string[]
  let deployer: SignerWithAddress
  let user: SignerWithAddress
  let owner: SignerWithAddress

  // Prices.
  let presalePrice: BigNumber
  let publicPrice: BigNumber

  // Max mint quantity.
  let maxPresaleMint: BigNumber

  // Max per tx.
  let MAX_PER_TX: BigNumber

  // Default Merkle tree to use for testing.
  let presaleTree: MerkleTree

  before(async () => {
    accounts = await ethers.getSigners()
    ;[deployer, user, owner] = accounts

    const factory = await ethers.getContractFactory('Grebz')
    contract = await factory.deploy(PLACEHOLDER_URI)
    await (await contract.transferOwnership(owner.address)).wait()
    contractAsUser = contract.connect(user)
    contractAsOwner = contract.connect(owner)
    await contract.deployed()

    addrs = accounts.map((a) => a.address)

    presalePrice = await contract.PRESALE_PRICE()
    publicPrice = await contract.PUBLIC_PRICE()

    maxPresaleMint = await contract.MAX_PRESALE_MINT()

    MAX_PER_TX = await contract.MAX_PER_TX()

    presaleTree = new MerkleTree([[addrs[0]], [addrs[1]]])

    // Take a snapshot of the initial contract state.
    initSnapshot = await evmSnapshot()
  })

  beforeEach(async () => {
    // Reset the contract state before each test case.
    await evmRevert(initSnapshot)
    initSnapshot = await evmSnapshot()
  })

  describe('owner functions', () => {
    it('togglePresale', async () => {
      await contractAsOwner.togglePresale()
      expect(await contract.presaleOpen()).to.equal(true)
    })
    it('setBaseURI', async () => {
      await contractAsOwner.giveAway(owner.address, 1)

      expect(await contract.isFinalized()).to.equal(false)
      expect(await contract.tokenURI(0)).to.equal(PLACEHOLDER_URI)

      await contractAsOwner.setBaseURI('ipfs://mock-cid-1/')
      await contractAsOwner.finalize()

      expect(await contract.isFinalized()).to.equal(true)
      expect(await contract.tokenURI(0)).to.equal('ipfs://mock-cid-1/0.json')
    })
    it('finalize', async () => {
      await contractAsOwner.giveAway(owner.address, 1)
      await contractAsOwner.setBaseURI('ipfs://mock-cid-1/')

      await contractAsOwner.finalize()

      expect(await contract.isFinalized()).to.equal(true)
      expect(await contract.tokenURI(0)).to.equal('ipfs://mock-cid-1/0.json')
      await expect(
        contractAsOwner.setBaseURI('ipfs://mock-cid-2/')
      ).to.be.revertedWith('Metadata is finalized')
    })
    it('setPresaleMerkleRoot', async function () {
      await contractAsOwner.setPresaleMerkleRoot(presaleTree.getRoot())
    })
    it('togglePublicSale', async () => {
      await contractAsOwner.togglePublicSale()
      expect(await contract.publicSaleOpen()).to.equal(true)
    })
    it('giveAway', async () => {
      await contractAsOwner.giveAway(owner.address, 1)
      expect(await contract.totalSupply()).to.equal(1)
    })
  })
  describe('pre-sale minting', async () => {
    // Initial setup: activate the pre-sale and set whitelist accounts.
    let leaves: MerkleTreeLeaf[]

    before(async () => {
      leaves = [
        [addrs[0]],
        [addrs[1]],
        [addrs[2]],
        [addrs[3]],
        [addrs[4]],
        [addrs[5]],
        [addrs[6]],
        [addrs[7]],
        [addrs[8]],
        [addrs[9]],
      ]
      if (leaves.length < MAX_TREE_SIZE_TO_TEST) {
        throw new Error('Invalid MAX_TREE_SIZE_TO_TEST')
      }
    })
    beforeEach(async () => {
      // Initial setup: activate the presale and use the default presale tree.
      await contractAsOwner.togglePresale()
      await contractAsOwner.setPresaleMerkleRoot(presaleTree.getRoot())
    })
    it('succesfully pre-sale minting', async () => {
      const contractFromAccount0 = contract.connect(accounts[0])

      await contractFromAccount0.presaleMint(
        1,
        presaleTree.getProof(addrs[0]),
        {
          value: presalePrice,
        }
      )

      expect(await contract.totalSupply()).to.equal(1)
      await expectWithdrawBalance(presalePrice)
    })
    it('successfully mints in multiple transactions', async () => {
      const contractFromAccount0 = contract.connect(accounts[0])

      await contractFromAccount0.presaleMint(
        2,
        presaleTree.getProof(addrs[0]),
        {
          value: presalePrice.mul(2),
        }
      )

      expect(await contract.totalSupply()).to.equal(2)
      await expectWithdrawBalance(presalePrice.mul(2))
    })
    it('cannot mint if pre-sale is not open', async () => {
      await contractAsOwner.togglePresale()
      const contractFromAccount0 = contract.connect(accounts[0])

      await expect(
        contractFromAccount0.presaleMint(2, presaleTree.getProof(addrs[0]), {
          value: presalePrice.mul(2),
        })
      ).to.be.revertedWith('Pre-sale is not open')
    })
    it('cannot mint if quantity more than preSaleMaxMint', async () => {
      const contractFromAccount0 = contract.connect(accounts[0])

      await expect(
        contractFromAccount0.presaleMint(3, presaleTree.getProof(addrs[0]), {
          value: presalePrice.mul(3),
        })
      ).to.be.revertedWith('exceeded max per wallet')
    })
    it('cannot mint if quantity of tokens to be less than or equal to 0', async () => {
      const contractFromAccount0 = contract.connect(accounts[0])

      await expect(
        contractFromAccount0.presaleMint(0, presaleTree.getProof(addrs[0]), {
          value: presalePrice,
        })
      ).to.be.revertedWith(
        'quantity of tokens cannot be less than or equal to 0'
      )
    })
    it('cannot mint if insufficient ether value', async () => {
      const contractFromAccount0 = contract.connect(accounts[0])
      const discountAmount = ethers.utils.parseEther('0.01')

      await expect(
        contractFromAccount0.presaleMint(1, presaleTree.getProof(addrs[0]), {
          value: presalePrice.sub(discountAmount),
        })
      ).to.be.revertedWith('insufficient ether value')
    })
    it('cannot mint if Merkle root is not set', async function () {
      await contractAsOwner.setPresaleMerkleRoot(ZERO_BYTES)
      await expect(
        contract.presaleMint(1, presaleTree.getProof(addrs[0]), {
          value: presalePrice,
        })
      ).to.be.revertedWith('Invalid Merkle proof')
    })
    it('cannot mint if Merkle root is set to the root of a different tree', async () => {
      const contractFromAccount1 = contract.connect(accounts[1])
      const newTree = new MerkleTree([[addrs[0]], [addrs[1]]])
      await contractAsOwner.setPresaleMerkleRoot(newTree.getRoot())
      await expect(
        contractFromAccount1.presaleMint(1, presaleTree.getProof(addrs[0]), {
          value: presalePrice,
        })
      ).to.be.revertedWith('Invalid Merkle proof')
    })
    it('cannot mint with a proof that does not match the sender', async () => {
      const contractFromAccount1 = contract.connect(accounts[1])
      const proof = presaleTree.getProof(addrs[0])
      await expect(
        contractFromAccount1.presaleMint(1, proof, {
          value: presalePrice,
        })
      ).to.be.revertedWith('Invalid Merkle proof')
    })
  })
  describe('public minting', async () => {
    beforeEach(async () => {
      await contractAsOwner.togglePublicSale()
    })
    it('successfully mints in multiple transactions', async () => {
      const contractFromAccount1 = contract.connect(accounts[1])

      await contractFromAccount1.publicMint(2, {
        value: publicPrice.mul(2),
      })

      expect(await contract.totalSupply()).to.equal(2)
      await expectWithdrawBalance(publicPrice.mul(2))
    })
    it('cannot mint if public sale is not open', async () => {
      const contractFromAccount1 = contract.connect(accounts[1])

      await contractAsOwner.togglePublicSale()
      expect(await contract.publicSaleOpen()).to.equal(false)

      await expect(
        contractFromAccount1.publicMint(2, {
          value: publicPrice.mul(2),
        })
      ).to.be.revertedWith('Public Sale is not open')
    })
    it('cannot mint if quantity of tokens to be less than or equal to 0', async () => {
      await expect(
        contractAsUser.publicMint(0, {
          value: publicPrice,
        })
      ).to.be.revertedWith(
        'quantity of tokens cannot be less than or equal to 0'
      )
    })
    it('cannot mint if insufficient ether value', async () => {
      const discountAmount = ethers.utils.parseEther('0.01')

      await expect(
        contractAsUser.publicMint(1, {
          value: publicPrice.sub(discountAmount),
        })
      ).to.be.revertedWith('insufficient ether value')
    })
    it('can mint the max mint per tx, but not more', async () => {
      // Canot mint the max mint per tx.
      contractAsUser.publicMint(MAX_PER_TX, {
        value: publicPrice.mul(MAX_PER_TX),
      })
      expect(await contract.totalSupply()).to.equal(MAX_PER_TX)
      // Canot mint in exccess of the max mint per tx.
      const moreThanMaxPerTx = MAX_PER_TX.add(1)

      await expect(
        contractAsUser.publicMint(moreThanMaxPerTx, {
          value: publicPrice.mul(moreThanMaxPerTx),
        })
      ).to.be.revertedWith('exceed max per transaction')

      expect(await contract.totalSupply()).to.equal(MAX_PER_TX)
    })
  })
  async function expectWithdrawBalance(
    expectedBalance: BigNumberish
  ): Promise<ContractTransaction> {
    const balanceBefore = await ethers.provider.getBalance(owner.address)
    const tx = contractAsOwner.withdraw()
    const receipt = await (await tx).wait()
    const gasPaid = receipt.gasUsed.mul(receipt.effectiveGasPrice)
    const balanceAfter = await ethers.provider.getBalance(owner.address)
    expect(balanceAfter.sub(balanceBefore)).to.equal(
      BigNumber.from(expectedBalance).sub(gasPaid)
    )
    return tx
  }
})
