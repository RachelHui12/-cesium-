import { SatelliteProperties } from "./SatelliteProperties";
import { CesiumTimelineHelper } from "./CesiumTimelineHelper";
import { CesiumEntityWrapper } from "./CesiumEntityWrapper";
import { DescriptionHelper } from "./DescriptionHelper";
import axios from 'axios';
import * as Cesium from "cesium/Cesium";
// import CesiumSensorVolumes from "CesiumSensorVolumes";
export class SatelliteEntityWrapper extends CesiumEntityWrapper {
  constructor(viewer, tle, tags) {
    super(viewer);
    this.timeline = new CesiumTimelineHelper(viewer);
    this.props = new SatelliteProperties(tle, tags);
    this.lastid=-1;
    const dataSources=this.viewer.dataSources._dataSources[0];
    this.neighborhoodEntities = dataSources.entities.values;
    this.interval=0;
    this.tags=tags;
    this.tle=tle;
    this.countries=new Array();
  }

  enableComponent(name) {
    if (!this.created) {
      this.createEntities();
    }
    if (name === "Model" && !this.isTracked) {
      return;
    }
    super.enableComponent(name);
  }

  createEntities() {
    this.props.createSampledPosition(this.viewer.clock, sampledPosition => {
      for (var entity in this.entities) {
        if (entity === "Orbit") {
          this.entities[entity].position = this.props.sampledPositionInertial;
          this.entities[entity].orientation = new Cesium.VelocityOrientationProperty(this.props.sampledPositionInertial);
        } else if (entity === "Sensor cone") {
          this.entities[entity].position = sampledPosition;
          this.entities[entity].orientation = new Cesium.CallbackProperty((time) => {
            const position = this.props.position(time);
            const hpr = new Cesium.HeadingPitchRoll(0, Cesium.Math.toRadians(180), 0);
            return Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
          }, false);
        } else {
          this.entities[entity].position = sampledPosition;
          this.entities[entity].orientation = new Cesium.VelocityOrientationProperty(sampledPosition);
        }
      }
    });
    this.createDescription();

    this.entities = {};
    this.createPoint();
    //this.createBox();
    this.createLabel();
    this.createOrbit();
    if (this.props.orbit.orbitalPeriod < 60 * 12) {
      this.createOrbit();
      this.createOrbitTrack();
      this.createGroundTrack();
      //this.createCone();
    }
    if (this.props.groundStationAvailable) {
      this.createGroundStationLink();
    }
    this.defaultEntity = this.entities["Point"];

    this.viewer.selectedEntityChanged.addEventListener(() => {
      if (this.isSelected && !this.isTracked) {
        this.updatePasses();
      }
    });
    this.viewer.trackedEntityChanged.addEventListener(() => {
      if (this.isTracked) {
        this.artificiallyTrack(
          () => { this.updatePasses(); },
          () => { this.timeline.clearTimeline(); }
        );
      }
    });
  }
  changepolygoncolor(){
      this.interval=setInterval(() => {
        var time =this.viewer.clock.currentTime;
        const cartographic = this.props.computePositionCartographicDegrees(time);
        var url='api/country?lat='+cartographic.longitude+'&lon='+cartographic.latitude ;
        console.log(url);
        axios.get(url).then((response) => {
          var id=response.data.id;
          console.log(id);
          console.log(this.lastid);
          if(this.lastid != -1 && id!=this.lastid){
            this.changecolor(this.lastid,Cesium.Color.YELLOW.withAlpha(0.8));
          }   
          if(id !=-1 && id!=this.lastid){
            
            this.changecolor(id,Cesium.Color.PINK.withAlpha(0.8));
          }
          this.lastid=id; 
        })   
        
      }, 500);

  
  };
  getcountries(){
    console.log('ok');
     axios.post('api/pass_countries',{tle: this.tle}).then((response) => {
       if(response.data!='undefined' ){
         
        this.countries.push(response.data);
       }

    }) ;
  }
  stopinterval(){
    clearInterval(this.interval);
  }
  
