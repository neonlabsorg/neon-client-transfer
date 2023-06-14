var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { createApproveInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import { SHA256 } from 'crypto-js';
import { etherToProgram, isValidHex, toFullAmount } from '../utils';
import { erc20Abi, neonWrapper2Abi, neonWrapperAbi } from '../data';
import { Buffer } from 'buffer';
const noop = new Function();
export class InstructionService {
    get programId() {
        return new PublicKey(this.proxyStatus.NEON_EVM_ID);
    }
    constructor(options) {
        var _a;
        this.emitFunction = (functionName, ...args) => {
            if (typeof functionName === 'function') {
                functionName(...args);
            }
        };
        this.web3 = options.web3;
        this.proxyApi = options.proxyApi;
        this.proxyStatus = options.proxyStatus;
        this.solanaWalletAddress = options.solanaWalletAddress || '';
        this.neonWalletAddress = options.neonWalletAddress || '';
        this.connection = options.connection;
        this.solanaOptions = (_a = options.solanaOptions) !== null && _a !== void 0 ? _a : { skipPreflight: false };
        this.events = {
            onBeforeCreateInstruction: options.onBeforeCreateInstruction || noop,
            onCreateNeonAccountInstruction: options.onCreateNeonAccountInstruction || noop,
            onBeforeSignTransaction: options.onBeforeSignTransaction || noop,
            onBeforeNeonSign: options.onBeforeNeonSign || noop,
            onSuccessSign: options.onSuccessSign || noop,
            onErrorSign: options.onErrorSign || noop
        };
    }
    get erc20ForSPLContract() {
        return new this.web3.eth.Contract(erc20Abi);
    }
    get neonWrapperContract() {
        return new this.web3.eth.Contract(neonWrapperAbi);
    }
    neonWrapper2Contract(address) {
        return new this.web3.eth.Contract(neonWrapper2Abi, address);
    }
    get solana() {
        if ('solana' in window) {
            return window['solana'];
        }
        return {};
    }
    get solanaWalletPubkey() {
        return new PublicKey(this.solanaWalletAddress);
    }
    get solanaWalletSigner() {
        const solanaWallet = this.solanaWalletPubkey.toBase58();
        const neonWallet = this.neonWalletAddress;
        const emulateSignerPrivateKey = `0x${SHA256(solanaWallet + neonWallet).toString()}`;
        return this.web3.eth.accounts.privateKeyToAccount(emulateSignerPrivateKey);
    }
    neonAccountAddress(neonWallet) {
        return etherToProgram(neonWallet, this.programId);
    }
    authAccountAddress(neonWallet, token) {
        const neonAccountAddressBytes = Buffer.concat([Buffer.alloc(12), Buffer.from(isValidHex(neonWallet) ? neonWallet.replace(/^0x/i, '') : neonWallet, 'hex')]);
        const neonContractAddressBytes = Buffer.from(isValidHex(token.address) ? token.address.replace(/^0x/i, '') : token.address, 'hex');
        const seed = [
            new Uint8Array([3 /* AccountHex.SeedVersion */]),
            new Uint8Array(Buffer.from('AUTH', 'utf-8')),
            new Uint8Array(neonContractAddressBytes),
            new Uint8Array(neonAccountAddressBytes)
        ];
        return PublicKey.findProgramAddressSync(seed, this.programId);
    }
    getNeonAccount(neonAssociatedKey) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.connection.getAccountInfo(neonAssociatedKey);
        });
    }
    createAccountV3Instruction(solanaWallet, neonWalletPDA, neonWallet) {
        const keys = [
            { pubkey: solanaWallet, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: neonWalletPDA, isSigner: false, isWritable: true }
        ];
        const a = Buffer.from([40 /* EvmInstruction.CreateAccountV03 */]);
        const b = Buffer.from(neonWallet.slice(2), 'hex');
        const data = Buffer.concat([a, b]);
        return new TransactionInstruction({
            programId: this.programId,
            keys,
            data
        });
    }
    getAssociatedTokenAddress(mintPubkey, walletPubkey) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield getAssociatedTokenAddress(mintPubkey, walletPubkey);
        });
    }
    approveDepositInstruction(walletPubkey, neonPDAPubkey, associatedTokenPubkey, amount) {
        return createApproveInstruction(associatedTokenPubkey, neonPDAPubkey, walletPubkey, amount);
    }
    createApproveSolanaData(solanaWallet, splToken, amount) {
        const fullAmount = toFullAmount(amount, splToken.decimals);
        return this.erc20ForSPLContract.methods.approveSolana(solanaWallet.toBytes(), fullAmount).encodeABI();
    }
    ethereumTransaction(amount, token) {
        const solanaWallet = this.solanaWalletPubkey;
        return {
            to: token.address,
            from: this.neonWalletAddress,
            value: '0x00',
            data: this.createApproveSolanaData(solanaWallet, token, amount)
        };
    }
}
//# sourceMappingURL=InstructionService.js.map