import * as sol from 'micro-sol-signer';
import API from './API.js';
import { HDKey } from 'micro-key-producer/slip10.js';
import { randomBytes } from 'micro-key-producer/utils.js';
import { base58, hex } from '@scure/base';

import {
  Amount,
  CsWallet,
  Transaction,
  errors,
} from '@coinspace/cs-common';

const BLOCK_EXPLORER = 'https://explorer.solana.com';

const TOKEN_ENCODE = {
  [sol.TOKEN_PROGRAM]: sol.PROGRAMS.token.program.instructions.encoders,
  [sol.TOKEN_PROGRAM2022]: sol.PROGRAMS['token-2022'].program.instructions.encoders,
};
const ASSOCIATED_TOKEN_ENCODE = {
  [sol.TOKEN_PROGRAM]: sol.PROGRAMS.token.additionalPrograms.associatedToken.instructions.encoders,
  [sol.TOKEN_PROGRAM2022]: sol.PROGRAMS['token-2022'].additionalPrograms.associatedToken.instructions.encoders,
};
const ACCOUNT_SIZES = {
  [sol.TOKEN_PROGRAM]: sol.PROGRAMS.token.program.accounts.coders.token.size,
  [sol.TOKEN_PROGRAM2022]: sol.PROGRAMS['token-2022'].program.accounts.coders.token.size,
};

export class SolanaTransaction extends Transaction {
  get url() {
    if (this.development) {
      return `${BLOCK_EXPLORER}/tx/${this.id}?cluster=devnet`;
    }
    return `${BLOCK_EXPLORER}/tx/${this.id}`;
  }
}

export default class SolanaWallet extends CsWallet {
  #api;
  #account;
  #mint;
  #tokenProgram = sol.TOKEN_PROGRAM;
  #tokenAccount;
  #coinBalance = 0n;
  #tokenBalance = 0n;
  #dustThreshold = 1n;
  #transactionsCache = [];

  // memorized functions
  #isAccountExists;
  #getMinerFee;
  #getRent;

  get balance() {
    if (this.crypto.type === 'coin') {
      return new Amount(this.#coinBalance, this.crypto.decimals);
    }
    if (this.crypto.type === 'token') {
      return new Amount(this.#tokenBalance, this.crypto.decimals);
    }
    throw new errors.InternalWalletError('Unsupported crypto type');
  }

  get address() {
    return this.#account;
  }

  get defaultSettings() {
    return {
      // https://docs.solana.com/wallet-guide/paper-wallet#hierarchical-derivation
      bip44: "m/44'/501'/0'/0'",
    };
  }

  get isSettingsSupported() {
    if (this.crypto.type === 'coin') {
      return true;
    }
    // token
    return false;
  }

  get isCsFeeSupported() {
    if (this.crypto.type === 'coin') {
      return true;
    }
    // token
    return false;
  }

  get tokenUrl() {
    if (this.crypto.type === 'token') {
      if (this.development) {
        return `${BLOCK_EXPLORER}/address/${this.crypto.address}?cluster=devnet`;
      }
      return `${BLOCK_EXPLORER}/address/${this.crypto.address}`;
    }
    return undefined;
  }

  static tokenUrl(platform, address, development) {
    if (development) {
      return `${BLOCK_EXPLORER}/address/${address}?cluster=devnet`;
    }
    return `${BLOCK_EXPLORER}/address/${address}`;
  }

  get dummyExchangeDepositAddress() {
    return sol.getAddress(randomBytes(32));
  }

  static tokenApiUrl(address) {
    return `api/v2/token/${address}`;
  }

  constructor(options = {}) {
    super(options);

    this.#api = new API(this);
    this.#isAccountExists = this.memoize(this._isAccountExists);
    this.#getMinerFee = this.memoize(this._getMinerFee);
    this.#getRent = this.memoize(this._getRent);
  }

  #keypairFromSeed(seed) {
    return HDKey.fromMasterSeed(seed).derive(this.settings.bip44);
  }

  async create(seed) {
    this.typeSeed(seed);
    this.state = CsWallet.STATE_INITIALIZING;
    this.#account = sol.getAddress(this.#keypairFromSeed(seed).privateKey);
    this.#init();
    this.state = CsWallet.STATE_INITIALIZED;
  }

  async open(publicKey) {
    this.typePublicKey(publicKey);
    this.state = CsWallet.STATE_INITIALIZING;
    if (publicKey.settings.bip44 === this.settings.bip44) {
      this.#account = sol.formatPublic(hex.decode(publicKey.data));
      this.#init();
      this.state = CsWallet.STATE_INITIALIZED;
    } else {
      this.state = CsWallet.STATE_NEED_INITIALIZATION;
    }
  }

  #init() {
    if (this.crypto.type === 'coin') {
      this.#coinBalance = BigInt(this.storage.get('balance') || 0);
    }
    if (this.crypto.type === 'token') {
      this.#tokenBalance = BigInt(this.storage.get('balance') || 0);
    }
  }

