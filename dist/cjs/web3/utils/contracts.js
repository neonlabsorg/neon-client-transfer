"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.neonWrapper2Contract = exports.neonWrapperContract = exports.erc20ForSPLContract = void 0;
const web3_eth_contract_1 = require("web3-eth-contract");
const web3_core_1 = require("web3-core");
const data_1 = require("../../data");
function erc20ForSPLContract(proxyUrl) {
    return new web3_eth_contract_1.Contract(data_1.erc20Abi, new web3_core_1.Web3Context(proxyUrl));
}
exports.erc20ForSPLContract = erc20ForSPLContract;
function neonWrapperContract(proxyUrl) {
    return new web3_eth_contract_1.Contract(data_1.neonWrapperAbi, new web3_core_1.Web3Context(proxyUrl));
}
exports.neonWrapperContract = neonWrapperContract;
function neonWrapper2Contract(proxyUrl, address) {
    return new web3_eth_contract_1.Contract(data_1.neonWrapper2Abi, address, new web3_core_1.Web3Context(proxyUrl));
}
exports.neonWrapper2Contract = neonWrapper2Contract;
