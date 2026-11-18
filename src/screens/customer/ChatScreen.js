import React, { useState } from 'react';
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
} from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import Header from '../../components/common/Header';

const QUICK_QUESTIONS = [
  'Where is the boat stationed right now?',
  'Are life jackets available for children?',
  'Will we stop near Dashashwamedh for Ganga Aarti?',
];

export default function ChatScreen({ navigation, route }) {
  const { bookingId } = route.params || {};
  const { isDark } = useTheme();

  const [messages, setMessages] = useState([
    {
      id: '1',
      sender: 'captain',
      text: 'Namaste! I am Rameshwar, captain of Maa Ganga Express Bajra. We look forward to welcoming you at Assi Ghat.',
      time: '04:15 PM',
    },
    {
      id: '2',
      sender: 'user',
      text: 'Namaste Captain ji! We will arrive 15 minutes before the 05:45 PM slot.',
      time: '04:18 PM',
    },
    {
      id: '3',
      sender: 'captain',
      text: 'Perfect! The boat is stationed right by the main stone steps near the Ganga Aarti platform. Life jackets are ready onboard.',
      time: '04:20 PM',
    },
  ]);
  const [inputText, setInputText] = useState('');

  const handleSend = (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const newMsg = {
      id: String(Date.now()),
      sender: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    if (!textToSend) setInputText('');

    // Simulated Captain Auto-Reply
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'captain',
          text: 'Dhanyawad! Noted with thanks. See you soon at the ghat.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 1200);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDark && styles.containerDark]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="Chat with Boat Captain"
        subtitle="Rameshwar Majhi • Verified Navik"
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isUser = item.sender === 'user';
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
                    styles.bubbleText,
                    isUser ? styles.bubbleTextUser : styles.bubbleTextCaptain,
                  ]}
                >
                  {item.text}
                </Text>
                <Text
                  style={[
                    styles.bubbleTime,
                    isUser ? styles.bubbleTimeUser : styles.bubbleTimeCaptain,
                  ]}
                >
                  {item.time}
                </Text>
              </View>
            </View>
          );
        }}
      />

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
  bubbleText: {
    ...typography.body,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: colors.white,
  },
  bubbleTextCaptain: {
    color: colors.ink,
  },
  bubbleTime: {
    ...typography.caption,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  bubbleTimeUser: {
    color: 'rgba(255,255,255,0.7)',
  },
  bubbleTimeCaptain: {
    color: colors.gray400,
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
