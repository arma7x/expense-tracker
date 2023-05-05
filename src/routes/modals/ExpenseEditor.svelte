<script lang="ts">

  import { onMount, onDestroy } from 'svelte';
  import { createKaiNavigator } from '../../utils/navigation.ts';
  import { SoftwareKey, TextInputField, TextAreaField, DatePicker, TimePicker, ListView, OptionMenu } from '../../components/index.ts';
  import EventEmitter from 'events';
  import { IDB_EVENT, TypeCategory, TypeExpense } from '../../idb-worker/types';
  import { toastMessage } from '../../helpers.ts';

  export let title: string = 'Modal';
  export let id: number | null;
  export let amount: number | string = '';
  export let datetime: Date = new Date();
  export let category: number = 0;
  export let description: string = '';
  export let attachment: number = -1;
  export let categories: {[key:number]: TypeCategory} = {};
  export let idbWorker: Worker;
  export let idbWorkerEventEmitter: EventEmitter;
  export let onSuccess: Function = (o: any) => {};
  export let onError: Function = (error: any) => {};
  export let onOpened: Function = () => {};
  export let onClosed: Function = () => {};

  const navClass: string = "navExpenseEditorModal";

  let softwareKey: SoftwareKey;
  let datePicker: DatePicker;
  let timePicker: DatePicker;
  let categoriesMenu: OptionMenu;

  let categoriesOptions: {[key: string]: any}[] = [];
  let date: string;
  let time: string;

  let navOptions = {
    verticalNavClass: navClass,
    softkeyLeftListener: function(evt) {
      addOrUpdateExpense();
    },
    softkeyRightListener: function(evt) {
      onSuccess(null);
    },
    enterListener: async function(evt) {
      const navClasses = document.getElementsByClassName(navClass);
      if (navClasses[this.verticalNavIndex] != null) {
        navClasses[this.verticalNavIndex].click();
      }
    },
    arrowUpListener: function(evt) {
      this.navigateListNav(-1);
      if ([1, 2, 3].indexOf(this.verticalNavIndex) > -1) {
        softwareKey.setCenterText('SELECT');
      } else {
        softwareKey.setCenterText('');
      }
    },
    arrowDownListener: function(evt) {
      this.navigateListNav(1);
      if ([1, 2, 3].indexOf(this.verticalNavIndex) > -1) {
        softwareKey.setCenterText('SELECT');
      } else {
        softwareKey.setCenterText('');
      }
    },
    backspaceListener: function(evt) {
      evt.preventDefault();
      evt.stopPropagation();
    }
  };

  let navInstance = createKaiNavigator(navOptions);

  function addOrUpdateExpense() {
    const expenseObj: TypeExpense = { id, amount: amount == '' ? 0 : parseFloat(amount), datetime, category, description, attachment };
    if (expenseObj.amount <= 0) {
      toastMessage('Amount must greater than 0');return;
    }
    if (expenseObj.id == null) {
      idbWorker.postMessage({ type: IDB_EVENT.EXPENSE_ADD, params: expenseObj });
    } else {
      idbWorker.postMessage({ type: IDB_EVENT.EXPENSE_UPDATE, params: expenseObj });
    }
  }

  function openDatePicker() {
    datePicker = new DatePicker({
      target: document.body,
      props: {
        title: 'Date Picker',
        date: datetime,
        softKeyLeftText: 'Cancel',
        softKeyCenterText: 'save',
        onSoftkeyLeft: (evt, date) => {
          datePicker.$destroy();
        },
        onSoftkeyRight: (evt, date) => {},
        onEnter: (evt, date) => {
          datetime = date;
          datePicker.$destroy();
        },
        onBackspace: (evt, date) => {
          evt.preventDefault();
          evt.stopPropagation();
          datePicker.$destroy();
        },
        onOpened: () => {
          navInstance.detachListener();
        },
        onClosed: (date) => {
          navInstance.attachListener();
          datePicker = null;
        }
      }
    });
  }

  function openTimePicker() {
    timePicker = new TimePicker({
      target: document.body,
      props: {
        title: 'Time Picker',
        date: datetime,
        is12HourSystem: true,
        softKeyLeftText: 'Cancel',
        softKeyCenterText: 'save',
        onSoftkeyLeft: (evt, date) => {
          timePicker.$destroy();
        },
        onSoftkeyRight: (evt, date) => {},
        onEnter: (evt, date) => {
          datetime = date;
          timePicker.$destroy();
        },
        onBackspace: (evt, date) => {
          evt.preventDefault();
          evt.stopPropagation();
          timePicker.$destroy();
        },
        onOpened: () => {
          navInstance.detachListener();
        },
        onClosed: (date) => {
          navInstance.attachListener();
          timePicker = null;
        }
      }
    });
  }

  function openCategoriesMenu() {
    categoriesMenu = new OptionMenu({
      target: document.body,
      props: {
        title: 'Select Category',
        focusIndex: Object.keys(categories).indexOf(category.toString()) | 0,
        options: categoriesOptions,
        softKeyCenterText: 'select',
        onSoftkeyRight: (evt, scope) => {},
        onSoftkeyLeft: (evt, scope) => {},
        onEnter: (evt, scope) => {
          category = parseInt(Object.keys(categories)[scope.index]);
          categoriesMenu.$destroy();
        },
        onBackspace: (evt, scope) => {
          evt.preventDefault();
          evt.stopPropagation();
          categoriesMenu.$destroy();
        },
        onOpened: () => {
          navInstance.detachListener();
        },
        onClosed: (scope) => {
          navInstance.attachListener();
          categoriesMenu = null;
        }
      }
    });
  }

  function addOrUpdateEvent(data) {
    if (data.result) {
      onSuccess(data.result);
    } else if (data.error) {
      toastMessage(data.error.toString());
    }
  }

  onMount(() => {
    onOpened();
    idbWorkerEventEmitter.addListener(IDB_EVENT.EXPENSE_ADD, addOrUpdateEvent);
    idbWorkerEventEmitter.addListener(IDB_EVENT.EXPENSE_UPDATE, addOrUpdateEvent);
    navInstance.attachListener();
    softwareKey = new SoftwareKey({
      target: document.body,
      props: {
        isInvert: true,
        leftText: id != null ? 'Update' : 'Save',
        centerText: '',
        rightText: 'Cancel'
      }
    });
    categories[0] = { id: 0, name: 'General' };
    const keys: number[] = Object.keys(categories);
    keys.forEach(key => {
      categoriesOptions.push({ title: categories[key].name });
    });
  })

  onDestroy(() => {
    idbWorkerEventEmitter.removeListener(IDB_EVENT.EXPENSE_ADD, addOrUpdateEvent);
    idbWorkerEventEmitter.removeListener(IDB_EVENT.EXPENSE_UPDATE, addOrUpdateEvent);
    navInstance.detachListener();
    softwareKey.$destroy();
    onClosed();
  })

  function onInput(evt) {
    switch (navInstance.verticalNavIndex) {
      case 0:
        try {
          JSON.parse(evt.target.value);
          amount = parseFloat(evt.target.value);
        } catch (err) {
          amount = '';
        }
        break;
      case 4:
        description = evt.target.value;
        break;
    }
  }

  function onFocus(evt) {}

  function onBlur(evt) {}

