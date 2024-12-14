import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  StyleSheet,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { getDatabase, ref as dbRef, set, update, get } from 'firebase/database';
import { supabase } from '../Config/index1';

export default function MyProfile({ route, navigation}) {
  const { userId } = route.params;
  if (!userId) {
    console.error('No userId provided. Ensure it is passed via navigation.');
    navigation.replace('Authentification');
    return null;
  }
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      console.error('No userId provided. Ensure it is passed via navigation.');
      return;
    }

    const fetchProfile = async () => {
      try {
        const userRef = dbRef(getDatabase(), `profiles/${userId}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setName(userData.nom || '');
          setUsername(userData.pseudo || '');
          setPhone(userData.telephone || '');
          setImageUri(userData.profileImage || null);
          setCurrentImageUrl(userData.profileImage || null);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        Alert.alert('Error', 'Failed to fetch profile information.');
      }
    };

    fetchProfile();
  }, [userId]);

  useEffect(() => {
    const requestPermission = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant access to your photo library.');
      }
    };
    requestPermission();
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
        console.log('Selected image URI:', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const saveProfile = async () => {
    if (!name || !username || !phone) {
      Alert.alert('Error', 'Please fill all fields.');
      return;
    }
  
    setLoading(true);
  
    try {
      let imageUrl = currentImageUrl;
  
      if (imageUri && imageUri !== currentImageUrl) {
        const fileName = `${userId}.jpg`;
  
        const base64Data = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
  
        const arrayBuffer = decode(base64Data);
  
        const { data, error } = await supabase.storage
          .from('projetProfilImage')
          .upload(`profiles/${fileName}`, arrayBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });
  
        if (error) {
          throw new Error('Error uploading image to Supabase.');
        }
  
        imageUrl = `${supabase.storageUrl}/object/public/projetProfilImage/profiles/${fileName}`;
      }
  
      const userRef = dbRef(getDatabase(), `profiles/${userId}`);
      await update(userRef, {
        uid: userId,
        nom: name,
        pseudo: username,
        telephone: phone,
        profileImage: imageUrl,
        isConnected: true,
      });
  
      Alert.alert('Success', 'Profile created successfully!');
      navigation.replace('Accueil', { userId }); // Rediriger après la création du profil
    } catch (error) {
      Alert.alert('Error', `There was an issue saving your profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerText}>My Profile</Text>

      <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
        <Image
          source={imageUri ? { uri: imageUri } : require('../assets/defaultProfile.png')}
          style={styles.profileImage}
        />
        <Text style={styles.imagePickerText}>Change Profile Picture</Text>
      </TouchableOpacity>

      <TextInput
        onChangeText={setName}
        value={name}
        placeholder="Full Name"
        style={styles.input}
      />
      <TextInput
        onChangeText={setUsername}
        value={username}
        placeholder="Username"
        style={styles.input}
      />
      <TextInput
        onChangeText={setPhone}
        value={phone}
        placeholder="Phone Number"
        style={styles.input}
        keyboardType="phone-pad"
      />

      <TouchableOpacity onPress={saveProfile} style={styles.saveButton} disabled={loading}>
        <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 20,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  imagePicker: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  imagePickerText: {
    color: '#007bff',
    marginTop: 8,
  },
  input: {
    width: '85%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#333',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  saveButton: {
    width: '85%',
    height: 50,
    backgroundColor: '#007bff',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
