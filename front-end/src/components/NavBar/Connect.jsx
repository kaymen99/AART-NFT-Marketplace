import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.css";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { updateUserData, disconnect } from "../../features/userData";
import { ethers, utils } from "ethers";
import Web3Modal from "web3modal";
import axios from "axios";
import Account from "./Account";
import networks from "../../utils/networksMap.json";
import useComponentVisible from "../../hooks/visible";
import Button from "../Button";
import artistsContract from "../../artifacts/AARTArtists.sol/AARTArtists.json";
import { IPFS_GATEWAY } from "../../utils/ipfsStorage";
import {
  artistsContractAddress,
  networkDeployedTo,
} from "../../utils/contracts-config";
import { defaultProfileImg } from "../../utils/helpers";

const eth = window.ethereum;
let web3Modal = new Web3Modal();

function Connect() {
  let navigate = useNavigate();
  const dispatch = useDispatch();
  const wallet = useSelector((state) => state.userData.value);

  const [injectedProvider, setInjectedProvider] = useState();
  const [profile, setProfile] = useState(false);

  const handleClick = () => {
    if (!profile) {
      setProfile(true);
    } else {
      setProfile(false);
    }
    setIsComponentVisible(true);
  };

  const { ref, isComponentVisible, setIsComponentVisible } =
    useComponentVisible(true, setProfile);

  async function fetchAccountData() {
    let username, profileImg, registred;
    registred = false;
    username = "Jane Doe";
    profileImg = defaultProfileImg;
    if (typeof window.ethereum !== "undefined") {
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);

      setInjectedProvider(provider);

      const signer = provider.getSigner();
      const chainId = await provider.getNetwork();
      const account = await signer.getAddress();
      const balance = await signer.getBalance();

      if (networks[String(chainId.chainId)] === networks[networkDeployedTo]) {
        const artists_contract = new ethers.Contract(
          artistsContractAddress,
          artistsContract.abi,
          provider
        );
        const hasProfile = await artists_contract.hasProfile(account);
        if (hasProfile) {
          const userProfile = await artists_contract.getUserProfile(account);
          const _metadata = await axios.get(
            userProfile[1].replace("ipfs://", IPFS_GATEWAY)
          );

          registred = true;
          username = _metadata.data.username;
          profileImg = _metadata.data.imageUri.replace("ipfs://", IPFS_GATEWAY);
        }
      }

      dispatch(
        updateUserData({
          account: account,
          balance: utils.formatUnits(balance),
          network: networks[String(chainId.chainId)],
          registred: registred,
          username: username,
          profileImg: profileImg,
        })
      );
    } else {
      console.log("Please install metamask");
      window.alert("Please Install Metamask");
    }
  }

  async function Disconnect() {
    web3Modal.clearCachedProvider();
    if (
      injectedProvider &&
      injectedProvider.provider &&
      typeof injectedProvider.provider.disconnect == "function"
    ) {
      await injectedProvider.provider.disconnect();
      setInjectedProvider(null);
    }
    dispatch(disconnect());
    navigate("/");
  }

  useEffect(() => {
    if (eth) {
      web3Modal.clearCachedProvider();
      eth.on("chainChanged", (chainId) => {
        fetchAccountData();
      });
      eth.on("accountsChanged", (accounts) => {
        fetchAccountData();
      });
    }
  }, []);

  const isConnected = wallet.account !== "";

  return (
    <>
      {isConnected ? (
        <>
          <div className="navbar-container-account-box">
            <div className="navbar-container-account" ref={ref}>
              <img
                className="navbar-container-account"
                src={wallet.profileImg}
                alt="Profile"
                width="40px"
                height="40px"
                onClick={() => handleClick()}
              />

              {profile && isComponentVisible && (
                <Account
                  currentAccount={wallet.account}
                  disconnect={Disconnect}
                />
              )}
            </div>
          </div>
        </>
      ) : (
        <Button btnName="Connect Wallet" handleClick={fetchAccountData} />
      )}
    </>
  );
}

export default Connect;
