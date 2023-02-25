import "../assets/styles/pages/create.css";

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { CircularProgress } from "@mui/material";
import { ethers } from "ethers";
import { saveContent } from "../utils/ipfsStorage";
import nftContract from "../artifacts/AARTCollection.sol/AARTCollection.json";
import {
  nftContractAddress,
  networkDeployedTo,
} from "../utils/contracts-config";
import networksMap from "../utils/networksMap.json";

const CreateNFT = () => {
  let navigate = useNavigate();
  const wallet = useSelector((state) => state.blockchain.value);

  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState({
    name: "",
    image: null,
  });
  const [formInput, setFormInput] = useState({
    name: "",
    description: "",
    category: "",
  });

  const generateImage = async () => {};

  const create = async () => {
    if (wallet.network === networksMap[networkDeployedTo]) {
      try {
        setLoading(true);
        const provider = new ethers.providers.Web3Provider(
          window.ethereum,
          "any"
        );
        const signer = provider.getSigner();
        const nft_contract = new ethers.Contract(
          nftContractAddress,
          nftContract.abi,
          signer
        );

        const fee = await nft_contract.callStatic.mintFee();

        // await generateImage();

        let cid = await saveContent(image.image);
        const imageUri = `ipfs://${cid}/${image.name}`;

        const creator = await signer.getAddress();

        const metadata = {
          name: formInput.name,
          description: formInput.description,
          image: imageUri,
          creator: creator,
          category: formInput.category,
        };
        const data = JSON.stringify(metadata);

        let tokenId = await nft_contract.callStatic.mintNFT(
          wallet.account,
          "test-uri",
          {
            value: fee,
          }
        );

        const metadataCid = await saveContent(
          new File([data], `AART-${tokenId}.json`)
        );
        const metadataIpfsHash = `ipfs://${metadataCid}/AART-${tokenId}.json`;

        const add_tx = await nft_contract.mintNFT(creator, metadataIpfsHash, {
          value: fee,
        });
        await add_tx.wait();

        setLoading(false);
      } catch (err) {
        setLoading(false);
        console.log(err);
      }
    } else {
      window.alert(
        `Please Switch to the ${networksMap[networkDeployedTo]} network`
      );
    }
  };

  return (
    <>
      <div className="create section__padding">
        <div className="create-container">
          <h1>Create new Item</h1>
          <form className="writeForm" autoComplete="off">
            <div className="formGroup">
              <label>Name</label>
              <input
                type="text"
                placeholder="Item Name"
                autoFocus={true}
                onChange={(e) => {
                  setFormInput({ ...formInput, name: e.target.value });
                }}
              />
            </div>
            <div className="formGroup">
              <label>Description</label>
              <textarea
                type="text"
                rows={4}
                placeholder="Decription of your item"
                onChange={(e) => {
                  setFormInput({ ...formInput, description: e.target.value });
                }}
              ></textarea>
            </div>
            <div className="formGroup">
              <label>Category</label>
              <select
                onChange={(e) => {
                  setFormInput({ ...formInput, category: e.target.value });
                }}
              >
                <option>Art</option>
                <option>Photography</option>
                <option>Sports</option>
                <option>Collectibles</option>
                <option>Trading Cards</option>
                <option>Utility</option>
              </select>
            </div>
            <div className="formGroup">
              <label>Art Image Description</label>
              <textarea
                type="text"
                rows={4}
                placeholder="Enter the image description for the AI generator"
              ></textarea>
            </div>
            <div className="mint-btn">
              <button
                onClick={(event) => {
                  event.preventDefault();
                  create();
                }}
              >
                {loading ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  "Create Item"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default CreateNFT;
