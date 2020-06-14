import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

export class DescriptionHelper {
  static renderDescription(time, name, position, passes, isGroundStation, tle,tag,countries) {
    if(name==""){
      let description = `
      <div class="ib">
        ${this.renderSats(passes,time)}
      </div>
    `;
      return description;
    }
    else{

    let description = `
      <div class="ib">
        <h3>Position</h3>
        <table class="ibt">
          <thead>
            <tr>
              <th>Name</th>
              <th>Latitude</th>
              <th>Longitude</th>
              ${isGroundStation ? "" : "<th>Altitude</th>"}
              ${isGroundStation ? "" : "<th>Velocity</th>"}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${name}</td>
              <td>${position.latitude.toFixed(2)}&deg</td>
              <td>${position.longitude.toFixed(2)}&deg</td>
              ${isGroundStation ? "" : `<td>${(position.height / 1000).toFixed(2)} km</td>`}
              ${isGroundStation ? "" : `<td>${position.velocity.toFixed(2)} km/s</td>`}
            </tr>
          </tbody>
        </table>
        ${this.renderPasses(passes, time, isGroundStation)}
        ${isGroundStation ? "" : this.renderCountries(countries,time)}
        ${tle == "" ? "" : this.renderTLE(tle)}
        ${tag ==""? "" : this.renderinformation(tag)}
      </div>
    `;
    return description;
  }
  }

  static renderPasses(passes, time, showPassName) {
    if (passes.length == 0) {
      const html = `
        <h3>Passes</h3>
        <div class="ib-text">No ground station set</div>
        `;
      return html;
    }

    const start = dayjs(time);
    //找到将要来的那个卫星的index
    const upcomingPassIdx = passes.findIndex(pass => {
      return dayjs(pass.end).isAfter(start);
    });
    if (upcomingPassIdx < 0) {
      return "";
    }
    const upcomingPasses = passes.slice(upcomingPassIdx);

    const htmlName = showPassName ? "<th>Name</th>\n" : "";
    const html = `
      <h3>Passes</h3>
      <table class="ibt">
        <thead>
          <tr>
            ${htmlName}
            <th>Countdown</th>
            <th>Start</th>
            <th>End</th>
            <th>El</th>
            <th>Az</th>
          </tr>
        </thead>
        <tbody>
          ${upcomingPasses.map(pass => this.renderPass(start, pass, showPassName)).join("")}
        </tbody>
      </table>
    `;
    return html;
  }

  static renderPass(time, pass, showPassName) {
    function pad2(num) {
      return String(num).padStart(2, "0");
    }
    let countdown = "ONGOING";
    if (dayjs(pass.end).diff(time) < 0) {
      countdown = "PREVIOUS";
    } else if (dayjs(pass.start).diff(time) > 0) {
      countdown = `${pad2(dayjs(pass.start).diff(time, "days"))}:${pad2(dayjs(pass.start).diff(time, "hours")%24)}:${pad2(dayjs(pass.start).diff(time, "minutes")%60)}:${pad2(dayjs(pass.start).diff(time, "seconds")%60)}`;
    }
    const htmlName = showPassName ? `<td>${pass.name}</td>\n` : "";
    const html = `
      <tr>
        ${htmlName}
        <td>${countdown}</td>
        <td>${dayjs(pass.start).format("DD.MM HH:mm:ss")}</td>
        <td>${dayjs(pass.end).format("HH:mm:ss")}</td>
        <td class="ibt-right">${pass.maxElevation.toFixed(0)}&deg</td>
        <td class="ibt-right">${pass.azimuthApex.toFixed(2)}&deg</td>
      </tr>
    `;
    return html;
  }
  static renderCountries(passes, time) {
    if (passes.length == 0) {
      const html = `
        <h3>Countries</h3>
        <div class="ib-text">No Countries </div>
        `;
      return html;
    }
    const start = dayjs(time);
    //找到将要来的那个卫星的index
    const upcomingPassIdx = passes[0].findIndex(pass => {
      return dayjs(pass.end_time).isAfter(start);
    });
    if (upcomingPassIdx < 0) {
      return "";
    }
    const upcomingPasses = passes[0].slice(upcomingPassIdx);
    console.log(upcomingPasses);
    const html = `
      <h3>Countries</h3>
      <table class="ibt">
        <thead>
          <tr>
            <th>Country</th>
            <th>Countdown</th>
            <th>Start</th>
            <th>End</th>
          </tr>
        </thead>
        <tbody>
          ${upcomingPasses.map(pass => this.renderCountry(start, pass)).join("")}
        </tbody>
      </table>
    `;
    return html;
  }
  static renderCountry(time, pass) {
    function pad2(num) {
      return String(num).padStart(2, "0");
    }
    let countdown = "ONGOING";
    if (dayjs(pass.end_time).diff(time) < 0) {
      countdown = "PREVIOUS";
    } else if (dayjs(pass.start_time).diff(time) > 0) {
      countdown = `${pad2(dayjs(pass.start_time).diff(time, "days"))}:${pad2(dayjs(pass.start_time).diff(time, "hours")%24)}:${pad2(dayjs(pass.start_time).diff(time, "minutes")%60)}:${pad2(dayjs(pass.start_time).diff(time, "seconds")%60)}`;
    }
    const html = `
      <tr>
        <td>${pass.country}</td>
        <td>${countdown}</td>
        <td>${dayjs(pass.start_time).format("DD.MM HH:mm:ss")}</td>
        <td>${dayjs(pass.end_time).format("HH:mm:ss")}</td>
      </tr>
    `;
    return html;
  }
  static renderSats(passes, time) {
    console.log(passes);
    if (passes.length == 0) {
      const html = `
        <h3>Satellites</h3>
        <div class="ib-text">No Satellites </div>
        `;
      return html;
    }
    const start = dayjs(time);
    //找到将要来的那个卫星的index

    const html = `
      <h3>Satellites</h3>
      <table class="ibt">
        <thead>
          <tr>
            <th>Satellite</th>
            <th>Start</th>
            <th>End</th>
          </tr>
        </thead>
        <tbody>
          ${passes.map(pass => this.renderSat(start, pass)).join("")}
        </tbody>
      </table>
    `;
    return html;
  }
  static renderSat(time, pass) {

    const html = `
      <tr>
        <td>${pass.sat}</td>
        <td>${dayjs(pass.start_time).format("DD.MM HH:mm:ss")}</td>
        <td>${dayjs(pass.end_time).format("HH:mm:ss")}</td>
      </tr>
    `;
    return html;
  }
  static renderTLE(tle) {
    const html = `
      <h3>TLE</h3>
      <div class="ib-code"><code>${tle.slice(1,3).join("\n")}</code></div>`;
    return html;
  }