</script>

<svelte:options accessors/>

<div class="kai-dialog">
  <div class="kai-dialog-content">
    <div class="kai-dialog-header">{title}</div>
    <div class="kai-dialog-body">
      <TextInputField className="{navClass}" label={null} placeholder="Amount" value="{amount}" type="tel" {onInput} {onFocus} {onBlur} />
      <ListView className="{navClass}" title="Category" subtitle="{categories[category] != null ? categories[category].name : ''}" onClick={openCategoriesMenu}/>
      <ListView className="{navClass}" title="Date Picker" subtitle="{datetime.toDateString()}" onClick={openDatePicker}>
        <span slot="rightWidget" class="kai-icon-calendar" style="font-size:20px;"></span>
      </ListView>
      <ListView className="{navClass}" title="Time Picker" subtitle="{datetime.toLocaleTimeString()}" onClick={openTimePicker}>
        <span slot="rightWidget" class="kai-icon-favorite-on" style="font-size:20px;"></span>
      </ListView>
      <TextAreaField className="{navClass}" label={null} placeholder="Description" value="{description}" type="text" rows={4} {onInput} {onFocus} {onBlur}/>
    </div>
  </div>
</div>

<style>
  .kai-dialog {
    width: 100%;
    height: calc(100% - 12px);
    bottom: 30px;
    position: fixed;
    background-color: rgba(0, 0, 0, 0.6);
  }
  .kai-dialog > .kai-dialog-content {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: calc(100% - 66px);
    bottom: 30px;
    position: fixed;
    background-color: #ffffff;
  }
  .kai-dialog > .kai-dialog-content > .kai-dialog-header {
    width: 100%;
    text-align: center;
    vertical-align: middle;
    line-height: 28px;
    height: 28px;
    padding: 0 4px;
    color: #313131;
    background-color: #cccccc;
    font-weight: 200;
  }
  .kai-dialog > .kai-dialog-content > .kai-dialog-body {
    max-height: calc(100% - 78px);
    overflow: scroll;
    padding: 5px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
  }
</style>
