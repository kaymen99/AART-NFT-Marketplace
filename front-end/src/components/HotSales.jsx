import React, { useState, useEffect } from "react";
import "./../assets/styles/components/Listing.css";
import Listing from "../components/Listing";

import { useSelector } from "react-redux";
import { ethers } from "ethers";
import axios from "axios";
import { IPFS_GATEWAY } from "../utils/ipfsStorage";
import images from "../assets/images";
import marketContract from "../artifacts/AARTMarket.sol/AARTMarket.json";
import nftContract from "../artifacts/AARTCollection.sol/AARTCollection.json";
import {
  marketContractAddress,
  nftContractAddress,
  networkDeployedTo,
} from "../utils/contracts-config";
import networksMap from "../utils/networksMap.json";

const nft_items = [
  {
    name: "My Test NFT",
    uri: images.nft1,
    price: 90,
  },
  {
    name: "My Test NFT 2",
    uri: images.nft2,
    price: 980,
  },
  {
    name: "My Test NFT 3",
    uri: images.nft3,
    price: 70,
  },
  {
    name: "My Test NFT 4",
    uri: images.nft4,
    price: 1000,
  },
  {
    name: "My Test NFT",
    uri: images.nft1,
    price: 90,
  },
  {
    name: "My Test NFT 2",
    uri: images.nft2,
    price: 980,
  },
  {
    name: "My Test NFT 3",
    uri: images.nft3,
    price: 70,
  },
  {
    name: "My Test NFT 4",
    uri: images.nft4,
    price: 1000,
  },
];

const HotSales = () => {
  const wallet = useSelector((state) => state.blockchain.value);
  const [sales, setSales] = useState([]);

  const getHotSalesList = async () => {
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

      const listings = await market_contract.getListings();
      const hottestBids = listings;

      const _sales = await Promise.all(
        hottestBids.map(async (item, index) => {
          const tokenUri = await nft_contract.tokenURI(item.tokenId);
          const metadata = await axios.get(
            tokenUri.replace("ipfs://", IPFS_GATEWAY)
          );

          return {
            id: index,
            tokenId: Number(item.tokenId),
            name: metadata.data.name,
            uri: metadata.data.image.replace("ipfs://", IPFS_GATEWAY),
            price: Number(item.buyPrice),
            path: "/sale-page",
          };
        })
      );
      setSales(_sales);
    }
  };

  useEffect(() => {
    const get = async () => {
      await getHotSalesList();
    };
    get();
  }, []);

  return (
    <div className="section__padding">
      <div className="listing-container">
        <div className="listing-title">
          <h1>Hot Bids</h1>
        </div>
        {sales.length === 0 ? (
          <>
            <Listing items={nft_items} />
            <div className="load-more">
              <a href="/sales">
                <button>See more</button>
              </a>
            </div>
          </>
        ) : (
          <div className="listing-text">
            <p>No Items listed in the market yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HotSales;
