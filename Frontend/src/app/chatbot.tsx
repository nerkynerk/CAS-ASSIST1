import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { Academic, AcademicIcon, AppBackdrop, IconButton, StatusBadge } from '@/components/ui/academic-ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import RoleGuard from '@/components/role-guard';
import { apiPost } from '@/lib/api';
import { supabase } from '@/lib/supabase';

type MessageRole = 'user' | 'assistant' | 'system';

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  isDeflected?: boolean;
  ticketId?: string;
  queryId?: string;
  sourceTitle?: string;
  confidence?: number;
  feedback?: 'helpful' | 'not_helpful';
}

interface AIQueryResponse {
  queryId: string;
  isDeflected: boolean;
  answer: string;
  confidence: number;
  category: string;
  source: { title: string; type: 'tier1' } | null;
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'system',
  content:
    'Hi! I am the CAS Assist closed-domain AI Helpdesk. I answer recurring Tier-1 questions using approved CAS Assist information only.',
};

const SUGGESTIONS: Record<string, string[]> = {
  student: ['How do I request advising?', 'How can I track my request?', 'How do I request a document?'],
  faculty: ['How do I record a room change?', 'Where can I view my schedule?', 'How do I change the theme?'],
  staff: ['How do I publish an announcement?', 'What do request statuses mean?', 'What can the AI Helpdesk answer?'],
  super_admin: ['What does System Analytics show?', 'How do I publish an announcement?', 'What can the AI Helpdesk answer?'],
};

