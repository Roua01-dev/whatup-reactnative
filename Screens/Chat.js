import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref as dbRef, onValue, push, set } from 'firebase/database';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useFocusEffect } from '@react-navigation/native';

export default function Chat(props) {
  const { otherUserId, otherUserName, otherUserAvatar } = props.route.params;
  const [isChatOpen, setIsChatOpen] = useState(false); // Indique si l'interface de chat est ouverte

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const auth = getAuth();
  const currentUserId = auth.currentUser?.uid;
  const currentUserName = auth.currentUser?.displayName || 'User';
  const currentUserAvatar = auth.currentUser?.photoURL || 'https://placeimg.com/140/140/any';
  const insets = useSafeAreaInsets();
  const flatListRef = useRef();
  const inputRef = useRef(null);
  const [containerFlex, setContainerFlex] = useState(1);

  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  

  useFocusEffect(
    React.useCallback(() => {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }, [])
  );
    // Détecter si l'interface de chat est ouverte
    useFocusEffect(
      useCallback(() => {
        setIsChatOpen(true);
        return () => setIsChatOpen(false);
      }, [])
    );


useEffect(() => {
  const db = getDatabase();
  const conversationId = getConversationId(currentUserId, otherUserId);
  const messagesRef = dbRef(db, 'chats/' + conversationId);

  onValue(messagesRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const messagesList = Object.entries(data).map(([key, msg]) => ({
        _id: key,
        text: msg.text,
        createdAt: new Date(msg.createdAt),
        user: {
          _id: msg.userId,
          name: msg.userName,
          avatar: msg.userAvatar,
        },
        seen: msg.seen,
      }));

      // Marquer les messages comme vus uniquement si le chat est ouvert
      if (isChatOpen) {
        Object.entries(data).forEach(([key, msg]) => {
          if (!msg.seen && msg.userId !== currentUserId) {
            const messageRef = dbRef(db, `chats/${conversationId}/${key}`);
            set(messageRef, { ...msg, seen: true }); // Marquer comme vu
          }
        });
      }

      // Regrouper les messages consécutifs du même utilisateur
      const groupedMessages = [];
      messagesList.sort((a, b) => a.createdAt - b.createdAt).forEach((msg, index) => {
        const previousMessage = groupedMessages[groupedMessages.length - 1];
        if (previousMessage && previousMessage.user._id === msg.user._id) {
          previousMessage.texts.push(msg.text);
        } else {
          groupedMessages.push({
            ...msg,
            texts: [msg.text],
          });
        }
      });

      setMessages(groupedMessages.reverse()); // Afficher les messages dans l'ordre inverse
    }
  });
      const keyboardDidShow = Keyboard.addListener("keyboardDidShow", () =>
        setContainerFlex(0.57)
      );
      const keyboardDidHide = Keyboard.addListener("keyboardDidHide", () =>
        setContainerFlex(1)
      );

  return () => {
    keyboardDidShow.remove();
    keyboardDidHide.remove();
  };
}, [currentUserId, otherUserId, isChatOpen]); // Dépend aussi de isChatOpen

  const getConversationId = (userId1, userId2) => [userId1, userId2].sort().join('_');

  const sendMessage = () => {
    if (newMessage.trim()) {
      const db = getDatabase();
      const conversationId = getConversationId(currentUserId, otherUserId);
      const newMessageRef = push(dbRef(db, 'chats/' + conversationId));
  
      set(newMessageRef, {
        text: newMessage,
        createdAt: new Date().toISOString(),
        userId: currentUserId,
        userName: currentUserName,
        userAvatar: currentUserAvatar,
        seen: false, // Par défaut, non vu
      });
  
      setNewMessage('');
      flatListRef.current.scrollToOffset({ animated: true, offset: 0 });
    }
  };
  

  const renderMessage = ({ item }) => {
    const isCurrentUser = item.user._id === currentUserId;
  
    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
        ]}
      >
        {/* Affiche les messages de l'autre utilisateur */}
        {!isCurrentUser && (
          <View style={styles.otherUserContainer}>
            <Image source={{ uri: otherUserAvatar }} style={styles.avatar} />
            <View>
              {item.texts.map((text, idx) => (
                <View key={idx} style={styles.messageBubble}>
                  <Text style={styles.otherUserText}>{text}</Text>
                  <Text style={styles.messageTime}>{formatTime(item.createdAt)}</Text> {/* Ajout de l'heure */}
                </View>
              ))}
            </View>
          </View>
        )}
  
        {/* Affiche les messages de l'utilisateur actuel */}
        {isCurrentUser && (
          <View>
            {item.texts.map((text, idx) => (
              <View key={idx} style={styles.messageBubble}>
                <Text style={styles.currentUserText}>{text}</Text>
                <Text style={styles.messageTime}>{formatTime(item.createdAt)}</Text> {/* Ajout de l'heure */}
              </View>
            ))}
            {/* Affiche "Vu" uniquement si le message est marqué comme vu */}
            {item.seen && (
              <Text style={styles.seenText}>Vu</Text>
            )}
          </View>
        )}
      </View>
    );
  };
  
  
  
  

  return (
    <KeyboardAvoidingView
    style={{ flex: containerFlex }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Image source={{ uri: otherUserAvatar }} style={styles.headerAvatar} />
        <Text style={styles.username}>{otherUserName}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id}
        inverted
        contentContainerStyle={styles.chatContainer}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type your message..."
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <FontAwesome name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatContainer: {
    padding: 10,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  messageBubble: {
    padding: 10, // Padding interne pour le contenu
    borderRadius: 10, // Coins arrondis
    alignSelf: 'flex-start', // Les bulles s'alignent à gauche par défaut
    flexShrink: 1,
  },
  currentUserText: {
    color: 'white', // Couleur du texte
  backgroundColor: '#0066CC', // Couleur de fond
  borderRadius: 10, // Coins arrondis
  padding: 15, // Padding interne pour le texte
  alignSelf: 'flex-end', // Alignement à droite
  flexShrink: 1, // Largeur maximale
  },
  seenText: {
    fontSize: 10,
    color: '#666',
    alignSelf: 'flex-end',
    marginTop: 5,
    fontWeight: 'bold',
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#0066CC',
    borderRadius: 20,
    padding: 10,
  },
  seenText: {
    fontSize: 10,
    color: '#666',
    alignSelf: 'flex-end', // Alignement à droite
    marginTop: 5,

  },
  otherUserContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  otherUserText: {
    color: '#333', // Couleur du texte
    backgroundColor: '#e0e0e0', // Couleur de fond
    borderRadius: 10, // Coins arrondis
    padding: 10, // Padding interne
    alignSelf: 'flex-start', // Alignement à gauche
    flexShrink: 1,  // Largeur maximale
  },
  messageTime: {
    fontSize: 10, // Taille de police plus petite
    color: '#888', // Couleur grise
    marginTop: 5, // Espacement au-dessus
    alignSelf: 'flex-end', // Alignement à droite
  },
  
});
