import EventEmitter from 'events';
import { IDB_EVENT } from './enums';
import { idbWorkerEventEmitter } from './worker-client';

const testIdbWorker = new Worker('/worker.js');

testIdbWorker.onmessage = (e) => {
  if (e.data.type != null && Object.keys(IDB_EVENT).indexOf(e.data.type) > -1) {
    idbWorkerEventEmitter.emit(e.data.type, e.data);
  }
}

function executeWorkerEvent(eventType: string, eventParams: any) {
  return new Promise((resolve, reject) => {
    idbWorkerEventEmitter.addListener(eventType, (data) => {
      if (data.result) {
        resolve(data.result);
      } else if (data.error) {
        reject(data.error);
      }
    });
    testIdbWorker.postMessage({ type: eventType, params: eventParams });
  });
}

export async function runTest(dbName = 'test-expense-tracker') {
  try {
    let result;
    console.log('runTest:', dbName);
    result = await executeWorkerEvent(IDB_EVENT.INITIALIZE, { dbName: dbName });
    console.log(`%c${IDB_EVENT.INITIALIZE}: ${JSON.stringify(result)}`, 'color: green');

    let inputText = new Date().toString();
    let textBlob = new Blob([inputText], { type: 'text/plain' });
    let textBlobArrBuf = await (await fetch(URL.createObjectURL(textBlob))).arrayBuffer();
    result = await executeWorkerEvent(IDB_EVENT.ATTACHMENT_ADD, { mime: textBlob.type, arraybuffer: textBlobArrBuf });
    console.log(`%c${IDB_EVENT.ATTACHMENT_ADD}: ${JSON.stringify(result)} => ${inputText}`, 'color: green');

    let aid = result;
    result = await executeWorkerEvent(IDB_EVENT.ATTACHMENT_GET, { id: aid });
    textBlob = new Blob([result.arraybuffer], { type: result.mime });
    let outputText = await (await fetch(URL.createObjectURL(textBlob))).text();
    console.log(`%c${IDB_EVENT.ATTACHMENT_GET}: ${aid} => ${outputText}`, 'color: green');

    if (inputText !== outputText) {
      throw("Attachment not match!");
    }

    inputText = new Date().getTime().toString();
    textBlob = new Blob([inputText], { type: 'text/plain' });
    textBlobArrBuf = await (await fetch(URL.createObjectURL(textBlob))).arrayBuffer();
    result.mime = textBlob.type;
    result.arraybuffer = textBlobArrBuf;
    result = await executeWorkerEvent(IDB_EVENT.ATTACHMENT_UPDATE, result);
    console.log(`%c${IDB_EVENT.ATTACHMENT_UPDATE}: ${JSON.stringify(result)} => ${inputText}`, 'color: green');

    aid = result;
    result = await executeWorkerEvent(IDB_EVENT.ATTACHMENT_GET, { id: aid });
    textBlob = new Blob([result.arraybuffer], { type: result.mime });
    outputText = await (await fetch(URL.createObjectURL(textBlob))).text();
    console.log(`%c${IDB_EVENT.ATTACHMENT_GET}: ${aid} => ${outputText}`, 'color: green');

    if (inputText !== outputText) {
      throw("Updated attachment not match!");
    }

    result = await executeWorkerEvent(IDB_EVENT.ATTACHMENT_DELETE, { id: aid });
    console.log(`%c${IDB_EVENT.ATTACHMENT_DELETE}: ${aid} => ${result}`, 'color: green');

    let category = { name: "Category 1", color: "#FFFFFF" };
    result = await executeWorkerEvent(IDB_EVENT.CATEGORY_ADD, category);
    console.log(`%c${IDB_EVENT.CATEGORY_ADD}: ${JSON.stringify(result)}`, 'color: green');

    let cid = result;
    result = await executeWorkerEvent(IDB_EVENT.CATEGORY_GET, { id: cid });
    console.log(`%c${IDB_EVENT.CATEGORY_GET}: ${cid} => ${JSON.stringify(result)}`, 'color: green');

    if (result.name !== category.name && result.color !== category.color) {
      throw("Category not match!");
    }

    result = await executeWorkerEvent(IDB_EVENT.CATEGORY_GET_ALL, {});
    console.log(`%c${IDB_EVENT.CATEGORY_GET_ALL}: ${cid} => ${JSON.stringify(result, null, "\t")}`, 'color: green');

  } catch (err) {
    console.error(err);
  }
}
