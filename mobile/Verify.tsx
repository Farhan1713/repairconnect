import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';

const API = 'http://192.168.0.140:5000';

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

export default function Verify({ token, onBack, onLogout }: any) {
  const [status, setStatus] = useState<any>(null);
  const [channel, setChannel] = useState('phone');
  const [code, setCode] = useState('');
  const [demo, setDemo] = useState('');
  const [msg, setMsg] = useState('');

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await api('/api/verify/status', 'GET', undefined, token));
    } catch (e: any) {
      if (e.message === 'Invalid token') onLogout();
      else setMsg(errText(e));
    }
  }, [token]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const send = async () => {
    try {
      setMsg(''); setDemo('');
      const d = await api('/api/verify/send', 'POST', { channel }, token);
      if (d.demoCode) setDemo(d.demoCode);
      setMsg('Code sent. It expires in 10 minutes.');
    } catch (e: any) {
      setMsg(errText(e));
    }
  };

  const confirm = async () => {
    try {
      setMsg('');
      await api('/api/verify/confirm', 'POST', { channel, code }, token);
      setCode(''); setDemo('');
      setMsg('Verified ✓');
      loadStatus();
    } catch (e: any) {
      setMsg(errText(e));
    }
  };

  return (
    <ScrollView contentContainerStyle={s.box} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Verify account</Text>
      <Btn light title="◀ Back to requests" onPress={onBack} />

      {status && (
        <View style={s.card}>
          <Text>Email: {status.email_verified ? '✓ verified' : '✗ not verified'}</Text>
          <Text>Phone: {!status.has_phone ? 'no number on file' : status.phone_verified ? '✓ verified' : '✗ not verified'}</Text>
        </View>
      )}

      <Text style={s.label}>Verify by</Text>
      <View style={s.pickerBox}>
        <Picker selectedValue={channel} onValueChange={setChannel}>
          <Picker.Item label="Phone" value="phone" />
          <Picker.Item label="Email" value="email" />
        </Picker>
      </View>
      <Btn title="Send code" onPress={send} />

      {!!demo && (
        <View style={s.demo}>
          <Text style={s.hint}>Demo mode: the code is shown here instead of being sent</Text>
          <Text style={s.code}>{demo}</Text>
        </View>
      )}

      <TextInput style={s.input} placeholder="6-digit code" keyboardType="number-pad"
        maxLength={6} value={code} onChangeText={setCode} />
      <Btn title="Confirm" onPress={confirm} />
      {!!msg && <Text style={s.hint}>{msg}</Text>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  box: { padding: 24, paddingTop: 60, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 10, marginTop: 8, marginBottom: 8 },
  pickerBox: { borderWidth: 1, borderColor: '#999', borderRadius: 8, marginBottom: 8 },
  hint: { color: '#555', marginTop: 6 },
  btn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 6 },
  btnLight: { backgroundColor: '#e5e7eb' },
  btnText: { color: '#fff', fontWeight: '600' },
  btnTextLight: { color: '#111' },
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginTop: 12 },
  demo: { borderWidth: 1, borderColor: '#2563eb', borderRadius: 8, padding: 12, marginTop: 8, alignItems: 'center' },
  code: { fontSize: 32, fontWeight: 'bold', letterSpacing: 6 },
});
