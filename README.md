<div id="top"></div>

<!-- ABOUT THE PROJECT -->

# AART-NFT-Marketplace

Welcome to the AI-Generated NFT Marketplace! This project aims to revolutionize the world of digital collectibles by leveraging AI technology. With this app, users are able to mint AI-Generated NFTs, participate in auctions, trade NFTs with other users and earn royalties on secondary sales. Additionally, the app provides a seamless experience for creators to showcase their artwork and establish their brand through personalized NFT creator profiles.

<p align="center">
  <img alt="Dark" src="https://github.com/kaymen99/AART-NFT-Marketplace/assets/83681204/9562c69a-e906-40bc-96c7-e39d2797e407" width="100%">
</p>


### Built With

* [Solidity](https://docs.soliditylang.org/)
* [Hardhat](https://hardhat.org/getting-started/)
* [React.js](https://reactjs.org/)
* [ethers.js](https://docs.ethers.io/v5/)
* [web3modal](https://github.com/Web3Modal/web3modal)
* [material ui](https://mui.com/getting-started/installation/)

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#project-architecture">Project architecture</a></li>
    <li>
      <a href="#how-to-run">How to Run</a>
      <ul>
       <li><a href="#prerequisites">Prerequisites</a></li>
       <li><a href="#contracts">Contracts</a></li>
       <li><a href="#front-end">Front-end</a></li>
      </ul>
    </li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#license">License</a></li>
  </ol>
</details>


<!-- PROJECT STRUCTURE -->
## Project architecture

The contracts development and testing is done using the Hardhat framework in the smart_contracts folder, for this project there are 3 main contracts :
      <ul>
       <li><b>AARTCollection.sol :</b></li>
An NFT collection contract based on the ERC721 standard which enables users to mint their own AI generated NFTs, also support the ERC2981 standard to allow nft creator to earn royalties on their collectibles.
       <li><b>AARTArtists.sol :</b></li>
An NFT collection contract based on the ERC721 standard, specifically designed to represent personalized creator profiles on the AART marketplace. Each NFT within this collection represents a distinct creator profile, providing on-chain storage for artists' information. The contract offers essential CRUD (Create, Read, Update, Delete) functionalities, allowing creators to manage and update their profiles directly on the blockchain.
       <li><b>AARTMarket.sol :</b></li>
The AARTMarket contract forms the core of the marketplace logic within the AART ecosystem. It facilitates various transaction types, including normal sales, auctions, and the ability for users to make offers on any minted NFT in the collection. The contract is designed to support multiple ERC20 tokens, expanding the options for buyers and sellers. Furthermore, the AARTMarket contract implements royalty payment functionality, ensuring that creators receive their fair share of royalties on each sale.
      </ul>

<p align="right">(<a href="#top">back to top</a>)</p>

<!-- USAGE GUIDE -->
## How to Run

### Prerequisites

Please install or have installed the following:
* [nodejs](https://nodejs.org/en/download/) and [yarn](https://classic.yarnpkg.com/en/)
* [MetaMask](https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn) Chrome extension installed in your browser
* [Ganache](https://trufflesuite.com/ganache/) for local smart contracts deployement and testing.

Clone this repo with the command :
   ```sh
   git clone https://github.com/kaymen99/AART-NFT-Marketplace.git
   cd AART-NFT-Marketplace
   ```
   
### Contracts

As mentioned before the contracts are developed with the Hardhat framework, before deploying them you must first install the required dependancies by running :
   ```sh
   cd smart_contracts
   yarn
   ```
   
Next you need to setup the environement variables in the .env file, this are used when deploying the contracts :

   ```sh
    POLYGONSCAN_API_KEY = 'your polygonscan api key'
    POLYGON_RPC_URL="Your polygon RPC url from alchemy or infura"
    MUMBAI_RPC_URL="Your mumbai RPC url from alchemy or infura"
    PRIVATE_KEY="your private key"
   ```
* <b>NOTE :</b> Only the private key is needed when deploying to the ganache network, the others variables are for deploying to the testnets or real networks and etherscan api key is for verifying your contracts on polyon etherscan.

After going through all the configuration step, you'll need to deploy the 3 contracts to the ganache network by running: 
   ```sh
   yarn deploy-ganache
   ```
   
This will create a config.js file and an artifacts folder and transfer them to the src folder to enable the interaction between the contract and the UI

* <b>IMPORTANT :</b> I used the ganache network for development purposes only, you can choose another testnet or real network if you want, for that you need to add it to the hardhat.config file for example for the mumbai testnet :

   ```sh
    mumbai: {
      url: MUMBAI_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 80001,
    }
   ```
And for the deployment use the command : 
   ```sh
   yarn deploy --mumbai
   ```

If you want to run the contracts unit tests use the command :
   ```sh
   yarn test
   ```
   
### Front end

To start the user interface just run the following commands :
   ```sh
   cd front-end
   yarn
   yarn start
   ```

<p align="right">(<a href="#top">back to top</a>)</p>

<!-- Contact -->
## Contact

If you have any question or problem running this project just contact me: aymenMir1001@gmail.com

<p align="right">(<a href="#top">back to top</a>)</p>


<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#top">back to top</a>)</p>

