import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { WebView } from 'react-native-webview';

const API = 'http://192.168.0.140:5000';

type Tech = {
  id: number;
  shop_name: string;
  latitude: string | null;
  longitude: string | null;
};

export default function TechMap() {
  const [techs, setTechs] = useState<Tech[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch(`${API}/api/technicians?limit=50`)
      .then((r) => r.json())
      .then((d) => setTechs(d.data || []))
      .catch(() => setErr('Cannot reach server'));
  }, []);

  const pts = techs
    .filter((t) => t.latitude && t.longitude)
    .map((t) => ({ name: t.shop_name, lat: Number(t.latitude), lng: Number(t.longitude) }));

  const html = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0}</style></head>
<body><div id="map"></div><script>
var pts = ${JSON.stringify(pts)};
var map = L.map('map').setView([23.8103, 90.4125], 11);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  {maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'}).addTo(map);
pts.forEach(function(p){ L.marker([p.lat, p.lng]).addTo(map).bindPopup(p.name); });
</script></body></html>`;

  return (
    <View style={{ marginVertical: 12 }}>
      <View style={{ height: 280, borderRadius: 12, overflow: 'hidden' }}>
        <WebView
          key={pts.length}
          originWhitelist={['*']}
          source={{ html, baseUrl: 'https://repairconnect.app' }}
          applicationNameForUserAgent="RepairConnect/1.0"
          javaScriptEnabled
          nestedScrollEnabled
        />
      </View>
      <Text style={{ color: '#777', fontSize: 12, marginTop: 4 }}>
        {err || `${pts.length} technician(s) on map · © OpenStreetMap contributors`}
      </Text>
    </View>
  );
}
