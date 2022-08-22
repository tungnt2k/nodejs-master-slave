const { web3, web3ws, account } = require('../lib/web3');
const { setInBloom, setTopicInBloom } = require('./bloomfilter');
const getDataFromLog = require('./logs');

const BLOCKS_BUFFER_SIZE = 10;



class BlockListener {
  constructor(onNewReserveFound, onNewBlockComplete) {
    this._blockInfoBuffer = [];
    this.ON_NEW_RESERVE_FOUND = onNewReserveFound; // when a new sync event is detected
    this.ON_BLOCK_RESERVES_UPDATE = onNewBlockComplete; // when a new block is fully scraped
  }

  start() {
    this._subLogs = web3ws.eth.subscribe('logs', { topics: [] }, this._processLog.bind(this));
    this._subBlockHeaders = web3ws.eth.subscribe('newBlockHeaders', this._processBlock.bind(this));
  }

  _getBlockInfo(blockNumber) {
    let blockInfo = this._blockInfoBuffer.find((bi) => bi.number == blockNumber);
    if (!blockInfo) {
      // add it...
      blockInfo = new BlockInfo(blockNumber);
      this._blockInfoBuffer.push(blockInfo);
      if (this._blockInfoBuffer.length > BLOCKS_BUFFER_SIZE) {
        this._blockInfoBuffer.splice(0, this._blockInfoBuffer.length - BLOCKS_BUFFER_SIZE);
      }
    }
    return blockInfo;
  }

  _checkBlockCompletion(blockInfo) {
    if (blockInfo.isCompleteOnce) {
      this.ON_BLOCK_RESERVES_UPDATE(blockInfo.number, blockInfo.pairs);
    }
  }

  async _processLog(error, log) {
    const blockInfo = this._getBlockInfo(log.blockNumber);
    const logInfo = getDataFromLog(log);
    if (logInfo) {
      log.returnValues = logInfo;
      log.name = logInfo.name;
    }

    blockInfo.addLog(log, this.ON_NEW_RESERVE_FOUND);

    // console.log(JSON.stringify(log))
    this._checkBlockCompletion(blockInfo);
  }

  async _processBlock(error, data) {
    const blockInfo = this._getBlockInfo(data.number);
    if (!blockInfo.block) {
      blockInfo.setBlock(await web3.eth.getBlock(data.number));
      console.log(`GOT NEW BLOCK ${data.number}`);
      this._checkBlockCompletion(blockInfo);
    }
  }
}
