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

function stringToColour(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  var colour = '#';
  for (var i = 0; i < 3; i++) {
    var value = (hash >> (i * 8)) & 0xFF;
    colour += ('00' + value.toString(16)).substr(-2);
  }
  return colour;
}

export async function runTest(dbName = 'test-expense-tracker') {
  try {

    // initilize database
    let result;
    console.log('runTest:', dbName);
    result = await executeWorkerEvent(IDB_EVENT.INITIALIZE, { dbName: dbName });
    console.log(`%c${IDB_EVENT.INITIALIZE}: ${JSON.stringify(result)}`, 'color: green');

    // attachments
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

    // categories
    let category = { name: inputText, color: stringToColour(inputText) };
    result = await executeWorkerEvent(IDB_EVENT.CATEGORY_ADD, category);
    console.log(`%c${IDB_EVENT.CATEGORY_ADD}: ${JSON.stringify(result)} => ${JSON.stringify(category)}`, 'color: green');

    let cid = result;
    result = await executeWorkerEvent(IDB_EVENT.CATEGORY_GET, { id: cid });
    console.log(`%c${IDB_EVENT.CATEGORY_GET}: ${cid} => ${JSON.stringify(result)}`, 'color: green');

    if (result.name !== category.name && result.color !== category.color) {
      throw("Category not match!");
    }

    const updateCategory = result;
    updateCategory.name = result.name.substring(0, 10);
    updateCategory.color = stringToColour(result.name);
    result = await executeWorkerEvent(IDB_EVENT.CATEGORY_UPDATE, updateCategory);
    console.log(`%c${IDB_EVENT.CATEGORY_UPDATE}: ${JSON.stringify(result)} => ${JSON.stringify(updateCategory)}`, 'color: green');

    cid = result;
    result = await executeWorkerEvent(IDB_EVENT.CATEGORY_GET, { id: cid });
    console.log(`%c${IDB_EVENT.CATEGORY_GET}: ${cid} => ${JSON.stringify(result)}`, 'color: green');

    if (result.name !== updateCategory.name && result.color !== updateCategory.color) {
      throw("Updated category not match!");
    }

    result = await executeWorkerEvent(IDB_EVENT.CATEGORY_DELETE, { id: cid });
    console.log(`%c${IDB_EVENT.CATEGORY_DELETE}: ${cid} => ${result}`, 'color: green');

    result = await executeWorkerEvent(IDB_EVENT.CATEGORY_GET_ALL, {});
    console.log(`%c${IDB_EVENT.CATEGORY_GET_ALL}: Total Categories => ${JSON.stringify(result.length)}`, 'color: green');

    // expenses
    const expense = {
      amount: 1000,
      datetime: new Date(),
      category: 1,
      description: 'description',
      attachment: 1,
    }
    result = await executeWorkerEvent(IDB_EVENT.EXPENSE_ADD, expense);
    console.log(`%c${IDB_EVENT.EXPENSE_ADD}: ${JSON.stringify(result)} => ${JSON.stringify(expense)}`, 'color: green');

    let eid = result;
    result = await executeWorkerEvent(IDB_EVENT.EXPENSE_GET, { id: eid });
    console.log(`%c${IDB_EVENT.EXPENSE_GET}: ${eid} => ${JSON.stringify(result)}`, 'color: green');

  } catch (err) {
    console.error(err);
  }
}
