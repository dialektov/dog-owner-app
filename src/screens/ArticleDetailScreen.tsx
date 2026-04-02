import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../api/client';
import { useUser } from '../context/UserContext';
import type { EncyclopediaStackParamList } from '../navigation/EncyclopediaStack';

type Nav = NativeStackNavigationProp<EncyclopediaStackParamList, 'ArticleDetail'>;
type R = RouteProp<EncyclopediaStackParamList, 'ArticleDetail'>;

export default function ArticleDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { user } = useUser();
  const { article } = route.params;

  const onApprove = async () => {
    try {
      await api.moderateArticle(article.id, 'approve');
      Alert.alert('Готово', 'Статья опубликована');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось одобрить');
    }
  };

  const onReject = async () => {
    try {
      await api.moderateArticle(article.id, 'reject');
      Alert.alert('Готово', 'Статья отклонена');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось отклонить');
    }
  };

  const onDelete = () => {
    Alert.alert('Удалить статью?', 'Действие необратимо.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteArticle(article.id);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось удалить');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 40 }]}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}>
        <Text style={styles.backText}>‹ Назад к списку</Text>
      </TouchableOpacity>

      <Text style={styles.category}>{article.category}</Text>
      <Text style={styles.title}>{article.title}</Text>
      {article.author ? <Text style={styles.meta}>Автор: {article.author}</Text> : null}
      {user?.is_admin ? (
        <Text style={styles.meta}>Статус: {article.status || 'published'}</Text>
      ) : null}

      <Text style={styles.body}>{article.content}</Text>

      {user?.is_admin ? (
        <View style={styles.adminBar}>
          {article.status === 'pending' ? (
            <View style={styles.adminRow}>
              <TouchableOpacity style={styles.btnApprove} onPress={onApprove}>
                <Text style={styles.btnApproveText}>Одобрить</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnReject} onPress={onReject}>
                <Text style={styles.btnRejectText}>Отклонить</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <TouchableOpacity style={styles.btnDelete} onPress={onDelete}>
            <Text style={styles.btnDeleteText}>Удалить статью</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#11131a' },
  content: { paddingHorizontal: 20 },
  back: { alignSelf: 'flex-start', marginBottom: 16 },
  backText: { fontSize: 16, color: '#6ac2ff', fontWeight: '600' },
  category: { fontSize: 13, color: '#7cb2ff', fontWeight: '700', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#eaf0ff', marginBottom: 10, lineHeight: 28 },
  meta: { fontSize: 13, color: '#9aa6bc', marginBottom: 6 },
  body: { fontSize: 16, color: '#d3dbee', lineHeight: 26, marginTop: 12 },
  adminBar: { marginTop: 28, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#2d3548' },
  adminRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  btnApprove: {
    flex: 1,
    backgroundColor: '#2b84ff',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnApproveText: { color: '#fff', fontWeight: '700' },
  btnReject: {
    flex: 1,
    backgroundColor: '#2a3144',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3d4a63',
  },
  btnRejectText: { color: '#c7d1e2', fontWeight: '600' },
  btnDelete: { paddingVertical: 12, alignItems: 'center' },
  btnDeleteText: { color: '#ff7f8d', fontWeight: '700', fontSize: 15 },
});
