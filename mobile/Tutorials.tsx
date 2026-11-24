import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Linking } from 'react-native';
import { Picker } from '@react-native-picker/picker';

const API = 'http://192.168.0.140:5000';
const LIMIT = 5;
const DEVICES = ['Phone', 'Laptop', 'Tablet', 'TV', 'Refrigerator', 'Washing Machine', 'Other'];

async function api(path: string, method = 'GET', body?: any, token?: string) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const errText = (e: any) =>
  e.message === 'Network request failed' ? 'Cannot reach server' : e.message;

function Btn({ title, onPress, light }: any) {
  return (
    <TouchableOpacity style={[s.btn, light && s.btnLight]} onPress={onPress}>
      <Text style={[s.btnText, light && s.btnTextLight]}>{title}</Text>
    </TouchableOpacity>
  );
}

export default function Tutorials({ token, canAdd, onBack, onLogout }: any) {
  const [filter, setFilter] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Phone');
  const [url, setUrl] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [msg, setMsg] = useState('');

  const load = useCallback(async (p: number, f: string) => {
    try {
      const q = f ? `&category=${encodeURIComponent(f)}` : '';
      const d = await api(`/api/tutorials?page=${p}&limit=${LIMIT}${q}`, 'GET', undefined, token);
      setItems(d.data);
      setPage(d.page);
      setTotalPages(Math.max(d.totalPages, 1));
    } catch (e: any) {
      if (e.message === 'Invalid token') onLogout();
      else setMsg(errText(e));
    }
  }, [token]);

  useEffect(() => { load(1, filter); }, [load, filter]);

  const add = async () => {
    try {
      setMsg('');
      await api('/api/tutorials', 'POST', { title, device_category: category, youtube_url: url }, token);
      setTitle(''); setUrl('');
      setMsg('Tutorial added ✓');
      load(1, filter);
    } catch (e: any) {
      setMsg(errText(e));
    }
  };

  return (
    <ScrollView contentContainerStyle={s.box} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Tutorials</Text>
      <Btn light title="◀ Back to requests" onPress={onBack} />

      <Text style={s.label}>Device</Text>
      <View style={s.pickerBox}>
        <Picker selectedValue={filter} onValueChange={setFilter}>
          <Picker.Item label="All devices" value="" />
          {DEVICES.map(d => <Picker.Item key={d} label={d} value={d} />)}
        </Picker>
      </View>

      {canAdd && (
        <View>
          <Text style={s.label}>Add a tutorial</Text>
          <TextInput style={s.input} placeholder="Title" value={title} onChangeText={setTitle} />
          <View style={s.pickerBox}>
            <Picker selectedValue={category} onValueChange={setCategory}>
              {DEVICES.map(d => <Picker.Item key={d} label={d} value={d} />)}
            </Picker>
          </View>
          <TextInput style={s.input} placeholder="YouTube link" autoCapitalize="none"
            value={url} onChangeText={setUrl} />
          <Btn title="Add tutorial" onPress={add} />
        </View>
      )}
      {!!msg && <Text style={s.hint}>{msg}</Text>}

      {items.length === 0 && <Text style={s.hint}>No tutorials yet</Text>}
      {items.map(t => (
        <View key={t.id} style={s.card}>
          <Text style={s.cardTitle}>{t.title}</Text>
          <Text style={s.hint}>{t.device_category || 'General'}</Text>
          <Btn title="Watch video" onPress={() =>
            Linking.openURL(t.youtube_url).catch(() => setMsg('Cannot open the link'))} />
        </View>
      ))}

      <View style={s.pager}>
        <Btn title="◀ Prev" light onPress={() => page > 1 && load(page - 1, filter)} />
        <Text style={s.pageText}>Page {page} of {totalPages}</Text>
        <Btn title="Next ▶" light onPress={() => page < totalPages && load(page + 1, filter)} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  box: { padding: 24, paddingTop: 60, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 10, marginBottom: 8 },
  pickerBox: { borderWidth: 1, borderColor: '#999', borderRadius: 8, marginBottom: 8 },
  hint: { color: '#555', marginBottom: 6 },
  btn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 6 },
  btnLight: { backgroundColor: '#e5e7eb' },
  btnText: { color: '#fff', fontWeight: '600' },
  btnTextLight: { color: '#111' },
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginTop: 12 },
  cardTitle: { fontWeight: 'bold', marginBottom: 2 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  pageText: { fontWeight: '600' },
});
