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

const OfferStatus = { Active: 0, Ended: 1 };

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("AART Buy Offer Logic Unit Tests", () => {
      let owner;
      let nftContract;
      let marketContract;
      let erc20Mock;

      before(async () => {
        [owner, user1, user2, user3, randomUser] = await ethers.getSigners();

        erc20Mock = await deployERC20Mock();
      });

      describe("makeOffer()", () => {
        describe("ERC20 token payment offer", () => {
          before(async () => {
            // Deploy NFT Collection contract
            nftContract = await deployNFTContract(owner);
            // Deploy AART market contract
            const MarketContract = await ethers.getContractFactory(
              "AARTMarket"
            );
            marketContract = await MarketContract.deploy(nftContract.address);
            await marketContract.deployed();
          });
          let tokenId, paymentToken, price, expireTime;
          let newOfferEvent;
          it("should not allow user to make offer on non AART token", async () => {
            tokenId = 0;
            paymentToken = erc20Mock.address;
            price = getAmountInWei(30);
            expireTime = Math.floor(new Date("2023.02.25").getTime() / 1000);

            await expect(
              marketContract
                .connect(randomUser)
                .makeOffer(tokenId, paymentToken, price, expireTime)
            ).to.be.revertedWith("ERC721: invalid token ID");
          });
          it("should revert when expiration time is in the past", async () => {
            // mint new NFT to user1
            await mintNewNFT(nftContract, user1);

            const wrongExpireTime = Math.floor(
              new Date("2021.02.25").getTime() / 1000
            );

            await expect(
              marketContract
                .connect(randomUser)
                .makeOffer(tokenId, paymentToken, price, wrongExpireTime)
            ).to.be.revertedWithCustomError(
              marketContract,
              "AARTMarket_InvalidExpirationTime"
            );
          });
          it("should revert when offer price is not approved for market", async () => {
            await expect(
              marketContract
                .connect(randomUser)
                .makeOffer(tokenId, paymentToken, price, expireTime)
            ).to.be.revertedWithCustomError(
              marketContract,
              "AARTMarket_OfferAmountNotApproved"
            );
          });
          it("should allow user to make offer on existing AART token", async () => {
            approveERC20(
              randomUser,
              erc20Mock.address,
              price,
              marketContract.address
            );

            const tx = await marketContract
              .connect(randomUser)
              .makeOffer(tokenId, paymentToken, price, expireTime);
            const txReceipt = await tx.wait(1);
            newOfferEvent = txReceipt.events[0];
            expect(
              (await marketContract.getTokenBuyOffers(tokenId)).length
            ).to.be.equal(1);
          });
          it("should emit NewOffer event", async () => {
            expect(newOfferEvent.event).to.be.equal("NewOffer");
            expect(newOfferEvent.args.offerId).to.be.equal(0);
            expect(newOfferEvent.args.tokenId).to.be.equal(tokenId);
            expect(newOfferEvent.args.offerer).to.be.equal(randomUser.address);
          });
          it("should store correct offer info", async () => {
            const offerId = 0;
            const offer = (await marketContract.getTokenBuyOffers(tokenId))[
              offerId
            ];
            expect(offer.offerer).to.be.equal(randomUser.address);
            expect(offer.paymentToken).to.be.equal(paymentToken);
            expect(offer.price).to.be.equal(price);
            expect(offer.expireTime).to.be.equal(expireTime);
            expect(offer.status).to.be.equal(OfferStatus.Active);
          });
        });
        describe("MATIC payment offer", () => {
          before(async () => {
            // Deploy NFT Collection contract
            nftContract = await deployNFTContract(owner);
            // Deploy AART market contract
            const MarketContract = await ethers.getContractFactory(
              "AARTMarket"
            );
            marketContract = await MarketContract.deploy(nftContract.address);
            await marketContract.deployed();
          });
          let tokenId, paymentToken, price, expireTime;
          let newOfferEvent;
          it("should not allow user to make offer on non AART token", async () => {
            tokenId = 0;
            paymentToken = ethers.constants.AddressZero;
            price = getAmountInWei(30);
            expireTime = Math.floor(new Date("2023.02.25").getTime() / 1000);

            await expect(
              marketContract
                .connect(randomUser)
                .makeOffer(tokenId, paymentToken, price, expireTime, {
                  value: price,
                })
            ).to.be.revertedWith("ERC721: invalid token ID");
          });
          it("should revert when insufficient MATIC amount is sent", async () => {
            // mint new NFT to user1
            await mintNewNFT(nftContract, user1);

            await expect(
              marketContract
                .connect(randomUser)
                .makeOffer(tokenId, paymentToken, price, expireTime, {
                  value: getAmountInWei(10),
                })
            ).to.be.revertedWithCustomError(
              marketContract,
              "AARTMarket_InsufficientAmount"
            );
          });
          it("should revert when expiration time is in the past", async () => {
            const wrongExpireTime = Math.floor(
              new Date("2021.02.25").getTime() / 1000
            );

            await expect(
              marketContract
                .connect(randomUser)
                .makeOffer(tokenId, paymentToken, price, wrongExpireTime, {
                  value: price,
                })
            ).to.be.revertedWithCustomError(
              marketContract,
              "AARTMarket_InvalidExpirationTime"
            );
          });
          it("should allow user to make offer on existing AART token", async () => {
            const marketBeforeBalance = getAmountFromWei(
              await ethers.provider.getBalance(marketContract.address)
            );
            const tx = await marketContract
              .connect(randomUser)
              .makeOffer(tokenId, paymentToken, price, expireTime, {
                value: price,
              });
            const txReceipt = await tx.wait(1);
            newOfferEvent = txReceipt.events[0];

            const marketAfterBalance = getAmountFromWei(
              await ethers.provider.getBalance(marketContract.address)
            );

            expect(
              (await marketContract.getTokenBuyOffers(tokenId)).length
            ).to.be.equal(1);

            expect(marketAfterBalance).to.be.equal(
              marketBeforeBalance + getAmountFromWei(price)
            );
          });
          it("should emit NewOffer event", async () => {
            expect(newOfferEvent.event).to.be.equal("NewOffer");
            expect(newOfferEvent.args.offerId).to.be.equal(0);
            expect(newOfferEvent.args.tokenId).to.be.equal(tokenId);
            expect(newOfferEvent.args.offerer).to.be.equal(randomUser.address);
          });
          it("should store correct offer info", async () => {
            const offerId = 0;
            const offer = (await marketContract.getTokenBuyOffers(tokenId))[
              offerId
            ];
            expect(offer.offerer).to.be.equal(randomUser.address);
            expect(offer.paymentToken).to.be.equal(paymentToken);
            expect(offer.price).to.be.equal(price);
            expect(offer.expireTime).to.be.equal(expireTime);
            expect(offer.status).to.be.equal(OfferStatus.Active);
          });
        });
      });

      describe("acceptOffer()", () => {
        describe("Case token without Royalty", () => {
          describe("ERC20 token payment offer", () => {
            let offerId = 0;
            let tokenId, paymentToken, price, expireTime;
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
              // mint new item
              await mintNewNFT(nftContract, user1);

              // create new offer
              tokenId = 0;
              paymentToken = erc20Mock.address;
              price = getAmountInWei(30);
              expireTime = Math.floor(new Date("2023.02.25").getTime() / 1000);

              await mintERC20(randomUser, erc20Mock.address, price);

              await approveERC20(
                randomUser,
                erc20Mock.address,
                price,
                marketContract.address
              );

              await marketContract
                .connect(randomUser)
                .makeOffer(tokenId, paymentToken, price, expireTime);
            });
            it("should revert if non token owner tries to accept offer", async () => {
              await expect(
                marketContract.connect(user2).acceptOffer(tokenId, offerId)
              ).to.be.revertedWithCustomError(
                marketContract,
                "AARTMarket_OnlyTokenOwner"
              );
            });
            let acceptedEvent;
            it("should allow token owner to accept offer", async () => {
              await approveERC721(
                user1,
                nftContract,
                tokenId,
                marketContract.address
              );
              const tx = await marketContract
                .connect(user1)
                .acceptOffer(tokenId, offerId);
              const txReceipt = await tx.wait(1);
              acceptedEvent = txReceipt.events[txReceipt.events.length - 1];
            });
            it("should transfer bought NFT to offerer", async () => {
              expect(await nftContract.ownerOf(tokenId)).to.be.equal(
                randomUser.address
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
            it("should emit OfferAccepted event", async () => {
              expect(acceptedEvent.event).to.be.equal("OfferAccepted");
              expect(acceptedEvent.args.offerId).to.be.equal(offerId);
              expect(acceptedEvent.args.tokenId).to.be.equal(tokenId);
              expect(acceptedEvent.args.owner).to.be.equal(user1.address);
            });
            it("should update item status to ended", async () => {
              const offer = (await marketContract.getTokenBuyOffers(tokenId))[
                offerId
              ];
              expect(offer.status).to.be.equal(OfferStatus.Ended);
            });
          });
          describe("MATIC payment offer", () => {
            let offerId = 0;
            let tokenId, paymentToken, price, expireTime;
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
              // mint new item
              await mintNewNFT(nftContract, user1);

              // create new offer
              tokenId = 0;
              paymentToken = ethers.constants.AddressZero;
              price = getAmountInWei(30);
              expireTime = Math.floor(new Date("2023.02.25").getTime() / 1000);

              await marketContract
                .connect(randomUser)
                .makeOffer(tokenId, paymentToken, price, expireTime, {
                  value: price,
                });

              // user1 matic balance
              user1InitialBalance = getAmountFromWei(await user1.getBalance());
            });
            it("should revert if non token owner tries to accept offer", async () => {
              await expect(
                marketContract.connect(user2).acceptOffer(tokenId, offerId)
              ).to.be.revertedWithCustomError(
                marketContract,
                "AARTMarket_OnlyTokenOwner"
              );
            });
            let acceptedEvent;
            it("should allow token owner to accept offer", async () => {
              await approveERC721(
                user1,
                nftContract,
                tokenId,
                marketContract.address
              );
              const tx = await marketContract
                .connect(user1)
                .acceptOffer(tokenId, offerId);
              const txReceipt = await tx.wait(1);
              acceptedEvent = txReceipt.events[txReceipt.events.length - 1];
            });
            it("should transfer bought NFT to offerer", async () => {
              expect(await nftContract.ownerOf(tokenId)).to.be.equal(
                randomUser.address
              );
            });
            it("should send buy price to seller", async () => {
              // user1 erc20 after balance
              const user1FinalBalance = getAmountFromWei(
                await user1.getBalance()
              );
              const expectedBalance =
                user1InitialBalance + getAmountFromWei(price);
              expect(parseFloat(user1FinalBalance).toFixed(3)).to.be.equal(
                parseFloat(expectedBalance).toFixed(3)
              );
            });
            it("should emit OfferAccepted event", async () => {
              expect(acceptedEvent.event).to.be.equal("OfferAccepted");
              expect(acceptedEvent.args.offerId).to.be.equal(offerId);
              expect(acceptedEvent.args.tokenId).to.be.equal(tokenId);
              expect(acceptedEvent.args.owner).to.be.equal(user1.address);
            });
            it("should update item status to ended", async () => {
              const offer = (await marketContract.getTokenBuyOffers(tokenId))[
                offerId
              ];
              expect(offer.status).to.be.equal(OfferStatus.Ended);
            });
          });
        });
        describe("Case token with Royalty", () => {
          describe("ERC20 token payment offer", () => {
            let offerId = 0;
            let tokenId, paymentToken, price, expireTime;
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
              // mint new item
              royaltyFeeBPS = 100;
              await mintNewNFTWithRoyalty(nftContract, user1, royaltyFeeBPS);

              tokenId = 0;
              // transfer NFT to user2 to test if royalty work
              await nftContract
                .connect(user1)
                .transferFrom(user1.address, user2.address, tokenId);

              // create new offer
              tokenId = 0;
              paymentToken = erc20Mock.address;
              price = getAmountInWei(30);
              expireTime = Math.floor(new Date("2023.02.25").getTime() / 1000);

              await mintERC20(user3, erc20Mock.address, price);

              await approveERC20(
                user3,
                erc20Mock.address,
                price,
                marketContract.address
              );

              await marketContract
                .connect(user3)
                .makeOffer(tokenId, paymentToken, price, expireTime);
            });
            it("should revert if non token owner tries to accept offer", async () => {
              await expect(
                marketContract.connect(randomUser).acceptOffer(tokenId, offerId)
              ).to.be.revertedWithCustomError(
                marketContract,
                "AARTMarket_OnlyTokenOwner"
              );
            });
            let acceptedEvent;
            it("should allow token owner to accept offer", async () => {
              await approveERC721(
                user2,
                nftContract,
                tokenId,
                marketContract.address
              );
              const tx = await marketContract
                .connect(user2)
                .acceptOffer(tokenId, offerId);
              const txReceipt = await tx.wait(1);
              acceptedEvent = txReceipt.events[txReceipt.events.length - 1];
            });
            it("should transfer bought NFT to offerer", async () => {
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
            it("should emit OfferAccepted event", async () => {
              expect(acceptedEvent.event).to.be.equal("OfferAccepted");
              expect(acceptedEvent.args.offerId).to.be.equal(offerId);
              expect(acceptedEvent.args.tokenId).to.be.equal(tokenId);
              expect(acceptedEvent.args.owner).to.be.equal(user2.address);
            });
            it("should update item status to ended", async () => {
              const offer = (await marketContract.getTokenBuyOffers(tokenId))[
                offerId
              ];
              expect(offer.status).to.be.equal(OfferStatus.Ended);
            });
          });
          describe("MATIC payment offer", () => {
            let offerId = 0;
            let tokenId, paymentToken, price, expireTime;
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

              // mint new item
              royaltyFeeBPS = 200;
              await mintNewNFTWithRoyalty(nftContract, user1, royaltyFeeBPS);

              tokenId = 0;
              // transfer NFT to user2 to test if royalty work
              await nftContract
                .connect(user1)
                .transferFrom(user1.address, user2.address, tokenId);

              paymentToken = ethers.constants.AddressZero;
              price = getAmountInWei(30);
              expireTime = Math.floor(new Date("2023.02.25").getTime() / 1000);

              await marketContract
                .connect(user3)
                .makeOffer(tokenId, paymentToken, price, expireTime, {
                  value: price,
                });

              // user1 matic balance
              user1InitialBalance = getAmountFromWei(await user1.getBalance());
              // user2 matic balance
              user2InitialBalance = getAmountFromWei(await user2.getBalance());
            });
            it("should revert if non token owner tries to accept offer", async () => {
              await expect(
                marketContract.connect(randomUser).acceptOffer(tokenId, offerId)
              ).to.be.revertedWithCustomError(
                marketContract,
                "AARTMarket_OnlyTokenOwner"
              );
            });
            let acceptedEvent;
            it("should allow token owner to accept offer", async () => {
              await approveERC721(
                user2,
                nftContract,
                tokenId,
                marketContract.address
              );
              const tx = await marketContract
                .connect(user2)
                .acceptOffer(tokenId, offerId);
              const txReceipt = await tx.wait(1);
              acceptedEvent = txReceipt.events[txReceipt.events.length - 1];
            });
            it("should transfer bought NFT to offerer", async () => {
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
              expect(parseFloat(user2FinalBalance).toFixed(3)).to.be.equal(
                parseFloat(expectedBalance).toFixed(3)
              );
            });
            it("should emit OfferAccepted event", async () => {
              expect(acceptedEvent.event).to.be.equal("OfferAccepted");
              expect(acceptedEvent.args.offerId).to.be.equal(offerId);
              expect(acceptedEvent.args.tokenId).to.be.equal(tokenId);
              expect(acceptedEvent.args.owner).to.be.equal(user2.address);
            });
            it("should update item status to ended", async () => {
              const offer = (await marketContract.getTokenBuyOffers(tokenId))[
                offerId
              ];
              expect(offer.status).to.be.equal(OfferStatus.Ended);
            });
          });
        });
      });

      describe("cancelOffer()", () => {
        describe("ERC20 token payment offer", () => {
          let offerId = 0;
          let tokenId, paymentToken, price, expireTime;
          before(async () => {
            // Deploy NFT Collection contract
            nftContract = await deployNFTContract(owner);
            // Deploy AART market contract
            const MarketContract = await ethers.getContractFactory(
              "AARTMarket"
            );
            marketContract = await MarketContract.deploy(nftContract.address);
            await marketContract.deployed();

            // mint new item
            await mintNewNFT(nftContract, user1);

            // create new offer
            tokenId = 0;
            paymentToken = erc20Mock.address;
            price = getAmountInWei(30);
            expireTime = Math.floor(new Date("2023.02.25").getTime() / 1000);

            await mintERC20(user2, erc20Mock.address, price);

            await approveERC20(
              user2,
              erc20Mock.address,
              price,
              marketContract.address
            );

            await marketContract
              .connect(user2)
              .makeOffer(tokenId, paymentToken, price, expireTime);
          });
          it("should not allow non offerer to cancel offer", async () => {
            await expect(
              marketContract.connect(randomUser).cancelOffer(tokenId, offerId)
            ).to.be.revertedWithCustomError(
              marketContract,
              "AARTMarket_OnlyOfferer"
            );
          });
          let cancelEvent;
          it("should allow offerer to cancel his offer", async () => {
            approveERC20(
              user2,
              erc20Mock.address,
              price,
              marketContract.address
            );
            const tx = await marketContract
              .connect(user2)
              .cancelOffer(tokenId, offerId);
            const txReceipt = await tx.wait(1);
            cancelEvent = txReceipt.events[0];
          });
          it("should emit OfferCanceled event", async () => {
            expect(cancelEvent.event).to.be.equal("OfferCanceled");
            expect(cancelEvent.args.offerId).to.be.equal(offerId);
            expect(cancelEvent.args.tokenId).to.be.equal(tokenId);
          });
          it("should update offer status to ended", async () => {
            const offer = (await marketContract.getTokenBuyOffers(tokenId))[
              offerId
            ];
            expect(offer.status).to.be.equal(OfferStatus.Ended);
          });
          it("should revert if offer status is already ended", async () => {
            await expect(
              marketContract.connect(user2).cancelOffer(tokenId, offerId)
            ).to.be.revertedWithCustomError(
              marketContract,
              "AARTMarket_OfferNotActive"
            );
          });
        });
        describe("Matic payment offer", () => {
          let offerId = 0;
          let tokenId, paymentToken, price, expireTime;
          before(async () => {
            // Deploy NFT Collection contract
            nftContract = await deployNFTContract(owner);
            // Deploy AART market contract
            const MarketContract = await ethers.getContractFactory(
              "AARTMarket"
            );
            marketContract = await MarketContract.deploy(nftContract.address);
            await marketContract.deployed();

            // mint new item
            await mintNewNFT(nftContract, user1);

            // create new offer
            tokenId = 0;
            paymentToken = ethers.constants.AddressZero;
            price = getAmountInWei(30);
            expireTime = Math.floor(new Date("2023.02.25").getTime() / 1000);

            await marketContract
              .connect(user2)
              .makeOffer(tokenId, paymentToken, price, expireTime, {
                value: price,
              });
          });
          it("should not allow non offerer to cancel offer", async () => {
            await expect(
              marketContract.connect(randomUser).cancelOffer(tokenId, offerId)
            ).to.be.revertedWithCustomError(
              marketContract,
              "AARTMarket_OnlyOfferer"
            );
          });
          let cancelEvent;
          it("should allow offerer to cancel his offer", async () => {
            const user2BeforeBalance = getAmountFromWei(
              await user2.getBalance()
            );
            const tx = await marketContract
              .connect(user2)
              .cancelOffer(tokenId, offerId);
            const txReceipt = await tx.wait(1);
            cancelEvent = txReceipt.events[0];

            const user2AfterBalance = getAmountFromWei(
              await user2.getBalance()
            );
            const expectedBalance =
              user2BeforeBalance + getAmountFromWei(price);
            expect(parseFloat(user2AfterBalance).toFixed(3)).to.be.equal(
              parseFloat(expectedBalance).toFixed(3)
            );
          });
          it("should emit OfferCanceled event", async () => {
            expect(cancelEvent.event).to.be.equal("OfferCanceled");
            expect(cancelEvent.args.offerId).to.be.equal(offerId);
            expect(cancelEvent.args.tokenId).to.be.equal(tokenId);
          });
          it("should update offer status to ended", async () => {
            const offer = (await marketContract.getTokenBuyOffers(tokenId))[
              offerId
            ];
            expect(offer.status).to.be.equal(OfferStatus.Ended);
          });
          it("should revert if offer status is already ended", async () => {
            await expect(
              marketContract.connect(user2).cancelOffer(tokenId, offerId)
            ).to.be.revertedWithCustomError(
              marketContract,
              "AARTMarket_OfferNotActive"
            );
          });
        });
      });
    })
