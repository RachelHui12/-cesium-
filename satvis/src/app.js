import Vue from "vue";
import App from "./App.vue";
import router from "./components/Router";
import { Workbox } from "workbox-window";
import * as Sentry from "@sentry/browser";
Sentry.init({ dsn: "https://0c7d1a82eedb48ee8b83d87bf09ad144@sentry.io/1541793" });
import axios from 'axios'
import VueAxios from 'vue-axios'

Vue.use(VueAxios, axios)

const app = new Vue({
  el: "#app",
  router,
  components: { App },
  template: "<App/>"
});

// Export Vue for debugger
window.app = app;

/* global cc */
//cc.sats.addFromTleUrl("data/tle/norad/active.txt", ["Active"]);
// cc.sats.addFromTleUrl("data/tle/norad/planet.txt", ["Planet"]);
// cc.sats.addFromTleUrl("data/tle/norad/starlink.txt", ["Starlink"]);
// cc.sats.addFromTleUrl("data/tle/norad/globalstar.txt", ["BEIDOU"]);
// cc.sats.addFromTleUrl("data/tle/norad/resource.txt", ["Resource"]);
// cc.sats.addFromTleUrl("data/tle/norad/science.txt", ["Science"]);
// cc.sats.addFromTleUrl("data/tle/norad/stations.txt", ["Stations"]);
// cc.sats.addFromTleUrl("data/tle/norad/weather.txt", ["Weather"]);
// // cc.sats.addFromTleUrl("data/tle/norad/tle-new.txt", ["New"]);
// cc.sats.addFromTleUrl("data/tle/ext/beidou.txt", ["BEIDOU"]);
// cc.sats.addFromTleUrl("data/tle/ext/move.txt", ["MOVE"]);
if (cc.sats.enabledTags.length === 0) {
  cc.sats.enableTag("MOVE");
}

// Register service worker
if ("serviceWorker" in navigator) {
  const wb = new Workbox("sw.js");
  wb.addEventListener("controlling", (evt) => {
    if (evt.isUpdate) {
      console.log("Reloading page for latest content");
      window.location.reload();
    }
  });
  wb.register();
}
