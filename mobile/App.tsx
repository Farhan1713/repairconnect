import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as SecureStore from 'expo-secure-store';

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

function Dropdown({ value, onChange, items }: any) {
  return (
    <View style={s.pickerBox}>
      <Picker selectedValue={value} onValueChange={onChange}>
        {items.map((i: any) => (
          <Picker.Item key={i.value} label={i.label} value={i.value} />
        ))}
      </Picker>
    </View>
  );
}

function Btn({ title, onPress, light }: any) {
  return (
    <TouchableOpacity style={[s.btn, light && s.btnLight]} onPress={onPress}>
      <Text style={[s.btnText, light && s.btnTextLight]}>{title}</Text>
    </TouchableOpacity>
  );
}

function Login({ onLogin, onRegister }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  const submit = async () => {
    try {
      setErr('');
      const d = await api('/api/auth/login', 'POST', { email, password });
      await onLogin(d.token, d.user);
    } catch (e: any) {
      setErr(errText(e));
    }
  };

  return (
    <ScrollView contentContainerStyle={s.box} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>RepairConnect</Text>
      <TextInput style={s.input} placeholder="Email" autoCapitalize="none"
        keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={s.input} placeholder="Password" secureTextEntry
        value={password} onChangeText={setPassword} />
      {!!err && <Text style={s.err}>{err}</Text>}
      <Btn title="Log in" onPress={submit} />
      <Btn title="Create an account" onPress={onRegister} light />
    </ScrollView>
  );
}

function Register({ onDone }: any) {
  const [username, setUsername] = useState('');
  const [avail, setAvail] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [err, setErr] = useState('');

  const check = async (u: string) => {
    setUsername(u);
    if (u.length < 3) return setAvail('At least 3 characters');
    try {
      const d = await api(`/api/auth/check-username?u=${encodeURIComponent(u)}`);
      setAvail(d.available ? '✓ Available' : '✗ Taken');
    } catch {
      setAvail('Cannot reach server');
    }
  };

  const submit = async () => {
    try {
      setErr('');
      await api('/api/auth/register', 'POST', { username, email, phone, password, role });
      onDone();
    } catch (e: any) {
      setErr(errText(e));
    }
  };

  return (
    <ScrollView contentContainerStyle={s.box} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Create account</Text>
      <TextInput style={s.input} placeholder="Username" autoCapitalize="none"
        value={username} onChangeText={check} />
      <Text style={s.hint}>{avail}</Text>
      <TextInput style={s.input} placeholder="Email" autoCapitalize="none"
        keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={s.input} placeholder="Phone (optional)" keyboardType="phone-pad"
        value={phone} onChangeText={setPhone} />
      <TextInput style={s.input} placeholder="Password" secureTextEntry
        value={password} onChangeText={setPassword} />
      <Text style={s.label}>I am a</Text>
      <Dropdown value={role} onChange={setRole}
        items={[{ label: 'Customer', value: 'customer' }, { label: 'Technician', value: 'technician' }]} />
      {!!err && <Text style={s.err}>{err}</Text>}
      <Btn title="Register" onPress={submit} />
      <Btn title="Back to login" onPress={onDone} light />
    </ScrollView>
  );
}

