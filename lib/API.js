import { errors } from '@coinspace/cs-common';

export default class API {
  #wallet;
  constructor(wallet) {
    this.#wallet = wallet;
  }

  async coinAccountInfo(account) {
    const info = await this.#wallet.requestNode({
      url: `api/v2/account/${account}/info`,
      method: 'GET',
    });
    return {
      ...info,
      balance: BigInt(info.balance),
    };
  }

  async tokenAccountInfo(token, account) {
    const info = await this.#wallet.requestNode({
      url: `api/v2/token/${token}/${account}/info`,
      method: 'GET',
    });
    return {
      ...info,
      balance: BigInt(info.balance),
    };
  }

  async latestBlockHash() {
    return this.#wallet.requestNode({
      url: 'api/v2/latestBlockhash',
      method: 'GET',
    });
  }

  async fee(message) {
    const { fee } = await this.#wallet.requestNode({
      url: 'api/v2/feeForMessage',
      method: 'POST',
      data: {
        message,
      },
    });
    if (fee === null || fee === undefined) {
      throw new errors.InternalWalletError(`Invalid fee: ${JSON.stringify(fee)}`);
    }
    return BigInt(fee);
  }

  async getRent(size = 0) {
    const { rent } = await this.#wallet.requestNode({
      url: 'api/v2/minimumBalanceForRentExemptAccount',
      method: 'GET',
      params: {
        size,
      },
    });
    return BigInt(rent);
  }

  async isAccountExists(account) {
    const info = await this.#wallet.requestNode({
      url: `api/v2/account/${account}/info`,
      method: 'GET',
    });
    return !!info.exists;
  }

  async sendTransaction(transaction) {
    const id = await this.#wallet.requestNode({
      url: 'api/v2/tx/submit',
      method: 'POST',
      data: {
        transaction,
      },
    });
    return id;
  }

  async loadTransactions(account, limit, cursor) {
    const transactions = await this.#wallet.requestNode({
      url: `api/v2/account/${account}/transactions`,
      method: 'GET',
      params: {
        limit,
        before: cursor,
      },
    });
    return {
      transactions,
      hasMore: transactions.length === limit,
      cursor: transactions[transactions.length - 1]?.transaction?.signatures[0],
    };
  }

  async loadTransaction(id) {
    const transaction = await this.#wallet.requestNode({
      url: `api/v2/tx/${id}`,
      method: 'GET',
    });
    return transaction;
  }
}
