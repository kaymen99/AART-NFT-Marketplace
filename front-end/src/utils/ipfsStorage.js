import { NFTStorage } from 'nft.storage';

const token = '';

export const IPFS_GATEWAY = "https://nftstorage.link/ipfs/"; //Gateway from nft.storage

function MakeStorageClient() {
   return new NFTStorage({ token });
}


  //const storage = new NFTStorage({ token })


export const saveContent = async (file) => {
  console.log(`storing file(s)...with nft.storage`);
  const storage = MakeStorageClient();
  //
  const cid = await storage.storeDirectory([file]);
  console.log("Stored files with cid:", { cid });
  return cid;
};
