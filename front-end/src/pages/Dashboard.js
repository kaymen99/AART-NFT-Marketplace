// import "react-tabs/style/react-tabs.css";
// import "./../assets/styles/pages/dashboard.css";

// import Listing from "../components/Listing";
// import Paginator from "../components/Paginator";

// import React, { useState, useEffect } from "react";
// import { NavBar } from "../components/NavBar";
// import { useNavigate } from "react-router-dom";
// import { useSelector } from "react-redux";
// import { ethers } from "ethers";
// import { Form } from "react-bootstrap";
// import { CircularProgress } from "@mui/material";
// import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
// import axios from "axios";
// import { IPFS_GATEWAY } from "../utils/ipfsStorage";
// import marketContract from "../artifacts/AARTMarket.sol/AARTMarket.json";
// import nftContract from "../artifacts/AARTCollection.sol/AARTCollection.json";
// import {
//   marketContractAddress,
//   nftContractAddress,
//   networkDeployedTo,
// } from "../utils/contracts-config";
// import networksMap from "../utils/networksMap.json";

// const Dashboard = () => {
//   let navigate = useNavigate();
//   const wallet = useSelector((state) => state.blockchain.value);
//   const [auctionsList, setAuctionsList] = useState([]);

//   const getUserTokens = async () => {
//     if (wallet.network === networksMap[networkDeployedTo]) {
//       const provider = new ethers.providers.Web3Provider(
//         window.ethereum,
//         "any"
//       );
//       const market_contract = new ethers.Contract(
//         marketContractAddress,
//         marketContract.abi,
//         provider
//       );

//       const nft_contract = new ethers.Contract(
//         nftContractAddress,
//         nftContract.abi,
//         provider
//       );

//       const ownedNfts = await nft_contract.getUserNfts(wallet.account);

//       const nftsInSale = (await market_contract.getListings()).filter(
//         (s) => s[0] === wallet.account
//       );
//       const nftsInAuction = (await market_contract.getAuctions()).filter(
//         (a) => a[0] === wallet.account
//       );
//       const sellingNfts = nftsInAuction.concat(nftsInSale);

//       const activeAuctions = await Promise.all(
//         auctions.map(async (auction, index) => {
//           if (auction.status === 0) {
//             const tokenId = Number(auction.tokenId);
//             const tokenUri = await nft_contract.tokenURI(tokenId);
//             const metadata = await axios.get(
//               tokenUri.replace("ipfs://", IPFS_GATEWAY) +
//                 "/" +
//                 tokenId.toString() +
//                 ".json"
//             );
//             return {
//               auctionId: index,
//               tokenId: auction.tokenId,
//               name: metadata.data.name,
//               uri: metadata.data.image.replace("ipfs://", IPFS_GATEWAY),
//               price: auction.highestBid,
//             };
//           }
//         })
//       );
//       setAuctionsList(activeAuctions);
//     }
//   };

//   useEffect(async () => {
//     if (window.ethereum !== undefined) {
//       await getAuctionsList();
//     }
//   }, []);

//   return (
//     <>
//       <NavBar />
//       <br />
//       <div className="dashboard">
//         <h1 className="text-center">Your Dashboard</h1>
//         <div className="dashboard-container">
//           <Tabs forceRenderTabPanel defaultIndex={1}>
//             <TabList>
//               <Tab>Owned</Tab>
//               <Tab>Created</Tab>
//               <Tab>Buying</Tab>
//             </TabList>
//             <TabPanel>
//               <div className="dashboard-items">
//                 <Listing items={sales} />
//               </div>

//               <Paginator items={items} setItems={setSales} />
//             </TabPanel>
//             <TabPanel>
//               <div className="dashboard-items">
//                 <Listing items={sales} />
//               </div>

//               <Paginator items={items} setItems={setSales} />
//             </TabPanel>
//             <TabPanel>
//               <div className="dashboard-items">
//                 <Listing items={sales} />
//               </div>

//               <Paginator items={items} setItems={setSales} />
//             </TabPanel>
//           </Tabs>
//         </div>
//       </div>
//     </>
//   );
// };

// export default Dashboard;
