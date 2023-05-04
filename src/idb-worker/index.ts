import type { DBSchema } from 'idb';
import { openDB, deleteDB } from 'idb/with-async-ittr';

import { IDB_EVENT } from './types';

const TABLE_ATTACHMENT  = 'attachments';
const TABLE_CATEGORY    = 'categories';
const TABLE_EXPENSE     = 'expenses';

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
      amount: number,
      datetime: Date, // UTC
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
        console.log("openDB@UPGRADE");
        db.createObjectStore(TABLE_ATTACHMENT, { keyPath: 'id', autoIncrement: true });
        const categories = db.createObjectStore(TABLE_CATEGORY, { keyPath: 'id', autoIncrement: true });
        categories.createIndex('by-name', 'name', { unique: true });
        categories.createIndex('by-color', 'color', { unique: true });
        const expenses = db.createObjectStore(TABLE_EXPENSE, { keyPath: 'id', autoIncrement: true });
        expenses.createIndex('by-datetime', 'datetime');
        expenses.createIndex('by-category', 'category');
        expenses.createIndex('by-attachment', 'attachment');
      },
      blocked(currentVersion, blockedVersion, event) {
        console.log("openDB@BLOCKED:", currentVersion, blockedVersion);
      },
      blocking(currentVersion, blockedVersion, event) {
        console.log("openDB@BLOCKING:", currentVersion, blockedVersion);
      },
      terminated() {
        console.log("openDB@TERMINATED");
      },
    });
  } catch (err) {
    throw(err);
  }
}

async function drop(dbName: string) {
  try {
    await deleteDB(dbName, {
      blocked() {
        console.log("deleteDB@BLOCKED");
      },
    });
  } catch (err) {
    throw(err);
  }
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
  switch (e.data.type) {
    case IDB_EVENT.INITIALIZE:
      try {
        await init(e.data.params.dbName);
        self.postMessage({ type: e.data.type, result: true });
      } catch (err) {
        self.postMessage({ type: e.data.type, error: err.toString() });
      }
      break;
    case IDB_EVENT.DROP:
      try {
        await drop(e.data.params.dbName);
        self.postMessage({ type: e.data.type, result: true });
      } catch (err) {
        self.postMessage({ type: e.data.type, error: err.toString() });
      }
      break;
    case IDB_EVENT.ATTACHMENT_ADD:
      try {
        const id = await database.add(TABLE_ATTACHMENT, {
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
        const attachment = await database.get(TABLE_ATTACHMENT, e.data.params.id);
        self.postMessage({ type: e.data.type, result: attachment });
      } catch (err) {
        self.postMessage({ type: e.data.type, error: err.toString() });
      }
      break;
    case IDB_EVENT.ATTACHMENT_UPDATE:
      try {
        const id = await database.put(TABLE_ATTACHMENT, {
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
        const result = await database.delete(TABLE_ATTACHMENT, e.data.params.id);
        self.postMessage({ type: e.data.type, result: e.data.params.id });
      } catch (err) {
        self.postMessage({ type: e.data.type, error: err.toString() });
      }
      break;

    case IDB_EVENT.CATEGORY_ADD:
      try {
        const id = await database.add(TABLE_CATEGORY, {
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
        const category = await database.get(TABLE_CATEGORY, e.data.params.id);
        self.postMessage({ type: e.data.type, result: category });
      } catch (err) {
        self.postMessage({ type: e.data.type, error: err.toString() });
      }
      break;
    case IDB_EVENT.CATEGORY_GET_ALL:
      try {
        const attachment = await database.getAll(TABLE_CATEGORY);
        self.postMessage({ type: e.data.type, result: attachment });
      } catch (err) {
        self.postMessage({ type: e.data.type, error: err.toString() });
      }
      break;
      break;
    case IDB_EVENT.CATEGORY_UPDATE:
      try {
        const id = await database.put(TABLE_CATEGORY, {
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
      console.log(111, e.data);
      try {
        const result = await database.delete(TABLE_CATEGORY, e.data.params.id);
        self.postMessage({ type: e.data.type, result: e.data.params.id });
      } catch (err) {
        self.postMessage({ type: e.data.type, error: err.toString() });
      }
      break;

    case IDB_EVENT.EXPENSE_ADD:
      try {
        const id = await database.add(TABLE_EXPENSE, {
          amount: e.data.params.amount,
          datetime: e.data.params.datetime,
          category: e.data.params.category,
          description: e.data.params.description,
          attachment: e.data.params.attachment,
        });
        self.postMessage({ type: e.data.type, result: id });
      } catch (err) {
        self.postMessage({ type: e.data.type, error: err.toString() });
      }
      break;
    case IDB_EVENT.EXPENSE_GET:
      try {
        const expense = await database.get(TABLE_EXPENSE, e.data.params.id);
        self.postMessage({ type: e.data.type, result: expense });
      } catch (err) {
        self.postMessage({ type: e.data.type, error: err.toString() });
      }
      break;
    case IDB_EVENT.EXPENSE_GET_RANGE:
      try {
        const keyRange = IDBKeyRange.bound(e.data.params.begin, e.data.params.end);
        let result = await database.getAllFromIndex(TABLE_EXPENSE, 'by-datetime', keyRange);
        self.postMessage({
          type: e.data.type,
          result: {
            list: result,
            begin: e.data.params.begin,
            end: e.data.params.end,
          }
        });
      } catch (err) {
        self.postMessage({ type: e.data.type, error: err.toString() });
      }
      break;
    case IDB_EVENT.EXPENSE_COUNT_CATEGORY:
      try {
        const keyRange = IDBKeyRange.only(e.data.params.category);
        let result = await database.countFromIndex(TABLE_EXPENSE, 'by-category', keyRange);
        self.postMessage({ type: e.data.type, result: result });
      } catch (err) {
        self.postMessage({ type: e.data.type, error: err.toString() });
      }
      break;
    case IDB_EVENT.EXPENSE_UPDATE:
      try {
        const id = await database.put(TABLE_EXPENSE, {
          amount: e.data.params.amount,
          datetime: e.data.params.datetime,
          category: e.data.params.category,
          description: e.data.params.description,
          attachment: e.data.params.attachment,
          id: e.data.params.id,
        });
        self.postMessage({ type: e.data.type, result: id });
      } catch (err) {
        self.postMessage({ type: e.data.type, error: err.toString() });
      }
      break;
    case IDB_EVENT.EXPENSE_DELETE:
      try {
        const result = await database.delete(TABLE_EXPENSE, e.data.params.id);
        self.postMessage({ type: e.data.type, result: e.data.params.id });
      } catch (err) {
        self.postMessage({ type: e.data.type, error: err.toString() });
      }
      break;
  }
}
