<script lang="ts">
  import { Route, navigate as goto } from "svelte-navigator";
  import { createKaiNavigator } from '../utils/navigation';
  import { onMount, onDestroy } from 'svelte';
  import { ListView } from '../components/index.ts';
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

  const navClass: string = "navWelcome";

  let name: string = 'Weekly Statistic';
  let categoriesList: {[key:number]: CategoryType} = {};
  let weeklyExpenses: ExpenseType[] = [];
  let byCategory: {[key:number]: any} = {};

  let expenseEditorModal: ExpenseEditor;
  let lskMenu: OptionMenu;

  let billboardChart: typeof bb.generate;

  let navOptions = {
    verticalNavClass: navClass,
    softkeyLeftListener: function(evt) {
      openLSKMenu();
    },
    softkeyRightListener: function(evt) {
      openExpenseEditorModal(null);
    },
    enterListener: function(evt) {
      const navClasses = document.getElementsByClassName(navClass);
      if (navClasses[this.verticalNavIndex] != null && this.verticalNavIndex > 0) {
        navClasses[this.verticalNavIndex].click();
      }
    },
    backspaceListener: function(evt) {}
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
            case 5:
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
    let end = new Date(begin.getTime() + (7 * 24 * 60 * 60 * 1000));
    end.setUTCHours(23);end.setUTCMinutes(59);end.setUTCSeconds(59);end.setUTCMilliseconds(999);
    end = new Date(end.getTime() + tz);
    return { begin, end };
  }

  function drawPieChart(timeline, symbol: string = "$", total: number = 0, colums, colors) {
    billboardChart = bb.generate({
      data: {
        type: donut(),
        columns: colums,
        colors: colors,
      },
      donut: {
        title: timeline.begin.toLocaleDateString() + "\n" + timeline.end.toLocaleDateString() + "\nTotal: " + symbol + total.toString(),
        label: {
          show: true,
          position: 'inset',
          format: function(value, ratio, id) {
            return symbol + value;
          },
        },
      },
      legend: {
        show: false,
      },
      bindto: "#donutChart"
    });
    navInstance.verticalNavIndex = -1
    setTimeout(() => {
      navInstance.navigateListNav(1);
    }, 300);
  }

  function groupExpenseByCategory(timeline) {
    byCategory = {};
    if (weeklyExpenses.length === 0)
      return;
    weeklyExpenses.forEach((expense) => {
      const category: CategoryType = categoriesList[expense.category];
      if (category) {
        if (byCategory[category.name] == null)
          byCategory[category.name] = { label: category.name, color: category.color, value: 0, expenses: [] };
        byCategory[category.name].value += expense.amount;
        byCategory[category.name].expenses.push(expense);
      } else {
        if (byCategory['General'] == null)
          byCategory['General'] = { label: 'General', color: '#ff3e00', value: 0, expenses: [] };
        byCategory['General'].value += expense.amount;
        byCategory['General'].expenses.push(expense);
      }
    });
    let columns = [];
    let colors = {};
    let total: number = 0;
    Object.keys(byCategory).forEach(key => {
      const category = byCategory[key];
      columns.push([category.label, category.value]);
      colors[category.label] = category.color;
      total += category.value;
    });
    setTimeout(() => {
      drawPieChart(timeline, "$", total, columns, colors);
    }, 300);
  }

  function onClickCategory(name: string, expenses: Array<ExpenseType>) {
    console.log(name, expenses);
  }

  function onInitialize(data) {
    if (data.result) {
      // console.log("idb-worker status:", data.result);
      idbWorker.postMessage({ type: IDB_EVENT.CATEGORY_GET_ALL, params: {} });
      idbWorker.postMessage({ type: IDB_EVENT.EXPENSE_GET_RANGE, params: getWeekRange() });
    } else if (data.error) {
      console.error(data.error);
    }
  }

  function onWeeklyExpense(data) {
    if (data.result) {
      weeklyExpenses = data.result;
      groupExpenseByCategory(getWeekRange());
    } else if (data.error) {
      console.error(data.error);
    }
  }

  const unsubscribeCategoryStore = CATEGORIES_STORE.subscribe(categories => {
    categoriesList = categories;
    groupExpenseByCategory(getWeekRange());
  });

  function eventHandler(evt) {
    if (evt.key == "Call") {
      const target = document.getElementById('welcome-screen')
      target.scroll({ top: 0, behavior: 'smooth' });
    }
  }

  onMount(() => {
    const { appBar, softwareKey } = getAppProp();
    appBar.setTitleText(name);
    softwareKey.setText({ left: 'Menu', center: 'EXPENSES', right: 'Add' });
    navInstance.attachListener();
    idbWorkerEventEmitter.addListener(IDB_EVENT.INITIALIZE, onInitialize);
    idbWorkerEventEmitter.addListener(IDB_EVENT.EXPENSE_GET_RANGE, onWeeklyExpense);
    idbWorker.postMessage({ type: IDB_EVENT.INITIALIZE, params: { dbName: "expense-tracker" } });
    document.addEventListener('keydown', eventHandler);
  });

  onDestroy(() => {
    navInstance.detachListener();
    idbWorkerEventEmitter.removeListener(IDB_EVENT.INITIALIZE, onInitialize);
    idbWorkerEventEmitter.removeListener(IDB_EVENT.EXPENSE_GET_RANGE, onWeeklyExpense);
    unsubscribeCategoryStore();
    document.removeEventListener('keydown', eventHandler);
  });

</script>

<main id="welcome-screen" data-pad-top="28" data-pad-bottom="30">
  <div id="donutChart"></div>
  {#each Object.keys(byCategory) as key }
    <ListView className="{navClass}" title="{byCategory[key].label}({byCategory[key].expenses.length})" subtitle="${byCategory[key].value}" onClick={() => onClickCategory(byCategory[key].label, byCategory[key].expenses)}>
      <span slot="leftWidget" class="kai-icon-favorite-on" style="background-color:#fff;color:{byCategory[key].color};margin-right:5px;padding:8px;border-radius:50%;"></span>
    </ListView>
  {/each}
</main>

<style>
  #welcome-screen {
    overflow: scroll;
    width: 100%;
  }
  #welcome-screen > #donutChart {
    width: 232px;
    height: 232px;
    overflow-y: hidden;
  }
</style>
