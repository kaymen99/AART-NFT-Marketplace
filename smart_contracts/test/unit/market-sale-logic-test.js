const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const {
  deployNFTContract,
  mintNewNFT,
  mintNewNFTWithRoyalty,
  approveERC721,
  getAmountInWei,
  getAmountFromWei,
  developmentChains,
  deployERC20Mock,
  mintERC20,
  approveERC20,
} = require("../../utils/helpers");

const ListingStatus = { Active: 0, Sold: 1, Canceled: 2 };

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("AART market Direct Sale Logic Unit Tests", () => {
      let owner;
      let nftContract;
      let marketContract;
      let erc20Mock;

      before(async () => {
        [owner, user1, user2, user3, randomUser] = await ethers.getSigners();

        erc20Mock = await deployERC20Mock();
      });

      describe("listItem()", () => {
        before(async () => {
          // Deploy NFT Collection contract
          nftContract = await deployNFTContract(owner);
          // Deploy AART market contract
          const MarketContract = await ethers.getContractFactory("AARTMarket");
          marketContract = await MarketContract.deploy(nftContract.address);
          await marketContract.deployed();
        });
        let tokenId, paymentToken, price;
        let listedEvent;
        it("should allow user to list his NFT", async () => {
          // mint new NFT
          await mintNewNFT(nftContract, user1);
          tokenId = 0;
          paymentToken = erc20Mock.address;
          price = getAmountInWei(10);
          // approve NFT to market contract
          await approveERC721(
            user1,
            nftContract,
            tokenId,
            marketContract.address
          );
          const tx = await marketContract
            .connect(user1)
            .listItem(tokenId, paymentToken, price);
          const txReceipt = await tx.wait(1);
          listedEvent = txReceipt.events[0];
          expect((await marketContract.getListings()).length).to.be.equal(1);
        });
        it("should emit ItemListed event", async () => {
          expect(listedEvent.event).to.be.equal("ItemListed");
          expect(listedEvent.args.listingId).to.be.equal(0);
          expect(listedEvent.args.seller).to.be.equal(user1.address);
          expect(listedEvent.args.tokenId).to.be.equal(tokenId);
        });
        it("should store correct item info", async () => {
          const listingId = 0;
          const item = (await marketContract.getListings())[listingId];
          expect(item.id).to.be.equal(listingId);
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
          paymentToken = ethers.constants.AddressZero;
          price = getAmountInWei(10);
          await expect(
            marketContract.connect(user1).listItem(tokenId, paymentToken, price)
          ).to.be.revertedWithCustomError(
            marketContract,
            "AARTMarket_InvalidToken"
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
            let tokenId, paymentToken, price;
            let user1InitialBalance;
            before(async () => {
              // Deploy NFT Collection contract
              nftContract = await deployNFTContract(owner);
              // Deploy AART market contract
              const MarketContract = await ethers.getContractFactory(
                "AARTMarket"
              );
              marketContract = await MarketContract.deploy(nftContract.address);
              await marketContract.deployed();
              // user1 erc20 balance
              user1InitialBalance = getAmountFromWei(
                await erc20Mock.balanceOf(user1.address)
              );
              // list new item
              await mintNewNFT(nftContract, user1);
              tokenId = 0;
              paymentToken = erc20Mock.address;
              price = getAmountInWei(10);
              await approveERC721(
                user1,
                nftContract,
                tokenId,
                marketContract.address
              );
              await marketContract
                .connect(user1)
                .listItem(tokenId, paymentToken, price);
            });
            let soldEvent;
            it("should allow user to buy item", async () => {
              // mint erc20 tokens to user2
              await mintERC20(user2, erc20Mock.address, price);
              // approve tokens to market
              await approveERC20(
                user2,
                erc20Mock.address,
                price,
                marketContract.address
              );
              const listingId = 0;
              const tx = await marketContract.connect(user2).buyItem(listingId);
              const txReceipt = await tx.wait(1);
              soldEvent = txReceipt.events[txReceipt.events.length - 1];
            });
            it("should transfer bought NFT to buyer", async () => {
              expect(await nftContract.ownerOf(tokenId)).to.be.equal(
                user2.address
              );
            });
            it("should send buy price to seller", async () => {
              // user1 erc20 after balance
              const user1FinalBalance = getAmountFromWei(
                await erc20Mock.balanceOf(user1.address)
              );
              const expectedBalance =
                user1InitialBalance + getAmountFromWei(price);
              expect(user1FinalBalance).to.be.equal(expectedBalance);
            });
            it("should emit ItemSold event", async () => {
              expect(soldEvent.event).to.be.equal("ItemSold");
              expect(soldEvent.args.listingId).to.be.equal(0);
              expect(soldEvent.args.buyer).to.be.equal(user2.address);
            });
            it("should update item status to sold", async () => {
              const listingId = 0;
              const item = (await marketContract.getListings())[listingId];
              expect(item.status).to.be.equal(ListingStatus.Sold);
            });
          });
          describe("MATIC payment", () => {
            let tokenId, paymentToken, price;
            let user1InitialBalance;
            before(async () => {
              // Deploy NFT Collection contract
              nftContract = await deployNFTContract(owner);
              // Deploy AART market contract
              const MarketContract = await ethers.getContractFactory(
                "AARTMarket"
              );
              marketContract = await MarketContract.deploy(nftContract.address);
              await marketContract.deployed();
              // list new item
              await mintNewNFT(nftContract, user1);
              tokenId = 0;
              paymentToken = ethers.constants.AddressZero;
              price = getAmountInWei(20);
              await approveERC721(
                user1,
                nftContract,
                tokenId,
                marketContract.address
              );
              await marketContract
                .connect(user1)
                .listItem(tokenId, paymentToken, price);
              // user1 matic balance
              user1InitialBalance = getAmountFromWei(await user1.getBalance());
            });
            let soldEvent;
            it("should allow user to buy item", async () => {
              const listingId = 0;
              const tx = await marketContract
                .connect(user2)
                .buyItem(listingId, { value: price });
              const txReceipt = await tx.wait(1);
              soldEvent = txReceipt.events[txReceipt.events.length - 1];
            });
            it("should transfer bought NFT to buyer", async () => {
              expect(await nftContract.ownerOf(tokenId)).to.be.equal(
                user2.address
              );
            });
            it("should send buy price to seller", async () => {
              // user1 matic after balance
              const user1FinalBalance = getAmountFromWei(
                await user1.getBalance()
              );
              const expectedBalance =
                user1InitialBalance + getAmountFromWei(price);
              expect(user1FinalBalance).to.be.equal(expectedBalance);
            });
            it("should emit ItemSold event", async () => {
              expect(soldEvent.event).to.be.equal("ItemSold");
              expect(soldEvent.args.listingId).to.be.equal(0);
              expect(soldEvent.args.buyer).to.be.equal(user2.address);
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
            let tokenId, paymentToken, price;
            let royaltyFeeBPS;
            let user1InitialBalance;
            let user2InitialBalance;
            before(async () => {
              // Deploy NFT Collection contract
              nftContract = await deployNFTContract(owner);
              // Deploy AART market contract
              const MarketContract = await ethers.getContractFactory(
                "AARTMarket"
              );
              marketContract = await MarketContract.deploy(nftContract.address);
              await marketContract.deployed();
              // user1 erc20 balance
              user1InitialBalance = getAmountFromWei(
                await erc20Mock.balanceOf(user1.address)
              );
              // user2 erc20 balance
              user2InitialBalance = getAmountFromWei(
                await erc20Mock.balanceOf(user2.address)
              );
              // list new item
              royaltyFeeBPS = 100;
              await mintNewNFTWithRoyalty(nftContract, user1, royaltyFeeBPS);
              tokenId = 0;
              // transfer NFT to user2 to test if royalty work
              await nftContract
                .connect(user1)
                .transferFrom(user1.address, user2.address, tokenId);
              paymentToken = erc20Mock.address;
              price = getAmountInWei(20);
              await approveERC721(
                user2,
                nftContract,
                tokenId,
                marketContract.address
              );
              await marketContract
                .connect(user2)
                .listItem(tokenId, paymentToken, price);
            });
            let soldEvent;
            it("should allow user to buy item", async () => {
              // mint erc20 tokens to user2
              await mintERC20(user3, erc20Mock.address, price);
              // approve tokens to market
              await approveERC20(
                user3,
                erc20Mock.address,
                price,
                marketContract.address
              );
              const listingId = 0;
              const tx = await marketContract.connect(user3).buyItem(listingId);
              const txReceipt = await tx.wait(1);
              soldEvent = txReceipt.events[txReceipt.events.length - 1];
            });
            it("should transfer bought NFT to buyer", async () => {
              expect(await nftContract.ownerOf(tokenId)).to.be.equal(
                user3.address
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
              const expectedBalance =
                user2InitialBalance +
                (getAmountFromWei(price) * (10000 - royaltyFeeBPS)) / 10000;
              expect(user2FinalBalance).to.be.equal(expectedBalance);
            });
            it("should emit ItemSold event", async () => {
              expect(soldEvent.event).to.be.equal("ItemSold");
              expect(soldEvent.args.listingId).to.be.equal(0);
              expect(soldEvent.args.buyer).to.be.equal(user3.address);
            });
            it("should update item status to sold", async () => {
              const listingId = 0;
              const item = (await marketContract.getListings())[listingId];
              expect(item.status).to.be.equal(ListingStatus.Sold);
            });
          });
          describe("MATIC payment", () => {
            let tokenId, paymentToken, price;
            let royaltyFeeBPS;
            let user1InitialBalance;
            let user2InitialBalance;
            before(async () => {
              // Deploy NFT Collection contract
              nftContract = await deployNFTContract(owner);
              // Deploy AART market contract
              const MarketContract = await ethers.getContractFactory(
                "AARTMarket"
              );
              marketContract = await MarketContract.deploy(nftContract.address);
              await marketContract.deployed();
              // list new item
              royaltyFeeBPS = 200;
              await mintNewNFTWithRoyalty(nftContract, user1, royaltyFeeBPS);
              tokenId = 0;
              // transfer NFT to user2 to test if royalty work
              await nftContract
                .connect(user1)
                .transferFrom(user1.address, user2.address, tokenId);
              paymentToken = ethers.constants.AddressZero;
              price = getAmountInWei(200);
              await approveERC721(
                user2,
                nftContract,
                tokenId,
                marketContract.address
              );
              await marketContract
                .connect(user2)
                .listItem(tokenId, paymentToken, price);
              // user1 matic balance
              user1InitialBalance = getAmountFromWei(await user1.getBalance());
              // user2 matic balance
              user2InitialBalance = getAmountFromWei(await user2.getBalance());
            });
            let soldEvent;
            it("should allow user to buy item", async () => {
              const listingId = 0;
              const tx = await marketContract
                .connect(user3)
                .buyItem(listingId, { value: price });
              const txReceipt = await tx.wait(1);
              soldEvent = txReceipt.events[txReceipt.events.length - 1];
            });
            it("should transfer bought NFT to buyer", async () => {
              expect(await nftContract.ownerOf(tokenId)).to.be.equal(
                user3.address
              );
            });
            it("should send royalty to original creator", async () => {
              // user1 matic after balance
              const user1FinalBalance = getAmountFromWei(
                await user1.getBalance()
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
                await user2.getBalance()
              );
              const expectedBalance =
                user2InitialBalance +
                (getAmountFromWei(price) * (10000 - royaltyFeeBPS)) / 10000;
              expect(parseFloat(user2FinalBalance).toFixed(6)).to.be.equal(
                parseFloat(expectedBalance).toFixed(6)
              );
            });
            it("should emit ItemSold event", async () => {
              expect(soldEvent.event).to.be.equal("ItemSold");
              expect(soldEvent.args.listingId).to.be.equal(0);
              expect(soldEvent.args.buyer).to.be.equal(user3.address);
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
          // Deploy NFT Collection contract
          nftContract = await deployNFTContract(owner);
          // Deploy AART market contract
          const MarketContract = await ethers.getContractFactory("AARTMarket");
          marketContract = await MarketContract.deploy(nftContract.address);
          await marketContract.deployed();
          // list new item
          await mintNewNFT(nftContract, user1);
          tokenId = 0;
          paymentToken = erc20Mock.address;
          price = getAmountInWei(10);
          await approveERC721(
            user1,
            nftContract,
            tokenId,
            marketContract.address
          );
          await marketContract
            .connect(user1)
            .listItem(tokenId, paymentToken, price);
        });
        let tokenId, paymentToken, price;
        let listingId = 0;
        it("should not allow non seller to cancel listing", async () => {
          await expect(
            marketContract.connect(user2).cancelListing(listingId)
          ).to.be.revertedWithCustomError(
            marketContract,
            "AARTMarket_OnlySeller"
          );
        });
        let cancelEvent;
        it("should allow seller to cancel listing", async () => {
          const tx = await marketContract
            .connect(user1)
            .cancelListing(listingId);
          const txReceipt = await tx.wait(1);
          cancelEvent = txReceipt.events[0];
        });
        it("should emit ItemCanceled event", async () => {
          expect(cancelEvent.event).to.be.equal("ItemCanceled");
          expect(cancelEvent.args.listingId).to.be.equal(listingId);
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
