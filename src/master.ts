/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */
/* eslint-disable import/prefer-default-export */
import { Worker } from 'worker_threads';

export class Master {
  workerPath = `${__dirname}/slave.js`;

  workersCount: number;

  workers: Worker[] = [];

  blockToWorker: { [key: string]: number } = {
    /* [pairAdd]: workerId */
  };

  workerLoad: { [key: number]: number } = {
    /* [ID]: howManyPairsAreAssignedToThisWorker */
  };

  callbacks = {
    BLOCK_UPDATED: this.blockUpdated,
  };

  constructor(workerNum = 2) {
    this.workersCount = workerNum;
  }

  start() {
    for (let i = 0; i < this.workersCount; i += 1) {
      const worker = new Worker(this.workerPath, { workerData: { ID: i } });
      worker.on('message', (msg) => {
        if (msg.type && this.callbacks[msg.type]) {
          if (msg.data) this.callbacks[msg.type](...msg.data);
          else this.callbacks[msg.type]();
        } else {
          console.log(`[WORKER ${i}]`, msg);
        }
      });
      this.workers.push(worker);
      this.workerLoad[i] = 0;
    }

    this.sendNewBlockToWorkers(1, 2);

    this.sendNewBlockToWorkers(3, 4);

    (async () => {
      setInterval(() => {
        console.log('Running');
      }, 5000);
    })();
  }

  blockUpdated(blockName: string) {
    console.log(`Block ${blockName} is updated`);
  }

  workerWithLowestLoad() {
    const keys = Object.keys(this.workerLoad);
    const sortedWorkers = keys.sort((id1, id2) => (this.workerLoad[id1] > this.workerLoad[id2] ? 1 : -1));
    return Number(sortedWorkers[0]);
  }

  sendNewBlockToWorkers = (from: number, to: number) => {
    let workerId = 0;
    const name = `${from}-${to}`;
    if (this.blockToWorker[name]) workerId = this.blockToWorker[name];
    else {
      workerId = this.workerWithLowestLoad();
      this.blockToWorker[name] = workerId;
      this.workerLoad[workerId] += 1;
    }
    console.log('[DELEGATED block]', workerId, name);
    this.workers[workerId].postMessage({
      type: 'UPDATE_BLOCK',
      data: [from, to],
    });
  };
}
