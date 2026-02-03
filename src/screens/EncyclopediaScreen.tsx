import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';

const CATEGORIES = ['Воспитание', 'Уход', 'Здоровье', 'Питание'];

const DEMO_ARTICLES = [
  { id: '1', title: 'Как приучить щенка к туалету', category: 'Воспитание' },
  { id: '2', title: 'Уход за шерстью длинношёрстных пород', category: 'Уход' },
  { id: '3', title: 'Когда делать прививки собаке', category: 'Здоровье' },
  { id: '4', title: 'Натуральное питание vs корм', category: 'Питание' },
];

export default function EncyclopediaScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filtered = selectedCategory
    ? DEMO_ARTICLES.filter((a) => a.category === selectedCategory)
    : DEMO_ARTICLES;

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
        {filtered.map((a) => (
          <TouchableOpacity key={a.id} style={styles.articleCard}>
            <Text style={styles.articleCategory}>{a.category}</Text>
            <Text style={styles.articleTitle}>{a.title}</Text>
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
});
