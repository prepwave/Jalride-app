import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Header from '../../components/common/Header';

const QUICK_QUESTIONS = [
  'Where is the boat stationed right now?',
  'Are life jackets available for children?',
  'What is the best boarding landmark on the ghat?',
];

export default function ChatScreen({ navigation, route }) {
  const { bookingId, captainName } = route.params || {};
  const { isDark } = useTheme();
  const { user } = useAuth();

  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function initChat() {
      if (!bookingId) {
        setLoading(false);
        return;
      }
      try {
        const convRes = await api.getChatConversation(bookingId);
        const conv = convRes?.conversation || convRes;
        if (conv?._id && isMounted) {
          setConversationId(conv._id);
          const msgs = await api.getChatMessages(conv._id);
          if (isMounted) setMessages(msgs || []);
        }
      } catch (err) {
        console.warn('[JalRide Chat] Conversation init error:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    initChat();
    return () => {
      isMounted = false;
    };
  }, [bookingId]);

  const handleSend = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    const optimisticMsg = {
      _id: String(Date.now()),
      sender: user?._id || 'user',
      text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    if (!textToSend) setInputText('');

    if (conversationId) {
      setIsSending(true);
      try {
        await api.sendChatMessage(conversationId, text);
      } catch (err) {
        console.warn('[JalRide Chat] Send error:', err.message);
      } finally {
        setIsSending(false);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDark && styles.containerDark]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="Chat with Boat Captain"
        subtitle={captainName ? `${captainName} • Verified Operator` : 'Direct Fleet & Ghat Dispatch'}
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="small" color={colors.teal} />
          <Text style={styles.loadingText}>Connecting to operator dispatch...</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item, index) => item._id || item.id || String(index)}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isUser = item.sender === user?._id || item.sender === 'user' || item.isCustomer;
            const timeStr = item.time || (item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

            return (
              <View
                style={[
                  styles.bubbleWrapper,
                  isUser ? styles.bubbleUserWrapper : styles.bubbleCaptainWrapper,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    isUser ? styles.bubbleUser : styles.bubbleCaptain,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isUser ? styles.messageUserText : styles.messageCaptainText,
                    ]}
                  >
                    {item.text || item.message || item.body}
                  </Text>
                  {timeStr ? (
                    <Text
                      style={[
                        styles.messageTime,
                        isUser ? styles.messageUserTime : styles.messageCaptainTime,
                      ]}
                    >
                      {timeStr}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>💬</Text>
              <Text style={{ ...typography.bodyMedium, color: colors.gray500, textAlign: 'center' }}>
                No messages yet.
              </Text>
              <Text style={{ ...typography.caption, color: colors.gray400, textAlign: 'center', marginTop: 4 }}>
                Ask your captain about boarding directions, ghat steps, or life vests.
              </Text>
            </View>
          }
        />
      )}

      {/* Quick Questions Chips */}
      <View style={styles.quickQuestionsRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={QUICK_QUESTIONS}
          keyExtractor={(item, idx) => String(idx)}
          contentContainerStyle={{ paddingHorizontal: spacing.l, gap: spacing.s }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => handleSend(item)}
            >
              <Text style={styles.quickChipText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Input Bar */}
      <View style={[styles.inputBar, isDark && styles.inputBarDark]}>
        <TextInput
          style={[styles.chatInput, isDark && styles.chatInputDark]}
          placeholder="Message captain..."
          placeholderTextColor={colors.gray400}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />

        <TouchableOpacity
          style={styles.sendBtn}
          onPress={() => handleSend()}
          activeOpacity={0.8}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  containerDark: {
    backgroundColor: '#0a1e23',
  },
  messageList: {
    padding: spacing.l,
    gap: spacing.m,
  },
  bubbleWrapper: {
    flexDirection: 'row',
  },
  bubbleUserWrapper: {
    justifyContent: 'flex-end',
  },
  bubbleCaptainWrapper: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    padding: spacing.m,
    borderRadius: radii.m,
  },
  bubbleUser: {
    backgroundColor: colors.teal,
    borderBottomRightRadius: 2,
  },
  bubbleCaptain: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  messageText: {
    ...typography.body,
    lineHeight: 20,
  },
  messageUserText: {
    color: colors.white,
  },
  messageCaptainText: {
    color: colors.ink,
  },
  messageTime: {
    ...typography.caption,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  messageUserTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  messageCaptainTime: {
    color: colors.gray400,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 8,
  },
  quickQuestionsRow: {
    paddingVertical: spacing.s,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  quickChip: {
    backgroundColor: colors.gray100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  quickChipText: {
    ...typography.caption,
    color: colors.gray700,
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  inputBarDark: {
    backgroundColor: '#0a1e23',
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.gray100,
    borderRadius: radii.full,
    paddingHorizontal: spacing.l,
    paddingVertical: 10,
    maxHeight: 100,
    ...typography.body,
    color: colors.ink,
  },
  chatInputDark: {
    backgroundColor: '#12262b',
    color: '#eaf6f6',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.m,
  },
  sendIcon: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 2,
  },
});
