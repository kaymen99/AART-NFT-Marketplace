import React, { useState, useEffect } from "react";
import "../assets/styles/pages/profilePage.css";
import images from "../assets/images";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ethers } from "ethers";
import axios from "axios";
import { Listing1, Paginator } from "../components";

import nftContract from "../artifacts/AARTCollection.sol/AARTCollection.json";
import artistsContract from "../artifacts/AARTArtists.sol/AARTArtists.json";
import { IPFS_GATEWAY } from "../utils/ipfsStorage";
import networksMap from "../utils/networksMap.json";
import {
  artistsContractAddress,
  nftContractAddress,
  networkDeployedTo,
} from "../utils/contracts-config";

const CreatorPage = () => {
  let navigate = useNavigate();
  const { creator } = useParams();
  const wallet = useSelector((state) => state.blockchain.value);

  const [nfts, setNfts] = useState([]);
  const [displayed, setDisplayed] = useState({
    from: 0,
    to: 0,
  });

  const [profile, setProfile] = useState({
    username: "",
    imageUri: "",
  });

  const getUserProfile = async () => {
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

      const _hasProfile = await artists_contract.hasProfile(creator);
      if (_hasProfile) {
        const userProfile = await artists_contract.getUserProfile(creator);
        const _metadata = await axios.get(
          userProfile[1].replace("ipfs://", IPFS_GATEWAY)
        );
        setProfile({
          username: _metadata.data.username,
          imageUri: _metadata.data.imageUri.replace("ipfs://", IPFS_GATEWAY),
        });
      } else {
        navigate("/register");
      }
    }
  };

  const getCreatorNfts = async () => {
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
          if (_metadata.data.creator === creator) {
            return {
              tokenId: Number(token.id),
              name: _metadata.data.name,
              uri: _metadata.data.image.replace("ipfs://", IPFS_GATEWAY),
            };
          }
        })
      );

      setNfts(items);
    }
  };

  useEffect(() => {
    const get = async () => {
      if (window.ethereum !== undefined) {
        await getUserProfile();
        await getCreatorNfts();
      }
    };
    get();
  }, []);

  return (
    <div className="profile">
      <div className="profile-top">
        <div className="profile-banner">
          <img src={images.profile_banner} alt="banner" />
        </div>
        <div className="profile-pic">
          <img src={profile.imageUri} alt="profile" />
          <h3>{profile.username}</h3>
        </div>
      </div>

      <div className="listing-container">
        {nfts.length !== 0 ? (
          <>
            <Listing1 items={nfts.slice(displayed.from, displayed.to)} />
            <Paginator itemsLength={nfts.length} setShownItems={setDisplayed} />
          </>
        ) : (
          <div className="listing-text">
            <p>No item created yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorPage;
