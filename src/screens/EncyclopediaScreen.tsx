import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../api/client';
import { useUser } from '../context/UserContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { EncyclopediaStackParamList } from '../navigation/EncyclopediaStack';
import { INPUT_PLACEHOLDER_COLOR, INPUT_TEXT_COLOR } from '../theme/input';

const CATEGORIES = ['Воспитание', 'Уход', 'Здоровье', 'Питание'];
type Article = { id: string; title: string; category: string; content: string; author?: string; status?: string };

type Nav = NativeStackNavigationProp<EncyclopediaStackParamList, 'EncyclopediaHome'>;

export default function EncyclopediaScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user } = useUser();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [pendingArticles, setPendingArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ title: '', category: '', content: '' });
  const [showSubmit, setShowSubmit] = useState(false);

  const loadArticles = useCallback(
    async (category?: string) => {
      setLoading(true);
      try {
        const [data, pending] = await Promise.all([
          api.getArticles(category),
          user?.is_admin ? api.getArticles(undefined, 'pending') : Promise.resolve([]),
        ]);
        setArticles(Array.isArray(data) ? (data as Article[]) : []);
        setPendingArticles(Array.isArray(pending) ? (pending as Article[]) : []);
      } catch {
        setArticles([]);
        setPendingArticles([]);
      } finally {
        setLoading(false);
      }
    },
    [user?.is_admin]
  );

  useFocusEffect(
    useCallback(() => {
      loadArticles(selectedCategory ?? undefined);
    }, [selectedCategory, loadArticles])
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter((a) =>
      `${a.title} ${a.category} ${a.content}`.toLowerCase().includes(q)
    );
  }, [articles, search]);

  const openArticle = (a: Article) => {
    navigation.navigate('ArticleDetail', { article: a });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>База знаний</Text>
      <Text style={styles.subtitle}>
        Проверенные статьи от специалистов по воспитанию, уходу и здоровью
      </Text>

      <TextInput
        style={styles.search}
        placeholder="Поиск по статьям..."
        placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
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
        {user?.is_admin && pendingArticles.length > 0 ? (
          <View style={styles.articleCard}>
            <Text style={styles.articleTitle}>Ожидают модерации ({pendingArticles.length})</Text>
            {pendingArticles.map((a) => (
              <View key={`pending-${a.id}`} style={styles.pendingItem}>
                <TouchableOpacity onPress={() => openArticle(a)} activeOpacity={0.8}>
                  <Text style={styles.articleCategory}>{a.category}</Text>
                  <Text style={styles.articleTitle}>{a.title}</Text>
                  <Text style={styles.openHint}>Нажмите, чтобы открыть полностью</Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    style={styles.catBtnActive}
                    onPress={async () => {
                      await api.moderateArticle(a.id, 'approve');
                      await loadArticles(selectedCategory ?? undefined);
                    }}
                  >
                    <Text style={styles.catTextActive}>Одобрить</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.catBtn}
                    onPress={async () => {
                      await api.moderateArticle(a.id, 'reject');
                      await loadArticles(selectedCategory ?? undefined);
                    }}
                  >
                    <Text style={styles.catText}>Отклонить</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.articleCard}>
          <TouchableOpacity style={styles.submitHeader} onPress={() => setShowSubmit((v) => !v)}>
            <Text style={styles.articleTitle}>Предложить статью</Text>
            <Text style={styles.articleAuthor}>{showSubmit ? 'Свернуть' : 'Открыть форму'}</Text>
          </TouchableOpacity>
          {showSubmit ? (
            <>
              <TextInput
                style={styles.search}
                placeholder="Заголовок"
                placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
                value={draft.title}
                onChangeText={(v) => setDraft((p) => ({ ...p, title: v }))}
              />
              <TextInput
                style={styles.search}
                placeholder="Категория"
                placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
                value={draft.category}
                onChangeText={(v) => setDraft((p) => ({ ...p, category: v }))}
              />
              <TextInput
                style={[styles.search, { minHeight: 100 }]}
                multiline
                placeholder="Текст статьи"
                placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
                value={draft.content}
                onChangeText={(v) => setDraft((p) => ({ ...p, content: v }))}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={styles.catBtnActive}
                onPress={async () => {
                  try {
                    await api.submitArticle({
                      title: draft.title.trim(),
                      category: draft.category.trim(),
                      content: draft.content.trim(),
                    });
                    setDraft({ title: '', category: '', content: '' });
                    setShowSubmit(false);
                    Alert.alert('Отправлено', 'Статья отправлена на модерацию');
                    await loadArticles(selectedCategory ?? undefined);
                  } catch (e) {
                    Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось отправить статью');
                  }
                }}
              >
                <Text style={styles.catTextActive}>Отправить на проверку</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
        {loading ? <ActivityIndicator size="large" color="#2b84ff" /> : null}
        {!loading && filtered.length === 0 ? (
          <Text style={styles.empty}>Ничего не найдено</Text>
        ) : null}
        {filtered.map((a) => (
          <TouchableOpacity key={a.id} style={styles.articleCard} onPress={() => openArticle(a)} activeOpacity={0.85}>
            <Text style={styles.articleCategory}>{a.category}</Text>
            <Text style={styles.articleTitle}>{a.title}</Text>
            <Text style={styles.articlePreview} numberOfLines={2}>
              {a.content.replace(/\s+/g, ' ').trim()}
            </Text>
            <Text style={styles.openHint}>Открыть статью →</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#11131a' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#edf2fb', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#aab4c8', marginBottom: 20 },
  search: {
    backgroundColor: '#171c29',
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2d3548',
    color: INPUT_TEXT_COLOR,
  },
  categories: { marginBottom: 20, marginHorizontal: -20, paddingHorizontal: 20 },
  catBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#1b2233', marginRight: 8, borderWidth: 1, borderColor: '#2f384e' },
  catBtnActive: { backgroundColor: '#2b84ff', borderColor: '#2b84ff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  catText: { fontSize: 14, color: '#b3bfd4' },
  catTextActive: { color: '#fff', fontWeight: '600' },
  articles: { gap: 12 },
  articleCard: {
    backgroundColor: '#171c29',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  articleCategory: { fontSize: 12, color: '#7cb2ff', fontWeight: '600', marginBottom: 4 },
  articleTitle: { fontSize: 16, fontWeight: '600', color: '#eaf0ff' },
  articlePreview: { marginTop: 8, fontSize: 14, color: '#9aa6bc', lineHeight: 20 },
  openHint: { marginTop: 8, fontSize: 12, color: '#6ac2ff', fontWeight: '600' },
  articleAuthor: { marginTop: 8, fontSize: 12, color: '#a7b2c8' },
  submitHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pendingItem: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#2d3548', paddingTop: 10 },
  empty: { color: '#98a3b8', textAlign: 'center', marginTop: 8 },
});
