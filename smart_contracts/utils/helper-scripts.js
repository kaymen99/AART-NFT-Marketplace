const { ethers } = require("hardhat");

const developmentChains = ["hardhat", "localhost", "ganache"];

function getAmountInWei(amount) {
  return ethers.utils.parseEther(amount.toString(), "ether");
}
function getAmountFromWei(amount) {
  return Number(ethers.utils.formatUnits(amount.toString(), "ether"));
}

async function moveTime(waitingPeriod) {
  await ethers.provider.send("evm_increaseTime", [waitingPeriod]);
  await ethers.provider.send("evm_mine");
}

async function deployERC20Mock() {
  const Mock = await hre.ethers.getContractFactory("ERC20Mock");
  const mockContract = await Mock.deploy();
  await mockContract.deployed();

  return mockContract;
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

module.exports = {
  developmentChains,
  getAmountFromWei,
  getAmountInWei,
  deployERC20Mock,
  mintERC20,
  approveERC20,
  moveTime,
};