  async load() {
    this.state = CsWallet.STATE_LOADING;
    try {
      const { balance: coinBalance } = await this.#api.coinAccountInfo(this.#account);
      this.#coinBalance = coinBalance;
      if (this.crypto.type === 'coin') {
        this.storage.set('balance', this.#coinBalance.toString());
      }
      if (this.crypto.type === 'token') {
        this.#validateAccount(this.crypto.address, true);
        this.#mint = this.crypto.address;
        const info = await this.#api.tokenAccountInfo(this.#mint, this.#account);
        if (info.exists) {
          if (![sol.TOKEN_PROGRAM, sol.TOKEN_PROGRAM2022].includes(info.owner)) {
            throw new errors.InternalWalletError(`Invalid token program: ${info.owner}`);
          }
          this.#tokenProgram = info.owner;
          this.#tokenAccount = this.#getAssociatedTokenAccount(this.#mint, this.#account, this.#tokenProgram);
        }
        this.#tokenBalance = info.balance;
        this.storage.set('balance', this.#tokenBalance.toString());
      }
      await this.storage.save();
      this.state = CsWallet.STATE_LOADED;
    } catch (err) {
      this.state = CsWallet.STATE_ERROR;
      throw err;
    }
  }

  async cleanup() {
    await super.cleanup();
    this.memoizeClear(this.#isAccountExists);
    this.memoizeClear(this.#getMinerFee);
    this.memoizeClear(this.#getRent);
  }

  // public key/keys + settings
  // public key must be stringified
  // so we convert buffer to hex string
  getPublicKey() {
    return {
      settings: this.settings,
      data: hex.encode(base58.decode(this.#account)),
    };
  }

  getPrivateKey(seed) {
    this.typeSeed(seed);
    const keypair = this.#keypairFromSeed(seed);
    return [{
      address: this.#account,
      privatekey: JSON.stringify(sol.formatPrivate(keypair.privateKey, 'array')),
    }];
  }

  #getAssociatedTokenAccount(mint, owner, tokenProgram = sol.TOKEN_PROGRAM) {
    try {
      return sol.tokenAddress({
        mint,
        owner,
        tokenProgram,
      });
    } catch (err) {
      throw new errors.InternalWalletError(`Invalid token address: ${mint}`, { cause: err });
    }
  }

  async #getLatestBlockHash() {
    return this.#api.latestBlockHash();
  }

  async _getMinerFee() {
    // TODO calculate for different transaction types when algorithm is changed
    // Currently Solana uses fee per signature
    // All ours transactions have single signature
    const { blockhash } = await this.#getLatestBlockHash();
    const tx = this.crypto.type === 'coin'
      ? sol.createTransferSol(this.#account, this.#account, 1n, blockhash, 0)
      : sol.createTokenTransferChecked(
        this.#mint,
        this.#account,
        this.#account,
        1n,
        this.crypto.decimals,
        blockhash,
        this.#tokenProgram,
        0
      );
    const fee = await this.#api.fee(sol.getMessageFromTransaction(tx));
    return fee;
  }

  async _getRent(type = this.crypto.type) {
    return this.#api.getRent((type === 'token') ? ACCOUNT_SIZES[this.#tokenProgram] : 0);
  }

  async _isAccountExists(account) {
    return this.#api.isAccountExists(account);
  }

  calculateCsFee({ value, price }) {
    return super.calculateCsFee(value, {
      price,
      dustThreshold: this.#dustThreshold,
    });
  }

  calculateCsFeeForMaxAmount({ value, price }) {
    return super.calculateCsFeeForMaxAmount(value, {
      price,
      dustThreshold: this.#dustThreshold,
    });
  }

  validateDerivationPath(path) {
    return /^m(\/\d+')*$/.test(path);
  }

  #validateAccount(address, allowOffCurve = false) {
    try {
      sol.validateAddress(address);
    } catch (err) {
      throw new errors.InvalidAddressError(address, { cause: err });
    }
    if (!allowOffCurve && !sol.isOnCurve(address)) {
      throw new errors.InvalidAddressError(address);
    }
  }

  async validateAddress({ address }) {
    super.validateAddress({ address });
    this.#validateAccount(address);
    if (address === this.#account) {
      throw new errors.DestinationEqualsSourceError();
    }
    return true;
  }

  // address must be already validated
  async validateAmount({ address, amount, price }) {
    super.validateAmount({ address, amount, price });
    const { value } = amount;

    if (value < this.#dustThreshold) {
      throw new errors.SmallAmountError(new Amount(this.#dustThreshold, this.crypto.decimals));
    }
    if (this.crypto.type === 'coin') {
      const isAccountExists = await this.#isAccountExists(address);
      if (!isAccountExists) {
        const rent = await this.#getRent();
        // actually value may be slightly less than the rent
        if (value < rent) {
          throw new errors.MinimumReserveDestinationError(new Amount(rent, this.crypto.decimals));
        }
      }
    }
    if (this.crypto.type === 'token') {
      let fee = await this.#getMinerFee();
      const destinationTokenAccount = this.#getAssociatedTokenAccount(
        this.#mint, address, this.#tokenProgram);
      const isAccountExists = await this.#isAccountExists(destinationTokenAccount);
      if (!isAccountExists) {
        fee += await this.#getRent();
      }
      const minimumCoinBalance = await this.#getRent('coin');
      if (this.#coinBalance < (fee + minimumCoinBalance)) {
        throw new errors.InsufficientCoinForTransactionFeeError(
          new Amount(fee + minimumCoinBalance, this.platform.decimals)
        );
      }
    }
    // or calculate value + fee and compare with balance
    const maxAmount = await this.#estimateMaxAmount({ price });
    if (value > maxAmount) {
      throw new errors.BigAmountError(new Amount(maxAmount, this.crypto.decimals));
    }
    return true;
  }

  async #estimateTransactionFee({ address, value, price }) {
    const minerFee = await this.#getMinerFee();
    if (this.crypto.type === 'coin') {
      const csFee = await this.calculateCsFee({ value, price });
      // rent for coin transaction is not fee
      return csFee + minerFee;
    }
    if (this.crypto.type === 'token') {
      const destinationTokenAccount = this.#getAssociatedTokenAccount(
        this.#mint, address, this.#tokenProgram);
      const isAccountExists = await this.#isAccountExists(destinationTokenAccount);
      if (isAccountExists) {
        return minerFee;
      } else {
        const rent = await this.#getRent();
        return minerFee + rent;
      }
    }
  }

  // address and value must be already validated
  async estimateTransactionFee({ address, amount, price }) {
    super.estimateTransactionFee({ address, amount, price });
    const { value } = amount;
    const fee = await this.#estimateTransactionFee({ address, value, price });
    if (this.crypto.type === 'coin') {
      return new Amount(fee, this.crypto.decimals);
    }
    if (this.crypto.type === 'token') {
      return new Amount(fee, this.platform.decimals);
    }
  }

  async #estimateMaxAmount({ price }) {
    if (this.crypto.type === 'coin') {
      const minerFee = await this.#getMinerFee();
      if (this.#coinBalance < minerFee) {
        return 0n;
      }
      const rent = await this.#getRent();
      if (this.#coinBalance < (minerFee + rent)) {
        return 0n;
      }
      const csFee = await this.calculateCsFeeForMaxAmount({ value: this.#coinBalance - (minerFee + rent), price });
      const max = this.#coinBalance - (minerFee + rent + csFee);
      if (max < 0) {
        return 0n;
      }
      return max;
    }
    if (this.crypto.type === 'token') {
      return this.#tokenBalance;
    }
  }

  // address must be already validated
  async estimateMaxAmount({ address, price }) {
    super.estimateMaxAmount({ address, price });
    const maxAmount = await this.#estimateMaxAmount({ price });
    return new Amount(maxAmount, this.crypto.decimals);
  }

  async createTransaction({ address, amount, price }, seed) {
    super.createTransaction({ address, amount, price }, seed);
    const { value } = amount;
    let fee = await this.#getMinerFee();
    const { blockhash } = await this.#getLatestBlockHash();
    const instructions = [];
    if (this.crypto.type === 'coin') {
      const csFeeConfig = await this.getCsFeeConfig();
      const csFee = await this.calculateCsFee({ value, price });
      instructions.push(sol.sys.transferSol({
        source: this.#account,
        destination: address,
        amount: value,
      }));
      if (csFee > 0n) {
        fee = fee + csFee;
        instructions.push(sol.sys.transferSol({
          source: this.#account,
          destination: csFeeConfig.address,
          amount: csFee,
        }));
      }
    }
    if (this.crypto.type === 'token') {
      const destinationTokenAccount = this.#getAssociatedTokenAccount(
        this.#mint, address, this.#tokenProgram);
      const isAccountExists = await this.#isAccountExists(destinationTokenAccount);
      if (!isAccountExists) {
        // we treat rent as fee for tokens
        fee = fee + await this.#getRent();
        instructions.push(ASSOCIATED_TOKEN_ENCODE[this.#tokenProgram].createAssociatedToken({
          payer: this.#account,
          ata: destinationTokenAccount,
          owner: address,
          mint: this.#mint,
        }));
      }
      instructions.push(TOKEN_ENCODE[this.#tokenProgram].transferChecked({
        source: this.#tokenAccount,
        destination: destinationTokenAccount,
        amount: value,
        decimals: this.crypto.decimals,
        mint: this.#mint,
        authority: this.#account,
      }));
    }
    const unsignedTx = sol.createTx(this.#account, instructions, blockhash, 0);
    const [, signedTx] = sol.signTx(this.#keypairFromSeed(seed).privateKey, unsignedTx);
    const id = await this.#api.sendTransaction(signedTx);
    if (this.crypto.type === 'coin') {
      this.#coinBalance -= value + fee;
      this.storage.set('balance', this.#coinBalance.toString());
    }
    if (this.crypto.type === 'token') {
      this.#coinBalance -= fee;
      this.#tokenBalance -= value;
      this.storage.set('balance', this.#tokenBalance.toString());
    }
    await this.storage.save();
    return id;
  }

  async loadTransactions({ cursor } = {}) {
    if (!cursor) {
      this.#transactionsCache = [];
    }
    const account = this.crypto.type === 'coin' ? this.#account : this.#tokenAccount;
    if (!account) return { hasMore: false, transactions: [] };
    const res = await this.#api.loadTransactions(account, this.txPerPage, cursor);
    const transactions = this.#transformTxs(res.transactions).filter((item) => !!item);
    this.#transactionsCache.push(...transactions);
    return {
      ...res,
      transactions,
    };
  }

  async loadTransaction(id) {
    const transaction = this.#transactionsCache.find((item) => item.id === id);
    if (transaction) {
      return transaction;
    } else {
      return this.#transformTx(await this.#api.loadTransaction(id));
    }
  }

  #transformTxs(txs) {
    return txs.map((tx) => {
      return this.#transformTx(tx);
    });
  }

  #transformTx(tx) {
    const token = this.crypto.type === 'token' ? this.#mint : false;
    let value = 0n;
    let fee = BigInt(tx.meta.fee);
    let from;
    let to;
    let incoming = true;
    let action = SolanaTransaction.ACTION_TRANSFER;

    const postTokenBalances = [];
    if (tx.meta.postTokenBalances) {
      for (const postTokenBalance of tx.meta.postTokenBalances) {
        postTokenBalances.push({
          ...postTokenBalance,
          account: this.#getAssociatedTokenAccount(
            postTokenBalance.mint,
            postTokenBalance.owner,
            postTokenBalance.programId
          ),
        });
      }
    }
    for (const instruction of tx.transaction.message.instructions) {
      if (!instruction.parsed) {
        if (this.development) {
          console.error('unparsed instruction:', instruction);
        }
        continue;
      }
      const { info } = instruction.parsed;
      if (!token && instruction.program === 'system' && instruction.parsed.type === 'transfer') {
        // SOL coin
        if (info.source === this.#account && info.csfee === true) {
          // csfee
          fee += BigInt(info.lamports);
        } else {
          if (info.destination === this.#account) {
            value = BigInt(info.lamports);
            incoming = true;
            to = info.destination;
            from = info.source;
          }
          if (info.source === this.#account) {
            value = BigInt(info.lamports);
            incoming = false;
            to = info.destination;
            from = info.source;
          }
        }
      }
      if (instruction.program === 'spl-token' && 'transfer' === instruction.parsed.type) {
        // Tokens
        const destination = postTokenBalances.find((item) => item.account === info.destination);
        if (destination && (!token || destination.mint === token)) {
          if (destination.owner === this.#account) {
            if (token) {
              value = BigInt(info.amount);
            }
            incoming = true;
            to = this.#account; // destination.owner
            from = info.authority || info.multisigAuthority;
          }
          if (info.authority === this.#account) {
            if (token) {
              value = BigInt(info.amount);
            } else {
              action = SolanaTransaction.ACTION_TOKEN_TRANSFER;
            }
            incoming = false;
            to = destination.owner;
            from = this.#account; // info.authority
          }
        }
      }
      if (instruction.program === 'spl-token' && 'transferChecked' === instruction.parsed.type) {
        // Tokens
        const destination = postTokenBalances.find((item) => item.account === info.destination);
        if (destination && (!token || destination.mint === token)) {
          if (destination.owner === this.#account) {
            if (token) {
              value = BigInt(info.tokenAmount.amount);
            }
            incoming = true;
            to = this.#account; // destination.owner
            from = info.authority || info.multisigAuthority;
          }
          if (info.authority === this.#account) {
            if (token) {
              value = BigInt(info.tokenAmount.amount);
            } else {
              action = SolanaTransaction.ACTION_TOKEN_TRANSFER;
            }
            incoming = false;
            to = destination.owner;
            from = this.#account; // info.authority
          }
        }
      }
    }
    if (tx.meta.innerInstructions) {
      for (const item of tx.meta.innerInstructions) {
        for (const instruction of item.instructions) {
          if (instruction.program === 'system' && instruction.parsed.type === 'createAccount') {
            if (instruction.parsed.info.source === this.#account) {
              fee += BigInt(instruction.parsed.info.lamports);
            } else if (!token) {
              // skip incoming transaction with new token account creation from history
              return;
            }
          }
        }
      }
    }
    if (from && to) {
      return new SolanaTransaction({
        status: !tx.meta.err ? SolanaTransaction.STATUS_SUCCESS : SolanaTransaction.STATUS_FAILED,
        id: tx.transaction.signatures[0],
        amount: new Amount(value, this.crypto.decimals),
        incoming,
        from,
        to,
        fee: new Amount(fee, this.platform.decimals),
        timestamp: new Date(tx.blockTime * 1000),
        confirmations: 1,
        minConfirmations: 1,
        development: this.development,
        action,
      });
    }
    if (this.development) {
      console.error('unparsed transaction:', tx, { from, to });
    }
  }
}