function Home({ token, user, onLogout }: any) {
  const isTech = user.role === 'technician';
  const [device, setDevice] = useState('Phone');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [problem, setProblem] = useState('');
  const [budget, setBudget] = useState('');
  const [service, setService] = useState('pickup');
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [msg, setMsg] = useState('');

  const load = useCallback(async (p: number) => {
    try {
      const path = isTech ? 'open' : 'mine';
      const d = await api(`/api/requests/${path}?page=${p}&limit=${LIMIT}`, 'GET', undefined, token);
      setItems(d.data);
      setPage(d.page);
      setTotalPages(Math.max(d.totalPages, 1));
    } catch (e: any) {
      if (e.message === 'Invalid token') onLogout();
      else setMsg(errText(e));
    }
  }, [isTech, token]);

  useEffect(() => { load(1); }, [load]);

  const submit = async () => {
    if (!problem.trim()) return setMsg('Describe the problem');
    try {
      await api('/api/requests', 'POST', {
        device_category: device,
        brand: brand || null,
        model: model || null,
        problem,
        budget: budget ? parseFloat(budget) : null,
        service_type: service,
      }, token);
      setBrand(''); setModel(''); setProblem(''); setBudget('');
      setMsg('Request submitted ✓');
      load(1);
    } catch (e: any) {
      setMsg(errText(e));
    }
  };

  return (
    <ScrollView contentContainerStyle={s.box} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Hello, {user.username}</Text>
      <Text style={s.hint}>Role: {user.role}</Text>

      {!isTech && (
        <>
          <Text style={s.label}>New repair request</Text>
          <Dropdown value={device} onChange={setDevice}
            items={DEVICES.map(d => ({ label: d, value: d }))} />
          <TextInput style={s.input} placeholder="Brand" value={brand} onChangeText={setBrand} />
          <TextInput style={s.input} placeholder="Model" value={model} onChangeText={setModel} />
          <TextInput style={[s.input, { height: 80 }]} placeholder="Describe the problem"
            multiline value={problem} onChangeText={setProblem} />
          <TextInput style={s.input} placeholder="Budget" keyboardType="numeric"
            value={budget} onChangeText={setBudget} />
          <Dropdown value={service} onChange={setService}
            items={[{ label: 'Pickup', value: 'pickup' }, { label: 'On-site', value: 'onsite' }]} />
          <Btn title="Submit request" onPress={submit} />
        </>
      )}
      {!!msg && <Text style={s.hint}>{msg}</Text>}

      <Text style={s.label}>{isTech ? 'Open requests' : 'My requests'}</Text>
      {items.length === 0 && <Text style={s.hint}>Nothing here yet</Text>}
      {items.map(r => (
        <View key={r.id} style={s.card}>
          <Text style={s.cardTitle}>
            {r.device_category}{r.brand ? ` · ${r.brand}` : ''}{r.model ? ` ${r.model}` : ''}
          </Text>
          <Text>{r.problem}</Text>
          <Text style={s.hint}>Status: {r.status}</Text>
        </View>
      ))}

      <View style={s.pager}>
        <Btn title="◀ Prev" light onPress={() => page > 1 && load(page - 1)} />
        <Text style={s.pageText}>Page {page} of {totalPages}</Text>
        <Btn title="Next ▶" light onPress={() => page < totalPages && load(page + 1)} />
      </View>

      <Btn title="Log out" onPress={onLogout} light />
    </ScrollView>
  );
}

export default function App() {
  const [screen, setScreen] = useState<'login' | 'register' | 'home'>('login');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const t = await SecureStore.getItemAsync('token');
        const u = await SecureStore.getItemAsync('user');
        if (t && u) { setToken(t); setUser(JSON.parse(u)); setScreen('home'); }
      } catch {}
    })();
  }, []);

  const onLogin = async (t: string, u: any) => {
    await SecureStore.setItemAsync('token', t);
    await SecureStore.setItemAsync('user', JSON.stringify(u));
    setToken(t); setUser(u); setScreen('home');
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    setToken(null); setUser(null); setScreen('login');
  };

  if (screen === 'register') return <Register onDone={() => setScreen('login')} />;
  if (screen === 'home' && token && user)
    return <Home token={token} user={user} onLogout={logout} />;
  return <Login onLogin={onLogin} onRegister={() => setScreen('register')} />;
}

const s = StyleSheet.create({
  box: { padding: 24, paddingTop: 60, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 10, marginBottom: 8 },
  pickerBox: { borderWidth: 1, borderColor: '#999', borderRadius: 8, marginBottom: 8 },
  hint: { color: '#555', marginBottom: 6 },
  err: { color: 'crimson', marginBottom: 8 },
  btn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 6 },
  btnLight: { backgroundColor: '#e5e7eb' },
  btnText: { color: '#fff', fontWeight: '600' },
  btnTextLight: { color: '#111' },
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 8 },
  cardTitle: { fontWeight: 'bold', marginBottom: 4 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  pageText: { fontWeight: '600' },
});
