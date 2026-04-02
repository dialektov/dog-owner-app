import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { INPUT_PLACEHOLDER_COLOR } from '../theme/input';

type ActivityLevel = 'low' | 'medium' | 'high';

export default function FeedingCalculatorScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [weight, setWeight] = useState('25');
  const [age, setAge] = useState('3');
  const [activity, setActivity] = useState<ActivityLevel>('medium');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const calculate = () => {
    const w = parseFloat(weight) || 0;
    const a = parseInt(age, 10) || 0;
    const basePerKg = a < 1 ? 45 : a < 2 ? 35 : 30;
    const mult = activity === 'low' ? 0.9 : activity === 'high' ? 1.2 : 1;
    const grams = Math.round(w * basePerKg * mult);
    setResult(grams);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← Назад</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Калькулятор кормления</Text>
      <Text style={styles.subtitle}>Сколько грамм корма в день нужно вашей собаке</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Вес собаки (кг)</Text>
        <TextInput
          style={styles.input}
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          placeholder="25"
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
        />

        <Text style={styles.label}>Возраст (лет)</Text>
        <TextInput
          style={styles.input}
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          placeholder="3"
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
        />

        <Text style={styles.label}>Уровень активности</Text>
        <View style={styles.activityRow}>
          {(['low', 'medium', 'high'] as const).map((a) => (
            <TouchableOpacity
              key={a}
              style={[styles.activityBtn, activity === a && styles.activityBtnActive]}
              onPress={() => setActivity(a)}
            >
              <Text style={[styles.activityText, activity === a && styles.activityTextActive]}>
                {a === 'low' ? 'Низкий' : a === 'medium' ? 'Средний' : 'Высокий'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.calcBtn} onPress={calculate}>
          <Text style={styles.calcBtnText}>Рассчитать</Text>
        </TouchableOpacity>

        {result !== null && (
          <View style={styles.result}>
            <Text style={styles.resultLabel}>Рекомендуемая норма в день</Text>
            <Text style={styles.resultValue}>{result} г</Text>
          </View>
        )}
      </View>

      <View style={styles.reminder}>
        <Text style={styles.reminderLabel}>Напоминания о кормлении</Text>
        <Switch
          value={reminderEnabled}
          onValueChange={setReminderEnabled}
          trackColor={{ false: '#2d3548', true: '#5b46ff' }}
          thumbColor={reminderEnabled ? '#e8e4ff' : '#8892a8'}
          ios_backgroundColor="#2d3548"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#10131b' },
  content: { paddingHorizontal: 20 },
  backBtn: { marginBottom: 12, alignSelf: 'flex-start' },
  backBtnText: { fontSize: 16, color: '#6ac2ff', fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: '#edf2fb', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#aab4c8', marginBottom: 22, lineHeight: 20 },
  card: {
    backgroundColor: '#171c29',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2d3548',
  },
  label: { fontSize: 13, color: '#9aa6bc', marginBottom: 8, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#2d3548',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#1f2637',
    color: '#eaf0ff',
  },
  activityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  activityBtn: {
    flex: 1,
    minWidth: '28%',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#252d40',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a455c',
  },
  activityBtnActive: { backgroundColor: '#2b84ff', borderColor: '#2b84ff' },
  activityText: { fontSize: 12, color: '#aeb8ca' },
  activityTextActive: { color: '#fff', fontWeight: '700' },
  calcBtn: {
    backgroundColor: '#7b3fe4',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  calcBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  result: {
    marginTop: 18,
    padding: 16,
    backgroundColor: '#1a2338',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2b84ff',
  },
  resultLabel: { fontSize: 13, color: '#9dc3ff', marginBottom: 6 },
  resultValue: { fontSize: 22, fontWeight: '800', color: '#eaf2ff' },
  reminder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#171c29',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2d3548',
  },
  reminderLabel: { fontSize: 15, fontWeight: '600', color: '#dce4f5', flex: 1, marginRight: 12 },
});
