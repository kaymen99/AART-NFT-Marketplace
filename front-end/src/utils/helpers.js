import { ethers } from "ethers";

export const defaultProfileImg =
  "https://thumbs.dreamstime.com/b/profile-icon-black-background-graphic-web-design-modern-simple-vector-sign-internet-concept-trendy-symbol-profile-138113075.jpg";

export function getAmountInWei(amount) {
  return ethers.utils.parseEther(amount.toString(), "ether");
}
export function getAmountFromWei(amount) {
  return Number(ethers.utils.formatUnits(amount.toString(), "ether"));
}
