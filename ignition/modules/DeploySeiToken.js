const { buildModule } = require('@nomicfoundation/hardhat-ignition/modules');

module.exports = buildModule('SeiTokenModule', (m) => {
  // Deploy SeiToken with no constructor arguments
  const seiToken = m.contract('SeiToken', [], {
    contractName: 'SeiToken',
    libraries: {}
  });
  
  return { seiToken };
});
