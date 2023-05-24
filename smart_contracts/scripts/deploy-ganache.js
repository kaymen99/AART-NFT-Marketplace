const hre = require("hardhat");
const fs = require("fs");
const fse = require("fs-extra");
const { getAmountInWei, deployERC20Mock } = require("../utils/helpers");

async function main() {
  const deployNetwork = hre.network.name;
  const mintCost = getAmountInWei(10); // 10 matic

  // Deploy DAI ERC20 mock
  const mockDAI = await deployERC20Mock(18);

  // Deploy AART Artists contract
  const ArtistsContract = await ethers.getContractFactory("AARTArtists");
  const artistsContract = await ArtistsContract.deploy();
  await artistsContract.deployed();

  // Deploy AART NFT Collection contract
  const NFTContract = await ethers.getContractFactory("AARTCollection");
  const nftContract = await NFTContract.deploy(
    artistsContract.address,
    mintCost
  );
  await nftContract.deployed();

  // unpause NFT contract
  await nftContract.pause(2);

  // Deploy AART market contract
  const MarketContract = await ethers.getContractFactory("AARTMarket");
  const marketContract = await MarketContract.deploy(nftContract.address);
  await marketContract.deployed();

  // add mock DAI to market supported tokens
  await marketContract.addSupportedToken(mockDAI.address);

  console.log("AART Artists contract deployed at:\n", artistsContract.address);
  console.log("AART NFT contract deployed at:\n", nftContract.address);
  console.log("AART market ontract deployed at:\n", marketContract.address);
  console.log("Network deployed to :\n", deployNetwork);

  /* transfer contracts addresses & ABIs to the front-end */
  if (fs.existsSync("../front-end/src")) {
    fs.rmSync("../src/artifacts", { recursive: true, force: true });
    fse.copySync("./artifacts/contracts", "../front-end/src/artifacts");
    fs.writeFileSync(
      "../front-end/src/utils/contracts-config.js",
      `
      export const marketContractAddress = "${marketContract.address}"
      export const nftContractAddress = "${nftContract.address}"
      export const artistsContractAddress = "${artistsContract.address}"
      export const ownerAddress = "${nftContract.signer.address}"
      export const networkDeployedTo = "${hre.network.config.chainId}"
      export const mockDAIAddress = "${mockDAI.address}"`
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