  createDescription() {
    const description = new Cesium.CallbackProperty((time) => {
      // cartographic地理位置

      const cartographic = this.props.computePositionCartographicDegrees(time);
      const content = DescriptionHelper.renderDescription(time, this.props.name, cartographic, this.props.passes, false, this.props.orbit.tle,this.tags,this.countries);     
      return content;
    }, false);
    console.log(this.description);
    this.description = description;
    console.log(this.description);

  }
  changecolor(id,color){
    var entity = this.neighborhoodEntities[id];
    entity.polygon.material = color;
  }
  createCesiumSatelliteEntity(entityName, entityKey, entityValue) {
    this.createCesiumEntity(entityName, entityKey, entityValue, this.props.name, this.description, this.props.sampledPosition, true);
  }

  createPoint() {
    const point = new Cesium.PointGraphics({
      pixelSize: 10,
      color: Cesium.Color.WHITE,
    });
    this.createCesiumSatelliteEntity("Point", "point", point);
  }

  createBox() {
    const size = 1000;
    const box = new Cesium.BoxGraphics({
      dimensions: new Cesium.Cartesian3(size, size, size),
      material: Cesium.Color.WHITE,
    });
    this.createCesiumSatelliteEntity("Box", "box", box);
  }


//标签
  createLabel() {
    const label = new Cesium.LabelGraphics({
      text: this.props.name,
      scale: 0.6,
      horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
      pixelOffset: new Cesium.Cartesian2(15, 0),
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(10000, 6.0e7),
      pixelOffsetScaleByDistance: new Cesium.NearFarScalar(1.0e1, 10, 2.0e5, 1),
    });
    this.createCesiumSatelliteEntity("Label", "label", label);
  }

  createOrbit() {
    const path = new Cesium.PathGraphics({
      leadTime: this.props.orbit.orbitalPeriod * 60 / 2 + 5,
      trailTime: this.props.orbit.orbitalPeriod * 60 / 2 + 5,
      material: Cesium.Color.WHITE.withAlpha(0.15),
      resolution: 600,
      width: 2,
    });
    this.createCesiumEntity("Orbit", "path", path, this.props.name, this.description, this.props.sampledPositionInertial, true);
  }

  createOrbitTrack(leadTime = this.props.orbit.orbitalPeriod * 60, trailTime = 0) {
    const path = new Cesium.PathGraphics({
      leadTime: leadTime,
      trailTime: trailTime,
      material: Cesium.Color.GOLD.withAlpha(0.15),
      resolution: 600,
      width: 2,
    });
    this.createCesiumSatelliteEntity("Orbit track", "path", path);
  }
//创建地面轨迹
  createGroundTrack() {
    const polyline = new Cesium.PolylineGraphics({
      material: Cesium.Color.ORANGE.withAlpha(0.2),
      positions: new Cesium.CallbackProperty((time) => {
        return this.props.groundTrack(time);
      }, false),
      followSurface: false,
      width: 10,
    });
    this.createCesiumSatelliteEntity("Ground track", "polyline", polyline);
  }

//将处于ongoing的卫星与地面监控站连接
  createGroundStationLink() {
    const polyline = new Cesium.PolylineGraphics({
      followSurface: false,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.5,
        color: Cesium.Color.FORESTGREEN,
      }),
      positions: new Cesium.CallbackProperty((time) => {
        const satPosition = this.props.position(time);
        const groundPosition = this.props.groundStationPosition.cartesian;
        const positions = [satPosition, groundPosition];
        return positions;
      }, false),
      show: new Cesium.CallbackProperty((time) => {
        return this.props.passIntervals.contains(time);
      }, false),
      width: 5,
    });
    this.createCesiumSatelliteEntity("Ground station link", "polyline", polyline);
  }

  set groundStation(position) {
    // No groundstation calculation for GEO satellites
    if (this.props.orbit.orbitalPeriod > 60 * 12) {
      return;
    }

    this.props.groundStationPosition = position;
    this.props.clearPasses();
    if (this.isTracked) {
      this.timeline.clearTimeline();
    }
    if (this.isTracked || this.isSelected) {
      this.updatePasses();
    }
    if (this.created) {
      this.createGroundStationLink();
    }
  }

  updatePasses() {
    if (this.props.updatePasses(this.viewer.clock.currentTime)) {
      if (this.isTracked) {
        this.timeline.addHighlightRanges(this.props.passes);
      }
    }
  }

}

