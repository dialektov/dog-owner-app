import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, StyleSheet } from 'react-native';

import PetProfileScreen from '../screens/PetProfileScreen';
import WalkTrackerScreen from '../screens/WalkTrackerScreen';
import FeedingCalculatorScreen from '../screens/FeedingCalculatorScreen';
import MapScreen from '../screens/MapScreen';
import SocialScreen from '../screens/SocialScreen';
import EncyclopediaScreen from '../screens/EncyclopediaScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ icon }: { icon: string }) {
  return (
    <View style={styles.tabIcon}>
      <Text style={styles.tabIconText}>{icon}</Text>
    </View>
  );
}

function PetStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PetProfile" component={PetProfileScreen} />
      <Stack.Screen name="FeedingCalculator" component={FeedingCalculatorScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF9F43',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#eee' },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tab.Screen
        name="Pet"
        component={PetStack}
        options={{
          tabBarLabel: 'Питомец',
          tabBarIcon: () => <TabIcon icon="🐕" />,
        }}
      />
      <Tab.Screen
        name="Walks"
        component={WalkTrackerScreen}
        options={{
          tabBarLabel: 'Прогулки',
          tabBarIcon: () => <TabIcon icon="🚶" />,
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: 'Карта',
          tabBarIcon: () => <TabIcon icon="🗺️" />,
        }}
      />
      <Tab.Screen
        name="Social"
        component={SocialScreen}
        options={{
          tabBarLabel: 'Друзья',
          tabBarIcon: () => <TabIcon icon="👥" />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Профиль',
          tabBarIcon: () => <TabIcon icon="👤" />,
        }}
      />
      <Tab.Screen
        name="Encyclopedia"
        component={EncyclopediaScreen}
        options={{
          tabBarLabel: 'Энциклопедия',
          tabBarIcon: () => <TabIcon icon="📚" />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconText: {
    fontSize: 22,
  },
});
