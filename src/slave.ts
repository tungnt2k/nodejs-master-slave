/* eslint-disable import/prefer-default-export */
import { parentPort, workerData } from 'worker_threads';

export class Slave {
  ID: number;

  constructor() {
    this.ID = workerData.ID;
  }

  callbacks = {
    UPDATE_BLOCK: this.updateBlock,
  };

  init() {
    parentPort.on('message', (msg) => {
      if (msg.type && this.callbacks[msg.type]) {
        if (msg.data) this.callbacks[msg.type](...msg.data);
        else this.callbacks[msg.type]();
      }
    });
  }

  async updateBlock(from: number, to: number) {
    const start = Date.now();

    // Crawl function

    console.log('[BLOCK UPDATED]', from, '-', to, (Date.now() - start) / 1000);
    parentPort.postMessage({
      type: 'BLOCK_UPDATED',
      data: [`${from}-${to}`],
    });
  }
}

const slave = new Slave();
slave.init();
