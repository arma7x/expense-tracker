<script lang="ts">
  import { navigate as goto } from "svelte-navigator";
  import { createKaiNavigator } from '../utils/navigation';
  import { onMount, onDestroy } from 'svelte';
  import CategoryEditor from './modals/CategoryEditor.svelte';
  import EventEmitter from 'events';
  import { IDB_EVENT, CategoryType } from '../idb-worker/types';
  import CATEGORIES_STORE from '../idb-worker/categoriesStore.ts';
  import { ListView, Dialog, Toast, Toaster } from '../components/index.ts';
  import toastMessage from '../toaster.ts';

  export let location: any;
  export let navigate: any;
  export let getAppProp: Function;
  export let idbWorker: Worker;
  export let idbWorkerEventEmitter: EventEmitter;

  const navClass: string = "navManageCategory";

  let title: string = 'Manage Category';
  let categoryList: Array<CategoryType> = {};

  let dialog: Dialog;
  let categoryEditorModal: CategoryEditor;

  let navOptions = {
    verticalNavClass: navClass,
    softkeyLeftListener: function(evt) {
      openCategoryEditorModal(null);
    },
    softkeyRightListener: function(evt) {
      const navClasses = document.getElementsByClassName(navClass);
      if (navClasses[this.verticalNavIndex] != null) {
        try {
          removeCategory(categoryList[parseInt(navClasses[this.verticalNavIndex].getAttribute('data-key'))]);
        } catch (err) {}
      }
    },
    enterListener: function(evt) {
      const navClasses = document.getElementsByClassName(navClass);
      if (navClasses[this.verticalNavIndex] != null) {
        navClasses[this.verticalNavIndex].click();
      }
    },
    backspaceListener: function(evt) {
      evt.preventDefault();
      goto(-1);
    }
  };

  let navInstance = createKaiNavigator(navOptions);

  const unsubscribe = CATEGORIES_STORE.subscribe(categories => {
    const { softwareKey } = getAppProp();
    categoryList = categories;
    const length = Object.keys(categories).length;
    if (length > 0)
      softwareKey.setText({ left: 'Add', center: 'Edit', right: 'Remove' });
    else
      softwareKey.setText({ left: 'Add', center: '', right: '' });
    if (navInstance.verticalNavIndex > length - 1) {
      navInstance.navigateListNav(-1);
    } else if (length === 1) {
      setTimeout(() => {
        navInstance.navigateListNav(1);
      }, 200);
    }
  });

  function openCategoryEditorModal(category: CategoryType | null) {
    categoryEditorModal = new CategoryEditor({
      target: document.body,
      props: {
        title: category != null ? 'Update Category' : 'Add Category',
        id: category != null ? category.id : null,
        name: category != null ? category.name : "",
        color: category != null ? category.color : "",
        idbWorker: idbWorker,
        idbWorkerEventEmitter: idbWorkerEventEmitter,
        onSuccess: (result: any) => {
          categoryEditorModal.$destroy();
        },
        onError: (err: any) => {
          toastMessage(err.toString());
        },
        onOpened: () => {
          navInstance.detachListener();
        },
        onClosed: () => {
          navInstance.attachListener();
          categoryEditorModal = null;
        }
      }
    });
  }

  async function countExpenseByCategory(id: number) {
    return new Promise((resolve, reject) => {
      function listener(data) {
        if (data.result != null) {
          resolve(data.result);
        } else if (data.error) {
          reject(data.error);
        }
        idbWorkerEventEmitter.removeListener(IDB_EVENT.EXPENSE_COUNT_CATEGORY, listener);
      }
      idbWorkerEventEmitter.addListener(IDB_EVENT.EXPENSE_COUNT_CATEGORY, listener);
      idbWorker.postMessage({ type: IDB_EVENT.EXPENSE_COUNT_CATEGORY, params: { category: id } });
    });
  }

  async function removeCategory(category: CategoryType) {
    const count = await countExpenseByCategory(category.id);
    if (count > 0) {
      toastMessage(`${count} expenses under ${category.name}`);return;
    }
    dialog = new Dialog({
      target: document.body,
      props: {
        title: 'Confirmation',
        html: true,
        body: `Are you sure to remove <b>${category.name}</b> ?`,
        softKeyLeftText: 'No',
        softKeyCenterText: ' ',
        softKeyRightText: 'Yes',
        onSoftkeyLeft: (evt) => {
          dialog.$destroy();
        },
        onSoftkeyRight: (evt) => {
          dialog.$destroy();
          idbWorker.postMessage({ type: IDB_EVENT.CATEGORY_DELETE, params: { id: category.id } });
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

  onMount(() => {
    const { appBar, softwareKey } = getAppProp();
    appBar.setTitleText(title);
    navInstance.attachListener();
  });

  onDestroy(() => {
    unsubscribe();
    navInstance.detachListener();
  });

</script>

<main id="manage-category-screen" data-pad-top="28" data-pad-bottom="30">
  {#if Object.keys(categoryList).length > 0}
    {#each Object.keys(categoryList) as key }
      <ListView key="{key}" className="{navClass}" title="{categoryList[key].name}" subtitle="{categoryList[key].color}" onClick={() => openCategoryEditorModal(categoryList[key])}>
        <span slot="leftWidget" class="kai-icon-favorite-on" style="color:{categoryList[key].color};margin-right:20px;"></span>
      </ListView>
    {/each}
  {:else}
    <div class="container" style="height:100%;display:flex;align-items:center;justify-content:center;">
      Press `Add` button to insert new category
    </div>
  {/if}
</main>

<style>
  #manage-category-screen {
    overflow: scroll;
    overflow-x: hidden;
    width: 100%;
  }
  #manage-category-screen > .vertical {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
