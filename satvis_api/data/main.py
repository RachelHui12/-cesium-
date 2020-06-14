import json
with open('./world.geo.json','rt') as f:
	data = json.load(f)
features = data['features']
for i in range(len(features)):
	features[i]['properties']['idx'] = i
data['features']=features
with open('./world2.geo.json','wt') as f:
	json.dump(data,f)