import images from "../assets/images";

const tokens = {
  "Polygon Mainnet": [
    {
      index: 0,
      symbol: "MATIC",
      logo: images.matic,
      address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      decimals: 18,
    },
    {
      index: 1,
      symbol: "USDT",
      logo: images.usdt,
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      decimals: 6,
    },
    {
      index: 2,
      symbol: "DAI",
      logo: images.dai,
      address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
      decimals: 18,
    },
    {
      index: 3,
      symbol: "USDC",
      logo: images.usdc,
      address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      decimals: 6,
    },
  ],
  "Mumbai Testnet": [
    {
      index: 0,
      symbol: "MATIC",
      logo: images.matic,
      address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      decimals: 18,
    },
    {
      index: 1,
      symbol: "USDT",
      logo: images.usdt,
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      decimals: 6,
    },
    {
      index: 2,
      symbol: "DAI",
      logo: images.dai,
      address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
      decimals: 18,
    },
    {
      index: 3,
      symbol: "USDC",
      logo: images.usdc,
      address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      decimals: 6,
    },
  ],
};

function getTokenFromAddress(tokenAddress, network) {
  const token = tokens[network].filter((t) => t.address === tokenAddress);

  return token.index;
}

function getTokenAddress(index, network) {
  return tokens[network][index].address;
}

export { tokens, getTokenAddress, getTokenFromAddress };
