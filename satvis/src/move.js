import Vue from "vue";
import App from "./App.vue";
import router from "./components/Router";
import { Workbox } from "workbox-window";

const app = new Vue({
  el: "#app",
  router,
  components: { App },
  template: "<App/>"
});

// Export Vue for debugger
window.app = app;

/* global cc */
cc.sats.addFromTleUrl("data/tle/ext/move.txt", ["noMOVE"]);
if (cc.sats.enabledTags.length === 0) {
  cc.sats.enableTag("noMOVE");
}

// Register service worker
if ("serviceWorker" in navigator) {
  const wb = new Workbox("sw.js");
  wb.addEventListener("waiting", () => {
    wb.addEventListener("controlling", () => {
      console.log("Reloading page for latest content");
      window.location.reload();
    });
    wb.messageSW({type: "SKIP_WAITING"});
    // Old serviceworker message for migration, can be removed in the future
    wb.messageSW("SKIP_WAITING");
  });
  wb.register();
}
