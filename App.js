import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import Authentification from './Screens/Authentification';
import Accueil from './Screens/Accueil';
import Chat from './Screens/Chat';
import MyProfile from './Screens/MyProfil';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Authentification" component={Authentification} />
          <Stack.Screen name="Accueil" component={Accueil} options={{ headerShown: true }} />
          <Stack.Screen name="MyProfil" component={MyProfile} options={{ headerShown: true }} />
          <Stack.Screen name="Chat" component={Chat} options={{ headerShown: true }} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
