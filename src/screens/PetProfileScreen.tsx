import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';

const DEMO_PET = {
  id: '1',
  name: 'Барсик',
  breed: 'Лабрадор',
  age: 3,
  weight: 28,
  photos: [],
  allergies: 'Курица',
  vaccinations: 'Все прививки актуальны',
  vetContacts: '+7 (999) 123-45-67',
  ownerId: 'user1',
  qrCodeData: 'pet-dogowner-001',
};

export default function PetProfileScreen() {
  const navigation = useNavigation<any>();
  const [pet, setPet] = useState(DEMO_PET);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Карточка питомца</Text>
      <Text style={styles.subtitle}>
        QR-код можно распечатать и закрепить на ошейнике
      </Text>

      {/* QR-код */}
      <View style={styles.qrContainer}>
        <View style={styles.qrBox}>
          <QRCode value={pet.qrCodeData} size={180} />
        </View>
        <Text style={styles.qrHint}>
          При потере — нашедший отсканирует код и увидит ваши контакты{'\n'}
          На прогулке — отсканируйте код другой собаки, чтобы добавить хозяина в друзья
        </Text>
      </View>

      {/* Фото (заглушка) */}
      <TouchableOpacity style={styles.photoPlaceholder}>
        <Text style={styles.photoText}>+ Добавить фото</Text>
      </TouchableOpacity>

      {/* Основная информация */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Основная информация</Text>
        <InfoRow label="Кличка" value={pet.name} />
        <InfoRow label="Порода" value={pet.breed} />
        <InfoRow label="Возраст" value={`${pet.age} года`} />
        <InfoRow label="Вес" value={`${pet.weight} кг`} />
      </View>

      {/* Медицинские данные */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Медицинские данные</Text>
        <InfoRow label="Аллергии" value={pet.allergies || '—'} />
        <InfoRow label="Прививки" value={pet.vaccinations || '—'} />
        <InfoRow label="Контакты ветврача" value={pet.vetContacts || '—'} />
      </View>

      <TouchableOpacity style={styles.editButton}>
        <Text style={styles.editButtonText}>Редактировать карточку</Text>
      </TouchableOpacity>

      {/* Ссылка на калькулятор кормления */}
      <TouchableOpacity
        style={styles.calcButton}
        onPress={() => navigation.navigate('FeedingCalculator')}
      >
        <Text style={styles.calcButtonText}>📊 Калькулятор кормления</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  qrContainer: { alignItems: 'center', marginBottom: 24 },
  qrBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  photoPlaceholder: {
    height: 120,
    backgroundColor: '#e9ecef',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  photoText: { color: '#999', fontSize: 14 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoLabel: { color: '#666', fontSize: 14 },
  infoValue: { color: '#333', fontSize: 14, fontWeight: '500' },
  editButton: {
    backgroundColor: '#FF9F43',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  editButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  calcButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF9F43',
  },
  calcButtonText: { color: '#FF9F43', fontSize: 16, fontWeight: '600' },
});
