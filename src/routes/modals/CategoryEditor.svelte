<script lang="ts">

  import { onMount, onDestroy } from 'svelte';
  import { createKaiNavigator } from '../../utils/navigation.ts';
  import { SoftwareKey, TextInputField } from '../../components/index.ts';
  import EventEmitter from 'events';
  import { IDB_EVENT } from '../../idb-worker/types';
  import toastMessage from '../../toaster.ts';

  export let title: string = 'Modal';
  export let id: number | null;
  export let name: string = '';
  export let color: string = '';
  export let idbWorker: Worker;
  export let idbWorkerEventEmitter: EventEmitter;
  export let onSuccess: Function = (passcode: string) => {};
  export let onError: Function = (error: any) => {};
  export let onOpened: Function = () => {};
  export let onClosed: Function = () => {};

  const navClass: string = "navCategoryEditorModal";

  let softwareKey: SoftwareKey;

  let navOptions = {
    verticalNavClass: navClass,
    softkeyLeftListener: function(evt) {},
    softkeyRightListener: function(evt) {
      onSuccess(null);
    },
    enterListener: async function(evt) {
      addOrUpdateCategory();
    },
    backspaceListener: function(evt) {
      evt.preventDefault();
      evt.stopPropagation();
    }
  };

  let navInstance = createKaiNavigator(navOptions);

  function addOrUpdateCategory() {
    name = name.trim();
    color = color.trim();
    if (name == '') {
      toastMessage('Name required');return;
    }
    if (color == '') {
      toastMessage('Color required');return;
    }
    if (id == null) {
      idbWorker.postMessage({ type: IDB_EVENT.CATEGORY_ADD, params: { name, color } });
    } else {
      idbWorker.postMessage({ type: IDB_EVENT.CATEGORY_UPDATE, params: { id, name, color } });
    }
  }

  function addOrUpdateEvent(data) {
    if (data.result) {
      onSuccess(data.result);
    }
  }

  onMount(() => {
    onOpened();
    idbWorkerEventEmitter.addListener(IDB_EVENT.CATEGORY_ADD, addOrUpdateEvent);
    idbWorkerEventEmitter.addListener(IDB_EVENT.CATEGORY_UPDATE, addOrUpdateEvent);
    navInstance.attachListener();
    softwareKey = new SoftwareKey({
      target: document.body,
      props: {
        isInvert: true,
        leftText: '',
        centerText: id != null ? 'UPDATE' : 'SAVE',
        rightText: 'Cancel'
      }
    });
  })

  onDestroy(() => {
    idbWorkerEventEmitter.removeListener(IDB_EVENT.CATEGORY_ADD, addOrUpdateEvent);
    idbWorkerEventEmitter.removeListener(IDB_EVENT.CATEGORY_UPDATE, addOrUpdateEvent);
    navInstance.detachListener();
    softwareKey.$destroy();
    onClosed();
  })

  function onInput(evt) {
    if (navInstance.verticalNavIndex == 0) {
      name = evt.target.value;
    } else if (navInstance.verticalNavIndex == 1) {
      color = evt.target.value;
    }
  }

  function onFocus(evt) {}

  function onBlur(evt) {}

</script>

<svelte:options accessors/>

<div class="kai-dialog">
  <div class="kai-dialog-content">
    <div class="kai-dialog-header">{title}</div>
    <div class="kai-dialog-body" style="background-color: {color}!important;">
      <TextInputField className="{navClass}" label={null} placeholder="Enter a category name" value="{name}" type="text" {onInput} {onFocus} {onBlur} />
      <TextInputField className="{navClass}" label={null} placeholder="Enter a category color" value="{color}" type="text" {onInput} {onFocus} {onBlur} />
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
