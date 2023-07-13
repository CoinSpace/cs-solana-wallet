/* eslint-disable max-len */
import { Amount } from '@coinspace/cs-common';
import Wallet from '../index.js';
import assert from 'assert/strict';
import fs from 'fs/promises';
import sinon from 'sinon';

// either dismiss upset disease clump hazard paddle twist fetch tissue hello buyer
const RANDOM_SEED = Buffer.from('3e818cec5efc7505369fae3f162af61130b673fa9b40e5955d5cde22a85afa03748d074356a281a5fc1dbd0b721357c56095a54de8d4bc6ecaa288f300776ae4', 'hex');
const RANDOM_PUBLIC_KEY = {
  settings: {
    bip44: "m/44'/501'/0'/0'",
  },
  data: 'b15ad93bfe17665bc6e251526f81ab42c5cfae28365f39150298f2b91dc9f0ab',
};

const WALLET_ADDRESS = 'CwKWYm4nepcBV7T3dYMfP5sTu6iVVZTsAF6RxmJn1Wjc';
const TOKEN_ACCOUNT = '3MWaiVQUExbKDVtYNSEDuCaSiT1YM4QKbzRFaQ9jUchy';
const DESTIONATION_ADDRESS = 'Cm5nzKF7zw8VZTCxYrF9nzzGtWCH3bqjUAYh1tJgUAQW';
const DESTIONATION_TOKEN_ACCCOUNT = 'D1ZtyLeohj9us86nfFVDRQrsiyBgKdR9FeYQsz7p7pE1';
const CS_FEE_ADDRESS = '99znZjNvScoKn8WB3eQ96b2xq6umdnECWAZDzzyHDWHx';
const CS_FEE = {
  address: CS_FEE_ADDRESS,
  fee: 0.005,
  minFee: 0.5,
  maxFee: 100,
};
const LATEST_BLOCKHASH = {
  blockhash: '99g7wBuW2ZSNchJidpjW4fLboagcrzrcoVdXm9kjSpex',
  lastValidBlockHeight: 125291980,
};

const TRANSACTION = 'AYZeUCpgFmzuE+DIAOGjVAB9FGOWhwW1MM3nPVoMc6IHM44vCC1Fgj5fB9QEBtARjNKEQ+rYHYXWPvFxTx3G+gYBAAEEsVrZO/4XZlvG4lFSb4GrQsXPrig2XzkVApjyuR3J8Kuuu4f4qyBr5Cqs6GK0Y+r5TZzWaPW3sc44nH0mAj9zn3krevJXDYJ0oZXMzySrXoVJaDGIKUfaWxZz5+YL4WmLAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5Fl/fsBGAzCXShEw9JEnNSdWvm36VcMJehe3qYld8nQIDAgABDAIAAAAAlDV3AAAAAAMCAAIMAgAAAMeuYwEAAAAA';
const TOKEN_TRANSACTION_NEW = 'Ad1nZmX0BIf5JNKEFhu81T2fupG+uhvlvyBXdM5gu1NalYU1tEBmqIn/3fc7tBOj77D9lSCNreeIH0uj+47oKQMBAAYJsVrZO/4XZlvG4lFSb4GrQsXPrig2XzkVApjyuR3J8KuycXBVsB0BSTKONTBLDOgVvlm36zscL72AiprKgaHDbiL4cA4g5i7eMrL4nVzQtczZ75qual7Kz5T1wA2+xwVMrruH+Ksga+QqrOhitGPq+U2c1mj1t7HOOJx9JgI/c587RCyzkSFX8TqTPQE0KC0DK1/+zQGi2/G3eQYI3wAupwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABt324ddloZPZy+FGzut5rBy0he1fWzeROoz1hX7/AKkGp9UXGSxcUSGMyUw9SvF/WNruCJuh/UTj29mKAAAAAIyXJY9OJInxuz0QKRSODYMLWhOZ2v8QhASOe9jb6fhZeRZf37ARgMwl0oRMPSRJzUnVr5t+lXDCXoXt6mJXfJ0CCAcAAQMEBQYHAAYEAgQBAAoMgIQeAAAAAAAG';
const TOKEN_TRANSACTION_EXISTED = 'AZQ1rzW0MmhrXWamuWei7wC7U3f3U6pRfCRLznvRs4wwh2JYhrW7ATQvRAKAAQR4J8TPpAWHxf15KUrWEnkmUQ8BAAIFsVrZO/4XZlvG4lFSb4GrQsXPrig2XzkVApjyuR3J8Ksi+HAOIOYu3jKy+J1c0LXM2e+armpeys+U9cANvscFTLJxcFWwHQFJMo41MEsM6BW+WbfrOxwvvYCKmsqBocNuO0Qss5EhV/E6kz0BNCgtAytf/s0Botvxt3kGCN8ALqcG3fbh12Whk9nL4UbO63msHLSF7V9bN5E6jPWFfv8AqXkWX9+wEYDMJdKETD0kSc1J1a+bfpVwwl6F7epiV3ydAQQEAQMCAAoMgIQeAAAAAAAG';
const TRANSACTIONS = JSON.parse(await fs.readFile('./test/fixtures/transactions.json'));
const TOKEN_TRANSACTIONS = JSON.parse(await fs.readFile('./test/fixtures/token-transactions.json'));

