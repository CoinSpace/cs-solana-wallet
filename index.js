import BigNumber from 'bignumber.js';
import * as web3 from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import * as HDKey from 'ed25519-hd-key';
import { calculateCsFee, reverseCsFee } from './lib/fee.js';

// https://docs.solana.com/wallet-guide/paper-wallet#hierarchical-derivation
const BIP44_PATH = "m/44'/501'/0'/0'";

export default class SolanaWallet {
  #crypto;
  #platformCrypto;
  #cache;
  #balance;
  #solanaBalance;
  #request;
  #apiNode;
  #apiWeb;

  #secretKey;
  #publicKey;

  #txsPerPage = 5;
  #txsCursor = undefined;
  #hasMoreTxs = true;
  #feeRates = [{
    name: 'default',
    default: true,
  }];
  #tokenAccount;
  #minerFee;
  #rent;
  #csFee;
  #csMinFee;
  #csMaxFee;
  #csSkipMinFee;
  #csFeeAddresses = [];
  #csFeeOff = true;
  #dustThreshold = new BigNumber(1);
  #useTestNetwork;

  get isLocked() {
    return !this.#secretKey;
  }

  get addressTypes() {
    return ['base'];
  }

  get feeRates() {
    return this.#feeRates.map((item) => {
      return {
        name: item.name,
        default: item.default === true,
      };
    });
  }

  get balance() {
    return this.#balance.toString(10);
  }

  get crypto() {
    return this.#crypto;
  }

  get platformCrypto() {
    return this.#platformCrypto;
  }

  constructor(options = {}) {
    if (!options.crypto) {
      throw new TypeError('crypto should be passed');
    }
    this.#crypto = options.crypto;

    if (!options.platformCrypto) {
      throw new TypeError('platformCrypto should be passed');
    }
    this.#platformCrypto = options.platformCrypto;

    if (!options.cache) {
      throw new TypeError('cache should be passed');
    }
    this.#cache = options.cache;

    if (!options.request) {
      throw new TypeError('request should be passed');
    }
    this.#request = options.request;

    if (!options.apiNode) {
      throw new TypeError('apiNode should be passed');
    }
    this.#apiNode = options.apiNode;

    if (!options.apiWeb) {
      throw new TypeError('apiWeb should be passed');
    }
    this.#apiWeb = options.apiWeb;

    if (options.seed) {
      this.#secretKey = HDKey.derivePath(BIP44_PATH, options.seed).key;
      this.#publicKey = web3.Keypair.fromSeed(this.#secretKey).publicKey.toBuffer();
    } else if (options.publicKey) {
      this.#publicKey = Buffer.from(JSON.parse(options.publicKey), 'hex');
    } else {
      throw new TypeError('seed or publicKey should be passed');
    }

    this.#balance = new BigNumber(this.#cache.get('balance') || 0);
    this.#useTestNetwork = !!options.useTestNetwork;
  }

  lock() {
    if (this.#secretKey) {
      this.#secretKey.fill(0);
    }
    this.#secretKey = null;
  }

  unlock(seed) {
    this.#secretKey = HDKey.derivePath(BIP44_PATH, seed).key;
  }

  publicKey() {
    return JSON.stringify(this.#publicKey.toString('hex'));
  }

  #getAddress() {
    return new web3.PublicKey(this.#publicKey).toBase58();
  }

  getNextAddress() {
    return this.#getAddress();
  }

  async load() {
    await this.#loadCsFee();
    if (this.#crypto.type === 'token') {
      this.#tokenAccount = (await spl.getAssociatedTokenAddress(
        new web3.PublicKey(this.#crypto.address),
        new web3.PublicKey(this.#publicKey)
      )).toBase58();
      this.#solanaBalance = await this.#calculateBalance();
    }
    this.#minerFee = await this.#calculateMinerFee();
    this.#rent = await this.#calculateMinimumBalanceForRentExemption();
    this.#balance = this.#crypto.type === 'coin' ? await this.#calculateBalance() : await this.#calculateTokenBalance();
    this.#cache.set('balance', this.#balance);
    this.#txsCursor = undefined;
    this.#hasMoreTxs = true;
    this.#calculateMaxAmounts();
  }

  #requestWeb(config) {
    return this.#request({
      ...config,
      method: 'get',
      seed: 'public',
      baseURL: this.#apiWeb,
    });
  }

  #requestNode(config) {
    return this.#request({
      ...config,
      seed: 'public',
      baseURL: this.#apiNode,
      disableDefaultCatch: true,
    }).catch((err) => {
      if (err.response &&
          err.response.data === 'Transaction leaves an account with a lower balance than rent-exempt minimum') {
        throw new Error(err.response.data);
      }
      if (err.response && err.response.data === 'Insufficient funds for token transaction') {
        const e = new Error(err.response.data);
        e.required = this.#minerFee.plus(this.#rent).toString(10);
        throw e;
      }
      console.error(err);
      throw new Error('cs-node-error');
    });
  }

  async #loadCsFee() {
    if (this.#crypto.type === 'token') {
      return;
    }
    try {
      const result = await this.#requestWeb({
        url: 'api/v3/csfee',
        params: {
          crypto: this.#crypto._id,
        },
      });
      if (result) {
        this.#csFee = result.fee;
        this.#csMinFee = new BigNumber(result.minFee, 10);
        this.#csMaxFee = new BigNumber(result.maxFee, 10);
        this.#csSkipMinFee = result.skipMinFee || false;
        this.#csFeeAddresses = result.addresses;
        this.#csFeeOff = result.addresses.length === 0
          || result.whitelist.includes(this.#getAddress());
      }
    } catch (err) {
      console.error(err);
    }
  }

  async #calculateBalance() {
    const { balance } = await this.#requestNode({
      url: `api/v1/addresses/${this.#getAddress()}/balance`,
      method: 'get',
    });
    return new BigNumber(balance);
  }

  async #calculateTokenBalance() {
    const { balance } = await this.#requestNode({
      url: `api/v1/addresses/${this.#getAddress()}/token/${this.#crypto.address}/balance`,
      method: 'get',
    });
    return new BigNumber(balance);
  }

  #getLatestBlockHash() {
    return this.#requestNode({
      url: 'api/v1/latestBlockhash',
      method: 'get',
    });
  }

  async #isAccountExists(address) {
    const info = await this.#requestNode({
      url: `api/v1/addresses/${address}/info`,
      method: 'get',
    });
    return !!info.data;
  }

  #calculateCsFee(value) {
    return calculateCsFee(value, this.#csFeeOff, this.#csFee, this.#csMinFee, this.#csMaxFee,
      this.#csSkipMinFee, this.#dustThreshold
    );
  }

  // value = value + csFee
  #reverseCsFee(value) {
    return reverseCsFee(value, this.#csFeeOff, this.#csFee, this.#csMinFee, this.#csMaxFee,
      this.#csSkipMinFee, this.#dustThreshold
    );
  }

  async #calculateMinimumBalanceForRentExemption() {
    const { rent } = await this.#requestNode({
      url: 'api/v1/minimumBalanceForRentExemptAccount',
      method: 'get',
      params: {
        size: spl.ACCOUNT_SIZE,
      },
    });
    return new BigNumber(rent);
  }

  async #calculateMinerFee() {
    const publicKey = new web3.PublicKey(this.#publicKey);
    const latestBlockhash = await this.#getLatestBlockHash();
    const tx = new web3.Transaction({
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      feePayer: publicKey,
    });
    tx.add(web3.SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: publicKey,
      lamports: web3.LAMPORTS_PER_SOL,
    }));
    const { fee } = await this.#requestNode({
      url: 'api/v1/feeForMessage',
      method: 'post',
      data: {
        message: tx.compileMessage().serialize().toString('base64'),
      },
    });
    return new BigNumber(fee.value);
  }

  #calculateMaxAmount(feeRate) {
    if (feeRate.name !== 'default') {
      throw new Error('Unsupported fee rate');
    }
    const fee = this.#minerFee.plus(this.#rent);
    if (this.#crypto.type === 'token') {
      return this.#balance;
    }
    if (this.#balance.isLessThanOrEqualTo(fee)) {
      return new BigNumber(0);
    }
    const csFee = this.#reverseCsFee(this.#balance.minus(fee));
    const maxAmount = this.#balance.minus(fee).minus(csFee);
    if (maxAmount.isLessThan(0)) {
      return new BigNumber(0);
    }
    return maxAmount;
  }

  #calculateMaxAmounts() {
    for (const feeRate of this.#feeRates) {
      feeRate.maxAmount = this.#calculateMaxAmount(feeRate);
    }
  }

  estimateFees(value = 0) {
    const amount = new BigNumber(value, 10);
    return this.#feeRates.map((feeRate) => {
      const csFee = this.#calculateCsFee(amount);
      return {
        name: feeRate.name,
        default: feeRate.default === true,
        estimate: csFee.plus(this.#minerFee).plus(this.#rent).toString(10),
        maxAmount: feeRate.maxAmount.toString(10),
      };
    });
  }

  async loadTxs() {
    if (!this.#hasMoreTxs) {
      return [];
    }
    const account = this.#crypto.type === 'coin' ? this.#getAddress() : this.#tokenAccount;
    const transactions = await this.#requestNode({
      url: `api/v1/addresses/${account}/transactions`,
      method: 'get',
      params: {
        limit: this.#txsPerPage,
        before: this.#txsCursor,
      },
    });
    this.#hasMoreTxs = transactions.length === this.#txsPerPage;
    if (transactions.length) {
      this.#txsCursor = transactions[transactions.length - 1].transaction.signatures[0];
    }
    return {
      txs: await this.#transformTxs(transactions),
      hasMoreTxs: this.#hasMoreTxs,
    };
  }

  #transformTxs(txs) {
    return Promise.all(txs.map((tx) => {
      return this.#transformTx(tx);
    }));
  }

  async #transformTx(tx) {
    const address = this.#getAddress();
    const token = this.#crypto.type === 'token' ? this.#crypto.address : false;
    const csFeeAddresses = this.#csFeeAddresses;
    let amount = new BigNumber(0);
    let totalFee = new BigNumber(0);
    let to;
    let isIncoming = false;
    const postTokenBalances = [];
    if (tx.meta.postTokenBalances) {
      for (const postTokenBalance of tx.meta.postTokenBalances) {
        postTokenBalances.push({
          ...postTokenBalance,
          account: (await spl.getAssociatedTokenAddress(
            new web3.PublicKey(postTokenBalance.mint),
            new web3.PublicKey(postTokenBalance.owner)
          )).toBase58(),
        });
      }
    }
    const instructions = [];
    for (const instruction of tx.transaction.message.instructions) {
      if (!token && instruction.program === 'system' && instruction.parsed.type === 'transfer') {
        // SOL coin
        if (csFeeAddresses.includes(instruction.parsed.info.destination)) {
          totalFee = totalFee.plus(instruction.parsed.info.lamports);
        } else {
          if (instruction.parsed.info.destination === address) {
            amount = amount.plus(instruction.parsed.info.lamports);
            isIncoming = true;
          }
          if (instruction.parsed.info.source === address) {
            amount = amount.minus(instruction.parsed.info.lamports);
            to = instruction.parsed.info.destination;
          }
        }
        instructions.push({
          source: instruction.parsed.info.source,
          destination: instruction.parsed.info.destination,
          amount: instruction.parsed.info.lamports,
        });
      }
      if (instruction.program === 'spl-token' && instruction.parsed.type === 'transfer') {
        // Tokens
        const destination = postTokenBalances.find((item) => item.account === instruction.parsed.info.destination);
        if (destination && (!token || destination.mint === token)) {
          if (destination.owner === address) {
            if (token) {
              amount = amount.plus(instruction.parsed.info.amount);
            }
            isIncoming = true;
          }
          if (instruction.parsed.info.authority === address) {
            if (token) {
              amount = amount.minus(instruction.parsed.info.amount);
            }
            to = destination.owner;
          }
          if (token) {
            instructions.push({
              source: instruction.parsed.info.authority,
              destination: destination.owner,
              amount: instruction.parsed.info.amount,
            });
          }
        }
      }
    }
    if (tx.meta.innerInstructions) {
      for (const item of tx.meta.innerInstructions) {
        for (const instruction of item.instructions) {
          if (instruction.program === 'system' && instruction.parsed.type === 'createAccount') {
            if (instruction.parsed.info.source === address) {
              totalFee = totalFee.plus(instruction.parsed.info.lamports);
            }
          }
        }
      }
    }
    return {
      id: tx.transaction.signatures[0],
      to,
      amount: amount.toString(10),
      timestamp: new Date(tx.blockTime * 1000).getTime(),
      fee: !token ? totalFee.plus(tx.meta.fee).toString(10) : undefined,
      isIncoming,
      instructions,
      confirmed: true,
    };
  }

  async createTx(to, value, fee) {
    if (!to) {
      throw new Error('Invalid address');
    }
    if (this.#getAddress() === to) {
      throw new Error('Destination address equal source address');
    }

    const fromPubkey = new web3.PublicKey(this.#publicKey);
    let toPublicKey;
    try {
      toPublicKey = new web3.PublicKey(to);
    } catch (err) {
      throw new Error('Invalid address');
    }

    const amount = new BigNumber(value, 10);
    if (amount.isLessThan(this.#dustThreshold)) {
      const error = new Error('Invalid value');
      error.dustThreshold = this.#dustThreshold.toString(10);
      throw error;
    }

    let csFee;
    let totalFee;

    const latestBlockhash = await this.#getLatestBlockHash();
    const tx = new web3.Transaction({
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });

    if (this.#crypto.type === 'coin') {
      const isAccountExists = await this.#isAccountExists(toPublicKey.toBase58());
      csFee = this.#calculateCsFee(amount);
      totalFee = csFee.plus(this.#minerFee);
      if (!isAccountExists) {
        totalFee = totalFee.plus(this.#rent);
        if (amount.isLessThan(this.#rent)) {
          throw new Error('Transaction leaves an account with a lower balance than rent-exempt minimum');
        }
      }

      if (!totalFee.isFinite() || totalFee.isGreaterThan(fee)) {
        throw new Error('Invalid fee');
      }
      if (this.#balance.isLessThan(amount.plus(totalFee))) {
        throw new Error('Insufficient funds');
      }

      tx.add(web3.SystemProgram.transfer({
        fromPubkey,
        toPubkey: toPublicKey,
        lamports: amount.toString(10),
      }));

      if (csFee.isGreaterThan(0)) {
        tx.add(web3.SystemProgram.transfer({
          fromPubkey,
          toPubkey: new web3.PublicKey(this.#csFeeAddresses[0]),
          lamports: csFee.toString(10),
        }));
      }
    } else {
      // token
      totalFee = this.#minerFee;
      const mint = new web3.PublicKey(this.#crypto.address);
      const sourceAddress = await spl.getAssociatedTokenAddress(mint, fromPubkey);
      const destinationAddress = await spl.getAssociatedTokenAddress(mint, toPublicKey);
      const isAccountExists = await this.#isAccountExists(destinationAddress.toBase58());
      if (!isAccountExists) {
        // token account doesn't exist
        totalFee = totalFee.plus(this.#rent);
        tx.add(spl.createAssociatedTokenAccountInstruction(fromPubkey, destinationAddress, toPublicKey, mint));
      }
      if (!totalFee.isFinite() || totalFee.isGreaterThan(fee)) {
        throw new Error('Invalid fee');
      }
      if (this.#solanaBalance.isLessThan(totalFee)) {
        const err = new Error('Insufficient funds for token transaction');
        err.required = totalFee.toString(10);
        throw err;
      }
      tx.add(spl.createTransferInstruction(sourceAddress, destinationAddress, fromPubkey, amount.toNumber()));
    }

    return {
      wallet: this,
      tx,
      to,
      amount: amount.negated().toString(10),
      total: this.#crypto.type === 'coin' ? amount.plus(totalFee) : amount,
      timestamp: new Date(),
      fee: totalFee.toString(10),
      isIncoming: false,
      confirmed: true,
      sign() {
        this.wallet.signTx(tx);
        return this;
      },
    };
  }

  signTx(tx) {
    tx.sign(web3.Keypair.fromSeed(Buffer.from(this.#secretKey)));
  }

  async sendTx(transaction) {
    const id = await this.#requestNode({
      url: 'api/v1/tx/submit',
      method: 'post',
      data: {
        transaction: transaction.tx.serialize().toString('base64'),
      },
    });
    this.#balance = this.#balance.minus(transaction.total);
    this.#calculateMaxAmounts();
    return {
      id,
      ...transaction,
    };
  }

  txUrl(txId) {
    if (this.#useTestNetwork) {
      return `https://explorer.solana.com/tx/${txId}?cluster=devnet`;
    } else {
      return `https://blockchair.com/solana/transaction/${txId}?from=coinwallet`;
    }
  }

  exportPrivateKeys() {
    const keypair = web3.Keypair.fromSeed(Buffer.from(this.#secretKey));
    return `address,privatekey\n${this.#getAddress()},[${keypair.secretKey.toString()}]`;
  }
}
