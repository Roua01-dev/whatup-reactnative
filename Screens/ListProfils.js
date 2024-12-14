import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  StyleSheet,
  StatusBar,
  Linking,
} from 'react-native';
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref as dbRef, onValue, update } from 'firebase/database';
import moment from 'moment'; // For time formatting

export default function ListProfils({ navigation }) {
  const [profiles, setProfiles] = useState([]);
  const auth = getAuth();
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchProfiles = () => {
      const db = getDatabase();
      const profilesRef = dbRef(db, 'profiles');
      const chatsRef = dbRef(db, 'chats');

      onValue(profilesRef, (snapshot) => {
        if (snapshot.exists()) {
          const profilesData = snapshot.val();
          const profilesList = [];

          // Fetch chat data for each profile
          onValue(chatsRef, (chatsSnapshot) => {
            const chatsData = chatsSnapshot.val() || {};

            Object.keys(profilesData).forEach((uid) => {
              if (uid !== currentUserId) {
                const conversationId = [currentUserId, uid].sort().join('_');
                const messages = chatsData[conversationId]
                  ? Object.values(chatsData[conversationId])
                  : [];
                const lastMessage =
                  messages.length > 0
                    ? messages[messages.length - 1]
                    : null;

                profilesList.push({
                  uid,
                  pseudo: profilesData[uid]?.pseudo || 'Unknown',
                  profileImage: profilesData[uid]?.profileImage || null,
                  isConnected: profilesData[uid]?.isConnected || false,
                  telephone: profilesData[uid]?.telephone || '', // Include the telephone field

                  lastMessage: lastMessage
                    ? {
                        text: lastMessage.text,
                        time: lastMessage.createdAt,
                      }
                    : null,
                });
              }
            });

            // Sort profiles by the timestamp of the last message
            profilesList.sort((a, b) => {
              if (!a.lastMessage) return 1;
              if (!b.lastMessage) return -1;
              return (
                new Date(b.lastMessage.time) - new Date(a.lastMessage.time)
              );
            });

            setProfiles(profilesList);
          });
        } else {
          setProfiles([]);
        }
      });
    };

    fetchProfiles();
  }, [currentUserId]);

  const handleLogout = async () => {
    try {
      const db = getDatabase();
      const userRef = dbRef(db, `profiles/${currentUserId}`);
      await update(userRef, { isConnected: false });
      await signOut(auth);
      navigation.replace('Authentification');
    } catch (error) {
      console.error('Error logging out: ', error.message);
      Alert.alert('Error', 'Failed to log out.');
    }
  };

  const handleChatPress = (item) => {
    navigation.navigate('Chat', {
      otherUserId: item.uid,
      otherUserName: item.pseudo,
      otherUserAvatar: item.profileImage,
    });
  };

  const handlePhonePress = (telephone) => {
    if (!telephone) {
      Alert.alert('Error', 'Phone number is not available.');
      return;
    }
    const phoneNumber = `tel:${telephone}`;
    Linking.openURL(phoneNumber).catch((err) =>
      console.error('Error opening phone dialer:', err)
    );
  };

  const renderProfile = ({ item }) => {
    const timeAgo = item.lastMessage
      ? moment(item.lastMessage.time).fromNow()
      : '';
    const lastMessageText = item.lastMessage
      ? item.lastMessage.text
      : '';

    return (
      <View style={styles.profileCard}>
        <Image
          source={
            item.profileImage
              ? { uri: item.profileImage }
              : require('../assets/defaultProfile.png')
          }
          style={styles.profileImage}
        />
        <View style={styles.textContainer}>
          <Text style={styles.profileName}>{item.pseudo}</Text>
          <Text style={styles.lastMessage}>{lastMessageText}</Text>
          <Text style={styles.timeAgo}>{timeAgo}</Text>
        </View>
        <View
          style={[
            styles.statusIndicator,
            { backgroundColor: item.isConnected ? 'green' : 'red' },
          ]}
        />
        <TouchableOpacity onPress={() => handleChatPress(item)}>
          <Image
            source={require('../assets/message.png')}
            style={styles.icon}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handlePhonePress(item.telephone)}>
          <Image
            source={require('../assets/phone.png')}
            style={styles.icon}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.headerText}>List Profiles</Text>
      <FlatList
        data={profiles}
        keyExtractor={(item) => item.uid}
        renderItem={(props) => renderProfile({ ...props, key: undefined })}
        contentContainerStyle={styles.listContent}
      />
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f7',
    paddingTop: StatusBar.currentHeight || 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginVertical: 20,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  lastMessage: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
  timeAgo: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  statusIndicator: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    marginLeft: 10,
  },
  icon: {
    width: 30,
    height: 30,
    marginLeft: 10,
  },
  logoutButton: {
    backgroundColor: '#d9534f',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 25,
    alignSelf: 'center',
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
