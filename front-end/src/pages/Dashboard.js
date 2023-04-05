import "react-tabs/style/react-tabs.css";
import "./../assets/styles/pages/dashboard.css";

import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { ethers } from "ethers";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
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
import { Listing1, Listing, Paginator } from "../components";

const Dashboard = () => {
  const wallet = useSelector((state) => state.blockchain.value);
  const [userNftsList, setUserNftsList] = useState([]);
  const [inSaleList, setInSaleList] = useState([]);
  const [createdNftsList, setCreatedNftsList] = useState([]);

  const [displayedUserNfts, setDisplayedUserNfts] = useState({
    from: 0,
    to: 0,
  });
  const [displayedInSale, setDisplayedInSale] = useState({ from: 0, to: 0 });
  const [displayedCreatedNfts, setDisplayedCreatedNfts] = useState({
    from: 0,
    to: 0,
  });

  const getUserTokens = async () => {
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

      const ownedNfts = await nft_contract.getUserNfts(wallet.account);
      setUserNftsList(ownedNfts);

      const nftsInSale = (await market_contract.getListings()).filter(
        (s) => s[0] === wallet.account
      );
      const nftsInAuction = (await market_contract.getAuctions()).filter(
        (a) => a[0] === wallet.account
      );

      const activeAuctions = await Promise.all(
        nftsInAuction.map(async (auction, index) => {
          if (auction.status === 0) {
            const tokenId = Number(auction.tokenId);
            const tokenUri = await nft_contract.tokenURI(tokenId);
            const metadata = await axios.get(
              tokenUri.replace("ipfs://", IPFS_GATEWAY)
            );
            return {
              auctionId: index,
              tokenId: auction.tokenId,
              name: metadata.data.name,
              uri: metadata.data.image.replace("ipfs://", IPFS_GATEWAY),
              price: auction.highestBid,
            };
          }
        })
      );
      const sellingNfts = activeAuctions.concat(nftsInSale);
      setInSaleList(sellingNfts);
    }
  };

  const getCreatedNfts = async () => {
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

      const nftsList = await nft_contract.getAllNfts();

      const items = await Promise.all(
        nftsList.map(async (token) => {
          const tokenUri = token.uri;
          const _metadata = await axios.get(
            tokenUri.replace("ipfs://", IPFS_GATEWAY)
          );
          if (_metadata.data.creator === wallet.account) {
            return {
              tokenId: Number(token.id),
              name: _metadata.data.name,
              uri: _metadata.data.image.replace("ipfs://", IPFS_GATEWAY),
              path: "/nft-page",
            };
          }
        })
      );

      setCreatedNftsList(items);
    }
  };

  useEffect(async () => {
    const get = async () => {
      if (window.ethereum !== undefined) {
        await getUserTokens();
        await getCreatedNfts();
      }
    };
    get();
  }, []);

  return (
    <div className="section__padding">
      <div className="dashboard">
        <h1 className="dashboard-title">Your Dashboard</h1>
        <div className="dashboard-container">
          <Tabs forceRenderTabPanel defaultIndex={1}>
            <TabList>
              <Tab>My Nfts</Tab>
              <Tab>In sale</Tab>
              <Tab>Created</Tab>
            </TabList>
            <TabPanel>
              <Listing1
                items={userNftsList.slice(
                  displayedUserNfts.from,
                  displayedUserNfts.to
                )}
              />
              <Paginator
                itemsLength={userNftsList.length}
                setShownItems={setDisplayedUserNfts}
              />
            </TabPanel>
            <TabPanel>
              <div className="dashboard-items">
                <Listing
                  items={inSaleList.slice(
                    displayedInSale.from,
                    displayedInSale.to
                  )}
                />
              </div>
              <Paginator
                itemsLength={inSaleList.length}
                setShownItems={setDisplayedInSale}
              />
            </TabPanel>
            <TabPanel>
              <div className="dashboard-items">
                <Listing1
                  items={createdNftsList.slice(
                    displayedCreatedNfts.from,
                    displayedCreatedNfts.to
                  )}
                />
              </div>
              <Paginator
                itemsLength={createdNftsList.length}
                setShownItems={setDisplayedCreatedNfts}
              />
            </TabPanel>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