const solanaATsolana = {
  _id: 'solana@solana',
  asset: 'solana',
  platform: 'solana',
  type: 'coin',
  name: 'Solana',
  symbol: 'SOL',
  decimals: 9,
};

const usdcoinATsolana = {
  _id: 'usd-coin@solana',
  platform: 'solana',
  type: 'token',
  address: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
};

let defaultOptionsCoin;
let defaultOptionsToken;

describe('Solana Wallet', () => {
  beforeEach(() => {
    defaultOptionsCoin = {
      crypto: solanaATsolana,
      platform: solanaATsolana,
      cache: { get() {}, set() {} },
      settings: {},
      account: {
        request(...args) { console.log(args); },
        market: {
          getPrice() { return 21.45; },
        },
      },
      apiNode: 'node',
      storage: { get() {}, set() {}, save() {} },
      txPerPage: 5,
    };

    defaultOptionsToken = {
      crypto: usdcoinATsolana,
      platform: solanaATsolana,
      cache: { get() {}, set() {} },
      settings: {},
      account: {
        request(...args) { console.log(args); },
        market: {
          getPrice() { return 1; },
        },
      },
      apiNode: 'node',
      storage: { get() {}, set() {}, save() {} },
      txPerPage: 5,
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('constructor', () => {
    it('create wallet instance (coin)', () => {
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      assert.equal(wallet.state, Wallet.STATE_CREATED);
    });

    it('create wallet instance (token)', () => {
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });
      assert.equal(wallet.state, Wallet.STATE_CREATED);
      assert.equal(wallet.tokenUrl, 'https://explorer.solana.com/address/4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
    });
  });

  describe('create wallet', () => {
    it('should create new wallet with seed (coin)', async () => {
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.create(RANDOM_SEED);
      assert.equal(wallet.state, Wallet.STATE_INITIALIZED);
      assert.equal(wallet.address, WALLET_ADDRESS);
    });

    it('should create new wallet with seed (token)', async () => {
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });
      await wallet.create(RANDOM_SEED);
      assert.equal(wallet.state, Wallet.STATE_INITIALIZED);
      assert.equal(wallet.address, WALLET_ADDRESS);
    });

    it('should fails without seed', async () => {
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await assert.rejects(async () => {
        await wallet.create();
      }, {
        name: 'TypeError',
        message: 'seed must be an instance of Uint8Array or Buffer, undefined provided',
      });
    });
  });

  describe('open wallet', () => {
    it('should open wallet with public key (coin)', async () => {
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      assert.equal(wallet.state, Wallet.STATE_INITIALIZED);
      assert.equal(wallet.address, WALLET_ADDRESS);
    });

    it('should open wallet with public key (token)', async () => {
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      assert.equal(wallet.state, Wallet.STATE_INITIALIZED);
      assert.equal(wallet.address, WALLET_ADDRESS);
    });

    it('should fails without public key', async () => {
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await assert.rejects(async () => {
        await wallet.open();
      }, {
        name: 'TypeError',
        message: 'publicKey must be an instance of Object with data property',
      });
    });
  });

  describe('storage', () => {
    it('should load initial balance from storage (coin)', async () => {
      sinon.stub(defaultOptionsCoin.storage, 'get')
        .withArgs('balance').returns('1234567890');
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      assert.equal(wallet.balance.value, 1234567890n);
    });

    it('should load initial balance from storage (token)', async () => {
      sinon.stub(defaultOptionsToken.storage, 'get')
        .withArgs('balance').returns('1234567890');
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      assert.equal(wallet.balance.value, 1234567890n);
    });
  });

  describe('load', () => {
    it('should load wallet (coin)', async () => {
      sinon.stub(defaultOptionsCoin.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${WALLET_ADDRESS}/balance`,
          baseURL: 'node',
        }).resolves({ balance: 504000000 });
      const storage = sinon.mock(defaultOptionsCoin.storage);
      storage.expects('set').once().withArgs('balance', '504000000');
      storage.expects('save').once();
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();
      assert.equal(wallet.state, Wallet.STATE_LOADED);
      assert.equal(wallet.balance.value, 504000000n);
      storage.verify();
    });

    it('should load wallet (token)', async () => {
      sinon.stub(defaultOptionsToken.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${WALLET_ADDRESS}/balance`,
          baseURL: 'node',
        }).resolves({ balance: 504000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${TOKEN_ACCOUNT}/tokenbalance`,
          baseURL: 'node',
        }).resolves({ balance: 6_000000 });
      const storage = sinon.mock(defaultOptionsToken.storage);
      storage.expects('set').once().withArgs('balance', '6000000');
      storage.expects('save').once();
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();
      assert.equal(wallet.state, Wallet.STATE_LOADED);
      assert.equal(wallet.balance.value, 6000000n);
      storage.verify();
    });

    it('should set STATE_ERROR on error', async () => {
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      sinon.stub(defaultOptionsCoin.account, 'request');
      await assert.rejects(async () => {
        await wallet.load();
      });
      assert.equal(wallet.state, Wallet.STATE_ERROR);
    });
  });

  describe('getPublicKey', () => {
    it('should export public key', async () => {
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.create(RANDOM_SEED);
      const publicKey = wallet.getPublicKey();
      assert.deepEqual(publicKey, RANDOM_PUBLIC_KEY);
    });

    it('public key is valid', async () => {
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.create(RANDOM_SEED);
      const publicKey = wallet.getPublicKey();
      const secondWalet = new Wallet({
        ...defaultOptionsCoin,
      });
      secondWalet.open(publicKey);
      assert.equal(wallet.address, secondWalet.address);
    });
  });

  describe('getPrivateKey', () => {
    it('should export private key', async () => {
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.create(RANDOM_SEED);
      const privateKey = wallet.getPrivateKey(RANDOM_SEED);
      assert.deepEqual(privateKey, [{
        address: WALLET_ADDRESS,
        privatekey: '[120,161,47,54,145,8,9,67,127,33,126,45,190,150,4,182,65,48,133,71,212,91,154,63,121,60,14,47,191,70,209,19,177,90,217,59,254,23,102,91,198,226,81,82,111,129,171,66,197,207,174,40,54,95,57,21,2,152,242,185,29,201,240,171]',
      }]);
    });
  });

  describe('validators', () => {
    describe('validateAddress', () => {
      let wallet;
      beforeEach(async () => {
        sinon.stub(defaultOptionsCoin.account, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${WALLET_ADDRESS}/balance`,
            baseURL: 'node',
          }).resolves({ balance: 504000000 });
        wallet = new Wallet({
          ...defaultOptionsCoin,
        });
        await wallet.open(RANDOM_PUBLIC_KEY);
        await wallet.load();
      });

      it('valid address', async () => {
        assert.ok(await wallet.validateAddress({ address: DESTIONATION_ADDRESS }));
      });

      it('invalid address', async () => {
        await assert.rejects(async () => {
          await wallet.validateAddress({ address: '123' });
        }, {
          name: 'InvalidAddressError',
          message: 'Invalid address "123"',
        });
      });

      it('invalid because token account address', async () => {
        await assert.rejects(async () => {
          await wallet.validateAddress({ address: '3MWaiVQUExbKDVtYNSEDuCaSiT1YM4QKbzRFaQ9jUchy' });
        }, {
          name: 'InvalidAddressError',
          message: 'Invalid address "3MWaiVQUExbKDVtYNSEDuCaSiT1YM4QKbzRFaQ9jUchy"',
        });
      });

      it('own address', async () => {
        await assert.rejects(async () => {
          await wallet.validateAddress({ address: WALLET_ADDRESS });
        }, {
          name: 'DestinationEqualsSourceError',
          message: 'Destination address equals source address',
        });
      });

      it('empty address', async () => {
        await assert.rejects(async () => {
          await wallet.validateAddress({ address: '' });
        }, {
          name: 'EmptyAddressError',
          message: 'Empty address',
        });
      });
    });

    describe('validateAmount (coin)', () => {
      let wallet;
      beforeEach(async () => {
        sinon.stub(defaultOptionsCoin.account, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${WALLET_ADDRESS}/balance`,
            baseURL: 'node',
          }).resolves({ balance: 10_000000000 })
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v4/csfee',
            params: { crypto: 'solana@solana' },
          }).resolves(CS_FEE)
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${DESTIONATION_ADDRESS}/info`,
            baseURL: 'node',
          }).resolves({ })
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v1/minimumBalanceForRentExemptAccount',
            params: { size: 0 },
            baseURL: 'node',
          }).resolves({ rent: 890880 })
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v1/latestBlockhash',
            baseURL: 'node',
          }).resolves(LATEST_BLOCKHASH)
          .withArgs({
            seed: 'device',
            method: 'POST',
            url: 'api/v1/feeForMessage',
            data: sinon.match.any,
            baseURL: 'node',
          }).resolves({ fee: { value: 5000 } });
        wallet = new Wallet({
          ...defaultOptionsCoin,
        });
        await wallet.open(RANDOM_PUBLIC_KEY);
        await wallet.load();
      });

      it('should be valid amount', async () => {
        const valid = await wallet.validateAmount({
          address: DESTIONATION_ADDRESS,
          amount: new Amount(2_000000000n, wallet.crypto.decimals),
        });
        assert.ok(valid);
      });

      it('throw on small amount', async () => {
        await assert.rejects(async () => {
          await wallet.validateAmount({
            address: DESTIONATION_ADDRESS,
            amount: new Amount(0n, wallet.crypto.decimals),
          });
        }, {
          name: 'SmallAmountError',
          message: 'Small amount',
          amount: new Amount(1n, wallet.crypto.decimals),
        });
      });

      it('throw on amount less then rent', async () => {
        await assert.rejects(async () => {
          await wallet.validateAmount({
            address: DESTIONATION_ADDRESS,
            amount: new Amount(890000, wallet.crypto.decimals),
          });
        }, {
          name: 'MinimumReserveDestinationError',
          message: 'Less than minimum reserve on destination address',
          amount: new Amount(890880n, wallet.crypto.decimals),
        });
      });

      it('throw on big amount', async () => {
        await assert.rejects(async () => {
          await wallet.validateAmount({
            address: DESTIONATION_ADDRESS,
            amount: new Amount(10_000000000n, wallet.crypto.decimals),
          });
        }, {
          name: 'BigAmountError',
          message: 'Big amount',
          amount: new Amount(9_950243782n, wallet.crypto.decimals),
        });
      });
    });

    describe('validateAmount (token)', () => {
      let wallet;
      let request;
      beforeEach(async () => {
        request = sinon.stub(defaultOptionsToken.account, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${WALLET_ADDRESS}/balance`,
            baseURL: 'node',
          }).resolves({ balance: 10_000000000 })
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${TOKEN_ACCOUNT}/tokenbalance`,
            baseURL: 'node',
          }).resolves({ balance: 6_000000 })
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${DESTIONATION_TOKEN_ACCCOUNT}/info`,
            baseURL: 'node',
          }).resolves({ })
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v1/minimumBalanceForRentExemptAccount',
            params: { size: 165 },
            baseURL: 'node',
          }).resolves({ rent: 2004480 })
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v1/latestBlockhash',
            baseURL: 'node',
          }).resolves(LATEST_BLOCKHASH)
          .withArgs({
            seed: 'device',
            method: 'POST',
            url: 'api/v1/feeForMessage',
            data: sinon.match.any,
            baseURL: 'node',
          }).resolves({ fee: { value: 5000 } });
        wallet = new Wallet({
          ...defaultOptionsToken,
        });
        await wallet.open(RANDOM_PUBLIC_KEY);
        await wallet.load();
      });

      it('should be valid amount', async () => {
        const valid = await wallet.validateAmount({
          address: DESTIONATION_ADDRESS,
          amount: new Amount(2_000000n, wallet.crypto.decimals),
        });
        assert.ok(valid);
      });

      it('throw on small amount', async () => {
        await assert.rejects(async () => {
          await wallet.validateAmount({
            address: DESTIONATION_ADDRESS,
            amount: new Amount(0n, wallet.crypto.decimals),
          });
        }, {
          name: 'SmallAmountError',
          message: 'Small amount',
          amount: new Amount(1n, wallet.crypto.decimals),
        });
      });

      it('throw coin balance less then fee', async () => {
        request
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${DESTIONATION_TOKEN_ACCCOUNT}/info`,
            baseURL: 'node',
          }).resolves({ data: {} })
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${WALLET_ADDRESS}/balance`,
            baseURL: 'node',
          }).resolves({ balance: 0 });
        await wallet.load();

        await assert.rejects(async () => {
          await wallet.validateAmount({
            address: DESTIONATION_ADDRESS,
            amount: new Amount(2_000000n, wallet.crypto.decimals),
          });
        }, {
          name: 'InsufficientCoinForTokenTransactionError',
          message: 'Insufficient funds for token transaction',
          amount: new Amount(5000n, wallet.platform.decimals),
        });
      });

      it('throw coin balance less then rent', async () => {
        request.withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${WALLET_ADDRESS}/balance`,
          baseURL: 'node',
        }).resolves({ balance: 5000 });
        await wallet.load();

        await assert.rejects(async () => {
          await wallet.validateAmount({
            address: DESTIONATION_ADDRESS,
            amount: new Amount(2_000000n, wallet.crypto.decimals),
          });
        }, {
          name: 'InsufficientCoinForTokenTransactionError',
          message: 'Insufficient funds for token transaction',
          amount: new Amount(2009480n, wallet.platform.decimals),
        });
      });

      it('throw on big amount', async () => {
        await assert.rejects(async () => {
          await wallet.validateAmount({
            address: DESTIONATION_ADDRESS,
            amount: new Amount(10_000000n, wallet.crypto.decimals),
          });
        }, {
          name: 'BigAmountError',
          message: 'Big amount',
          amount: new Amount(6_000000n, wallet.crypto.decimals),
        });
      });
    });
  });

  describe('estimateMaxAmount', () => {
    it('should correct estimate max amount (coin)', async () => {
      sinon.stub(defaultOptionsCoin.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${WALLET_ADDRESS}/balance`,
          baseURL: 'node',
        }).resolves({ balance: 10_000000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v4/csfee',
          params: { crypto: 'solana@solana' },
        }).resolves(CS_FEE)
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${DESTIONATION_ADDRESS}/info`,
          baseURL: 'node',
        }).resolves({ })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/minimumBalanceForRentExemptAccount',
          params: { size: 0 },
          baseURL: 'node',
        }).resolves({ rent: 890880 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/latestBlockhash',
          baseURL: 'node',
        }).resolves(LATEST_BLOCKHASH)
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v1/feeForMessage',
          data: sinon.match.any,
          baseURL: 'node',
        }).resolves({ fee: { value: 5000 } });
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();

      const maxAmount = await wallet.estimateMaxAmount({ address: DESTIONATION_ADDRESS });
      assert.equal(maxAmount.value, 9_950243782n);
    });

    it('should correct estimate max amount (token)', async () => {
      sinon.stub(defaultOptionsToken.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${WALLET_ADDRESS}/balance`,
          baseURL: 'node',
        }).resolves({ balance: 10_000000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${TOKEN_ACCOUNT}/tokenbalance`,
          baseURL: 'node',
        }).resolves({ balance: 6_000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${DESTIONATION_TOKEN_ACCCOUNT}/info`,
          baseURL: 'node',
        }).resolves({ })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/minimumBalanceForRentExemptAccount',
          params: { size: 165 },
          baseURL: 'node',
        }).resolves({ rent: 2004480 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/latestBlockhash',
          baseURL: 'node',
        }).resolves(LATEST_BLOCKHASH)
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v1/feeForMessage',
          data: sinon.match.any,
          baseURL: 'node',
        }).resolves({ fee: { value: 5000 } });
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();

      const maxAmount = await wallet.estimateMaxAmount({ address: DESTIONATION_ADDRESS });
      assert.equal(maxAmount.value, 6_000000n);
    });
  });

  describe('estimateTransactionFee', () => {
    it('should estimate transaction fee (coin)', async () => {
      sinon.stub(defaultOptionsCoin.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${WALLET_ADDRESS}/balance`,
          baseURL: 'node',
        }).resolves({ balance: 10_000000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v4/csfee',
          params: { crypto: 'solana@solana' },
        }).resolves(CS_FEE)
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${DESTIONATION_ADDRESS}/info`,
          baseURL: 'node',
        }).resolves({ })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/minimumBalanceForRentExemptAccount',
          params: { size: 0 },
          baseURL: 'node',
        }).resolves({ rent: 890880 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/latestBlockhash',
          baseURL: 'node',
        }).resolves(LATEST_BLOCKHASH)
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v1/feeForMessage',
          data: sinon.match.any,
          baseURL: 'node',
        }).resolves({ fee: { value: 5000 } });
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();
      const fee = await wallet.estimateTransactionFee({
        address: DESTIONATION_ADDRESS,
        amount: new Amount(2_000000000n, wallet.crypto.decimals),
      });
      assert.deepEqual(fee, new Amount(23315023n, wallet.crypto.decimals));
    });

    it('should estimate transaction fee (token) to new account', async () => {
      sinon.stub(defaultOptionsToken.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${WALLET_ADDRESS}/balance`,
          baseURL: 'node',
        }).resolves({ balance: 10_000000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${TOKEN_ACCOUNT}/tokenbalance`,
          baseURL: 'node',
        }).resolves({ balance: 6_000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${DESTIONATION_TOKEN_ACCCOUNT}/info`,
          baseURL: 'node',
        }).resolves({ })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/minimumBalanceForRentExemptAccount',
          params: { size: 165 },
          baseURL: 'node',
        }).resolves({ rent: 2004480 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/latestBlockhash',
          baseURL: 'node',
        }).resolves(LATEST_BLOCKHASH)
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v1/feeForMessage',
          data: sinon.match.any,
          baseURL: 'node',
        }).resolves({ fee: { value: 5000 } });
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();
      const fee = await wallet.estimateTransactionFee({
        address: DESTIONATION_ADDRESS,
        amount: new Amount(2_000000n, wallet.crypto.decimals),
      });
      assert.deepEqual(fee, new Amount(2009480n, wallet.platform.decimals));
    });

    it('should estimate transaction fee (token) to existed account', async () => {
      sinon.stub(defaultOptionsToken.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${WALLET_ADDRESS}/balance`,
          baseURL: 'node',
        }).resolves({ balance: 10_000000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${TOKEN_ACCOUNT}/tokenbalance`,
          baseURL: 'node',
        }).resolves({ balance: 6_000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${DESTIONATION_TOKEN_ACCCOUNT}/info`,
          baseURL: 'node',
        }).resolves({ data: {} })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/minimumBalanceForRentExemptAccount',
          params: { size: 165 },
          baseURL: 'node',
        }).resolves({ rent: 2004480 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/latestBlockhash',
          baseURL: 'node',
        }).resolves(LATEST_BLOCKHASH)
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v1/feeForMessage',
          data: sinon.match.any,
          baseURL: 'node',
        }).resolves({ fee: { value: 5000 } });
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();
      const fee = await wallet.estimateTransactionFee({
        address: DESTIONATION_ADDRESS,
        amount: new Amount(2_000000n, wallet.crypto.decimals),
      });
      assert.deepEqual(fee, new Amount(5000n, wallet.platform.decimals));
    });
  });

  describe('createTransaction', () => {
    it('should create valid transaction (coin)', async () => {
      const request = sinon.stub(defaultOptionsCoin.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${WALLET_ADDRESS}/balance`,
          baseURL: 'node',
        }).resolves({ balance: 10_000000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v4/csfee',
          params: { crypto: 'solana@solana' },
        }).resolves(CS_FEE)
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${DESTIONATION_ADDRESS}/info`,
          baseURL: 'node',
        }).resolves({ })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/minimumBalanceForRentExemptAccount',
          params: { size: 0 },
          baseURL: 'node',
        }).resolves({ rent: 890880 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/latestBlockhash',
          baseURL: 'node',
        }).resolves(LATEST_BLOCKHASH)
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v1/feeForMessage',
          data: sinon.match.any,
          baseURL: 'node',
        }).resolves({ fee: { value: 5000 } });
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();

      await wallet.createTransaction({
        address: DESTIONATION_ADDRESS,
        amount: new Amount(2_000000000, wallet.crypto.decimals),
      }, RANDOM_SEED);
      assert.equal(wallet.balance.value, 7_976684977n);
      assert.equal(request.withArgs({
        seed: 'device',
        method: 'POST',
        url: 'api/v1/tx/submit',
        data: {
          transaction: TRANSACTION,
        },
        baseURL: 'node',
      }).callCount, 1);
    });

    it('should create valid transaction (token) to new account', async () => {
      const request = sinon.stub(defaultOptionsToken.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${WALLET_ADDRESS}/balance`,
          baseURL: 'node',
        }).resolves({ balance: 10_000000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${TOKEN_ACCOUNT}/tokenbalance`,
          baseURL: 'node',
        }).resolves({ balance: 6_000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${DESTIONATION_TOKEN_ACCCOUNT}/info`,
          baseURL: 'node',
        }).resolves({ })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/minimumBalanceForRentExemptAccount',
          params: { size: 165 },
          baseURL: 'node',
        }).resolves({ rent: 2004480 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/latestBlockhash',
          baseURL: 'node',
        }).resolves(LATEST_BLOCKHASH)
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v1/feeForMessage',
          data: sinon.match.any,
          baseURL: 'node',
        }).resolves({ fee: { value: 5000 } });
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();

      await wallet.createTransaction({
        address: DESTIONATION_ADDRESS,
        amount: new Amount(2_000000, wallet.crypto.decimals),
      }, RANDOM_SEED);
      assert.equal(wallet.balance.value, 4_000000n);
      assert.equal(request.withArgs({
        seed: 'device',
        method: 'POST',
        url: 'api/v1/tx/submit',
        data: {
          transaction: TOKEN_TRANSACTION_NEW,
        },
        baseURL: 'node',
      }).callCount, 1);
    });

    it('should create valid transaction (token) to existed account', async () => {
      const request = sinon.stub(defaultOptionsToken.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${WALLET_ADDRESS}/balance`,
          baseURL: 'node',
        }).resolves({ balance: 10_000000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${TOKEN_ACCOUNT}/tokenbalance`,
          baseURL: 'node',
        }).resolves({ balance: 6_000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${DESTIONATION_TOKEN_ACCCOUNT}/info`,
          baseURL: 'node',
        }).resolves({ data: {} })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/minimumBalanceForRentExemptAccount',
          params: { size: 165 },
          baseURL: 'node',
        }).resolves({ rent: 2004480 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/latestBlockhash',
          baseURL: 'node',
        }).resolves(LATEST_BLOCKHASH)
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v1/feeForMessage',
          data: sinon.match.any,
          baseURL: 'node',
        }).resolves({ fee: { value: 5000 } });
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();

      await wallet.createTransaction({
        address: DESTIONATION_ADDRESS,
        amount: new Amount(2_000000, wallet.crypto.decimals),
      }, RANDOM_SEED);
      assert.equal(wallet.balance.value, 4_000000n);
      assert.equal(request.withArgs({
        seed: 'device',
        method: 'POST',
        url: 'api/v1/tx/submit',
        data: {
          transaction: TOKEN_TRANSACTION_EXISTED,
        },
        baseURL: 'node',
      }).callCount, 1);
    });
  });

  describe('loadTransactions', () => {
    it('should load transactions (coin)', async () => {
      sinon.stub(defaultOptionsCoin.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${WALLET_ADDRESS}/balance`,
          baseURL: 'node',
        }).resolves({ balance: 10_000000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${WALLET_ADDRESS}/transactions`,
          params: sinon.match.object,
          baseURL: 'node',
        }).resolves(TRANSACTIONS);
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();

      const res = await wallet.loadTransactions();
      assert.strictEqual(res.hasMore, false);
      assert.strictEqual(res.transactions.length, 2);
      assert.strictEqual(res.cursor, 'mwdbfJadLpzwcDY9ZmBkhMXd2vcxN5cJD5wq4infnHRVps9YBBtMzUQuCNy6MUgnpXp3dhQphRz3yJ3BwAN3PAZ');
    });

    it('should load transactions (token)', async () => {
      sinon.stub(defaultOptionsToken.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${WALLET_ADDRESS}/balance`,
          baseURL: 'node',
        }).resolves({ balance: 10_000000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${TOKEN_ACCOUNT}/tokenbalance`,
          baseURL: 'node',
        }).resolves({ balance: 6_000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${TOKEN_ACCOUNT}/transactions`,
          params: sinon.match.object,
          baseURL: 'node',
        }).resolves(TOKEN_TRANSACTIONS);
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();

      const res = await wallet.loadTransactions();
      assert.strictEqual(res.hasMore, false);
      assert.strictEqual(res.transactions.length, 2);
      assert.strictEqual(res.cursor, '4jJbjAv2wGTTJ3hLARodj46XDMjVGVfGezVrSrkFP6vtkEoMM3q3sfnetyRi6wsLpTBwc87oeE7kaVfHwcp2N17n');
    });
  });
});
