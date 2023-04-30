import EventEmitter from 'events';
import { IDB_EVENT } from './enums';

const idbWorker = new Worker('/worker.js');

const idbWorkerEventEmitter = new EventEmitter();
idbWorkerEventEmitter.setMaxListeners(1000);

idbWorker.onmessage = (e) => {
  if (e.data.type != null && Object.keys(IDB_EVENT).indexOf(e.data.type) > -1) {
    idbWorkerEventEmitter.emit(e.data.type, e.data.result);
  }
}

export {
  idbWorker,
  idbWorkerEventEmitter,
}