function MessageBubble({ message, onFeedback }: { message: Message; onFeedback: (message: Message, helpful: boolean) => void }) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
      {!isUser ? (
        <View style={styles.botAvatar}>
          <AcademicIcon
            name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
            color={Academic.primary}
            size={18}
          />
        </View>
      ) : null}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.messageText, isUser && styles.userMessageText]}>{message.content}</Text>
        {!isUser && message.sourceTitle ? (
          <View style={styles.sourceRow}>
            <AcademicIcon name={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }} color={Academic.success} size={14} />
            <Text style={styles.sourceText} numberOfLines={2}>
              {message.sourceTitle} · {Math.round((message.confidence ?? 0) * 100)}% match
            </Text>
          </View>
        ) : null}
        {!isUser && message.queryId ? (
          <View style={styles.feedbackRow}>
            {message.feedback ? (
              <Text style={styles.feedbackThanks}>Feedback recorded</Text>
            ) : (
              <>
                <Text style={styles.feedbackPrompt}>Was this helpful?</Text>
                <Pressable onPress={() => onFeedback(message, true)} style={styles.feedbackButton}>
                  <Text style={styles.feedbackButtonText}>Yes</Text>
                </Pressable>
                <Pressable onPress={() => onFeedback(message, false)} style={styles.feedbackButton}>
                  <Text style={styles.feedbackButtonText}>No</Text>
                </Pressable>
              </>
            )}
          </View>
        ) : null}
        {message.ticketId ? (
          <View style={styles.ticketNotice}>
            <Text style={styles.ticketNoticeText}>Ticket created. CAS staff will follow up shortly.</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ChatbotScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const nextMessageId = useRef(0);
  const suggestions = SUGGESTIONS[profile?.role ?? 'student'] ?? SUGGESTIONS.student;

  function addMessage(msg: Omit<Message, 'id'>) {
    nextMessageId.current += 1;
    const newMsg: Message = { ...msg, id: `message-${nextMessageId.current}` };
    setMessages(prev => {
      const next = [...prev, newMsg];
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      return next;
    });
    return newMsg;
  }

  async function sendText(rawText: string) {
    const text = rawText.trim();
    if (!text || sending) return;

    setInput('');
    addMessage({ role: 'user', content: text });
    setSending(true);

    try {
      let res: AIQueryResponse;
      try {
        res = await apiPost<AIQueryResponse>('/api/ai/query', {
          query: text,
          category: 'general_inquiry',
        });
      } catch {
        const fallback = await supabase.rpc('answer_tier1_question', { p_query: text });
        if (fallback.error) throw fallback.error;
        res = fallback.data as AIQueryResponse;
      }

      addMessage({
        role: 'assistant',
        content: res.answer,
        isDeflected: res.isDeflected,
        queryId: res.queryId,
        sourceTitle: res.source?.title,
        confidence: res.confidence,
      });
    } catch {
      addMessage({
        role: 'assistant',
        content:
          'Sorry, I cannot connect right now. Please coordinate with the CAS office directly or try again later.',
      });
    } finally {
      setSending(false);
    }
  }

  async function sendFeedback(message: Message, helpful: boolean) {
    if (!message.queryId || message.feedback) return;
    try {
      try {
        await apiPost('/api/ai/feedback', { queryId: message.queryId, resolved: helpful });
      } catch {
        const fallback = await supabase.rpc('record_tier1_feedback', {
          p_query_id: message.queryId,
          p_resolved: helpful,
        });
        if (fallback.error) throw fallback.error;
      }
      setMessages(current => current.map(item => item.id === message.id
        ? { ...item, feedback: helpful ? 'helpful' : 'not_helpful' }
        : item));
    } catch {
      // The answer remains usable even if feedback delivery fails.
    }
  }

  return (
    <Animated.View entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)} style={styles.flex}>
    <SafeAreaView style={styles.safe}>
      <AppBackdrop />
      <View style={styles.header}>
        <IconButton
          icon={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
          onPress={() => router.back()}
          label="Go back"
          bg={Academic.muted}
          color={Academic.textSecondary}
        />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>CAS Assist Helpdesk</Text>
          <Text style={styles.headerSub}>Closed-domain Tier-1 assistant</Text>
        </View>
        <Pressable onPress={() => router.push('/faq')} style={styles.faqButton} accessibilityRole="button">
          <AcademicIcon name={{ ios: 'questionmark.circle', android: 'info', web: 'info' }} color={Academic.primary} size={18} />
          <Text style={styles.faqButtonText}>FAQs</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <FlatList
          ref={listRef}
          data={messages}
          contentInsetAdjustmentBehavior="automatic"
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={
            <>
              <View style={styles.noticeBanner}>
                <AcademicIcon
                  name={{ ios: 'info.circle', android: 'info', web: 'info' }}
                  color={Academic.primary}
                  size={18}
                />
                <Text style={styles.noticeText}>
                  Answers come only from approved CAS Assist articles. The assistant will defer when confidence is low.
                </Text>
              </View>
              {messages.length === 1 ? (
                <View style={styles.suggestions}>
                  {suggestions.map(text => (
                    <Pressable
                      key={text}
                      onPress={() => sendText(text)}
                      style={({ pressed }) => [styles.suggestionChip, pressed && styles.pressed]}>
                      <Text style={styles.suggestionText}>{text}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </>
          }
          renderItem={({ item }) => <MessageBubble message={item} onFeedback={sendFeedback} />}
          ListFooterComponent={
            sending ? (
              <View style={styles.typingRow}>
                <View style={styles.botAvatar}>
                  <AcademicIcon
                    name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
                    color={Academic.primary}
                    size={18}
                  />
                </View>
                <View style={styles.typingBubble}>
                  <ActivityIndicator size="small" color={Academic.primary} />
                  <StatusBadge label="Thinking" tone="blue" />
                </View>
              </View>
            ) : null
          }
        />

        <View style={[styles.composer, { paddingBottom: Math.max(12, insets.bottom) }]}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            placeholderTextColor={Academic.textSecondary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={400}
            returnKeyType="send"
            onSubmitEditing={() => sendText(input)}
            editable={!sending}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              (!input.trim() || sending || pressed) && styles.sendButtonMuted,
            ]}
            onPress={() => sendText(input)}
            disabled={sending || !input.trim()}>
            <AcademicIcon
              name={{ ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }}
              color="#FFFFFF"
              size={20}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </Animated.View>
  );
}

export default function ChatbotScreen() {
  return (
    <RoleGuard allowed={['student', 'faculty', 'staff', 'super_admin']}>
      <ChatbotScreenContent />
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Academic.background },
  flex: { flex: 1 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  header: {
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: 12,
  },
  headerText: { flex: 1, gap: 2 },
  headerTitle: { color: Academic.navy, fontSize: 19, fontWeight: '700', letterSpacing: -0.25 },
  headerSub: { color: Academic.textSecondary, fontSize: 13, fontWeight: '700' },
  faqButton: { minHeight: 40, paddingHorizontal: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Academic.softBlue },
  faqButtonText: { color: Academic.primary, fontSize: 12, fontWeight: '700' },
  messageList: {
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    gap: 14,
  },
  noticeBanner: {
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: Academic.softBlue,
  },
  noticeText: { color: Academic.navy, fontSize: 13, lineHeight: 18, flex: 1 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  suggestionChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
  },
  suggestionText: { color: Academic.primary, fontSize: 13, fontWeight: '800' },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
  messageRowUser: { flexDirection: 'row-reverse' },
  botAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.softBlue,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
  },
  assistantBubble: {
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
    borderBottomLeftRadius: 5,
  },
  userBubble: {
    backgroundColor: Academic.primary,
    borderBottomRightRadius: 5,
  },
  messageText: { color: Academic.navy, fontSize: 14, lineHeight: 20 },
  userMessageText: { color: '#FFFFFF' },
  ticketNotice: { borderRadius: 10, padding: 8, backgroundColor: Academic.warningBg },
  ticketNoticeText: { color: Academic.warningText, fontSize: 12, fontWeight: '800' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 2 },
  sourceText: { flex: 1, color: Academic.success, fontSize: 11, lineHeight: 15, fontWeight: '800' },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingTop: 3 },
  feedbackPrompt: { color: Academic.textSecondary, fontSize: 11, fontWeight: '700' },
  feedbackButton: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: Academic.softBlue },
  feedbackButtonText: { color: Academic.primary, fontSize: 11, fontWeight: '900' },
  feedbackThanks: { color: Academic.success, fontSize: 11, fontWeight: '800' },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
  },
  composer: {
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: Spacing.three,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: Academic.card,
    borderTopWidth: 1,
    borderTopColor: Academic.border,
  },
  input: {
    flex: 1,
    maxHeight: 104,
    minHeight: 46,
    borderRadius: 23,
    paddingHorizontal: 16,
    paddingVertical: 11,
    color: Academic.navy,
    backgroundColor: Academic.muted,
    fontSize: 15,
    lineHeight: 20,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.primary,
  },
  sendButtonMuted: { opacity: 0.5 },
});
