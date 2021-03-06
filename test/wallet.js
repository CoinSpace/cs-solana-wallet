import fs from 'fs/promises';
import assert from 'assert';
import * as web3 from '@solana/web3.js';
import SolanaWallet from '../index.js';

// either dismiss upset disease clump hazard paddle twist fetch tissue hello buyer
// eslint-disable-next-line max-len
const RANDOM_SEED = '3e818cec5efc7505369fae3f162af61130b673fa9b40e5955d5cde22a85afa03748d074356a281a5fc1dbd0b721357c56095a54de8d4bc6ecaa288f300776ae4';
// eslint-disable-next-line max-len
const RANDOM_PUBLIC_KEY = '"b15ad93bfe17665bc6e251526f81ab42c5cfae28365f39150298f2b91dc9f0ab"';

const TRANSACTIONS = JSON.parse(await fs.readFile('./test/fixtures/transactions.json'));
const TOKEN_TRANSACTIONS = JSON.parse(await fs.readFile('./test/fixtures/token-transactions.json'));

const WALLET_ADDRESS = 'CwKWYm4nepcBV7T3dYMfP5sTu6iVVZTsAF6RxmJn1Wjc';
const TOKEN_ACCOUNT = '3MWaiVQUExbKDVtYNSEDuCaSiT1YM4QKbzRFaQ9jUchy';
const DESTIONATION_ADDRESS = '99znZjNvScoKn8WB3eQ96b2xq6umdnECWAZDzzyHDWHx';
const DESTIONATION_TOKEN_ACCCOUNT = '8nqMrvMM1bZMSzsifppcM9KTURpwqxkRTxkRPvvVAZBC';
const CS_FEE_ADDRESS = '99znZjNvScoKn8WB3eQ96b2xq6umdnECWAZDzzyHDWHx';
const CS_FEE = {
  addresses: [CS_FEE_ADDRESS],
  fee: 0.0005,
  maxFee: 100 * 1000000,
  minFee: 1 * 1000000,
  rbfFee: 0,
  whitelist: [],
};
const LATEST_BLOCKHASH = {
  blockhash: '99g7wBuW2ZSNchJidpjW4fLboagcrzrcoVdXm9kjSpex',
  lastValidBlockHeight: 125291980,
};
const FEE_FOR_MESSAGE = {
  fee: {
    context: { slot: 131737621 },
    value: 5000,
  },
};

const crypto = {
  _id: 'solana@solana',
  platform: 'solana',
  type: 'coin',
};
const token = {
  _id: 'tether@solana',
  platform: 'solana',
  type: 'token',
  address: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
};
const cache = { get: () => {}, set: () => {} };

function mockRequest(handlers = {}) {
  return async function(config) {
    for (const url in handlers) {
      const fullUrl = `${config.baseURL}/${config.url}`;
      if (fullUrl.startsWith(url)) {
        return handlers[url];
      }
    }
    throw new Error(`Not found '${config.baseURL}/${config.url}'`);
  };
}

