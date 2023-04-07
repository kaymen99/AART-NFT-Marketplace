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
import images from "../assets/images";


const SaleListing = () => {
  const wallet = useSelector((state) => state.blockchain.value);
  const [salesList, setSalesList] = useState([]);
  const [displayed, setDisplayed] = useState({
    from: 0,
    to: 0,
  });

  const getSalesList = async () => {
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

      const sales = await market_contract.getListings();

      const activeSales = await Promise.all(
        sales.map(async (sale, index) => {
          if (sale.status === 0) {
            const tokenId = Number(sale.tokenId);
            const tokenUri = await nft_contract.tokenURI(tokenId);
            const metadata = await axios.get(
              tokenUri.replace("ipfs://", IPFS_GATEWAY)
            );
            return {
              id: index,
              tokenId: tokenId,
              name: metadata.data.name,
              uri: metadata.data.image.replace("ipfs://", IPFS_GATEWAY),
              price: Number(sale.buyPrice),
              path: "/sale-page",
            };
          }
        })
      );
      setSalesList(activeSales);
    }
  };

  useEffect(() => {
    const get = async () => {
      if (window.ethereum !== undefined) {
        await getSalesList();
      }
    };
    get();
  }, []);

  return (
    <>
      <div className="section__padding">
        <div className="listing-container">
          <div className="listing-title">
            <h1>Sales Market</h1>
          </div>
          {salesList.length !== 0 ? (
            <>
              <SearchBar />
              <Listing items={salesList.slice(displayed.from, displayed.to)} />
              <Paginator
                itemsLength={salesList.length}
                setShownItems={setDisplayed}
              />
            </>
          ) : (
            <div className="listing-text">
              <p>No item listed yet</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SaleListing;
