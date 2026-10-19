import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

const API = 'http://192.168.1.6:5000';
const LIMIT = 5;

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

function PostCard({ p, token, onChanged }: any) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');

  const loadComments = async () => {
    try {
      setComments(await api(`/api/posts/${p.id}/comments`, 'GET', undefined, token));
    } catch (e: any) {
      setMsg(errText(e));
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadComments();
  };

  const react = async (type: string) => {
    try {
      setMsg('');
      await api(`/api/posts/${p.id}/react`, 'POST', { type }, token);
      onChanged();
    } catch (e: any) {
      setMsg(errText(e));
    }
  };

  const addComment = async () => {
    if (!text.trim()) return;
    try {
      setMsg('');
      await api(`/api/posts/${p.id}/comments`, 'POST', { content: text }, token);
      setText('');
      await loadComments();
      onChanged();
    } catch (e: any) {
      setMsg(errText(e));
    }
  };

  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{p.title}</Text>
      <Text style={s.hint}>by {p.author} · {new Date(p.created_at).toLocaleDateString()}</Text>
      <Text>{p.content}</Text>

      <View style={s.row}>
        <View style={s.flex}>
          <Btn light={p.my_reaction !== 'like'} title={`Like (${p.likes})`} onPress={() => react('like')} />
        </View>
        <View style={s.flex}>
          <Btn light={p.my_reaction !== 'dislike'} title={`Dislike (${p.dislikes})`} onPress={() => react('dislike')} />
        </View>
      </View>

      <Btn light title={open ? 'Hide comments' : `Comments (${p.comment_count})`} onPress={toggle} />

      {open && (
        <View>
          {comments.length === 0 && <Text style={s.hint}>No comments yet</Text>}
          {comments.map(c => (
            <View key={c.id} style={s.comment}>
              <Text style={s.cardTitle}>{c.author}</Text>
              <Text>{c.content}</Text>
            </View>
          ))}
          <TextInput style={s.input} placeholder="Write a comment" value={text} onChangeText={setText} />
          <Btn title="Post comment" onPress={addComment} />
        </View>
      )}
      {!!msg && <Text style={s.err}>{msg}</Text>}
    </View>
  );
}

export default function Community({ token, onBack, onLogout }: any) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [msg, setMsg] = useState('');

  const load = useCallback(async (p: number) => {
    try {
      const d = await api(`/api/posts?page=${p}&limit=${LIMIT}`, 'GET', undefined, token);
      setItems(d.data);
      setPage(d.page);
      setTotalPages(Math.max(d.totalPages, 1));
    } catch (e: any) {
      if (e.message === 'Invalid token') onLogout();
      else setMsg(errText(e));
    }
  }, [token]);

  useEffect(() => { load(1); }, [load]);

  const submit = async () => {
    try {
      setMsg('');
      await api('/api/posts', 'POST', { title, content }, token);
      setTitle(''); setContent('');
      setMsg('Posted ✓');
      load(1);
    } catch (e: any) {
      setMsg(errText(e));
    }
  };

  return (
    <ScrollView contentContainerStyle={s.box} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Repair tips</Text>
      <Btn light title="◀ Back to requests" onPress={onBack} />

      <Text style={s.label}>Share a tip</Text>
      <TextInput style={s.input} placeholder="Title" value={title} onChangeText={setTitle} />
      <TextInput style={[s.input, { height: 90 }]} placeholder="Write your tip" multiline
        value={content} onChangeText={setContent} />
      <Btn title="Post" onPress={submit} />
      {!!msg && <Text style={s.hint}>{msg}</Text>}

      {items.length === 0 && <Text style={s.hint}>No posts yet</Text>}
      {items.map(p => (
        <PostCard key={p.id} p={p} token={token} onChanged={() => load(page)} />
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
  label: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 10, marginBottom: 8 },
  hint: { color: '#555', marginBottom: 6 },
  err: { color: 'crimson', marginTop: 6 },
  btn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 6 },
  btnLight: { backgroundColor: '#e5e7eb' },
  btnText: { color: '#fff', fontWeight: '600' },
  btnTextLight: { color: '#111' },
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginTop: 12 },
  cardTitle: { fontWeight: 'bold', marginBottom: 2 },
  comment: { borderLeftWidth: 3, borderLeftColor: '#2563eb', paddingLeft: 8, marginTop: 8 },
  row: { flexDirection: 'row', gap: 8, marginTop: 4 },
  flex: { flex: 1 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  pageText: { fontWeight: '600' },
});
