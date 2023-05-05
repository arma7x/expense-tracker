<script lang="ts">
  import { Route, navigate as goto } from "svelte-navigator";
  import { createKaiNavigator } from '../utils/navigation';
  import { onMount, onDestroy } from 'svelte';
  import { ListView } from '../components/index.ts';
  import { get } from 'svelte/store';
  import EventEmitter from 'events';
  import { OptionMenu } from '../components/index.ts';

  import { IDB_EVENT, TypeCategory, TypeExpense  } from '../idb-worker/types';
  import ExpenseEditor from './modals/ExpenseEditor.svelte';
  import RangePicker from './modals/RangePicker.svelte';
  import CATEGORIES_STORE from '../idb-worker/categoriesStore';
  import { toastMessage } from '../helpers.ts';
  import { saveAs } from 'file-saver';
  import html2canvas from 'html2canvas';


  import bb, { donut } from "billboard.js";
  import "billboard.js/dist/billboard.min.css";

  export let location: any;
  export let navigate: any;
  export let getAppProp: Function;
  export let idbWorker: Worker;
  export let idbWorkerEventEmitter: EventEmitter;

  const navClass: string = "navWelcome";

  let name: string = 'Expense Tracker';
  let categoriesList: {[key:number]: TypeCategory} = {};
  let expenseList: TypeExpense[] = [];
  let columns = [];
  let byCategory: {[key:number]: any} = {};
  let billboardChart: typeof bb.generate;
  let focusChart: bool = false;
  let begin: Date;
  let end: Date;

  let expenseEditorModal: ExpenseEditor;
  let rangePickerModal: RangePicker;
  let lskMenu: OptionMenu;

  let navOptions = {
    verticalNavClass: navClass,
    softkeyLeftListener: function(evt) {
      openLSKMenu();
    },
    softkeyRightListener: function(evt) {
      openExpenseEditorModal(null);
    },
    arrowUpListener: function(evt) {
      if (focusChart) {
        this.verticalNavIndex += 1;
        const { softwareKey } = getAppProp();
        softwareKey.setCenterText('EXPENSES');
        focusChart = false;
      }
      this.navigateListNav(-1);
    },
    arrowDownListener: function(evt) {
      if (focusChart) {
        this.verticalNavIndex -= 1;
        const { softwareKey } = getAppProp();
        softwareKey.setCenterText('EXPENSES');
        focusChart = false;
      }
      this.navigateListNav(1);
    },
    enterListener: function(evt) {
      if (focusChart) return;
      const navClasses = document.getElementsByClassName(navClass);
      if (navClasses[this.verticalNavIndex] != null) {
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
          { title: 'Setting A Date Range', subtitle: 'Select the date range to generate the report' },
          { title: 'Export Report To CSV', subtitle: 'Export expense list to CSV' },
          { title: 'Screenshot Report', subtitle: 'Save chart and expense category as PNG' },
          { title: 'FAQ', subtitle: 'Frequently Asked Questions' },
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
            case 1:
              selectCustomRange();
              break;
            case 2:
              exportToCSV();
              break;
            case 3:
              screenshot();
              break;
            case 4:
              // TODO FAQ
              break;
            case 5:
              // TODO Changelogs
              break;
            case 6:
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

  function openExpenseEditorModal(expense: TypeExpense | null) {
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
        onSuccess: (result: any) => {
          idbWorker.postMessage({ type: IDB_EVENT.EXPENSE_GET_RANGE, params: { begin, end } });
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

  // TODO
  function exportToCSV() {

  }

  function selectCustomRange() {
    rangePickerModal = new RangePicker({
      target: document.body,
      props: {
        title: 'Custom Range',
        begin: new Date(),
        end: new Date(),
        onSuccess: (result: any) => {
          if (result != null) {
            if (result.end > result.begin || result.end.toLocaleDateString() == result.begin.toLocaleDateString()) {
              begin = setBegin(result.begin);
              end = setEnd(result.end);
              idbWorker.postMessage({ type: IDB_EVENT.EXPENSE_GET_RANGE, params: { begin, end } });
            } else {
              toastMessage("Invalid range");
            }
          }
          rangePickerModal.$destroy();
        },
        onOpened: () => {
          navInstance.detachListener();
        },
        onClosed: () => {
          navInstance.attachListener();
          rangePickerModal = null;
        }
      }
    });
  }

  async function screenshot() {
    const container = document.querySelector("#welcome-screen");
    let totalHeight = 0;
    for (let i=0;i<container.children.length;i++) {
      totalHeight += container.children[i].offsetHeight;
    }
    container.style.height = totalHeight + 'px';
    try {
      const canvas = await html2canvas(container);
      canvas.toBlob((blob) => {
        saveAs(blob, `${begin.toGMTString()} - ${end.toGMTString()}.png`);
        container.style.height = '';
      });
    } catch (err) {
      console.error(err);
    }
  }

  function setBegin(date: Date): Date {
    date.setHours(0);date.setMinutes(0);date.setSeconds(0);date.setMilliseconds(0);
    return new Date(date.getTime());
  }

  function setEnd(date: Date): Date {
    date.setHours(23);date.setMinutes(59);date.setSeconds(59);date.setMilliseconds(999);
    return new Date(date.getTime());
  }

  function getMonthRange() {
    let begin = new Date();
    begin.setDate(1);
    begin = setBegin(begin);
    const max = new Date(begin.getFullYear(), begin.getMonth(), 0).getDate();
    let end = new Date(begin.getTime() + (max * 24 * 60 * 60 * 1000));
    end = setEnd(end);
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
    columns = [];
    byCategory = {};
    if (expenseList.length === 0)
      return;
    expenseList.forEach((expense) => {
      const category: TypeCategory = categoriesList[expense.category];
      if (category) {
        expense = { ...expense, category: category.name, color: category.color };
        if (byCategory[category.name] == null)
          byCategory[category.name] = { label: category.name, color: category.color, value: 0, expenses: [] };
        byCategory[category.name].value += expense.amount;
        byCategory[category.name].expenses.push(expense);
      } else {
        expense = { ...expense, category: 'General', color: '#ff3e00' };
        if (byCategory['General'] == null)
          byCategory['General'] = { label: 'General', color: '#ff3e00', value: 0, expenses: [] };
        byCategory['General'].value += expense.amount;
        byCategory['General'].expenses.push(expense);
      }
    });
    let colors = {};
    let total: number = 0;
    Object.keys(byCategory).forEach(key => {
      const category = byCategory[key];
      columns.push([category.label, category.value, category.color]);
      colors[category.label] = category.color;
      total += category.value;
    });
    columns.sort((a, b) => {
      return a[1] < b[1];
    });
    setTimeout(() => {
      drawPieChart(timeline, "$", total, columns, colors);
    }, 300);
  }

  function onClickCategory(name: string, expenses: Array<TypeExpense>) {
    console.log(name, expenses);
  }

  function onInitialize(data) {
    if (data.result) {
      idbWorker.postMessage({ type: IDB_EVENT.CATEGORY_GET_ALL, params: {} });
      const t = getMonthRange();
      begin = t.begin;
      end  = t.end;
      idbWorker.postMessage({ type: IDB_EVENT.EXPENSE_GET_RANGE, params: { begin, end } });
    } else if (data.error) {
      console.error(data.error);
    }
  }

  function onWeeklyExpense(data) {
    if (data.result) {
      expenseList = data.result.list;
      groupExpenseByCategory({ begin: data.result.begin, end: data.result.end });
    } else if (data.error) {
      console.error(data.error);
    }
  }

  const unsubscribeCategoryStore = CATEGORIES_STORE.subscribe(categories => {
    categoriesList = categories;
    if (begin != null && end != null)
      groupExpenseByCategory({ begin, end });
  });

  function eventHandler(evt) {
    if (evt.key == "Call" && focusChart == false) {
      const target = document.getElementById('welcome-screen')
      target.scroll({ top: 0, behavior: 'smooth' });
      focusChart = true;
      const { softwareKey } = getAppProp();
      softwareKey.setCenterText('');
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
  {#if columns.length > 0}
    <div id="donutChart"></div>
    {#each columns as item }
      <ListView className="{navClass}" title="{item[0]} ({byCategory[item[0]].expenses.length})" subtitle="${item[1]}" onClick={() => onClickCategory(item[0], byCategory[item[0]].expenses)}>
        <span slot="leftWidget" class="kai-icon-favorite-on" style="background-color:#fff;color:{item[2]};margin-right:5px;padding:8px;border-radius:50%;"></span>
      </ListView>
    {/each}
  {:else}
    <div class="container" style="height:100%;display:flex;align-items:center;justify-content:center;">
      Press `Add` button to insert expense
    </div>
  {/if}
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
