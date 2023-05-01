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

        const categories = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
        categories.createIndex('by-name', 'name', { unique: true });
        categories.createIndex('by-color', 'color', { unique: true });

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
  // console.log(e.data.type, e.data.params);
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
      try {
        const id = await database.add('attachments', {
          mime: e.data.params.mime,
          arraybuffer: e.data.params.arraybuffer,
        });
        self.postMessage({ type: e.data.type, result: id });
      } catch (err) {
        self.postMessage({ type: e.data.type, error: err.toString() });
      }
      break;
    case IDB_EVENT.ATTACHMENT_GET:
      try {
        const attachment = await database.get('attachments', e.data.params.id);
        self.postMessage({ type: e.data.type, result: attachment });
      } catch (err) {
        self.postMessage({ type: e.data.type, error: err.toString() });
      }
      break;
    case IDB_EVENT.ATTACHMENT_UPDATE:
      try {
        const id = await database.put('attachments', {
          mime: e.data.params.mime,
          arraybuffer: e.data.params.arraybuffer,
          id: e.data.params.id,
        });
        self.postMessage({ type: e.data.type, result: id });
      } catch (err) {
        self.postMessage({ type: e.data.type, error: err.toString() });
      }
      break;
    case IDB_EVENT.ATTACHMENT_DELETE:
      try {
        const result = await database.delete('attachments', e.data.params.id);
        self.postMessage({ type: e.data.type, result: true });
      } catch (err) {
        self.postMessage({ type: e.data.type, error: err.toString() });
      }
      break;

    case IDB_EVENT.CATEGORY_ADD:
      try {
        const id = await database.add('categories', {
          name: e.data.params.name,
          color: e.data.params.color,
        });
        self.postMessage({ type: e.data.type, result: id });
      } catch (err) {
        self.postMessage({ type: e.data.type, error: err.toString() });
      }
      break;
    case IDB_EVENT.CATEGORY_GET:
      try {
        const attachment = await database.get('categories', e.data.params.id);
        self.postMessage({ type: e.data.type, result: attachment });
      } catch (err) {
        self.postMessage({ type: e.data.type, error: err.toString() });
      }
      break;
    case IDB_EVENT.CATEGORY_GET_ALL:
      try {
        const attachment = await database.getAll('categories');
        self.postMessage({ type: e.data.type, result: attachment });
      } catch (err) {
        self.postMessage({ type: e.data.type, error: err.toString() });
      }
      break;
      break;
    case IDB_EVENT.CATEGORY_UPDATE:
      try {
        const id = await database.put('categories', {
          name: e.data.params.name,
          color: e.data.params.color,
          id: e.data.params.id,
        });
        self.postMessage({ type: e.data.type, result: id });
      } catch (err) {
        self.postMessage({ type: e.data.type, error: err.toString() });
      }
      break;
    case IDB_EVENT.CATEGORY_DELETE:
      try {
        const result = await database.delete('categories', e.data.params.id);
        self.postMessage({ type: e.data.type, result: true });
      } catch (err) {
        self.postMessage({ type: e.data.type, error: err.toString() });
      }
      break;

    case IDB_EVENT.EXPENSE_ADD:
      self.postMessage({ type: e.data.type, result: `${e.data.type} PONG ${new Date()}` });
      break;
    case IDB_EVENT.EXPENSE_GET:
      self.postMessage({ type: e.data.type, result: `${e.data.type} PONG ${new Date()}` });
      break;
    case IDB_EVENT.EXPENSE_GET_RANGE:
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
