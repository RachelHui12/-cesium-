import { SatelliteEntityWrapper } from "./SatelliteEntityWrapper";
import { GroundStationEntity } from "./GroundStationEntity";
import { DescriptionHelper } from "./DescriptionHelper";
import * as Cesium from "cesium/Cesium";
import axios from 'axios';
/* global app */

export class SatelliteManager {
  constructor(viewer) {
    this.viewer = viewer;

    this.satellites = [];
    this.enabledComponents = ["Point"];
    this.enabledTags = [];
    this.enabletles=[];
    this.addFromTleUrl("../../data/tle/ext/beidou.txt", ["北斗卫星"]);
    this.addFromTleUrl("../../data/tle/ext/ziyuan.txt", ["资源系列"]);
    this.addFromTleUrl("../../data/tle/ext/huanjin.txt", ["环境系列"]);
    this.addFromTleUrl("../../data/tle/ext/zhongba.txt", ["中巴资源"]);
    this.addFromTleUrl("../../data/tle/ext/shijian.txt", ["实践系列"]); 
    this.description='123';
// 监听事件，如果追踪的实体变化了，就改变
    this.viewer.trackedEntityChanged.addEventListener(() => {
      let trackedSatelliteName = this.trackedSatellite;
      if (trackedSatelliteName) {
        this.getSatellite(trackedSatelliteName).show(this.enabledComponents);
      }
      if ("app" in window) {
        app.$emit("updateTracked");
      }
    });
    this.labels=[];
    this.polygon=[];
    this.viewer.selectedEntityChanged.addEventListener((data) => {
      console.log(data);
      if (data!= undefined && data.__proto__ !='Object' ) {
          this.viewer.entities.remove(this.labels[0]);
          if(this.labels.length>0){
            this.labels[0].hide(["Label"]);
            this.labels[0].hide(["Orbit"]);
            this.labels[0].stopinterval();
            var id = this.labels[0].lastid;
            if(id>=0){
            this.labels[0].neighborhoodEntities[id].polygon.material = Cesium.Color.YELLOW.withAlpha(0.8);
            }
          }
          console.log(data.polygon);

          if(data.polygon!=undefined){

            this.createcoutrydescription(data);
          }
          else{
          this.labels.pop();
          const selectedSat = this.satellites.find((sat) =>  sat.props.name == data.name);
          selectedSat.show(["Label"]);
          selectedSat.show(["Orbit"]);
          selectedSat.changepolygoncolor();
          selectedSat.getcountries();
          // this.viewer.entities.add(data["Label"]);
          this.labels.push(selectedSat);
        }
      }
    });
  }
  //创建国家描述信息
  createcoutrydescription(data){
    var time =this.viewer.clock.currentTime;
      var enabletles=[];
      this.enabledSatellites.forEach((sat) => {
        enabletles.push(sat.tle);
      });
      console.log(enabletles);
      var information;
      axios.post('api/pass_sats', enabletles).then((response) => {
        if(response.data!='undefined' ){         
           information= response.data;
        }
        console.log(information);
         information.forEach((item)=>{
          if(item.country == data.name){
            console.log(item.sats);
            data.description = DescriptionHelper.renderDescription(time, "", "", item.sats, false, "","","");     
            console.log(this.description);
          
          }
        })
     }) ;
     

  }

// 从url添加tle卫星数据
  addFromTleUrl(url, tags) {
    fetch(url, {
      mode: "no-cors",
    })
      .then(response => {
        if (!response.ok) {
          throw Error(response.statusText);
        }
        
        return response;
      }).then(response => response.text())
      .then(data => {
        const lines = data.split(/\r?\n/);

        for (let i = 3; i < lines.length; i + 3) {
          let tle = lines.splice(i - 3, i).join("\n");

          this.addFromTle(tle, tags);
        }
      }).catch(function(error) {
        console.log(error);
      });
  }
  
  addFromTle(tle, tags) {
    const sat = new SatelliteEntityWrapper(this.viewer, tle, tags);
    this.add(sat);
  }

// 添加新的卫星
  add(newSat) {
    const existingSat = this.satellites.find((sat) => sat.props.satnum == newSat.props.satnum && sat.props.name == newSat.props.name);
    if (existingSat) {
      existingSat.props.addTags(newSat.props.tags);
      //包括point、label、orbit等
      if (newSat.props.tags.some(tag => this.enabledTags.includes(tag))) {
        existingSat.show(this.enabledComponents);
      }
      return;
    }
    if (this.groundStationAvailable) {
      newSat.groundStation = this.groundStation.position;
    }
    this.satellites.push(newSat);

    if (newSat.props.tags.some(tag => this.enabledTags.includes(tag))) {
      newSat.show(this.enabledComponents);
      if (this.pendingTrackedSatellite === newSat.props.name) {
        this.trackedSatellite = newSat.props.name;
      }
    }
  }
// 卫星tag列表
  get taglist() {
    let taglist = {};
    this.satellites.forEach((sat) => {
      sat.props.tags.forEach((tag) => {
        (taglist[tag] = taglist[tag] || []).push(sat.props.name);
      });
    });
    Object.values(taglist).forEach((tag) => {
      tag.sort();
    });
    return taglist;
  }
// 卫星列表
  get satlist() {
    let satlist = Object.keys(this.taglist).sort().map((tag) => {
      return {
        name: tag,
        list: this.taglist[tag],
      };
    });
    if (satlist.length === 0) {
      satlist = [{name: "", list: []}];
    }
    return satlist;
  }
// 选中卫星类别
  get selectedSatellite() {
    for (let sat of this.satellites) {
      if (sat.isSelected) {
        return sat.props.name;
      }
    }
    return "";
  }
// 追踪卫星
// 计算属性由两部分组成，get和set，分别用来获取计算属性和设置计算属性
  get trackedSatellite() {
    for (let sat of this.satellites) {
      if (sat.isTracked) {
        return sat.props.name;
      }
    }
    return "";
  }

