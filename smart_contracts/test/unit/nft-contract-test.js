const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const {
  getAmountInWei,
  getAmountFromWei,
  developmentChains,
} = require("../../utils/helpers");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("AART collection contract Unit Tests", () => {
      let owner;
      let nftContract;

      const mintFee = getAmountInWei(10); // mint fee = 10 MATIC
      const TEST_URI = "ipfs://test-nft-uri";

      before(async () => {
        [owner, user1, randomUser] = await ethers.getSigners();
      });

      describe("Correct Deployement", () => {
        before(async () => {
          // Deploy NFT Collection contract
          const NFTContract = await ethers.getContractFactory("AARTCollection");
          nftContract = await NFTContract.deploy(mintFee);
          await nftContract.deployed();
        });
        it("NFT contract should have correct owner address", async () => {
          const ownerAddress = await owner.getAddress();
          expect(await nftContract.owner()).to.equal(ownerAddress);
        });
        it("NFT contract should have correct initial parameters", async () => {
          expect(await nftContract.getMintingFee()).to.equal(mintFee);
          expect(await nftContract.paused()).to.equal(1);
        });
      });

      describe("Core Functions", () => {
        describe("mintNFT()", () => {
          before(async () => {
            const NFTContract = await ethers.getContractFactory(
              "AARTCollection"
            );
            nftContract = await NFTContract.deploy(mintFee);
            await nftContract.deployed();
          });
          it("should not allow user to mint NFT when contract is paused", async () => {
            await expect(
              nftContract
                .connect(user1)
                .mintNFT(user1.address, TEST_URI, { value: mintFee })
            ).to.be.revertedWithCustomError(
              nftContract,
              "AART__ContractIsPaused"
            );
          });
          it("should allow user to mint NFT when contract isn't paused", async () => {
            // unpause contract
            await nftContract.connect(owner).pause(2);

            await nftContract
              .connect(user1)
              .mintNFT(user1.address, TEST_URI, { value: mintFee });

            const tokenId = 0;
            expect(await nftContract.balanceOf(user1.address)).to.equal(1);
            expect(await nftContract.ownerOf(tokenId)).to.equal(user1.address);
            expect(await nftContract.tokenURI(tokenId)).to.equal(TEST_URI);

            // Check user wallet
            const wallet = await nftContract.getUserNfts(user1.address);
            expect(wallet.length).to.equal(1);
            expect(wallet[0].id).to.equal(tokenId);
            expect(wallet[0].uri).to.equal(TEST_URI);
          });
          it("should revert when exact mint fee is not sent", async () => {
            const wrongFee = getAmountInWei(1);
            await expect(
              nftContract
                .connect(user1)
                .mintNFT(user1.address, TEST_URI, { value: wrongFee })
            ).to.be.revertedWithCustomError(
              nftContract,
              "AART__InsufficientAmount"
            );
          });
        });
        describe("mintWithRoyalty()", () => {
          let RoyaltyReceiver;
          const RoyaltyFeeBPS = 100; // 1%

          before(async () => {
            const NFTContract = await ethers.getContractFactory(
              "AARTCollection"
            );
            nftContract = await NFTContract.deploy(mintFee);
            await nftContract.deployed();

            RoyaltyReceiver = user1.address;
          });
          it("should not allow user to mint NFT when contract is paused", async () => {
            await expect(
              nftContract
                .connect(user1)
                .mintWithRoyalty(
                  user1.address,
                  TEST_URI,
                  RoyaltyReceiver,
                  RoyaltyFeeBPS,
                  {
                    value: mintFee,
                  }
                )
            ).to.be.revertedWithCustomError(
              nftContract,
              "AART__ContractIsPaused"
            );
          });
          it("should allow user to mint NFT when contract isn't paused", async () => {
            // unpause contract
            await nftContract.connect(owner).pause(2);

            await nftContract
              .connect(user1)
              .mintWithRoyalty(
                user1.address,
                TEST_URI,
                RoyaltyReceiver,
                RoyaltyFeeBPS,
                {
                  value: mintFee,
                }
              );

            const tokenId = 0;
            expect(await nftContract.balanceOf(user1.address)).to.equal(1);
            expect(await nftContract.ownerOf(tokenId)).to.equal(user1.address);
            expect(await nftContract.tokenURI(tokenId)).to.equal(TEST_URI);

            // Check user wallet
            const wallet = await nftContract.getUserNfts(user1.address);
            expect(wallet.length).to.equal(1);
            expect(wallet[0].id).to.equal(tokenId);
            expect(wallet[0].uri).to.equal(TEST_URI);
          });
          const tokenId = 0;
          it("should set correct user royalty info", async () => {
            // Check user Royalty
            const royaltyInfo = await nftContract.royaltyInfo(tokenId, 10000);
            expect(royaltyInfo[0]).to.equal(RoyaltyReceiver);
            expect(royaltyInfo[1]).to.equal(RoyaltyFeeBPS);
          });

          it("should revert when exact mint fee is not sent", async () => {
            const wrongFee = getAmountInWei(1);
            await expect(
              nftContract
                .connect(user1)
                .mintWithRoyalty(
                  user1.address,
                  TEST_URI,
                  RoyaltyReceiver,
                  RoyaltyFeeBPS,
                  {
                    value: wrongFee,
                  }
                )
            ).to.be.revertedWithCustomError(
              nftContract,
              "AART__InsufficientAmount"
            );
          });
        });
      });

      describe("Owner Functions", () => {
        before(async () => {
          const NFTContract = await ethers.getContractFactory("AARTCollection");
          nftContract = await NFTContract.deploy(mintFee);
          await nftContract.deployed();
        });

        it("only owner should be allowed to change NFT contract parametres & withdraw balance", async () => {
          await expect(
            nftContract.connect(randomUser).setMintFee(getAmountInWei(1))
          ).to.be.revertedWith("Ownable: caller is not the owner");
          await expect(
            nftContract.connect(randomUser).pause(2)
          ).to.be.revertedWith("Ownable: caller is not the owner");
          await expect(
            nftContract.connect(randomUser).withdraw()
          ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("owner should be allowed to unpause NFT Contract", async () => {
          expect(await nftContract.paused()).to.equal(1);
          // unpause contract
          await nftContract.connect(owner).pause(2);
          expect(await nftContract.paused()).to.equal(2);
        });

        it("owner should be able to withdraw contract balance", async () => {
          expect(await nftContract.getMintingFee()).to.equal(mintFee);
          // mint an NFT
          await nftContract
            .connect(user1)
            .mintNFT(user1.address, TEST_URI, { value: mintFee });

          const ownerInitialBalance = getAmountFromWei(
            await owner.getBalance()
          );
          await nftContract.connect(owner).withdraw();
          const ownerFinalBalance = getAmountFromWei(await owner.getBalance());

          const expectedBalance =
            ownerInitialBalance + getAmountFromWei(mintFee);
          // withdraw call cost some gas so we to account for it
          expect(parseFloat(ownerFinalBalance).toFixed(2)).to.be.equal(
            parseFloat(expectedBalance).toFixed(2)
          );
        });

        it("owner should be able to change minting fee", async () => {
          expect(await nftContract.getMintingFee()).to.equal(mintFee);
          // update mint fee
          const newFee = getAmountInWei(20);
          await nftContract.connect(owner).setMintFee(newFee);
          expect(await nftContract.getMintingFee()).to.equal(newFee);
        });
      });
    });
