<script lang="ts">
  import { navigate as goto } from "svelte-navigator";
  import { createKaiNavigator } from '../utils/navigation';
  import { onMount, onDestroy } from 'svelte';
  import EventEmitter from 'events';
  import { ListView, Dialog } from '../components/index.ts';
  import { IDB_EVENT, TypeExpense } from '../idb-worker/types';
  import { toastMessage } from '../helpers.ts';
  import ExpenseEditor from './modals/ExpenseEditor.svelte';
  import CATEGORIES_STORE from '../idb-worker/categoriesStore.ts';
  import { get } from 'svelte/store';

  export let location: any;
  export let navigate: any;
  export let getAppProp: Function;
  export let idbWorker: Worker;
  export let idbWorkerEventEmitter: EventEmitter;

  const navClass: string = 'expenseListNav'

  let dialog: Dialog;
  let expenseEditorModal: ExpenseEditor;

  let name: string = 'Room';
  let expenseList: any[] = [];

  let navOptions = {
    verticalNavClass: navClass,
    softkeyLeftListener: function(evt) {
      const expense = expenseList[this.verticalNavIndex];
      if (expense)
        updateExpense(this.verticalNavIndex, expense);
    },
    softkeyRightListener: function(evt) {
      const expense = expenseList[this.verticalNavIndex];
      if (expense)
        deleteExpense(this.verticalNavIndex, expense);
    },
    backspaceListener: function(evt) {
      evt.preventDefault();
      goto(-1);
    }
  };

  let navInstance = createKaiNavigator(navOptions);

  function _get(id: number): Promise<any> {
    return new Promise((resolve, reject) => {
      function listener(data) {
        if (data.result != null) {
          resolve(data.result);
        } else if (data.error) {
          reject(data.error);
        }
        idbWorkerEventEmitter.removeListener(IDB_EVENT.EXPENSE_GET, listener);
      }
      idbWorkerEventEmitter.addListener(IDB_EVENT.EXPENSE_GET, listener);
      idbWorker.postMessage({ type: IDB_EVENT.EXPENSE_GET, params: { id: id } })
    });
  }

  function updateExpense(index: number, expense: TypeExpense) {
    expenseEditorModal = new ExpenseEditor({
      target: document.body,
      props: {
        title: expense != null ? 'Update Expense' : 'Add Expense',
        id: expense != null ? expense.id : null,
        amount: expense != null ? expense.amount : '',
        datetime: expense != null ? new Date(expense.datetime) : new Date(),
        category: expense != null ? expense.category : 0,
        description: expense != null ? expense.description : '',
        attachment: expense != null ? expense.attachment : -1,
        categories: {...get(CATEGORIES_STORE)},
        idbWorker: idbWorker,
        idbWorkerEventEmitter: idbWorkerEventEmitter,
        onSuccess: async (result: any) => {
          if (result != null) {
            try {
              const _expense = await _get(result);
              expenseList[index] = _expense;
            } catch (err) {
              toastMessage(err.toString());
            }
          }
          expenseEditorModal.$destroy();
        },
        onError: (err: any) => {
          toastMessage(err.toString());
        },
        onOpened: () => {
          navInstance.detachListener();
        },
        onClosed: () => {
          navInstance.attachListener();
          expenseEditorModal = null;
        }
      }
    });
  }

  function _delete(id: number): Promise<any> {
    return new Promise((resolve, reject) => {
      function listener(data) {
        if (data.result != null) {
          resolve(data.result);
        } else if (data.error) {
          reject(data.error);
        }
        idbWorkerEventEmitter.removeListener(IDB_EVENT.EXPENSE_DELETE, listener);
      }
      idbWorkerEventEmitter.addListener(IDB_EVENT.EXPENSE_DELETE, listener);
      idbWorker.postMessage({ type: IDB_EVENT.EXPENSE_DELETE, params: { id: id } })
    });
  }

  function deleteExpense(index: number, expense: TypeExpense) {
    dialog = new Dialog({
      target: document.body,
      props: {
        title: 'Confirmation',
        html: true,
        body: `Are you sure to remove id <b>${expense.id}</b> ?`,
        softKeyLeftText: 'No',
        softKeyCenterText: ' ',
        softKeyRightText: 'Yes',
        onSoftkeyLeft: (evt) => {
          dialog.$destroy();
        },
        onSoftkeyRight: async (evt) => {
          try {
            await _delete(expense.id);
            expenseList.splice(index, 1);
            expenseList = [...expenseList];
            if (expenseList.length == 0)
              goto(-1);
            else if (index >= expenseList.length)
              navInstance.navigateListNav(-1);
            dialog.$destroy();
          } catch (err) {
            toastMessage(err.toString());
          }
        },
        onEnter: (evt) => {},
        onBackspace: (evt) => {
          evt.preventDefault();
          evt.stopPropagation();
          dialog.$destroy();
        },
        onOpened: () => {
          navInstance.detachListener();
        },
        onClosed: () => {
          navInstance.attachListener();
          dialog = null;
        }
      }
    });
  }

  function trimDatetime(date: Date): string {
    const d = date.toLocaleString();
    return d.substring(0, d.length - 6) + d.substring(d.length - 2);
  }

  onMount(() => {
    name = location.state.category[0];
    expenseList = [...location.state.expenseList];
    expenseList.sort((a, b) => a.datetime > b.datetime);
    const { appBar, softwareKey } = getAppProp();
    appBar.setTitleText(name);
    softwareKey.setText({ left: 'Update', center: '', right: 'Delete' });
    navInstance.attachListener();
  });

  onDestroy(() => {
    navInstance.detachListener();
  });

</script>

<main id="expense-list-screen" data-pad-top="28" data-pad-bottom="30">
  {#each expenseList as expense }
    <ListView className="{navClass}" title="{trimDatetime(expense.datetime)}" subtitle="{expense.description}">
      <span slot="rightWidget" style="border:1px solid var(--themeColor);background-color:#fff;color:#000;padding:0 4px;border-radius:3px;">${expense.amount}</span>
    </ListView>
  {/each}
</main>

<style>
  #expense-list-screen {
    overflow: scroll;
    width: 100%;
  }
</style>
