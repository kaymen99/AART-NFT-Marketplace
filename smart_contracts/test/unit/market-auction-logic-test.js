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
  moveTimeTo,
  resetTime,
} = require("../../utils/helpers");

const AuctionStatus = {
  Open: 0,
  Close: 1,
  Ended: 2,
  DirectBuy: 3,
  Canceled: 4,
};

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("AART market Auction Logic Unit Tests", () => {
      let owner;
      let nftContract;
      let marketContract;
      let erc20Mock;

      before(async () => {
        [owner, user1, user2, user3, randomUser] = await ethers.getSigners();

        erc20Mock = await deployERC20Mock();
      });

      describe("startAuction()", () => {
        before(async () => {
          // Deploy NFT Collection contract
          nftContract = await deployNFTContract(owner);

          // Deploy AART market contract
          const MarketContract = await ethers.getContractFactory("AARTMarket");
          marketContract = await MarketContract.deploy(nftContract.address);
          await marketContract.deployed();
        });
        let AuctionParam = {
          tokenId: 0,
          paymentToken: ethers.constants.AddressZero,
          directBuyPrice: 0,
          startPrice: 0,
          startTime: 0,
          endTime: 0,
        };
        it("should not allow user to start auction with unsupported payment token", async () => {
          // mint new NFT
          await mintNewNFT(nftContract, user1);

          AuctionParam.tokenId = 0;
          AuctionParam.paymentToken = erc20Mock.address;
          AuctionParam.directBuyPrice = getAmountInWei(100);
          AuctionParam.startPrice = getAmountInWei(10);
          AuctionParam.startTime = Math.floor(
            new Date("2023.10.10").getTime() / 1000
          );
          AuctionParam.endTime = Math.floor(
            new Date("2023.10.18").getTime() / 1000
          );
          // approve NFT to market contract
          await approveERC721(
            user1,
            nftContract,
            AuctionParam.tokenId,
            marketContract.address
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
        let startedEvent;
        it("should allow user to start an auction", async () => {
          // allow erc20Mock token
          await marketContract
            .connect(owner)
            .addSupportedToken(erc20Mock.address);

          const tx = await marketContract
            .connect(user1)
            .startAuction(
              AuctionParam.tokenId,
              AuctionParam.paymentToken,
              AuctionParam.directBuyPrice,
              AuctionParam.startPrice,
              AuctionParam.startTime,
              AuctionParam.endTime
            );
          const txReceipt = await tx.wait(1);
          startedEvent = txReceipt.events[txReceipt.events.length - 1];

          expect((await marketContract.getAuctions()).length).to.be.equal(1);
        });
        it("should transfer NFT to market contract", async () => {
          expect(await nftContract.ownerOf(AuctionParam.tokenId)).to.be.equal(
            marketContract.address
          );
        });
        it("should emit AuctionStarted event", async () => {
          expect(startedEvent.event).to.be.equal("AuctionStarted");
          expect(startedEvent.args.auctionId).to.be.equal(0);
          expect(startedEvent.args.seller).to.be.equal(user1.address);
          expect(startedEvent.args.tokenId).to.be.equal(AuctionParam.tokenId);
          expect(startedEvent.args.startTime).to.be.equal(
            AuctionParam.startTime
          );
        });
        it("should store correct auction info", async () => {
          const auctionId = 0;
          const auction = (await marketContract.getAuctions())[auctionId];
          expect(auction.tokenId).to.be.equal(AuctionParam.tokenId);
          expect(auction.seller).to.be.equal(user1.address);
          expect(auction.paymentToken).to.be.equal(AuctionParam.paymentToken);
          expect(auction.highestBidder).to.be.equal(
            ethers.constants.AddressZero
          );
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
            new Date("2023.10.15").getTime() / 1000
          );
          AuctionParam.endTime = Math.floor(
            new Date("2023.10.10").getTime() / 1000
          );

          // approve NFT to market contract
          await approveERC721(
            user2,
            nftContract,
            AuctionParam.tokenId,
            marketContract.address
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
        it("should revert if startTime is in the past", async () => {
          AuctionParam.startTime = Math.floor(
            new Date("2020.10.15").getTime() / 1000
          );

          // approve NFT to market contract
          await approveERC721(
            user2,
            nftContract,
            AuctionParam.tokenId,
            marketContract.address
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
            "AARTMarket_InvalidStartTime"
          );
        });
        it("should revert if startPrice is zero", async () => {
          AuctionParam.startTime = Math.floor(
            new Date("2023.10.10").getTime() / 1000
          );
          AuctionParam.endTime = Math.floor(
            new Date("2023.10.20").getTime() / 1000
          );
          AuctionParam.startPrice = getAmountInWei(0);

          // approve NFT to market contract
          await approveERC721(
            user2,
            nftContract,
            AuctionParam.tokenId,
            marketContract.address
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
            marketContract.address
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
          let AuctionParam = {
            tokenId: 0,
            paymentToken: ethers.constants.AddressZero,
            directBuyPrice: 0,
            startPrice: 0,
            startTime: 0,
            endTime: 0,
          };
          before(async () => {
            // Deploy NFT Collection contract
            nftContract = await deployNFTContract(owner);

            // Deploy AART market contract
            const MarketContract = await ethers.getContractFactory(
              "AARTMarket"
            );
            marketContract = await MarketContract.deploy(nftContract.address);
            await marketContract.deployed();

            // allow erc20Mock token
            await marketContract
              .connect(owner)
              .addSupportedToken(erc20Mock.address);

            // start new auction
            await mintNewNFT(nftContract, user1);

            AuctionParam.tokenId = 0;
            AuctionParam.paymentToken = erc20Mock.address;
            AuctionParam.directBuyPrice = getAmountInWei(100);
            AuctionParam.startPrice = getAmountInWei(10);
            AuctionParam.startTime = Math.floor(
              new Date("2023.12.20").getTime() / 1000
            );
            AuctionParam.endTime = Math.floor(
              new Date("2023.12.28").getTime() / 1000
            );
            // approve NFT to market contract
            await approveERC721(
              user1,
              nftContract,
              AuctionParam.tokenId,
              marketContract.address
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
          });
          let bidAmount;
          it("should not allow user to bid until auction starts", async () => {
            bidAmount = getAmountInWei(15);
            // mint erc20 tokens to user2
            await mintERC20(user2, erc20Mock.address, bidAmount);
            // approve tokens to market
            await approveERC20(
              user2,
              erc20Mock.address,
              bidAmount,
              marketContract.address
            );
            await expect(
              marketContract.connect(user2).bid(auctionId, bidAmount)
            ).to.be.revertedWithCustomError(
              marketContract,
              "AARTMarket_AuctionNotOpen"
            );
          });
          let newBidEvent;
          it("should allow user to bid on open auction", async () => {
            await moveTimeTo(AuctionParam.startTime);

            const tx = await marketContract
              .connect(user2)
              .bid(auctionId, bidAmount);
            const txReceipt = await tx.wait(1);
            newBidEvent = txReceipt.events[txReceipt.events.length - 1];
          });
          it("should transfer bid amount to market contract", async () => {
            expect(
              await erc20Mock.balanceOf(marketContract.address)
            ).to.be.equal(bidAmount);
          });
          it("should update bidder auction bid amount", async () => {
            expect(
              await marketContract.getUserBidAmount(auctionId, user2.address)
            ).to.be.equal(bidAmount);
          });
          it("should emit NewBid event", async () => {
            expect(newBidEvent.event).to.be.equal("NewBid");
            expect(newBidEvent.args.auctionId).to.be.equal(auctionId);
            expect(newBidEvent.args.bidder).to.be.equal(user2.address);
            expect(newBidEvent.args.bidAmount).to.be.equal(bidAmount);
          });
          it("should update auction info", async () => {
            const auction = (await marketContract.getAuctions())[auctionId];
            expect(auction.highestBidder).to.be.equal(user2.address);
            expect(auction.highestBid).to.be.equal(bidAmount);
          });
          it("should allow second user to overbid on open auction", async () => {
            const bidAmount2 = getAmountInWei(25);
            // mint erc20 tokens to user3
            await mintERC20(user3, erc20Mock.address, bidAmount2);
            // approve tokens to market
            await approveERC20(
              user3,
              erc20Mock.address,
              bidAmount2,
              marketContract.address
            );

            const marketBeforeBalance = await erc20Mock.balanceOf(
              marketContract.address
            );

            await marketContract.connect(user3).bid(auctionId, bidAmount2);

            const marketAfterBalance = await erc20Mock.balanceOf(
              marketContract.address
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
            await mintERC20(user3, erc20Mock.address, bidAmount3);
            // approve tokens to market
            await approveERC20(
              user3,
              erc20Mock.address,
              bidAmount3,
              marketContract.address
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
            await mintERC20(user2, erc20Mock.address, bidAmount);
            // approve tokens to market
            await approveERC20(
              user2,
              erc20Mock.address,
              bidAmount,
              marketContract.address
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
          let AuctionParam = {
            tokenId: 0,
            paymentToken: ethers.constants.AddressZero,
            directBuyPrice: 0,
            startPrice: 0,
            startTime: 0,
            endTime: 0,
          };
          before(async () => {
            await resetTime();

            // Deploy NFT Collection contract
            nftContract = await deployNFTContract(owner);

            // Deploy AART market contract
            const MarketContract = await ethers.getContractFactory(
              "AARTMarket"
            );
            marketContract = await MarketContract.deploy(nftContract.address);
            await marketContract.deployed();

            // start new auction
            await mintNewNFT(nftContract, user1);

            AuctionParam.tokenId = 0;
            AuctionParam.paymentToken = ethers.constants.AddressZero;
            AuctionParam.directBuyPrice = getAmountInWei(100);
            AuctionParam.startPrice = getAmountInWei(10);
            AuctionParam.startTime = Math.floor(
              new Date("2023.12.20").getTime() / 1000
            );
            AuctionParam.endTime = Math.floor(
              new Date("2023.12.28").getTime() / 1000
            );
            // approve NFT to market contract
            await approveERC721(
              user1,
              nftContract,
              AuctionParam.tokenId,
              marketContract.address
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
          let newBidEvent;
          it("should allow user to bid on open auction", async () => {
            await moveTimeTo(AuctionParam.startTime);

            const tx = await marketContract
              .connect(user2)
              .bid(auctionId, 0, { value: bidAmount });
            const txReceipt = await tx.wait(1);
            newBidEvent = txReceipt.events[txReceipt.events.length - 1];
          });
          it("should transfer bid amount to market contract", async () => {
            expect(
              await ethers.provider.getBalance(marketContract.address)
            ).to.be.equal(bidAmount);
          });
          it("should update bidder auction bid amount", async () => {
            expect(
              await marketContract.getUserBidAmount(auctionId, user2.address)
            ).to.be.equal(bidAmount);
          });
          it("should emit NewBid event", async () => {
            expect(newBidEvent.event).to.be.equal("NewBid");
            expect(newBidEvent.args.auctionId).to.be.equal(auctionId);
            expect(newBidEvent.args.bidder).to.be.equal(user2.address);
            expect(newBidEvent.args.bidAmount).to.be.equal(bidAmount);
          });
          it("should update auction info", async () => {
            const auction = (await marketContract.getAuctions())[auctionId];
            expect(auction.highestBidder).to.be.equal(user2.address);
            expect(auction.highestBid).to.be.equal(bidAmount);
          });
          it("should allow second user to overbid on open auction", async () => {
            const bidAmount2 = getAmountInWei(25);

            const marketBeforeBalance = await ethers.provider.getBalance(
              marketContract.address
            );

            await marketContract
              .connect(user3)
              .bid(auctionId, 0, { value: bidAmount2 });

            const marketAfterBalance = await ethers.provider.getBalance(
              marketContract.address
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
            let AuctionParam = {
              tokenId: 0,
              paymentToken: ethers.constants.AddressZero,
              directBuyPrice: 0,
              startPrice: 0,
              startTime: 0,
              endTime: 0,
            };
            let user1InitialBalance;

            let fee;
            let feeRecipientBeforeBalance;
            before(async () => {
              await resetTime();
              // Deploy NFT Collection contract
              nftContract = await deployNFTContract(owner);
              // Deploy AART market contract
              const MarketContract = await ethers.getContractFactory(
                "AARTMarket"
              );
              marketContract = await MarketContract.deploy(nftContract.address);
              await marketContract.deployed();

              await marketContract
                .connect(owner)
                .addSupportedToken(erc20Mock.address);

              fee = await marketContract.fee();

              // user1 erc20 balance
              user1InitialBalance = getAmountFromWei(
                await erc20Mock.balanceOf(user1.address)
              );

              feeRecipientBeforeBalance = getAmountFromWei(
                await erc20Mock.balanceOf(owner.address)
              );

              // start new auction
              await mintNewNFT(nftContract, user1);

              AuctionParam.tokenId = 0;
              AuctionParam.paymentToken = erc20Mock.address;
              AuctionParam.directBuyPrice = getAmountInWei(100);
              AuctionParam.startPrice = getAmountInWei(10);
              AuctionParam.startTime = Math.floor(
                new Date("2023.12.25").getTime() / 1000
              );
              AuctionParam.endTime = Math.floor(
                new Date("2023.12.28").getTime() / 1000
              );
              // approve NFT to market contract
              await approveERC721(
                user1,
                nftContract,
                AuctionParam.tokenId,
                marketContract.address
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
            });
            it("should not allow user to buy when auction is not open", async () => {
              const price = AuctionParam.directBuyPrice;
              // mint erc20 tokens to user2
              await mintERC20(user2, erc20Mock.address, price);
              // approve tokens to market
              await approveERC20(
                user2,
                erc20Mock.address,
                price,
                marketContract.address
              );
              await expect(
                marketContract.connect(user2).directBuyAuction(auctionId)
              ).to.be.revertedWithCustomError(
                marketContract,
                "AARTMarket_AuctionNotOpen"
              );
            });
            let directBuyEvent;
            it("should allow user to buy NFT from auction", async () => {
              await moveTimeTo(AuctionParam.startTime);

              const tx = await marketContract
                .connect(user2)
                .directBuyAuction(auctionId);
              const txReceipt = await tx.wait(1);
              directBuyEvent = txReceipt.events[txReceipt.events.length - 1];
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
            it("should emit AuctionDirectBuy event", async () => {
              expect(directBuyEvent.event).to.be.equal("AuctionDirectBuy");
              expect(directBuyEvent.args.auctionId).to.be.equal(auctionId);
              expect(directBuyEvent.args.buyer).to.be.equal(user2.address);
            });
            it("should update auction status to direct buy", async () => {
              const auction = (await marketContract.getAuctions())[auctionId];
              expect(auction.status).to.be.equal(AuctionStatus.DirectBuy);
            });
          });
          describe("MATIC payment", () => {
            let auctionId = 0;
            let AuctionParam = {
              tokenId: 0,
              paymentToken: ethers.constants.AddressZero,
              directBuyPrice: 0,
              startPrice: 0,
              startTime: 0,
              endTime: 0,
            };
            let user1InitialBalance;

            let fee;
            let feeRecipientBeforeBalance;
            before(async () => {
              await resetTime();

              // Deploy NFT Collection contract
              nftContract = await deployNFTContract(owner);
              // Deploy AART market contract
              const MarketContract = await ethers.getContractFactory(
                "AARTMarket"
              );
              marketContract = await MarketContract.deploy(nftContract.address);
              await marketContract.deployed();

              fee = await marketContract.fee();

              // start new auction
              await mintNewNFT(nftContract, user1);

              AuctionParam.tokenId = 0;
              AuctionParam.paymentToken = ethers.constants.AddressZero;
              AuctionParam.directBuyPrice = getAmountInWei(100);
              AuctionParam.startPrice = getAmountInWei(10);
              AuctionParam.startTime = Math.floor(
                new Date("2023.12.25").getTime() / 1000
              );
              AuctionParam.endTime = Math.floor(
                new Date("2023.12.28").getTime() / 1000
              );
              // approve NFT to market contract
              await approveERC721(
                user1,
                nftContract,
                AuctionParam.tokenId,
                marketContract.address
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
              // user1 matic balance
              user1InitialBalance = getAmountFromWei(await user1.getBalance());

              feeRecipientBeforeBalance = getAmountFromWei(
                await owner.getBalance()
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
            let directBuyEvent;
            it("should allow user to buy NFT from auction", async () => {
              await moveTimeTo(AuctionParam.startTime);

              const tx = await marketContract
                .connect(user2)
                .directBuyAuction(auctionId, {
                  value: AuctionParam.directBuyPrice,
                });
              const txReceipt = await tx.wait(1);
              directBuyEvent = txReceipt.events[txReceipt.events.length - 1];
            });
            it("should transfer bought NFT to buyer", async () => {
              expect(
                await nftContract.ownerOf(AuctionParam.tokenId)
              ).to.be.equal(user2.address);
            });
            it("should send fee amount", async () => {
              const feeRecepientAfterBalance = getAmountFromWei(
                await owner.getBalance()
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
                await user1.getBalance()
              );
              const expectedBalance =
                user1InitialBalance +
                getAmountFromWei(AuctionParam.directBuyPrice) *
                  ((1000 - fee) / 1000);
              expect(user1FinalBalance).to.be.equal(expectedBalance);
            });
            it("should emit AuctionDirectBuy event", async () => {
              expect(directBuyEvent.event).to.be.equal("AuctionDirectBuy");
              expect(directBuyEvent.args.auctionId).to.be.equal(auctionId);
              expect(directBuyEvent.args.buyer).to.be.equal(user2.address);
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
            let AuctionParam = {
              tokenId: 0,
              paymentToken: ethers.constants.AddressZero,
              directBuyPrice: 0,
              startPrice: 0,
              startTime: 0,
              endTime: 0,
            };
            let royaltyFeeBPS;
            let user1InitialBalance;
            let user2InitialBalance;

            let fee;
            let feeRecipientBeforeBalance;
            before(async () => {
              await resetTime();

              // Deploy NFT Collection contract
              nftContract = await deployNFTContract(owner);
              // Deploy AART market contract
              const MarketContract = await ethers.getContractFactory(
                "AARTMarket"
              );
              marketContract = await MarketContract.deploy(nftContract.address);
              await marketContract.deployed();

              await marketContract
                .connect(owner)
                .addSupportedToken(erc20Mock.address);

              fee = await marketContract.fee();

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

              // list new item
              royaltyFeeBPS = 100;
              await mintNewNFTWithRoyalty(nftContract, user1, royaltyFeeBPS);
              tokenId = 0;
              // transfer NFT to user2 to test if royalty work
              await nftContract
                .connect(user1)
                .transferFrom(user1.address, user2.address, tokenId);

              AuctionParam.tokenId = 0;
              AuctionParam.paymentToken = erc20Mock.address;
              AuctionParam.directBuyPrice = getAmountInWei(100);
              AuctionParam.startPrice = getAmountInWei(10);
              AuctionParam.startTime = Math.floor(
                new Date("2023.12.25").getTime() / 1000
              );
              AuctionParam.endTime = Math.floor(
                new Date("2023.12.28").getTime() / 1000
              );
              // approve NFT to market contract
              await approveERC721(
                user2,
                nftContract,
                AuctionParam.tokenId,
                marketContract.address
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
            });
            it("should not allow user to buy when auction is not open", async () => {
              const price = AuctionParam.directBuyPrice;
              // mint erc20 tokens to user2
              await mintERC20(user3, erc20Mock.address, price);
              // approve tokens to market
              await approveERC20(
                user3,
                erc20Mock.address,
                price,
                marketContract.address
              );
              await expect(
                marketContract.connect(user3).directBuyAuction(auctionId)
              ).to.be.revertedWithCustomError(
                marketContract,
                "AARTMarket_AuctionNotOpen"
              );
            });
            let directBuyEvent;
            it("should allow user to buy NFT from auction", async () => {
              await moveTimeTo(AuctionParam.startTime);

              const tx = await marketContract
                .connect(user3)
                .directBuyAuction(auctionId);
              const txReceipt = await tx.wait(1);
              directBuyEvent = txReceipt.events[txReceipt.events.length - 1];
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
            it("should emit AuctionDirectBuy event", async () => {
              expect(directBuyEvent.event).to.be.equal("AuctionDirectBuy");
              expect(directBuyEvent.args.auctionId).to.be.equal(auctionId);
              expect(directBuyEvent.args.buyer).to.be.equal(user3.address);
            });
            it("should update auction status to direct buy", async () => {
              const auction = (await marketContract.getAuctions())[auctionId];
              expect(auction.status).to.be.equal(AuctionStatus.DirectBuy);
            });
          });
          describe("MATIC payment", () => {
            let auctionId = 0;
            let AuctionParam = {
              tokenId: 0,
              paymentToken: ethers.constants.AddressZero,
              directBuyPrice: 0,
              startPrice: 0,
              startTime: 0,
              endTime: 0,
            };
            let royaltyFeeBPS;
            let user1InitialBalance;
            let user2InitialBalance;

            let fee;
            let feeRecipientBeforeBalance;
            before(async () => {
              await resetTime();

              // Deploy NFT Collection contract
              nftContract = await deployNFTContract(owner);
              // Deploy AART market contract
              const MarketContract = await ethers.getContractFactory(
                "AARTMarket"
              );
              marketContract = await MarketContract.deploy(nftContract.address);
              await marketContract.deployed();

              fee = await marketContract.fee();

              // list new item
              royaltyFeeBPS = 200;
              await mintNewNFTWithRoyalty(nftContract, user1, royaltyFeeBPS);
              tokenId = 0;
              // transfer NFT to user2 to test if royalty work
              await nftContract
                .connect(user1)
                .transferFrom(user1.address, user2.address, tokenId);

              AuctionParam.tokenId = 0;
              AuctionParam.paymentToken = ethers.constants.AddressZero;
              AuctionParam.directBuyPrice = getAmountInWei(100);
              AuctionParam.startPrice = getAmountInWei(10);
              AuctionParam.startTime = Math.floor(
                new Date("2023.12.25").getTime() / 1000
              );
              AuctionParam.endTime = Math.floor(
                new Date("2023.12.28").getTime() / 1000
              );
              // approve NFT to market contract
              await approveERC721(
                user2,
                nftContract,
                AuctionParam.tokenId,
                marketContract.address
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

              // user1 matic balance
              user1InitialBalance = getAmountFromWei(await user1.getBalance());

              // user2 matic balance
              user2InitialBalance = getAmountFromWei(await user2.getBalance());

              feeRecipientBeforeBalance = getAmountFromWei(
                await owner.getBalance()
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
            let directBuyEvent;
            it("should allow user to buy NFT from auction", async () => {
              await moveTimeTo(AuctionParam.startTime);

              const tx = await marketContract
                .connect(user3)
                .directBuyAuction(auctionId, {
                  value: AuctionParam.directBuyPrice,
                });
              const txReceipt = await tx.wait(1);
              directBuyEvent = txReceipt.events[txReceipt.events.length - 1];
            });
            it("should transfer bought NFT to buyer", async () => {
              expect(
                await nftContract.ownerOf(AuctionParam.tokenId)
              ).to.be.equal(user3.address);
            });
            it("should send fee amount", async () => {
              const feeRecepientAfterBalance = getAmountFromWei(
                await owner.getBalance()
              );
              const expectedBalance =
                feeRecipientBeforeBalance +
                getAmountFromWei(AuctionParam.directBuyPrice) * (fee / 1000);
              expect(feeRecepientAfterBalance).to.be.equal(expectedBalance);
            });
            it("should send royalty to original creator", async () => {
              // user1 matic after balance
              const user1FinalBalance = getAmountFromWei(
                await user1.getBalance()
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
                await user2.getBalance()
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
            it("should emit AuctionDirectBuy event", async () => {
              expect(directBuyEvent.event).to.be.equal("AuctionDirectBuy");
              expect(directBuyEvent.args.auctionId).to.be.equal(auctionId);
              expect(directBuyEvent.args.buyer).to.be.equal(user3.address);
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
          let AuctionParam = {
            tokenId: 0,
            paymentToken: ethers.constants.AddressZero,
            directBuyPrice: 0,
            startPrice: 0,
            startTime: 0,
            endTime: 0,
          };
          before(async () => {
            await resetTime();

            // Deploy NFT Collection contract
            nftContract = await deployNFTContract(owner);
            // Deploy AART market contract
            const MarketContract = await ethers.getContractFactory(
              "AARTMarket"
            );
            marketContract = await MarketContract.deploy(nftContract.address);
            await marketContract.deployed();

            // allow erc20Mock token
            await marketContract
              .connect(owner)
              .addSupportedToken(erc20Mock.address);

            // list new item
            await mintNewNFT(nftContract, user1);

            AuctionParam.tokenId = 0;
            AuctionParam.paymentToken = erc20Mock.address;
            AuctionParam.directBuyPrice = getAmountInWei(100);
            AuctionParam.startPrice = getAmountInWei(10);
            AuctionParam.startTime = Math.floor(
              new Date("2023.12.25").getTime() / 1000
            );
            AuctionParam.endTime = Math.floor(
              new Date("2023.12.28").getTime() / 1000
            );
            // approve NFT to market contract
            await approveERC721(
              user1,
              nftContract,
              AuctionParam.tokenId,
              marketContract.address
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

            moveTimeTo(AuctionParam.startTime);
          });
          it("should not allow auction end before endTime", async () => {
            await expect(
              marketContract.connect(user1).endAuction(auctionId)
            ).to.be.revertedWithCustomError(
              marketContract,
              "AARTMarket_AuctionPeriodNotEnded"
            );
          });
          let endEvent;
          it("should allow user end auction after ending period", async () => {
            await moveTimeTo(AuctionParam.endTime + 60);

            const tx = await marketContract
              .connect(user1)
              .endAuction(auctionId);
            const txReceipt = await tx.wait(1);
            endEvent = txReceipt.events[txReceipt.events.length - 1];
          });
          it("should transfer bought NFT back to the seller", async () => {
            expect(await nftContract.ownerOf(AuctionParam.tokenId)).to.be.equal(
              user1.address
            );
          });
          it("should emit AuctionEnded event", async () => {
            expect(endEvent.event).to.be.equal("AuctionEnded");
            expect(endEvent.args.auctionId).to.be.equal(auctionId);
            expect(endEvent.args.buyer).to.be.equal(
              ethers.constants.AddressZero
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
              let AuctionParam = {
                tokenId: 0,
                paymentToken: ethers.constants.AddressZero,
                directBuyPrice: 0,
                startPrice: 0,
                startTime: 0,
                endTime: 0,
              };
              let user1InitialBalance;

              let fee;
              let feeRecipientBeforeBalance;
              before(async () => {
                await resetTime();
                // Deploy NFT Collection contract
                nftContract = await deployNFTContract(owner);
                // Deploy AART market contract
                const MarketContract = await ethers.getContractFactory(
                  "AARTMarket"
                );
                marketContract = await MarketContract.deploy(
                  nftContract.address
                );
                await marketContract.deployed();

                await marketContract
                  .connect(owner)
                  .addSupportedToken(erc20Mock.address);

                fee = await marketContract.fee();

                // user1 erc20 balance
                user1InitialBalance = getAmountFromWei(
                  await erc20Mock.balanceOf(user1.address)
                );

                feeRecipientBeforeBalance = getAmountFromWei(
                  await erc20Mock.balanceOf(owner.address)
                );

                // start new auction
                await mintNewNFT(nftContract, user1);

                AuctionParam.tokenId = 0;
                AuctionParam.paymentToken = erc20Mock.address;
                AuctionParam.directBuyPrice = getAmountInWei(100);
                AuctionParam.startPrice = getAmountInWei(10);
                AuctionParam.startTime = Math.floor(
                  new Date("2023.12.25").getTime() / 1000
                );
                AuctionParam.endTime = Math.floor(
                  new Date("2023.12.28").getTime() / 1000
                );
                // approve NFT to market contract
                await approveERC721(
                  user1,
                  nftContract,
                  AuctionParam.tokenId,
                  marketContract.address
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
              });
              it("should not allow auction end before endTime", async () => {
                await moveTimeTo(AuctionParam.startTime);

                const bidAmount = getAmountInWei(15);
                // mint erc20 tokens to user2
                await mintERC20(user2, erc20Mock.address, bidAmount);
                // approve tokens to market
                await approveERC20(
                  user2,
                  erc20Mock.address,
                  bidAmount,
                  marketContract.address
                );

                await marketContract.connect(user2).bid(auctionId, bidAmount);

                await expect(
                  marketContract.connect(user1).endAuction(auctionId)
                ).to.be.revertedWithCustomError(
                  marketContract,
                  "AARTMarket_AuctionPeriodNotEnded"
                );
              });
              let endEvent;
              it("should allow user to end auction after ending period", async () => {
                await moveTimeTo(AuctionParam.endTime + 60);

                const tx = await marketContract
                  .connect(user1)
                  .endAuction(auctionId);
                const txReceipt = await tx.wait(1);
                endEvent = txReceipt.events[txReceipt.events.length - 1];
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
              it("should emit AuctionEnded event", async () => {
                const auction = (await marketContract.getAuctions())[auctionId];
                expect(endEvent.event).to.be.equal("AuctionEnded");
                expect(endEvent.args.auctionId).to.be.equal(auctionId);
                expect(endEvent.args.buyer).to.be.equal(auction.highestBidder);
              });
              it("should update auction status to ended", async () => {
                const auction = (await marketContract.getAuctions())[auctionId];
                expect(auction.status).to.be.equal(AuctionStatus.Ended);
              });
            });
            describe("MATIC payment", () => {
              let auctionId = 0;
              let AuctionParam = {
                tokenId: 0,
                paymentToken: ethers.constants.AddressZero,
                directBuyPrice: 0,
                startPrice: 0,
                startTime: 0,
                endTime: 0,
              };
              let user1InitialBalance;

              let fee;
              let feeRecipientBeforeBalance;
              before(async () => {
                await resetTime();

                // Deploy NFT Collection contract
                nftContract = await deployNFTContract(owner);
                // Deploy AART market contract
                const MarketContract = await ethers.getContractFactory(
                  "AARTMarket"
                );
                marketContract = await MarketContract.deploy(
                  nftContract.address
                );
                await marketContract.deployed();

                fee = await marketContract.fee();

                // start new auction
                await mintNewNFT(nftContract, user1);

                AuctionParam.tokenId = 0;
                AuctionParam.paymentToken = ethers.constants.AddressZero;
                AuctionParam.directBuyPrice = getAmountInWei(100);
                AuctionParam.startPrice = getAmountInWei(10);
                AuctionParam.startTime = Math.floor(
                  new Date("2023.12.25").getTime() / 1000
                );
                AuctionParam.endTime = Math.floor(
                  new Date("2023.12.28").getTime() / 1000
                );
                // approve NFT to market contract
                await approveERC721(
                  user1,
                  nftContract,
                  AuctionParam.tokenId,
                  marketContract.address
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
                // user1 matic balance
                user1InitialBalance = getAmountFromWei(
                  await user1.getBalance()
                );

                feeRecipientBeforeBalance = getAmountFromWei(
                  await owner.getBalance()
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
              let endEvent;
              it("should allow user to end auction after ending period", async () => {
                await moveTimeTo(AuctionParam.endTime + 60);

                const tx = await marketContract
                  .connect(user1)
                  .endAuction(auctionId);
                const txReceipt = await tx.wait(1);
                endEvent = txReceipt.events[txReceipt.events.length - 1];
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
                  await owner.getBalance()
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
                  await user1.getBalance()
                );

                const expectedBalance =
                  user1InitialBalance +
                  getAmountFromWei(highestBid) * ((1000 - fee) / 1000);
                expect(parseFloat(user1FinalBalance).toFixed(3)).to.be.equal(
                  parseFloat(expectedBalance).toFixed(3)
                );
              });
              it("should emit AuctionEnded event", async () => {
                const auction = (await marketContract.getAuctions())[auctionId];
                expect(endEvent.event).to.be.equal("AuctionEnded");
                expect(endEvent.args.auctionId).to.be.equal(auctionId);
                expect(endEvent.args.buyer).to.be.equal(auction.highestBidder);
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
              let AuctionParam = {
                tokenId: 0,
                paymentToken: ethers.constants.AddressZero,
                directBuyPrice: 0,
                startPrice: 0,
                startTime: 0,
                endTime: 0,
              };
              let royaltyFeeBPS;
              let user1InitialBalance;
              let user2InitialBalance;

              let fee;
              let feeRecipientBeforeBalance;
              before(async () => {
                await resetTime();

                // Deploy NFT Collection contract
                nftContract = await deployNFTContract(owner);
                // Deploy AART market contract
                const MarketContract = await ethers.getContractFactory(
                  "AARTMarket"
                );
                marketContract = await MarketContract.deploy(
                  nftContract.address
                );
                await marketContract.deployed();

                await marketContract
                  .connect(owner)
                  .addSupportedToken(erc20Mock.address);

                fee = await marketContract.fee();

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

                // list new item
                royaltyFeeBPS = 100;
                await mintNewNFTWithRoyalty(nftContract, user1, royaltyFeeBPS);
                tokenId = 0;
                // transfer NFT to user2 to test if royalty work
                await nftContract
                  .connect(user1)
                  .transferFrom(user1.address, user2.address, tokenId);

                AuctionParam.tokenId = 0;
                AuctionParam.paymentToken = erc20Mock.address;
                AuctionParam.directBuyPrice = getAmountInWei(100);
                AuctionParam.startPrice = getAmountInWei(10);
                AuctionParam.startTime = Math.floor(
                  new Date("2023.12.20").getTime() / 1000
                );
                AuctionParam.endTime = Math.floor(
                  new Date("2023.12.28").getTime() / 1000
                );
                // approve NFT to market contract
                await approveERC721(
                  user2,
                  nftContract,
                  AuctionParam.tokenId,
                  marketContract.address
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
              });
              it("should not allow auction end before endTime", async () => {
                await moveTimeTo(AuctionParam.startTime);

                const bidAmount = getAmountInWei(15);
                // mint erc20 tokens to user2
                await mintERC20(user3, erc20Mock.address, bidAmount);
                // approve tokens to market
                await approveERC20(
                  user3,
                  erc20Mock.address,
                  bidAmount,
                  marketContract.address
                );

                await marketContract.connect(user3).bid(auctionId, bidAmount);

                await expect(
                  marketContract.connect(user1).endAuction(auctionId)
                ).to.be.revertedWithCustomError(
                  marketContract,
                  "AARTMarket_AuctionPeriodNotEnded"
                );
              });
              let endEvent;
              it("should allow user to end auction after ending period", async () => {
                await moveTimeTo(AuctionParam.endTime + 60);

                const tx = await marketContract
                  .connect(randomUser)
                  .endAuction(auctionId);
                const txReceipt = await tx.wait(1);
                endEvent = txReceipt.events[txReceipt.events.length - 1];
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
              it("should emit AuctionEnded event", async () => {
                const auction = (await marketContract.getAuctions())[auctionId];
                expect(endEvent.event).to.be.equal("AuctionEnded");
                expect(endEvent.args.auctionId).to.be.equal(auctionId);
                expect(endEvent.args.buyer).to.be.equal(auction.highestBidder);
              });
              it("should update auction status to ended", async () => {
                const auction = (await marketContract.getAuctions())[auctionId];
                expect(auction.status).to.be.equal(AuctionStatus.Ended);
              });
            });
            describe("MATIC payment", () => {
              let auctionId = 0;
              let AuctionParam = {
                tokenId: 0,
                paymentToken: ethers.constants.AddressZero,
                directBuyPrice: 0,
                startPrice: 0,
                startTime: 0,
                endTime: 0,
              };
              let royaltyFeeBPS;
              let user1InitialBalance;
              let user2InitialBalance;

              let fee;
              let feeRecipientBeforeBalance;
              before(async () => {
                await resetTime();

                // Deploy NFT Collection contract
                nftContract = await deployNFTContract(owner);
                // Deploy AART market contract
                const MarketContract = await ethers.getContractFactory(
                  "AARTMarket"
                );
                marketContract = await MarketContract.deploy(
                  nftContract.address
                );
                await marketContract.deployed();

                fee = await marketContract.fee();

                // list new item
                royaltyFeeBPS = 200;
                await mintNewNFTWithRoyalty(nftContract, user1, royaltyFeeBPS);
                tokenId = 0;
                // transfer NFT to user2 to test if royalty work
                await nftContract
                  .connect(user1)
                  .transferFrom(user1.address, user2.address, tokenId);

                AuctionParam.tokenId = 0;
                AuctionParam.paymentToken = ethers.constants.AddressZero;
                AuctionParam.directBuyPrice = getAmountInWei(100);
                AuctionParam.startPrice = getAmountInWei(10);
                AuctionParam.startTime = Math.floor(
                  new Date("2023.12.20").getTime() / 1000
                );
                AuctionParam.endTime = Math.floor(
                  new Date("2023.12.28").getTime() / 1000
                );
                // approve NFT to market contract
                await approveERC721(
                  user2,
                  nftContract,
                  AuctionParam.tokenId,
                  marketContract.address
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

                // user1 matic balance
                user1InitialBalance = getAmountFromWei(
                  await user1.getBalance()
                );

                // user2 matic balance
                user2InitialBalance = getAmountFromWei(
                  await user2.getBalance()
                );

                feeRecipientBeforeBalance = getAmountFromWei(
                  await owner.getBalance()
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
              let endEvent;
              it("should allow user to end auction after ending period", async () => {
                await moveTimeTo(AuctionParam.endTime + 60);

                const tx = await marketContract
                  .connect(randomUser)
                  .endAuction(auctionId);
                const txReceipt = await tx.wait(1);
                endEvent = txReceipt.events[txReceipt.events.length - 1];
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
                  await owner.getBalance()
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
                  await user1.getBalance()
                );

                const expectedBalance =
                  user1InitialBalance +
                  (getAmountFromWei(highestBid) * royaltyFeeBPS) / 10000;
                expect(parseFloat(user1FinalBalance).toFixed(3)).to.be.equal(
                  parseFloat(expectedBalance).toFixed(3)
                );
              });
              it("should send remaining buy price to seller", async () => {
                // user2 matic after balance
                const user2FinalBalance = getAmountFromWei(
                  await user2.getBalance()
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
              it("should emit AuctionEnded event", async () => {
                const auction = (await marketContract.getAuctions())[auctionId];
                expect(endEvent.event).to.be.equal("AuctionEnded");
                expect(endEvent.args.auctionId).to.be.equal(auctionId);
                expect(endEvent.args.buyer).to.be.equal(auction.highestBidder);
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
          let AuctionParam = {
            tokenId: 0,
            paymentToken: ethers.constants.AddressZero,
            directBuyPrice: 0,
            startPrice: 0,
            startTime: 0,
            endTime: 0,
          };
          before(async () => {
            await resetTime();

            // Deploy NFT Collection contract
            nftContract = await deployNFTContract(owner);

            // Deploy AART market contract
            const MarketContract = await ethers.getContractFactory(
              "AARTMarket"
            );
            marketContract = await MarketContract.deploy(nftContract.address);
            await marketContract.deployed();

            await marketContract
              .connect(owner)
              .addSupportedToken(erc20Mock.address);

            // start new auction
            await mintNewNFT(nftContract, user1);

            AuctionParam.tokenId = 0;
            AuctionParam.paymentToken = erc20Mock.address;
            AuctionParam.directBuyPrice = getAmountInWei(100);
            AuctionParam.startPrice = getAmountInWei(10);
            AuctionParam.startTime = Math.floor(
              new Date("2023.12.20").getTime() / 1000
            );
            AuctionParam.endTime = Math.floor(
              new Date("2023.12.28").getTime() / 1000
            );
            // approve NFT to market contract
            await approveERC721(
              user1,
              nftContract,
              AuctionParam.tokenId,
              marketContract.address
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
            await mintERC20(user2, erc20Mock.address, bidAmount);
            // approve tokens to market
            await approveERC20(
              user2,
              erc20Mock.address,
              bidAmount,
              marketContract.address
            );
            await marketContract.connect(user2).bid(auctionId, bidAmount);

            const bidAmount2 = getAmountInWei(25);
            // mint erc20 tokens to user3
            await mintERC20(user3, erc20Mock.address, bidAmount2);
            // approve tokens to market
            await approveERC20(
              user3,
              erc20Mock.address,
              bidAmount2,
              marketContract.address
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

            expect(parseFloat(user3AfterBalance).toFixed(4)).to.be.equal(
              parseFloat(user3BeforeBalance + user3BidAmount).toFixed(4)
            );

            expect(
              await marketContract.getUserBidAmount(auctionId, user3.address)
            ).to.be.equal(0);
          });
        });
        describe("MATIC payment", () => {
          let auctionId = 0;
          let AuctionParam = {
            tokenId: 0,
            paymentToken: ethers.constants.AddressZero,
            directBuyPrice: 0,
            startPrice: 0,
            startTime: 0,
            endTime: 0,
          };
          before(async () => {
            await resetTime();

            // Deploy NFT Collection contract
            nftContract = await deployNFTContract(owner);

            // Deploy AART market contract
            const MarketContract = await ethers.getContractFactory(
              "AARTMarket"
            );
            marketContract = await MarketContract.deploy(nftContract.address);
            await marketContract.deployed();

            // start new auction
            await mintNewNFT(nftContract, user1);

            AuctionParam.tokenId = 0;
            AuctionParam.paymentToken = ethers.constants.AddressZero;
            AuctionParam.directBuyPrice = getAmountInWei(100);
            AuctionParam.startPrice = getAmountInWei(10);
            AuctionParam.startTime = Math.floor(
              new Date("2023.12.20").getTime() / 1000
            );
            AuctionParam.endTime = Math.floor(
              new Date("2023.12.28").getTime() / 1000
            );
            // approve NFT to market contract
            await approveERC721(
              user1,
              nftContract,
              AuctionParam.tokenId,
              marketContract.address
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
              await user2.getBalance()
            );
            // withdraw user2 bid
            await marketContract.connect(user2).withdrawBid(auctionId);
            const user2AfterBalance = getAmountFromWei(
              await user2.getBalance()
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
              await user2.getBalance()
            );

            const user3BidAmount = await marketContract.getUserBidAmount(
              auctionId,
              user3.address
            );

            // withdraw user3 bid
            await marketContract.connect(user3).withdrawBid(auctionId);

            const user3AfterBalance = getAmountFromWei(
              await user2.getBalance()
            );

            expect(parseFloat(user3AfterBalance).toFixed(4)).to.be.equal(
              parseFloat(user3BeforeBalance + user3BidAmount).toFixed(4)
            );

            expect(
              await marketContract.getUserBidAmount(auctionId, user3.address)
            ).to.be.equal(0);
          });
        });
      });
      describe("cancelAuction()", () => {
        let auctionId = 0;
        let AuctionParam = {
          tokenId: 0,
          paymentToken: ethers.constants.AddressZero,
          directBuyPrice: 0,
          startPrice: 0,
          startTime: 0,
          endTime: 0,
        };
        before(async () => {
          await resetTime();

          // Deploy NFT Collection contract
          nftContract = await deployNFTContract(owner);

          // Deploy AART market contract
          const MarketContract = await ethers.getContractFactory("AARTMarket");
          marketContract = await MarketContract.deploy(nftContract.address);
          await marketContract.deployed();

          await marketContract
            .connect(owner)
            .addSupportedToken(erc20Mock.address);

          // start new auction
          await mintNewNFT(nftContract, user1);

          AuctionParam.tokenId = 0;
          AuctionParam.paymentToken = erc20Mock.address;
          AuctionParam.directBuyPrice = getAmountInWei(100);
          AuctionParam.startPrice = getAmountInWei(10);
          AuctionParam.startTime = Math.floor(
            new Date("2023.12.20").getTime() / 1000
          );
          AuctionParam.endTime = Math.floor(
            new Date("2023.12.28").getTime() / 1000
          );
          // approve NFT to market contract
          await approveERC721(
            user1,
            nftContract,
            AuctionParam.tokenId,
            marketContract.address
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
        });
        it("should not allow non seller to cancel auction", async () => {
          await expect(
            marketContract.connect(user2).cancelAuction(auctionId)
          ).to.be.revertedWithCustomError(
            marketContract,
            "AARTMarket_OnlySeller"
          );
        });
        let cancelEvent;
        it("should allow seller to cancel auction", async () => {
          const tx = await marketContract
            .connect(user1)
            .cancelAuction(auctionId);
          const txReceipt = await tx.wait(1);
          cancelEvent = txReceipt.events[txReceipt.events.length - 1];
        });
        it("should transfer NFT back to the seller", async () => {
          expect(await nftContract.ownerOf(AuctionParam.tokenId)).to.be.equal(
            user1.address
          );
        });
        it("should emit AuctionCanceled event", async () => {
          expect(cancelEvent.event).to.be.equal("AuctionCanceled");
          expect(cancelEvent.args.auctionId).to.be.equal(auctionId);
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
