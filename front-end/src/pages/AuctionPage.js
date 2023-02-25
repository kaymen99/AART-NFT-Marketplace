import "./../assets/styles/pages/auctionPage.css";
import images from "../assets/images";

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Modal, Table } from "react-bootstrap";
import { ethers } from "ethers";
import moment from "moment";
import axios from "axios";
import { AiOutlineClose } from "react-icons/ai";

import marketContract from "../artifacts/AARTMarket.sol/AARTMarket.json";
import nftContract from "../artifacts/AARTCollection.sol/AARTCollection.json";
import {
  marketContractAddress,
  nftContractAddress,
  networkDeployedTo,
} from "../utils/contracts-config";
import networksMap from "../utils/networksMap.json";
import { IPFS_GATEWAY } from "../utils/ipfsStorage";
import { approveERC20, swap } from "../utils/exchange-utils";
import { getTokenAddress, tokens } from "../utils/tokens-utils";

const AuctionPage = () => {
  const { id } = useParams();
  const wallet = useSelector((state) => state.blockchain.value);

  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const [auctionInfo, setAuctionInfo] = useState({
    tokenId: 0,
    name: "",
    description: "",
    imageUri: "",
    creator: "",
    category: "",
    seller: "",
    paymentToken: "MATIC",
    highestBid: 0,
    highestBidder: "",
    startPrice: 0,
    directPrice: 0,
    startTime: "",
    endTime: "",
    started: false,
  });

  const [biddingParams, setBiddingParams] = useState({
    bidAmount: 0,
    paymentToken: auctionInfo.paymentToken,
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

      const tokenUri = await nft_contract.tokenURI(tokenId);
      const _metadata = await axios.get(
        tokenUri.replace("ipfs://", IPFS_GATEWAY)
      );
      const startTime = Number(auction[7]);

      const userBidAmount = await market_contract.getUserBidAmount(
        Number(id),
        wallet.account
      );

      setAuctionInfo({
        tokenId: tokenId,
        name: _metadata.data.name,
        description: _metadata.data.description,
        imageUri: _metadata.data.image.replace("ipfs://", IPFS_GATEWAY),
        creator: _metadata.data.creator,
        category: _metadata.data.category,
        seller: auction[1],
        paymentToken: auction[2],
        highestBidder: auction[3],
        highestBid: auction[4],
        directPrice: Number(auction[5]),
        startPrice: Number(auction[6]),
        startTime: startTime,
        endTime: Number(auction[8]),
        started: startTime >= new Date().getTime(),
      });

      setBiddingParams({ ...biddingParams, bidAmount: userBidAmount });
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

      if (biddingParams.paymentToken !== auctionInfo.paymentToken) {
        try {
          await swap(
            biddingParams.paymentToken,
            auctionInfo.paymentToken,
            signer,
            biddingParams.bidAmount
          );
        } catch (error) {
          window.alert("An error has occured, try again");
          console.log(error);
        }
      }
      if (auctionInfo.paymentToken !== 0) {
        await approveERC20(
          signer,
          getTokenAddress(auctionInfo.paymentToken),
          marketContractAddress,
          auctionInfo.amount
        );
        const bid_tx = await market_contract.bid(Number(id));
        await bid_tx.wait();
      } else {
        const bid_tx = await market_contract.bid(Number(id), {
          value: auctionInfo.amount,
        });
        await bid_tx.wait();
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
      if (auctionInfo.paymentToken !== 0) {
        await approveERC20(
          signer,
          getTokenAddress(auctionInfo.paymentToken),
          marketContractAddress,
          auctionInfo.directPrice
        );
        const buy_tx = await market_contract.directBuyAuction(Number(id));
        await buy_tx.wait();
      } else {
        const buy_tx = await market_contract.directBuyAuction(Number(id), {
          value: auctionInfo.directPrice,
        });
        await buy_tx.wait();
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

      const withdraw_tx = await market_contract.withdrawBid(Number(id));
      await withdraw_tx.wait();
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

      const end_tx = await market_contract.endAuction(Number(id));
      await end_tx.wait();
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
                src={images.user}
                alt="profile image"
              />
              <div className="item-seller-creator-info">
                <p>Creator</p>
                <br />
                <h4>Rian Leon </h4>
              </div>
            </div>
            <div
              className="item-seller-creator-profile"
              style={{ paddingLeft: "20px" }}
            >
              <img
                className="item-seller-creator-img"
                src={images.user}
                alt="profile image"
              />
              <div className="item-seller-creator-info">
                <p>Owner</p>
                <br />
                <h4>Rian Leon </h4>
              </div>
            </div>
          </div>
          <div className="item-desc">
            <p>{auctionInfo.description}</p>
          </div>
          <div className="auction-bid-info">
            <Table responsive style={{ color: "white" }}>
              <tbody>
                {auctionInfo.started ? (
                  <>
                    <tr>
                      <td className="p-2">Ends in</td>
                      <td>
                        {moment
                          .unix(auctionInfo.endTime)
                          .format("MMM D, HH:mmA")}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2">Highest Bid</td>
                      {auctionInfo.highestBidder === wallet.account ? (
                        <td>You have highest bid</td>
                      ) : (
                        <td>1000 ETH</td>
                      )}
                    </tr>
                    <tr>
                      <td className="p-2">Your Bid</td>
                      <td>450 ETH</td>
                    </tr>
                  </>
                ) : (
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
                      <td>{auctionInfo.startPrice}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </Table>
          </div>
          <div className="auction-content-buy">
            {wallet.account !== auctionInfo.seller ? (
              auctionInfo.started ? (
                wallet.account !== auctionInfo.highestBidder ? (
                  <>
                    <button type="submit" onClick={handleShow}>
                      Make bid
                    </button>
                    <button type="submit" onClick={directBuy}>
                      Buy Directly
                    </button>
                  </>
                ) : (
                  <button type="submit" onClick={directBuy}>
                    Buy Directly
                  </button>
                )
              ) : null
            ) : auctionInfo.started ? (
              <button type="submit" onClick={cancelAuction}>
                Cancel
              </button>
            ) : (
              <button type="submit" onClick={endAuction}>
                End Auction
              </button>
            )}
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
              Withdraw
            </button>
          ) : null}
          <button type="submit" onClick={bid}>
            Bid
          </button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default AuctionPage;
