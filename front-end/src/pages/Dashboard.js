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
import { formatTokenAmount } from "../utils/tokens-utils";

const Dashboard = () => {
  const wallet = useSelector((state) => state.userData.value);
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
      const _userNfts = await Promise.all(
        ownedNfts.map(async (token) => {
          const _metadata = await axios.get(
            token.uri.replace("ipfs://", IPFS_GATEWAY)
          );
          return {
            tokenId: Number(token.id),
            name: _metadata.data.name,
            uri: _metadata.data.image.replace("ipfs://", IPFS_GATEWAY),
          };
        })
      );
      setUserNftsList(_userNfts);

      const nftsInSale = (await market_contract.getListings()).filter(
        (s) => s.seller === wallet.account
      );
      const nftsInAuction = (await market_contract.getAuctions()).filter(
        (a) => a.seller === wallet.account
      );

      const activeAuctions = await Promise.all(
        nftsInAuction.map(async (auction, index) => {
          const currentStaus = await market_contract.getAuctionStatus(index);
          if (currentStaus === 0) {
            const tokenId = Number(auction.tokenId);
            const tokenUri = await nft_contract.tokenURI(tokenId);
            const metadata = await axios.get(
              tokenUri.replace("ipfs://", IPFS_GATEWAY)
            );
            const price =
              Number(auction.highestBid) === 0
                ? Number(auction.startPrice)
                : Number(auction.highestBid);

            return {
              id: index,
              tokenId: tokenId,
              name: metadata.data.name,
              uri: metadata.data.image.replace("ipfs://", IPFS_GATEWAY),
              price: formatTokenAmount(
                wallet.network,
                auction.paymentToken,
                price
              ),
              path: `/auction-page`,
            };
          }
        })
      );
      const filteredAuctions = activeAuctions.filter(
        (auction) => auction !== undefined
      );
      const sellingNfts = filteredAuctions.concat(nftsInSale);
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
      if (wallet.registred) {
        const nftsList = await nft_contract.getAllNfts();
        const items = await Promise.all(
          nftsList.map(async (token) => {
            const tokenUri = token.uri;
            const _metadata = await axios.get(
              tokenUri.replace("ipfs://", IPFS_GATEWAY)
            );
            if (_metadata.data.creator === wallet.account) {
              console.log({
                tokenId: Number(token.id),
                name: _metadata.data.name,
                uri: _metadata.data.image.replace("ipfs://", IPFS_GATEWAY),
              });
              return {
                tokenId: Number(token.id),
                name: _metadata.data.name,
                uri: _metadata.data.image.replace("ipfs://", IPFS_GATEWAY),
              };
            }
          })
        );
        setCreatedNftsList(items);
      } else {
        setCreatedNftsList([]);
      }
    }
  };

  useEffect(() => {
    const get = async () => {
      if (window.ethereum !== undefined) {
        await getUserTokens();
        await getCreatedNfts();
      }
    };
    get();
  }, [wallet.account]);

  return (
    <div className="section__padding">
      <div className="dashboard">
        <h1 className="dashboard-title">Your Dashboard</h1>
        <div className="dashboard-container">
          <Tabs forceRenderTabPanel defaultIndex={0}>
            <TabList>
              <Tab>My Nfts</Tab>
              <Tab>In sale</Tab>
              <Tab>Created</Tab>
            </TabList>
            <TabPanel>
              {userNftsList.length !== 0 ? (
                <>
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
                </>
              ) : (
                <div className="listing-text">
                  <p>You don't own AART tokens</p>
                </div>
              )}
            </TabPanel>
            <TabPanel>
              {inSaleList.length !== 0 ? (
                <>
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
                </>
              ) : (
                <div className="listing-text">
                  <p>No item in sale yet</p>
                </div>
              )}
            </TabPanel>
            <TabPanel>
              {createdNftsList.length !== 0 ? (
                <>
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
                </>
              ) : (
                <div className="listing-text">
                  <p>You didn't create any NFT yet</p>
                </div>
              )}
            </TabPanel>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
