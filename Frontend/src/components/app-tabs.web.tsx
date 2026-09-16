import { BlurView } from 'expo-blur';
import { usePathname } from 'expo-router';
import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps, type TabListProps } from 'expo-router/ui';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AcademicIcon, type AcademicIconName } from './ui/academic-ui';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useAuth } from '@/context/auth';
import { useAppTheme } from '@/context/theme';
import { BrandColors, MaxContentWidth, Spacing } from '@/constants/theme';

type SymbolName = AcademicIconName;

export default function AppTabs() {
  const { profile } = useAuth();
  const role = profile?.role ?? 'student';
  const isStudent = role === 'student';
  const isFaculty = role === 'faculty';
  const isStaff = role === 'staff';
  const isSuperAdmin = role === 'super_admin';

  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton icon={{ ios: 'house', android: 'home', web: 'home' }}>
              {isStudent ? 'Home' : isFaculty ? 'Dashboard' : isStaff ? 'Operations' : 'Overview'}
            </TabButton>
          </TabTrigger>
          {(isStaff || isSuperAdmin) && (
            <TabTrigger name="admin" href="/admin" asChild>
              <TabButton icon={{ ios: 'briefcase', android: 'work', web: 'work' }}>
                Management
              </TabButton>
            </TabTrigger>
          )}
          {isSuperAdmin && (
            <TabTrigger name="analytics" href="/analytics" asChild>
              <TabButton icon={{ ios: 'chart.bar.xaxis', android: 'analytics', web: 'analytics' }}>
                Analytics
              </TabButton>
            </TabTrigger>
          )}
          {isStudent && (
            <TabTrigger name="tickets" href="/tickets" asChild>
              <TabButton icon={{ ios: 'doc.text', android: 'assignment', web: 'assignment' }}>
                Requests
              </TabButton>
            </TabTrigger>
          )}
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton icon={{ ios: 'bell', android: 'notifications', web: 'notifications' }}>Updates</TabButton>
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton icon={{ ios: 'person', android: 'person', web: 'person' }}>Profile</TabButton>
          </TabTrigger>
          <TabTrigger name="chatbot" href="/chatbot" asChild>
            <View style={styles.hiddenTab} />
          </TabTrigger>
          <TabTrigger name="faq" href="/faq" asChild>
            <View style={styles.hiddenTab} />
          </TabTrigger>
          {isStudent ? (
            <TabTrigger name="documents" href="/documents" asChild>
              <View style={styles.hiddenTab} />
            </TabTrigger>
          ) : null}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  children,
  isFocused,
  icon,
  ...props
}: TabTriggerSlotProps & {
  icon: SymbolName;
}) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 720;
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={[styles.tabButtonView, compact && styles.tabButtonCompact]}>
        <AcademicIcon
          name={icon}
          size={17}
          color={isFocused ? BrandColors.primary : colors.textSecondary}
        />
        {!compact ? (
          <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
            {children}
          </ThemedText>
        ) : null}
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const { resolvedTheme } = useAppTheme();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const fullScreen = pathname === '/chatbot' || pathname === '/faq';
  return (
    <View nativeID="app-tab-bar" {...props} style={[styles.tabListContainer, fullScreen && styles.tabListHidden]}>
      <BlurView
        intensity={resolvedTheme === 'dark' ? 46 : 72}
        tint={resolvedTheme === 'dark' ? 'dark' : 'light'}
        style={styles.innerContainer}>
        {width >= 980 ? <View style={styles.brand}>
          <View style={styles.brandMark}>
            <AcademicIcon
              name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
              color="#FFFFFF"
              size={15}
            />
          </View>
          <ThemedText type="smallBold" style={styles.brandText}>CAS Assist</ThemedText>
        </View> : null}
        {props.children}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 0,           // pin to bottom — was floating at top and blocking all content clicks
    width: '100%',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    pointerEvents: 'box-none', // transparent gap between buttons passes clicks through
  },
  innerContainer: {
    minHeight: 64,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 24,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: 6,
    maxWidth: MaxContentWidth,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.82)',
    boxShadow: '0 18px 54px rgba(20, 52, 49, 0.16)',
    overflow: 'hidden',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9, marginRight: 'auto', paddingRight: 12 },
  brandMark: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: BrandColors.primary },
  brandText: { letterSpacing: -0.15 },
  hiddenTab: { display: 'none' },
  tabListHidden: { display: 'none' },
  pressed: { opacity: 0.84, transform: [{ scale: 0.97 }] },
  tabButtonView: {
    minHeight: 40,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 13,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabButtonCompact: {
    width: 46,
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
});
