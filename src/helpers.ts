import { LoadingBar, Toast, Toaster } from './components/index';
import type { KaiNavigator } from './utils/navigation';

export function toastMessage(text) {
  const t = new Toast({
    target: document.body,
    props: {
      options: {}
    }
  })
  Toaster.push(text , {
    dismissable: false,
    intro: { y: -64 },
    duration: 2000,
    onpop: () => {
      setTimeout(() => {
        t.$destroy();
      }, 4000);
    }
  })
}

let loadingBar: LoadingBar;

export function showLoadingBar(parentNavInstance?: KaiNavigator) {
  loadingBar = new LoadingBar({
    target: document.body,
    props: {
      onOpened: () => {
        if (parentNavInstance != null)
          parentNavInstance.detachListener();
      },
      onClosed: () => {
        if (parentNavInstance != null)
          parentNavInstance.attachListener();
        loadingBar = null;
      }
    }
  });
}

export function hideLoadingBar() {
  if (loadingBar)
    loadingBar.$destroy();
}

export {
  loadingBar,
}
