import { Toast, Toaster } from './components/index';

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
