/* eslint-disable max-len */
import assert from 'assert/strict';
import fs from 'fs/promises';
import { hex } from '@scure/base';
import sinon from 'sinon';
import { TOKEN_PROGRAM, TOKEN_PROGRAM2022 } from 'micro-sol-signer';

import { Amount } from '@coinspace/cs-common';
import Wallet, { SolanaTransaction } from '@coinspace/cs-solana-wallet';

// either dismiss upset disease clump hazard paddle twist fetch tissue hello buyer
const RANDOM_SEED = hex.decode('3e818cec5efc7505369fae3f162af61130b673fa9b40e5955d5cde22a85afa03748d074356a281a5fc1dbd0b721357c56095a54de8d4bc6ecaa288f300776ae4');
const RANDOM_PUBLIC_KEY = {
  settings: {
    bip44: "m/44'/501'/0'/0'",
  },
  data: 'b15ad93bfe17665bc6e251526f81ab42c5cfae28365f39150298f2b91dc9f0ab',
};

const WALLET_ADDRESS = 'CwKWYm4nepcBV7T3dYMfP5sTu6iVVZTsAF6RxmJn1Wjc';
const TOKEN_ACCOUNT = '3MWaiVQUExbKDVtYNSEDuCaSiT1YM4QKbzRFaQ9jUchy';
const TOKEN2022_ACCOUNT = '1uU8ZTN4U5obgukLUMQEKTbnUdvqvuae1zhBZrK5rZx';
const DESTIONATION_ADDRESS = 'Cm5nzKF7zw8VZTCxYrF9nzzGtWCH3bqjUAYh1tJgUAQW';
const DESTIONATION_TOKEN_ACCCOUNT = 'D1ZtyLeohj9us86nfFVDRQrsiyBgKdR9FeYQsz7p7pE1';
const DESTIONATION_TOKEN2022_ACCCOUNT = 'CqdJv6KPecqvHSXEMqkJbuc32CLHRs9rwZLy4SarPmYP';
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

