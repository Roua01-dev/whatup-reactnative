import React, { useState, useEffect, useRef } from "react";
import {
  FlatList,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Linking,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as Location from "expo-location"; // Importer expo-location
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import {
  getDatabase,
  ref as dbRef,
  push,
  set,
  onValue,
} from "firebase/database";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { get } from "firebase/database";
import { decode } from "base64-arraybuffer";
import { supabase } from "../Config/index1";

const ChatGroup = ({ userId }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null); // État pour gérer le fichier sélectionné
  const [containerFlex, setContainerFlex] = useState(1);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const [currentUser, setCurrentUser] = useState({
    uid: userId,
    displayName: "",
  });


  const conversationId = "globalGroupChat"; // Identifiant unique pour le chat de groupe global

  






  useFocusEffect(
    React.useCallback(() => {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }, [])
  );

  const setupGroupChat = async () => {
    const db = getDatabase();
    const groupChatRef = dbRef(db, `GroupChat/${conversationId}/`);

    try {
      const snapshot = await get(groupChatRef); // Vérifie si le nœud existe
      if (!snapshot.exists()) {
        console.log("[GroupChat] Initialisation de la table GroupChat");
        await set(groupChatRef, {}); // Crée une table vide
      } else {
        console.log("[GroupChat] La table existe déjà");
      }
    } catch (error) {
      console.error("[GroupChat] Erreur lors de l’initialisation :", error);
    }
  };

  useEffect(() => {
    const setupGroupChat = async () => {
      const db = getDatabase();

      const groupChatRef = dbRef(db, "GroupChat/");
    };

    const fetchUserDetails = async () => {
      if (!userId) {
        console.error("`userId` is missing.");
        return;
      }

      const db = getDatabase();
      const userRef = dbRef(db, `profiles/${userId}`);

      try {
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setCurrentUser({
            uid: userId,
            displayName: userData.pseudo || "User", // Utilisez 'pseudo' ou une valeur par défaut
            photoURL:
              userData.profileImage || "https://placeimg.com/140/140/any", // Optionnel
          });
        } else {
          console.error(
            `[ChatGroup] Aucun profil trouvé pour l'utilisateur ${userId}`
          );
        }
      } catch (error) {
        console.error(
          "[ChatGroup] Erreur lors de la récupération des informations utilisateur :",
          error
        ); }
    };

    const keyboardDidShow = Keyboard.addListener("keyboardDidShow", () =>
      setContainerFlex(0.67)
    );
    const keyboardDidHide = Keyboard.addListener("keyboardDidHide", () =>
      setContainerFlex(1)
    );

    setupGroupChat();
    fetchUserDetails();

    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, [userId]);

  // Fetch and listen for messages
  useEffect(() => {
    const db = getDatabase();
    const messagesRef = dbRef(db, `GroupChat/${conversationId}/messages`);

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const messagesData = Object.entries(snapshot.val()).map(
          ([id, message]) => ({
            id,
            ...message,
          })
        );
        setMessages(messagesData);
      } else {
        setMessages([]);
      }
    });
    return () => unsubscribe(); // Cleanup listener
  }, []);

  const sendMessageToGroupChat = async ({ text, file, location }) => {
    const db = getDatabase(); // Utiliser Firebase pour les métadonnées
    const groupChatRef = dbRef(db, `GroupChat/${conversationId}/messages`);
    const newMessageRef = push(groupChatRef);
  
    let fileUrl = null;
  
    try {
      // Gestion des fichiers avec Supabase
      if (file) {
        if (!file.uri) {
          throw new Error("File URI is missing or invalid.");
        }
  
        console.log(`[GroupChat] File details:`, file);
  
        const fileName = `${Date.now()}_${file.name}`;
        const filePath = `GroupChatFiles/${fileName}`;
  
        // Lire le fichier en tant que chaîne base64
        const base64Data = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
  
        // Convertir base64 en ArrayBuffer
        const arrayBuffer = decode(base64Data);
  
        // Télécharger sur Supabase
        const { data, error } = await supabase.storage
          .from("projetProfilFile")
          .upload(filePath, arrayBuffer, {
            contentType: file.type || "application/octet-stream",
            upsert: true,
          });
  
        if (error) {
          console.error("[GroupChat] Supabase upload error:", error.message);
          throw new Error("Failed to upload file to Supabase.");
        }
  
        fileUrl = `${supabase.storageUrl}/object/public/projetProfilFile/${filePath}`;
        console.log(`[GroupChat] File uploaded to Supabase: ${fileUrl}`);
      }
  
      // Créer l'objet message
      const newMessage = {
        userId: currentUser.uid,
        sender: {
          userName: currentUser.displayName, // Inclure le nom de l'utilisateur
          userId: currentUser.uid,
        },
        content: {
          text: text || null,
          fileName: file?.name || null,
          fileUrl: fileUrl || null,
          location: location || null,
        },
        createdAt: new Date().toISOString(),
      };
  
      // Sauvegarder le message dans Firebase
      await set(newMessageRef, newMessage);
  
      console.log("[GroupChat] Message sent successfully");
    } catch (error) {
      console.error("[GroupChat] Error sending message:", error.message);
    }
  };
  

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const sendMessage = () => {
    if (inputMessage.trim() || selectedFile) {
      sendMessageToGroupChat({
        text: inputMessage.trim(),
        file: selectedFile,
        location: null,
      });
      setInputMessage("");
      setSelectedFile(null);
      scrollToBottom();
    }
  };

  const openFile = async (uri) => {
    try {
      console.log(`[openFile] Tentative d'ouverture du fichier : ${uri}`);

      // Téléchargez le fichier dans un emplacement temporaire local
      const localUri = `${FileSystem.cacheDirectory}${uri.split("/").pop()}`;
      await FileSystem.downloadAsync(uri, localUri);

      console.log(`[openFile] Fichier téléchargé localement : ${localUri}`);

      // Vérifiez si le partage est pris en charge et ouvrez le fichier
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri);
      } else {
        console.log("[openFile] Partage non pris en charge sur cet appareil.");
      }
    } catch (error) {
      console.error(
        "[openFile] Erreur lors de l’ouverture du fichier :",
        error
      );
    }
  };

  const handleLocationShare = async () => {
    try {
      console.log("[handleLocationShare] Requesting location...");
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        console.log("[handleLocationShare] Permission denied.");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      console.log("[handleLocationShare] Location:", location);

      const googleMapsUrl = `https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`;

      sendMessageToGroupChat({
        text: "Shared location",
        file: null,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          link: googleMapsUrl,
        },
      });

      //setMessages((prevMessages) => [...prevMessages, newMessage]);
      scrollToBottom();
    } catch (error) {
      console.error("[handleLocationShare] Error:", error);
    }
  };

  const handleFilePick = async () => {
    try {
      console.log("[handleFilePick] Ouverture du sélecteur de fichiers...");
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*", // Permet de sélectionner tous types de fichiers
      });

      console.log("[handleFilePick] Résultat brut :", result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0]; // Extraire le premier fichier sélectionné
        console.log("[handleFilePick] Fichier sélectionné :", file);
        setSelectedFile(file); // Stocker le fichier sélectionné
      } else if (result.canceled) {
        console.log("[handleFilePick] Sélection annulée.");
      } else {
        console.log("[handleFilePick] Aucun fichier trouvé dans les assets.");
      }
    } catch (error) {
      console.error("[handleFilePick] Erreur :", error);
    }
  };

  const renderItem = ({ item, index }) => {
    const isMyMessage = item.userId === currentUser.uid;
    const content = item.content || {};
  
    // Obtenir la date actuelle et précédente
    const currentMessageDate = new Date(item.createdAt).toDateString();
    const previousMessageDate =
      index > 0 ? new Date(messages[index - 1].createdAt).toDateString() : null;
  
    const showDateSeparator = currentMessageDate !== previousMessageDate;
  
    const openMap = (locationLink) => {
      try {
        Linking.openURL(locationLink);
      } catch (error) {
        console.error("[ChatGroup] Error opening map:", error);
      }
    };
  
    return (
      <>
        {/* Afficher un séparateur de date si nécessaire */}
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>
              {new Date(item.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </View>
        )}
  
        <View
          style={[
            styles.messageContainer,
            isMyMessage ? styles.myMessage : styles.otherMessage,
          ]}
        >
          {/* Affichage du nom et de l'image pour les autres utilisateurs */}
          {!isMyMessage && (
            <View style={styles.senderContainer}>
              {item.sender?.photoURL && (
                <Image
                  source={{ uri: item.sender.photoURL }}
                  style={styles.profileImage}
                />
              )}
              <Text style={styles.senderName}>
                {item.sender?.userName || "Utilisateur"}
              </Text>
            </View>
          )}
  
          {/* Affichage du contenu du message */}
          {content.fileUrl ? (
            <TouchableOpacity onPress={() => Linking.openURL(content.fileUrl)}>
              <Text style={styles.messageText}>
                📄 {content.fileName || content.fileUrl.split("/").pop()}
              </Text>
            </TouchableOpacity>
          ) : content.location ? (
            <TouchableOpacity onPress={() => openMap(content.location.link)}>
              <Text style={styles.messageText}>
                📍 Voir Ma position sur la carte
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.messageText}>{content.text}</Text>
          )}
          <Text style={styles.messageTime}>
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </>
    );
  };
  

  return (
    <KeyboardAvoidingView
      style={{ flex: containerFlex }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={scrollToBottom}
        />

        {/* Zone de prévisualisation du fichier */}
        {selectedFile && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewText}>📄 {selectedFile.name}</Text>
            <TouchableOpacity onPress={() => setSelectedFile(null)}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Zone de saisie de message */}
        <View style={styles.inputContainer}>
          <TouchableOpacity onPress={handleFilePick}>
            <Image
              source={require("../assets/sendfile.png")}
              style={styles.fileIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLocationShare}>
            <Image
              source={require("../assets/sendlocation.png")}
              style={styles.fileIcon}
            />
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={styles.textInput}
            placeholder="Tapez un message..."
            value={inputMessage}
            onChangeText={setInputMessage}
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
            <Text style={styles.sendButtonText}>Envoyer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f4f8",
  },
  messagesList: {
    padding: 10,
  },
  dateSeparator: {
    alignItems: "center",
    marginVertical: 5,
  },
  dateText: {
    fontSize: 14,
    color: "#555",
    fontWeight: "bold",
    backgroundColor: "#e5e5ea",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  messageContainer: {
    marginVertical: 5,
    maxWidth: "80%",
    padding: 10,
    borderRadius: 10,
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor:"rgb(108, 171, 241)",
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor:"rgb(221, 214, 214)",
  },
  messageText: {
    color: "#000000",
    fontSize: 16,
    
  },
  messageTime: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.8)",
    textAlign: "right",
  },
  senderName: {
    fontSize: 14,
    color: "#555",
    fontWeight: "bold",
    marginBottom: 3,
  },
  previewContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    backgroundColor: "#f9f9f9",
  },
  previewText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    
  },
  cancelText: {
    color: "red",
    marginLeft: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    backgroundColor: "#fff",
  },
  textInput: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    marginHorizontal: 10,
    backgroundColor: "#f9f9f9",
  },
  fileIcon: {
    width: 24,
    height: 24,
    marginHorizontal: 10,
  },
  sendButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#0078fe",
    borderRadius: 20,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
  },

  senderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  senderName: {
    fontSize: 14,
    color: "#555",
    fontWeight: "bold",
  },
  
});

export default ChatGroup;
