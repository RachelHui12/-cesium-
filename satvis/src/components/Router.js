import Vue from "vue";
import Router from "vue-router";
import Cesium from "./Cesium.vue";

Vue.use(Router);

export default new Router({
  mode: "history",
  routes: [
    { path: "/", component: Cesium, },
  ]
});
