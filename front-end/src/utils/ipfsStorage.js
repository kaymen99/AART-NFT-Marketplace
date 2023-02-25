import { Web3Storage } from "web3.storage";

const web3storage_key = "";

export const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

function GetAccessToken() {
  return web3storage_key;
}

function MakeStorageClient() {
  return new Web3Storage({ token: GetAccessToken() });
}

export const saveContent = async (file) => {
  console.log("Uploading files to IPFS with web3.storage....");
  const client = MakeStorageClient();
  const cid = await client.put([file]);
  console.log("Stored files with cid:", cid);
  return cid;
};
