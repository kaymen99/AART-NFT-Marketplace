import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.css";
import { useDispatch, useSelector } from "react-redux";
import { updateAccountData, disconnect } from "../../features/blockchain";
import { ethers, utils } from "ethers";
import Web3Modal from "web3modal";

import Account from "./Account";
import images from "../../assets/images";
import networks from "../../utils/networksMap.json";
import useComponentVisible from "../../hooks/visible";

const eth = window.ethereum;
let web3Modal = new Web3Modal();

function Connect() {
  const dispatch = useDispatch();
  const data = useSelector((state) => state.blockchain.value);

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
    if (typeof window.ethereum !== "undefined") {
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);

      setInjectedProvider(provider);

      const signer = provider.getSigner();
      const chainId = await provider.getNetwork();
      const account = await signer.getAddress();
      const balance = await signer.getBalance();

      dispatch(
        updateAccountData({
          account: account,
          balance: utils.formatUnits(balance),
          network: networks[String(chainId.chainId)],
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

  const isConnected = data.account !== "";

  return (
    <>
      {isConnected ? (
        <>
          <div className="navbar-container-account-box">
            <div className="navbar-container-account" ref={ref}>
              <img
                className="navbar-container-account"
                src={images.user}
                alt="Profile"
                width="40px"
                height="40px"
                onClick={() => handleClick()}
              />

              {profile && isComponentVisible && (
                <Account
                  currentAccount={data.account}
                  disconnect={Disconnect}
                />
              )}
            </div>
          </div>
        </>
      ) : (
        <button className="connect-btn" onClick={fetchAccountData}>
          Connect Wallet
        </button>
      )}
    </>
  );
}

export default Connect;