  static renderinformation(tag) {
    if (tag=="资源系列"){
      const html = `
        <h3>${tag} information</h3>
        <div class="ib-code"><code>用途：主要用于城市规划、农作物估产、和空间科学试验等领域。\n学术研究\n[1]张庆君."资源一号"系列卫星推动卫星光学遥感技术进步[J].航天返回与遥感,2018,39(4):45-54. DOI:10.3969/j.issn.1009-8518.2018.04.006.
[2]曹宁,周平,王霞, 等.激光测高数据辅助卫星成像几何模型精化处理[J].遥感学报,2018,22(4):599-610. DOI:10.11834/jrs.20187252.
[3]庞之浩.探测资源的千里眼——"资源"系列资源卫星[J].太空探索,2006,(9):22-23.
[4]张雨,郭鑫,段佳豪.基于遥感的1979-2014年中国填海造地变化特征分析[J].资源与产业,2017,19(1):35-40. DOI:10.13776/j.cnki.resourcesindustries.2017.01.006.
[5]Guo Zhang,Yonghua Jiang,Deren Li, et al.In‐Orbit Geometric Calibration And Validation Of Zy‐3 Linear Array Sensors[J].The Photogrammetric Record,2014,29(145):68-88. DOI:10.1111/phor.12052.</code></div>
<a href="http://www.gscloud.cn/sources/?cdataid=451&pdataid=10">影像/星历网址</a>
`;
      return html;
    }
    if (tag=="北斗卫星"){
      const html = `
        <h3>${tag} information</h3>
        <div class="ib-code"><code>用途：交通运输、农林渔业、水文监测、气象测报、通信时统、电力调度、救灾减灾、公共安全。\n学术研究\n[1]张磊.基于北斗卫星的狭窄路段交通拥堵智能控制系统设计[J].计算机测量与控制,2020,28(4):121-125. DOI:10.16526/j.cnki.11-4762/tp.2020.04.025.
[2]杨瀚驰,高旭东.基于北斗卫星的BGAN应急指挥监控系统设计[J].计算机测量与控制,2020,28(4):80-84. DOI:10.16526/j.cnki.11-4762/tp.2020.04.017.
[3]董云飞,王晨晨,赵金辉, 等.基于北斗系统的滴滴轨迹安全监测与预警系统[J].科技风,2020,(14):134-135. DOI:10.19392/j.cnki.1671-7341.202014113.
[4]许婧,刘飞鹏,王建雄.基于北斗的大坝连续压实监控系统研究及应用[J].农业工程,2020,10(2):59-63.
[5]田瑜基.北斗导航系统在测绘工程中的应用[J].技术与市场,2020,27(5):37-38. DOI:10.3969/j.issn.1006-8554.2020.05.013.</code></div><a href="https://cddis.nasa.gov/">影像/星历网址</a>
`;
      return html;
    }
    if (tag=="实践系列"){
      const html = `
        <h3>${tag} information</h3>
        <div class="ib-code"><code>用途：试验大容量数据存储系统、太阳能电池阵工作状态、对日定向姿态控制的精度,还对有关地球磁场、大气密度、太阳紫外线、X射线、带电粒子辐射背景和大气紫外背景等有关卫星发射本身数据进行实验验证。\n学术研究\n[1]刘伟亮,陈杰,邹宗庆.铸精品带精兵历史弥新树丰碑——写在“实践”六号A卫星在轨运行15周年之际[J].中国航天,2020,(1):34-39.
[2]实言."实践"系列科学试验卫星[J].国际太空,2006,(9):4.
[3]庞之浩.实践出真知--实践系列科学卫星[J].太空探索,2006,(5):24-25.
[4]实践二十号卫星上的"黑科技"[J].发明与创新·大科技,2020,(1):58-59.
[5]都亨.我国的实践系列卫星[J].中国航天,1994 :7-10.
        </code></div>
<a href="">未公开数据</a>
`;
      return html;
    }
    if (tag=="环境系列"){
      const html = `
        <h3>${tag} information</h3>
        <div class="ib-code"><code>用途：拥有光学、红外、超光谱等不同探测方法，有大范围、全天候、全天时、动态的环境和灾害监测能力。\n[1]周碧,廖玉芳,韩沁哲, 等.基于HJ-1卫星数据反演长沙市气溶胶光学厚度[J].湖北农业科学,2019,58(17):51-55. DOI:10.14088/j.cnki.issn0439-8114.2019.17.013.
[2]张东东,周振,宋晓东.基于HJ卫星的中国南方地区甘蔗面积提取研究[J].中国农学通报,2019,35(16):141-147.
[3]孙小涵,胡连波,冯永亮, 等.基于HJ-1卫星数据的荣成湾叶绿素a浓度时空变化特征分析[J].海洋湖沼通报,2018,(5):72-79.
[4]许军强,袁晶,卢意恺, 等.基于HJ-1卫星数据的郑州市区PM10反演方法研究[J].环境与发展,2019,31(4):186-187,189. DOI:10.16647/j.cnki.cn15-1369/X.2019.04.117.
[5]宋丹阳,王征禹,李跃, 等.基于HJ-1 A/B卫星CCD数据的江汉平原农田物候探测[J].测绘与空间地理信息,2018,41(3):128-131,134. DOI:10.3969/j.issn.1672-5867.2018.03.040.
        </code></div>
<a href="http://www.gscloud.cn/sources/?cdataid=466&pdataid=10">影像/星历网址</a>
`;
      return html;
    }
    if (tag=="中巴资源"){
      const html = `
        <h3>${tag} information</h3>
        <div class="ib-code"><code>用途：监测国土资源的变化，每年更新全国利用图；测量耕地面积，估计森林蓄积量，农作物长势、产量和草场载蓄量及每年变化；监测自然和人为灾害；快速查清洪涝、地震、林火和风沙等破坏情况，估计损失，提出对策；对沿海经济开发、滩涂利用、水产养殖、环境污染提供动态情报；同时勘探地下资源、圈定黄金、石油、煤炭和建材等资源区，监督资源的合理开发。\n学术研究\n[1]顾卿先,谭伟,杨学义, 等.基于中巴资源卫星(CBERS)马尾松林蓄积量RS反演模型研究[J].凯里学院学报,2017,35(3):76-79. DOI:10.3969/j.issn.1673-9329.2017.03.19.
[2]徐慧,朱金山,刘振, 等.基于CBERS-04卫星影像的珊瑚礁底质分类能力分析[J].北京测绘,2019,33(11):1312-1317. DOI:10.19580/j.cnki.1007-3000.2019.11.005.
[3]谷帅兵,赫晓慧,郭恒亮.基于中巴资源卫星的多源遥感影像融合研究[J].北京联合大学学报（自然科学版）,2015,29(1):53-57,69. DOI:10.16255/j.cnki.ldxbz.2015.01.011.
[4]蔡学成,杨政熙.基于中巴资源卫星数据的森林蓄积量估测研究[J].农业与技术,2013,(12):86-88. DOI:10.3969/j.issn.1671-962X.2013.12.065.
[5]王增亮,高杰,陶波, 等.应用高分辨率中巴资源卫星遥感图像探测湖沼地区钉螺孳生地的初步研究[J].中国血吸虫病防治杂志,2012,24(6):640-644,前插1. DOI:10.3969/j.issn.1005-6661.2012.06.006.</code></div>
<a href="http://www.gscloud.cn/sources/?cdataid=451&pdataid=10">影像/星历网址</a>
`;
      return html;
    }
    return "";
  }
}
