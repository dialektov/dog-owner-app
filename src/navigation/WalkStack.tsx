import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import WalkTrackerScreen from '../screens/WalkTrackerScreen';
import WalkHistoryScreen from '../screens/WalkHistoryScreen';
import WalkDetailScreen from '../screens/WalkDetailScreen';
import type { WalkRecord } from '../types';

export type WalkStackParamList = {
  WalkMain: undefined;
  WalkHistory: undefined;
  WalkDetail: { walk: WalkRecord };
};

const Stack = createNativeStackNavigator<WalkStackParamList>();

export default function WalkStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#10131b' },
      }}
    >
      <Stack.Screen name="WalkMain" component={WalkTrackerScreen} />
      <Stack.Screen name="WalkHistory" component={WalkHistoryScreen} />
      <Stack.Screen name="WalkDetail" component={WalkDetailScreen} />
    </Stack.Navigator>
  );
}
