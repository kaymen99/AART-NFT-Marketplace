import React, { useState, useCallback, useEffect } from "react";
import "../assets/styles/components/AuctionSlider.css";
import images from "../assets/images";
import { AiFillHeart } from "react-icons/ai";
import { MdTimer } from "react-icons/md";
import { TbArrowBigLeftLines, TbArrowBigRightLine } from "react-icons/tb";
import Button from "./Button";
import { useSelector } from "react-redux";
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
import { getTokenFromAddress, formatTokenAmount } from "../utils/tokens-utils";

const AuctionSlider = () => {
  const wallet = useSelector((state) => state.userData.value);
  const [auctionsList, setAuctionsList] = useState([]);
  const [displayed, setDisplayed] = useState({
    from: 0,
    to: 0,
  });

  const [idNumber, setIdNumber] = useState(0);

  const sliderData = [
    {
      title: "NFT 1",
      id: 1,
      name: "Aymen",
      price: "00664 ETH",
      like: 243,
      image: images.user,
      nftImage: images.nft1,
      time: {
        days: 21,
        hours: 40,
        minutes: 81,
        seconds: 15,
      },
    },
    {
      title: "NFT 2",
      id: 2,
      name: "Elon Musk",
      price: "0000004 ETH",
      like: 243,
      image: images.user,
      nftImage: images.nft2,
      time: {
        days: 77,
        hours: 11,
        minutes: 21,
        seconds: 45,
      },
    },
    {
      title: "NFT 3",
      id: 3,
      name: "John",
      price: "0000064 ETH",
      like: 243,
      image: images.user,
      nftImage: images.nft3,
      time: {
        days: 37,
        hours: 20,
        minutes: 11,
        seconds: 55,
      },
    },
    {
      title: "NFT 4",
      id: 4,
      name: "Marc",
      price: "4664 ETH",
      like: 243,
      image: images.user,
      nftImage: images.nft4,
      time: {
        days: 87,
        hours: 29,
        minutes: 10,
        seconds: 15,
      },
    },
  ];

  const getAuctionsList = async () => {
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
      const nft_contract = new ethers.Contract(
        nftContractAddress,
        nftContract.abi,
        provider
      );

      const auctions = await market_contract.getAuctions();
      const activeAuctions = await Promise.all(
        auctions.map(async (auction, index) => {
          if (auction.status === 0) {
            const tokenId = Number(auction.tokenId);
            const tokenUri = await nft_contract.tokenURI(tokenId);
            const metadata = await axios.get(
              tokenUri.replace("ipfs://", IPFS_GATEWAY)
            );
            const sellerInfo = await getUserProfile(auction[1]);
            const price = formatTokenAmount(
              wallet.network,
              auction.paymentToken,
              auction.highestBid
            );

            return {
              id: index,
              tokenId: tokenId,
              sellerName: sellerInfo.username,
              sellerImg: sellerInfo.imageUri,
              name: metadata.data.name,
              uri: metadata.data.image.replace("ipfs://", IPFS_GATEWAY),
              price: price,
              paymentToken: auction.paymentToken,
              like: 243,
              time: {
                days: 21,
                hours: 40,
                minutes: 81,
                seconds: 15,
              },
              path: "/auction-page",
            };
          }
        })
      );

      if (activeAuctions[0] !== undefined) {
        setAuctionsList(activeAuctions);
      }
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

  useEffect(() => {
    const get = async () => {
      if (window.ethereum !== undefined) {
        await getAuctionsList();
      }
    };
    get();
  }, []);

  const inc = useCallback(() => {
    if (idNumber + 1 < auctionsList.length) {
      setIdNumber(idNumber + 1);
    }
  }, [idNumber, auctionsList.length]);

  const dec = useCallback(() => {
    if (idNumber > 0) {
      setIdNumber(idNumber - 1);
    }
  }, [idNumber]);

  return (
    <div className="section__padding">
      <div className="listing-container">
        <div className="listing-title">
          <h1>Live Auctions</h1>
        </div>
        <div>
          {auctionsList.length !== 0 ? (
            auctionsList.map((auction, index) => {
              return (
                <div className="auction-slider-box" key={index}>
                  <div className="auction-slider-box-left">
                    <h2>{auction.name}</h2>
                    <div className="auction-slider-seller">
                      <div className="auction-slider-seller-profile">
                        <img
                          className="auction-slider-seller-img"
                          src={auction.sellerImg}
                          alt="profile image"
                        />
                        <div className="auction-slider-seller-info">
                          <p>Seller</p>
                          <br />
                          <h4>{auction.sellerName} </h4>
                        </div>
                      </div>
                      <div className="auction_slider_box_right_box_like">
                        <AiFillHeart />
                        <span>{auction.like}</span>
                      </div>
                    </div>
                    <div className="auction-slider-box-left-bidding">
                      <div className="auction-slider-bidding-box">
                        <small>Current Bid</small>
                        <p>
                          {auction.price}{" "}
                          {
                            getTokenFromAddress(
                              wallet.network,
                              auction.paymentToken
                            ).symbol
                          }{" "}
                          <span>$221,21</span>
                        </p>
                      </div>

                      <p className="auction-slider-bidding-info">
                        <MdTimer className="auction-slider-bidding-icon" />
                        <span>Auction ending in</span>
                      </p>

                      <div className="auction-slider-bidding-timer">
                        <div className="auction-slider-timer-item">
                          <p>{auction.time.days}</p>
                          <span>Days</span>
                        </div>

                        <div className="auction-slider-timer-item">
                          <p>{auction.time.hours}</p>
                          <span>Hours</span>
                        </div>

                        <div className="auction-slider-timer-item">
                          <p>{auction.time.minutes}</p>
                          <span>mins</span>
                        </div>

                        <div className="auction-slider-timer-item">
                          <p>{auction.time.seconds}</p>
                          <span>secs</span>
                        </div>
                      </div>

                      <div className="auction-slider-btn">
                        <Button btnName="Bid" />
                        <Button btnName="See More" />
                      </div>
                    </div>
                    <div className="auction-slider-button">
                      <TbArrowBigLeftLines
                        className="auction-slider-button-icon"
                        onClick={() => dec()}
                      />
                      <TbArrowBigRightLine
                        className="auction-slider-button-icon"
                        onClick={() => inc()}
                      />
                    </div>
                  </div>
                  <div className="auction-slider-box-right">
                    <div className="auction-slider_box_right_box">
                      <img
                        className="auction_slider_box_right_box_img"
                        src={auction.uri}
                        alt="NFT IMAGE"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="listing-text">
              <p>No live auction for the moment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuctionSlider;
