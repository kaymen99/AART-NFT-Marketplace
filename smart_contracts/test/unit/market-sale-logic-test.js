const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const {
  mintNewNFT,
  mintNewNFTWithRoyalty,
  approveERC721,
  getAmountInWei,
  getAmountFromWei,
  developmentChains,
  mintERC20,
  approveERC20,
  deployContract,
} = require("../../utils/helpers");

const ListingStatus = { Active: 0, Sold: 1, Canceled: 2 };

const mintFee = getAmountInWei(10);

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("AART market Direct Sale Logic Unit Tests", () => {
      let owner;
      let nftContract;
      let artistsNftContract;
      let marketContract;
      let erc20Mock;

      let tokenId, paymentToken, price;

      async function deployNFTAndMarketContracts() {
        // Deploy NFT Collection contract
        nftContract = await deployContract("AARTCollection", [
          artistsNftContract.target,
          mintFee,
        ]);

        // unpause contract
        await nftContract.pause(2);

        // Deploy AART market contract
        marketContract = await deployContract("AARTMarket", [
          nftContract.target,
        ]);
      }

      async function listItem(token) {
        // allow to supported tokens
        if (token !== ethers.ZeroAddress) {
          await marketContract.connect(owner).addSupportedToken(token);
        }

        // mint new item
        await mintNewNFT(nftContract, user1);

        // create new offer
        tokenId = 0;
        price = getAmountInWei(10);

        await approveERC721(user1, nftContract, tokenId, marketContract.target);
        await marketContract.connect(user1).listItem(tokenId, token, price);
      }

      async function listItemWithRoyalty(token, royaltyFeeBPS) {
        // allow to supported tokens
        if (token !== ethers.ZeroAddress) {
          await marketContract.connect(owner).addSupportedToken(token);
        }

        // mint new NFT with royalty
        await mintNewNFTWithRoyalty(nftContract, user1, royaltyFeeBPS);

        tokenId = 0;
        // transfer NFT to user2 to test if royalty work
        await nftContract
          .connect(user1)
          .transferFrom(user1.address, user2.address, tokenId);

        price = getAmountInWei(20);
        await approveERC721(user2, nftContract, tokenId, marketContract.target);
        await marketContract.connect(user2).listItem(tokenId, token, price);
      }

      before(async () => {
        [owner, user1, user2, user3, randomUser] = await ethers.getSigners();

        erc20Mock = await deployContract("ERC20Mock", [18]);

        artistsNftContract = await deployContract("AARTArtists", []);

        // register user1, user2, user3, randomUser
        const TEST_URI = "ipfs://test-nft-profile-uri";

        await artistsNftContract.connect(user1).create(TEST_URI);
        await artistsNftContract.connect(user2).create(TEST_URI);
        await artistsNftContract.connect(user3).create(TEST_URI);
        await artistsNftContract.connect(randomUser).create(TEST_URI);
      });

      describe("listItem()", () => {
        before(async () => {
          await deployNFTAndMarketContracts();
        });
        it("should not allow user to list item with unsupported payment token", async () => {
          // mint new NFT
          await mintNewNFT(nftContract, user1);
          tokenId = 0;
          paymentToken = erc20Mock.target;
          price = getAmountInWei(10);
          // approve NFT to market contract
          await approveERC721(
            user1,
            nftContract,
            tokenId,
            marketContract.target
          );
          await expect(
            marketContract.connect(user1).listItem(tokenId, paymentToken, price)
          ).to.be.revertedWithCustomError(
            marketContract,
            "AARTMarket_UnsupportedToken"
          );
        });
        it("should allow user to list his NFT", async () => {
          // allow erc20Mock token
          await marketContract
            .connect(owner)
            .addSupportedToken(erc20Mock.target);

          await expect(
            marketContract.connect(user1).listItem(tokenId, paymentToken, price)
          )
            .to.emit(marketContract, "ItemListed")
            .withArgs(0, user1.address, tokenId);
        });
        it("should store correct item info", async () => {
          const listingId = 0;
          const item = (await marketContract.getListings())[listingId];
          expect(item.tokenId).to.be.equal(tokenId);
          expect(item.seller).to.be.equal(user1.address);
          expect(item.paymentToken).to.be.equal(paymentToken);
          expect(item.buyPrice).to.be.equal(price);
          expect(item.status).to.be.equal(ListingStatus.Active);
        });
        it("should not allow non NFT owner to list", async () => {
          // mint new NFT
          await mintNewNFT(nftContract, user2);
          tokenId = 1;
          paymentToken = ethers.ZeroAddress;
          price = getAmountInWei(10);
          await expect(
            marketContract.connect(user1).listItem(tokenId, paymentToken, price)
          ).to.be.revertedWithCustomError(
            marketContract,
            "AARTMarket_OnlyTokenOwner"
          );
        });
        it("should not allow non approved NFT to be listed", async () => {
          // user2 tries to list directly without approving first
          await expect(
            marketContract.connect(user2).listItem(tokenId, paymentToken, price)
          ).to.be.revertedWithCustomError(
            marketContract,
            "AARTMarket_ItemNotApproved"
          );
        });
      });
      describe("buyItem()", () => {
        describe("Case without Royalty", () => {
          describe("ERC20 token payment", () => {
            let user1InitialBalance;
            let fee, feeRecipientBeforeBalance;
            before(async () => {
              await deployNFTAndMarketContracts();

              // list NFT for sale
              await listItem(erc20Mock.target);

              // user1 erc20 balance
              user1InitialBalance = getAmountFromWei(
                await erc20Mock.balanceOf(user1.address)
              );

              feeRecipientBeforeBalance = getAmountFromWei(
                await erc20Mock.balanceOf(owner.address)
              );

              fee = Number(await marketContract.fee());
            });
            it("should allow user to buy item", async () => {
              // mint erc20 tokens to user2
              await mintERC20(user2, erc20Mock.target, price);
              // approve tokens to market
              await approveERC20(
                user2,
                erc20Mock.target,
                price,
                marketContract.target
              );
              const listingId = 0;

              await expect(marketContract.connect(user2).buyItem(listingId))
                .to.emit(marketContract, "ItemSold")
                .withArgs(0, user2.address);
            });
            it("should transfer bought NFT to buyer", async () => {
              expect(await nftContract.ownerOf(tokenId)).to.be.equal(
                user2.address
              );
            });
            it("should send fee amount", async () => {
              const feeRecepientAfterBalance = getAmountFromWei(
                await erc20Mock.balanceOf(owner.address)
              );
              const expectedBalance =
                feeRecipientBeforeBalance +
                getAmountFromWei(price) * (fee / 1000);
              expect(Math.round(feeRecepientAfterBalance)).to.be.equal(
                Math.round(expectedBalance)
              );
            });
            it("should send remaining buy price to seller", async () => {
              // user1 erc20 after balance
              const user1FinalBalance = getAmountFromWei(
                await erc20Mock.balanceOf(user1.address)
              );
              const expectedBalance =
                user1InitialBalance +
                getAmountFromWei(price) * ((1000 - fee) / 1000);
              expect(user1FinalBalance).to.be.equal(expectedBalance);
            });
            it("should update item status to sold", async () => {
              const listingId = 0;
              const item = (await marketContract.getListings())[listingId];
              expect(item.status).to.be.equal(ListingStatus.Sold);
            });
          });
          describe("MATIC payment", () => {
            let user1InitialBalance;
            let fee, feeRecipientBeforeBalance;
            before(async () => {
              await deployNFTAndMarketContracts();

              // list NFT for sale
              await listItem(ethers.ZeroAddress);

              // user1 matic balance
              user1InitialBalance = getAmountFromWei(
                await ethers.provider.getBalance(user1.address)
              );

              feeRecipientBeforeBalance = getAmountFromWei(
                await ethers.provider.getBalance(owner.address)
              );

              fee = Number(await marketContract.fee());
            });
            it("should allow user to buy item", async () => {
              const listingId = 0;
              await expect(
                marketContract
                  .connect(user2)
                  .buyItem(listingId, { value: price })
              )
                .to.emit(marketContract, "ItemSold")
                .withArgs(0, user2.address);
            });
            it("should transfer bought NFT to buyer", async () => {
              expect(await nftContract.ownerOf(tokenId)).to.be.equal(
                user2.address
              );
            });
            it("should send fee amount", async () => {
              const feeRecepientAfterBalance = getAmountFromWei(
                await ethers.provider.getBalance(owner.address)
              );
              const expectedBalance =
                feeRecipientBeforeBalance +
                getAmountFromWei(price) * (fee / 1000);

              expect(Math.round(feeRecepientAfterBalance)).to.be.equal(
                Math.round(expectedBalance)
              );
            });
            it("should send remaining buy price to seller", async () => {
              // user1 matic after balance
              const user1FinalBalance = getAmountFromWei(
                await ethers.provider.getBalance(user1.address)
              );
              const expectedBalance =
                user1InitialBalance +
                getAmountFromWei(price) * ((1000 - fee) / 1000);
              expect(Math.round(user1FinalBalance)).to.be.equal(
                Math.round(expectedBalance)
              );
            });
            it("should update item status to sold", async () => {
              const listingId = 0;
              const item = (await marketContract.getListings())[listingId];
              expect(item.status).to.be.equal(ListingStatus.Sold);
            });
          });
        });
        describe("Case with Royalty", () => {
          describe("ERC20 token payment", () => {
            let user1InitialBalance;
            let user2InitialBalance;
            let fee, royaltyFeeBPS, feeRecipientBeforeBalance;
            before(async () => {
              await deployNFTAndMarketContracts();

              // create new offer with royalty NFT
              royaltyFeeBPS = 100;
              await listItemWithRoyalty(erc20Mock.target, royaltyFeeBPS);

              // user1 erc20 balance
              user1InitialBalance = getAmountFromWei(
                await erc20Mock.balanceOf(user1.address)
              );
              // user2 erc20 balance
              user2InitialBalance = getAmountFromWei(
                await erc20Mock.balanceOf(user2.address)
              );

              feeRecipientBeforeBalance = getAmountFromWei(
                await erc20Mock.balanceOf(owner.address)
              );

              fee = Number(await marketContract.fee());
            });
            it("should allow user to buy item", async () => {
              // mint erc20 tokens to user2
              await mintERC20(user3, erc20Mock.target, price);
              // approve tokens to market
              await approveERC20(
                user3,
                erc20Mock.target,
                price,
                marketContract.target
              );
              const listingId = 0;
              await expect(
                await marketContract.connect(user3).buyItem(listingId)
              )
                .to.emit(marketContract, "ItemSold")
                .withArgs(0, user3.address);
            });
            it("should transfer bought NFT to buyer", async () => {
              expect(await nftContract.ownerOf(tokenId)).to.be.equal(
                user3.address
              );
            });
            it("should send fee amount", async () => {
              const feeRecepientAfterBalance = getAmountFromWei(
                await erc20Mock.balanceOf(owner.address)
              );
              const expectedBalance =
                feeRecipientBeforeBalance +
                getAmountFromWei(price) * (fee / 1000);

              expect(Math.round(feeRecepientAfterBalance)).to.be.equal(
                Math.round(expectedBalance)
              );
            });
            it("should send royalty to original creator", async () => {
              // user1 erc20 after balance
              const user1FinalBalance = getAmountFromWei(
                await erc20Mock.balanceOf(user1.address)
              );
              const expectedBalance =
                user1InitialBalance +
                (getAmountFromWei(price) * royaltyFeeBPS) / 10000;
              expect(user1FinalBalance).to.be.equal(expectedBalance);
            });
            it("should send remaining buy price to seller", async () => {
              // user1 erc20 after balance
              const user2FinalBalance = getAmountFromWei(
                await erc20Mock.balanceOf(user2.address)
              );
              const salePrice = getAmountFromWei(price);
              const feeAmount = (salePrice * fee) / 1000;
              const royaltyAmount = (salePrice * royaltyFeeBPS) / 10000;
              const remainAmount = salePrice - feeAmount - royaltyAmount;
              const expectedBalance = user2InitialBalance + remainAmount;
              expect(Math.round(user2FinalBalance)).to.be.equal(
                Math.round(expectedBalance)
              );
            });
            it("should update item status to sold", async () => {
              const listingId = 0;
              const item = (await marketContract.getListings())[listingId];
              expect(item.status).to.be.equal(ListingStatus.Sold);
            });
          });
          describe("MATIC payment", () => {
            let user1InitialBalance;
            let user2InitialBalance;
            let fee, royaltyFeeBPS, feeRecipientBeforeBalance;
            before(async () => {
              await deployNFTAndMarketContracts();

              // create new offer with royalty NFT
              royaltyFeeBPS = 100;
              await listItemWithRoyalty(ethers.ZeroAddress, royaltyFeeBPS);

              // user1 matic balance
              user1InitialBalance = getAmountFromWei(
                await ethers.provider.getBalance(user1.address)
              );

              // user2 matic balance
              user2InitialBalance = getAmountFromWei(
                await ethers.provider.getBalance(user2.address)
              );

              feeRecipientBeforeBalance = getAmountFromWei(
                await ethers.provider.getBalance(owner.address)
              );

              fee = Number(await marketContract.fee());
            });
            it("should allow user to buy item", async () => {
              const listingId = 0;
              await expect(
                marketContract
                  .connect(user3)
                  .buyItem(listingId, { value: price })
              )
                .to.emit(marketContract, "ItemSold")
                .withArgs(0, user3.address);
            });
            it("should transfer bought NFT to buyer", async () => {
              expect(await nftContract.ownerOf(tokenId)).to.be.equal(
                user3.address
              );
            });
            it("should send fee amount", async () => {
              const feeRecepientAfterBalance = getAmountFromWei(
                await ethers.provider.getBalance(owner.address)
              );
              const expectedBalance =
                feeRecipientBeforeBalance +
                getAmountFromWei(price) * (fee / 1000);
              expect(
                parseFloat(feeRecepientAfterBalance).toFixed(5)
              ).to.be.equal(parseFloat(expectedBalance).toFixed(5));
            });
            it("should send royalty to original creator", async () => {
              // user1 matic after balance
              const user1FinalBalance = getAmountFromWei(
                await ethers.provider.getBalance(user1.address)
              );
              const expectedBalance =
                user1InitialBalance +
                (getAmountFromWei(price) * royaltyFeeBPS) / 10000;
              expect(parseFloat(user1FinalBalance).toFixed(6)).to.be.equal(
                parseFloat(expectedBalance).toFixed(6)
              );
            });
            it("should send remaining buy price to seller", async () => {
              // user2 matic after balance
              const user2FinalBalance = getAmountFromWei(
                await ethers.provider.getBalance(user2.address)
              );

              const salePrice = getAmountFromWei(price);
              const feeAmount = (salePrice * fee) / 1000;
              const royaltyAmount = (salePrice * royaltyFeeBPS) / 10000;
              const remainAmount = salePrice - feeAmount - royaltyAmount;
              const expectedBalance = user2InitialBalance + remainAmount;

              expect(Math.round(user2FinalBalance)).to.be.equal(
                Math.round(expectedBalance)
              );
            });
            it("should update item status to sold", async () => {
              const listingId = 0;
              const item = (await marketContract.getListings())[listingId];
              expect(item.status).to.be.equal(ListingStatus.Sold);
            });
          });
        });
      });
      describe("cancelListing()", () => {
        before(async () => {
          await deployNFTAndMarketContracts();

          // list NFT for sale
          await listItem(erc20Mock.target);
        });
        let listingId = 0;
        it("should not allow non seller to cancel listing", async () => {
          await expect(
            marketContract.connect(user2).cancelListing(listingId)
          ).to.be.revertedWithCustomError(
            marketContract,
            "AARTMarket_OnlySeller"
          );
        });
        it("should allow seller to cancel listing", async () => {
          await expect(marketContract.connect(user1).cancelListing(listingId))
            .to.emit(marketContract, "ItemCanceled")
            .withArgs(listingId);
        });
        it("should update item listing status to Canceled", async () => {
          const item = (await marketContract.getListings())[listingId];
          expect(item.status).to.be.equal(ListingStatus.Canceled);
        });
        it("should revert if item status is not Active", async () => {
          await expect(
            marketContract.connect(user1).cancelListing(listingId)
          ).to.be.revertedWithCustomError(
            marketContract,
            "AARTMarket_ListingNotActive"
          );
        });
      });
    });
