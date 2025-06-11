// Ethereum Sepolia
  new AaveVault(
    "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // USDC token
    "0x16dA4541aD1807f4443d92D26044C1147406EB80", // aUSDC token
    "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951", // Aave Pool
    "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E"  // USDC/USD Price Feed
  );
  
  // Avalanche Fuji
  new AaveVault(
    "0x5425890298aed601595a70AB815c96711a31Bc65", // USDC token
    "0x0a1d7ada4de57c0b7ae72bde1b5c5ec0b9e4a5c0", // aUSDC token
    "0xcc5e48bEb33b5f3F594F2D0F62F6Fd3fb5A5b21e", // Aave Pool
    "0x97FE42a7E96640D932bbc0e1580c73E705A8EB73"  // USDC/USD Price Feed
  );
  
  // Arbitrum Sepolia
  new AaveVault(
    "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // USDC token
    "0x8F98B1B4f419A7C796d5dF65f1e5cA5b8f0F1B0a", // aUSDC token
    "0x4bd5643ac6f66d20acad91a2C7cC87E1FdC3B648", // Aave Pool
    "0x0153002d20B96532C639313c2d54c3dA09109309"  // USDC/USD Price Feed
  );
  
  // Base Sepolia
  new AaveVault(
    "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC token
    "0x8a2eafb1d1e8e2b1e7e5e5d5a1a3f2c3b4c5d6e7", // aUSDC token
    "0x8dA9412AbF78d20d0f6bf6d2d6c4bD2F5F5eE6f7", // Aave Pool
    "0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165"  // USDC/USD Price Feed
  );    

// Source: https://docs.chain.link/resources/link-token-contracts#bnb-chain-testnet 
// https://docs.chain.link/ccip/directory/testnet/chain/

  // Ethereum Sepolia
new CrossChainRouter(
    "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59", // CCIP Router
    "0x779877A7B0D9E8603169DdbD7836e478b4624789"  // LINK Token
  );
  
  // Avalanche Fuji
  new CrossChainRouter(
    "0xF694E193200268f9a4868e4Aa017A0118C9a8177", // CCIP Router
    "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846"  // LINK Token
  );
  
  // Arbitrum Sepolia
  new CrossChainRouter(
    "0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165", // CCIP Router
    "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E"  // LINK Token
  );
  
  // Base Sepolia
  new CrossChainRouter(
    "0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93", // CCIP Router
    "0xE4aB69C077896252FAFBD49EFD26B5D171A32410"  // LINK Token
  );

  // BNB Chain Testnet
  new CrossChainRouter(
    "0xE1053aE1857476f36A3C62580FF9b016E8EE8F6f", // CCIP Router
    "0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06"  // LINK Token
  );