import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import StarRating from './StarRating';
import FadeInCard from './FadeInCard';

const API = 'http://192.168.0.140:5000';
const LIMIT = 3;

const QUERY = `
  query Techs($page: Int, $limit: Int, $search: String) {
    technicians(page: $page, limit: $limit, search: $search) {
      total
      totalPages
      page
      data {
        id
        shopName
        skills
        address
        avgRating
        reviews { rating comment }
      }
    }
  }
`;

type Review = { rating: number; comment: string | null };
type Tech = {
  id: string;
  shopName: string;
  skills: string | null;
  address: string | null;
  avgRating: number;
  reviews: Review[];
};

export default function TechDirectory() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [techs, setTechs] = useState<Tech[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [err, setErr] = useState('');

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/graphql`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: QUERY, variables: { page, limit: LIMIT, search } }),
        });
        const json = await res.json();
        if (json.errors) throw new Error(json.errors[0].message);
        const t = json.data.technicians;
        setTechs(t.data);
        setTotal(t.total);
        setTotalPages(Math.max(t.totalPages, 1));
        setErr('');
      } catch (e: any) {
        setErr(e.message || 'Cannot reach server');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [page, search]);

  return (
    <View style={{ marginVertical: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>
        Technicians (GraphQL)
      </Text>

      <TextInput
        placeholder="Search by shop or skill"
        value={search}
        onChangeText={(v) => {
          setSearch(v);
          setPage(1);
        }}
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 8 }}
      />

      {!!err && <Text style={{ color: 'red' }}>{err}</Text>}
      {!err && techs.length === 0 && <Text style={{ color: '#777' }}>No technicians found</Text>}

      {techs.map((t, i) => (
        <FadeInCard key={t.id} index={i}>
          <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 12, marginBottom: 8, backgroundColor: '#fff' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{t.shopName}</Text>
            <Text style={{ color: '#555' }}>{t.skills || 'No skills listed'}</Text>
            {!!t.address && <Text style={{ color: '#777', fontSize: 12 }}>{t.address}</Text>}
            <StarRating key={`${t.id}-${t.avgRating}`} value={t.avgRating} readOnly size={20} />
            {t.reviews.slice(0, 2).map((r, j) => (
              <Text key={j} style={{ fontSize: 12, color: '#444', marginTop: 2 }}>
                {`★${r.rating} ${r.comment || ''}`}
              </Text>
            ))}
          </View>
        </FadeInCard>
      ))}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TouchableOpacity
          disabled={page <= 1}
          onPress={() => setPage(page - 1)}
          style={{ padding: 10, backgroundColor: '#e5e7eb', borderRadius: 8, opacity: page <= 1 ? 0.4 : 1 }}
        >
          <Text>◀ Prev</Text>
        </TouchableOpacity>
        <Text>{`Page ${page} of ${totalPages} · ${total} total`}</Text>
        <TouchableOpacity
          disabled={page >= totalPages}
          onPress={() => setPage(page + 1)}
          style={{ padding: 10, backgroundColor: '#e5e7eb', borderRadius: 8, opacity: page >= totalPages ? 0.4 : 1 }}
        >
          <Text>Next ▶</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
