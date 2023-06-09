<script lang="ts">
  import { Route, navigate as goto } from "svelte-navigator";
  import { createKaiNavigator } from '../utils/navigation';
  import { onMount, onDestroy } from 'svelte';
  import { ListView, TextInputDialog } from '../components/index.ts';
  import { get, writable } from 'svelte/store';
  import EventEmitter from 'events';
  import { OptionMenu } from '../components/index.ts';

  import { IDB_EVENT, TypeCategory, TypeExpense  } from '../idb-worker/types';
  import ExpenseEditor from './modals/ExpenseEditor.svelte';
  import RangePicker from './modals/RangePicker.svelte';
  import CATEGORIES_STORE from '../idb-worker/categoriesStore';
  import persistent from './state.ts';
  import { toastMessage, showLoadingBar, hideLoadingBar } from '../helpers.ts';
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
  let screenshot: bool = false;
  let currencyUnit: string = window.localStorage.getItem("CURRENCY");

  let expenseEditorModal: ExpenseEditor;
  let rangePickerModal: RangePicker;
  let lskMenu: OptionMenu;
  let textInputDialog: TextInputDialog;

  let navOptions = {
    verticalNavClass: navClass,
    softkeyLeftListener: function(evt) {
      if (focusChart || screenshot) return;
      openLSKMenu();
    },
    softkeyRightListener: function(evt) {
      if (focusChart || screenshot) return;
      openExpenseEditorModal(null);
    },
    arrowUpListener: function(evt) {
      if (focusChart || screenshot) return;
      this.navigateListNav(-1);
    },
    arrowDownListener: function(evt) {
      if (focusChart || screenshot) return;
        this.navigateListNav(1);
    },
    enterListener: function(evt) {
      if (focusChart || screenshot) return;
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
          { title: 'Manage Categories', subtitle: 'Manage expense categories' },
          { title: 'Custom Date Range', subtitle: 'Select the date range to generate the report' },
          { title: 'Export Expense To CSV', subtitle: 'Export report and expense list to CSV' },
          { title: 'Screenshot Report', subtitle: 'Save chart and expense category as PNG' },
          { title: 'Currency Unit', subtitle: 'Set currency unit' },
          // { title: 'FAQ', subtitle: 'Frequently Asked Questions' },
          // { title: 'Changelogs', subtitle: 'Read release notes' },
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
              takeScreenshot();
              break;
            //case 4:
              // TODO FAQ
            //  break;
            //case 5:
              // TODO Changelogs
            //  break;
            case 4:
              setCurrency();
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
          let temp = get(persistent);
          idbWorker.postMessage({ type: IDB_EVENT.EXPENSE_GET_RANGE, params: { begin: temp.begin, end: temp.end } });
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

  function exportToCSV() {
    if (columns.length == 0) return;
    let csv = ['ID,Category ID,Category Name,Amount,Datetime,Description,,,,Category ID,Name,Color'];
    let tempCats = {0: {id:0, name: 'General', color: "#2d8e2d"}};
    tempCats = {...categoriesList, ...tempCats};
    const cat_keys = Object.keys(tempCats);
    expenseList.forEach((expense, index) => {
      if (index < cat_keys.length) {
        const cat = tempCats[cat_keys[index]];
        csv.push(`${expense.id},${expense.category},${tempCats[expense.category] ? tempCats[expense.category].name : 'General'},${expense.amount},${expense.datetime.toISOString()},${expense.description},,,,${cat.id},${cat.name},"${cat.color}","=SUMIF(C1:C16384, K${index+2}, D1:D16384)"`);
      } else {
        if (index === cat_keys.length) {
          csv.push(`${expense.id},${expense.category},${tempCats[expense.category] ? tempCats[expense.category].name : 'General'},${expense.amount},${expense.datetime.toISOString()},${expense.description},,,,,,Total,"=SUM(M2:M${cat_keys.length + 1})"`);
        } else {
          csv.push(`${expense.id},${expense.category},${tempCats[expense.category] ? tempCats[expense.category].name : 'General'},${expense.amount},${expense.datetime.toISOString()},${expense.description}`);
        }
      }
    });
    const csvBlob = new Blob([csv.join('\n')], { type: 'text/csv' });
    showLoadingBar(navInstance);
    let temp = get(persistent);
    saveAs(csvBlob, `${temp.begin.toGMTString()} - ${temp.end.toGMTString()}.csv`);
    hideLoadingBar();
  }

  function selectCustomRange() {
    let temp = get(persistent);
    rangePickerModal = new RangePicker({
      target: document.body,
      props: {
        title: 'Custom Range',
        begin: temp.begin,
        end: temp.end,
        onSuccess: (result: any) => {
          if (result != null) {
            if (result.end > result.begin || result.end.toLocaleDateString() == result.begin.toLocaleDateString()) {
              const begin = setBegin(result.begin);
              const end = setEnd(result.end);
              persistent.update((state) => {
                state = { begin, end };
                return state;
              });
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

  function setCurrency() {
    textInputDialog = new TextInputDialog({
      target: document.body,
      props: {
        title: 'Currency Unit',
        softKeyCenterText: 'SAVE',
        softKeyRightText: 'Cancel',
        value: window.localStorage.getItem("CURRENCY"),
        placeholder: 'Please enter currency unit',
        type: 'text',
        onSoftkeyLeft: (evt, value) => {},
        onSoftkeyRight: (evt, value) => {
          textInputDialog.$destroy();
        },
        onEnter: (evt, value) => {
          if (value) {
            if (currencyUnit != value) {
              currencyUnit = value;
              let temp = get(persistent);
              idbWorker.postMessage({ type: IDB_EVENT.EXPENSE_GET_RANGE, params: { begin: temp.begin, end: temp.end } });
            }
            value = value.toString().trim();
            window.localStorage.setItem("CURRENCY", value);
          }
          textInputDialog.$destroy();
        },
        onBackspace: (evt, value) => {
          evt.stopPropagation();
        },
        onOpened: () => {
          navInstance.detachListener();
        },
        onClosed: (value) => {
          navInstance.attachListener();
          textInputDialog = null;
        }
      }
    });
  }

  function takeScreenshot() {
    if (columns.length == 0) return;
    focus(2);
    setTimeout(async () => {
      const container = document.querySelector("#welcome-screen");
      let totalHeight = 0;
      for (let i=0;i<container.children.length;i++) {
        totalHeight += container.children[i].offsetHeight;
      }
      container.style.height = totalHeight + 'px';
      try {
        showLoadingBar(navInstance);
        const canvas = await html2canvas(container);
        canvas.toBlob((blob) => {
          if (blob != null) {
            let temp = get(persistent);
            saveAs(blob, `${temp.begin.toGMTString()} - ${temp.end.toGMTString()}.png`);
            container.style.height = '';
          }
          hideLoadingBar();
          unfocus(2);
        });
      } catch (err) {
        hideLoadingBar();
        console.error(err);
      }
    }, 1000);
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

  function drawDonutChart(timeline, symbol: string = "$", total: number = 0, colums, colors) {
    if (billboardChart) {
      billboardChart.load({ columns: colums, colors: colors });
      try {
        const ttA = [timeline.begin.toLocaleDateString(), timeline.end.toLocaleDateString(), "Total: " + symbol + total.toString()];
        const tt = document.getElementsByClassName('bb-chart-arcs-title')[0];
        for (let i=0;i<tt.children.length;i++) {
          tt.children[i].textContent = ttA[i];
        }
      } catch (err) {}
      return;
    }
    billboardChart = bb.generate({
      data: {
        type: donut(),
        columns: colums,
        colors: colors,
        labels: {
          backgroundColors: "black",
          colors: "white"
        }
      },
      donut: {
        title: timeline.begin.toLocaleDateString() + "\n" + timeline.end.toLocaleDateString() + "\nTotal: " + symbol + total.toString(),
        label: {
          show: true,
          format: function(value, ratio, id) {
            return window.localStorage.getItem("CURRENCY") + value; // temp fix
            // return symbol + value;
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
    if (billboardChart != null && columns.length > 0) {
      columns.forEach((i) => {
        billboardChart.unload({ ids: i[0] });
      });
    }
    if (expenseList.length === 0) {
      if (billboardChart) {
        billboardChart.destroy();
        billboardChart = null;
      }
      const { softwareKey } = getAppProp();
      softwareKey.setCenterText('');
      columns = [];
      byCategory = {};
      return;
    }
    columns = [];
    byCategory = {};
    expenseList.forEach((_expense) => {
      const category: TypeCategory = categoriesList[_expense.category];
      if (category) {
        const expense = { ..._expense };
        if (byCategory[category.name] == null)
          byCategory[category.name] = { label: category.name, color: category.color, value: 0, expenses: [] };
        byCategory[category.name].value += expense.amount;
        byCategory[category.name].expenses.push(expense);
      } else {
        const expense = { ..._expense };
        if (byCategory['General'] == null)
          byCategory['General'] = { label: 'General', color: '#2d8e2d', value: 0, expenses: [] };
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
      drawDonutChart(timeline, currencyUnit, total, columns, colors);
    }, 300);
  }

  function onClickCategory(category: any[], expenses: Array<TypeExpense>) {
    goto('expense-list',  {state: { category: category, expenseList: expenses }});
  }

  function onInitialize(data) {
    if (data.result) {
      idbWorker.postMessage({ type: IDB_EVENT.CATEGORY_GET_ALL, params: {} });
      let temp = get(persistent);
      if (temp.begin == null || temp.end == null) {
        temp = getMonthRange();
        persistent.update((state) => {
          state = { begin: temp.begin, end: temp.end };
          return state;
        });
      }
      idbWorker.postMessage({ type: IDB_EVENT.EXPENSE_GET_RANGE, params: { begin: temp.begin, end: temp.end } });
    } else if (data.error) {
      console.error(data.error);
    }
  }

  function onWeeklyExpense(data) {
    if (data.result) {
      expenseList = data.result.list;
      expenseList.sort((a, b) => a.id > b.id);
      groupExpenseByCategory({ begin: data.result.begin, end: data.result.end });
    } else if (data.error) {
      console.error(data.error);
    }
  }

  const unsubscribeCategoryStore = CATEGORIES_STORE.subscribe(categories => {
    categoriesList = categories;
    let temp = get(persistent);
    if (temp.begin == null || temp.end == null)
      groupExpenseByCategory({ begin: temp.begin, end: temp.end });
  });

  function focus(type: number = 1) {
    const target = document.getElementById('welcome-screen');
    const { softwareKey } = getAppProp();
    if (type == 1) {
      focusChart = true;
      softwareKey.setText({ left: 'PLEASE', center: 'PRESS', right: 'CALL' });
    } else if (type == 2) {
      screenshot = true;
      softwareKey.setText({ left: 'Please', center: '', right: 'Wait' });
    }
    setTimeout(() => {
      target.scroll({ top: 0, behavior: 'smooth' });
    }, 200);
  }

  // 1 focus, 2 screenshot
  function unfocus(type: number = 1) {
    const target = document.getElementById('welcome-screen');
    const { softwareKey } = getAppProp();
    if (type == 1)
      focusChart = false;
    else if (type == 2)
      screenshot = false;
    softwareKey.setText({ left: 'Menu', center: 'EXPENSES', right: 'Add' });
    const chartHeight = document.getElementById('donutChart').offsetHeight;
    target.scroll({ top: chartHeight, behavior: 'smooth' });
    setTimeout(() => {
      navInstance.verticalNavIndex -= 1;
      navInstance.navigateListNav(1);
    }, 200);
  }

  function eventHandler(evt) {
    if (evt.key == "Call" && columns.length > 0 && screenshot === false) {
      if (focusChart == false) {
        focus();
      } else if (focusChart) {
        unfocus();
      }
    }
  }

  function displayKaiAds() {
    let display = true;
    if (window['kaiadstimer'] == null) {
      window['kaiadstimer'] = new Date();
    } else {
      var now = new Date();
      if ((now - window['kaiadstimer']) < 300000) {
        display = false;
      } else {
        window['kaiadstimer'] = now;
      }
    }
    if (!display) return;
    getKaiAd({
      publisher: 'ac3140f7-08d6-46d9-aa6f-d861720fba66',
      app: 'expense-tracker',
      slot: 'kaios',
      onerror: err => console.error(err),
      onready: ad => {
        ad.call('display')
        ad.on('close', () => {});
        ad.on('display', () => {});
      }
    })
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
    displayKaiAds();
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
      <ListView className="{navClass}" title="{item[0]} ({byCategory[item[0]].expenses.length})" subtitle="{currencyUnit} {item[1]}" onClick={() => onClickCategory(item, byCategory[item[0]].expenses)}>
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
    margin-bottom: 5px;
  }
</style>
