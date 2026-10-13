import { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

const API = 'http://192.168.0.140:5000';

export default function App() {
  const [msg, setMsg] = useState('Type a username');

  const check = async (u: string) => {
    if (u.length < 3) return setMsg('At least 3 characters');
    try {
      const res = await fetch(`${API}/api/auth/check-username?u=${u}`);
      const data = await res.json();
      setMsg(data.available ? '✓ Available' : '✗ Taken');
    } catch {
      setMsg('Cannot reach server');
    }
  };

  return (
    <View style={s.box}>
      <Text style={s.title}>RepairConnect</Text>
      <TextInput style={s.input} placeholder="Username" autoCapitalize="none" onChangeText={check} />
      <Text>{msg}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 8 },
});
