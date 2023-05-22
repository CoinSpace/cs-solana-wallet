import * as sol from 'micro-sol-signer';
import API from './API.js';
import { HDKey } from 'ed25519-keygen/hdkey';
import { base58, base64, hex } from '@scure/base';

import {
  Amount,
  CsWallet,
  Transaction,
  errors,
} from 'cs-common';

// ex spl.ACCOUNT_SIZE
const ACCOUNT_SIZE = sol.TokenAccount.size;

export default class SolanaWallet extends CsWallet {
  #api;
  #account;
  #tokenAccount;
  #mint;
  #coinBalance = 0n;
  #tokenBalance = 0n;
  #dustThreshold = 1n;

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
    this.#account = base58.encode(this.#keypairFromSeed(seed).publicKeyRaw);
    this.#init();
    this.state = CsWallet.STATE_INITIALIZED;
  }

  async open(publicKey) {
    this.typePublicKey(publicKey);
    this.state = CsWallet.STATE_INITIALIZING;
    if (publicKey.settings.bip44 === this.settings.bip44) {
      this.#account = base58.encode(hex.decode(publicKey.data));
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
    if (this.crypto.type === 'coin') {
      this.#coinBalance = await this.#getCoinBalance();
      this.storage.set('balance', this.#coinBalance.toString());
    }
    if (this.crypto.type === 'token') {
      this.#validateAccount(this.crypto.address);
      this.#mint = this.crypto.address;
      this.#tokenAccount = this.#getAssociatedTokenAccount(this.#mint, this.#account);
      this.#tokenBalance = await this.#getTokenBalance();
      this.#coinBalance = await this.#getCoinBalance();
      this.storage.set('balance', this.#tokenBalance.toString());
    }
    await this.storage.save();
    this.state = CsWallet.STATE_LOADED;
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
      privatekey: `[${[...keypair.privateKey, ...keypair.publicKeyRaw].toString()}]`,
    }];
  }

  async #getCoinBalance() {
    return this.#api.coinBalance(this.#account);
  }

  async #getTokenBalance() {
    return this.#api.tokenBalance(this.#tokenAccount);
  }

  #getAssociatedTokenAccount(mint, owner) {
    try {
      return sol.tokenAddress(mint, owner);
    } catch (err) {
      throw new errors.InternalWalletError(`Invalid token address: ${mint} `, { cause: err });
    }
  }

  async #getLatestBlockHash() {
    return this.#api.latestBlockHash();
  }

  async _getMinerFee() {
    // TODO calculate for different transaction types when algorithm is changed
    // Currently Solana uses fee per signature
    // All ours transactions have single signature
    const latestBlockhash = await this.#getLatestBlockHash();
    const tx = sol.createTx(this.#account, this.#account, '1.0', null, latestBlockhash.blockhash);
    const message = base64.encode(sol.Message.encode(sol.TransactionRaw.decode(base64.decode(tx)).msg));
    const fee = await this.#api.fee(message);
    return fee;
  }

  async _getRent() {
    return this.#api.getRent((this.crypto.type === 'token') ? ACCOUNT_SIZE : 0);
  }

  async _isAccountExists(account) {
    return this.#api.isAccountExists(account);
  }

  calculateCsFee(value) {
    return super.calculateCsFee(value, {
      dustThreshold: this.#dustThreshold,
    });
  }

  calculateCsFeeForMaxAmount(value) {
    return super.calculateCsFeeForMaxAmount(value, {
      dustThreshold: this.#dustThreshold,
    });
  }

  #validateAccount(address) {
    try {
      sol.validateAddress(address);
    } catch (err) {
      throw new errors.InvalidAddressError(address, { cause: err });
    }
    if (!sol.isOnCurve(address)) {
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
  async validateAmount({ address, amount }) {
    super.validateAmount({ address, amount });
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
        this.#mint, address);
      const isAccountExists = await this.#isAccountExists(destinationTokenAccount);
      if (!isAccountExists) {
        fee += await this.#getRent();
      }
      if (this.#coinBalance < fee) {
        throw new errors.InsufficientCoinForTokenTransactionError(new Amount(fee, this.platform.decimals));
      }
    }
    // or calculate value + fee and compare with balance
    const maxAmount = await this.#estimateMaxAmount();
    if (value > maxAmount) {
      throw new errors.BigAmountError(new Amount(maxAmount, this.crypto.decimals));
    }
    return true;
  }

  async #estimateTransactionFee({ address, value }) {
    const minerFee = await this.#getMinerFee();
    if (this.crypto.type === 'coin') {
      const csFee = await this.calculateCsFee(value);
      // rent for coin transaction is not fee
      return csFee + minerFee;
    }
    if (this.crypto.type === 'token') {
      const destinationTokenAccount = this.#getAssociatedTokenAccount(
        this.#mint, address);
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
  async estimateTransactionFee({ address, amount }) {
    super.estimateTransactionFee({ address, amount });
    const { value } = amount;
    const fee = await this.#estimateTransactionFee({ address, value });
    if (this.crypto.type === 'coin') {
      return new Amount(fee, this.crypto.decimals);
    }
    if (this.crypto.type === 'token') {
      return new Amount(fee, this.platform.decimals);
    }
  }

  async #estimateMaxAmount() {
    if (this.crypto.type === 'coin') {
      const minerFee = await this.#getMinerFee();
      if (this.#coinBalance < minerFee) {
        return 0n;
      }
      const csFee = await this.calculateCsFeeForMaxAmount(this.#coinBalance - minerFee);
      const max = this.#coinBalance - minerFee - csFee;
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
  async estimateMaxAmount({ address }) {
    super.estimateMaxAmount({ address });
    const maxAmount = await this.#estimateMaxAmount();
    return new Amount(maxAmount, this.crypto.decimals);
  }

  async createTransaction({ address, amount }, seed) {
    super.createTransaction({ address, amount }, seed);
    const { value } = amount;
    let fee = await this.#getMinerFee();
    const latestBlockhash = await this.#getLatestBlockHash();
    const instructions = [];
    if (this.crypto.type === 'coin') {
      const csFeeConfig = await this.getCsFeeConfig();
      const csFee = await this.calculateCsFee(value);
      instructions.push(sol.sys.transfer({
        source: this.#account,
        destination: address,
        lamports: value,
      }));
      if (csFee > 0n) {
        fee = fee + csFee;
        instructions.push(sol.sys.transfer({
          source: this.#account,
          destination: csFeeConfig.address,
          lamports: csFee,
        }));
      }
    }
    if (this.crypto.type === 'token') {
      const destinationTokenAccount = this.#getAssociatedTokenAccount(
        this.#mint, address);
      const isAccountExists = await this.#isAccountExists(destinationTokenAccount);
      if (!isAccountExists) {
        // we treat rent as fee for tokens
        fee = fee + await this.#getRent();
        instructions.push(sol.associatedToken.create({
          source: this.#account,
          account: destinationTokenAccount,
          wallet: address,
          mint: this.#mint,
        }));
      }
      instructions.push(sol.token.transferChecked({
        source: this.#tokenAccount,
        destination: destinationTokenAccount,
        amount: value,
        decimals: this.crypto.decimals,
        mint: this.#mint,
        owner: this.#account,
      }));
    }
    const transaction = sol.createTxComplex(this.#account, instructions, latestBlockhash.blockhash);
    // TODO remove await
    const res = await sol.signTx(this.#keypairFromSeed(seed).privateKey, transaction);
    await this.#api.sendTransaction(res[1]);
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
  }

  async loadTransactions({ cursor } = {}) {
    const account = this.crypto.type === 'coin' ? this.#account : this.#tokenAccount;
    const res = await this.#api.loadTransactions(account, this.txPerPage, cursor);
    return {
      ...res,
      transactions: this.#transformTxs(res.transactions).filter((item) => !!item),
    };
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

    const postTokenBalances = [];
    if (tx.meta.postTokenBalances) {
      for (const postTokenBalance of tx.meta.postTokenBalances) {
        postTokenBalances.push({
          ...postTokenBalance,
          account: this.#getAssociatedTokenAccount(postTokenBalance.mint, postTokenBalance.owner),
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
            from = info.authority;
          }
          if (info.authority === this.#account) {
            if (token) {
              value = BigInt(info.amount);
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
            from = info.authority;
          }
          if (info.authority === this.#account) {
            if (token) {
              value = BigInt(info.tokenAmount.amount);
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
      return new Transaction({
        type: Transaction.TYPE_TRANSFER,
        status: !tx.meta.err,
        id: tx.transaction.signatures[0],
        amount: new Amount(value, this.crypto.decimals),
        incoming,
        from,
        to,
        fee: new Amount(fee, this.platform.decimals),
        timestamp: new Date(tx.blockTime * 1000).getTime(),
        confirmed: true,
        development: this.development,
      });
    }
    if (this.development) {
      console.error('unparsed transaction:', tx);
    }
  }
}
