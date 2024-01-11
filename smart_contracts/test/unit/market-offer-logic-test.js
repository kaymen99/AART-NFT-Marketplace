const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const {
  deployContract,
  mintNewNFT,
  mintNewNFTWithRoyalty,
  approveERC721,
  getAmountInWei,
  getAmountFromWei,
  developmentChains,
  mintERC20,
  approveERC20,
} = require("../../utils/helpers");

const OfferStatus = { Active: 0, Ended: 1 };
const DAY = 86400;

const mintFee = getAmountInWei(10);

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("AART Buy Offer Logic Unit Tests", () => {
      let owner;
      let nftContract;
      let artistsNftContract;
      let marketContract;
      let erc20Mock;

      let tokenId, paymentToken, price, expireTime;

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

      async function createOffer(token) {
        // allow to supported tokens
        if (token !== ethers.ZeroAddress) {
          await marketContract.connect(owner).addSupportedToken(token);
        }

        // mint new item
        await mintNewNFT(nftContract, user1);

        // create new offer
        tokenId = 0;
        price = getAmountInWei(30);

        // 20 days into the future
        expireTime = Math.floor(
          new Date(new Date().getTime() + 20 * DAY * 1000) / 1000
        );

        if (token !== ethers.ZeroAddress) {
          await mintERC20(user2, token, price);
          await approveERC20(user2, token, price, marketContract.target);
          await marketContract
            .connect(user2)
            .makeOffer(tokenId, token, price, expireTime);
        } else {
          await marketContract
            .connect(user2)
            .makeOffer(tokenId, token, price, expireTime, {
              value: price,
            });
        }
      }

      async function createOfferWithRoyalty(token, royaltyFeeBPS) {
        // allow to supported tokens
        if (token !== ethers.ZeroAddress) {
          await marketContract.connect(owner).addSupportedToken(token);
        }

        // mint new NFT with royalty
        royaltyFeeBPS = 100;
        await mintNewNFTWithRoyalty(nftContract, user1, royaltyFeeBPS);

        tokenId = 0;
        // transfer NFT to user2 to test if royalty work
        await nftContract
          .connect(user1)
          .transferFrom(user1.address, user2.address, tokenId);

        // create new offer
        tokenId = 0;
        price = getAmountInWei(30);
        // 20 days into the future
        expireTime = Math.floor(
          new Date(new Date().getTime() + 20 * DAY * 1000) / 1000
        );

        if (token !== ethers.ZeroAddress) {
          await mintERC20(user3, token, price);
          await approveERC20(user3, token, price, marketContract.target);
          await marketContract
            .connect(user3)
            .makeOffer(tokenId, token, price, expireTime);
        } else {
          await marketContract
            .connect(user3)
            .makeOffer(tokenId, token, price, expireTime, {
              value: price,
            });
        }
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

      describe("makeOffer()", () => {
        describe("ERC20 token payment offer", () => {
          before(async () => {
            await deployNFTAndMarketContracts();
          });
          it("should not allow user to make offre with unsupported payment token", async () => {
            tokenId = 0;
            paymentToken = erc20Mock.target;
            price = getAmountInWei(30);

            // 20 days into the future
            expireTime = Math.floor(
              new Date(new Date().getTime() + 20 * DAY * 1000) / 1000
            );

            await expect(
              marketContract
                .connect(randomUser)
                .makeOffer(tokenId, paymentToken, price, expireTime)
            ).to.be.revertedWithCustomError(
              marketContract,
              "AARTMarket_UnsupportedToken"
            );
          });
          it("should not allow user to make offer on non AART token", async () => {
            // allow erc20Mock token
            await marketContract
              .connect(owner)
              .addSupportedToken(erc20Mock.target);

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
              new Date(new Date().getTime() - 5 * DAY * 1000) / 1000
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
            await approveERC20(
              randomUser,
              erc20Mock.target,
              price,
              marketContract.target
            );

            await expect(
              marketContract
                .connect(randomUser)
                .makeOffer(tokenId, paymentToken, price, expireTime)
            )
              .to.emit(marketContract, "NewOffer")
              .withArgs(0, tokenId, randomUser.address);
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
            await deployNFTAndMarketContracts();
          });
          it("should not allow user to make offer on non AART token", async () => {
            tokenId = 0;
            paymentToken = ethers.ZeroAddress;
            price = getAmountInWei(30);
            // 20 days into the future
            expireTime = Math.floor(
              new Date(new Date().getTime() + 20 * DAY * 1000) / 1000
            );

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
              new Date(new Date().getTime() - 5 * DAY * 1000) / 1000
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
              await ethers.provider.getBalance(marketContract.target)
            );

            await expect(
              marketContract
                .connect(randomUser)
                .makeOffer(tokenId, paymentToken, price, expireTime, {
                  value: price,
                })
            )
              .to.emit(marketContract, "NewOffer")
              .withArgs(0, tokenId, randomUser.address);

            const marketAfterBalance = getAmountFromWei(
              await ethers.provider.getBalance(marketContract.target)
            );

            expect(
              (await marketContract.getTokenBuyOffers(tokenId)).length
            ).to.be.equal(1);

            expect(marketAfterBalance).to.be.equal(
              marketBeforeBalance + getAmountFromWei(price)
            );
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
            let user1InitialBalance;
            let fee, feeRecipientBeforeBalance;
            before(async () => {
              await deployNFTAndMarketContracts();

              // create new offer
              await createOffer(erc20Mock.target);

              // user1 erc20 balance
              user1InitialBalance = getAmountFromWei(
                await erc20Mock.balanceOf(user1.address)
              );

              feeRecipientBeforeBalance = getAmountFromWei(
                await erc20Mock.balanceOf(owner.address)
              );

              fee = Number(await marketContract.fee());
            });
            it("should revert if non token owner tries to accept offer", async () => {
              await expect(
                marketContract.connect(user2).acceptOffer(tokenId, offerId)
              ).to.be.revertedWithCustomError(
                marketContract,
                "AARTMarket_OnlyTokenOwner"
              );
            });
            it("should allow token owner to accept offer", async () => {
              await approveERC721(
                user1,
                nftContract,
                tokenId,
                marketContract.target
              );
              await expect(
                marketContract.connect(user1).acceptOffer(tokenId, offerId)
              )
                .to.emit(marketContract, "OfferAccepted")
                .withArgs(offerId, tokenId, user1.address);
            });
            it("should transfer bought NFT to offerer", async () => {
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
              expect(feeRecepientAfterBalance).to.be.equal(expectedBalance);
            });
            it("should send buy price to seller", async () => {
              // user1 erc20 after balance
              const user1FinalBalance = getAmountFromWei(
                await erc20Mock.balanceOf(user1.address)
              );
              const expectedBalance =
                user1InitialBalance +
                getAmountFromWei(price) * ((1000 - fee) / 1000);
              expect(user1FinalBalance).to.be.equal(expectedBalance);
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
            let user1InitialBalance;
            let fee, feeRecipientBeforeBalance;
            before(async () => {
              await deployNFTAndMarketContracts();

              // create new offer
              await createOffer(ethers.ZeroAddress);

              // user1 matic balance
              user1InitialBalance = getAmountFromWei(
                await ethers.provider.getBalance(user1.address)
              );

              feeRecipientBeforeBalance = getAmountFromWei(
                await ethers.provider.getBalance(owner.address)
              );

              fee = Number(await marketContract.fee());
            });
            it("should revert if non token owner tries to accept offer", async () => {
              await expect(
                marketContract.connect(user2).acceptOffer(tokenId, offerId)
              ).to.be.revertedWithCustomError(
                marketContract,
                "AARTMarket_OnlyTokenOwner"
              );
            });
            it("should allow token owner to accept offer", async () => {
              await approveERC721(
                user1,
                nftContract,
                tokenId,
                marketContract.target
              );
              await expect(
                marketContract.connect(user1).acceptOffer(tokenId, offerId)
              )
                .to.emit(marketContract, "OfferAccepted")
                .withArgs(offerId, tokenId, user1.address);
            });
            it("should transfer bought NFT to offerer", async () => {
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
            it("should send buy price to seller", async () => {
              // user1 erc20 after balance
              const user1FinalBalance = getAmountFromWei(
                await ethers.provider.getBalance(user1.address)
              );
              const expectedBalance =
                user1InitialBalance +
                getAmountFromWei(price) * ((1000 - fee) / 1000);
              expect(parseFloat(user1FinalBalance).toFixed(3)).to.be.equal(
                parseFloat(expectedBalance).toFixed(3)
              );
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
            let user1InitialBalance;
            let user2InitialBalance;
            let fee, feeRecipientBeforeBalance, royaltyFeeBPS;
            before(async () => {
              await deployNFTAndMarketContracts();

              // create new offer with royalty NFT
              royaltyFeeBPS = 100;
              await createOfferWithRoyalty(erc20Mock.target, royaltyFeeBPS);

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
            it("should revert if non token owner tries to accept offer", async () => {
              await expect(
                marketContract.connect(randomUser).acceptOffer(tokenId, offerId)
              ).to.be.revertedWithCustomError(
                marketContract,
                "AARTMarket_OnlyTokenOwner"
              );
            });
            it("should allow token owner to accept offer", async () => {
              await approveERC721(
                user2,
                nftContract,
                tokenId,
                marketContract.target
              );
              await expect(
                marketContract.connect(user2).acceptOffer(tokenId, offerId)
              )
                .to.emit(marketContract, "OfferAccepted")
                .withArgs(offerId, tokenId, user2.address);
            });
            it("should transfer bought NFT to offerer", async () => {
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
              expect(user2FinalBalance).to.be.equal(expectedBalance);
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
            let user1InitialBalance;
            let user2InitialBalance;
            let fee, feeRecipientBeforeBalance, royaltyFeeBPS;
            before(async () => {
              await deployNFTAndMarketContracts();

              // create new offer with royalty NFT
              royaltyFeeBPS = 100;
              await createOfferWithRoyalty(ethers.ZeroAddress, royaltyFeeBPS);

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
            it("should revert if non token owner tries to accept offer", async () => {
              await expect(
                marketContract.connect(randomUser).acceptOffer(tokenId, offerId)
              ).to.be.revertedWithCustomError(
                marketContract,
                "AARTMarket_OnlyTokenOwner"
              );
            });
            it("should allow token owner to accept offer", async () => {
              await approveERC721(
                user2,
                nftContract,
                tokenId,
                marketContract.target
              );
              await expect(
                marketContract.connect(user2).acceptOffer(tokenId, offerId)
              )
                .to.emit(marketContract, "OfferAccepted")
                .withArgs(offerId, tokenId, user2.address);
            });
            it("should transfer bought NFT to offerer", async () => {
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
          before(async () => {
            await deployNFTAndMarketContracts();

            // create new offer
            await createOffer(erc20Mock.target);
          });
          it("should not allow non offerer to cancel offer", async () => {
            await expect(
              marketContract.connect(randomUser).cancelOffer(tokenId, offerId)
            ).to.be.revertedWithCustomError(
              marketContract,
              "AARTMarket_OnlyOfferer"
            );
          });
          it("should allow offerer to cancel his offer", async () => {
            approveERC20(user2, erc20Mock.target, price, marketContract.target);
            await expect(
              marketContract.connect(user2).cancelOffer(tokenId, offerId)
            )
              .to.emit(marketContract, "OfferCanceled")
              .withArgs(offerId, tokenId);
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
          before(async () => {
            await deployNFTAndMarketContracts();

            // create new offer
            await createOffer(ethers.ZeroAddress);
          });
          it("should not allow non offerer to cancel offer", async () => {
            await expect(
              marketContract.connect(randomUser).cancelOffer(tokenId, offerId)
            ).to.be.revertedWithCustomError(
              marketContract,
              "AARTMarket_OnlyOfferer"
            );
          });
          it("should allow offerer to cancel his offer", async () => {
            const user2BeforeBalance = getAmountFromWei(
              await ethers.provider.getBalance(user2.address)
            );

            await expect(
              marketContract.connect(user2).cancelOffer(tokenId, offerId)
            )
              .to.emit(marketContract, "OfferCanceled")
              .withArgs(offerId, tokenId);

            const user2AfterBalance = getAmountFromWei(
              await ethers.provider.getBalance(user2.address)
            );
            const expectedBalance =
              user2BeforeBalance + getAmountFromWei(price);
            expect(parseFloat(user2AfterBalance).toFixed(3)).to.be.equal(
              parseFloat(expectedBalance).toFixed(3)
            );
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
    });
