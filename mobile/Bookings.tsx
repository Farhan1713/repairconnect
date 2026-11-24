import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';

const API = 'http://192.168.0.140:5000';
const LIMIT = 5;
const STATUSES = ['received', 'repairing', 'ready', 'completed'];

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

function Card({ b, token, onChanged }: any) {
  const [open, setOpen] = useState(false);
  const [updates, setUpdates] = useState<any[]>([]);
  const [status, setStatus] = useState('received');
  const [note, setNote] = useState('');
  const [invoice, setInvoice] = useState<any>(null);
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [review, setReview] = useState<any>(null);
  const reviewed = review || (b.review_rating ? { rating: b.review_rating, comment: b.review_comment } : null);
  const [msg, setMsg] = useState('');

  const loadUpdates = async () => {
    try {
      setUpdates(await api(`/api/bookings/${b.id}/updates`, 'GET', undefined, token));
    } catch (e: any) {
      setMsg(errText(e));
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadUpdates();
  };

  const post = async () => {
    try {
      setMsg('');
      await api(`/api/bookings/${b.id}/updates`, 'POST', { status, note }, token);
      setNote('');
      await loadUpdates();
      onChanged();
    } catch (e: any) {
      setMsg(errText(e));
    }
  };

  const submitReview = async () => {
    try {
      setMsg('');
      await api('/api/reviews', 'POST', { booking_id: b.id, rating: parseInt(rating, 10), comment }, token);
      setReview({ rating: parseInt(rating, 10), comment });
      onChanged();
    } catch (e: any) {
      setMsg(errText(e));
    }
  };

  const showInvoice = async () => {
    try {
      setMsg('');
      setInvoice(await api(`/api/bookings/${b.id}/invoice`, 'GET', undefined, token));
    } catch (e: any) {
      setMsg(errText(e));
    }
  };

  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>
        {b.device_category}{b.brand ? ` · ${b.brand}` : ''}{b.model ? ` ${b.model}` : ''}
      </Text>
      <Text>{b.problem}</Text>
      <Text style={s.hint}>
        {b.is_technician ? `Customer: ${b.customer_name}` : `Technician: ${b.technician_name}`}
      </Text>
      <Text style={s.hint}>Appointment: {b.appointment_date}   Price: {b.price}</Text>
      <Text style={s.status}>Status: {b.status}</Text>

      <Btn light title={open ? 'Hide timeline' : 'Show timeline'} onPress={toggle} />

      {open && (
        <View>
          {updates.length === 0 && <Text style={s.hint}>No updates yet</Text>}
          {updates.map(u => (
            <View key={u.id} style={s.update}>
              <Text style={s.cardTitle}>{u.status}</Text>
              {!!u.note && <Text>{u.note}</Text>}
              <Text style={s.hint}>{new Date(u.created_at).toLocaleString()}</Text>
            </View>
          ))}

          {b.is_technician && b.status !== 'completed' && (
            <View style={{ marginTop: 8 }}>
              <View style={s.pickerBox}>
                <Picker selectedValue={status} onValueChange={setStatus}>
                  {STATUSES.map(x => <Picker.Item key={x} label={x} value={x} />)}
                </Picker>
              </View>
              <TextInput style={s.input} placeholder="Note (optional)"
                value={note} onChangeText={setNote} />
              <Btn title="Post update" onPress={post} />
            </View>
          )}
        </View>
      )}

      {b.status === 'completed' && (
        <Btn title="View invoice" onPress={showInvoice} />
      )}
      {b.status === 'completed' && reviewed && (
        <View style={s.invoice}>
          <Text style={s.cardTitle}>{b.is_technician ? 'Customer review' : 'Your review'}: ★{reviewed.rating}</Text>
          {!!reviewed.comment && <Text>{reviewed.comment}</Text>}
        </View>
      )}
      {b.status === 'completed' && !reviewed && !b.is_technician && (
        <View style={s.invoice}>
          <Text style={s.cardTitle}>Rate this job</Text>
          <View style={s.pickerBox}>
            <Picker selectedValue={rating} onValueChange={setRating}>
              {['5', '4', '3', '2', '1'].map(x => (
                <Picker.Item key={x} label={x + (x === '1' ? ' star' : ' stars')} value={x} />
              ))}
            </Picker>
          </View>
          <TextInput style={s.input} placeholder="Comment (optional)" value={comment} onChangeText={setComment} />
          <Btn title="Submit review" onPress={submitReview} />
        </View>
      )}
      {invoice && (
        <View style={s.invoice}>
          <Text style={s.cardTitle}>Invoice #{invoice.id}</Text>
          <Text>Customer: {invoice.customer_name}</Text>
          <Text>Technician: {invoice.technician_name}{invoice.shop_name ? ` (${invoice.shop_name})` : ''}</Text>
          <Text>Device: {invoice.device_category}{invoice.brand ? ` ${invoice.brand}` : ''}{invoice.model ? ` ${invoice.model}` : ''}</Text>
          <Text>Appointment: {invoice.appointment_date}</Text>
          <Text style={s.cardTitle}>Total: {invoice.amount}</Text>
          <Text style={s.hint}>Issued: {new Date(invoice.issued_at).toLocaleString()}</Text>
        </View>
      )}
      {!!msg && <Text style={s.err}>{msg}</Text>}
    </View>
  );
}

export default function Bookings({ token, onBack, onLogout }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [msg, setMsg] = useState('');

  const load = useCallback(async (p: number) => {
    try {
      const d = await api(`/api/bookings/mine?page=${p}&limit=${LIMIT}`, 'GET', undefined, token);
      setItems(d.data);
      setPage(d.page);
      setTotalPages(Math.max(d.totalPages, 1));
    } catch (e: any) {
      if (e.message === 'Invalid token') onLogout();
      else setMsg(errText(e));
    }
  }, [token]);

  useEffect(() => { load(1); }, [load]);

  return (
    <ScrollView contentContainerStyle={s.box} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>My bookings</Text>
      <Btn light title="◀ Back to requests" onPress={onBack} />
      {!!msg && <Text style={s.err}>{msg}</Text>}
      {items.length === 0 && <Text style={s.hint}>No bookings yet</Text>}
      {items.map(b => (
        <Card key={b.id} b={b} token={token} onChanged={() => load(page)} />
      ))}
      <View style={s.pager}>
        <Btn title="◀ Prev" light onPress={() => page > 1 && load(page - 1)} />
        <Text style={s.pageText}>Page {page} of {totalPages}</Text>
        <Btn title="Next ▶" light onPress={() => page < totalPages && load(page + 1)} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  box: { padding: 24, paddingTop: 60, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 10, marginBottom: 8 },
  pickerBox: { borderWidth: 1, borderColor: '#999', borderRadius: 8, marginBottom: 8 },
  hint: { color: '#555', marginBottom: 4 },
  err: { color: 'crimson', marginTop: 6 },
  status: { fontWeight: '600', marginTop: 4 },
  btn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 6 },
  btnLight: { backgroundColor: '#e5e7eb' },
  btnText: { color: '#fff', fontWeight: '600' },
  btnTextLight: { color: '#111' },
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginTop: 10 },
  cardTitle: { fontWeight: 'bold', marginBottom: 2 },
  update: { borderLeftWidth: 3, borderLeftColor: '#2563eb', paddingLeft: 8, marginTop: 8 },
  invoice: { borderWidth: 1, borderColor: '#2563eb', borderRadius: 8, padding: 10, marginTop: 8 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  pageText: { fontWeight: '600' },
});
