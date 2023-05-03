import { writable } from 'svelte/store';
import { IDB_EVENT } from './types';
import { idbWorker, idbWorkerEventEmitter } from './worker-client';

const CATEGORIES_STORE = writable({});

export default CATEGORIES_STORE;

idbWorkerEventEmitter.addListener(IDB_EVENT.CATEGORY_GET_ALL, (data) => {
  if (data.result) {
    let temp: {[key:string]: any} = {};
    data.result.forEach(cat => {
      temp[cat.id] = cat;
    });
    CATEGORIES_STORE.update(n => temp);
  } else if (data.error) {
    alert(data.error);
  }
});

idbWorkerEventEmitter.addListener(IDB_EVENT.CATEGORY_ADD, (data) => {
  if (data.result) {
    idbWorker.postMessage({ type: IDB_EVENT.CATEGORY_GET, params: { id: data.result } });
  } else if (data.error) {
    alert("Duplicate name or color");
  }
});

idbWorkerEventEmitter.addListener(IDB_EVENT.CATEGORY_UPDATE, (data) => {
  if (data.result) {
    idbWorker.postMessage({ type: IDB_EVENT.CATEGORY_GET, params: { id: data.result } });
  } else if (data.error) {
    alert("Duplicate name or color");
  }
});

idbWorkerEventEmitter.addListener(IDB_EVENT.CATEGORY_GET, (data) => {
  if (data.result) {
    CATEGORIES_STORE.update((categories) => {
      categories[data.result.id] = data.result;
      return categories;
    });
  } else if (data.result == null) {
    alert('Category not exist!');
  } else if (data.error) {
    alert(data.error);
  }
});

idbWorkerEventEmitter.addListener(IDB_EVENT.CATEGORY_DELETE, (data) => {
  CATEGORIES_STORE.update((categories) => {
    delete categories[data.result];
    return categories;
  });
});
