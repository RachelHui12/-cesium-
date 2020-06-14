// Import webpack externals
import * as Cesium from "cesium/Cesium";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { DeviceDetect } from "./util/DeviceDetect";
import { SatelliteManager } from "./SatelliteManager";

dayjs.extend(utc);

export class CesiumController {
  constructor() {
    this.minimalUI = DeviceDetect.inIframe() || DeviceDetect.isIos();
    this.minimalUIAtStartup = DeviceDetect.inIframe();

    this.viewer = new Cesium.Viewer("cesiumContainer", {
      animation: !this.minimalUI,
      baseLayerPicker: false,
      fullscreenButton: !this.minimalUI,
      fullscreenElement: document.body,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      imageryProvider: this.createImageryProvider().provider,
      navigationHelpButton: false,
      navigationInstructionsInitiallyVisible: false,
      selectionIndicator: false,
      timeline: !this.minimalUI,
      vrButton: !this.minimalUI,
      contextOptions: {
        webgl: {
          alpha: true,
        },
      },
    });
    // this.viewer.dataSources.add('../../data/world.geo.json');
    this.viewer.dataSources.add(Cesium.GeoJsonDataSource.load('../../data/world2.geo.json', {
      stroke: Cesium.Color.BLACK,
      fill: Cesium.Color.YELLOW.withAlpha(0.8),
      strokeWidth: 5
  }));

    // Cesium default settings
    this.viewer.clock.shouldAnimate = true;
    this.viewer.scene.globe.enableLighting = true;
    this.viewer.scene.highDynamicRange = true;
    this.viewer.scene.maximumRenderTimeChange = 1/30;
    this.viewer.scene.requestRenderMode = true;
    //this.viewer.scene.debugShowFramesPerSecond = true;

    // Export CesiumController for debugger
    window.cc = this;

    // CesiumController config
    this.imageryProviders = ["Offline", "OfflineHighres", "ArcGis", "OSM", "Tiles", "BlackMarble", "GOES-IR", "Nextrad", "Meteocool"];
    this.terrainProviders = ["None", "Maptiler"];
    this.sceneModes = ["3D", "2D", "Columbus"];
    this.cameraModes = ["Fixed", "Inertial"];
    this.groundStationPicker = { enabled: false };

    this.createInputHandler();
    this.styleInfoBox();

    // Create Satellite Manager 创建卫星管理模块
    this.sats = new SatelliteManager(this.viewer);

    // Add privacy policy to credits when not running in iframe
    if (!DeviceDetect.inIframe()) {
      this.viewer.scene.frameState.creditDisplay.addDefaultCredit(new Cesium.Credit("<a href=\"/privacy.html\" target=\"_blank\"><u>Privacy</u></a>"));
    }

    // Fix Cesium logo in minimal ui mode
    if (this.minimalUI) {
      setTimeout(() => { this.fixLogo(); }, 2500);
    }
  }

  set sceneMode(sceneMode) {
    switch(sceneMode) {
    case "3D":
      this.viewer.scene.morphTo3D();
      break;
    case "2D":
      this.viewer.scene.morphTo2D();
      break;
    case "Columbus":
      this.viewer.scene.morphToColumbusView();
      break;
    }
  }

  set imageryProvider(imageryProviderName) {
    if (!this.imageryProviders.includes(imageryProviderName)) {
      return;
    }

    const layers = this.viewer.scene.imageryLayers;
    layers.removeAll();
    layers.addImageryProvider(this.createImageryProvider(imageryProviderName).provider);
  }

  clearImageryLayers() {
    this.viewer.scene.imageryLayers.removeAll();
  }

