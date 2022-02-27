import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumberish } from 'ethers'
import hardhat, { ethers } from 'hardhat'

async function evmMine() {
  await ethers.provider.send('evm_mine', [])
}

async function evmSnapshot(): Promise<string> {
  return ethers.provider.send('evm_snapshot', [])
}

async function evmRevert(id: string): Promise<void> {
  await ethers.provider.send('evm_revert', [id])
}

async function impersonate(address: string): Promise<SignerWithAddress> {
  await hardhat.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [address],
  })
  return ethers.getSigner(address)
}

async function increaseTime(seconds: BigNumberish) {
  await ethers.provider.send('evm_increaseTime', [seconds])
  await ethers.provider.send('evm_mine', [])
}

export { evmMine, evmSnapshot, evmRevert, impersonate, increaseTime }
