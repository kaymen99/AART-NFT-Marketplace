import "../assets/styles/pages/salePage.css";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { CircularProgress } from "@mui/material";
import { AiOutlineClose } from "react-icons/ai";
import { Modal } from "react-bootstrap";
import { ethers } from "ethers";
import axios from "axios";

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
import { approveERC20 } from "../utils/exchange-utils";
import {
  MATIC,
  getTokenFromAddress,
  formatTokenAmount,
  tokens,
  parseTokenAmount,
} from "../utils/tokens-utils";

const SalePage = () => {
  let navigate = useNavigate();
  const { id } = useParams();
  const wallet = useSelector((state) => state.userData.value);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const [paymentToken, setPaymentToken] = useState(MATIC);
  const [saleInfo, setSaleInfo] = useState({
    tokenId: 0,
    ownerInfo: "",
    ownerAddress: "",
    creatorInfo: "",
    creatorAddress: "",
    name: "",
    description: "",
    imageUri: "",
    category: "",
    seller: "",
    paymentToken: MATIC,
    price: 0,
  });

  const getSaleDetails = async () => {
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

      const sale = (await market_contract.getListings())[Number(id)];
      const tokenId = sale[0];

      const tokenOwner = await nft_contract.ownerOf(tokenId);
      const tokenUri = await nft_contract.tokenURI(tokenId);
      const _metadata = await axios.get(
        tokenUri.replace("ipfs://", IPFS_GATEWAY)
      );

      const _ownerInfo = await getUserProfile(tokenOwner);
      const _creatorInfo = await getUserProfile(_metadata.data.creator);

      const price = formatTokenAmount(wallet.network, sale[2], sale[3]);

      setSaleInfo({
        tokenId: Number(tokenId),
        ownerInfo: _ownerInfo,
        ownerAddress: tokenOwner,
        creatorInfo: _creatorInfo,
        creatorAddress: _metadata.data.creator,
        name: _metadata.data.name,
        description: _metadata.data.description,
        imageUri: _metadata.data.image.replace("ipfs://", IPFS_GATEWAY),
        category: _metadata.data.category,
        seller: sale[1],
        paymentToken: sale[2],
        price: price,
      });
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

  const buyItem = async () => {
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
        const _price = parseTokenAmount(
          wallet.network,
          saleInfo.paymentToken,
          saleInfo.price
        );
        if (saleInfo.paymentToken !== ethers.constants.AddressZero) {
          await approveERC20(
            signer,
            saleInfo.paymentToken,
            marketContractAddress,
            _price
          );
          const buy_tx = await market_contract.buyItem(Number(id));
          await buy_tx.wait();
        } else {
          const buy_tx = await market_contract.buyItem(Number(id), {
            value: _price,
          });
          await buy_tx.wait();
        }
        setLoading(false);

        navigate(`/nft-page/${saleInfo.tokenId}`);
      } catch (err) {
        setLoading(false);
        handleClose();
        console.log(err);
      }
    }
  };

  const cancelSale = async () => {
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
        const cancel_tx = await market_contract.cancelListing(Number(id));
        await cancel_tx.wait();
        setLoading(false);

        navigate(`/nft-page/${saleInfo.tokenId}`);
      } catch (err) {
        setLoading(false);
        console.log(err);
      }
    }
  };

  useEffect(() => {
    const get = async () => {
      await getSaleDetails();
    };
    get();
  }, []);

  return (
    <>
      <div className="item section__padding">
        <div className="item-image">
          <img src={saleInfo.imageUri} alt="item" />
        </div>
        <div className="item-content">
          <h1 className="item-title">{saleInfo.name}</h1>
          <div className="item-seller-creator">
            <div className="item-seller-creator-profile">
              <img
                className="item-seller-creator-img"
                src={saleInfo.ownerInfo.imageUri}
                alt="profile image"
              />
              <div className="item-seller-creator-info">
                <p>Owner</p>
                <br />
                <h4>{saleInfo.ownerInfo.username}</h4>
              </div>
            </div>
            <div
              className="item-seller-creator-profile"
              style={{ paddingLeft: "20px" }}
            >
              <img
                className="item-seller-creator-img"
                src={saleInfo.creatorInfo.imageUri}
                alt="profile image"
              />
              <div className="item-seller-creator-info">
                <p>Creator</p>
                <br />
                <a href={`/creator-profile/${saleInfo.creatorAddress}`}>
                  <h4>{saleInfo.creatorInfo.username}</h4>
                </a>
              </div>
            </div>
          </div>
          <div className="item-desc">
            <p>{saleInfo.description}</p>
          </div>
          <div className="sale-price-box">
            <div className="sale_price">
              <small>Sale Price</small>
              <p>
                {saleInfo.price}{" "}
                {
                  getTokenFromAddress(wallet.network, saleInfo.paymentToken)
                    .symbol
                }{" "}
                <span>( ≈ $3,221.22)</span>
              </p>
            </div>
          </div>
          <div className="item-content-buy">
            {wallet.account !== saleInfo.seller ? (
              <>
                <button className="primary-btn" onClick={buyItem}>
                  {loading ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    "Buy"
                  )}
                </button>
                <button
                  className="secondary-btn swapbox_select token_select"
                  type="submit"
                  onClick={() => {
                    handleShow();
                  }}
                  disabled={true}
                >
                  <img
                    className="token_img"
                    src={
                      getTokenFromAddress(wallet.network, saleInfo.paymentToken)
                        .logo
                    }
                  />
                  <span className="token_text">
                    {
                      getTokenFromAddress(wallet.network, saleInfo.paymentToken)
                        .symbol
                    }
                  </span>
                </button>
              </>
            ) : (
              <button className="primary-btn" onClick={cancelSale}>
                {loading ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  "Cancel"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
      <Modal
        show={show}
        onHide={handleClose}
        className="dark-modal"
        style={{ overflow: "scroll" }}
      >
        <Modal.Header>
          <Modal.Title>SELECT A TOKEN</Modal.Title>
          <AiOutlineClose onClick={handleClose} />
        </Modal.Header>
        <Modal.Body>
          {tokens["Polygon Mainnet"].map((token, index) => {
            return (
              <div
                className="token_row"
                type="submit"
                key={index}
                onClick={() => {
                  setPaymentToken(index);
                  handleClose();
                }}
              >
                <img className="token_img" src={token.logo} />
                <span className="token_text">{token.symbol}</span>
              </div>
            );
          })}
        </Modal.Body>
        <Modal.Footer>
          <button className="btn-style-three" onClick={handleClose}>
            Close
          </button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default SalePage;
