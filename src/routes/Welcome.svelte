<script lang="ts">
  import { Route, navigate as goto } from "svelte-navigator";
  import { createKaiNavigator } from '../utils/navigation';
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import EventEmitter from 'events';
  import { OptionMenu } from '../components/index.ts';

  import { IDB_EVENT, CategoryType, ExpenseType  } from '../idb-worker/types';
  import ExpenseEditor from './modals/ExpenseEditor.svelte';
  import CATEGORIES_STORE from '../idb-worker/categoriesStore';

  import bb, { donut } from "billboard.js";
  import "billboard.js/dist/billboard.min.css";

  export let location: any;
  export let navigate: any;
  export let getAppProp: Function;
  export let idbWorker: Worker;
  export let idbWorkerEventEmitter: EventEmitter;

  let name: string = 'Weekly Statistic';
  let categoriesList : {[key:number]: CategoryType} = {};
  let weeklyExpenses: ExpenseType[] = [];

  let expenseEditorModal: ExpenseEditor;
  let lskMenu: OptionMenu;

  let billboardChart: typeof bb.generate;

  let navOptions = {
    softkeyLeftListener: function(evt) {
      openLSKMenu();
    },
    softkeyRightListener: function(evt) {
      openExpenseEditorModal(null);
    },
    enterListener: function(evt) {
      // expenses list
    },
    backspaceListener: function(evt) {
      console.log('backspaceListener', name);
    }
  };

  let navInstance = createKaiNavigator(navOptions);

  function openLSKMenu() {
    lskMenu = new OptionMenu({
      target: document.body,
      props: {
        title: 'Menu',
        focusIndex: 0,
        options: [
          { title: 'Categories', subtitle: 'Manage expense categories' },
          { title: 'Detailed Statistics', subtitle: 'Generate expenses report' },
          { title: 'FAQ', subtitle: 'Frequently Asked Questions' },
          { title: 'Disclaimer Notice', subtitle: 'Notice of app usage' },
          { title: 'Changelogs', subtitle: 'Read release notes' },
          { title: 'Exit', subtitle: 'Close app' },
        ],
        softKeyCenterText: 'select',
        onSoftkeyRight: (evt, scope) => {},
        onSoftkeyLeft: (evt, scope) => {},
        onEnter: async (evt, scope) => {
          lskMenu.$destroy();
          switch (scope.index) {
            case 0:
              goto('manage-category');
              break;
            case 4:
              window.close();
              break;
          }
        },
        onBackspace: (evt, scope) => {
          evt.preventDefault();
          evt.stopPropagation();
          lskMenu.$destroy();
        },
        onOpened: () => {
          navInstance.detachListener();
        },
        onClosed: (scope) => {
          navInstance.attachListener();
          lskMenu = null;
        }
      }
    });
  }

  function openExpenseEditorModal(expense: ExpenseType | null) {
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
        categories: get(CATEGORIES_STORE),
        idbWorker: idbWorker,
        idbWorkerEventEmitter: idbWorkerEventEmitter,
        onSuccess: (result: any) => {
          idbWorker.postMessage({ type: IDB_EVENT.EXPENSE_GET_RANGE, params: getWeekRange() });
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

  function getWeekRange() {
    let begin = new Date();
    let tz = (begin.getTimezoneOffset() / 60) * 60 * 60 * 1000;
    begin.setUTCHours(0);begin.setUTCMinutes(0);begin.setUTCSeconds(0);begin.setUTCMilliseconds(0);
    begin  = new Date(begin.getTime() - ((begin.getDay() - 1) * 24 * 60 * 60 * 1000))
    begin = new Date(begin.getTime() + tz);
    let end = new Date(begin.getTime() + (6 * 24 * 60 * 60 * 1000));
    end.setUTCHours(23);end.setUTCMinutes(59);end.setUTCSeconds(59);end.setUTCMilliseconds(999);
    end = new Date(end.getTime() + tz);
    return { begin, end };
  }

  function onInitialize(data) {
    if (data.result) {
      console.log("idb-worker status:", data.result);
      idbWorker.postMessage({ type: IDB_EVENT.CATEGORY_GET_ALL, params: {} });
      idbWorker.postMessage({ type: IDB_EVENT.EXPENSE_GET_RANGE, params: getWeekRange() });
    } else if (data.error) {
      console.error(data.error);
    }
  }

  function drawPieChart(total: number = 0,colums, colors) {
    try {
      billboardChart = bb.generate({
        data: {
          type: donut(),
          columns: [
            ["Mobile Devices Motorola", 30],
            ["Tablets Alcatel", 120],
            ["Windows Desktops", 70]
          ],
          colors: {
            'Mobile Devices Motorola': "#3DB93D",
            'Tablets Alcatel': "#930C0C",
            'Windows Desktops': "#4776A3",
          }
        },
        donut: {
          title: "$" + "220",
          label: {
            show: true,
            position: 'inset',
            format: function(value, ratio, id) {
              return "$" + value;
            },
          },
        },
        legend: {
          show: true,
          contents: {
            bindto: "#donutLegend",
          }
        },
        bindto: "#donutChart"
      });
    } catch (err) {
      console.error(1, err);
    }

  }

  function groupExpenseByCategory() {
    let byCategory = {};
    if (weeklyExpenses.length === 0)
      return;
    weeklyExpenses.forEach((expense) => {
      const category: CategoryType = categoriesList[expense.category];
      if (category) {
        if (byCategory[category.name] == null)
          byCategory[category.name] = { label: category.name, backgroundColor: expense.color, data: 0 };
        byCategory[category.name].data += expense.amount;
      } else {
        if (byCategory['General'] == null)
          byCategory['General'] = { label: 'General', backgroundColor: '#ff3e00', data: 0 };
        byCategory['General'].data += expense.amount;
      }
    });
    console.log('groupExpenseByCategory', byCategory);
    setTimeout(drawPieChart, 1000);
  }

  function onGetWeeklyExpense(data) {
    if (data.result) {
      weeklyExpenses = data.result;
      console.log('weeklyExpenses', weeklyExpenses);
      groupExpenseByCategory();
    } else if (data.error) {
      console.error(data.error);
    }
  }

  const unsubscribeCategoryStore = CATEGORIES_STORE.subscribe(categories => {
    categoriesList = categories;
    console.log('categoriesList', categoriesList);
    groupExpenseByCategory();
  });

  onMount(() => {
    const { appBar, softwareKey } = getAppProp();
    appBar.setTitleText(name);
    softwareKey.setText({ left: 'Menu', center: 'EXPENSES', right: 'Add' });
    navInstance.attachListener();
    idbWorkerEventEmitter.addListener(IDB_EVENT.INITIALIZE, onInitialize);
    idbWorkerEventEmitter.addListener(IDB_EVENT.EXPENSE_GET_RANGE, onGetWeeklyExpense);
    idbWorker.postMessage({ type: IDB_EVENT.INITIALIZE, params: { dbName: "expense-tracker" } });
  });

  onDestroy(() => {
    navInstance.detachListener();
    idbWorkerEventEmitter.removeListener(IDB_EVENT.INITIALIZE, onInitialize);
    idbWorkerEventEmitter.removeListener(IDB_EVENT.EXPENSE_GET_RANGE, onGetWeeklyExpense);
    unsubscribeCategoryStore();
  });

</script>

<main id="welcome-screen" data-pad-top="28" data-pad-bottom="30">
  <div id="donutLegend"></div>
  <div id="donutChart"></div>
</main>

<style>
  #welcome-screen {
    overflow: scroll;
    width: 100%;
  }
  #welcome-screen > #donutLegend {
    margin-top: 5px;
  }
  #welcome-screen > #donutChart {
    width: 232px;
    overflow-y: hidden;
    margin-top: -25px;
  }
</style>
