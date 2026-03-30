import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { api } from '../api/client';

const CATEGORIES = ['Воспитание', 'Уход', 'Здоровье', 'Питание'];
type Article = { id: string; title: string; category: string; content: string; author?: string };

export default function EncyclopediaScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadArticles = async (category?: string) => {
    setLoading(true);
    try {
      const data = await api.getArticles(category);
      setArticles(Array.isArray(data) ? (data as Article[]) : []);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticles(selectedCategory ?? undefined);
  }, [selectedCategory]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter((a) =>
      `${a.title} ${a.category} ${a.content}`.toLowerCase().includes(q)
    );
  }, [articles, search]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>База знаний</Text>
      <Text style={styles.subtitle}>
        Проверенные статьи от специалистов по воспитанию, уходу и здоровью
      </Text>

      <TextInput
        style={styles.search}
        placeholder="Поиск по статьям..."
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
        <TouchableOpacity
          style={[styles.catBtn, !selectedCategory && styles.catBtnActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.catText, !selectedCategory && styles.catTextActive]}>
            Все
          </Text>
        </TouchableOpacity>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.catBtn, selectedCategory === c && styles.catBtnActive]}
            onPress={() => setSelectedCategory(c)}
          >
            <Text style={[styles.catText, selectedCategory === c && styles.catTextActive]}>
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.articles}>
        {loading ? <ActivityIndicator size="large" color="#FF9F43" /> : null}
        {!loading && filtered.length === 0 ? (
          <Text style={styles.empty}>Ничего не найдено</Text>
        ) : null}
        {filtered.map((a) => (
          <TouchableOpacity key={a.id} style={styles.articleCard} onPress={() => setExpandedId(expandedId === a.id ? null : a.id)}>
            <Text style={styles.articleCategory}>{a.category}</Text>
            <Text style={styles.articleTitle}>{a.title}</Text>
            {expandedId === a.id ? (
              <>
                <Text style={styles.articleContent}>{a.content}</Text>
                {a.author ? <Text style={styles.articleAuthor}>Автор: {a.author}</Text> : null}
              </>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  search: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  categories: { marginBottom: 20, marginHorizontal: -20, paddingHorizontal: 20 },
  catBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#eee' },
  catBtnActive: { backgroundColor: '#FF9F43', borderColor: '#FF9F43' },
  catText: { fontSize: 14, color: '#666' },
  catTextActive: { color: '#fff', fontWeight: '600' },
  articles: { gap: 12 },
  articleCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  articleCategory: { fontSize: 12, color: '#FF9F43', fontWeight: '600', marginBottom: 4 },
  articleTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  articleContent: { marginTop: 8, fontSize: 14, color: '#444', lineHeight: 20 },
  articleAuthor: { marginTop: 8, fontSize: 12, color: '#777' },
  empty: { color: '#777', textAlign: 'center', marginTop: 8 },
});
