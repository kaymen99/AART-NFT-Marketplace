const { ethers } = require("hardhat");

const developmentChains = ["hardhat", "localhost", "ganache"];

function getAmountInWei(amount) {
  return ethers.parseEther(amount.toString(), "ether");
}

function getAmountFromWei(amount) {
  return Number(ethers.formatUnits(amount.toString(), "ether"));
}

async function resetTime() {
  const now = Math.floor(new Date().getTime() / 1000);
  const blockNumber = await ethers.provider.getBlockNumber();
  const timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp;
  const shift = now - timestamp;
  await ethers.provider.send("evm_increaseTime", [shift]);
  await ethers.provider.send("evm_mine");
}

async function moveTimeTo(target) {
  const now = Math.floor(new Date().getTime() / 1000);
  const delta = target - now;
  await ethers.provider.send("evm_increaseTime", [delta]);
  await ethers.provider.send("evm_mine");
}

async function deployContract(name, args) {
  const contract = await ethers.deployContract(name, args);
  await contract.waitForDeployment();
  return contract;
}

async function mintERC20(account, erc20Address, amount) {
  const erc20 = await ethers.getContractAt("IERC20Mock", erc20Address);
  const mint_tx = await erc20
    .connect(account)
    .mint(account.address, getAmountInWei(amount));
  await mint_tx.wait(1);
}

async function approveERC20(account, erc20Address, approvedAmount, spender) {
  const erc20 = await ethers.getContractAt("IERC20Mock", erc20Address);

  const tx = await erc20.connect(account).approve(spender, approvedAmount);
  await tx.wait(1);
}

async function mintNewNFT(nftContract, account) {
  const mintFee = await nftContract.mintFee();
  const TEST_URI = "ipfs://test-nft-uri";
  await nftContract
    .connect(account)
    .mintNFT(account.address, TEST_URI, { value: mintFee });
}

async function mintNewNFTWithRoyalty(nftContract, account, royaltyFee) {
  const mintFee = await nftContract.mintFee();
  const TEST_URI = "ipfs://test-nft-uri";
  await nftContract
    .connect(account)
    .mintWithRoyalty(account.address, TEST_URI, account.address, royaltyFee, {
      value: mintFee,
    });
}

async function approveERC721(account, nftContract, tokenId, spender) {
  const tx = await nftContract.connect(account).approve(spender, tokenId);
  await tx.wait(1);
}

module.exports = {
  developmentChains,
  getAmountFromWei,
  getAmountInWei,
  deployContract,
  mintERC20,
  approveERC20,
  resetTime,
  moveTimeTo,
  mintNewNFT,
  mintNewNFTWithRoyalty,
  approveERC721,
};
