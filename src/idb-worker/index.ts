import type { DBSchema } from 'idb';
import { openDB } from 'idb/with-async-ittr';

import { IDB_EVENT } from './enums';

interface ExpenseTrackerSchema extends DBSchema {
  attachments: {
    key: number,
    value: {
      mime: string,
      arraybuffer: ArrayBuffer,
    }
  },
  categories: {
    key: number,
    value: {
      name: string,
      color: string,
    },
  },
  expenses: {
    key: number,
    value: {
      datetime: Date,
      category: number,
      description: string,
      attachment: number,
    },
    indexes: { 'by-datetime': Date },
  },
}

let database;

async function init(dbName: string) {

  try {
    database = await openDB(dbName, 1, {
      upgrade(db) {
        console.log("UPGRADE");
        db.createObjectStore('attachments', { keyPath: 'id', autoIncrement: true });
        db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
        const expenses = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
        expenses.createIndex('by-datetime', 'datetime');
      },
      blocked(currentVersion, blockedVersion, event) {
        console.log("BLOCKED:", currentVersion, blockedVersion);
      },
      blocking(currentVersion, blockedVersion, event) {
        console.log("BLOCKING:", currentVersion, blockedVersion);
      },
      terminated() {
        console.log("TERMINATED");
      },
    });
  } catch (err) {
    throw(err);
  }

  //const d = await db.add('articles', {
    //title: 'Article 1',
    //date: new Date('2019-01-01'),
    //body: '…',
  //});
  //console.log(d);

  //{
    //const tx = db.transaction('articles', 'readwrite');
    //await Promise.all([
      //tx.store.add({
        //title: 'Article 2',
        //date: new Date('2019-01-01'),
        //body: '…',
      //}),
      //tx.store.add({
        //title: 'Article 3',
        //date: new Date('2019-01-02'),
        //body: '…',
      //}),
      //tx.done,
    //]);
  //}

  //{
    //try {
      //console.log("searching...");
      //let keyRange = IDBKeyRange.bound(new Date('2019-01-01'), new Date('2019-01-01'));
      //let result = await db.getAllFromIndex('articles', 'date', keyRange);
      //result.forEach(item => {
        //console.log(item);
      //});
    //} catch (err) {
      //console.log(err);
    //}
    //console.log("done!");
  //}

}

/*
 * onmessage
 * {
 *  type: string,
 *  params: any,
 * }
 *
 * postMessage
 * {
 *  type: string,
 *  result: any,
 *  error?: any,
 * }
*/

self.onmessage = async (e) => {
  console.log(e.data.type, e.data.params);
  switch (e.data.type) {
    case IDB_EVENT.INITIALIZE:
      try {
        await init(e.data.params.dbName);
        self.postMessage({ type: e.data.type, result: true });
      } catch (err) {
        self.postMessage({ type: e.data.type, error: err.toString() });
      }
      break;
    case IDB_EVENT.ATTACHMENT_ADD:
      self.postMessage({ type: e.data.type, result: `${e.data.type} PONG ${new Date()}` });
      break;
    case IDB_EVENT.ATTACHMENT_GET:
      self.postMessage({ type: e.data.type, result: `${e.data.type} PONG ${new Date()}` });
      break;
    case IDB_EVENT.ATTACHMENT_UPDATE:
      self.postMessage({ type: e.data.type, result: `${e.data.type} PONG ${new Date()}` });
      break;
    case IDB_EVENT.ATTACHMENT_DELETE:
      self.postMessage({ type: e.data.type, result: `${e.data.type} PONG ${new Date()}` });
      break;

    case IDB_EVENT.CATEGORY_ADD:
      self.postMessage({ type: e.data.type, result: `${e.data.type} PONG ${new Date()}` });
      break;
    case IDB_EVENT.CATEGORY_GET:
      self.postMessage({ type: e.data.type, result: `${e.data.type} PONG ${new Date()}` });
      break;
    case IDB_EVENT.CATEGORY_GET_ALL:
      self.postMessage({ type: e.data.type, result: `${e.data.type} PONG ${new Date()}` });
      break;
    case IDB_EVENT.CATEGORY_UPDATE:
      self.postMessage({ type: e.data.type, result: `${e.data.type} PONG ${new Date()}` });
      break;
    case IDB_EVENT.CATEGORY_DELETE:
      self.postMessage({ type: e.data.type, result: `${e.data.type} PONG ${new Date()}` });
      break;

    case IDB_EVENT.EXPENSE_ADD:
      self.postMessage({ type: e.data.type, result: `${e.data.type} PONG ${new Date()}` });
      break;
    case IDB_EVENT.EXPENSE_GET:
      self.postMessage({ type: e.data.type, result: `${e.data.type} PONG ${new Date()}` });
      break;
    case IDB_EVENT.EXPENSE_GET_BY_INDEX:
      self.postMessage({ type: e.data.type, result: `${e.data.type} PONG ${new Date()}` });
      break;
    case IDB_EVENT.EXPENSE_UPDATE:
      self.postMessage({ type: e.data.type, result: `${e.data.type} PONG ${new Date()}` });
      break;
    case IDB_EVENT.EXPENSE_DELETE:
      self.postMessage({ type: e.data.type, result: `${e.data.type} PONG ${new Date()}` });
      break;
  }
}
