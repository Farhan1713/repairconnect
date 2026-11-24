import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image } from 'react-native';
import { pickAndUpload } from './upload';

const API = 'http://192.168.0.140:5000';
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

function PostCard({ p, token, onChanged, incoming }: any) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (open && incoming && incoming.post_id === p.id) {
      setComments(prev =>
        prev.some(c => c.id === incoming.comment.id) ? prev : [...prev, incoming.comment]);
    }
  }, [incoming]);

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
      {!!p.image_url && <Image source={{ uri: p.image_url }} style={s.photo} />}

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
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [incoming, setIncoming] = useState<any>(null);
  const [live, setLive] = useState(false);
  const pageRef = useRef(1);
  const [msg, setMsg] = useState('');

  const load = useCallback(async (p: number) => {
    try {
      const d = await api(`/api/posts?page=${p}&limit=${LIMIT}`, 'GET', undefined, token);
      setItems(d.data);
      setPage(d.page);
      pageRef.current = d.page;
      setTotalPages(Math.max(d.totalPages, 1));
    } catch (e: any) {
      if (e.message === 'Invalid token') onLogout();
      else setMsg(errText(e));
    }
  }, [token]);

  useEffect(() => { load(1); }, [load]);

  useEffect(() => {
    const socket = io(API, { auth: { token }, transports: ['websocket'] });
    socket.on('connect', () => setLive(true));
    socket.on('disconnect', () => setLive(false));
    socket.on('reaction', (d: any) =>
      setItems(prev => prev.map(x =>
        x.id === d.post_id ? { ...x, likes: d.likes, dislikes: d.dislikes } : x)));
    socket.on('comment', (d: any) => {
      setIncoming(d);
      load(pageRef.current);
    });
    return () => { socket.disconnect(); };
  }, [token]);

  const pickPhoto = async () => {
    try {
      setMsg('');
      setUploading(true);
      const url = await pickAndUpload();
      if (url) setPhoto(url);
    } catch (e: any) {
      setMsg(errText(e));
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    try {
      setMsg('');
      await api('/api/posts', 'POST', { title, content, image_url: photo }, token);
      setTitle(''); setContent(''); setPhoto(null);
      setMsg('Posted ✓');
      load(1);
    } catch (e: any) {
      setMsg(errText(e));
    }
  };

  return (
    <ScrollView contentContainerStyle={s.box} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Repair tips</Text>
      <Text style={s.hint}>{live ? '● Live' : '○ Connecting...'}</Text>
      <Btn light title="◀ Back to requests" onPress={onBack} />

      <Text style={s.label}>Share a tip</Text>
      <TextInput style={s.input} placeholder="Title" value={title} onChangeText={setTitle} />
      <TextInput style={[s.input, { height: 90 }]} placeholder="Write your tip" multiline
        value={content} onChangeText={setContent} />
      <Btn light title={uploading ? 'Uploading...' : photo ? 'Change photo' : 'Add photo'} onPress={pickPhoto} />
      {!!photo && <Image source={{ uri: photo }} style={s.photo} />}
      <Btn title="Post" onPress={submit} />
      {!!msg && <Text style={s.hint}>{msg}</Text>}

      {items.length === 0 && <Text style={s.hint}>No posts yet</Text>}
      {items.map(p => (
        <PostCard key={p.id} p={p} token={token} incoming={incoming} onChanged={() => load(page)} />
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
  photo: { width: '100%', height: 180, borderRadius: 8, marginVertical: 6 },
});
