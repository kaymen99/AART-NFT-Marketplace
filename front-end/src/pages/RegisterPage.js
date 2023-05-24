import "../assets/styles/pages/registerPage.css";
import React, { useState, useEffect } from "react";
import { CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ethers } from "ethers";
import axios from "axios";
import { saveContent, IPFS_GATEWAY } from "../utils/ipfsStorage";
import artistsContract from "../artifacts/AARTArtists.sol/AARTArtists.json";
import {
  artistsContractAddress,
  networkDeployedTo,
} from "../utils/contracts-config";
import networksMap from "../utils/networksMap.json";
import images from "../assets/images";

const RegisterPage = () => {
  let navigate = useNavigate();
  const wallet = useSelector((state) => state.userData.value);

  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState({
    name: "",
    image: null,
    edited: false,
  });
  const [formInput, setFormInput] = useState({
    username: "",
    description: "",
  });

  const [profile, setProfile] = useState({
    tokenId: 0,
    username: "",
    description: "",
    imageUri:
      "https://thumbs.dreamstime.com/b/profile-icon-black-background-graphic-web-design-modern-simple-vector-sign-internet-concept-trendy-symbol-profile-138113075.jpg",
    hasProfile: false,
  });

  const getImage = async (e) => {
    e.preventDefault();
    const file = e.target.files[0];

    setImage({
      name: file.name,
      image: file,
      edited: true,
    });
  };

  const getUserProfile = async () => {
    if (wallet.network === networksMap[networkDeployedTo]) {
      reset();
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
      if (hasProfile) {
        const userProfile = await artists_contract.getUserProfile(
          wallet.account
        );
        const _metadata = await axios.get(
          userProfile[1].replace("ipfs://", IPFS_GATEWAY)
        );

        setProfile({
          tokenId: Number(userProfile[0]),
          username: _metadata.data.username,
          description: _metadata.data.description,
          imageUri: _metadata.data.imageUri.replace("ipfs://", IPFS_GATEWAY),
          hasProfile: true,
        });
      }
    }
  };

  const register = async () => {
    if (wallet.network === networksMap[networkDeployedTo]) {
      try {
        setLoading(true);
        const provider = new ethers.providers.Web3Provider(
          window.ethereum,
          "any"
        );
        const signer = provider.getSigner();
        const artists_contract = new ethers.Contract(
          artistsContractAddress,
          artistsContract.abi,
          signer
        );

        let cid = await saveContent(image.image);
        const imageUri = `ipfs://${cid}/${image.name}`;

        const metadata = {
          username: formInput.username,
          description: formInput.description,
          imageUri: imageUri,
        };
        const data = JSON.stringify(metadata);

        let tokenId = await artists_contract.callStatic.create("test-uri");

        const metadataCid = await saveContent(
          new File([data], `AART-Artist-${Number(tokenId)}.json`)
        );
        const metadataIpfsHash = `ipfs://${metadataCid}/AART-Artist-${Number(
          tokenId
        )}.json`;

        const register_tx = await artists_contract.create(metadataIpfsHash);
        await register_tx.wait();

        setLoading(false);
        navigate("/");
      } catch (error) {
        setLoading(false);
        console.log(error);
        window.alert("An error has occured, please try again");
      }
    } else {
      window.alert(
        `Please connect with Metamask to ${networksMap[networkDeployedTo]} network`
      );
    }
  };

  const edit = async () => {
    if (
      wallet.network === networksMap[networkDeployedTo] &&
      profile.hasProfile
    ) {
      try {
        setLoading(true);
        const provider = new ethers.providers.Web3Provider(
          window.ethereum,
          "any"
        );
        const signer = provider.getSigner();
        const artists_contract = new ethers.Contract(
          artistsContractAddress,
          artistsContract.abi,
          signer
        );

        if (
          image.image === null &&
          formInput.username === "" &&
          formInput.description === ""
        )
          return;

        let newUsername;
        let newDescription;
        let newImageUri;
        if (image.image !== null) {
          let cid = await saveContent(image.image);
          newImageUri = `ipfs://${cid}/${image.name}`;
        } else {
          newImageUri = profile.imageUri;
        }

        if (formInput.username !== "") {
          newUsername = formInput.username;
        } else {
          newUsername = profile.username;
        }

        if (formInput.description !== "") {
          newDescription = formInput.description;
        } else {
          newDescription = profile.description;
        }

        const metadata = {
          username: newUsername,
          description: newDescription,
          imageUri: newImageUri,
        };
        const data = JSON.stringify(metadata);

        const metadataCid = await saveContent(
          new File([data], `AART-Artist-${profile.tokenId}.json`)
        );
        const metadataIpfsHash = `ipfs://${metadataCid}/AART-Artist-${profile.tokenId}.json`;

        const edit_tx = await artists_contract.update(
          profile.tokenId,
          metadataIpfsHash
        );
        await edit_tx.wait();

        setLoading(false);
      } catch (error) {
        setLoading(false);
        console.log(error);
        window.alert("An error has occured, please try again");
      }
    } else {
      window.alert(
        `Please connect with Metamask to ${networksMap[networkDeployedTo]} network`
      );
    }
  };

  const remove = async () => {
    if (
      wallet.network === networksMap[networkDeployedTo] &&
      profile.hasProfile
    ) {
      try {
        setLoading(true);
        const provider = new ethers.providers.Web3Provider(
          window.ethereum,
          "any"
        );
        const signer = provider.getSigner();
        const artists_contract = new ethers.Contract(
          artistsContractAddress,
          artistsContract.abi,
          signer
        );

        const remove_tx = await artists_contract.burn(profile.tokenId);
        await remove_tx.wait();

        setLoading(false);
      } catch (error) {
        setLoading(false);
        console.log(error);
        window.alert("An error has occured, please try again");
      }
    } else {
      window.alert(
        `Please connect with Metamask to ${networksMap[networkDeployedTo]} network`
      );
    }
  };

  const reset = () => {
    setImage({
      name: "",
      image: null,
      edited: false,
    });
    setProfile({
      tokenId: 0,
      username: "",
      description: "",
      imageUri:
        "https://thumbs.dreamstime.com/b/profile-icon-black-background-graphic-web-design-modern-simple-vector-sign-internet-concept-trendy-symbol-profile-138113075.jpg",
      hasProfile: false,
    });
  };

  useEffect(() => {
    const get = async () => {
      await getUserProfile();
    };
    get();
  }, [wallet.account]);

  return (
    <>
      <div className="register">
        <div className="profile-image">
          <div className="profile-image-box">
            <img
              src={
                !image.edited
                  ? profile.imageUri
                  : URL.createObjectURL(image.image)
              }
              alt="profile"
            />
            <div className="middle">
              <input
                type="file"
                name="file"
                id="actual-btn"
                hidden
                onChange={(e) => {
                  getImage(e);
                }}
              />
              <label className="text" htmlFor="actual-btn">
                Upload
              </label>
            </div>
          </div>
        </div>
        <div className="profile-content">
          <h1 className="profile-title">
            {profile.hasProfile ? "Edit Your profile" : "Create Your profile"}
          </h1>
          <form className="writeForm" autoComplete="off">
            <div className="formGroup">
              <label>Username</label>
              <input
                type="text"
                placeholder={
                  profile.username !== "" ? profile.username : "Your username"
                }
                autoFocus={true}
                onChange={(e) => {
                  setFormInput({ ...formInput, username: e.target.value });
                }}
              />
            </div>
            <div className="formGroup">
              <label>Description</label>
              <textarea
                type="text"
                rows={4}
                placeholder={
                  profile.description !== ""
                    ? profile.description
                    : "Your profile description"
                }
                onChange={(e) => {
                  setFormInput({ ...formInput, description: e.target.value });
                }}
              ></textarea>
            </div>
            <div className="mint-btn">
              {profile.hasProfile ? (
                <div>
                  <button
                    onClick={(event) => {
                      event.preventDefault();
                      edit();
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      "Edit"
                    )}
                  </button>
                  <button
                    onClick={(event) => {
                      event.preventDefault();
                      remove();
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      "Remove"
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={(event) => {
                    event.preventDefault();
                    register();
                  }}
                >
                  {loading ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    "Register"
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default RegisterPage;
