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
  moveTimeTo,
  resetTime,
  deployContract,
} = require("../../utils/helpers");

const AuctionStatus = {
  Open: 0,
  Close: 1,
  Ended: 2,
  DirectBuy: 3,
  Canceled: 4,
};

const mintFee = getAmountInWei(10);

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("AART market Auction Logic Unit Tests", () => {
      let owner;
      let nftContract;
      let artistsNftContract;
      let marketContract;
      let erc20Mock;
      let AuctionParam = {
        tokenId: 0,
        paymentToken: ethers.ZeroAddress,
        directBuyPrice: 0,
        startPrice: 0,
        startTime: 0,
        endTime: 0,
      };

      async function deployAndStartAuction(token) {
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

        if (token !== ethers.ZeroAddress) {
          await marketContract.connect(owner).addSupportedToken(token);
        }

        // start new auction
        await mintNewNFT(nftContract, user1);

        AuctionParam.tokenId = 0;
        AuctionParam.paymentToken = token;
        AuctionParam.directBuyPrice = getAmountInWei(100);
        AuctionParam.startPrice = getAmountInWei(10);
        AuctionParam.startTime = Math.floor(
          new Date("2024.02.10").getTime() / 1000
        );
        AuctionParam.endTime = Math.floor(
          new Date("2024.02.20").getTime() / 1000
        );
        // approve NFT to market contract
        await approveERC721(
          user1,
          nftContract,
          AuctionParam.tokenId,
          marketContract.target
        );

        await marketContract
          .connect(user1)
          .startAuction(
            AuctionParam.tokenId,
            AuctionParam.paymentToken,
            AuctionParam.directBuyPrice,
            AuctionParam.startPrice,
            AuctionParam.startTime,
            AuctionParam.endTime
          );
      }

      async function deployAndStartAuctionWithRoyalty(token, royaltyFeeBPS) {
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

        if (token !== ethers.ZeroAddress) {
          await marketContract.connect(owner).addSupportedToken(token);
        }

        // list new item
        await mintNewNFTWithRoyalty(nftContract, user1, royaltyFeeBPS);
        tokenId = 0;
        // transfer NFT to user2 to test if royalty work
        await nftContract
          .connect(user1)
          .transferFrom(user1.address, user2.address, tokenId);

        AuctionParam.tokenId = 0;
        AuctionParam.paymentToken = token;
        AuctionParam.directBuyPrice = getAmountInWei(100);
        AuctionParam.startPrice = getAmountInWei(10);
        AuctionParam.startTime = Math.floor(
          new Date("2024.02.10").getTime() / 1000
        );
        AuctionParam.endTime = Math.floor(
          new Date("2024.02.20").getTime() / 1000
        );

        // approve NFT to market contract
        await approveERC721(
          user2,
          nftContract,
          AuctionParam.tokenId,
          marketContract.target
        );

        await marketContract
          .connect(user2)
          .startAuction(
            AuctionParam.tokenId,
            AuctionParam.paymentToken,
            AuctionParam.directBuyPrice,
            AuctionParam.startPrice,
            AuctionParam.startTime,
            AuctionParam.endTime
          );
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

      describe("startAuction()", () => {
        before(async () => {
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
        });
        it("should not allow user to start auction with unsupported payment token", async () => {
          // mint new NFT
          await mintNewNFT(nftContract, user1);

          AuctionParam.tokenId = 0;
          AuctionParam.paymentToken = erc20Mock.target;
          AuctionParam.directBuyPrice = getAmountInWei(100);
          AuctionParam.startPrice = getAmountInWei(10);
          AuctionParam.startTime = Math.floor(
            new Date("2024.02.10").getTime() / 1000
          );
          AuctionParam.endTime = Math.floor(
            new Date("2024.02.18").getTime() / 1000
          );
          // approve NFT to market contract
          await approveERC721(
            user1,
            nftContract,
            AuctionParam.tokenId,
            marketContract.target
          );

          await expect(
            marketContract
              .connect(user1)
              .startAuction(
                AuctionParam.tokenId,
                AuctionParam.paymentToken,
                AuctionParam.directBuyPrice,
                AuctionParam.startPrice,
                AuctionParam.startTime,
                AuctionParam.endTime
              )
          ).to.be.revertedWithCustomError(
            marketContract,
            "AARTMarket_UnsupportedToken"
          );
        });
        it("should allow user to start an auction", async () => {
          // allow erc20Mock token
          await marketContract
            .connect(owner)
            .addSupportedToken(erc20Mock.target);

          await expect(
            marketContract
              .connect(user1)
              .startAuction(
                AuctionParam.tokenId,
                AuctionParam.paymentToken,
                AuctionParam.directBuyPrice,
                AuctionParam.startPrice,
                AuctionParam.startTime,
                AuctionParam.endTime
              )
          )
            .to.emit(marketContract, "AuctionStarted")
            .withArgs(
              0,
              user1.address,
              AuctionParam.tokenId,
              AuctionParam.startTime
            );

          expect((await marketContract.getAuctions()).length).to.be.equal(1);
        });
        it("should transfer NFT to market contract", async () => {
          expect(await nftContract.ownerOf(AuctionParam.tokenId)).to.be.equal(
            marketContract.target
          );
        });
        it("should store correct auction info", async () => {
          const auctionId = 0;
          const auction = (await marketContract.getAuctions())[auctionId];
          expect(auction.tokenId).to.be.equal(AuctionParam.tokenId);
          expect(auction.seller).to.be.equal(user1.address);
          expect(auction.paymentToken).to.be.equal(AuctionParam.paymentToken);
          expect(auction.highestBidder).to.be.equal(ethers.ZeroAddress);
          expect(auction.highestBid).to.be.equal(0);
          expect(auction.directBuyPrice).to.be.equal(
            AuctionParam.directBuyPrice
          );
          expect(auction.startPrice).to.be.equal(AuctionParam.startPrice);
          expect(auction.startTime).to.be.equal(AuctionParam.startTime);
          expect(auction.endTime).to.be.equal(AuctionParam.endTime);
          expect(auction.status).to.be.equal(AuctionStatus.Open);
        });
        it("should not allow non NFT owner to list", async () => {
          // mint new NFT
          await mintNewNFT(nftContract, user2);

          AuctionParam.tokenId = 1;

          await expect(
            marketContract
              .connect(user1)
              .startAuction(
                AuctionParam.tokenId,
                AuctionParam.paymentToken,
                AuctionParam.directBuyPrice,
                AuctionParam.startPrice,
                AuctionParam.startTime,
                AuctionParam.endTime
              )
          ).to.be.revertedWithCustomError(
            marketContract,
            "AARTMarket_OnlyTokenOwner"
          );
        });
        it("should revert if startTime is less or equal to endTime", async () => {
          AuctionParam.startTime = Math.floor(
            new Date("2024.02.10").getTime() / 1000
          );
          AuctionParam.endTime = Math.floor(
            new Date("2024.02.01").getTime() / 1000
          );

          // approve NFT to market contract
          await approveERC721(
            user2,
            nftContract,
            AuctionParam.tokenId,
            marketContract.target
          );

          await expect(
            marketContract
              .connect(user2)
              .startAuction(
                AuctionParam.tokenId,
                AuctionParam.paymentToken,
                AuctionParam.directBuyPrice,
                AuctionParam.startPrice,
                AuctionParam.startTime,
                AuctionParam.endTime
              )
          ).to.be.revertedWithCustomError(
            marketContract,
            "AARTMarket_InvalidAuctionPeriod"
          );
        });
        it("should revert if startPrice is zero", async () => {
          AuctionParam.startTime = Math.floor(
            new Date("2024.02.10").getTime() / 1000
          );
          AuctionParam.endTime = Math.floor(
            new Date("2024.02.20").getTime() / 1000
          );
          AuctionParam.startPrice = getAmountInWei(0);

          // approve NFT to market contract
          await approveERC721(
            user2,
            nftContract,
            AuctionParam.tokenId,
            marketContract.target
          );

          await expect(
            marketContract
              .connect(user2)
              .startAuction(
                AuctionParam.tokenId,
                AuctionParam.paymentToken,
                AuctionParam.directBuyPrice,
                AuctionParam.startPrice,
                AuctionParam.startTime,
                AuctionParam.endTime
              )
          ).to.be.revertedWithCustomError(
            marketContract,
            "AARTMarket_InvalidStartPrice"
          );
        });
        it("should revert if directBuyPrice is less than startPrice", async () => {
          AuctionParam.startPrice = getAmountInWei(20);
          AuctionParam.directBuyPrice = getAmountInWei(10);

          // approve NFT to market contract
          await approveERC721(
            user2,
            nftContract,
            AuctionParam.tokenId,
            marketContract.target
          );

          await expect(
            marketContract
              .connect(user2)
              .startAuction(
                AuctionParam.tokenId,
                AuctionParam.paymentToken,
                AuctionParam.directBuyPrice,
                AuctionParam.startPrice,
                AuctionParam.startTime,
                AuctionParam.endTime
              )
          ).to.be.revertedWithCustomError(
            marketContract,
            "AARTMarket_InvalidDirectBuyPrice"
          );
        });
      });
      describe("bid()", () => {
        describe("ERC20 token payment", () => {
          let auctionId = 0;
          before(async () => {
            await deployAndStartAuction(erc20Mock.target);
          });
          let bidAmount;
          it("should not allow user to bid until auction starts", async () => {
            bidAmount = getAmountInWei(15);
            // mint erc20 tokens to user2
            await mintERC20(user2, erc20Mock.target, bidAmount);
            // approve tokens to market
            await approveERC20(
              user2,
              erc20Mock.target,
              bidAmount,
              marketContract.target
            );
            await expect(
              marketContract.connect(user2).bid(auctionId, bidAmount)
            ).to.be.revertedWithCustomError(
              marketContract,
              "AARTMarket_AuctionNotOpen"
            );
          });
          it("should allow user to bid on open auction", async () => {
            await moveTimeTo(AuctionParam.startTime);

            await expect(
              marketContract.connect(user2).bid(auctionId, bidAmount)
            )
              .to.emit(marketContract, "NewBid")
              .withArgs(0, user2.address, bidAmount);
          });
          it("should transfer bid amount to market contract", async () => {
            expect(
              await erc20Mock.balanceOf(marketContract.target)
            ).to.be.equal(bidAmount);
          });
          it("should update bidder auction bid amount", async () => {
            expect(
              await marketContract.getUserBidAmount(auctionId, user2.address)
            ).to.be.equal(bidAmount);
          });
          it("should update auction info", async () => {
            const auction = (await marketContract.getAuctions())[auctionId];
            expect(auction.highestBidder).to.be.equal(user2.address);
            expect(auction.highestBid).to.be.equal(bidAmount);
          });
          it("should allow second user to overbid on open auction", async () => {
            const bidAmount2 = getAmountInWei(25);
            // mint erc20 tokens to user3
            await mintERC20(user3, erc20Mock.target, bidAmount2);
            // approve tokens to market
            await approveERC20(
              user3,
              erc20Mock.target,
              bidAmount2,
              marketContract.target
            );

            const marketBeforeBalance = await erc20Mock.balanceOf(
              marketContract.target
            );

            await marketContract.connect(user3).bid(auctionId, bidAmount2);

            const marketAfterBalance = await erc20Mock.balanceOf(
              marketContract.target
            );

            // check market erc20 token balance
            expect(getAmountFromWei(marketAfterBalance)).to.be.equal(
              getAmountFromWei(marketBeforeBalance) +
                getAmountFromWei(bidAmount2)
            );
            // check user bid amount
            expect(
              await marketContract.getUserBidAmount(auctionId, user3.address)
            ).to.be.equal(bidAmount2);
            // check auction highest bid & bidder
            const auction = (await marketContract.getAuctions())[auctionId];
            expect(auction.highestBidder).to.be.equal(user3.address);
            expect(auction.highestBid).to.be.equal(bidAmount2);
          });
          it("should not allow user to bid if already highest bidder", async () => {
            const bidAmount3 = getAmountInWei(35);
            // mint erc20 tokens to user2
            await mintERC20(user3, erc20Mock.target, bidAmount3);
            // approve tokens to market
            await approveERC20(
              user3,
              erc20Mock.target,
              bidAmount3,
              marketContract.target
            );
            await expect(
              marketContract.connect(user3).bid(auctionId, bidAmount3)
            ).to.be.revertedWithCustomError(
              marketContract,
              "AARTMarket_AlreadyHighestBid"
            );
          });
          it("should not allow user to bid if auction time ended", async () => {
            const bidAmount = getAmountInWei(40);
            // mint erc20 tokens to user2
            await mintERC20(user2, erc20Mock.target, bidAmount);
            // approve tokens to market
            await approveERC20(
              user2,
              erc20Mock.target,
              bidAmount,
              marketContract.target
            );

            await moveTimeTo(AuctionParam.endTime + 1);

            await expect(
              marketContract.connect(user2).bid(auctionId, bidAmount)
            ).to.be.revertedWithCustomError(
              marketContract,
              "AARTMarket_AuctionNotOpen"
            );
          });
        });
        describe("MATIC payment", () => {
          let auctionId = 0;
          before(async () => {
            await resetTime();

            // start a new auction
            await deployAndStartAuction(ethers.ZeroAddress);
          });
          let bidAmount;
          it("should not allow user to bid until auction starts", async () => {
            bidAmount = getAmountInWei(15);
            await expect(
              marketContract
                .connect(user2)
                .bid(auctionId, 0, { value: bidAmount })
            ).to.be.revertedWithCustomError(
              marketContract,
              "AARTMarket_AuctionNotOpen"
            );
          });
          it("should allow user to bid on open auction", async () => {
            await moveTimeTo(AuctionParam.startTime);

            await expect(
              marketContract
                .connect(user2)
                .bid(auctionId, 0, { value: bidAmount })
            )
              .to.emit(marketContract, "NewBid")
              .withArgs(0, user2.address, bidAmount);
          });
          it("should transfer bid amount to market contract", async () => {
            expect(
              await ethers.provider.getBalance(marketContract.target)
            ).to.be.equal(bidAmount);
          });
          it("should update bidder auction bid amount", async () => {
            expect(
              await marketContract.getUserBidAmount(auctionId, user2.address)
            ).to.be.equal(bidAmount);
          });
          it("should update auction info", async () => {
            const auction = (await marketContract.getAuctions())[auctionId];
            expect(auction.highestBidder).to.be.equal(user2.address);
            expect(auction.highestBid).to.be.equal(bidAmount);
          });
          it("should allow second user to overbid on open auction", async () => {
            const bidAmount2 = getAmountInWei(25);

            const marketBeforeBalance = await ethers.provider.getBalance(
              marketContract.target
            );

            await marketContract
              .connect(user3)
              .bid(auctionId, 0, { value: bidAmount2 });

            const marketAfterBalance = await ethers.provider.getBalance(
              marketContract.target
            );

            // check market erc20 token balance
            expect(getAmountFromWei(marketAfterBalance)).to.be.equal(
              getAmountFromWei(marketBeforeBalance) +
                getAmountFromWei(bidAmount2)
            );
            // check user bid amount
            expect(
              await marketContract.getUserBidAmount(auctionId, user3.address)
            ).to.be.equal(bidAmount2);
            // check auction highest bid & bidder
            const auction = (await marketContract.getAuctions())[auctionId];
            expect(auction.highestBidder).to.be.equal(user3.address);
            expect(auction.highestBid).to.be.equal(bidAmount2);
          });
          it("should not allow user to bid if already highest bidder", async () => {
            const bidAmount3 = getAmountInWei(35);

            await expect(
              marketContract
                .connect(user3)
                .bid(auctionId, 0, { value: bidAmount3 })
            ).to.be.revertedWithCustomError(
              marketContract,
              "AARTMarket_AlreadyHighestBid"
            );
          });
          it("should not allow user to bid if auction time ended", async () => {
            const bidAmount = getAmountInWei(40);

            await moveTimeTo(AuctionParam.endTime + 1);

            await expect(
              marketContract
                .connect(user2)
                .bid(auctionId, 0, { value: bidAmount })
            ).to.be.revertedWithCustomError(
              marketContract,
              "AARTMarket_AuctionNotOpen"
            );
          });
        });
      });
      describe("directBuyAuction()", () => {
        describe("Case without Royalty", () => {
          describe("ERC20 token payment", () => {
            let auctionId = 0;
            let user1InitialBalance;
            let fee, feeRecipientBeforeBalance;
            before(async () => {
              await resetTime();

              // start a new auction
              await deployAndStartAuction(erc20Mock.target);

              fee = Number(await marketContract.fee());

              // user1 erc20 balance
              user1InitialBalance = getAmountFromWei(
                await erc20Mock.balanceOf(user1.address)
              );

              feeRecipientBeforeBalance = getAmountFromWei(
                await erc20Mock.balanceOf(owner.address)
              );
            });
            it("should not allow user to buy when auction is not open", async () => {
              const price = AuctionParam.directBuyPrice;
              // mint erc20 tokens to user2
              await mintERC20(user2, erc20Mock.target, price);
              // approve tokens to market
              await approveERC20(
                user2,
                erc20Mock.target,
                price,
                marketContract.target
              );
              await expect(
                marketContract.connect(user2).directBuyAuction(auctionId)
              ).to.be.revertedWithCustomError(
                marketContract,
                "AARTMarket_AuctionNotOpen"
              );
            });
            it("should allow user to buy NFT from auction", async () => {
              await moveTimeTo(AuctionParam.startTime);
              await expect(
                marketContract.connect(user2).directBuyAuction(auctionId)
              )
                .to.emit(marketContract, "AuctionDirectBuy")
                .withArgs(auctionId, user2.address);
            });
            it("should transfer bought NFT to buyer", async () => {
              expect(
                await nftContract.ownerOf(AuctionParam.tokenId)
              ).to.be.equal(user2.address);
            });
            it("should send fee amount", async () => {
              const feeRecepientAfterBalance = getAmountFromWei(
                await erc20Mock.balanceOf(owner.address)
              );
              const expectedBalance =
                feeRecipientBeforeBalance +
                getAmountFromWei(AuctionParam.directBuyPrice) * (fee / 1000);
              expect(feeRecepientAfterBalance).to.be.equal(expectedBalance);
            });
            it("should send buy price to seller", async () => {
              // user1 erc20 after balance
              const user1FinalBalance = getAmountFromWei(
                await erc20Mock.balanceOf(user1.address)
              );
              const expectedBalance =
                user1InitialBalance +
                getAmountFromWei(AuctionParam.directBuyPrice) *
                  ((1000 - fee) / 1000);
              expect(user1FinalBalance).to.be.equal(expectedBalance);
            });
            it("should update auction status to direct buy", async () => {
              const auction = (await marketContract.getAuctions())[auctionId];
              expect(auction.status).to.be.equal(AuctionStatus.DirectBuy);
            });
          });
          describe("MATIC payment", () => {
            let auctionId = 0;
            let user1InitialBalance;
            let fee, feeRecipientBeforeBalance;
            before(async () => {
              await resetTime();

              // start a new auction
              await deployAndStartAuction(ethers.ZeroAddress);

              fee = Number(await marketContract.fee());

              // user1 matic balance
              user1InitialBalance = getAmountFromWei(
                await ethers.provider.getBalance(user1.address)
              );

              feeRecipientBeforeBalance = getAmountFromWei(
                await ethers.provider.getBalance(owner.address)
              );
            });
            it("should not allow user to buy when auction is not open", async () => {
              await expect(
                marketContract.connect(user2).directBuyAuction(auctionId, {
                  value: AuctionParam.directBuyPrice,
                })
              ).to.be.revertedWithCustomError(
                marketContract,
                "AARTMarket_AuctionNotOpen"
              );
            });
            it("should allow user to buy NFT from auction", async () => {
              await moveTimeTo(AuctionParam.startTime);
              await expect(
                marketContract.connect(user2).directBuyAuction(auctionId, {
                  value: AuctionParam.directBuyPrice,
                })
              )
                .to.emit(marketContract, "AuctionDirectBuy")
                .withArgs(auctionId, user2.address);
            });
            it("should transfer bought NFT to buyer", async () => {
              expect(
                await nftContract.ownerOf(AuctionParam.tokenId)
              ).to.be.equal(user2.address);
            });
            it("should send fee amount", async () => {
              const feeRecepientAfterBalance = getAmountFromWei(
                await ethers.provider.getBalance(owner.address)
              );
              const expectedBalance =
                feeRecipientBeforeBalance +
                getAmountFromWei(AuctionParam.directBuyPrice) * (fee / 1000);
              expect(Math.round(feeRecepientAfterBalance)).to.be.equal(
                Math.round(expectedBalance)
              );
            });
            it("should send buy price to seller", async () => {
              // user1 matic after balance
              const user1FinalBalance = getAmountFromWei(
                await ethers.provider.getBalance(user1.address)
              );
              const expectedBalance =
                user1InitialBalance +
                getAmountFromWei(AuctionParam.directBuyPrice) *
                  ((1000 - fee) / 1000);
              expect(user1FinalBalance).to.be.equal(expectedBalance);
            });
            it("should update auction status to direct buy", async () => {
              const auction = (await marketContract.getAuctions())[auctionId];
              expect(auction.status).to.be.equal(AuctionStatus.DirectBuy);
            });
          });
        });
        describe("Case with Royalty", () => {
          describe("ERC20 token payment", () => {
            let auctionId = 0;
            let user1InitialBalance;
            let user2InitialBalance;
            let fee, royaltyFeeBPS, feeRecipientBeforeBalance;
            before(async () => {
              await resetTime();

              royaltyFeeBPS = 200;
              // start a new auction with royalty NFT
              await deployAndStartAuctionWithRoyalty(
                erc20Mock.target,
                royaltyFeeBPS
              );

              fee = Number(await marketContract.fee());

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
            });
            it("should not allow user to buy when auction is not open", async () => {
              const price = AuctionParam.directBuyPrice;
              // mint erc20 tokens to user2
              await mintERC20(user3, erc20Mock.target, price);
              // approve tokens to market
              await approveERC20(
                user3,
                erc20Mock.target,
                price,
                marketContract.target
              );
              await expect(
                marketContract.connect(user3).directBuyAuction(auctionId)
              ).to.be.revertedWithCustomError(
                marketContract,
                "AARTMarket_AuctionNotOpen"
              );
            });
            it("should allow user to buy NFT from auction", async () => {
              await moveTimeTo(AuctionParam.startTime);
              await expect(
                marketContract.connect(user3).directBuyAuction(auctionId)
              )
                .to.emit(marketContract, "AuctionDirectBuy")
                .withArgs(auctionId, user3.address);
            });
            it("should transfer bought NFT to buyer", async () => {
              expect(
                await nftContract.ownerOf(AuctionParam.tokenId)
              ).to.be.equal(user3.address);
            });
            it("should send fee amount", async () => {
              const feeRecepientAfterBalance = getAmountFromWei(
                await erc20Mock.balanceOf(owner.address)
              );
              const expectedBalance =
                feeRecipientBeforeBalance +
                getAmountFromWei(AuctionParam.directBuyPrice) * (fee / 1000);
              expect(feeRecepientAfterBalance).to.be.equal(
                Math.round(expectedBalance * 10) / 10
              );
            });
            it("should send royalty to original creator", async () => {
              // user1 erc20 after balance
              const user1FinalBalance = getAmountFromWei(
                await erc20Mock.balanceOf(user1.address)
              );
              const expectedBalance =
                user1InitialBalance +
                (getAmountFromWei(AuctionParam.directBuyPrice) *
                  royaltyFeeBPS) /
                  10000;
              expect(user1FinalBalance).to.be.equal(expectedBalance);
            });
            it("should send remaining buy price to seller", async () => {
              // user1 erc20 after balance
              const user2FinalBalance = getAmountFromWei(
                await erc20Mock.balanceOf(user2.address)
              );
              const salePrice = getAmountFromWei(AuctionParam.directBuyPrice);
              const feeAmount = (salePrice * fee) / 1000;
              const royaltyAmount = (salePrice * royaltyFeeBPS) / 10000;
              const remainAmount = salePrice - feeAmount - royaltyAmount;
              const expectedBalance = user2InitialBalance + remainAmount;
              expect(user2FinalBalance).to.be.equal(expectedBalance);
            });
            it("should update auction status to direct buy", async () => {
              const auction = (await marketContract.getAuctions())[auctionId];
              expect(auction.status).to.be.equal(AuctionStatus.DirectBuy);
            });
          });
          describe("MATIC payment", () => {
            let auctionId = 0;
            let user1InitialBalance;
            let user2InitialBalance;
            let fee, feeRecipientBeforeBalance, royaltyFeeBPS;
            before(async () => {
              await resetTime();

              royaltyFeeBPS = 200;
              // start a new auction with royalty NFT
              await deployAndStartAuctionWithRoyalty(
                ethers.ZeroAddress,
                royaltyFeeBPS
              );

              fee = Number(await marketContract.fee());

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
            });
            it("should not allow user to buy when auction is not open", async () => {
              await expect(
                marketContract.connect(user3).directBuyAuction(auctionId, {
                  value: AuctionParam.directBuyPrice,
                })
              ).to.be.revertedWithCustomError(
                marketContract,
                "AARTMarket_AuctionNotOpen"
              );
            });
            it("should allow user to buy NFT from auction", async () => {
              await moveTimeTo(AuctionParam.startTime);
              await expect(
                marketContract.connect(user3).directBuyAuction(auctionId, {
                  value: AuctionParam.directBuyPrice,
                })
              )
                .to.emit(marketContract, "AuctionDirectBuy")
                .withArgs(auctionId, user3.address);
            });
            it("should transfer bought NFT to buyer", async () => {
              expect(
                await nftContract.ownerOf(AuctionParam.tokenId)
              ).to.be.equal(user3.address);
            });
            it("should send fee amount", async () => {
              const feeRecepientAfterBalance = getAmountFromWei(
                await ethers.provider.getBalance(owner.address)
              );
              const expectedBalance =
                feeRecipientBeforeBalance +
                getAmountFromWei(AuctionParam.directBuyPrice) * (fee / 1000);
              expect(feeRecepientAfterBalance).to.be.equal(expectedBalance);
            });
            it("should send royalty to original creator", async () => {
              // user1 matic after balance
              const user1FinalBalance = getAmountFromWei(
                await ethers.provider.getBalance(user1.address)
              );
              const expectedBalance =
                user1InitialBalance +
                (getAmountFromWei(AuctionParam.directBuyPrice) *
                  royaltyFeeBPS) /
                  10000;
              expect(parseFloat(user1FinalBalance).toFixed(6)).to.be.equal(
                parseFloat(expectedBalance).toFixed(6)
              );
            });
            it("should send remaining buy price to seller", async () => {
              // user2 matic after balance
              const user2FinalBalance = getAmountFromWei(
                await ethers.provider.getBalance(user2.address)
              );
              const salePrice = getAmountFromWei(AuctionParam.directBuyPrice);
              const feeAmount = (salePrice * fee) / 1000;
              const royaltyAmount = (salePrice * royaltyFeeBPS) / 10000;
              const remainAmount = salePrice - feeAmount - royaltyAmount;
              const expectedBalance = user2InitialBalance + remainAmount;
              expect(parseFloat(user2FinalBalance).toFixed(6)).to.be.equal(
                parseFloat(expectedBalance).toFixed(6)
              );
            });
            it("should update auction status to direct buy", async () => {
              const auction = (await marketContract.getAuctions())[auctionId];
              expect(auction.status).to.be.equal(AuctionStatus.DirectBuy);
            });
          });
        });
      });
      describe("endAuction()", () => {
        describe("Auction with no bidders", () => {
          let auctionId = 0;
          before(async () => {
            await resetTime();

            // start a new auction
            await deployAndStartAuction(erc20Mock.target);

            await moveTimeTo(AuctionParam.startTime);
          });
          it("should not allow auction end before endTime", async () => {
            await expect(
              marketContract.connect(user1).endAuction(auctionId)
            ).to.be.revertedWithCustomError(
              marketContract,
              "AARTMarket_AuctionPeriodNotEnded"
            );
          });
          it("should allow user end auction after ending period", async () => {
            await moveTimeTo(AuctionParam.endTime + 60);
            await expect(marketContract.connect(user1).endAuction(auctionId))
              .to.emit(marketContract, "AuctionEnded")
              .withArgs(auctionId, ethers.ZeroAddress);
          });
          it("should transfer bought NFT back to the seller", async () => {
            expect(await nftContract.ownerOf(AuctionParam.tokenId)).to.be.equal(
              user1.address
            );
          });
          it("should update auction status to ended", async () => {
            const auction = (await marketContract.getAuctions())[auctionId];
            expect(auction.status).to.be.equal(AuctionStatus.Ended);
          });
        });
        describe("Auction with bids", () => {
          describe("Case without Royalty", () => {
            describe("ERC20 token payment", () => {
              let auctionId = 0;
              let user1InitialBalance;
              let fee, feeRecipientBeforeBalance;
              before(async () => {
                await resetTime();

                // start a new auction
                await deployAndStartAuction(erc20Mock.target);

                fee = Number(await marketContract.fee());

                // user1 erc20 balance
                user1InitialBalance = getAmountFromWei(
                  await erc20Mock.balanceOf(user1.address)
                );

                feeRecipientBeforeBalance = getAmountFromWei(
                  await erc20Mock.balanceOf(owner.address)
                );
              });
              it("should not allow auction end before endTime", async () => {
                await moveTimeTo(AuctionParam.startTime);

                const bidAmount = getAmountInWei(15);
                // mint erc20 tokens to user2
                await mintERC20(user2, erc20Mock.target, bidAmount);
                // approve tokens to market
                await approveERC20(
                  user2,
                  erc20Mock.target,
                  bidAmount,
                  marketContract.target
                );

                await marketContract.connect(user2).bid(auctionId, bidAmount);

                await expect(
                  marketContract.connect(user1).endAuction(auctionId)
                ).to.be.revertedWithCustomError(
                  marketContract,
                  "AARTMarket_AuctionPeriodNotEnded"
                );
              });
              it("should allow user to end auction after ending period", async () => {
                await moveTimeTo(AuctionParam.endTime + 60);

                // get current highest bidder
                const auction = (await marketContract.getAuctions())[auctionId];

                await expect(
                  marketContract.connect(user1).endAuction(auctionId)
                )
                  .to.emit(marketContract, "AuctionEnded")
                  .withArgs(auctionId, auction.highestBidder);
              });
              it("should transfer NFT to the highest bidder", async () => {
                const auction = (await marketContract.getAuctions())[auctionId];
                expect(
                  await nftContract.ownerOf(AuctionParam.tokenId)
                ).to.be.equal(auction.highestBidder);
              });
              let highestBid;
              it("should send fee amount", async () => {
                const feeRecepientAfterBalance = getAmountFromWei(
                  await erc20Mock.balanceOf(owner.address)
                );

                const auction = (await marketContract.getAuctions())[auctionId];
                highestBid = auction.highestBid;

                const expectedBalance =
                  feeRecipientBeforeBalance +
                  getAmountFromWei(highestBid) * (fee / 1000);
                expect(Math.round(feeRecepientAfterBalance)).to.be.equal(
                  Math.round(expectedBalance)
                );
              });
              it("should send highest bid to seller", async () => {
                // user1 erc20 after balance
                const user1FinalBalance = getAmountFromWei(
                  await erc20Mock.balanceOf(user1.address)
                );

                const expectedBalance =
                  user1InitialBalance +
                  getAmountFromWei(highestBid) * ((1000 - fee) / 1000);
                expect(user1FinalBalance).to.be.equal(expectedBalance);
              });
              it("should update auction status to ended", async () => {
                const auction = (await marketContract.getAuctions())[auctionId];
                expect(auction.status).to.be.equal(AuctionStatus.Ended);
              });
            });
            describe("MATIC payment", () => {
              let auctionId = 0;
              let user1InitialBalance;
              let fee, feeRecipientBeforeBalance;
              before(async () => {
                await resetTime();

                // start a new auction
                await deployAndStartAuction(ethers.ZeroAddress);

                fee = Number(await marketContract.fee());

                // user1 matic balance
                user1InitialBalance = getAmountFromWei(
                  await ethers.provider.getBalance(user1.address)
                );

                feeRecipientBeforeBalance = getAmountFromWei(
                  await ethers.provider.getBalance(owner.address)
                );
              });
              it("should not allow auction end before endTime", async () => {
                await moveTimeTo(AuctionParam.startTime);

                const bidAmount = getAmountInWei(15);

                await marketContract
                  .connect(user2)
                  .bid(auctionId, 0, { value: bidAmount });

                await expect(
                  marketContract.connect(user1).endAuction(auctionId)
                ).to.be.revertedWithCustomError(
                  marketContract,
                  "AARTMarket_AuctionPeriodNotEnded"
                );
              });
              it("should allow user to end auction after ending period", async () => {
                await moveTimeTo(AuctionParam.endTime + 60);

                // get current highest bidder
                const auction = (await marketContract.getAuctions())[auctionId];

                await expect(
                  marketContract.connect(user1).endAuction(auctionId)
                )
                  .to.emit(marketContract, "AuctionEnded")
                  .withArgs(auctionId, auction.highestBidder);
              });
              it("should transfer NFT to the highest bidder", async () => {
                const auction = (await marketContract.getAuctions())[auctionId];
                expect(
                  await nftContract.ownerOf(AuctionParam.tokenId)
                ).to.be.equal(auction.highestBidder);
              });
              let highestBid;
              it("should send fee amount", async () => {
                const feeRecepientAfterBalance = getAmountFromWei(
                  await ethers.provider.getBalance(owner.address)
                );

                const auction = (await marketContract.getAuctions())[auctionId];
                highestBid = auction.highestBid;

                const expectedBalance =
                  feeRecipientBeforeBalance +
                  getAmountFromWei(highestBid) * (fee / 1000);
                expect(Math.round(feeRecepientAfterBalance)).to.be.equal(
                  Math.round(expectedBalance)
                );
              });
              it("should send highest bid to seller", async () => {
                // user1 erc20 after balance
                const user1FinalBalance = getAmountFromWei(
                  await ethers.provider.getBalance(user1.address)
                );

                const expectedBalance =
                  user1InitialBalance +
                  getAmountFromWei(highestBid) * ((1000 - fee) / 1000);
                expect(parseFloat(user1FinalBalance).toFixed(3)).to.be.equal(
                  parseFloat(expectedBalance).toFixed(3)
                );
              });
              it("should update auction status to ended", async () => {
                const auction = (await marketContract.getAuctions())[auctionId];
                expect(auction.status).to.be.equal(AuctionStatus.Ended);
              });
            });
          });
          describe("Case with Royalty", () => {
            describe("ERC20 token payment", () => {
              let auctionId = 0;
              let user1InitialBalance;
              let user2InitialBalance;
              let fee, feeRecipientBeforeBalance, royaltyFeeBPS;
              before(async () => {
                await resetTime();

                royaltyFeeBPS = 200;
                // start a new auction with royalty NFT
                await deployAndStartAuctionWithRoyalty(
                  erc20Mock.target,
                  royaltyFeeBPS
                );

                fee = Number(await marketContract.fee());

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
              });
              it("should not allow auction end before endTime", async () => {
                await moveTimeTo(AuctionParam.startTime);

                const bidAmount = getAmountInWei(15);
                // mint erc20 tokens to user2
                await mintERC20(user3, erc20Mock.target, bidAmount);
                // approve tokens to market
                await approveERC20(
                  user3,
                  erc20Mock.target,
                  bidAmount,
                  marketContract.target
                );

                await marketContract.connect(user3).bid(auctionId, bidAmount);

                await expect(
                  marketContract.connect(user1).endAuction(auctionId)
                ).to.be.revertedWithCustomError(
                  marketContract,
                  "AARTMarket_AuctionPeriodNotEnded"
                );
              });
              it("should allow user to end auction after ending period", async () => {
                await moveTimeTo(AuctionParam.endTime + 60);

                // get current highest bidder
                const auction = (await marketContract.getAuctions())[auctionId];

                await expect(
                  marketContract.connect(randomUser).endAuction(auctionId)
                )
                  .to.emit(marketContract, "AuctionEnded")
                  .withArgs(auctionId, auction.highestBidder);
              });
              it("should transfer NFT to the highest bidder", async () => {
                const auction = (await marketContract.getAuctions())[auctionId];
                expect(
                  await nftContract.ownerOf(AuctionParam.tokenId)
                ).to.be.equal(auction.highestBidder);
              });
              let highestBid;
              it("should send fee amount", async () => {
                const feeRecepientAfterBalance = getAmountFromWei(
                  await erc20Mock.balanceOf(owner.address)
                );

                const auction = (await marketContract.getAuctions())[auctionId];
                highestBid = auction.highestBid;

                const expectedBalance =
                  feeRecipientBeforeBalance +
                  getAmountFromWei(highestBid) * (fee / 1000);
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
                  (getAmountFromWei(highestBid) * royaltyFeeBPS) / 10000;
                expect(parseFloat(user1FinalBalance).toFixed(2)).to.be.equal(
                  parseFloat(expectedBalance).toFixed(2)
                );
              });
              it("should send remaining buy price to seller", async () => {
                // user1 erc20 after balance
                const user2FinalBalance = getAmountFromWei(
                  await erc20Mock.balanceOf(user2.address)
                );

                const salePrice = getAmountFromWei(highestBid);
                const feeAmount = (salePrice * fee) / 1000;
                const royaltyAmount = (salePrice * royaltyFeeBPS) / 10000;
                const remainAmount = salePrice - feeAmount - royaltyAmount;
                const expectedBalance = user2InitialBalance + remainAmount;

                expect(user2FinalBalance).to.be.equal(expectedBalance);
              });
              it("should update auction status to ended", async () => {
                const auction = (await marketContract.getAuctions())[auctionId];
                expect(auction.status).to.be.equal(AuctionStatus.Ended);
              });
            });
            describe("MATIC payment", () => {
              let auctionId = 0;
              let user1InitialBalance;
              let user2InitialBalance;
              let fee, feeRecipientBeforeBalance, royaltyFeeBPS;
              before(async () => {
                await resetTime();

                royaltyFeeBPS = 200;
                // start a new auction with royalty NFT
                await deployAndStartAuctionWithRoyalty(
                  ethers.ZeroAddress,
                  royaltyFeeBPS
                );

                fee = Number(await marketContract.fee());

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
              });
              it("should not allow auction end before endTime", async () => {
                await moveTimeTo(AuctionParam.startTime);

                const bidAmount = getAmountInWei(25);

                await marketContract
                  .connect(user3)
                  .bid(auctionId, 0, { value: bidAmount });

                await expect(
                  marketContract.connect(user3).endAuction(auctionId)
                ).to.be.revertedWithCustomError(
                  marketContract,
                  "AARTMarket_AuctionPeriodNotEnded"
                );
              });
              it("should allow user to end auction after ending period", async () => {
                await moveTimeTo(AuctionParam.endTime + 60);

                // get current highest bidder
                const auction = (await marketContract.getAuctions())[auctionId];

                await expect(
                  marketContract.connect(user1).endAuction(auctionId)
                )
                  .to.emit(marketContract, "AuctionEnded")
                  .withArgs(auctionId, auction.highestBidder);
              });
              it("should transfer NFT to the highest bidder", async () => {
                const auction = (await marketContract.getAuctions())[auctionId];
                expect(
                  await nftContract.ownerOf(AuctionParam.tokenId)
                ).to.be.equal(auction.highestBidder);
              });
              let highestBid;
              it("should send fee amount", async () => {
                const feeRecepientAfterBalance = getAmountFromWei(
                  await ethers.provider.getBalance(owner.address)
                );

                const auction = (await marketContract.getAuctions())[auctionId];
                highestBid = auction.highestBid;

                const expectedBalance =
                  feeRecipientBeforeBalance +
                  getAmountFromWei(highestBid) * (fee / 1000);
                expect(Math.round(feeRecepientAfterBalance)).to.be.equal(
                  Math.round(expectedBalance)
                );
              });
              it("should send royalty to original creator", async () => {
                // user1 matic after balance
                const user1FinalBalance = getAmountFromWei(
                  await ethers.provider.getBalance(user1.address)
                );

                const expectedBalance =
                  user1InitialBalance +
                  (getAmountFromWei(highestBid) * royaltyFeeBPS) / 10000;
                expect(parseFloat(user1FinalBalance).toFixed(2)).to.be.equal(
                  parseFloat(expectedBalance).toFixed(2)
                );
              });
              it("should send remaining buy price to seller", async () => {
                // user2 matic after balance
                const user2FinalBalance = getAmountFromWei(
                  await ethers.provider.getBalance(user2.address)
                );

                const salePrice = getAmountFromWei(highestBid);
                const feeAmount = (salePrice * fee) / 1000;
                const royaltyAmount = (salePrice * royaltyFeeBPS) / 10000;
                const remainAmount = salePrice - feeAmount - royaltyAmount;
                const expectedBalance = user2InitialBalance + remainAmount;

                expect(parseFloat(user2FinalBalance).toFixed(6)).to.be.equal(
                  parseFloat(expectedBalance).toFixed(6)
                );
              });
              it("should update auction status to ended", async () => {
                const auction = (await marketContract.getAuctions())[auctionId];
                expect(auction.status).to.be.equal(AuctionStatus.Ended);
              });
            });
          });
        });
      });
      describe("withdrawBid()", () => {
        describe("ERC20 token payment", () => {
          let auctionId = 0;
          before(async () => {
            await resetTime();

            // start a new auction
            await deployAndStartAuction(erc20Mock.target);
          });
          it("should revert if user has no bid", async () => {
            await moveTimeTo(AuctionParam.startTime);

            await expect(
              marketContract.connect(user3).withdrawBid(auctionId)
            ).to.be.revertedWithCustomError(
              marketContract,
              "AARTMarket_HasNoBid"
            );
          });
          it("should allow user to withdraw bid", async () => {
            const bidAmount = getAmountInWei(15);
            // mint erc20 tokens to user2
            await mintERC20(user2, erc20Mock.target, bidAmount);
            // approve tokens to market
            await approveERC20(
              user2,
              erc20Mock.target,
              bidAmount,
              marketContract.target
            );
            await marketContract.connect(user2).bid(auctionId, bidAmount);

            const bidAmount2 = getAmountInWei(25);
            // mint erc20 tokens to user3
            await mintERC20(user3, erc20Mock.target, bidAmount2);
            // approve tokens to market
            await approveERC20(
              user3,
              erc20Mock.target,
              bidAmount2,
              marketContract.target
            );
            await marketContract.connect(user3).bid(auctionId, bidAmount2);

            const user2BeforeBalance = getAmountFromWei(
              await erc20Mock.balanceOf(user2.address)
            );

            // withdraw user2 bid
            await marketContract.connect(user2).withdrawBid(auctionId);

            const user2AfterBalance = getAmountFromWei(
              await erc20Mock.balanceOf(user2.address)
            );

            expect(user2AfterBalance).to.be.equal(user2BeforeBalance + 15);

            expect(
              await marketContract.getUserBidAmount(auctionId, user2.address)
            ).to.be.equal(0);
          });
          it("should revert if highest bidder tries to withdraw bid in open auction", async () => {
            await expect(
              marketContract.connect(user3).withdrawBid(auctionId)
            ).to.be.revertedWithCustomError(
              marketContract,
              "AARTMarket_IsHighestBidder"
            );
          });
          it("should allow highest bidder to withdraw bid if auction is canceled", async () => {
            // seller canacel auction
            await marketContract.connect(user1).cancelAuction(auctionId);

            const user3BeforeBalance = getAmountFromWei(
              await erc20Mock.balanceOf(user3.address)
            );

            const user3BidAmount = getAmountFromWei(
              await marketContract.getUserBidAmount(auctionId, user3.address)
            );

            // withdraw user3 bid
            await marketContract.connect(user3).withdrawBid(auctionId);

            const user3AfterBalance = getAmountFromWei(
              await erc20Mock.balanceOf(user3.address)
            );

            expect(parseFloat(user3AfterBalance).toFixed(3)).to.be.equal(
              parseFloat(user3BeforeBalance + user3BidAmount).toFixed(3)
            );

            expect(
              await marketContract.getUserBidAmount(auctionId, user3.address)
            ).to.be.equal(0);
          });
        });
        describe("MATIC payment", () => {
          let auctionId = 0;
          before(async () => {
            await resetTime();

            // start a new auction
            await deployAndStartAuction(ethers.ZeroAddress);
          });
          it("should revert if user has no bid", async () => {
            await moveTimeTo(AuctionParam.startTime);
            await expect(
              marketContract.connect(user3).withdrawBid(auctionId)
            ).to.be.revertedWithCustomError(
              marketContract,
              "AARTMarket_HasNoBid"
            );
          });
          it("should allow user to withdraw bid", async () => {
            await marketContract
              .connect(user2)
              .bid(auctionId, 0, { value: getAmountInWei(15) });

            await marketContract
              .connect(user3)
              .bid(auctionId, 0, { value: getAmountInWei(25) });

            const user2BeforeBalance = getAmountFromWei(
              await ethers.provider.getBalance(user2.address)
            );
            // withdraw user2 bid
            await marketContract.connect(user2).withdrawBid(auctionId);
            const user2AfterBalance = getAmountFromWei(
              await ethers.provider.getBalance(user2.address)
            );

            expect(parseFloat(user2AfterBalance).toFixed(3)).to.be.equal(
              parseFloat(user2BeforeBalance + 15).toFixed(3)
            );

            expect(
              await marketContract.getUserBidAmount(auctionId, user2.address)
            ).to.be.equal(0);
          });
          it("should revert if highest bidder tries to withdraw bid in open auction", async () => {
            await expect(
              marketContract.connect(user3).withdrawBid(auctionId)
            ).to.be.revertedWithCustomError(
              marketContract,
              "AARTMarket_IsHighestBidder"
            );
          });
          it("should allow highest bidder to withdraw bid if auction is canceled", async () => {
            // seller canacel auction
            await marketContract.connect(user1).cancelAuction(auctionId);

            const user3BeforeBalance = getAmountFromWei(
              await ethers.provider.getBalance(user3.address)
            );

            const user3BidAmount = getAmountFromWei(
              await marketContract.getUserBidAmount(auctionId, user3.address)
            );

            // withdraw user3 bid
            await marketContract.connect(user3).withdrawBid(auctionId);

            const user3AfterBalance = getAmountFromWei(
              await ethers.provider.getBalance(user3.address)
            );

            expect(parseFloat(user3AfterBalance).toFixed(3)).to.be.equal(
              parseFloat(user3BeforeBalance + user3BidAmount).toFixed(3)
            );

            expect(
              await marketContract.getUserBidAmount(auctionId, user3.address)
            ).to.be.equal(0);
          });
        });
      });
      describe("cancelAuction()", () => {
        let auctionId = 0;
        before(async () => {
          await resetTime();

          // start a new auction
          await deployAndStartAuction(erc20Mock.target);
        });
        it("should not allow non seller to cancel auction", async () => {
          await expect(
            marketContract.connect(user2).cancelAuction(auctionId)
          ).to.be.revertedWithCustomError(
            marketContract,
            "AARTMarket_OnlySeller"
          );
        });
        it("should allow seller to cancel auction", async () => {
          await expect(marketContract.connect(user1).cancelAuction(auctionId))
            .to.emit(marketContract, "AuctionCanceled")
            .withArgs(auctionId);
        });
        it("should transfer NFT back to the seller", async () => {
          expect(await nftContract.ownerOf(AuctionParam.tokenId)).to.be.equal(
            user1.address
          );
        });
        it("should update auction status to Canceled", async () => {
          const auction = (await marketContract.getAuctions())[auctionId];
          expect(auction.status).to.be.equal(AuctionStatus.Canceled);
        });
        it("should revert if auction status is not open/closed", async () => {
          await expect(
            marketContract.connect(user1).cancelAuction(auctionId)
          ).to.be.revertedWithCustomError(
            marketContract,
            "AARTMarket_CancelImpossible"
          );
        });
      });
    });
