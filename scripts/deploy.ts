import { ethers } from 'hardhat'

const PLACEHOLDER_URI = 'https://example.com'

async function main() {
  const Grebz = await ethers.getContractFactory('Grebz')
  const grebz = await Grebz.deploy(PLACEHOLDER_URI)

  await grebz.deployed()

  console.log('Grebz deployed to:', grebz.address)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
