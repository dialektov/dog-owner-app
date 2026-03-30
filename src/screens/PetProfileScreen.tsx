import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { useUser } from '../context/UserContext';
import { api } from '../api/client';
import * as Location from 'expo-location';

type ApiPet = {
  id: string;
  owner_id: string;
  name: string;
  breed: string;
  age: number;
  weight: number;
  photos?: string;
  allergies?: string;
  vaccinations?: string;
  vet_contacts?: string;
  qr_code_data: string;
};

export default function PetProfileScreen() {
  const navigation = useNavigation<any>();
  const { user } = useUser();
  const [pet, setPet] = useState<ApiPet | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingLost, setCreatingLost] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    breed: '',
    age: '',
    weight: '',
    allergies: '',
    vaccinations: '',
    vet_contacts: '',
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const full = await api.getUser(user.id);
        const pets = (full as { pets?: ApiPet[] }).pets;
        if (pets?.length) {
          setPet(pets[0]);
          setForm({
            name: pets[0].name ?? '',
            breed: pets[0].breed ?? '',
            age: String(pets[0].age ?? ''),
            weight: String(pets[0].weight ?? ''),
            allergies: pets[0].allergies ?? '',
            vaccinations: pets[0].vaccinations ?? '',
            vet_contacts: pets[0].vet_contacts ?? '',
          });
        } else {
          setPet(null);
        }
      } catch (e) {
        if (__DEV__) console.warn('PetProfileScreen load:', e);
        setPet(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#FF9F43" />
      </View>
    );
  }

  const savePet = async () => {
    if (!user) return;
    if (!form.name.trim() || !form.breed.trim()) {
      Alert.alert('Ошибка', 'Введите кличку и породу');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        owner_id: user.id,
        name: form.name.trim(),
        breed: form.breed.trim(),
        age: Number(form.age) || 0,
        weight: Number(form.weight) || 0,
        photos: '[]',
        allergies: form.allergies.trim(),
        vaccinations: form.vaccinations.trim(),
        vet_contacts: form.vet_contacts.trim(),
      };
      if (pet) {
        const updated = await api.updatePet(pet.id, { ...pet, ...payload }) as ApiPet;
        setPet(updated);
      } else {
        const created = await api.createPet(payload) as ApiPet;
        setPet(created);
      }
      setEditing(false);
      Alert.alert('Готово', 'Карточка питомца сохранена');
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось сохранить карточку');
    } finally {
      setSaving(false);
    }
  };

  if (!pet && !editing) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Карточка питомца</Text>
        <Text style={styles.subtitle}>Питомец не добавлен. Создайте карточку ниже.</Text>
        <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
          <Text style={styles.editButtonText}>Создать карточку питомца</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const onCreateLostAlert = async () => {
    if (!user || !pet) return;
    setCreatingLost(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      let latitude = 55.7558;
      let longitude = 37.6173;
      if (permission.status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({});
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      }
      await api.createLostAlert({
        pet_id: pet.id,
        pet_name: pet.name,
        breed: pet.breed,
        description: `Пропал питомец ${pet.name}. Если увидите, свяжитесь с владельцем.`,
        contact: user.email,
        latitude,
        longitude,
      });
      Alert.alert('Объявление создано', 'Режим "Потерялся питомец" активирован. Проверьте карту.');
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось создать объявление');
    } finally {
      setCreatingLost(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Карточка питомца</Text>
      <Text style={styles.subtitle}>
        QR-код можно распечатать и закрепить на ошейнике
      </Text>

      {/* QR-код */}
      {pet ? (
        <View style={styles.qrContainer}>
          <View style={styles.qrBox}>
            <QRCode value={pet.qr_code_data} size={180} />
          </View>
          <Text style={styles.qrHint}>
            При потере — нашедший отсканирует код и увидит ваши контакты{'\n'}
            На прогулке — отсканируйте код другой собаки, чтобы добавить хозяина в друзья
          </Text>
        </View>
      ) : null}

      {editing ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{pet ? 'Редактирование карточки' : 'Новая карточка'}</Text>
          <TextInput style={styles.input} placeholder="Кличка" value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} />
          <TextInput style={styles.input} placeholder="Порода" value={form.breed} onChangeText={(v) => setForm((p) => ({ ...p, breed: v }))} />
          <TextInput style={styles.input} placeholder="Возраст (лет)" keyboardType="number-pad" value={form.age} onChangeText={(v) => setForm((p) => ({ ...p, age: v }))} />
          <TextInput style={styles.input} placeholder="Вес (кг)" keyboardType="decimal-pad" value={form.weight} onChangeText={(v) => setForm((p) => ({ ...p, weight: v }))} />
          <TextInput style={styles.input} placeholder="Аллергии" value={form.allergies} onChangeText={(v) => setForm((p) => ({ ...p, allergies: v }))} />
          <TextInput style={styles.input} placeholder="Прививки" value={form.vaccinations} onChangeText={(v) => setForm((p) => ({ ...p, vaccinations: v }))} />
          <TextInput style={styles.input} placeholder="Контакты ветврача" value={form.vet_contacts} onChangeText={(v) => setForm((p) => ({ ...p, vet_contacts: v }))} />
          <TouchableOpacity style={styles.saveBtn} onPress={savePet} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? 'Сохраняем...' : 'Сохранить'}</Text>
          </TouchableOpacity>
          {pet ? (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
              <Text style={styles.cancelBtnText}>Отмена</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <TouchableOpacity style={styles.photoPlaceholder}>
          <Text style={styles.photoText}>+ Добавить фото</Text>
        </TouchableOpacity>
      )}

      {/* Основная информация */}
      {!editing && pet ? (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Основная информация</Text>
        <InfoRow label="Кличка" value={pet.name} />
        <InfoRow label="Порода" value={pet.breed} />
        <InfoRow label="Возраст" value={`${pet.age} года`} />
        <InfoRow label="Вес" value={`${pet.weight} кг`} />
      </View>
      ) : null}

      {/* Медицинские данные */}
      {!editing && pet ? (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Медицинские данные</Text>
        <InfoRow label="Аллергии" value={pet.allergies || '—'} />
        <InfoRow label="Прививки" value={pet.vaccinations || '—'} />
        <InfoRow label="Контакты ветврача" value={pet.vet_contacts || '—'} />
      </View>
      ) : null}

      {!editing && pet ? (
      <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
        <Text style={styles.editButtonText}>Редактировать карточку</Text>
      </TouchableOpacity>
      ) : null}

      {!editing && pet ? (
      <TouchableOpacity style={styles.lostButton} onPress={onCreateLostAlert} disabled={creatingLost}>
        <Text style={styles.lostButtonText}>
          {creatingLost ? 'Создаем объявление...' : '🚨 Потерялся питомец'}
        </Text>
      </TouchableOpacity>
      ) : null}

      {/* Ссылка на калькулятор кормления */}
      {!editing && pet ? (
      <TouchableOpacity
        style={styles.calcButton}
        onPress={() => navigation.navigate('FeedingCalculator')}
      >
        <Text style={styles.calcButtonText}>📊 Калькулятор кормления</Text>
      </TouchableOpacity>
      ) : null}
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  saveBtn: { backgroundColor: '#2ecc71', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  cancelBtn: { backgroundColor: '#eee', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8 },
  cancelBtnText: { color: '#555' },
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
  centered: { justifyContent: 'center', alignItems: 'center' },
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
  lostButton: {
    backgroundColor: '#c0392b',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  lostButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
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
