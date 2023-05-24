import "../assets/styles/pages/itemPage.css";
import "react-datepicker/dist/react-datepicker.css";

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ethers } from "ethers";
import axios from "axios";
import { CircularProgress } from "@mui/material";
import DatePicker from "react-datepicker";
import { AiOutlineClose } from "react-icons/ai";
import { Modal } from "react-bootstrap";

import { IPFS_GATEWAY } from "../utils/ipfsStorage";
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
import { approveERC20, approveERC721 } from "../utils/exchange-utils";
import { MATIC, parseTokenAmount, tokens } from "../utils/tokens-utils";
import images from "../assets/images";

const ItemPage = () => {
  let navigate = useNavigate();
  const { id } = useParams();
  const wallet = useSelector((state) => state.userData.value);

  const [modalType, setModalType] = useState("");
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const [loading, setLoading] = useState(false);
  const [buyOffers, setBuyOffers] = useState([]);
  const [metaData, setMetaData] = useState({
    name: "",
    description: "",
    imageUri: "",
    ownerInfo: "",
    ownerAddress: "",
    creatorInfo: "",
    creatorAddress: "",
    category: "",
  });

  const [offer, setOffer] = useState({
    hasOffer: false,
    amount: 0,
    paymentToken: MATIC,
    expireAt: new Date(),
  });

  const [listingParams, setListingParams] = useState({
    amount: 0,
    paymentToken: MATIC,
  });

  const [auctionParams, setAuctionParams] = useState({
    startPrice: 0,
    directPrice: 0,
    paymentToken: MATIC,
    startTime: new Date(),
    endTime: new Date(),
  });

  const getNftMetaData = async () => {
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

      const tokenOwner = await nft_contract.ownerOf(Number(id));
      const tokenUri = await nft_contract.tokenURI(Number(id));
      const _metadata = await axios.get(
        tokenUri.replace("ipfs://", IPFS_GATEWAY)
      );

      const creator = await getUserProfile(_metadata.data.creator);
      const owner = await getUserProfile(tokenOwner);

      setMetaData({
        name: _metadata.data.name,
        description: _metadata.data.description,
        imageUri: _metadata.data.image.replace("ipfs://", IPFS_GATEWAY),
        ownerInfo: owner,
        ownerAddress: tokenOwner,
        creatorInfo: creator,
        creatorAddress: _metadata.data.creator,
        category: _metadata.data.category,
      });
    }
  };

  const getNftOffers = async () => {
    if (wallet.network === networksMap[networkDeployedTo]) {
      const provider = new ethers.providers.Web3Provider(
        window.ethereum,
        "any"
      );
      const market_contract = new ethers.Contract(
        marketContractAddress,
        marketContract.abi,
        provider
      );

      const offers = await market_contract.getTokenBuyOffers(Number(id));
      const activeOffers = offers.map((o, index) => {
        if (o[4] === 1) {
          return {
            id: index,
            offerer: o[0],
            paymentToken: o[1],
            amount: o[2],
            expiretime: Date(o[3]),
          };
        }
      });
      const userOffers = activeOffers.filter((o) => o[0] === wallet.account);
      if (userOffers.length !== 0) {
        setOffer({
          hasOffer: true,
          amount: userOffers[0][1],
          paymentToken: userOffers[0][2],
          expireAt: Date(userOffers[0][3]),
        });
      }
      setBuyOffers(activeOffers);
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
        username: "Jane Doe",
        imageUri: images.user,
      };
    }
  };

  const makeOffer = async () => {
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

      const amount = parseTokenAmount(
        wallet.network,
        offer.paymentToken,
        offer.amount
      );

      if (offer.paymentToken !== MATIC) {
        await approveERC20(
          signer,
          offer.paymentToken,
          marketContractAddress,
          amount
        );
        const offer_tx = await market_contract.makeOffer(
          Number(id),
          offer.paymentToken,
          amount,
          offer.expireAt
        );
        await offer_tx.wait();
      } else {
        const offer_tx = await market_contract.makeOffer(
          Number(id),
          MATIC,
          amount,
          offer.expireAt,
          {
            value: amount,
          }
        );
        await offer_tx.wait();
      }
    }
  };

  const acceptOffer = async (offerId) => {
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

      await approveERC721(
        signer,
        nftContractAddress,
        marketContractAddress,
        Number(id)
      );

      const accept_tx = await market_contract.acceptOffer(Number(id), offerId);
      await accept_tx.wait();
    }
  };

  const cancelOffer = async (offerId) => {
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

      const cancel_tx = await market_contract.cancelOffer(Number(id), offerId);
      await cancel_tx.wait();

      handleClose();
    }
  };

  const listNFT = async () => {
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
        await approveERC721(
          signer,
          nftContractAddress,
          marketContractAddress,
          Number(id)
        );
        const saleId = (await market_contract.getListings()).length;
        const price = parseTokenAmount(
          wallet.network,
          listingParams.paymentToken,
          listingParams.amount
        );

        const list_tx = await market_contract.listItem(
          Number(id),
          listingParams.paymentToken,
          price
        );
        await list_tx.wait();

        handleClose();
        setLoading(false);
        navigate(`/sale-page/${saleId}`);
      } catch (err) {
        handleClose();
        setLoading(false);
        console.log(err);
      }
    }
  };

  const startAuction = async () => {
    if (wallet.network === networksMap[networkDeployedTo]) {
      try {
        setLoading(true);
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

        const startTime = Math.floor(auctionParams.startTime.getTime() / 1000);
        const endTime = Math.floor(auctionParams.endTime.getTime() / 1000);
        const auctionId = (await market_contract.getAuctions()).length;
        const startPrice = parseTokenAmount(
          wallet.network,
          auctionParams.paymentToken,
          auctionParams.startPrice
        );
        const directPrice = parseTokenAmount(
          wallet.network,
          auctionParams.paymentToken,
          auctionParams.directPrice
        );

        await approveERC721(
          signer,
          nftContractAddress,
          marketContractAddress,
          Number(id)
        );

        const auction_tx = await market_contract.startAuction(
          Number(id),
          auctionParams.paymentToken,
          directPrice,
          startPrice,
          startTime,
          endTime
        );
        await auction_tx.wait();

        setLoading(false);
        navigate(`/auction-page/${auctionId}`);
      } catch (err) {
        setLoading(false);
        console.log(err);
      }
    } else {
      window.alert(
        `Please Switch to the ${networksMap[networkDeployedTo]} network`
      );
    }
  };

  useEffect(() => {
    const get = async () => {
      if (window.ethereum !== undefined) {
        await getNftMetaData();
        await getNftOffers();
      }
    };
    get();
  }, []);

  return (
    <>
      <div className="item section__padding">
        <div className="item-image">
          <img src={metaData.imageUri} alt="item" />
        </div>
        <div className="item-content">
          <h1 className="item-title">{metaData.name}</h1>
          <div className="item-seller-creator">
            <div className="item-seller-creator-profile">
              <img
                className="item-seller-creator-img"
                src={metaData.ownerInfo.imageUri}
                alt="profile image"
              />
              <div className="item-seller-creator-info">
                <p>Owner</p>
                <br />
                <h4>{metaData.ownerInfo.username}</h4>
              </div>
            </div>
            <div
              className="item-seller-creator-profile"
              style={{ paddingLeft: "20px" }}
            >
              <img
                className="item-seller-creator-img"
                src={metaData.creatorInfo.imageUri}
                alt="profile image"
              />
              <div className="item-seller-creator-info">
                <p>Creator</p>
                <br />
                <a href={`/creator-profile/${metaData.creatorAddress}`}>
                  <h4>{metaData.creatorInfo.username}</h4>
                </a>
              </div>
            </div>
          </div>
          <div className="item-desc">
            <p>
              Category : <span>{metaData.category}</span>
            </p>
            <p>{metaData.description}</p>
          </div>
          <div className="item-content-buy">
            {wallet.account !== metaData.ownerAddress ? (
              offer.hasOffer ? (
                <button
                  className="primary-btn"
                  type="submit"
                  onClick={() => {
                    setModalType("Offer");
                    handleShow();
                  }}
                >
                  Change Offer
                </button>
              ) : (
                <button
                  className="primary-btn"
                  type="submit"
                  onClick={() => {
                    setModalType("Offer");
                    handleShow();
                  }}
                >
                  Make Offer
                </button>
              )
            ) : (
              <div className="sale-content-buy">
                <button
                  className="primary-btn"
                  type="submit"
                  onClick={() => {
                    setModalType("Sale");
                    handleShow();
                  }}
                >
                  List item
                </button>
                <button
                  className="primary-btn"
                  type="submit"
                  onClick={() => {
                    setModalType("Auction");
                    handleShow();
                  }}
                >
                  Start Auction
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <Modal show={show} onHide={handleClose} className="dark-modal">
        <Modal.Header>
          {modalType === "Offer" ? (
            <Modal.Title>Buy Offer</Modal.Title>
          ) : modalType === "Sale" ? (
            <Modal.Title>List NFT</Modal.Title>
          ) : (
            <Modal.Title>Start Auction</Modal.Title>
          )}
          <AiOutlineClose onClick={handleClose} />
        </Modal.Header>
        <Modal.Body>
          {modalType === "Offer" ? (
            <form className="writeForm" autoComplete="off">
              <div className="filter-input">
                <label>Offer Price </label>
                <input
                  type="number"
                  min="0"
                  value={offer.amount}
                  autoFocus={true}
                  onChange={(e) =>
                    setOffer({ ...offer, amount: e.target.value })
                  }
                />
              </div>
              <div className="filter-input">
                <label>Payment Token</label>
                <select value={offer.paymentToken}>
                  {tokens["Polygon Mainnet"].map((token, index) => {
                    return (
                      <option
                        className="token_row"
                        type="submit"
                        key={index}
                        onClick={() =>
                          setOffer({
                            ...offer,
                            paymentToken: token.address,
                          })
                        }
                      >
                        <span className="token_text">{token.symbol}</span>
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="filter-input">
                <label>Offer Expiration </label>
                <DatePicker
                  className="date-control"
                  dateFormat="dd/MM/yyyy"
                  selected={offer.expireAt}
                  onChange={(date) => setOffer({ ...offer, expireAt: date })}
                />
              </div>
            </form>
          ) : modalType === "Sale" ? (
            <form className="writeForm" autoComplete="off">
              <div className="filter-input">
                <label>Buy Price </label>
                <input
                  type="number"
                  min="0"
                  value={listingParams.amount}
                  autoFocus={true}
                  onChange={(e) =>
                    setListingParams({
                      ...listingParams,
                      amount: e.target.value,
                    })
                  }
                />
              </div>
              <div className="filter-input">
                <label>Payment Token</label>
                <select value={listingParams.paymentToken}>
                  {tokens["Polygon Mainnet"].map((token, index) => {
                    return (
                      <option
                        className="token_row"
                        type="submit"
                        key={index}
                        onChange={() =>
                          setListingParams({
                            ...listingParams,
                            paymentToken: token.address,
                          })
                        }
                      >
                        <span className="token_text">{token.symbol}</span>
                      </option>
                    );
                  })}
                </select>
              </div>
            </form>
          ) : (
            <form className="writeForm" autoComplete="off">
              <div className="filter-input">
                <label>Start Price </label>
                <input
                  type="number"
                  min="0"
                  value={auctionParams.startPrice}
                  autoFocus={true}
                  onChange={(e) =>
                    setAuctionParams({
                      ...auctionParams,
                      startPrice: e.target.value,
                    })
                  }
                />
              </div>
              <div className="filter-input">
                <label>Direct Buy Price </label>
                <input
                  type="number"
                  min="0"
                  value={auctionParams.directPrice}
                  autoFocus={true}
                  onChange={(e) =>
                    setAuctionParams({
                      ...auctionParams,
                      directPrice: e.target.value,
                    })
                  }
                />
              </div>
              <div className="filter-input">
                <label>Payment Token</label>
                <select value={auctionParams.paymentToken}>
                  {tokens["Polygon Mainnet"].map((token, index) => {
                    return (
                      <option
                        className="token_row"
                        type="submit"
                        key={index}
                        onChange={() =>
                          setAuctionParams({
                            ...auctionParams,
                            paymentToken: token.address,
                          })
                        }
                      >
                        <span className="token_text">{token.symbol}</span>
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="filter-input">
                <label>start Time </label>
                <DatePicker
                  className="date-control"
                  dateFormat="dd/MM/yyyy"
                  selected={auctionParams.startTime}
                  onChange={(date) =>
                    setAuctionParams({ ...auctionParams, startTime: date })
                  }
                />
              </div>
              <div className="filter-input">
                <label>End Time </label>
                <DatePicker
                  className="date-control"
                  dateFormat="dd/MM/yyyy"
                  selected={auctionParams.endTime}
                  onChange={(date) =>
                    setAuctionParams({ ...auctionParams, endTime: date })
                  }
                />
              </div>
            </form>
          )}
        </Modal.Body>
        <Modal.Footer>
          {modalType === "Offer" ? (
            offer.hasOffer ? (
              <button className="btn-style-three" onClick={cancelOffer}>
                Cancel Offer
              </button>
            ) : (
              <button className="btn-style-three" onClick={makeOffer}>
                Submit
              </button>
            )
          ) : modalType === "Sale" ? (
            <button className="btn-style-three" onClick={listNFT}>
              {loading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                "List"
              )}
            </button>
          ) : (
            <button className="btn-style-three" onClick={startAuction}>
              {loading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                "Start"
              )}
            </button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ItemPage;
