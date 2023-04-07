import React, { useState, useEffect } from "react";
import { Listing1, Paginator, SearchBar } from "../components";
import { useSelector } from "react-redux";
import { ethers } from "ethers";
import axios from "axios";
import { IPFS_GATEWAY } from "../utils/ipfsStorage";
import nftContract from "../artifacts/AARTCollection.sol/AARTCollection.json";
import {
  nftContractAddress,
  networkDeployedTo,
} from "../utils/contracts-config";
import networksMap from "../utils/networksMap.json";

const CollectionPage = () => {
  const wallet = useSelector((state) => state.blockchain.value);
  const [nftsList, setNftsList] = useState([]);
  const [displayed, setDisplayed] = useState({
    from: 0,
    to: 0,
  });

  const getNftsList = async () => {
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

      const nfts = await nft_contract.getAllNfts();
      const allNfts = await Promise.all(
        nfts.map(async (nft, index) => {
          const tokenId = Number(nft.id);
          const tokenUri = nft.uri;
          const metadata = await axios.get(
            tokenUri.replace("ipfs://", IPFS_GATEWAY)
          );
          return {
            tokenId: tokenId,
            name: metadata.data.name,
            uri: metadata.data.image.replace("ipfs://", IPFS_GATEWAY),
            path: "/nft-page",
          };
        })
      );
      setNftsList(allNfts);
    }
  };

  useEffect(() => {
    const get = async () => {
      if (window.ethereum !== undefined) {
        await getNftsList();
      }
    };
    get();
  }, []);

  return (
    <>
      <div className="section__padding">
        <div className="listing-container">
          <div className="listing-title">
            <h1>AART Collection</h1>
          </div>
          {nftsList.length !== 0 ? (
            <>
              <SearchBar />
              <Listing1 items={nftsList.slice(displayed.from, displayed.to)} />
              <Paginator
                itemsLength={nftsList.length}
                setShownItems={setDisplayed}
              />
            </>
          ) : (
            <div className="listing-text">
              <p>No item created yet</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CollectionPage;
