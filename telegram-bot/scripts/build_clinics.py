"""Build the local clinic index from an OSM PBF; requires osmium for this tool only."""
import json
from pathlib import Path
import sys
import osmium

class Clinics(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.elements=[]
    def tags_for(self, obj):
        tags=obj.tags
        if tags.get('amenity') in ('hospital','clinic','doctors') or tags.get('healthcare') in ('hospital','clinic','doctor'):
            return {k:v for k,v in dict(tags).items() if k in ('name','name:uz','name:ru','amenity','healthcare','healthcare:speciality','phone','contact:phone','mobile','contact:mobile','contact:telephone','website','contact:website','addr:full','addr:city','addr:street','addr:housenumber')}
    def node(self, node):
        tags=self.tags_for(node)
        if tags and node.location.valid():
            self.elements.append({'type':'node','id':node.id,'lat':node.location.lat,'lon':node.location.lon,'tags':tags})
    def way(self, way):
        tags=self.tags_for(way)
        if not tags:return
        points=[(n.location.lat,n.location.lon) for n in way.nodes if n.location.valid()]
        if points:
            lat=(min(x[0] for x in points)+max(x[0] for x in points))/2
            lon=(min(x[1] for x in points)+max(x[1] for x in points))/2
            self.elements.append({'type':'way','id':way.id,'lat':lat,'lon':lon,'tags':tags})

handler=Clinics()
medical_filter=osmium.filter.TagFilter(('amenity','hospital'),('amenity','clinic'),('amenity','doctors'),('healthcare','hospital'),('healthcare','clinic'),('healthcare','doctor'))
handler.apply_file(sys.argv[1],locations=True,idx='sparse_mem_array',filters=[medical_filter])
output=Path(sys.argv[2])
content={'source':'OpenStreetMap contributors / Geofabrik','source_url':'https://download.geofabrik.de/asia/uzbekistan.html','snapshot':sys.argv[3],'elements':handler.elements}
temp=output.with_suffix('.tmp')
temp.write_text(json.dumps(content,ensure_ascii=False),encoding='utf-8')
temp.replace(output)
print('Indexed medical facilities:',len(handler.elements))
