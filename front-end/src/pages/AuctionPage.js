import "./../assets/styles/pages/auctionPage.css";

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Modal, Table } from "react-bootstrap";
import { ethers } from "ethers";
import moment from "moment";
import axios from "axios";
import { AiOutlineClose } from "react-icons/ai";
import { CircularProgress } from "@mui/material";
import marketContract from "../artifacts/AARTMarket.sol/AARTMarket.json";
import nftContract from "../artifacts/AARTCollection.sol/AARTCollection.json";
import artistsContract from "../artifacts/AARTArtists.sol/AARTArtists.json";
import {
  marketContractAddress,
  artistsContractAddress,
  nftContractAddress,
  networkDeployedTo,
} from "../utils/contracts-config";
import networksMap from "../utils/networksMap.json";
import { IPFS_GATEWAY } from "../utils/ipfsStorage";
import { approveERC20 } from "../utils/exchange-utils";
import {
  MATIC,
  tokens,
  formatTokenAmount,
  getTokenFromAddress,
  parseTokenAmount,
} from "../utils/tokens-utils";

const AuctionPage = () => {
  const { id } = useParams();
  const wallet = useSelector((state) => state.userData.value);
  const [loading, setLoading] = useState(false);

  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const auctionStatus = {
    0: "Open",
    1: "Closed",
    2: "Ended",
    3: "DirectBuy",
    4: "Canceled",
  };

  const [auctionInfo, setAuctionInfo] = useState({
    tokenId: 0,
    ownerInfo: "",
    ownerAddress: "",
    creatorInfo: "",
    creatorAddress: "",
    name: "",
    description: "",
    imageUri: "",
    category: "",
    paymentToken: MATIC,
    highestBid: 0,
    highestBidder: "",
    startPrice: 0,
    directPrice: 0,
    startTime: "",
    endTime: "",
    started: false,
    status: 1,
  });

  const [biddingParams, setBiddingParams] = useState({
    bidAmount: 0,
    paymentToken: MATIC,
  });

  const getAuctionDetails = async () => {
    if (wallet.network === networksMap[networkDeployedTo]) {
      const provider = new ethers.providers.Web3Provider(
        window.ethereum,
        "any"
      );
      const nft_contract = new ethers.Contract(
        nftContractAddress,
        nftContract.abi,
        provider
      );
      const market_contract = new ethers.Contract(
        marketContractAddress,
        marketContract.abi,
        provider
      );

      const auction = (await market_contract.getAuctions())[Number(id)];
      const tokenId = Number(auction[0]);
      const startTime = Number(auction[4]);

      const status = Number(await market_contract.getAuctionStatus(Number(id)));

      const tokenUri = await nft_contract.tokenURI(tokenId);
      const _metadata = await axios.get(
        tokenUri.replace("ipfs://", IPFS_GATEWAY)
      );

      const _ownerInfo = await getUserProfile(auction[1]);
      const _creatorInfo = await getUserProfile(_metadata.data.creator);

      let userBidAmount = await market_contract.getUserBidAmount(
        Number(id),
        wallet.account
      );
      userBidAmount = formatTokenAmount(
        wallet.network,
        auction[2],
        userBidAmount
      );
      const highestBid = formatTokenAmount(
        wallet.network,
        auction[2],
        auction[6]
      );
      const directPrice = formatTokenAmount(
        wallet.network,
        auction[2],
        auction[7]
      );
      const startPrice = formatTokenAmount(
        wallet.network,
        auction[2],
        auction[8]
      );

      setAuctionInfo({
        tokenId: tokenId,
        ownerInfo: _ownerInfo,
        ownerAddress: auction[1],
        creatorInfo: _creatorInfo,
        creatorAddress: _metadata.data.creator,
        name: _metadata.data.name,
        description: _metadata.data.description,
        imageUri: _metadata.data.image.replace("ipfs://", IPFS_GATEWAY),
        category: _metadata.data.category,
        paymentToken: auction[2],
        highestBidder: auction[3],
        highestBid: highestBid,
        directPrice: directPrice,
        startPrice: startPrice,
        startTime: startTime,
        endTime: Number(auction[5]),
        status: auctionStatus[status],
      });
      setBiddingParams({ ...biddingParams, bidAmount: userBidAmount });
    }
  };

  const getUserProfile = async (user) => {
    if (wallet.network === networksMap[networkDeployedTo]) {
      const provider = new ethers.providers.Web3Provider(
        window.ethereum,
        "any"
      );
      const artists_contract = new ethers.Contract(
        artistsContractAddress,
        artistsContract.abi,
        provider
      );

      const hasProfile = await artists_contract.hasProfile(user);
      if (hasProfile) {
        const userProfile = await artists_contract.getUserProfile(user);

        const _metadata = await axios.get(
          userProfile[1].replace("ipfs://", IPFS_GATEWAY)
        );

        return {
          username: _metadata.data.username,
          imageUri: _metadata.data.imageUri.replace("ipfs://", IPFS_GATEWAY),
        };
      }
      return {
        username: "username",
        imageUri: "",
      };
    }
  };

  const bid = async () => {
    if (wallet.network === networksMap[networkDeployedTo]) {
      const provider = new ethers.providers.Web3Provider(
        window.ethereum,
        "any"
      );
      const signer = provider.getSigner();
      const market_contract = new ethers.Contract(
        marketContractAddress,
        marketContract.abi,
        signer
      );
      const price = parseTokenAmount(
        wallet.network,
        auctionInfo.paymentToken,
        biddingParams.bidAmount
      );
      try {
        setLoading(true);
        if (auctionInfo.paymentToken !== MATIC) {
          await approveERC20(
            signer,
            auctionInfo.paymentToken,
            marketContractAddress,
            price
          );
          const bid_tx = await market_contract.bid(Number(id), price);
          await bid_tx.wait();
        } else {
          const bid_tx = await market_contract.bid(Number(id), price, {
            value: price,
          });
          await bid_tx.wait();
        }
        setLoading(false);
        await getAuctionDetails();
      } catch (err) {
        setLoading(false);
        console.log(err);
      }
    }
  };

  const directBuy = async () => {
    if (wallet.network === networksMap[networkDeployedTo]) {
      const provider = new ethers.providers.Web3Provider(
        window.ethereum,
        "any"
      );
      const signer = provider.getSigner();
      const market_contract = new ethers.Contract(
        marketContractAddress,
        marketContract.abi,
        signer
      );
      const price = parseTokenAmount(
        wallet.network,
        auctionInfo.paymentToken,
        auctionInfo.directPrice
      );
      try {
        setLoading(true);
        if (auctionInfo.paymentToken !== MATIC) {
          await approveERC20(
            signer,
            auctionInfo.paymentToken,
            marketContractAddress,
            price
          );
          const buy_tx = await market_contract.directBuyAuction(Number(id));
          await buy_tx.wait();
        } else {
          const buy_tx = await market_contract.directBuyAuction(Number(id), {
            value: price,
          });
          await buy_tx.wait();
        }
        setLoading(false);
        await getAuctionDetails();
      } catch (err) {
        setLoading(false);
        console.log(err);
      }
    }
  };

  const withdrawBid = async () => {
    if (wallet.network === networksMap[networkDeployedTo]) {
      const provider = new ethers.providers.Web3Provider(
        window.ethereum,
        "any"
      );
      const signer = provider.getSigner();
      const market_contract = new ethers.Contract(
        marketContractAddress,
        marketContract.abi,
        signer
      );

      try {
        setLoading(true);
        const withdraw_tx = await market_contract.withdrawBid(Number(id));
        await withdraw_tx.wait();
        setLoading(false);
      } catch (err) {
        setLoading(false);
        console.log(err);
      }
    }
  };

  const endAuction = async () => {
    if (wallet.network === networksMap[networkDeployedTo]) {
      const provider = new ethers.providers.Web3Provider(
        window.ethereum,
        "any"
      );
      const signer = provider.getSigner();
      const market_contract = new ethers.Contract(
        marketContractAddress,
        marketContract.abi,
        signer
      );

      try {
        setLoading(true);
        const end_tx = await market_contract.endAuction(Number(id));
        await end_tx.wait();
        setLoading(false);
      } catch (err) {
        setLoading(false);
        console.log(err);
      }
    }
  };

  const cancelAuction = async () => {
    if (wallet.network === networksMap[networkDeployedTo]) {
      const provider = new ethers.providers.Web3Provider(
        window.ethereum,
        "any"
      );
      const signer = provider.getSigner();
      const market_contract = new ethers.Contract(
        marketContractAddress,
        marketContract.abi,
        signer
      );

      const cancel_tx = await market_contract.cancelAuction(Number(id));
      await cancel_tx.wait();
    }
  };

  useEffect(() => {
    const get = async () => {
      if (window.ethereum !== undefined) {
        await getAuctionDetails();
      }
    };
    get();
  }, []);

  return (
    <>
      <div className="item">
        <div className="item-image">
          <img src={auctionInfo.imageUri} alt="item" />
        </div>
        <div className="item-content">
          <h1 className="item-title">{auctionInfo.name}</h1>
          <div className="item-seller-creator">
            <div className="item-seller-creator-profile">
              <img
                className="item-seller-creator-img"
                src={auctionInfo.ownerInfo.imageUri}
                alt="profile image"
              />
              <div className="item-seller-creator-info">
                <p>Owner</p>
                <br />
                <h4>{auctionInfo.ownerInfo.username}</h4>
              </div>
            </div>
            <div
              className="item-seller-creator-profile"
              style={{ paddingLeft: "20px" }}
            >
              <img
                className="item-seller-creator-img"
                src={auctionInfo.creatorInfo.imageUri}
                alt="profile image"
              />
              <div className="item-seller-creator-info">
                <p>Creator</p>
                <br />
                <a href={`/creator-profile/${auctionInfo.creatorAddress}`}>
                  <h4>{auctionInfo.creatorInfo.username}</h4>
                </a>
              </div>
            </div>
          </div>
          <div className="item-desc">
            <p>{auctionInfo.description}</p>
          </div>
          <div className="auction-bid-info">
            <Table responsive style={{ color: "white" }}>
              <tbody>
                {auctionInfo.status === "Open" ? (
                  <>
                    <tr>
                      <td className="p-2">Ends in</td>
                      <td>
                        {moment
                          .unix(auctionInfo.endTime)
                          .format("MMM D, HH:mmA")}
                      </td>
                    </tr>
                    {auctionInfo.highestBidder === MATIC ? (
                      <tr>
                        <td className="p-2">Start price</td>
                        <td>
                          {auctionInfo.startPrice}{" "}
                          {
                            getTokenFromAddress(
                              wallet.network,
                              auctionInfo.paymentToken
                            ).symbol
                          }
                        </td>
                      </tr>
                    ) : null}
                    <tr>
                      <td className="p-2">Direct Buy price</td>
                      <td>
                        {auctionInfo.directPrice}{" "}
                        {
                          getTokenFromAddress(
                            wallet.network,
                            auctionInfo.paymentToken
                          ).symbol
                        }
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2">Highest Bid</td>
                      {auctionInfo.highestBidder === wallet.account ? (
                        <td>You have highest bid</td>
                      ) : (
                        <td>
                          {auctionInfo.highestBid}{" "}
                          {
                            getTokenFromAddress(
                              wallet.network,
                              auctionInfo.paymentToken
                            ).symbol
                          }
                        </td>
                      )}
                    </tr>
                    <tr>
                      <td className="p-2">Your Bid</td>
                      <td>
                        {auctionInfo.highestBid}{" "}
                        {
                          getTokenFromAddress(
                            wallet.network,
                            auctionInfo.paymentToken
                          ).symbol
                        }
                      </td>
                    </tr>
                  </>
                ) : auctionInfo.status === "Closed" ? (
                  <>
                    <tr>
                      <td className="p-2">Starts in</td>
                      <td>
                        {moment
                          .unix(auctionInfo.startTime)
                          .format("MMM D, HH:mmA")}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2">Ends in</td>
                      <td>
                        {moment
                          .unix(auctionInfo.endTime)
                          .format("MMM D, HH:mmA")}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2">Start price</td>
                      <td>
                        {auctionInfo.startPrice}{" "}
                        {
                          getTokenFromAddress(
                            wallet.network,
                            auctionInfo.paymentToken
                          ).symbol
                        }
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2">Direct Buy price</td>
                      <td>
                        {auctionInfo.directPrice}{" "}
                        {
                          getTokenFromAddress(
                            wallet.network,
                            auctionInfo.paymentToken
                          ).symbol
                        }
                      </td>
                    </tr>
                  </>
                ) : auctionInfo.status === "Ended" ? (
                  <>
                    <tr>
                      <td className="p-2">Started in</td>
                      <td>
                        {moment
                          .unix(auctionInfo.startTime)
                          .format("MMM D, HH:mmA")}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2">Ends in</td>
                      <td>
                        {moment
                          .unix(auctionInfo.endTime)
                          .format("MMM D, HH:mmA")}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2">Start price</td>
                      <td>
                        {auctionInfo.startPrice}{" "}
                        {
                          getTokenFromAddress(
                            wallet.network,
                            auctionInfo.paymentToken
                          ).symbol
                        }
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2">Direct Buy price</td>
                      <td>
                        {auctionInfo.directPrice}{" "}
                        {
                          getTokenFromAddress(
                            wallet.network,
                            auctionInfo.paymentToken
                          ).symbol
                        }
                      </td>
                    </tr>
                  </>
                ) : null}
              </tbody>
            </Table>
          </div>
          <div className="auction-content-buy">
            {wallet.account === auctionInfo.ownerAddress ? (
              auctionInfo.status === "Ended" ? (
                <button type="submit" onClick={endAuction}>
                  {loading ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    "End Auction"
                  )}
                </button>
              ) : auctionInfo.status === "Closed" ? (
                <button type="submit" onClick={cancelAuction}>
                  {loading ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    "Cancel"
                  )}
                </button>
              ) : null
            ) : wallet.account === auctionInfo.highestBidder ? (
              auctionInfo.status === "Open" ? (
                <button type="submit" onClick={directBuy}>
                  {loading ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    "Buy Directly"
                  )}
                </button>
              ) : auctionInfo.status === "DirectBuy" &&
                biddingParams.bidAmount !== 0 ? (
                <button type="submit" onClick={withdrawBid}>
                  {loading ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    "Withdraw Bid"
                  )}
                </button>
              ) : null
            ) : wallet.account !== auctionInfo.highestBidder ? (
              auctionInfo.status === "Open" ? (
                <>
                  <button type="submit" onClick={handleShow}>
                    {loading ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      "Make bid"
                    )}
                  </button>
                  <button type="submit" onClick={directBuy}>
                    {loading ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      "Buy Directly"
                    )}
                  </button>
                </>
              ) : auctionInfo.status === "DirectBuy" &&
                biddingParams.bidAmount !== 0 ? (
                <button type="submit" onClick={withdrawBid}>
                  {loading ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    "Withdraw Bid"
                  )}
                </button>
              ) : null
            ) : null}
          </div>
        </div>
      </div>
      <Modal show={show} onHide={handleClose} className="dark-modal">
        <Modal.Header>
          <Modal.Title>Make a Bid</Modal.Title>
          <AiOutlineClose onClick={handleClose} />
        </Modal.Header>
        <Modal.Body>
          <form className="writeForm" autoComplete="off">
            <div className="filter-input">
              <label>Bidding Price </label>
              <input
                type="number"
                min="0"
                value={biddingParams.bidAmount}
                autoFocus={true}
                onChange={(e) => {
                  setBiddingParams({
                    ...biddingParams,
                    bidAmount: e.target.value,
                  });
                }}
              />
            </div>
            <div className="filter-input">
              <label>Payment Token</label>
              <select>
                {tokens["Polygon Mainnet"].map((token, index) => {
                  return (
                    <option
                      className="token_row"
                      type="submit"
                      key={index}
                      onClick={() => {
                        setBiddingParams({
                          ...biddingParams,
                          paymentToken: index,
                        });
                      }}
                    >
                      <span className="token_text">{token.symbol}</span>
                    </option>
                  );
                })}
              </select>
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          {biddingParams.bidAmount !== 0 ? (
            <button type="submit" onClick={withdrawBid}>
              {loading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                "Withdraw"
              )}
            </button>
          ) : null}
          <button type="submit" onClick={bid}>
            {loading ? <CircularProgress size={18} color="inherit" /> : "Bid"}
          </button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default AuctionPage;
