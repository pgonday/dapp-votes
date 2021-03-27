const HDWalletProvider = require('@truffle/hdwallet-provider');
const path = require("path");

require('dotenv').config();

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  contracts_build_directory: path.join(__dirname, "client/src/contracts"),
  networks: {
    develop: {
      host: "127.0.0.1",
      port: 7545,
      network_id: 5777
    },
    rinkeby: {
      provider: function() {
        return new HDWalletProvider( [ process.env.PRIVATE_KEY ], `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`)
      },
      network_id: 4
    },
    ropsten: {
      provider: function() {
        return new HDWalletProvider( [ process.env.PRIVATE_KEY ], `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`)
      },
      network_id: 3
    }
  },

  compilers: {
    solc: {
      version: "0.6.11",
      settings: {
        optimizer: {
          enabled: false,
          runs: 200
        },
      }
    },
  }
};