  set trackedSatellite(name) {
    if (!name) {
      if (this.trackedSatellite) {
        this.viewer.trackedEntity = undefined;
      }
      return;
    } else if (name === this.trackedSatellite) {
      return;
    }

    let sat = this.getSatellite(name);
    if (sat) {
      sat.track();
      this.pendingTrackedSatellite = undefined;
    } else {
      // Satellite does not exist (yet?)
      this.pendingTrackedSatellite = name;
    }
  }

  get enabledSatellites() {
    return this.satellites.filter((sat) => sat.enabled);
  }

  get enabledSatellitesByName() {
    return this.enabledSatellites.map((sat) => sat.props.name);
  }

  set enabledSatellitesByName(sats) {
    this.satellites.forEach((sat) => {
      if (sats.includes(sat.props.name)) {
        sat.show(this.enabledComponents);
      } else {
        sat.hide();
      }
    });
  }

  get monitoredSatellites() {
    return this.satellites.filter((sat) => sat.props.pm.active).map((sat) => sat.props.name);
  }

  set monitoredSatellites(sats) {
    this.satellites.forEach((sat) => {
      if (sats.includes(sat.props.name)) {
        sat.props.notifyPasses();
      } else {
        sat.props.pm.clearTimers();
      }
    });
  }

  get satelliteNames() {
    return this.satellites.map((sat) => sat.props.name);
  }

  getSatellite(name) {
    for (let sat of this.satellites) {
      if (sat.props.name === name) {
        return sat;
      }
    }
  }

  get tags() {
    const tags = this.satellites.map(sat => sat.props.tags);
    return [...new Set([].concat(...tags))];
  }

  getSatellitesWithTag(tag) {
    return this.satellites.filter((sat) => {
      return sat.props.hasTag(tag);
    });
  }

  showSatsWithEnabledTags() {
    this.satellites.forEach((sat) => {
      if (this.enabledTags.some(tag => sat.props.hasTag(tag))) {
        sat.show(this.enabledComponents);
      } else {
        sat.hide();
      }
    });
  }

  enableTag(tag) {
    this.enabledTags = [...new Set(this.enabledTags.concat(tag))];
    this.showSatsWithEnabledTags();
  }

  disableTag(tag) {
    this.enabledTags = this.enabledTags.filter(enabledTag => enabledTag !== tag);
    this.showSatsWithEnabledTags();
  }

  get components() {
    const components = this.satellites.map(sat => sat.components);
    return [...new Set([].concat(...components))];
  }

  enableComponent(componentName) {
    var index = this.enabledComponents.indexOf(componentName);
    if (index === -1) this.enabledComponents.push(componentName);

    this.enabledSatellites.forEach((sat) => {
      sat.enableComponent(componentName);
    });
  }

  disableComponent(componentName) {
    var index = this.enabledComponents.indexOf(componentName);
    if (index !== -1) this.enabledComponents.splice(index, 1);

    this.enabledSatellites.forEach((sat) => {
      sat.disableComponent(componentName);
    });
  }

  get groundStationAvailable() {
    return (typeof this.groundStation !== "undefined");
  }

  focusGroundStation() {
    if (this.groundStationAvailable) {
      this.groundStation.track();
    }
  }

  setGroundStation(position) {
    if (this.groundStationAvailable) {
      this.groundStation.hide();
    }
    if (position.height < 1) {
      position.height = 0;
    }

    // Create groundstation entity
    this.groundStation = new GroundStationEntity(this.viewer, this, position);
    this.groundStation.show();

    // Set groundstation for all satellites
    this.satellites.forEach((sat) => {
      sat.groundStation = this.groundStation.position;
    });

    if ("app" in window) {
      const latlon = `${position.latitude.toFixed(4)},${position.longitude.toFixed(4)}`;
      if (app.$route.query.gs != latlon) {
        app.$router.push({query: {...app.$route.query, gs: latlon}});
      }
    }
  }
}
