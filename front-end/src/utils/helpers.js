import { ethers } from "ethers";

export function getAmountInWei(amount) {
  return ethers.utils.parseEther(amount.toString(), "ether");
}
export function getAmountFromWei(amount) {
  return Number(ethers.utils.formatUnits(amount.toString(), "ether"));
}
