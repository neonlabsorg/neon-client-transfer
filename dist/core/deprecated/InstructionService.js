import { PublicKey } from '@solana/web3.js';
import { createApproveInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { toFullAmount } from '../../utils';
import { erc20Abi, neonWrapper2Abi, neonWrapperAbi } from '../../data';
import { authAccountAddress, neonWalletProgramAddress, solanaWalletSigner } from '../utils';
import { createAccountV3Instruction } from '../mint-transfer';
const noop = new Function();
/**
 * @deprecated this code was deprecated and will remove in next releases.
 * Please use other methods from mint-transfer.ts and neon-transfer.ts files
 * For more examples see `examples` folder
 */
export class InstructionService {
    get programId() {
        return new PublicKey(this.proxyStatus.NEON_EVM_ID);
    }
    get tokenMint() {
        return new PublicKey(this.proxyStatus.NEON_TOKEN_MINT);
    }
    constructor(options) {
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
        this.neonContractAddress = options.neonContractAddress || '';
        this.connection = options.connection;
        this.solanaOptions = options.solanaOptions ?? { skipPreflight: false };
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
        return solanaWalletSigner(this.web3, this.solanaWalletPubkey, this.neonWalletAddress);
    }
    neonAccountAddress(neonWallet) {
        return neonWalletProgramAddress(neonWallet, this.programId);
    }
    authAccountAddress(neonWallet, token) {
        return authAccountAddress(neonWallet, this.programId, token);
    }
    async getNeonAccount(neonAssociatedKey) {
        return this.connection.getAccountInfo(neonAssociatedKey);
    }
    createAccountV3Instruction(solanaWallet, neonWalletPDA, neonWallet) {
        return createAccountV3Instruction(solanaWallet, neonWalletPDA, this.programId, neonWallet);
    }
    getAssociatedTokenAddress(mintPubkey, walletPubkey) {
        return getAssociatedTokenAddressSync(mintPubkey, walletPubkey);
    }
    approveDepositInstruction(walletPubkey, neonPDAPubkey, associatedTokenPubkey, amount) {
        return createApproveInstruction(associatedTokenPubkey, neonPDAPubkey, walletPubkey, amount);
    }
    createApproveSolanaData(solanaWallet, splToken, amount) {
        const fullAmount = toFullAmount(amount, splToken.decimals);
        return this.erc20ForSPLContract.methods.approveSolana(solanaWallet.toBuffer(), fullAmount).encodeABI();
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