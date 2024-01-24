"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.neonWrapper2Contract = exports.neonWrapperContract = exports.erc20ForSPLContract = void 0;
const contracts_1 = require("@ethersproject/contracts");
const abi_1 = require("@ethersproject/abi");
const abi_2 = require("../../data/abi");
function erc20ForSPLContract() {
    return new abi_1.Interface(abi_2.erc20Abi);
}
exports.erc20ForSPLContract = erc20ForSPLContract;
function neonWrapperContract() {
    return new abi_1.Interface(abi_2.neonWrapperAbi);
}
exports.neonWrapperContract = neonWrapperContract;
function neonWrapper2Contract(signer, address) {
    return new contracts_1.Contract(address, abi_2.neonWrapper2Abi, signer);
}
exports.neonWrapper2Contract = neonWrapper2Contract;
