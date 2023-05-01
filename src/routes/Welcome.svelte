<script lang="ts">
  import { Route, navigate as goto } from "svelte-navigator";
  import { createKaiNavigator } from '../utils/navigation';
  import { onMount, onDestroy } from 'svelte';
  import EventEmitter from 'events';
  import { IDB_EVENT } from '../idb-worker/enums';

  export let location: any;
  export let navigate: any;
  export let getAppProp: Function;
  export let idbWorker: Worker;
  export let idbWorkerEventEmitter: EventEmitter;

  let name: string = 'Welcome';

  let navOptions = {
    verticalNavClass: 'vertClass',
    horizontalNavClass: 'horzClass',
    softkeyLeftListener: function(evt) {
      console.log('softkeyLeftListener', name);
    },
    softkeyRightListener: function(evt) {
      console.log('softkeyRightListener', name);
    },
    enterListener: function(evt) {
      console.log('enterListener', name);
      goto('demo');
    },
    backspaceListener: function(evt) {
      console.log('backspaceListener', name);
    }
  };

  let navInstance = createKaiNavigator(navOptions);

  onMount(() => {
    console.log('onMount', name);
    const { appBar, softwareKey } = getAppProp();
    appBar.setTitleText(name);
    softwareKey.setText({ left: 'LSK', center: 'DEMO', right: 'RSK' });
    navInstance.attachListener();

    //Object.keys(IDB_EVENT).forEach(name => {
      //idbWorkerEventEmitter.addListener(name, (data) => {
        //console.log(data.result);
        //if (name === IDB_EVENT.INITIALIZE && data.result) {
          //Object.keys(IDB_EVENT).forEach(name => {
            //if (name !== IDB_EVENT.INITIALIZE) {
              //idbWorker.postMessage({ type: name, params: `PING ${new Date()}` });
            //}
          //});
        //} else if (name === IDB_EVENT.INITIALIZE && data.error) {
          //console.error(data.error);
        //}
      //});
    //});

    //idbWorker.postMessage({ type: IDB_EVENT.INITIALIZE, params: { dbName: 'expense-tracker'} });
  });

  onDestroy(() => {
    console.log('onDestroy', name);
    navInstance.detachListener();
  });

</script>

<main id="welcome-screen" data-pad-top="28" data-pad-bottom="30">
  <h1>Hello {name}!</h1>
  <div class="vertical">
    <div class="vertClass">Vertical 1</div>
    <div class="vertClass">Vertical 2</div>
  </div>
  <div class="horizontal">
    <div style="flex:1;" class="horzClass">Horizontal 1</div>
    <div style="flex:1;" class="horzClass">Horizontal 2</div>
  </div>
</main>

<style>
  #welcome-screen {
    overflow: scroll;
    width: 100%;
  }
  #welcome-screen > .vertical {
    display:flex;
    flex-direction:column;
  }
  #welcome-screen > .horizontal {
    width:100%;
    display:flex;
    flex-direction:row;
  }
  :global(#welcome-screen > .vertical > .vertClass)
  :global(#welcome-screen > .vertical > .horizontal) {
    background-color: #ffffff;
    color: #000000;
  }
  :global(#welcome-screen > .vertical > .vertClass.focus),
  :global(#welcome-screen > .horizontal > .horzClass.focus) {
    background-color: red!important;
    color: #fff!important;
  }
</style>
