/* eslint-disable no-restricted-syntax */
class BlockInfo {
  _number: number;

  _completeOnceChecks: number;

  _transactions: any;

  _logsBloom: string;

  _pairs: any;

  _block: number;

  constructor(blockNumber: number) {
    this._number = blockNumber;
    this._completeOnceChecks = 0;
    this._transactions = {};
    this._logsBloom = '0x';
    this._pairs = {};
    for (let i = 0; i < 512; i += 1) {
      this._logsBloom += '0';
    }
  }

  setBlock(block: number) {
    this._block = block;
  }

  addLog(log, cb) {
    // this._logs.push(log);
    this._logsBloom = setInBloom(this._logsBloom, log.address);
    for (const topic of log.topics) {
      this._logsBloom = setTopicInBloom(this._logsBloom, topic);
    }
    // console.log('[STREAM]', log.transactionHash, log.name, log.transactionIndex);
    if (log.name) {
      if (!this._pairs[log.address]) this._pairs[log.address] = { events: {}, hash: log.transactionHash };
      if (log.name === 'swap') {
        // router address
        // console.log(log.transactionHash, '[STREAM]', log.returnValues)
        this._pairs[log.address].events.swap = { ...log.returnValues };
      } else if (
        log.name === 'sync' &&
        // set this sync as latest if not other sync was set
        (!this._pairs[log.address].events.sync ||
          // or it is in a more recent transaction with respect to the current sync
          log.transactionIndex > this._pairs[log.address].events.sync.transactionIndex ||
          // or it is in the same transaction as the current sync and it has a higher logIndex
          (log.transactionIndex === this._pairs[log.address].events.sync.transactionIndex &&
            log.logIndex > this._pairs[log.address].events.sync.logIndex))
      ) {
        if (!this._pairs[log.address].sync) this._pairs[log.address].events.sync = {};
        // console.log('[STREAM SYNC]', log.transactionHash, log.address, log.transactionIndex );
        this._pairs[log.address].events.sync.reserve0 = log.returnValues.reserve0;
        this._pairs[log.address].events.sync.reserve1 = log.returnValues.reserve1;
        this._pairs[log.address].events.sync.transactionIndex = log.transactionIndex;
        this._pairs[log.address].events.sync.logIndex = log.logIndex;
        this._pairs[log.address].hash = log.transactionHash;
        cb(log.address, [log.returnValues.reserve0, log.returnValues.reserve1], log.transactionHash, log.blockNumber); // ON_NEW_RESERVE_FOUND
      }
    }
  }

  get isCompleteOnce() {
    // eslint-disable-next-line no-plusplus
    return this.isComplete && this._completeOnceChecks++ === 0;
  }

  get isComplete() {
    return this._block && this._logsBloom === this._block.logsBloom;
  }

  get pairs() {
    return this._pairs;
  }

  get block() {
    return this._block;
  }

  get number() {
    return this._number;
  }
}