const TRANSACTION = 'AQ4Am3Srun5NJRHUsc7Yg/qvuE+Cg2VzX/MnV2yAFsl97WjVXyQ0CM8bamXd23nqcHaOLH2Kb5ylCK+oQpvoHQWAAQABBLFa2Tv+F2ZbxuJRUm+Bq0LFz64oNl85FQKY8rkdyfCrrruH+Ksga+QqrOhitGPq+U2c1mj1t7HOOJx9JgI/c595K3ryVw2CdKGVzM8kq16FSWgxiClH2lsWc+fmC+FpiwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeRZf37ARgMwl0oRMPSRJzUnVr5t+lXDCXoXt6mJXfJ0CAwIAAQwCAAAAAJQ1dwAAAAADAgACDAIAAADHrmMBAAAAAAA=';
const TOKEN_TRANSACTION_NEW = 'AdgZmsiHJCxcC2SOMt3TnIpkMoGMqYjlO1kluuklMIKdSEt4K0A0Gsl/DPd1XigIARNyAaBaCWTMtB4UrhNFcAaAAQAFCLFa2Tv+F2ZbxuJRUm+Bq0LFz64oNl85FQKY8rkdyfCrsnFwVbAdAUkyjjUwSwzoFb5Zt+s7HC+9gIqayoGhw24i+HAOIOYu3jKy+J1c0LXM2e+armpeys+U9cANvscFTIyXJY9OJInxuz0QKRSODYMLWhOZ2v8QhASOe9jb6fhZrruH+Ksga+QqrOhitGPq+U2c1mj1t7HOOJx9JgI/c587RCyzkSFX8TqTPQE0KC0DK1/+zQGi2/G3eQYI3wAupwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABt324ddloZPZy+FGzut5rBy0he1fWzeROoz1hX7/AKl5Fl/fsBGAzCXShEw9JEnNSdWvm36VcMJehe3qYld8nQIDBgABBAUGBwEABwQCBQEACgyAhB4AAAAAAAYA';
const TOKEN2022_TRANSACTION_NEW = 'AfFcVGuWuNbrgTM/Vd3IuwxZ588Auv95V/CXn7DwNRlsoFx7wcCm7S/THuSfAVfx/Has1gZQHFycrQClUNZktASAAQAFCLFa2Tv+F2ZbxuJRUm+Bq0LFz64oNl85FQKY8rkdyfCrr+V9V08q6zn6Bl4npWF6vripEWOnW4WTMbnltiYLVCwAO1NTVmkX7atvXzAkvY7YZcxYDJsCf0Fy+YdBBqI9u4yXJY9OJInxuz0QKRSODYMLWhOZ2v8QhASOe9jb6fhZrruH+Ksga+QqrOhitGPq+U2c1mj1t7HOOJx9JgI/c5+rUJ+UIbEqVds5UP2zdYs8DWwXXwNMDkHnfqXwmRE+DgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABt324e51j94YQl285GzN2rYa/E2DuQ0n/r35KNihi/x5Fl/fsBGAzCXShEw9JEnNSdWvm36VcMJehe3qYld8nQIDBgABBAUGBwEABwQCBQEACgyAhB4AAAAAAAYA';
const TOKEN_TRANSACTION_EXISTED = 'ATPTl5z7VY6zDUvy63Ifd1y5wuDj6BwZAMqRESZ6V/ask+EHUaN8CN5JA8IBKgmJ7MlvTSRNJiqaFamrURXQZQeAAQACBbFa2Tv+F2ZbxuJRUm+Bq0LFz64oNl85FQKY8rkdyfCrIvhwDiDmLt4ysvidXNC1zNnvmq5qXsrPlPXADb7HBUyycXBVsB0BSTKONTBLDOgVvlm36zscL72AiprKgaHDbgbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCpO0Qss5EhV/E6kz0BNCgtAytf/s0Botvxt3kGCN8ALqd5Fl/fsBGAzCXShEw9JEnNSdWvm36VcMJehe3qYld8nQEDBAEEAgAKDICEHgAAAAAABgA=';
const TOKEN2022_TRANSACTION_EXISTED = 'AZ3UbRAQr+XwXhxJchfhlqXulixxnopC+xr/Ef2kdC9no2lYMgaWNWPPfgy0nNaqXHvqdmtQARPFnQwJTlIZ4QaAAQACBbFa2Tv+F2ZbxuJRUm+Bq0LFz64oNl85FQKY8rkdyfCrADtTU1ZpF+2rb18wJL2O2GXMWAybAn9BcvmHQQaiPbuv5X1XTyrrOfoGXielYXq+uKkRY6dbhZMxueW2JgtULAbd9uHudY/eGEJdvORszdq2GvxNg7kNJ/69+SjYoYv8q1CflCGxKlXbOVD9s3WLPA1sF18DTA5B536l8JkRPg55Fl/fsBGAzCXShEw9JEnNSdWvm36VcMJehe3qYld8nQEDBAEEAgAKDICEHgAAAAAABgA=';
const TRANSACTIONS = JSON.parse(await fs.readFile('./test/fixtures/transactions.json'));
const TOKEN_TRANSACTIONS = JSON.parse(await fs.readFile('./test/fixtures/token-transactions.json'));
const TOKEN2022_TRANSACTIONS = JSON.parse(await fs.readFile('./test/fixtures/token-2022-transactions.json'));

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
  name: 'USD Coin',
  symbol: 'USDC',
  address: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  decimals: 6,
};

const yearnFinanceATsolana = {
  _id: 'yearn-finance@solana',
  asset: 'yearn-finance',
  platform: 'solana',
  type: 'token',
  name: 'yearn.finance',
  symbol: 'YFI',
  // off-curve public keys
  address: 'BXZX2JRJFjvKazM1ibeDFxgAngKExb74MRXzXKvgikxX',
  decimals: 8,
};

const paypalusdATsolana = {
  _id: 'paypal-usd@solana',
  asset: 'paypal-usd',
  platform: 'solana',
  type: 'token',
  name: 'PayPal USD',
  symbol: 'PYUSD',
  // token 2022
  address: 'CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM',
  decimals: 6,
};

const COIN_PRICE = 21.45;

let defaultOptionsCoin;
let defaultOptionsToken;

