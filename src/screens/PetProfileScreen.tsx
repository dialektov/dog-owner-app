import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { useUser } from '../context/UserContext';
import { api } from '../api/client';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { INPUT_PLACEHOLDER_COLOR } from '../theme/input';

type ApiPet = {
  id: string;
  owner_id: string;
  name: string;
  breed: string;
  birth_date?: string;
  age: number;
  weight: number;
  photos?: string;
  allergies?: string;
  vaccinations?: string;
  vet_contacts?: string;
  qr_code_data: string;
};

export default function PetProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useUser();
  const [pet, setPet] = useState<ApiPet | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingLost, setCreatingLost] = useState(false);
  const [lostMessage, setLostMessage] = useState('');
  const [activeLostAlert, setActiveLostAlert] = useState<{ id: string; description: string } | null>(null);
  const [markingFound, setMarkingFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    breed: '',
    birth_date: '',
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
          setPhotoUri(extractFirstPhoto(pets[0].photos));
          setForm({
            name: pets[0].name ?? '',
            breed: pets[0].breed ?? '',
            birth_date: pets[0].birth_date ?? '',
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

  const loadActiveLostAlert = useCallback(async () => {
    if (!user?.id || !pet?.id) {
      setActiveLostAlert(null);
      return;
    }
    try {
      const list = await api.getLostAlerts('active');
      if (!Array.isArray(list)) {
        setActiveLostAlert(null);
        return;
      }
      const mine = list.find((a) => a.user_id === user.id && a.pet_id === pet.id);
      setActiveLostAlert(mine ? { id: mine.id, description: mine.description || '' } : null);
    } catch {
      setActiveLostAlert(null);
    }
  }, [user?.id, pet?.id]);

  useEffect(() => {
    loadActiveLostAlert();
  }, [loadActiveLostAlert]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#2b84ff" />
      </View>
    );
  }

  const savePet = async () => {
    if (!user) return;
    if (!form.name.trim() || !form.breed.trim()) {
      Alert.alert('Ошибка', 'Введите кличку и породу');
      return;
    }
    const parsedBirthDate = parseBirthDate(form.birth_date.trim());
    if (form.birth_date.trim() && !parsedBirthDate) {
      Alert.alert('Ошибка', 'Укажите дату рождения в формате YYYY-MM-DD или DD.MM.YYYY');
      return;
    }
    if (parsedBirthDate && parsedBirthDate.getTime() > Date.now()) {
      Alert.alert('Ошибка', 'Дата рождения не может быть в будущем');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        owner_id: user.id,
        name: form.name.trim(),
        breed: form.breed.trim(),
        birth_date: toIsoBirthDate(parsedBirthDate),
        age: ageYearsFromBirthDate(parsedBirthDate),
        weight: Number(form.weight) || 0,
        photos: JSON.stringify(photoUri ? [photoUri] : []),
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

  const pickPhoto = async () => {
    Alert.alert(
      'Фото питомца',
      'Выберите источник изображения',
      [
        {
          text: 'Камера',
          onPress: async () => {
            const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
            if (!cameraPermission.granted) {
              Alert.alert('Нет доступа', 'Разрешите доступ к камере');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              quality: 0.7,
            });
            if (!result.canceled && result.assets[0]?.uri) {
              setPhotoUri(result.assets[0].uri);
            }
          },
        },
        {
          text: 'Галерея',
          onPress: async () => {
            const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!libraryPermission.granted) {
              Alert.alert('Нет доступа', 'Разрешите доступ к галерее');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.7,
            });
            if (!result.canceled && result.assets[0]?.uri) {
              setPhotoUri(result.assets[0].uri);
            }
          },
        },
        { text: 'Отмена', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  if (!pet && !editing) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}>
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
    if (activeLostAlert) {
      Alert.alert('Уже есть объявление', 'Сначала снимите текущее объявление, если питомец нашёлся.');
      return;
    }
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
      const custom = lostMessage.trim();
      const description =
        custom ||
        `Пропал питомец ${pet.name}. Если увидите, свяжитесь с владельцем.`;
      await api.createLostAlert({
        pet_id: pet.id,
        pet_name: pet.name,
        breed: pet.breed,
        description,
        contact: user.email,
        latitude,
        longitude,
      });
      setLostMessage('');
      await loadActiveLostAlert();
      Alert.alert('Объявление создано', 'Режим «Потерялся питомец» активирован. Проверьте карту.');
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось создать объявление');
    } finally {
      setCreatingLost(false);
    }
  };

  const onMarkPetFound = () => {
    if (!activeLostAlert) return;
    Alert.alert(
      'Снять объявление?',
      'Маркер пропажи исчезнет с карты «Потерялся питомец».',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Питомец нашёлся',
          onPress: async () => {
            setMarkingFound(true);
            try {
              await api.markLostAlertFound(activeLostAlert.id);
              setActiveLostAlert(null);
              Alert.alert('Готово', 'Объявление снято.');
            } catch (e) {
              Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось обновить объявление');
            } finally {
              setMarkingFound(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}>
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
          <TouchableOpacity style={styles.photoPlaceholder} onPress={pickPhoto}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            ) : (
              <Text style={styles.photoText}>+ Добавить фото</Text>
            )}
          </TouchableOpacity>
          {photoUri ? (
            <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setPhotoUri(null)}>
              <Text style={styles.removePhotoBtnText}>Удалить фото</Text>
            </TouchableOpacity>
          ) : null}
          <TextInput
            style={styles.input}
            placeholder="Кличка"
            placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
            value={form.name}
            onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Порода"
            placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
            value={form.breed}
            onChangeText={(v) => setForm((p) => ({ ...p, breed: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Дата рождения (YYYY-MM-DD или DD.MM.YYYY)"
            placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
            value={form.birth_date}
            onChangeText={(v) => setForm((p) => ({ ...p, birth_date: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Вес (кг)"
            placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
            keyboardType="decimal-pad"
            value={form.weight}
            onChangeText={(v) => setForm((p) => ({ ...p, weight: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Аллергии"
            placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
            value={form.allergies}
            onChangeText={(v) => setForm((p) => ({ ...p, allergies: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Прививки"
            placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
            value={form.vaccinations}
            onChangeText={(v) => setForm((p) => ({ ...p, vaccinations: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Контакты ветврача"
            placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
            value={form.vet_contacts}
            onChangeText={(v) => setForm((p) => ({ ...p, vet_contacts: v }))}
          />
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
        <TouchableOpacity style={styles.photoPlaceholder} onPress={() => setEditing(true)}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <Text style={styles.photoText}>+ Добавить фото</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Основная информация */}
      {!editing && pet ? (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Основная информация</Text>
        <InfoRow label="Кличка" value={pet.name} />
        <InfoRow label="Порода" value={pet.breed} />
        <InfoRow label="Возраст" value={formatAgeWithBirthday(pet.birth_date, pet.age)} />
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
        activeLostAlert ? (
          <View style={styles.lostCard}>
            <Text style={styles.lostCardTitle}>Активное объявление о пропаже</Text>
            <Text style={styles.lostCardText}>
              {activeLostAlert.description.trim() || 'Текст не указан'}
            </Text>
            <TouchableOpacity
              style={[styles.foundButton, markingFound && styles.foundButtonDisabled]}
              onPress={onMarkPetFound}
              disabled={markingFound}
            >
              <Text style={styles.foundButtonText}>
                {markingFound ? 'Снимаем…' : 'Питомец нашёлся — снять объявление'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.lostSection}>
            <Text style={styles.lostSectionLabel}>Текст объявления</Text>
            <TextInput
              style={styles.lostMessageInput}
              placeholder="Опишите обстоятельства, особые приметы, как связаться…"
              placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
              value={lostMessage}
              onChangeText={setLostMessage}
              multiline
              maxLength={800}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.lostButton, creatingLost && styles.foundButtonDisabled]}
              onPress={onCreateLostAlert}
              disabled={creatingLost}
            >
              <Text style={styles.lostButtonText}>
                {creatingLost ? 'Создаем объявление...' : '🚨 Потерялся питомец'}
              </Text>
            </TouchableOpacity>
          </View>
        )
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

function extractFirstPhoto(raw?: string): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && typeof parsed[0] === 'string' && parsed[0].trim()) {
      return parsed[0];
    }
  } catch {
    // keep null on malformed legacy data
  }
  return null;
}

function ageYearsFromBirthDate(parsed: Date | null): number {
  if (!parsed) return 0;
  const now = new Date();
  let months = (now.getFullYear() - parsed.getFullYear()) * 12 + (now.getMonth() - parsed.getMonth());
  if (now.getDate() < parsed.getDate()) months -= 1;
  if (months < 0) months = 0;
  return Math.floor(months / 12);
}

function formatAgeWithBirthday(rawBirthDate?: string, fallbackYears = 0): string {
  const parsed = parseBirthDate(rawBirthDate);
  if (!parsed) {
    return `${fallbackYears} ${pluralYears(fallbackYears)}`;
  }
  const now = new Date();
  let months = (now.getFullYear() - parsed.getFullYear()) * 12 + (now.getMonth() - parsed.getMonth());
  if (now.getDate() < parsed.getDate()) months -= 1;
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  const birthLabel = `${String(parsed.getDate()).padStart(2, '0')}.${String(parsed.getMonth() + 1).padStart(2, '0')}.${parsed.getFullYear()}`;
  return `${years} ${pluralYears(years)} ${remMonths} мес. (🎂 ${birthLabel})`;
}

function parseBirthDate(raw?: string): Date | null {
  if (!raw) return null;
  const normalized = raw.trim();
  let y = 0;
  let m = 0;
  let d = 0;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (iso) {
    y = Number(iso[1]);
    m = Number(iso[2]);
    d = Number(iso[3]);
  } else {
    const ru = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(normalized);
    if (!ru) return null;
    y = Number(ru[3]);
    m = Number(ru[2]);
    d = Number(ru[1]);
  }

  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

function toIsoBirthDate(date: Date | null): string {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}


function pluralYears(v: number): string {
  const mod10 = v % 10;
  const mod100 = v % 100;
  if (mod10 === 1 && mod100 !== 11) return 'год';
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return 'года';
  return 'лет';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#10131b' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#edf2fb', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#aab4c8', marginBottom: 20 },
  qrContainer: { alignItems: 'center', marginBottom: 24 },
  qrBox: {
    backgroundColor: '#171c29',
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
    color: '#aab4c8',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  photoPlaceholder: {
    height: 180,
    backgroundColor: '#1f2637',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  photoText: { color: '#9ba7bd', fontSize: 14 },
  photoPreview: { width: '100%', height: '100%' },
  removePhotoBtn: { backgroundColor: '#3b2730', borderRadius: 10, padding: 10, alignItems: 'center', marginBottom: 10 },
  removePhotoBtnText: { color: '#ffadb6', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#2d3548',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#171c29',
    color: '#e8ecf4',
    fontSize: 16,
  },
  saveBtn: { backgroundColor: '#2b84ff', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  cancelBtn: { backgroundColor: '#2a3144', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8 },
  cancelBtnText: { color: '#c7d1e2' },
  section: {
    backgroundColor: '#171c29',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    borderWidth: 1,
    borderColor: '#2d3548',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#eaf0ff',
    marginBottom: 12,
  },
  centered: { justifyContent: 'center', alignItems: 'center' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2a3346' },
  infoLabel: { color: '#aab4c8', fontSize: 14 },
  infoValue: { color: '#eaf0ff', fontSize: 14, fontWeight: '500' },
  editButton: {
    backgroundColor: '#2b84ff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  editButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  lostButton: {
    backgroundColor: '#7b3fe4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  lostButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  lostSection: { marginBottom: 12 },
  lostSectionLabel: { color: '#aab4c8', fontSize: 13, marginBottom: 8 },
  lostMessageInput: {
    borderWidth: 1,
    borderColor: '#2d3548',
    borderRadius: 10,
    padding: 12,
    minHeight: 100,
    marginBottom: 12,
    backgroundColor: '#171c29',
    color: '#e8ecf4',
    fontSize: 15,
    lineHeight: 22,
  },
  lostCard: {
    backgroundColor: '#2a1f2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#5c3d52',
  },
  lostCardTitle: { color: '#ffb8c8', fontSize: 15, fontWeight: '700', marginBottom: 8 },
  lostCardText: { color: '#e8e2e6', fontSize: 14, lineHeight: 20, marginBottom: 14 },
  foundButton: {
    backgroundColor: '#2d6a4f',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  foundButtonDisabled: { opacity: 0.6 },
  foundButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  calcButton: {
    backgroundColor: '#171c29',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2b84ff',
  },
  calcButtonText: { color: '#9dc3ff', fontSize: 16, fontWeight: '600' },
});
