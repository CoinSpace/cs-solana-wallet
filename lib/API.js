import { errors } from 'cs-common';

export default class API {
  #wallet;
  constructor(wallet) {
    this.#wallet = wallet;
  }

  async coinBalance(account) {
    const { balance } = await this.#wallet.requestNode({
      url: `api/v1/account/${account}/balance`,
      method: 'GET',
    });
    return BigInt(balance);
  }

  async tokenBalance(account) {
    const { balance } = await this.#wallet.requestNode({
      url: `api/v1/account/${account}/tokenbalance`,
      method: 'GET',
    });
    return BigInt(balance);
  }

  async latestBlockHash() {
    return this.#wallet.requestNode({
      url: 'api/v1/latestBlockhash',
      method: 'GET',
    });
  }

  async fee(message) {
    const { fee } = await this.#wallet.requestNode({
      url: 'api/v1/feeForMessage',
      method: 'POST',
      data: {
        message,
      },
    });
    if (fee.value === null || fee.value === undefined) {
      throw new errors.InternalWalletError(`Invalid fee: ${JSON.stringify(fee)}`);
    }
    return BigInt(fee.value);
  }

  async getRent(size = 0) {
    const { rent } = await this.#wallet.requestNode({
      url: 'api/v1/minimumBalanceForRentExemptAccount',
      method: 'GET',
      params: {
        size,
      },
    });
    return BigInt(rent);
  }

  async isAccountExists(account) {
    const info = await this.#wallet.requestNode({
      url: `api/v1/account/${account}/info`,
      method: 'GET',
    });
    return !!info.data;
  }

  async sendTransaction(transaction) {
    const id = await this.#wallet.requestNode({
      url: 'api/v1/tx/submit',
      method: 'POST',
      data: {
        transaction,
      },
    });
    return id;
  }

  async loadTransactions(account, limit, cursor) {
    const transactions = await this.#wallet.requestNode({
      url: `api/v1/account/${account}/transactions`,
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
}
