<script lang="ts">

  import { onMount, onDestroy } from 'svelte';
  import { createKaiNavigator } from '../../utils/navigation.ts';
  import { SoftwareKey, DatePicker, ListView } from '../../components/index.ts';

  export let title: string = 'Modal';
  export let begin: Date = new Date();
  export let end: Date = new Date();
  export let onSuccess: Function = (o: any) => {};
  export let onOpened: Function = () => {};
  export let onClosed: Function = () => {};

  const navClass: string = "navCustomRangeModal";

  let softwareKey: SoftwareKey;
  let datePicker: DatePicker;

  let navOptions = {
    verticalNavClass: navClass,
    softkeyLeftListener: function(evt) {
      onSuccess({begin, end});
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
    backspaceListener: function(evt) {
      evt.preventDefault();
      evt.stopPropagation();
    }
  };

  let navInstance = createKaiNavigator(navOptions);

  function openDatePicker(dt: Date, type: number) {
    datePicker = new DatePicker({
      target: document.body,
      props: {
        title: 'Date Picker',
        date: dt,
        softKeyLeftText: 'Cancel',
        softKeyCenterText: 'save',
        onSoftkeyLeft: (evt, date) => {
          datePicker.$destroy();
        },
        onSoftkeyRight: (evt, date) => {},
        onEnter: (evt, date) => {
          if (type == 0)
            begin = date;
          else
            end = date;
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

  onMount(() => {
    onOpened();
    navInstance.attachListener();
    softwareKey = new SoftwareKey({
      target: document.body,
      props: {
        isInvert: true,
        leftText: 'Done',
        centerText: 'SELECT',
        rightText: 'Cancel'
      }
    });
  })

  onDestroy(() => {
    navInstance.detachListener();
    softwareKey.$destroy();
    onClosed();
  })

</script>

<svelte:options accessors/>

<div class="kai-dialog">
  <div class="kai-dialog-content">
    <div class="kai-dialog-header">{title}</div>
    <div class="kai-dialog-body">
      <ListView className="{navClass}" title="Begin" subtitle="{begin.toDateString()}" onClick={() => { openDatePicker(begin, 0) }}>
        <span slot="rightWidget" class="kai-icon-calendar" style="font-size:20px;"></span>
      </ListView>
      <ListView className="{navClass}" title="End" subtitle="{end.toDateString()}" onClick={() => { openDatePicker(end, 1) }}>
        <span slot="rightWidget" class="kai-icon-calendar" style="font-size:20px;"></span>
      </ListView>
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