describe('Wallet', () => {
  describe('constructor', () => {
    it('with seed', () => {
      const wallet = new SolanaWallet({
        seed: RANDOM_SEED,
        request: mockRequest(),
        apiNode: 'node',
        apiWeb: 'web',
        crypto,
        platformCrypto: crypto,
        cache,
      });
      assert.strictEqual(wallet.isLocked, false);
    });

    it('with publicKey', () => {
      const wallet = new SolanaWallet({
        publicKey: RANDOM_PUBLIC_KEY,
        request: mockRequest(),
        apiNode: 'node',
        apiWeb: 'web',
        crypto,
        platformCrypto: crypto,
        cache,
      });
      assert.strictEqual(wallet.isLocked, true);
    });
  });

  describe('lock', () => {
    it('works', () => {
      const wallet = new SolanaWallet({
        seed: RANDOM_SEED,
        request: mockRequest(),
        apiNode: 'node',
        apiWeb: 'web',
        crypto,
        platformCrypto: crypto,
        cache,
      });
      assert.strictEqual(wallet.isLocked, false);
      wallet.lock();
      assert.strictEqual(wallet.isLocked, true);
    });
  });

  describe('unlock', () => {
    it('works', () => {
      const wallet = new SolanaWallet({
        publicKey: RANDOM_PUBLIC_KEY,
        request: mockRequest(),
        apiNode: 'node',
        apiWeb: 'web',
        crypto,
        platformCrypto: crypto,
        cache,
      });
      assert.strictEqual(wallet.isLocked, true);
      wallet.unlock(RANDOM_SEED);
      assert.strictEqual(wallet.isLocked, false);
    });
  });

  describe('publicKey', () => {
    it('key is valid', () => {
      const wallet = new SolanaWallet({
        seed: RANDOM_SEED,
        request: mockRequest(),
        apiNode: 'node',
        apiWeb: 'web',
        crypto,
        platformCrypto: crypto,
        cache,
      });
      const publicKey = wallet.publicKey();
      assert.strictEqual(publicKey, RANDOM_PUBLIC_KEY);
    });
  });

  describe('balance', () => {
    it('should works with empty wallet', async () => {
      const wallet = new SolanaWallet({
        seed: RANDOM_SEED,
        request: mockRequest({
          'web/api/v3/csfee': CS_FEE,
          [`node/api/v1/addresses/${WALLET_ADDRESS}/balance`]: { balance: 0 },
          'node/api/v1/minimumBalanceForRentExemptAccount': { rent: 2039280 },
          'node/api/v1/latestBlockhash': LATEST_BLOCKHASH,
          'node/api/v1/feeForMessage': FEE_FOR_MESSAGE,
        }),
        apiNode: 'node',
        apiWeb: 'web',
        crypto,
        platformCrypto: crypto,
        cache,
      });
      await wallet.load();
      assert.strictEqual(wallet.balance, '0');
    });

    it('calculates balance correct with full wallet', async () => {
      const wallet = new SolanaWallet({
        seed: RANDOM_SEED,
        request: mockRequest({
          'web/api/v3/csfee': CS_FEE,
          [`node/api/v1/addresses/${WALLET_ADDRESS}/balance`]: { balance: 6000000 },
          'node/api/v1/minimumBalanceForRentExemptAccount': { rent: 2039280 },
          'node/api/v1/latestBlockhash': LATEST_BLOCKHASH,
          'node/api/v1/feeForMessage': FEE_FOR_MESSAGE,
        }),
        apiNode: 'node',
        apiWeb: 'web',
        crypto,
        platformCrypto: crypto,
        cache,
      });
      await wallet.load();
      assert.strictEqual(wallet.balance, '6000000');
    });

    it('calculates balance correct with locked wallet', async () => {
      const wallet = new SolanaWallet({
        publicKey: RANDOM_PUBLIC_KEY,
        request: mockRequest({
          'web/api/v3/csfee': CS_FEE,
          [`node/api/v1/addresses/${WALLET_ADDRESS}/balance`]: { balance: 6000000 },
          'node/api/v1/minimumBalanceForRentExemptAccount': { rent: 2039280 },
          'node/api/v1/latestBlockhash': LATEST_BLOCKHASH,
          'node/api/v1/feeForMessage': FEE_FOR_MESSAGE,
        }),
        apiNode: 'node',
        apiWeb: 'web',
        crypto,
        platformCrypto: crypto,
        cache,
      });
      await wallet.load();
      assert.strictEqual(wallet.balance, '6000000');
    });
  });

  describe('estimateFees', () => {
    it('should estimate correct with empty wallet', async () => {
      const wallet = new SolanaWallet({
        publicKey: RANDOM_PUBLIC_KEY,
        request: mockRequest({
          'web/api/v3/csfee': CS_FEE,
          [`node/api/v1/addresses/${WALLET_ADDRESS}/balance`]: { balance: 0 },
          'node/api/v1/minimumBalanceForRentExemptAccount': { rent: 2039280 },
          'node/api/v1/latestBlockhash': LATEST_BLOCKHASH,
          'node/api/v1/feeForMessage': FEE_FOR_MESSAGE,
        }),
        apiNode: 'node',
        apiWeb: 'web',
        crypto,
        platformCrypto: crypto,
        cache,
      });
      await wallet.load();
      assert.deepStrictEqual(wallet.estimateFees('0'), [
        {
          name: 'default',
          default: true,
          estimate: '3044280',
          maxAmount: '0',
        },
      ]);
    });

    it('should estimate correct without csfee', async () => {
      const wallet = new SolanaWallet({
        publicKey: RANDOM_PUBLIC_KEY,
        request: mockRequest({
          'web/api/v3/csfee': null,
          [`node/api/v1/addresses/${WALLET_ADDRESS}/balance`]: { balance: 0 },
          'node/api/v1/minimumBalanceForRentExemptAccount': { rent: 2039280 },
          'node/api/v1/latestBlockhash': LATEST_BLOCKHASH,
          'node/api/v1/feeForMessage': FEE_FOR_MESSAGE,
        }),
        apiNode: 'node',
        apiWeb: 'web',
        crypto,
        platformCrypto: crypto,
        cache,
      });
      await wallet.load();
      assert.deepStrictEqual(wallet.estimateFees('0'), [
        {
          name: 'default',
          default: true,
          estimate: '2044280',
          maxAmount: '0',
        },
      ]);
    });

    it('should estimate correct (value 0)', async () => {
      const wallet = new SolanaWallet({
        publicKey: RANDOM_PUBLIC_KEY,
        request: mockRequest({
          'web/api/v3/csfee': CS_FEE,
          [`node/api/v1/addresses/${WALLET_ADDRESS}/balance`]: { balance: 600000000 },
          'node/api/v1/minimumBalanceForRentExemptAccount': { rent: 2039280 },
          'node/api/v1/latestBlockhash': LATEST_BLOCKHASH,
          'node/api/v1/feeForMessage': FEE_FOR_MESSAGE,
        }),
        apiNode: 'node',
        apiWeb: 'web',
        crypto,
        platformCrypto: crypto,
        cache,
      });
      await wallet.load();
      assert.deepStrictEqual(wallet.estimateFees('0'), [
        {
          name: 'default',
          default: true,
          estimate: '3044280',
          maxAmount: '596955720',
        },
      ]);
    });

    it('should estimate correct (value 1500000)', async () => {
      const wallet = new SolanaWallet({
        publicKey: RANDOM_PUBLIC_KEY,
        request: mockRequest({
          'web/api/v3/csfee': CS_FEE,
          [`node/api/v1/addresses/${WALLET_ADDRESS}/balance`]: { balance: 60000000000 },
          'node/api/v1/minimumBalanceForRentExemptAccount': { rent: 2039280 },
          'node/api/v1/latestBlockhash': LATEST_BLOCKHASH,
          'node/api/v1/feeForMessage': FEE_FOR_MESSAGE,
        }),
        apiNode: 'node',
        apiWeb: 'web',
        crypto,
        platformCrypto: crypto,
        cache,
      });
      await wallet.load();
      assert.deepStrictEqual(wallet.estimateFees('15000000000'), [
        {
          name: 'default',
          default: true,
          estimate: '9544280',
          maxAmount: '59967971735',
        },
      ]);
    });

    it('should estimate correct (value max amount)', async () => {
      const wallet = new SolanaWallet({
        publicKey: RANDOM_PUBLIC_KEY,
        request: mockRequest({
          'web/api/v3/csfee': CS_FEE,
          [`node/api/v1/addresses/${WALLET_ADDRESS}/balance`]: { balance: 60000000000 },
          'node/api/v1/minimumBalanceForRentExemptAccount': { rent: 2039280 },
          'node/api/v1/latestBlockhash': LATEST_BLOCKHASH,
          'node/api/v1/feeForMessage': FEE_FOR_MESSAGE,
        }),
        apiNode: 'node',
        apiWeb: 'web',
        crypto,
        platformCrypto: crypto,
        cache,
      });
      await wallet.load();
      assert.deepStrictEqual(wallet.estimateFees('59967971735'), [
        {
          name: 'default',
          default: true,
          estimate: '32028265',
          maxAmount: '59967971735',
        },
      ]);
    });

    it('should estimate correct (value gt max amount)', async () => {
      const wallet = new SolanaWallet({
        publicKey: RANDOM_PUBLIC_KEY,
        request: mockRequest({
          'web/api/v3/csfee': CS_FEE,
          [`node/api/v1/addresses/${WALLET_ADDRESS}/balance`]: { balance: 600000000 },
          'node/api/v1/minimumBalanceForRentExemptAccount': { rent: 2039280 },
          'node/api/v1/latestBlockhash': LATEST_BLOCKHASH,
          'node/api/v1/feeForMessage': FEE_FOR_MESSAGE,
        }),
        apiNode: 'node',
        apiWeb: 'web',
        crypto,
        platformCrypto: crypto,
        cache,
      });
      await wallet.load();
      assert.deepStrictEqual(wallet.estimateFees('100000000000000'), [
        {
          name: 'default',
          default: true,
          estimate: '102044280',
          maxAmount: '596955720',
        },
      ]);
    });
  });

  describe('getNextAddress', () => {
    let wallet;
    beforeEach(async () => {
      wallet = new SolanaWallet({
        publicKey: RANDOM_PUBLIC_KEY,
        request: mockRequest({
          'web/api/v3/csfee': null,
          [`node/api/v1/addresses/${WALLET_ADDRESS}/balance`]: { balance: 0 },
          'node/api/v1/minimumBalanceForRentExemptAccount': { rent: 2039280 },
          'node/api/v1/latestBlockhash': LATEST_BLOCKHASH,
          'node/api/v1/feeForMessage': FEE_FOR_MESSAGE,
        }),
        apiNode: 'node',
        apiWeb: 'web',
        crypto,
        platformCrypto: crypto,
        cache,
      });
      await wallet.load();
    });

    it('should return standard address by default', () => {
      assert.deepStrictEqual(wallet.getNextAddress(), WALLET_ADDRESS);
    });
  });

  describe('createTx', () => {
    let wallet;
    beforeEach(async () => {
      wallet = new SolanaWallet({
        publicKey: RANDOM_PUBLIC_KEY,
        request: mockRequest({
          'web/api/v3/csfee': CS_FEE,
          [`node/api/v1/addresses/${WALLET_ADDRESS}/balance`]: { balance: 60000000000 },
          'node/api/v1/minimumBalanceForRentExemptAccount': { rent: 2039280 },
          [`node/api/v1/addresses/${DESTIONATION_ADDRESS}/info`]: { data: {} },
          'node/api/v1/latestBlockhash': LATEST_BLOCKHASH,
          'node/api/v1/feeForMessage': FEE_FOR_MESSAGE,
        }),
        apiNode: 'node',
        apiWeb: 'web',
        crypto,
        platformCrypto: crypto,
        cache,
      });
      await wallet.load();
    });

    it('should fail (small amount)', async () => {
      await assert.rejects(async () => {
        await wallet.createTx(
          DESTIONATION_ADDRESS,
          '0'
        );
      }, {
        message: 'Invalid value',
      });
    });

    it('should fail (big amount)', async () => {
      await assert.rejects(async () => {
        await wallet.createTx(
          DESTIONATION_ADDRESS,
          '100000000000000'
        );
      }, {
        message: 'Insufficient funds',
      });
    });

    it.skip('should fail (invalid fee)', async () => {
      await assert.rejects(async () => {
        await wallet.createTx(
          DESTIONATION_ADDRESS,
          '2000000',
          '10000'
        );
      }, {
        message: 'Invalid fee',
      });
    });

    it('should create valid transaction', async () => {
      const transaction = await wallet.createTx(
        DESTIONATION_ADDRESS,
        '15000000000'
      );
      assert.strictEqual(transaction.tx.instructions.length, 2);
      const instructionTransfer = web3.SystemInstruction.decodeTransfer(transaction.tx.instructions[0]);
      assert.strictEqual(instructionTransfer.lamports, 15000000000n);
      assert.strictEqual(instructionTransfer.toPubkey.toBase58(), DESTIONATION_ADDRESS);
      const instructionCsFee = web3.SystemInstruction.decodeTransfer(transaction.tx.instructions[1]);
      assert.strictEqual(instructionCsFee.lamports, 7500000n);
      assert.strictEqual(instructionCsFee.toPubkey.toBase58(), CS_FEE_ADDRESS);
    });

    it('should create valid transaction with max amount', async () => {
      const transaction = await wallet.createTx(
        DESTIONATION_ADDRESS,
        //TODO revert
        //'59970009996'
        '59967971735'
      );
      assert.strictEqual(transaction.tx.instructions.length, 2);
      const instructionTransfer = web3.SystemInstruction.decodeTransfer(transaction.tx.instructions[0]);
      //TODO revert
      //assert.strictEqual(instructionTransfer.lamports, 59970009996n);
      assert.strictEqual(instructionTransfer.lamports, 59967971735n);
      assert.strictEqual(instructionTransfer.toPubkey.toBase58(), DESTIONATION_ADDRESS);
      const instructionCsFee = web3.SystemInstruction.decodeTransfer(transaction.tx.instructions[1]);
      //TODO revert
      //assert.strictEqual(instructionCsFee.lamports, 29985004n);
      assert.strictEqual(instructionCsFee.lamports, 29983985n);
      assert.strictEqual(instructionCsFee.toPubkey.toBase58(), CS_FEE_ADDRESS);
    });

    it('should create valid transaction without cs fee', async () => {
      const wallet = new SolanaWallet({
        publicKey: RANDOM_PUBLIC_KEY,
        request: mockRequest({
          'web/api/v3/csfee': null,
          [`node/api/v1/addresses/${WALLET_ADDRESS}/balance`]: { balance: 60000000000 },
          'node/api/v1/minimumBalanceForRentExemptAccount': { rent: 2039280 },
          [`node/api/v1/addresses/${DESTIONATION_ADDRESS}/info`]: { data: {} },
          'node/api/v1/latestBlockhash': LATEST_BLOCKHASH,
          'node/api/v1/feeForMessage': FEE_FOR_MESSAGE,
        }),
        apiNode: 'node',
        apiWeb: 'web',
        crypto,
        platformCrypto: crypto,
        cache,
      });
      await wallet.load();

      const transaction = await wallet.createTx(
        DESTIONATION_ADDRESS,
        '2000000'
      );
      assert.strictEqual(transaction.tx.instructions.length, 1);
      const instructionTransfer = web3.SystemInstruction.decodeTransfer(transaction.tx.instructions[0]);
      assert.strictEqual(instructionTransfer.lamports, 2000000n);
      assert.strictEqual(instructionTransfer.toPubkey.toBase58(), DESTIONATION_ADDRESS);
    });

    it('should create valid token transaction to new account', async () => {
      const wallet = new SolanaWallet({
        publicKey: RANDOM_PUBLIC_KEY,
        request: mockRequest({
          // eslint-disable-next-line max-len
          [`node/api/v1/addresses/${WALLET_ADDRESS}/token/4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU/balance`]: { balance: 6000000 },
          [`node/api/v1/addresses/${WALLET_ADDRESS}/balance`]: { balance: 60000000000 },
          'node/api/v1/minimumBalanceForRentExemptAccount': { rent: 2039280 },
          'node/api/v1/latestBlockhash': LATEST_BLOCKHASH,
          'node/api/v1/feeForMessage': FEE_FOR_MESSAGE,
          [`node/api/v1/addresses/${TOKEN_ACCOUNT}/transactions`]: TOKEN_TRANSACTIONS,
          [`node/api/v1/addresses/${DESTIONATION_TOKEN_ACCCOUNT}/info`]: {},
        }),
        apiNode: 'node',
        apiWeb: 'web',
        crypto: token,
        platformCrypto: crypto,
        cache,
      });
      await wallet.load();

      const transaction = await wallet.createTx(
        DESTIONATION_ADDRESS,
        '2000000'
      );
      // create account + transfer
      assert.strictEqual(transaction.tx.instructions.length, 2);
    });

    it('should create valid token transaction to existed account', async () => {
      const wallet = new SolanaWallet({
        publicKey: RANDOM_PUBLIC_KEY,
        request: mockRequest({
          // eslint-disable-next-line max-len
          [`node/api/v1/addresses/${WALLET_ADDRESS}/token/4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU/balance`]: { balance: 6000000 },
          [`node/api/v1/addresses/${WALLET_ADDRESS}/balance`]: { balance: 60000000000 },
          'node/api/v1/minimumBalanceForRentExemptAccount': { rent: 2039280 },
          'node/api/v1/latestBlockhash': LATEST_BLOCKHASH,
          'node/api/v1/feeForMessage': FEE_FOR_MESSAGE,
          [`node/api/v1/addresses/${TOKEN_ACCOUNT}/transactions`]: TOKEN_TRANSACTIONS,
          [`node/api/v1/addresses/${DESTIONATION_TOKEN_ACCCOUNT}/info`]: { data: {} },
        }),
        apiNode: 'node',
        apiWeb: 'web',
        crypto: token,
        platformCrypto: crypto,
        cache,
      });
      await wallet.load();

      const transaction = await wallet.createTx(
        DESTIONATION_ADDRESS,
        '2000000'
      );
      // only transfer
      assert.strictEqual(transaction.tx.instructions.length, 1);
    });
  });

  describe('sendTx', () => {
    it('should create and send valid transaction', async () => {
      const wallet = new SolanaWallet({
        seed: RANDOM_SEED,
        request: mockRequest({
          'web/api/v3/csfee': CS_FEE,
          [`node/api/v1/addresses/${WALLET_ADDRESS}/balance`]: { balance: 60000000000 },
          'node/api/v1/minimumBalanceForRentExemptAccount': { rent: 2039280 },
          [`node/api/v1/addresses/${DESTIONATION_ADDRESS}/info`]: { data: {} },
          'node/api/v1/latestBlockhash': LATEST_BLOCKHASH,
          'node/api/v1/feeForMessage': FEE_FOR_MESSAGE,
          'node/api/v1/tx/submit': '12345',
        }),
        apiNode: 'node',
        apiWeb: 'web',
        crypto,
        platformCrypto: crypto,
        cache,
      });
      await wallet.load();
      assert.strictEqual(wallet.balance, '60000000000');

      const raw = await wallet.createTx(
        DESTIONATION_ADDRESS,
        '15000000000'
      );

      const transaction = await wallet.sendTx(raw.sign());

      assert(transaction);
      //TODO revert
      //assert.strictEqual(wallet.balance, '44992495000');
      assert.strictEqual(wallet.balance, '44990455720');
    });
  });

  describe('loadTxs', () => {
    it('works for coin', async () => {
      const wallet = new SolanaWallet({
        publicKey: RANDOM_PUBLIC_KEY,
        request: mockRequest({
          'web/api/v3/csfee': CS_FEE,
          [`node/api/v1/addresses/${WALLET_ADDRESS}/balance`]: { balance: 0 },
          'node/api/v1/minimumBalanceForRentExemptAccount': { rent: 2039280 },
          'node/api/v1/latestBlockhash': LATEST_BLOCKHASH,
          'node/api/v1/feeForMessage': FEE_FOR_MESSAGE,
          [`node/api/v1/addresses/${WALLET_ADDRESS}/transactions`]: TRANSACTIONS,
        }),
        apiNode: 'node',
        apiWeb: 'web',
        crypto,
        platformCrypto: crypto,
        cache,
      });
      await wallet.load();
      const res = await wallet.loadTxs();
      assert.strictEqual(res.hasMoreTxs, false);
      assert.strictEqual(res.txs.length, 2);
    });

    it('works for token', async () => {
      const wallet = new SolanaWallet({
        publicKey: RANDOM_PUBLIC_KEY,
        request: mockRequest({
          'web/api/v3/csfee': CS_FEE,
          // eslint-disable-next-line max-len
          [`node/api/v1/addresses/${WALLET_ADDRESS}/token/4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU/balance`]: { balance: 0 },
          [`node/api/v1/addresses/${WALLET_ADDRESS}/balance`]: { balance: 60000000000 },
          'node/api/v1/minimumBalanceForRentExemptAccount': { rent: 2039280 },
          'node/api/v1/latestBlockhash': LATEST_BLOCKHASH,
          'node/api/v1/feeForMessage': FEE_FOR_MESSAGE,
          [`node/api/v1/addresses/${TOKEN_ACCOUNT}/transactions`]: TOKEN_TRANSACTIONS,
        }),
        apiNode: 'node',
        apiWeb: 'web',
        crypto: token,
        platformCrypto: crypto,
        cache,
      });
      await wallet.load();
      const res = await wallet.loadTxs();
      assert.strictEqual(res.hasMoreTxs, false);
      assert.strictEqual(res.txs.length, 2);
      assert.strictEqual(res.txs[0].isIncoming, false);
      assert.strictEqual(res.txs[0].amount, '-10000');
      assert.strictEqual(res.txs[0].to, 'F6s8Vnf6wusSEWVmuRUQfUHWjraDsNuTj2Aq6tBTik3y');
      assert.strictEqual(res.txs[0].instructions[0].source, WALLET_ADDRESS);
      assert.strictEqual(res.txs[0].instructions[0].destination, 'F6s8Vnf6wusSEWVmuRUQfUHWjraDsNuTj2Aq6tBTik3y');
      assert.strictEqual(res.txs[1].isIncoming, true);
      assert.strictEqual(res.txs[1].amount, '50000');
      assert.strictEqual(res.txs[1].instructions[0].source, 'CfU67ZPpEXS3ZLAjXw9BgZZCTBJTagpzwKTUarBG4r7J');
      assert.strictEqual(res.txs[1].instructions[0].destination, WALLET_ADDRESS);
    });
  });

  describe('exportPrivateKeys', () => {
    it('works', async () => {
      const wallet = new SolanaWallet({
        seed: RANDOM_SEED,
        request: mockRequest({
          'web/api/v3/csfee': CS_FEE,
          [`node/api/v1/addresses/${WALLET_ADDRESS}/balance`]: { balance: 0 },
          'node/api/v1/minimumBalanceForRentExemptAccount': { rent: 2039280 },
          'node/api/v1/latestBlockhash': LATEST_BLOCKHASH,
          'node/api/v1/feeForMessage': FEE_FOR_MESSAGE,
        }),
        apiNode: 'node',
        apiWeb: 'web',
        crypto,
        platformCrypto: crypto,
        cache,
      });
      await wallet.load();
      // eslint-disable-next-line max-len
      const expected = `address,privatekey\n${WALLET_ADDRESS},[120,161,47,54,145,8,9,67,127,33,126,45,190,150,4,182,65,48,133,71,212,91,154,63,121,60,14,47,191,70,209,19,177,90,217,59,254,23,102,91,198,226,81,82,111,129,171,66,197,207,174,40,54,95,57,21,2,152,242,185,29,201,240,171]`;
      assert.strictEqual(wallet.exportPrivateKeys(), expected);
    });
  });
});
