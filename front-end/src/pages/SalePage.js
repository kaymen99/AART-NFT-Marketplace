import "./../assets/styles/pages/salePage.css";
import images from "../assets/images";

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { AiOutlineClose } from "react-icons/ai";
import { Modal } from "react-bootstrap";
import { ethers } from "ethers";
import axios from "axios";

import { IPFS_GATEWAY } from "../utils/ipfsStorage";
import marketContract from "../artifacts/AARTMarket.sol/AARTMarket.json";
import nftContract from "../artifacts/AARTCollection.sol/AARTCollection.json";
import {
  marketContractAddress,
  nftContractAddress,
  networkDeployedTo,
} from "../utils/contracts-config";
import networksMap from "../utils/networksMap.json";
import { approveERC20 } from "../utils/exchange-utils";
import { getTokenAddress, tokens } from "../utils/tokens-utils";

const SalePage = () => {
  const { id } = useParams();
  const wallet = useSelector((state) => state.blockchain.value);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const [paymentToken, setPaymentToken] = useState(0);

  const [saleInfo, setSaleInfo] = useState({
    tokenId: 0,
    name: "",
    description: "",
    imageUri: "",
    creator: "",
    category: "",
    seller: "",
    paymentToken: "",
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

      const tokenUri = await nft_contract.tokenURI(tokenId);
      const _metadata = await axios.get(
        tokenUri.replace("ipfs://", IPFS_GATEWAY)
      );

      setSaleInfo({
        tokenId: Number(tokenId),
        name: _metadata.data.name,
        description: _metadata.data.description,
        imageUri: _metadata.data.image.replace("ipfs://", IPFS_GATEWAY),
        creator: _metadata.data.creator,
        category: _metadata.data.category,
        seller: sale[1],
        paymentToken: sale[2],
        price: Number(sale[3]),
      });
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
        if (saleInfo.paymentToken !== 0) {
          await approveERC20(
            signer,
            getTokenAddress(saleInfo.paymentToken),
            marketContractAddress,
            saleInfo.amount
          );
          const buy_tx = await market_contract.buyItem(Number(id));
          await buy_tx.wait();
        } else {
          const buy_tx = await market_contract.buyItem(Number(id), {
            value: saleInfo.amount,
          });
          await buy_tx.wait();
        }
        setLoading(false);
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

      const cancel_tx = await market_contract.cancelListing(Number(id));
      await cancel_tx.wait();
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
              style={{ paddingLeft: "25px" }}
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
            <p>{saleInfo.description}</p>
          </div>
          <div className="sale-price-box">
            <div className="sale_price">
              <small>Sale Price</small>
              <p>
                {saleInfo.price} ETH <span>( ≈ $3,221.22)</span>
              </p>
            </div>
          </div>
          <div className="item-content-buy">
            {wallet.account !== saleInfo.seller ? (
              <>
                <button className="primary-btn" onClick={buyItem}>
                  Buy For {saleInfo.price} ETH
                </button>
                <button
                  className="secondary-btn swapbox_select token_select"
                  type="submit"
                  onClick={() => {
                    handleShow();
                  }}
                >
                  <img
                    className="token_img"
                    src={tokens["Polygon Mainnet"][0].logo}
                  />
                  <span className="token_text">
                    {tokens["Polygon Mainnet"][0].symbol}
                  </span>
                </button>
              </>
            ) : (
              <button className="primary-btn" onClick={cancelSale}>
                Cancel
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
