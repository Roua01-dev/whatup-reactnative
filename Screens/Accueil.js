import React, { useEffect, useState } from 'react';
import { getDatabase, ref as dbRef, get } from 'firebase/database';
import { createMaterialBottomTabNavigator } from '@react-navigation/material-bottom-tabs';
import { Image } from 'react-native';
import ListProfils from './ListProfils';
import Group from './Group';
import MyProfil from './MyProfil';

export default function Accueil({ route, navigation }) {
  const Tab = createMaterialBottomTabNavigator();
  const { userId } = route.params;

  if (!userId) {
    console.error('No userId provided. Redirecting to Authentification.');
    navigation.replace('Authentification');
    return null;
  }

  const [isProfileComplete, setIsProfileComplete] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      const db = getDatabase();
      const userRef = dbRef(db, `profiles/${userId}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        setIsProfileComplete(true); // Le profil est complet
      } else {
        setIsProfileComplete(false); // Profil manquant, redirection
        navigation.replace('MyProfil', { userId });
      }
    };

    checkProfile();
  }, [userId, navigation]);

  if (!isProfileComplete) {
    return null; // Attente pendant la vérification
  }

  return (
    <Tab.Navigator
      shifting={true}
    >
      <Tab.Screen
        name="List"
        component={ListProfils}
        options={{
          tabBarIcon: ({ color }) => (
            <Image
              source={require('../assets/list.png')}
              style={{ width: 30, height: 30, tintColor: color  }}
            />
          ),
          tabBarLabel: 'Profils',
        }}
      />
      <Tab.Screen
        name="Groupe"
        children={() => <Group userId={userId} />}
        options={{
          tabBarIcon: ({ color }) => (
            <Image
              source={require('../assets/groupchat.png')}
              style={{ width: 30, height: 30, tintColor: color }}
            />
          ),
          tabBarLabel: 'Groupe',
        }}
      />
      <Tab.Screen
        name="MyProfil"
        children={() => (
          <MyProfil
            route={{ params: { userId } }}
            navigation={navigation}
          />
        )}
        options={{
          tabBarIcon: ({ color }) => (
            <Image
              source={require('../assets/myprofil.png')}
              style={{ width: 24, height: 24, tintColor: color }}
            />
          ),
          tabBarLabel: 'Mon Profil',
        }}
      />
    </Tab.Navigator>
  );
}
