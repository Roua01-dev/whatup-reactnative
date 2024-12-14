import React, { useState, useEffect, useCallback } from 'react';
import { GiftedChat, Bubble, Avatar, InputToolbar } from 'react-native-gifted-chat';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref as dbRef, onValue, push, set } from 'firebase/database';
import { KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@react-navigation/stack';
import { StatusBar } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import * as DocumentPicker from 'expo-document-picker';
import { getStorage, ref as storageRef, uploadBytes } from 'firebase/storage';

const { width } = Dimensions.get('window');

export default function Chat(props) {
  const { otherUserId, otherUserName, otherUserAvatar } = props.route.params;

  const [messages, setMessages] = useState([]);
  const auth = getAuth();
  const currentUserId = auth.currentUser?.uid;
  const currentUserName = auth.currentUser?.displayName || 'User';
  const currentUserAvatar = auth.currentUser?.photoURL || 'https://placeimg.com/140/140/any';
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const db = getDatabase();
    const conversationId = getConversationId(currentUserId, otherUserId);
    const messagesRef = dbRef(db, 'chats/' + conversationId);

    onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messagesList = Object.values(data).map((msg, index) => ({
          _id: index + 1,
          text: msg.text,
          createdAt: new Date(msg.createdAt),
          user: {
            _id: msg.userId,
            name: msg.userName,
            avatar: msg.userAvatar,
          },
          seen: msg.seen,
        })) ;
        setMessages(messagesList);
                    // Met à jour le statut "vu" pour les messages non lus
                    Object.entries(data).forEach(([key, msg]) => {
                      if (!msg.seen && msg.userId !== currentUserId) {
                          const messageRef = dbRef(db, `chats/${conversationId}/${key}`);
                          set(messageRef, { ...msg, seen: true });
                      }
                    });
      }
    });
  }, [currentUserId, otherUserId]);

  const getConversationId = (userId1, userId2) => {
    return [userId1, userId2].sort().join('_');
  };

  const onSend = useCallback((messages = []) => {
    const db = getDatabase();
    const conversationId = getConversationId(currentUserId, otherUserId);
    const newMessage = messages[0];

    const newMessageRef = push(dbRef(db, 'chats/' + conversationId));
    set(newMessageRef, {
      text: newMessage.text,
      createdAt: new Date().toISOString(),
      userId: currentUserId,
      userName: currentUserName,
      userAvatar: currentUserAvatar,
      seen: false, 

    });

    // Optionally update the local UI with the new message
    // setMessages((previousMessages) => GiftedChat.append(previousMessages, messages));
  }, [currentUserId, otherUserId, currentUserName, currentUserAvatar]);

  const renderAvatar = (props) => {
    const isOtherUser = props.currentMessage.user._id === otherUserId;
    return (
      <Image
        source={{ uri: isOtherUser ? otherUserAvatar : props.currentMessage.user.avatar }}
        style={styles.avatar}
      />
    );
  };

  //msgt eli al imen wel issar
  const renderBubble = (props) => {
    const message = props.currentMessage;
    if (message.fileUrl) {
      return (
        <View style={{ padding: 10 }}>
          <Text>{message.fileName}</Text>
          <TouchableWithoutFeedback onPress={() => Linking.openURL(message.fileUrl)}>
            <Text style={{ color: 'blue', textDecorationLine: 'underline' }}>Télécharger</Text>
          </TouchableWithoutFeedback>
        </View>
      );
    }
    const isSeen = props.currentMessage.seen;
    return (
        <View>
            <Bubble
                {...props}
                wrapperStyle={{
                    right: { backgroundColor: '#0066CC' },
                    left: { backgroundColor: '#e0e0e0' },
                }}
                textStyle={{
                    right: { color: '#fff' },
                    left: { color: '#333' },
                }}
            />
            {props.position === 'right' && isSeen && (
                <Text style={{ fontSize: 10, color: '#666', alignSelf: 'flex-end', marginRight: 10 }}>
                    Vu
                </Text>
            )}
        </View>
    );
};


  //hecha icon eli yodhhor bch yahbt louta fel messag

  const scrollToBottomComponent = () => {
    return(
      <FontAwesome name='angle-double-down' size={22} color='#333' />
    );
  }


 
  // Custom InputToolbar to reduce spacing and adjust appearance
    //wen yekteb message 
    const renderInputToolbar = (props) => (
      <View style={styles.inputToolbarContainer}>
        {/* Bouton pour envoyer un fichier */}
        <TouchableWithoutFeedback onPress={handleFilePick}>
          <View style={styles.fileButton}>
            <FontAwesome name="paperclip" size={24} color="#333" />
            {/* Si vous préférez une icône personnalisée */}
            {/* <Image source={require('../assets/sendfile.png')} style={styles.fileIcon} /> */}
          </View>
        </TouchableWithoutFeedback>
        
        {/* Barre de saisie */}
       <InputToolbar  {...props}  containerStyle={styles.inputContainer} />
      </View>
    );


    const handleFilePick = async () => {
      try {
        const res = await DocumentPicker.getDocumentAsync({ type: '*/*' });
        if (res.type === 'success') {
          const fileUri = res.uri;
          const fileName = res.name;
          uploadFileToFirebase(fileUri, fileName);
        }
      } catch (err) {
        console.error('Error picking document:', err);
      }
    };
    


//3 Télécharger le fichier dans Firebase Storage

    const uploadFileToFirebase = async (fileUri, fileName) => {
      const storage = getStorage();
      const storageReference = storageRef(storage, `chat_files/${fileName}`);
    
      const response = await fetch(fileUri);
      const fileBlob = await response.blob();
    
      uploadBytes(storageReference, fileBlob)
        .then((snapshot) => {
          console.log('File uploaded successfully');
          getDownloadURL(snapshot.ref).then((url) => {
            sendFileMessage(url, fileName);
          });
        })
        .catch((error) => {
          console.error('Error uploading file:', error);
        });
    };
    
    

    //4. Enregistrer l'URL du fichier dans Realtime Database
    const sendFileMessage = (fileUrl, fileName) => {
      const db = getDatabase();
      const conversationId = getConversationId(currentUserId, otherUserId);
      const newMessageRef = push(dbRef(db, 'chats/' + conversationId));
    
      set(newMessageRef, {
        fileUrl,
        fileName,
        createdAt: new Date().toISOString(),
        userId: currentUserId,
        userName: currentUserName,
        userAvatar: currentUserAvatar,
        seen: false,
      });
    };
    


  return (

    <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : 10}
    keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top -10 : 0} // Adjust for header height on iOS
  >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>

    
          <View style={{ flex: 1 }}>
            <View style={styles.header}>
              <Image source={{ uri: otherUserAvatar }} style={styles.headerAvatar} />
              <Text style={styles.username}>{otherUserName}</Text>
            </View>

    
      
            <GiftedChat
          
              messages={messages}
              onSend={(messages) => onSend(messages)}
              user={{
                _id: currentUserId,
                name: currentUserName,
                avatar: currentUserAvatar,
              }}
              
              renderAvatar={renderAvatar} // Custom avatar rendering
              renderBubble={renderBubble} // msgt eli al imen wel issar
              alwaysShowSend
              scrollToBottom
              scrollToBottomComponent={scrollToBottomComponent}
              //renderInputToolbar={renderInputToolbar} // Custom InputToolbar
              inverted={false} // Newer messages at the bottom
              bottomOffset={insets.bottom}
              wrapInSafeArea={false}
            />
      
          </View>
          </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  fileIcon: {
    width: 24,
    height: 24,
  },
  fileButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  inputToolbarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  header: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});
