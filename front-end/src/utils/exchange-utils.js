import axios from "axios";
import { ethers, utils } from "ethers";
import qs from "qs";

import ERC20 from "../artifacts/interfaces/IERC20.sol/IERC20.json";
import AARTCollection from "../artifacts/interfaces/IAARTCollection.sol/IAARTCollection.json";

const matic = "MATIC";
const apiPriceUrl = "https://polygon.api.0x.org/swap/v1/price?";
const apiQuoteUrl = "https://polygon.api.0x.org/swap/v1/quote?";

async function getAssetToAssetPrice(fromAsset, toAsset) {
  let response;

  const unit = utils.parseEther("1", "ether");
  const params = {
    sellToken: fromAsset,
    buyToken: toAsset,
    sellAmount: unit,
  };
  try {
    response = await axios.get(`${apiPriceUrl}${qs.stringify(params)}`);
  } catch (err) {
    console.error(err);
  }
  console.log("Default Quote");
  console.log("%O", response.data);
  console.log("%O", response.data.source);
}

async function getAssetsToMaticPrice(assets) {
  let response;

  const unit = utils.parseEther("1", "ether");

  const prices = await Promise.all(
    assets.map(async (asset, index) => {
      const params = {
        sellToken: asset,
        buyToken: matic,
        sellAmount: unit,
      };
      try {
        response = await axios.get(`${apiPriceUrl}${qs.stringify(params)}`);
      } catch (err) {
        console.error(err);
      }
      return {
        id: index,
        asset: asset,
        price: response,
      };
    })
  );
  return prices;
}

async function swap(fromAsset, toAsset, signer, amount) {
  const ethereum = window.ethereum;
  const params = {
    sellToken: fromAsset,
    buyToken: toAsset,
    sellAmount: amount,
  };
  const user = await signer.getAddress();

  const quote = await axios.get(`${apiQuoteUrl}${qs.stringify(params)}`);
  const swapProxy = quote.data.allowanceTarget;

  await approveERC20(signer, fromAsset, swapProxy, String(amount));

  const txParams = {
    ...quote,
    from: user,
    to: quote.to,
    value: quote.value.toString(16),
    gasPrice: null,
    gas: quote.gas,
  };

  await ethereum.request({
    method: "eth_sendTransaction",
    params: [txParams],
  });
}

async function approveERC20(signer, tokenAddress, spender, amount) {
  const ERC20Contract = new ethers.Contract(tokenAddress, ERC20, signer);
  const approval = await ERC20Contract.approve(spender, amount);
  await approval.wait();
}

async function approveERC721(signer, tokenAddress, spender, tokenId) {
  const nftContract = new ethers.Contract(
    tokenAddress,
    AARTCollection.abi,
    signer
  );
  const approval = await nftContract.approve(spender, tokenId);
  await approval.wait();
}

export {
  getAssetToAssetPrice,
  getAssetsToMaticPrice,
  swap,
  approveERC20,
  approveERC721,
};
