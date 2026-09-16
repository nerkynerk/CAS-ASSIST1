import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import RoleGuard from '@/components/role-guard';
import {
  Academic,
  AcademicIcon,
  AppBackdrop,
  EmptyState,
  IconButton,
  StatusBadge,
  SurfaceCard,
  formatCategory,
} from '@/components/ui/academic-ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface FaqArticle {
  id: string;
  title: string;
  category: string;
  answer: string;
  keywords: string[];
}

function FaqContent() {
  const router = useRouter();
  const [articles, setArticles] = useState<FaqArticle[]>([]);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error: queryError } = await supabase
      .from('tier1_knowledge_articles')
      .select('id, title, category, answer, keywords')
      .eq('state', 'active')
      .order('category')
      .order('title');
    if (queryError) setError(queryError.message);
    else setArticles(data ?? []);
  }, []);

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return articles;
    return articles.filter(article => [article.title, article.answer, article.category, ...article.keywords]
      .some(value => value.toLowerCase().includes(query)));
  }, [articles, search]);

  return (
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
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Frequently Asked Questions</Text>
          <Text style={styles.subtitle}>Approved answers used by the AI Helpdesk</Text>
        </View>
        <StatusBadge label={`${articles.length} answers`} tone="success" />
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Academic.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <View style={styles.searchBox}>
            <AcademicIcon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} color={Academic.textSecondary} size={19} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search questions and answers"
              placeholderTextColor={Academic.textSecondary}
              returnKeyType="search"
              autoCorrect={false}
            />
          </View>

          <View style={styles.scopeNotice}>
            <AcademicIcon name={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }} color={Academic.success} size={18} />
            <Text style={styles.scopeText}>These answers cover CAS Assist workflows. Official fees, requirements, deadlines, and decisions must come from an approved institutional source.</Text>
          </View>

          {loading ? (
            <ActivityIndicator color={Academic.primary} style={styles.loader} />
          ) : error ? (
            <EmptyState title="FAQs unavailable" message={error} icon={{ ios: 'exclamationmark.triangle', android: 'priority_high', web: 'priority_high' }} />
          ) : visible.length === 0 ? (
            <EmptyState title="No matching FAQ" message="Try a broader word such as advising, documents, schedules, or account." icon={{ ios: 'questionmark.circle', android: 'info', web: 'info' }} />
          ) : visible.map(article => {
            const open = expanded === article.id;
            return (
              <Animated.View key={article.id} layout={LinearTransition.duration(180).reduceMotion(ReduceMotion.System)}>
                <Pressable onPress={() => setExpanded(open ? null : article.id)} accessibilityRole="button" accessibilityState={{ expanded: open }}>
                  <SurfaceCard style={styles.faqCard} accent={open ? 'blue' : undefined}>
                    <View style={styles.questionRow}>
                      <View style={styles.questionCopy}>
                        <StatusBadge label={formatCategory(article.category)} tone="blue" />
                        <Text selectable style={styles.question}>{article.title}</Text>
                      </View>
                      <AcademicIcon
                        name={{ ios: open ? 'chevron.up' : 'chevron.down', android: open ? 'keyboard_arrow_up' : 'keyboard_arrow_down', web: open ? 'keyboard_arrow_up' : 'keyboard_arrow_down' }}
                        color={Academic.primary}
                        size={20}
                      />
                    </View>
                    {open ? (
                      <Animated.View entering={FadeIn.duration(160).reduceMotion(ReduceMotion.System)} style={styles.answerBox}>
                        <Text selectable style={styles.answer}>{article.answer}</Text>
                      </Animated.View>
                    ) : null}
                  </SurfaceCard>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function FaqScreen() {
  return (
    <RoleGuard allowed={['student', 'faculty', 'staff', 'super_admin']}>
      <FaqContent />
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Academic.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: 12 },
  headerCopy: { flex: 1, gap: 2 },
  title: { color: Academic.navy, fontSize: 20, fontWeight: '900' },
  subtitle: { color: Academic.textSecondary, fontSize: 12, fontWeight: '700' },
  scroll: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
  searchBox: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderRadius: 16, backgroundColor: Academic.card, borderWidth: 1, borderColor: Academic.border },
  searchInput: { flex: 1, minHeight: 48, color: Academic.navy, fontSize: 14 },
  scopeNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, borderRadius: 15, backgroundColor: Academic.successBg },
  scopeText: { flex: 1, color: Academic.navy, fontSize: 12, lineHeight: 18 },
  loader: { paddingVertical: Spacing.five },
  faqCard: { gap: Spacing.three },
  questionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  questionCopy: { flex: 1, alignItems: 'flex-start', gap: 8 },
  question: { color: Academic.navy, fontSize: 15, lineHeight: 21, fontWeight: '900' },
  answerBox: { paddingTop: Spacing.three, borderTopWidth: 1, borderTopColor: Academic.border },
  answer: { color: Academic.textSecondary, fontSize: 14, lineHeight: 21 },
});