describe('Solana Wallet', () => {
  beforeEach(() => {
    defaultOptionsCoin = {
      crypto: solanaATsolana,
      platform: solanaATsolana,
      cache: { get() {}, set() {} },
      settings: {},
      request(...args) { console.log(args); },
      apiNode: 'node',
      storage: { get() {}, set() {}, save() {} },
      txPerPage: 10,
    };

    defaultOptionsToken = {
      crypto: usdcoinATsolana,
      platform: solanaATsolana,
      cache: { get() {}, set() {} },
      settings: {},
      request(...args) { console.log(args); },
      apiNode: 'node',
      storage: { get() {}, set() {}, save() {} },
      txPerPage: 10,
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

    it('wallet should have tokenUrl static method', () => {
      const url = Wallet.tokenUrl('solana', '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', false);
      assert.equal(url, 'https://explorer.solana.com/address/4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
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

  describe('validateDerivationPath', () => {
    let wallet;
    beforeEach(async () => {
      wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
    });

    it('should validate (correct path)', () => {
      const valid = wallet.validateDerivationPath("m/44'/501'/0'/0'");
      assert.equal(valid, true);
    });

    it('should validate (incorrect path 1)', () => {
      const valid = wallet.validateDerivationPath("m/44'/501'/0'/0");
      assert.equal(valid, false);
    });

    it('should validate (incorrect path 2)', () => {
      const valid = wallet.validateDerivationPath("44'/501'/0'/0'");
      assert.equal(valid, false);
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
      sinon.stub(defaultOptionsCoin, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
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
      sinon.stub(defaultOptionsToken, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 504000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/token/${usdcoinATsolana.address}/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 6_000000, exists: true, owner: TOKEN_PROGRAM });
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

    it('should load wallet (off-curve token)', async () => {
      sinon.stub(defaultOptionsToken, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 504000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/token/${yearnFinanceATsolana.address}/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 6_000000, exists: true, owner: TOKEN_PROGRAM });
      const storage = sinon.mock(defaultOptionsToken.storage);
      storage.expects('set').once().withArgs('balance', '6000000');
      storage.expects('save').once();
      const wallet = new Wallet({
        ...defaultOptionsToken,
        crypto: yearnFinanceATsolana,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();
      assert.equal(wallet.state, Wallet.STATE_LOADED);
      assert.equal(wallet.balance.value, 6000000n);
      storage.verify();
    });

    it('should load wallet (token-2022)', async () => {
      sinon.stub(defaultOptionsToken, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 504000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/token/${paypalusdATsolana.address}/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 6_000000, exists: true, owner: TOKEN_PROGRAM2022 });
      const storage = sinon.mock(defaultOptionsToken.storage);
      storage.expects('set').once().withArgs('balance', '6000000');
      storage.expects('save').once();
      const wallet = new Wallet({
        ...defaultOptionsToken,
        crypto: paypalusdATsolana,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();
      assert.equal(wallet.state, Wallet.STATE_LOADED);
      assert.equal(wallet.balance.value, 6000000n);
      storage.verify();
    });

    it('should load wallet (empty wallet, unknown token)', async () => {
      sinon.stub(defaultOptionsToken, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 504000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/token/${paypalusdATsolana.address}/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 0, exists: false });
      const storage = sinon.mock(defaultOptionsToken.storage);
      storage.expects('set').once().withArgs('balance', '0');
      storage.expects('save').once();
      const wallet = new Wallet({
        ...defaultOptionsToken,
        crypto: paypalusdATsolana,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();
      assert.equal(wallet.state, Wallet.STATE_LOADED);
      assert.equal(wallet.balance.value, 0n);
      storage.verify();
    });

    it('should set STATE_ERROR on error', async () => {
      sinon.stub(defaultOptionsCoin, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).rejects();
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
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
        sinon.stub(defaultOptionsCoin, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v2/account/${WALLET_ADDRESS}/info`,
            baseURL: 'node',
            headers: sinon.match.object,
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
        sinon.stub(defaultOptionsCoin, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v2/account/${WALLET_ADDRESS}/info`,
            baseURL: 'node',
            headers: sinon.match.object,
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
            url: `api/v2/account/${DESTIONATION_ADDRESS}/info`,
            baseURL: 'node',
            headers: sinon.match.object,
          }).resolves({ })
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v2/minimumBalanceForRentExemptAccount',
            params: { size: 0 },
            baseURL: 'node',
            headers: sinon.match.object,
          }).resolves({ rent: 890880 })
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v2/latestBlockhash',
            baseURL: 'node',
            headers: sinon.match.object,
          }).resolves(LATEST_BLOCKHASH)
          .withArgs({
            seed: 'device',
            method: 'POST',
            url: 'api/v2/feeForMessage',
            data: sinon.match.any,
            baseURL: 'node',
            headers: sinon.match.object,
          }).resolves({ fee: 5000 });
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
          price: COIN_PRICE,
        });
        assert.ok(valid);
      });

      it('throw on small amount', async () => {
        await assert.rejects(async () => {
          await wallet.validateAmount({
            address: DESTIONATION_ADDRESS,
            amount: new Amount(0n, wallet.crypto.decimals),
            price: COIN_PRICE,
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
            price: COIN_PRICE,
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
            price: COIN_PRICE,
          });
        }, {
          name: 'BigAmountError',
          message: 'Big amount',
          amount: new Amount(10_000000000n - 5000n - 890880n - 49746786n, wallet.crypto.decimals),
        });
      });
    });

    describe('validateAmount (token)', () => {
      let wallet;
      let request;
      beforeEach(async () => {
        request = sinon.stub(defaultOptionsToken, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v2/account/${WALLET_ADDRESS}/info`,
            baseURL: 'node',
            headers: sinon.match.object,
          }).resolves({ balance: 10_000000000 })
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v2/token/${usdcoinATsolana.address}/${WALLET_ADDRESS}/info`,
            baseURL: 'node',
            headers: sinon.match.object,
          }).resolves({ balance: 6_000000, exists: true, owner: TOKEN_PROGRAM })
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v2/account/${DESTIONATION_TOKEN_ACCCOUNT}/info`,
            baseURL: 'node',
            headers: sinon.match.object,
          }).resolves({ exists: false })
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v2/minimumBalanceForRentExemptAccount',
            params: { size: 165 },
            baseURL: 'node',
            headers: sinon.match.object,
          }).resolves({ rent: 2004480 })
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v2/minimumBalanceForRentExemptAccount',
            params: { size: 0 },
            baseURL: 'node',
            headers: sinon.match.object,
          }).resolves({ rent: 890880 })
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v2/latestBlockhash',
            baseURL: 'node',
            headers: sinon.match.object,
          }).resolves(LATEST_BLOCKHASH)
          .withArgs({
            seed: 'device',
            method: 'POST',
            url: 'api/v2/feeForMessage',
            data: sinon.match.any,
            baseURL: 'node',
            headers: sinon.match.object,
          }).resolves({ fee: 5000 });
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
            url: `api/v2/account/${DESTIONATION_TOKEN_ACCCOUNT}/info`,
            baseURL: 'node',
            headers: sinon.match.object,
          }).resolves({ exists: true })
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v2/account/${WALLET_ADDRESS}/info`,
            baseURL: 'node',
            headers: sinon.match.object,
          }).resolves({ balance: 0 });
        await wallet.load();

        await assert.rejects(async () => {
          await wallet.validateAmount({
            address: DESTIONATION_ADDRESS,
            amount: new Amount(2_000000n, wallet.crypto.decimals),
          });
        }, {
          name: 'InsufficientCoinForTransactionFeeError',
          message: 'Insufficient funds to pay the transaction fee',
          amount: new Amount(895880n, wallet.platform.decimals),
        });
      });

      it('throw coin balance less then rent', async () => {
        request.withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 5000 });
        await wallet.load();

        await assert.rejects(async () => {
          await wallet.validateAmount({
            address: DESTIONATION_ADDRESS,
            amount: new Amount(2_000000n, wallet.crypto.decimals),
          });
        }, {
          name: 'InsufficientCoinForTransactionFeeError',
          message: 'Insufficient funds to pay the transaction fee',
          amount: new Amount(2900360n, wallet.platform.decimals),
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
      sinon.stub(defaultOptionsCoin, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
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
          url: `api/v2/account/${DESTIONATION_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v2/minimumBalanceForRentExemptAccount',
          params: { size: 0 },
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ rent: 890880 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v2/latestBlockhash',
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves(LATEST_BLOCKHASH)
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v2/feeForMessage',
          data: sinon.match.any,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ fee: 5000 });
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();

      const maxAmount = await wallet.estimateMaxAmount({
        address: DESTIONATION_ADDRESS,
        price: COIN_PRICE,
      });
      assert.equal(maxAmount.value, 10_000000000n - 5000n - 890880n - 49746786n);
    });

    it('should correct estimate max amount (token)', async () => {
      sinon.stub(defaultOptionsToken, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 10_000000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/token/${usdcoinATsolana.address}/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 6_000000, exists: true, owner: TOKEN_PROGRAM })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${DESTIONATION_TOKEN_ACCCOUNT}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v2/minimumBalanceForRentExemptAccount',
          params: { size: 165 },
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ rent: 2004480 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v2/latestBlockhash',
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves(LATEST_BLOCKHASH)
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v2/feeForMessage',
          data: sinon.match.any,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ fee: 5000 });
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
      sinon.stub(defaultOptionsCoin, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
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
          url: `api/v2/account/${DESTIONATION_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ exists: false })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v2/minimumBalanceForRentExemptAccount',
          params: { size: 0 },
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ rent: 890880 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v2/latestBlockhash',
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves(LATEST_BLOCKHASH)
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v2/feeForMessage',
          data: sinon.match.any,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ fee: 5000 });
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();
      const fee = await wallet.estimateTransactionFee({
        address: DESTIONATION_ADDRESS,
        amount: new Amount(2_000000000n, wallet.crypto.decimals),
        price: COIN_PRICE,
      });
      assert.deepEqual(fee, new Amount(23315023n, wallet.crypto.decimals));
    });

    it('should estimate transaction fee (token) to new account', async () => {
      sinon.stub(defaultOptionsToken, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 10_000000000, exists: true })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/token/${usdcoinATsolana.address}/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 6_000000, exists: true, owner: TOKEN_PROGRAM })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${DESTIONATION_TOKEN_ACCCOUNT}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ exists: false })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v2/minimumBalanceForRentExemptAccount',
          params: { size: 165 },
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ rent: 2004480 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v2/latestBlockhash',
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves(LATEST_BLOCKHASH)
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v2/feeForMessage',
          data: sinon.match.any,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ fee: 5000 });
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
      sinon.stub(defaultOptionsToken, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 10_000000000, exists: true })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/token/${usdcoinATsolana.address}/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 6_000000, exists: true, owner: TOKEN_PROGRAM })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${DESTIONATION_TOKEN_ACCCOUNT}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ exists: true })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v2/minimumBalanceForRentExemptAccount',
          params: { size: 165 },
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ rent: 2004480 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v2/latestBlockhash',
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves(LATEST_BLOCKHASH)
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v2/feeForMessage',
          data: sinon.match.any,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ fee: 5000 });
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
      sinon.stub(defaultOptionsCoin, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
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
          url: `api/v2/account/${DESTIONATION_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v2/minimumBalanceForRentExemptAccount',
          params: { size: 0 },
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ rent: 890880 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v2/latestBlockhash',
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves(LATEST_BLOCKHASH)
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v2/feeForMessage',
          data: sinon.match.any,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ fee: 5000 })
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v2/tx/submit',
          data: {
            transaction: TRANSACTION,
          },
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves('123456');
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();

      const id = await wallet.createTransaction({
        address: DESTIONATION_ADDRESS,
        amount: new Amount(2_000000000, wallet.crypto.decimals),
        price: COIN_PRICE,
      }, RANDOM_SEED);
      assert.equal(wallet.balance.value, 7_976684977n);
      assert.equal(id, '123456');
    });

    it('should create valid transaction (token) to new account', async () => {
      sinon.stub(defaultOptionsToken, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 10_000000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/token/${usdcoinATsolana.address}/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 6_000000, exists: true, owner: TOKEN_PROGRAM })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${DESTIONATION_TOKEN_ACCCOUNT}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ exists: false })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v2/minimumBalanceForRentExemptAccount',
          params: { size: 165 },
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ rent: 2004480 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v2/latestBlockhash',
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves(LATEST_BLOCKHASH)
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v2/feeForMessage',
          data: sinon.match.any,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ fee: 5000 })
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v2/tx/submit',
          data: {
            transaction: TOKEN_TRANSACTION_NEW,
          },
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves('123456');
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();

      const id = await wallet.createTransaction({
        address: DESTIONATION_ADDRESS,
        amount: new Amount(2_000000, wallet.crypto.decimals),
      }, RANDOM_SEED);
      assert.equal(wallet.balance.value, 4_000000n);
      assert.equal(id, '123456');
    });

    it('should create valid transaction (token) to existed account', async () => {
      sinon.stub(defaultOptionsToken, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 10_000000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/token/${usdcoinATsolana.address}/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 6_000000, exists: true, owner: TOKEN_PROGRAM })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${DESTIONATION_TOKEN_ACCCOUNT}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ exists: true })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v2/minimumBalanceForRentExemptAccount',
          params: { size: 165 },
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ rent: 2004480 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v2/latestBlockhash',
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves(LATEST_BLOCKHASH)
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v2/feeForMessage',
          data: sinon.match.any,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ fee: 5000 })
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v2/tx/submit',
          data: {
            transaction: TOKEN_TRANSACTION_EXISTED,
          },
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves('123456');
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();

      const id = await wallet.createTransaction({
        address: DESTIONATION_ADDRESS,
        amount: new Amount(2_000000, wallet.crypto.decimals),
      }, RANDOM_SEED);
      assert.equal(wallet.balance.value, 4_000000n);
      assert.equal(id, '123456');
    });

    it('should create valid transaction (token-2022) to new account', async () => {
      sinon.stub(defaultOptionsToken, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 10_000000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/token/${paypalusdATsolana.address}/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 6_000000, exists: true, owner: TOKEN_PROGRAM2022 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${DESTIONATION_TOKEN2022_ACCCOUNT}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ exists: false })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v2/minimumBalanceForRentExemptAccount',
          params: { size: 165 },
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ rent: 2004480 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v2/latestBlockhash',
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves(LATEST_BLOCKHASH)
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v2/feeForMessage',
          data: sinon.match.any,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ fee: 5000 })
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v2/tx/submit',
          data: {
            transaction: TOKEN2022_TRANSACTION_NEW,
          },
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves('123456');
      const wallet = new Wallet({
        ...defaultOptionsToken,
        crypto: paypalusdATsolana,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();

      const id = await wallet.createTransaction({
        address: DESTIONATION_ADDRESS,
        amount: new Amount(2_000000, wallet.crypto.decimals),
      }, RANDOM_SEED);
      assert.equal(wallet.balance.value, 4_000000n);
      assert.equal(id, '123456');
    });

    it('should create valid transaction (token-2022) to existed account', async () => {
      sinon.stub(defaultOptionsToken, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 10_000000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/token/${paypalusdATsolana.address}/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 6_000000, exists: true, owner: TOKEN_PROGRAM2022 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${DESTIONATION_TOKEN2022_ACCCOUNT}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ exists: true })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v2/minimumBalanceForRentExemptAccount',
          params: { size: 165 },
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ rent: 2004480 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v2/latestBlockhash',
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves(LATEST_BLOCKHASH)
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v2/feeForMessage',
          data: sinon.match.any,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ fee: 5000 })
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v2/tx/submit',
          data: {
            transaction: TOKEN2022_TRANSACTION_EXISTED,
          },
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves('123456');
      const wallet = new Wallet({
        ...defaultOptionsToken,
        crypto: paypalusdATsolana,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();

      const id = await wallet.createTransaction({
        address: DESTIONATION_ADDRESS,
        amount: new Amount(2_000000, wallet.crypto.decimals),
      }, RANDOM_SEED);
      assert.equal(wallet.balance.value, 4_000000n);
      assert.equal(id, '123456');
    });
  });

  describe('loadTransactions', () => {
    it('should load transactions (coin)', async () => {
      sinon.stub(defaultOptionsCoin, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 10_000000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${WALLET_ADDRESS}/transactions`,
          params: sinon.match.object,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves(TRANSACTIONS);
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();

      const res = await wallet.loadTransactions();
      assert.equal(res.hasMore, false);
      assert.equal(res.transactions.length, 6);
      assert.equal(res.transactions[0].action, SolanaTransaction.ACTION_TOKEN_TRANSFER);
      assert.equal(res.transactions[4].action, SolanaTransaction.ACTION_TRANSFER);
      assert.equal(res.cursor, '4yS6vNUdCXfvuvHWCj19EgZXDTNmeBsh54AYZgRi4dz9MaXi3vhh1H9mTfHiBTvmwPpFnEn1i1yqZ8to76NvyJdA');
    });

    it('should load transactions (token)', async () => {
      sinon.stub(defaultOptionsToken, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 10_000000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/token/${usdcoinATsolana.address}/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 6_000000, exists: true, owner: TOKEN_PROGRAM })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${TOKEN_ACCOUNT}/transactions`,
          params: sinon.match.object,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves(TOKEN_TRANSACTIONS);
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();

      const res = await wallet.loadTransactions();
      assert.equal(res.hasMore, false);
      assert.equal(res.transactions.length, 2);
      assert.equal(res.transactions[0].action, SolanaTransaction.ACTION_TRANSFER);
      assert.equal(res.transactions[0].incoming, false);
      assert.equal(res.transactions[0].amount.value, 4_000000n);
      assert.equal(res.transactions[1].action, SolanaTransaction.ACTION_TRANSFER);
      assert.equal(res.transactions[1].incoming, true);
      assert.equal(res.transactions[1].amount.value, 10_000000n);
      assert.equal(res.cursor, '5iLtZUHJYDFvSXr3qyFewtpDzfb7pVCW11zTccdZJca5chTrFW816GYfHUafkQPmc5rQHxXxm1KyT6chKtssxbxN');
    });

    it('should load transactions (token-2022)', async () => {
      sinon.stub(defaultOptionsToken, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 10_000000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/token/${paypalusdATsolana.address}/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 6_000000, exists: true, owner: TOKEN_PROGRAM2022 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${TOKEN2022_ACCOUNT}/transactions`,
          params: sinon.match.object,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves(TOKEN2022_TRANSACTIONS);
      const wallet = new Wallet({
        ...defaultOptionsToken,
        crypto: paypalusdATsolana,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();

      const res = await wallet.loadTransactions();
      assert.equal(res.hasMore, false);
      assert.equal(res.transactions.length, 2);
      assert.equal(res.transactions[0].action, SolanaTransaction.ACTION_TRANSFER);
      assert.equal(res.transactions[0].incoming, false);
      assert.equal(res.transactions[0].amount.value, 10_000000n);
      assert.equal(res.transactions[1].action, SolanaTransaction.ACTION_TRANSFER);
      assert.equal(res.transactions[1].incoming, true);
      assert.equal(res.transactions[1].amount.value, 100_000000n);
      assert.equal(res.cursor, '375fS4ZGUY7AZXGincPPdx5kRRSKTQe2F9aHXTDYs8WckU76C2G1H3LCn6jSfeN7hMYR2BGNCH3xcViVaMpYTkK7');
    });

    it('should not fail load transactions (new token)', async () => {
      sinon.stub(defaultOptionsToken, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/account/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 10_000000000 })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v2/token/${usdcoinATsolana.address}/${WALLET_ADDRESS}/info`,
          baseURL: 'node',
          headers: sinon.match.object,
        }).resolves({ balance: 0, exists: false });
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });
      await wallet.open(RANDOM_PUBLIC_KEY);
      await wallet.load();

      const res = await wallet.loadTransactions();
      assert.equal(res.hasMore, false);
      assert.equal(res.transactions.length, 0);
    });

  });
});
