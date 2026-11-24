import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

const API = 'http://192.168.0.140:5000';

type Tech = {
  id: number;
  shop_name: string;
  skills: string;
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

  const withPos = techs.filter((t) => t.latitude && t.longitude);

  return (
    <View style={{ marginVertical: 12 }}>
      <View style={{ height: 280, borderRadius: 12, overflow: 'hidden' }}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: 23.8103,
            longitude: 90.4125,
            latitudeDelta: 0.2,
            longitudeDelta: 0.2,
          }}
        >
          {withPos.map((t) => (
            <Marker
              key={t.id}
              coordinate={{ latitude: Number(t.latitude), longitude: Number(t.longitude) }}
              title={t.shop_name}
              description={t.skills}
            />
          ))}
        </MapView>
      </View>
      <Text style={{ color: '#777', fontSize: 12, marginTop: 4 }}>
        {err || `${withPos.length} technician(s) on map`}
      </Text>
    </View>
  );
}
