import EventEmitter from 'events';
import { IDB_EVENT } from './types';
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
    console.log('%crunTest:', dbName, 'color: blue');

    result = await executeWorkerEvent(IDB_EVENT.DROP, { dbName: dbName });
    console.log(`%c${IDB_EVENT.DROP}: ${JSON.stringify(result)}`, 'color: green');

    result = await executeWorkerEvent(IDB_EVENT.INITIALIZE, { dbName: dbName });
    console.log(`%c${IDB_EVENT.INITIALIZE}: ${JSON.stringify(result)}`, 'color: green');

    // attachments
    let inputText = new Date().toString();
    let textBlob = new Blob([inputText], { type: 'text/plain' });
    let textBlobArrBuf = await (await fetch(URL.createObjectURL(textBlob))).arrayBuffer();
    result = await executeWorkerEvent(IDB_EVENT.ATTACHMENT_ADD, { mime: textBlob.type, arraybuffer: textBlobArrBuf });
    console.log(`%c${IDB_EVENT.ATTACHMENT_ADD}: ${JSON.stringify(result)} => ${inputText}`, 'color: green');

    let attachment_id = result;
    result = await executeWorkerEvent(IDB_EVENT.ATTACHMENT_GET, { id: attachment_id });
    textBlob = new Blob([result.arraybuffer], { type: result.mime });
    let outputText = await (await fetch(URL.createObjectURL(textBlob))).text();
    console.log(`%c${IDB_EVENT.ATTACHMENT_GET}: ${attachment_id} => ${outputText}`, 'color: green');

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

    attachment_id = result;
    result = await executeWorkerEvent(IDB_EVENT.ATTACHMENT_GET, { id: attachment_id });
    textBlob = new Blob([result.arraybuffer], { type: result.mime });
    outputText = await (await fetch(URL.createObjectURL(textBlob))).text();
    console.log(`%c${IDB_EVENT.ATTACHMENT_GET}: ${attachment_id} => ${outputText}`, 'color: green');

    if (inputText !== outputText) {
      throw("Updated attachment not match!");
    }

    result = await executeWorkerEvent(IDB_EVENT.ATTACHMENT_DELETE, { id: attachment_id });
    console.log(`%c${IDB_EVENT.ATTACHMENT_DELETE}: ${attachment_id} => ${result}`, 'color: green');

    // categories
    let category = { name: inputText, color: stringToColour(inputText) };
    result = await executeWorkerEvent(IDB_EVENT.CATEGORY_ADD, category);
    console.log(`%c${IDB_EVENT.CATEGORY_ADD}: ${JSON.stringify(result)} => ${JSON.stringify(category)}`, 'color: green');

    let category_id = result;
    result = await executeWorkerEvent(IDB_EVENT.CATEGORY_GET, { id: category_id });
    console.log(`%c${IDB_EVENT.CATEGORY_GET}: ${category_id} => ${JSON.stringify(result)}`, 'color: green');

    if (result.name !== category.name && result.color !== category.color) {
      throw("Category not match!");
    }

    const updateCategory = result;
    updateCategory.name = result.name.substring(0, 10);
    updateCategory.color = stringToColour(result.name);
    result = await executeWorkerEvent(IDB_EVENT.CATEGORY_UPDATE, updateCategory);
    console.log(`%c${IDB_EVENT.CATEGORY_UPDATE}: ${JSON.stringify(result)} => ${JSON.stringify(updateCategory)}`, 'color: green');

    category_id = result;
    result = await executeWorkerEvent(IDB_EVENT.CATEGORY_GET, { id: category_id });
    console.log(`%c${IDB_EVENT.CATEGORY_GET}: ${category_id} => ${JSON.stringify(result)}`, 'color: green');

    if (result.name !== updateCategory.name && result.color !== updateCategory.color) {
      throw("Updated category not match!");
    }

    result = await executeWorkerEvent(IDB_EVENT.CATEGORY_DELETE, { id: category_id });
    console.log(`%c${IDB_EVENT.CATEGORY_DELETE}: ${category_id} => ${result}`, 'color: green');

    result = await executeWorkerEvent(IDB_EVENT.CATEGORY_GET_ALL, {});
    console.log(`%c${IDB_EVENT.CATEGORY_GET_ALL}: Total Categories => ${JSON.stringify(result.length)}`, 'color: green');

    // expenses
    const datetime = new Date();
    const expense = {
      amount: 1000,
      datetime: datetime,
      category: 0,
      description: 'description',
      attachment: 0,
    }
    result = await executeWorkerEvent(IDB_EVENT.EXPENSE_ADD, expense);
    console.log(`%c${IDB_EVENT.EXPENSE_ADD}: ${JSON.stringify(result)} => ${JSON.stringify(expense)}`, 'color: green');

    let expense_id = result;
    result = await executeWorkerEvent(IDB_EVENT.EXPENSE_GET, { id: expense_id });
    console.log(`%c${IDB_EVENT.EXPENSE_GET}: ${expense_id} => ${JSON.stringify(result)}`, 'color: green');

    if (result.amount !== expense.amount && result.datetime !== expense.datetime && result.category !== expense.category && result.description !== expense.description && result.attachment !== expense.attachment) {
      throw("Expense not match!");
    }

    let by_category = await executeWorkerEvent(IDB_EVENT.EXPENSE_COUNT_CATEGORY, { category: expense.category });
    console.log(`%c${IDB_EVENT.EXPENSE_COUNT_CATEGORY}: ${expense_id} => ${JSON.stringify(by_category)}`, 'color: green');

    if (by_category !== 1) {
        throw(`Category not found! ${by_category} ${expense.category}`);
    }

    const updateExpense = result;
    updateExpense.amount = result.amount + 100;
    updateExpense.datetime = new Date(result.datetime.getTime() - (2 * 24 * 60 * 60 * 1000));
    updateExpense.category = result.category + 1;
    updateExpense.description = result.description + " updated";
    updateExpense.attachment = result.attachment + 1;
    result = await executeWorkerEvent(IDB_EVENT.EXPENSE_UPDATE, updateExpense);
    console.log(`%c${IDB_EVENT.EXPENSE_UPDATE}: ${JSON.stringify(result)} => ${JSON.stringify(updateExpense)}`, 'color: green');

    expense_id = result;
    result = await executeWorkerEvent(IDB_EVENT.EXPENSE_GET, { id: expense_id });
    console.log(`%c${IDB_EVENT.EXPENSE_GET}: ${expense_id} => ${JSON.stringify(result)}`, 'color: green');

    if (result.amount !== updateExpense.amount && result.datetime !== updateExpense.datetime && result.category !== updateExpense.category && result.description !== updateExpense.description && result.attachment !== updateExpense.attachment) {
      throw("Updated expense not match!");
    }

    by_category = await executeWorkerEvent(IDB_EVENT.EXPENSE_COUNT_CATEGORY, { category: updateExpense.category });
    console.log(`%c${IDB_EVENT.EXPENSE_COUNT_CATEGORY}: ${expense_id} => ${JSON.stringify(by_category)}`, 'color: green');

    if (by_category !== 1) {
        throw(`Updated category not found! ${by_category} ${expense.category}`);
    }

    updateExpense.datetime.setUTCHours(0);updateExpense.datetime.setUTCMinutes(0);updateExpense.datetime.setUTCSeconds(0);updateExpense.datetime.setUTCMilliseconds(0);
    const tz = (new Date().getTimezoneOffset() / 60) * 60 * 60 * 1000;
    datetime.setUTCHours(23);datetime.setUTCMinutes(59);datetime.setUTCSeconds(59);datetime.setUTCMilliseconds(999);
    const range = { begin: new Date(updateExpense.datetime.getTime() + tz), end: new Date(datetime.getTime() + tz) };
    result = await executeWorkerEvent(IDB_EVENT.EXPENSE_GET_RANGE, range);
    console.log(`%c${IDB_EVENT.EXPENSE_GET_RANGE}: ${range.begin} - ${range.end} Total Expenses => ${JSON.stringify(result.length)}`, 'color: green');

    result = await executeWorkerEvent(IDB_EVENT.EXPENSE_DELETE, { id: expense_id });
    console.log(`%c${IDB_EVENT.EXPENSE_DELETE}: ${expense_id} => ${result}`, 'color: green');

  } catch (err) {
    throw(err);
  }
}