  addImageryLayer(imageryProviderName, alpha) {
    if (!this.imageryProviders.includes(imageryProviderName)) {
      return;
    }

    const layers = this.viewer.scene.imageryLayers;
    const imagery = this.createImageryProvider(imageryProviderName);
    const layer = layers.addImageryProvider(imagery.provider);
    if (typeof alpha === "undefined") {
      alpha = imagery.alpha;
    }
    layer.alpha = alpha;
  }
// 加载不同底层的地图
  createImageryProvider(imageryProviderName = "OfflineHighres") {
    let provider;
    let alpha = 1;
    switch(imageryProviderName) {
    case "Offline":
      provider = new Cesium.TileMapServiceImageryProvider({
        url: Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
      });
      break;
    case "OfflineHighres":
      provider = new Cesium.TileMapServiceImageryProvider({
        url : "data/cesium-assets/imagery/NaturalEarthII",
        maximumLevel : 5,
        credit : "Imagery courtesy Natural Earth"
      });
      break;
    case "ArcGis":
      provider = new Cesium.ArcGisMapServerImageryProvider({
        url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
      });
      break;
    case "OSM":
      provider = new Cesium.OpenStreetMapImageryProvider({
        url : "https://a.tile.openstreetmap.org/"
      });
      break;
    case "Tiles":
      provider = new Cesium.TileCoordinatesImageryProvider();
      break;
    case "BlackMarble":
      provider = new Cesium.WebMapServiceImageryProvider({
        url: "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi",
        layers: "VIIRS_Black_Marble",
        style: "default",
        tileMatrixSetID: "250m",
        format: "image/png",
        tileWidth: 512,
        tileHeight: 512,
        credit: "NASA Global Imagery Browse Services for EOSDIS"
      });
      break;
    case "GOES-IR":
      provider = new Cesium.WebMapServiceImageryProvider({
        url : "https://mesonet.agron.iastate.edu/cgi-bin/wms/goes/conus_ir.cgi?",
        layers : "goes_conus_ir",
        credit : "Infrared data courtesy Iowa Environmental Mesonet",
        parameters : {
          transparent : "true",
          format : "image/png"
        }
      });
      alpha = 0.5;
      break;
    case "Nextrad":
      provider = new Cesium.WebMapServiceImageryProvider({
        url : "https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi?",
        layers : "nexrad-n0r",
        credit : "US Radar data courtesy Iowa Environmental Mesonet",
        parameters : {
          transparent : "true",
          format : "image/png"
        }
      });
      alpha = 0.5;
      break;
    case "Meteocool":
      provider = new Cesium.UrlTemplateImageryProvider({
        url : "https://{s}.tileserver.unimplemented.org/data/raa01-wx_10000-latest-dwd-wgs84_transformed/{z}/{x}/{y}.png",
        rectangle: Cesium.Rectangle.fromDegrees(2.8125, 45, 19.6875, 56.25),
        minimumLevel: 6,
        maximumLevel: 10,
        credit : "DE Radar data courtesy of meteocool.com",
        subdomains: "ab"
      });
      alpha = 0.5;
      break;
    }
    return { provider, alpha };
  }

  set terrainProvider(terrainProviderName) {
    if (!this.terrainProviders.includes(terrainProviderName)) {
      return;
    }

    switch(terrainProviderName) {
    case "None":
      this.viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
      break;
    case "Maptiler":
      this.viewer.terrainProvider = new Cesium.CesiumTerrainProvider({
        url: "https://api.maptiler.com/tiles/terrain-quantized-mesh/?key=8urAyLJIrn6TeDtH0Ubh",
        credit: "<a href=\"https://www.maptiler.com/copyright/\" target=\"_blank\">© MapTiler</a> <a href=\"https://www.openstreetmap.org/copyright\" target=\"_blank\">© OpenStreetMap contributors</a>",
        requestVertexNormals: true,
      });
      break;
    case "ArcGIS":
      this.viewer.terrainProvider = new Cesium.ArcGISTiledElevationTerrainProvider({
        url: "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer"
      });
      break;
    }
  }

  jumpTo(location) {
    switch(location) {
    case "Everest":
      this.viewer.camera.lookAt(new Cesium.Cartesian3(300770.50872389384, 5634912.131394585, 2978152.2865545116), new Cesium.Cartesian3(6344.974098678562, -793.3419798081741, 2499.9508860763162));
      this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      break;
    case "HalfDome":
      this.viewer.camera.lookAt(new Cesium.Cartesian3(-2489625.0836225147, -4393941.44443024, 3882535.9454173897), new Cesium.Cartesian3(-6857.40902037546, 412.3284835694358, 2147.5545426812023));
      this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      break;
    }
  }

  set cameraMode(cameraMode) {
    switch(cameraMode) {
    case "Inertial":
      this.viewer.scene.postUpdate.addEventListener(this.cameraTrackEci);
      break;
    case "Fixed":
      this.viewer.scene.postUpdate.removeEventListener(this.cameraTrackEci);
      break;
    }
  }

