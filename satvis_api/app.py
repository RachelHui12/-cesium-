from flask import Flask, jsonify, abort, make_response, request
from sgp4.api import Satrec
from sgp4.api import jday
import datetime
import json
import numpy as np
from PIL import Image
from itertools import groupby


world = np.array(Image.open('./data/world.tif'), dtype=np.int)
world[world==255] = -1
row = world.shape[0]
col = world.shape[1]

with open('./data/world.geo.json', 'rt') as f:
    name = json.load(f)['features']
name = [i['properties']['name'] for i in name]

from shapely.geometry import shape, GeometryCollection, Point
import shapely
with open('./data/world.geo.json', 'r') as f:
    js = json.load(f)
    features=js['features']
    polygons=[]
    for fea in features:
        geometry=fea['geometry']
        if geometry['type']=='Polygon':
            polygons.append(shape({
                'type':'Polygon',
                'coordinates':geometry['coordinates']
            }))
            pass
        else :
            for coor in geometry['coordinates']:
                polygons.append(shape({
                    'type':'Polygon',
                    'coordinates':coor
                }))
def pos2idx(lat, lon):
    lat = max(0,min(row-1,int((90-lat)*10)))
    lon = max(0,min(col-1,int((lon+180)*10)))
    return int(world[lat,lon])

def get_country_id(lat, lon):
    for polygon in polygons:
        if polygon[1].contains(Point(lat, lon)):
            return polygon[0]
    return -1

def pass_countries(tle):
    print(tle)
    tle = tle.split('\n')
    sat = Satrec.twoline2rv(tle[1], tle[2])
    jd, fr = jday(2019, 12, 9, 12, 0, 0)
    e, r, v = sat.sgp4(2458827, 0.362605)
    start_time = datetime.datetime.now()
    jds, frs = [], []
    times = []
    for i in range(60*60*6):
        time = start_time + datetime.timedelta(seconds=i)
        times.append(time)
        jd, fr = jday(time.year, time.month, time.day, time.hour, time.minute, time.second)
        jds.append(jd)
        frs.append(fr)
    jds = np.array(jds)
    frs = np.array(frs)
    e, r, v = sat.sgp4_array(jds, frs)
    R = 6371
    lats, lons = [], []
    last_country_id = -1
    pass_country = []
    for i, p in enumerate(r):
        x, y, z = p[0], p[1], p[2]
        lat = np.degrees(np.arctan(z / (x*x+y*y)))
        lon = np.degrees(np.arctan2(y, x))
        country_id = pos2idx(lat, lon)
        if country_id != last_country_id:
            pass_country.append({
                'country': country_id,
                'start_time': times[i].strftime('%Y-%m-%d %H:%M:%S'),
                'end_time': ''
            })
        last_country_id = country_id
    for i in range(len(pass_country)-1):
        pass_country[i]['end_time'] = pass_country[i+1]['start_time']
    pass_country = list(filter(lambda x: x['country']!=-1,pass_country[1:-2]))
    for i in range(len(pass_country)):
        pass_country[i]['country']=name[pass_country[i]['country']]
        pass_country[i]['sat'] = tle[0]
    return pass_country

app = Flask(__name__)

@app.errorhandler(404)
def not_found(error):
    return make_response(jsonify({'error': 'Not found'}), 404)

@app.route('/satvis/api/v1.0/country', methods=['GET'])
def getcountry():
    lat=request.args.get("lat")
    lon=request.args.get("lon")
    print(lat,lon)
    point = Point(float(lat), float(lon))
    for i,polygon in enumerate(polygons):
        if polygon.contains(point):
            return jsonify({'id':i})
    return jsonify({'id':-1})

@app.route('/satvis/api/v1.0/pass_countries', methods=['POST'])
def get_pass_countries():
    tle = request.get_json()
    tle = tle['tle']
    return jsonify(pass_countries(tle))

@app.route('/satvis/api/v1.0/pass_sats', methods=['POST'])
def get_pass_sats():
    tles = request.get_json()
    countries = []
    for tle in tles:
        countries += pass_countries(tle)
    countries.sort(key=lambda x:(x['country'],x['start_time']))
    gbs = groupby(countries, lambda x: x['country'])
    countries = []
    for key, group in gbs:
        sats = []
        for g in group:
            sats.append({
                'sat': g['sat'],
                'start_time':  g['start_time'],
                'end_time': g['end_time']
            })
        countries.append({
            'country': key,
            'sats': sats
        })
    return jsonify(countries)

if __name__ == '__main__':
    app.run(debug=True)
