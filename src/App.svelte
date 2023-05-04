<script lang="ts">
  import { Router, Route, Link } from 'svelte-navigator';
  import { AppBar, SoftwareKey } from './components';
  import { Welcome, Demo, Room } from './routes';
  import { onMount, onDestroy } from 'svelte';
  import { Localization } from './utils/localization';

  import Category from "./routes/Category.svelte";
  import { idbWorker, idbWorkerEventEmitter } from './idb-worker/worker-client';
  import toastMessage from './toaster.ts';
  import './idb-worker/categoriesStore';
  // import { runTest } from './idb-worker/test';

  export let localization = new Localization('en-US', 'langs');
  export let appBar;
  export let softwareKey;

  export const getAppProp = () => {
    return {appBar, softwareKey, localization};
  }

  onMount(async() => {
    toastMessage("Press Call to focus chart");
    //try {
      //await runTest();
    //} catch (err) {
      //console.error(err);
    //}
  });

</script>

<Router>
  <div id="kai-status-bar"></div>
  <AppBar bind:this={appBar} />
  <main>
    <Route primary={false} path="index.html" let:location let:navigate>
      <svelte:component this="{Welcome}" {location} {navigate} {getAppProp} {idbWorker} {idbWorkerEventEmitter}/>
    </Route>
    <Route primary={false} path="/" let:location let:navigate>
      <svelte:component this="{Welcome}" {location} {navigate} {getAppProp} {idbWorker} {idbWorkerEventEmitter}/>
    </Route>
    <Route primary={false} path="manage-category" let:location let:navigate>
      <svelte:component this="{Category}" {location} {navigate} {getAppProp} {idbWorker} {idbWorkerEventEmitter}/>
    </Route>
    <Route primary={false} path="room" let:location let:navigate>
      <svelte:component this="{Room}" {location} {navigate} {getAppProp}/>
    </Route>
  </main>
  <SoftwareKey bind:this={softwareKey} />
</Router>

<style>
  #kai-status-bar {
    height: 26px;
    width: 100%;
    background-color: var(--themeColor);
  }
  main {
    display: flex;
    top: 54px;
    margin: 0px;
    padding: 0px;
    position: fixed;
    text-align: center;
    width: 100%;
    height: calc(100% - 84px);
    overflow: scroll;
  }
  :global(._toastItem) {
    text-align: center!important;
  }
</style>
