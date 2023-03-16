const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { developmentChains } = require("../../utils/helpers");

async function deploy() {
  const Contract = await ethers.getContractFactory("AARTArtists");
  let contract = await Contract.deploy();
  await contract.deployed();
  return contract;
}

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("AART Artists Profile contract Unit Tests", () => {
      let owner;
      let contract;

      const TEST_URI = "ipfs://test-nft-profile-uri";

      before(async () => {
        [owner, user1, randomUser] = await ethers.getSigners();
      });

      describe("Correct Deployement", () => {
        before(async () => {
          // Deploy NFT Collection contract
          contract = await deploy();
        });
        it("NFT contract should have correct owner address", async () => {
          const ownerAddress = await owner.getAddress();
          expect(await contract.owner()).to.equal(ownerAddress);
        });
      });

      describe("Core Functions", () => {
        describe("create()", () => {
          before(async () => {
            contract = await deploy();
          });
          it("should allow user to create artist profile", async () => {
            await contract.connect(user1).create(TEST_URI);

            console.log("created");

            const tokenId = 0;
            expect(await contract.balanceOf(user1.address)).to.equal(1);
            expect(await contract.ownerOf(tokenId)).to.equal(user1.address);
            expect(await contract.tokenURI(tokenId)).to.equal(TEST_URI);
            expect(await contract.hasProfile(user1.address)).to.equal(true);

            const profiles = await contract.getAllProfiles();
            expect(profiles.length).to.equal(1);
            expect(profiles[0].id).to.equal(tokenId);
            expect(profiles[0].uri).to.equal(TEST_URI);
          });
          it("should revert if user already has profile", async () => {
            await expect(
              contract.connect(user1).create(TEST_URI)
            ).to.be.revertedWithCustomError(
              contract,
              "AART__AlreadyRegistered"
            );
          });
        });
        describe("update()", () => {
          let tokenId;
          before(async () => {
            contract = await deploy();

            // create a new profile
            await contract.connect(user1).create(TEST_URI);
            tokenId = 0;
          });
          it("should revert if a user tries to update another user profile", async () => {
            const newUri = "ipfs://new-profile-uri";
            await expect(
              contract.connect(randomUser).update(tokenId, newUri)
            ).to.be.revertedWithCustomError(contract, "AART__OnlyTokenOwner");
          });
          it("should allow user to update his artist profile", async () => {
            const newUri = "ipfs://new-profile-uri";
            await contract.connect(user1).update(tokenId, newUri);

            expect(await contract.balanceOf(user1.address)).to.equal(1);
            expect(await contract.tokenURI(tokenId)).to.equal(newUri);
          });
        });
        describe("burn()", () => {
          let tokenId;
          before(async () => {
            contract = await deploy();

            // create a new profile
            await contract.connect(user1).create(TEST_URI);
            tokenId = 0;
          });
          it("should revert if a user tries to delete another user profile", async () => {
            await expect(
              contract.connect(randomUser).burn(tokenId)
            ).to.be.revertedWithCustomError(contract, "AART__OnlyTokenOwner");
          });
          it("should allow user to delete his artist profile", async () => {
            const tokenId = 0;
            await contract.connect(user1).burn(tokenId);

            expect(await contract.balanceOf(user1.address)).to.equal(0);
            expect(await contract.hasProfile(user1.address)).to.equal(false);
          });
        });
      });
    });
