import BigNumber from 'bignumber.js';
import * as web3 from '@solana/web3.js';
import * as HDKey from 'ed25519-hd-key';
import { calculateCsFee, reverseCsFee } from './lib/fee.js';

const BIP44_PATH = "m/44'/501'/0'/1'";

export default class SolanaWallet {
  #crypto;
  #cache;
  #balance;
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
  #minerFee;
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

  constructor(options = {}) {
    if (!options.crypto) {
      throw new TypeError('crypto should be passed');
    }
    this.#crypto = options.crypto;

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
      // https://docs.solana.com/wallet-guide/paper-wallet#hierarchical-derivation
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
    this.#minerFee = await this.#calculateMinerFee();
    this.#balance = await this.#calculateBalance();
    this.#cache.set('balance', this.#balance);
    this.#txsCursor = undefined;
    this.#hasMoreTxs = true;
    for (const feeRate of this.#feeRates) {
      feeRate.maxAmount = this.#calculateMaxAmount(feeRate);
    }
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
      console.error(err);
      throw new Error('cs-node-error');
    });
  }

  async #loadCsFee() {
    try {
      const result = await this.#requestWeb({
        url: 'api/v3/csfee',
        params: {
          crypto: this.#crypto._id,
        },
      });
      this.#csFee = result.fee;
      this.#csMinFee = new BigNumber(result.minFee, 10);
      this.#csMaxFee = new BigNumber(result.maxFee, 10);
      this.#csSkipMinFee = result.skipMinFee || false;
      this.#csFeeAddresses = result.addresses;
      this.#csFeeOff = result.addresses.length === 0
        || result.whitelist.includes(this.#getAddress());
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

  #getLatestBlockHash() {
    return this.#requestNode({
      url: 'api/v1/latestBlockhash',
      method: 'get',
    });
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

  async #calculateMinerFee() {
    const publicKey = new web3.PublicKey(this.#publicKey);
    const latestBlockhash = await this.#getLatestBlockHash();
    const tx = new web3.Transaction({
      recentBlockhash: latestBlockhash.blockhash,
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

    if (this.#balance.isLessThanOrEqualTo(this.#minerFee)) {
      return new BigNumber(0);
    }
    const csFee = this.#reverseCsFee(this.#balance.minus(this.#minerFee));
    const maxAmount = this.#balance.minus(this.#minerFee).minus(csFee);
    if (maxAmount.isLessThan(0)) {
      return new BigNumber(0);
    }
    return maxAmount;
  }

  estimateFees(value = 0) {
    const amount = new BigNumber(value, 10);
    return this.#feeRates.map((feeRate) => {
      const csFee = this.#calculateCsFee(amount);
      return {
        name: feeRate.name,
        default: feeRate.default === true,
        estimate: csFee.plus(this.#minerFee).toString(10),
        maxAmount: feeRate.maxAmount.toString(10),
      };
    });
  }

  async loadTxs() {
    if (!this.#hasMoreTxs) {
      return [];
    }
    const transactions = await this.#requestNode({
      url: `api/v1/addresses/${this.#getAddress()}/transactions`,
      method: 'get',
      params: {
        limit: this.#txsPerPage,
        before: this.#txsCursor,
      },
    });
    this.#hasMoreTxs = transactions.length === this.#txsPerPage;
    if (transactions.length) {
      this.#txsCursor = transactions[0].transaction.signatures[0];
    }
    return {
      txs: this.#transformTxs(transactions),
      hasMoreTxs: this.#hasMoreTxs,
    };
  }

  #transformTxs(txs) {
    return txs.map((tx) => {
      return this.#transformTx(tx);
    });
  }

  #transformTx(tx) {
    const address = this.#getAddress();
    const csFeeAddresses = this.#csFeeAddresses;
    let amount = new BigNumber(0);
    let csFee = new BigNumber(0);
    const instructions = [];
    for (const instruction of tx.transaction.message.instructions) {
      if (instruction.parsed.type === 'transfer') {
        if (instruction.parsed.info.destination === address) {
          amount = amount.plus(instruction.parsed.info.lamports);
        }
        if (instruction.parsed.info.source === address) {
          amount = amount.minus(instruction.parsed.info.lamports);
        }
        if (csFeeAddresses.includes(instruction.parsed.info.destination)) {
          csFee = csFee.plus(instruction.parsed.info.lamports);
        }
        instructions.push({
          source: instruction.parsed.info.source,
          destination: instruction.parsed.info.destination,
          amount: instruction.parsed.info.lamports,
        });
      }
    }
    return {
      id: tx.transaction.signatures[0],
      to: tx.transaction.message.instructions.find((item) => item.parsed.type === 'transfer').parsed.info.destination,
      amount: amount.toString(10),
      timestamp: new Date(tx.blockTime * 1000).getTime(),
      // TODO Confirmations
      confirmed: true,
      minConf: 0,
      confirmations: 1,
      fee: csFee.plus(tx.meta.fee),
      isIncoming: amount.isGreaterThanOrEqualTo(0),
      instructions,
    };
  }

  async createTx(to, value, fee) {
    if (!to) {
      throw new Error('Invalid address');
    }
    if (this.#getAddress() === to) {
      throw new Error('Destination address equal source address');
    }

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

    const totalFee = new BigNumber(fee, 10);
    const csFee = this.#calculateCsFee(amount);

    if (!totalFee.isFinite() || totalFee.isLessThan(csFee.plus(this.#minerFee))) {
      throw new Error('Invalid fee');
    }
    if (this.#balance.isLessThan(amount.plus(totalFee))) {
      throw new Error('Insufficient funds');
    }

    const latestBlockhash = await this.#getLatestBlockHash();
    const tx = new web3.Transaction({
      recentBlockhash: latestBlockhash.blockhash,
    });
    tx.add(web3.SystemProgram.transfer({
      fromPubkey: new web3.PublicKey(this.#publicKey),
      toPubkey: toPublicKey,
      lamports: amount.toString(10),
    }));

    if (csFee.isGreaterThan(0)) {
      tx.add(web3.SystemProgram.transfer({
        fromPubkey: new web3.PublicKey(this.#publicKey),
        toPubkey: new web3.PublicKey(this.#csFeeAddresses[0]),
        lamports: csFee.toString(10),
      }));
    }

    return {
      tx,
      sign: () => {
        return this.signTx(tx);
      },
    };
  }

  signTx(tx) {
    tx.sign(web3.Keypair.fromSeed(Buffer.from(this.#secretKey)));
    return tx.serialize();
  }

  async sendTx(tx) {
    const res = await this.#requestNode({
      url: 'api/v1/tx/submit',
      method: 'post',
      data: {
        transaction: tx.toString('base64'),
      },
    });
    return res;
  }

  txUrl(txId) {
    if (this.#useTestNetwork) {
      return `https://explorer.solana.com/tx/${txId}?cluster=devnet`;
    } else {
      return `https://blockchair.com/solana/transaction/${txId}?from=coinwallet`;
    }
  }

  exportPrivateKeys() {
    // TODO
  }
}