  cameraTrackEci(scene, time) {
    if (scene.mode !== Cesium.SceneMode.SCENE3D) {
      return;
    }

    const icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(time);
    if (Cesium.defined(icrfToFixed)) {
      const camera = scene.camera;
      const offset = Cesium.Cartesian3.clone(camera.position);
      const transform = Cesium.Matrix4.fromRotationTranslation(icrfToFixed);
      camera.lookAtTransform(transform, offset);
    }
  }

  setTime(current, start = dayjs.utc(current).subtract(12, "hour").toISOString(), stop = dayjs.utc(current).add(7, "day").toISOString()) {
    this.viewer.clock.startTime = Cesium.JulianDate.fromIso8601(dayjs.utc(start).toISOString());
    this.viewer.clock.stopTime = Cesium.JulianDate.fromIso8601(dayjs.utc(stop).toISOString());
    this.viewer.clock.currentTime = Cesium.JulianDate.fromIso8601(dayjs.utc(current).toISOString());
    if (typeof this.viewer.timeline !== "undefined") {
      this.viewer.timeline.updateFromClock();
      this.viewer.timeline.zoomTo(this.viewer.clock.startTime, this.viewer.clock.stopTime);
    }
  }

  createInputHandler() {
    const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    handler.setInputAction((event) => {
      if (!this.groundStationPicker.enabled) {
        return;
      }
      this.setGroundStationFromClickEvent(event);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }
//点击创建地面监控站
  setGroundStationFromClickEvent(event) {
    const cartesian = this.viewer.camera.pickEllipsoid(event.position);
    const didHitGlobe = Cesium.defined(cartesian);
    if (didHitGlobe) {
      const coordinates = {};
      const cartographicPosition = Cesium.Cartographic.fromCartesian(cartesian);
      coordinates.longitude = Cesium.Math.toDegrees(cartographicPosition.longitude);
      coordinates.latitude = Cesium.Math.toDegrees(cartographicPosition.latitude);
      coordinates.height = Cesium.Math.toDegrees(cartographicPosition.height);
      coordinates.cartesian = cartesian;
      this.sats.setGroundStation(coordinates);
      this.groundStationPicker.enabled = false;
    }
  }
//从自己所在的地理位置创建监控站
  setGroundStationFromGeolocation() {
    navigator.geolocation.getCurrentPosition(position => {
      if (typeof position === "undefined") {
        return;
      }
      const coordinates = {};
      coordinates.longitude = position.coords.longitude;
      coordinates.latitude = position.coords.latitude;
      coordinates.height = position.coords.altitude;
      coordinates.cartesian = Cesium.Cartesian3.fromDegrees(coordinates.longitude, coordinates.latitude, coordinates.height);
      this.sats.setGroundStation(coordinates);
    });
  }

  setGroundStationFromLatLon(latlon) {
    let [latitude, longitude, height] = latlon.split(",");
    if (!latitude || !longitude) {
      return;
    }
    const coordinates = {};
    coordinates.longitude = parseFloat(longitude);
    coordinates.latitude = parseFloat(latitude);
    coordinates.height = 0;
    if (height) {
      coordinates.height = parseFloat(height);
    }
    coordinates.cartesian = Cesium.Cartesian3.fromDegrees(coordinates.longitude, coordinates.latitude, coordinates.height);
    this.sats.setGroundStation(coordinates);
  }

  set showUI(enabled) {
    if (enabled) {
      this.viewer._animation.container.style.visibility = "";
      this.viewer._timeline.container.style.visibility = "";
      this.viewer._fullscreenButton._container.style.visibility = "";
      this.viewer._vrButton._container.style.visibility = "";
      this.viewer._bottomContainer.style.left = this.oldBottomContainerStyleLeft;
      this.viewer._bottomContainer.style.bottom = "30px";
    } else {
      this.viewer._animation.container.style.visibility = "hidden";
      this.viewer._timeline.container.style.visibility = "hidden";
      this.viewer._fullscreenButton._container.style.visibility = "hidden";
      this.viewer._vrButton._container.style.visibility = "hidden";
      this.oldBottomContainerStyleLeft = this.viewer._bottomContainer.style.left;
      this.viewer._bottomContainer.style.left = "5px";
      this.viewer._bottomContainer.style.bottom = "0px";
    }
  }

  get showUI() {
    return this.viewer._timeline.container.style.visibility !== "hidden";
  }

  fixLogo() {
    if (this.minimalUI) {
      this.viewer._bottomContainer.style.left = "5px";
    }
    if (DeviceDetect.isiPhoneWithNotchVisible()) {
      this.viewer._bottomContainer.style.bottom = "20px";
    }
  }

  enableTransparency() {
    this.viewer.scene.backgroundColor = Cesium.Color.TRANSPARENT;
    this.viewer.scene.moon = undefined;
    this.viewer.scene.skyAtmosphere = undefined;
    this.viewer.scene.skyBox = undefined;
    this.viewer.scene.sun = undefined;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    document.getElementById("cesiumContainer").style.background = "transparent";
  }

  styleInfoBox() {
    const infoBox = this.viewer.infoBox.container.getElementsByClassName("cesium-infoBox")[0];
    const close = this.viewer.infoBox.container.getElementsByClassName("cesium-infoBox-close")[0];
    if (infoBox && close) {
      // Container for additional buttons
      let container = document.createElement("div");
      container.setAttribute("class", "cesium-infoBox-container");
      infoBox.insertBefore(container, close);

      // Notify button
      let notifyButton = document.createElement("button");
      notifyButton.setAttribute("type", "button");
      notifyButton.setAttribute("class", "cesium-button cesium-infoBox-custom");
      notifyButton.innerHTML = "<i class=\"fas fa-bell\" />";
      notifyButton.addEventListener("click", () => {
        if (this.sats.selectedSatellite) {
          this.sats.getSatellite(this.sats.selectedSatellite).props.notifyPasses();
        } else if (this.sats.groundStationAvailable && this.sats.groundStation.isSelected) {
          this.sats.enabledSatellites.forEach((sat) => {
            sat.props.notifyPasses();
          });
        }
      });
      container.appendChild(notifyButton);

      // Info button
      let infoButton = document.createElement("button");
      infoButton.setAttribute("type", "button");
      infoButton.setAttribute("class", "cesium-button cesium-infoBox-custom");
      infoButton.innerHTML = "<i class=\"fas fa-info\" />";
      infoButton.addEventListener("click", () => {
        if (!this.sats.selectedSatellite) {
          return;
        }
        const satnum = this.sats.getSatellite(this.sats.selectedSatellite).props.satnum;
        const url = "https://www.n2yo.com/satellite/?s=" + satnum;
        window.open(url, "_blank", "noopener");
      });
      container.appendChild(infoButton);
    }

    const frame = this.viewer.infoBox.frame;
    frame.addEventListener("load", function () {
      // Inline infobox css as iframe does not use service worker
      const head = frame.contentDocument.head;
      const links = head.getElementsByTagName("link");
      for (const link of links) {
        head.removeChild(link);
      }
      const css = require("to-string-loader!css-loader!postcss-loader!../css/infobox.ecss");
      const style = frame.contentDocument.createElement("style");
      var node = document.createTextNode(css);
      style.appendChild(node);
      head.appendChild(style);
    }, false);
  }
}
function isInPolygon(checkPoint, polygonPoints) {
  var counter = 0;
  var i;
  var xinters;
  var p1, p2;
  var pointCount = polygonPoints.length;
  p1 = polygonPoints[0];

  for (i = 1; i <= pointCount; i++) {
      p2 = polygonPoints[i % pointCount];
      if (
          checkPoint[0] > Math.min(p1[0], p2[0]) &&
          checkPoint[0] <= Math.max(p1[0], p2[0])
      ) {
          if (checkPoint[1] <= Math.max(p1[1], p2[1])) {
              if (p1[0] != p2[0]) {
                  xinters =
                      (checkPoint[0] - p1[0]) *
                          (p2[1] - p1[1]) /
                          (p2[0] - p1[0]) +
                      p1[1];
                  if (p1[1] == p2[1] || checkPoint[1] <= xinters) {
                      counter++;
                  }
              }
          }
      }
      p1 = p2;
  }
  if (counter % 2 == 0) {
      return false;
  } else {
      return true;
  }
}