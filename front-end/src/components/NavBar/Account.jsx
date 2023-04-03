import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { FaUserAlt, FaRegImage, FaUserEdit } from "react-icons/fa";
import { MdLogout } from "react-icons/md";
import { ethers } from "ethers";
import axios from "axios";

import artistsContract from "../../artifacts/AARTArtists.sol/AARTArtists.json";
import { IPFS_GATEWAY } from "../../utils/ipfsStorage";
import {
  artistsContractAddress,
  networkDeployedTo,
} from "../../utils/contracts-config";
import networksMap from "../../utils/networksMap.json";

const Account = ({ disconnect }) => {
  const wallet = useSelector((state) => state.blockchain.value);
  const [user, setUser] = useState({
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

      const hasProfile = await artists_contract.hasProfile(wallet.account);
      let userData;
      if (hasProfile) {
        const userProfile = await artists_contract.getUserProfile(
          wallet.account
        );

        const _metadata = await axios.get(
          userProfile[1].replace("ipfs://", IPFS_GATEWAY)
        );

        userData = {
          username: _metadata.data.username,
          imageUri: _metadata.data.imageUri.replace("ipfs://", IPFS_GATEWAY),
        };
        setUser(userData);
      }
    }
  };

  useEffect(() => {
    const get = async () => {
      if (window.ethereum !== undefined) {
        await getUserProfile();
      }
    };
    get();
  }, []);
  return (
    <div className="account">
      <div className="account-box">
        <img
          src={user.imageUri}
          width="40px"
          height="40px"
          alt="user account"
          className="account-img"
        />
        <div className="account-info">
          <p>{user.username}</p>
          <small>{wallet.account.slice(0, 18)}..</small>
        </div>
      </div>

      <div className="account-menu">
        <div className="account-menu-item">
          <FaUserAlt />
          <a href="/profile">My Profile</a>
        </div>
        <div className="account-menu-item">
          <FaRegImage />
          <a href="/author">My Items</a>
        </div>
        <div className="account-menu-item">
          <FaUserEdit />
          <a href="/account">Edit Profile</a>
        </div>
        <div className="account-menu-item" onClick={disconnect}>
          <MdLogout />
          <a>Disconnect</a>
        </div>
      </div>
    </div>
  );
};

export default Account;
