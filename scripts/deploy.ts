import { ethers } from 'hardhat'

async function main() {
  const Grebz = await ethers.getContractFactory('Grebz')
  const grebz = await Grebz.deploy('Hello, Hardhat!')

  await grebz.deployed()

  console.log('Grebz deployed to:', grebz.address)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
