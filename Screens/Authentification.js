// Authentification.js

import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { auth } from "../Config/index1"; // Import auth from Firebase
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref as dbRef, set, update, get } from 'firebase/database';

export default function Authentification({ navigation }) {
  const [email, setEmail] = useState('');
  const [pwd, setPassword] = useState('');
  const refinput2 = useRef();

  const handleLogin = () => {
    signInWithEmailAndPassword(auth, email, pwd)
      .then(async (userCredential) => {
        const userId = userCredential.user.uid;
  
        // Vérifiez si le profil existe dans Firebase
        const db = getDatabase();
        const userRef = dbRef(db, `profiles/${userId}`);
        const snapshot = await get(userRef);
  
        if (snapshot.exists()) {
          // Si le profil existe, mettez à jour `isConnected` et naviguez vers Accueil
          await update(userRef, { isConnected: true });
          navigation.navigate('Accueil', { userId }); // Passez userId à Accueil
        } else {
          // Si le profil n'existe pas, redirigez vers MyProfil pour le créer
          navigation.navigate('MyProfil', { userId }); // Passez userId à MyProfil
        }
      })
      .catch((err) => {
        Alert.alert("Login Error", err.message);
      });
  };
  
  
  const handleRegister = () => {
    createUserWithEmailAndPassword(auth, email, pwd)
      .then((userCredential) => {
        const userId = userCredential.user.uid;
        navigation.navigate('MyProfil', { userId }); // Redirigez vers MyProfil après l'inscription
      })
      .catch((err) => {
        Alert.alert("Registration Error", err.message);
      });
  };
  

  return (
    <View style={styles.container}>
      <View style={styles.loginBox}>
        <Text style={styles.title}>Login</Text>
        <TextInput
          onChangeText={setEmail}
          onSubmitEditing={() => refinput2.current.focus()}
          blurOnSubmit={false}
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#888"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          ref={refinput2}
          onChangeText={setPassword}
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          secureTextEntry
        />
        <TouchableOpacity style={styles.styledButton} onPress={handleLogin}>
          <Text style={styles.styledButtonText}>Login</Text>
        </TouchableOpacity>
        <Text style={styles.forgotPassword}>Forgot Password?</Text>
        <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
          <Text style={styles.registerText}>Create new user</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f0f0f0",
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loginBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 25,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
    borderColor: '#ddd',
    borderWidth: 1,
  },
  styledButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 8,
    backgroundColor: '#1e90ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    marginTop: 10,
  },
  styledButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  forgotPassword: {
    marginTop: 15,
    fontSize: 15,
    color: '#1e90ff',
    textDecorationLine: 'underline',
  },
  registerButton: {
    marginTop: 10,
    paddingVertical: 10,
  },
  registerText: {
    fontSize: 16,
    color: '#1e90ff',
    textDecorationLine: 'underline',
    fontWeight: 'bold',
  },
});
