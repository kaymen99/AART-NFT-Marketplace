import React, { useState, useEffect } from "react";
import { Listing, Paginator, SearchBar } from "../components";
import { useSelector } from "react-redux";
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

const AuctionListing = () => {
  const wallet = useSelector((state) => state.blockchain.value);
  const [auctionsList, setAuctionsList] = useState([]);
  const [displayed, setDisplayed] = useState({
    from: 0,
    to: 0,
  });

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
            return {
              id: index,
              tokenId: tokenId,
              name: metadata.data.name,
              uri: metadata.data.image.replace("ipfs://", IPFS_GATEWAY),
              price: Number(auction.highestBid),
              path: "/auction-page",
            };
          }
        })
      );
      setAuctionsList(activeAuctions);
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

  return (
    <>
      <div className="section__padding">
        <div className="listing-container">
          <div className="listing-title">
            <h1>Auction Market</h1>
          </div>
          {auctionsList.length !== 0 ? (
            <>
              <SearchBar />
              <Listing
                items={auctionsList.slice(displayed.from, displayed.to)}
              />
              <Paginator
                itemsLength={auctionsList.length}
                setShownItems={setDisplayed}
              />
            </>
          ) : (
            <div className="listing-text">
              <p>No live auction for the moment</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AuctionListing;
