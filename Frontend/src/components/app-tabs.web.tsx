import { BlurView } from 'expo-blur';
import { Tabs, usePathname, useRouter, type Href } from 'expo-router';
import { createContext, useContext, useState, type Dispatch, type SetStateAction } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AcademicIcon, type AcademicIconName } from './ui/academic-ui';
import { ThemedText } from './themed-text';
import { useAuth } from '@/context/auth';
import { useAppTheme } from '@/context/theme';
import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';

const DESKTOP_SIDEBAR_WIDTH = 248;
const DESKTOP_SIDEBAR_COLLAPSED_WIDTH = 72;
const DESKTOP_CONTENT_GUTTER = 24;

type SidebarState = {
  collapsed: boolean;
  setCollapsed: Dispatch<SetStateAction<boolean>>;
};

type NavigationItem = {
  routeName: string;
  href: Href;
  label: string;
  icon: AcademicIconName;
};

type TabState = {
  index: number;
  routes: { key: string; name: string }[];
};

const SidebarStateContext = createContext<SidebarState>({
  collapsed: false,
  setCollapsed: () => undefined,
});

function getDesktopContentInset(collapsed: boolean) {
  return getDesktopSidebarInset(collapsed) + DESKTOP_CONTENT_GUTTER;
}

function getDesktopSidebarInset(collapsed: boolean) {
  return collapsed ? DESKTOP_SIDEBAR_COLLAPSED_WIDTH : DESKTOP_SIDEBAR_WIDTH;
}

export default function AppTabs() {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const desktop = width >= Layout.wideBreakpoint;
  const fullScreen = pathname === '/chatbot' || pathname === '/faq' || pathname.startsWith('/ticket/');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { profile } = useAuth();
  const role = profile?.role ?? 'student';
  const isStudent = role === 'student';
  const isFaculty = role === 'faculty';
  const isStaff = role === 'staff';
  const isSuperAdmin = role === 'super_admin';

  return (
    <SidebarStateContext.Provider value={{ collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed }}>
      <Tabs
        tabBar={({ state }) => <WorkspaceNavigation state={state} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: desktop && !fullScreen
            ? {
              paddingLeft: getDesktopContentInset(sidebarCollapsed),
              paddingRight: Spacing.three,
              paddingTop: 80,
            }
            : undefined,
        }}>
        <Tabs.Screen
          name="index"
          options={{ title: isStudent ? 'Home' : isFaculty ? 'Dashboard' : isStaff ? 'Operations' : 'Overview' }}
        />
        <Tabs.Protected guard={isStaff || isSuperAdmin}>
          <Tabs.Screen name="admin" options={{ title: 'Management' }} />
        </Tabs.Protected>
        <Tabs.Protected guard={isSuperAdmin}>
          <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
        </Tabs.Protected>
        <Tabs.Protected guard={isStudent}>
          <Tabs.Screen name="tickets" options={{ title: 'Requests' }} />
        </Tabs.Protected>
        <Tabs.Screen name="explore" options={{ title: 'Updates' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        <Tabs.Screen name="chatbot" options={{ href: null }} />
        <Tabs.Screen name="faq" options={{ href: null }} />
        <Tabs.Screen name="ticket/[id]" options={{ href: null }} />
        <Tabs.Protected guard={isStudent}>
          <Tabs.Screen name="documents" options={{ href: null }} />
        </Tabs.Protected>
      </Tabs>
    </SidebarStateContext.Provider>
  );
}

function WorkspaceNavigation({ state }: { state: TabState }) {
  const { colors, resolvedTheme } = useAppTheme();
  const { profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const desktop = width >= Layout.wideBreakpoint;
  const { collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed } = useContext(SidebarStateContext);
  const fullScreen = pathname === '/chatbot' || pathname === '/faq' || pathname.startsWith('/ticket/');
  const role = profile?.role ?? 'student';
  const isStudent = role === 'student';
  const isStaff = role === 'staff';
  const isSuperAdmin = role === 'super_admin';
  const roleLabel = role === 'super_admin' ? 'Super Admin' : role === 'staff' ? 'Staff workspace' : role === 'faculty' ? 'Faculty workspace' : 'Student workspace';
  const workspaceLabel = pathname === '/analytics'
    ? 'System analytics'
    : pathname === '/admin'
      ? 'Management'
      : pathname === '/tickets'
        ? 'Assistance requests'
        : pathname === '/profile'
          ? 'Profile'
          : pathname === '/explore'
            ? 'Announcements and updates'
            : pathname === '/documents'
              ? 'Documents'
              : 'Dashboard';
  const navigationItems: NavigationItem[] = [
    {
      routeName: 'index',
      href: '/',
      label: isStudent ? 'Home' : role === 'faculty' ? 'Dashboard' : isStaff ? 'Operations' : 'Overview',
      icon: { ios: 'house', android: 'home', web: 'home' },
    },
    ...(isStaff || isSuperAdmin ? [{
      routeName: 'admin',
      href: '/admin' as Href,
      label: 'Management',
      icon: { ios: 'briefcase', android: 'work', web: 'work' } as AcademicIconName,
    }] : []),
    ...(isSuperAdmin ? [{
      routeName: 'analytics',
      href: '/analytics' as Href,
      label: 'Analytics',
      icon: { ios: 'chart.bar.xaxis', android: 'analytics', web: 'analytics' } as AcademicIconName,
    }] : []),
    ...(isStudent ? [{
      routeName: 'tickets',
      href: '/tickets' as Href,
      label: 'Requests',
      icon: { ios: 'doc.text', android: 'assignment', web: 'assignment' } as AcademicIconName,
    }] : []),
    {
      routeName: 'explore',
      href: '/explore',
      label: 'Updates',
      icon: { ios: 'bell', android: 'notifications', web: 'notifications' },
    },
    {
      routeName: 'profile',
      href: '/profile',
      label: 'Profile',
      icon: { ios: 'person', android: 'person', web: 'person' },
    },
  ];
  const activeRouteName = state.routes[state.index]?.name;

  if (fullScreen) return null;

  if (!desktop) {
    return (
      <View nativeID="app-tab-bar" style={styles.mobileNavigationLayer}>
        <BlurView
          intensity={resolvedTheme === 'dark' ? 30 : 42}
          tint={resolvedTheme === 'dark' ? 'dark' : 'light'}
          style={[styles.innerContainer, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
        >
          {navigationItems.map(item => (
            <WorkspaceNavigationButton
              key={item.routeName}
              item={item}
              focused={activeRouteName === item.routeName}
              desktop={false}
              onPress={() => router.navigate(item.href)}
            />
          ))}
        </BlurView>
      </View>
    );
  }

  return (
    <View nativeID="app-tab-bar" pointerEvents="box-none" style={styles.desktopNavigationLayer}>
      <View
        style={[
          styles.desktopSidebar,
          sidebarCollapsed && styles.desktopSidebarCollapsed,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <View style={[styles.sidebarBrand, sidebarCollapsed && styles.sidebarBrandCollapsed]}>
          <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
            <AcademicIcon name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }} color="#FFFFFF" size={15} animated={false} />
          </View>
          {!sidebarCollapsed ? (
            <View style={styles.sidebarBrandCopy}>
              <ThemedText type="smallBold" style={styles.brandText}>CAS Assist</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.sidebarBrandSubtitle}>Academic services</ThemedText>
            </View>
          ) : null}
          <Pressable
            onPress={() => setSidebarCollapsed(value => !value)}
            accessibilityRole="button"
            accessibilityLabel={sidebarCollapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
            style={({ pressed }) => [styles.sidebarToggle, sidebarCollapsed && styles.sidebarToggleCollapsed, { backgroundColor: colors.muted }, pressed && styles.pressed]}>
            <AcademicIcon
              name={sidebarCollapsed
                ? { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }
                : { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
              color={colors.textSecondary}
              size={16}
              animated={false}
            />
          </Pressable>
        </View>
        {!sidebarCollapsed ? (
          <View style={styles.sidebarSectionLabel}>
            <ThemedText type="small" themeColor="textSecondary">Workspace</ThemedText>
          </View>
        ) : null}
        <View style={[styles.sidebarNavigation, sidebarCollapsed && styles.sidebarNavigationCollapsed]}>
          {navigationItems.map(item => (
            <WorkspaceNavigationButton
              key={item.routeName}
              item={item}
              focused={activeRouteName === item.routeName}
              desktop
              onPress={() => router.navigate(item.href)}
            />
          ))}
        </View>
        <View style={[styles.sidebarFooter, sidebarCollapsed && styles.sidebarFooterCollapsed, { borderTopColor: colors.border }]}>
          {!sidebarCollapsed ? (
            <>
              <ThemedText type="small" themeColor="textSecondary" style={styles.sidebarFooterLabel}>Signed in as</ThemedText>
              <ThemedText type="smallBold" numberOfLines={1}>{roleLabel}</ThemedText>
            </>
          ) : <View style={[styles.sidebarFooterDot, { backgroundColor: colors.primary }]} />}
        </View>
      </View>
      <View
        style={[styles.desktopTopbar, { backgroundColor: colors.background, borderColor: colors.border, left: getDesktopSidebarInset(sidebarCollapsed) }]}
      >
        <View style={styles.topbarCopy}>
          <ThemedText type="small" themeColor="textSecondary">CAS Assist / {roleLabel}</ThemedText>
          <ThemedText type="smallBold">{workspaceLabel}</ThemedText>
        </View>
        <View style={[styles.topbarStatus, { backgroundColor: colors.softBlue }]}>
          <View style={[styles.topbarStatusDot, { backgroundColor: colors.primary }]} />
          <ThemedText type="small" style={{ color: colors.primary }}>Authenticated workspace</ThemedText>
        </View>
      </View>
    </View>
  );
}

function WorkspaceNavigationButton({
  item,
  focused,
  desktop,
  onPress,
}: {
  item: NavigationItem;
  focused: boolean;
  desktop: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const { collapsed: sidebarCollapsed } = useContext(SidebarStateContext);
  const [keyboardFocused, setKeyboardFocused] = useState(false);
  const compact = width < Layout.compactBreakpoint;
  const micro = width < 380;
  const compactDesktopNavigation = desktop && sidebarCollapsed;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: focused }}
      onFocus={event => {
        const target = event.currentTarget as unknown as { matches?: (selector: string) => boolean };
        setKeyboardFocused(target.matches?.(':focus-visible') ?? true);
      }}
      onBlur={() => {
        setKeyboardFocused(false);
      }}
      style={({ pressed }) => [
        styles.tabPressable,
        desktop && styles.desktopTabPressable,
        keyboardFocused && !focused && styles.focusedPressable,
        pressed && styles.pressed,
      ]}>
      <View
        style={[
          styles.tabButtonView,
          desktop && styles.desktopTabButtonView,
          compactDesktopNavigation && styles.desktopTabButtonCollapsed,
          { backgroundColor: focused ? colors.backgroundSelected : 'transparent' },
          focused && { borderColor: colors.primary },
          compact && !desktop && styles.tabButtonCompact,
          micro && !desktop && styles.tabButtonMicro,
        ]}>
        <AcademicIcon name={item.icon} size={17} color={focused ? colors.primary : colors.textSecondary} animated={false} />
        {(!compact || desktop) && !compactDesktopNavigation ? (
          <ThemedText type="small" themeColor={focused ? 'text' : 'textSecondary'}>{item.label}</ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  desktopNavigationLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    pointerEvents: 'box-none',
    zIndex: 20,
  },
  mobileNavigationLayer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    zIndex: 20,
  },
  desktopSidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: DESKTOP_SIDEBAR_WIDTH, paddingHorizontal: 14, paddingTop: 18, paddingBottom: 20, borderRightWidth: 1, zIndex: 2, overflow: 'hidden' },
  desktopSidebarCollapsed: { width: DESKTOP_SIDEBAR_COLLAPSED_WIDTH, paddingHorizontal: 10 },
  sidebarBrand: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 22, paddingHorizontal: 6 },
  sidebarBrandCollapsed: { minHeight: 78, flexDirection: 'column', justifyContent: 'space-between', gap: 8, marginBottom: 18, paddingHorizontal: 0 },
  sidebarBrandCopy: { flex: 1, gap: 1 },
  sidebarBrandSubtitle: { fontSize: 11, lineHeight: 16 },
  sidebarToggle: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sidebarToggleCollapsed: { width: 32, height: 28 },
  sidebarSectionLabel: { paddingHorizontal: 10, marginBottom: 8, textTransform: 'uppercase' },
  sidebarNavigation: { gap: 4, flex: 1 },
  sidebarNavigationCollapsed: { alignItems: 'center', gap: 8 },
  sidebarFooter: { borderTopWidth: 1, paddingTop: 14, paddingHorizontal: 10, gap: 3 },
  sidebarFooterCollapsed: { alignItems: 'center', paddingHorizontal: 0, paddingTop: 16 },
  sidebarFooterLabel: { fontSize: 11, lineHeight: 16 },
  sidebarFooterDot: { width: 8, height: 8, borderRadius: 4 },
  desktopTopbar: { position: 'absolute', right: 0, top: 0, minHeight: 64, borderBottomWidth: 1, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 3, overflow: 'hidden' },
  topbarCopy: { gap: 2 },
  topbarStatus: { minHeight: 30, paddingHorizontal: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  topbarStatusDot: { width: 7, height: 7, borderRadius: 4 },
  innerContainer: {
    minHeight: 64,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: 6,
    maxWidth: MaxContentWidth,
    borderWidth: 1,
    boxShadow: '0 4px 16px rgba(20, 52, 49, 0.10)',
    overflow: 'hidden',
  },
  brandMark: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  brandText: { letterSpacing: -0.15 },
  pressed: { opacity: 0.76 },
  tabPressable: { borderRadius: 10 },
  desktopTabPressable: { width: '100%' },
  focusedPressable: { outlineStyle: 'solid', outlineWidth: 2, outlineColor: 'rgba(11,125,119,0.36)', outlineOffset: 2 },
  tabButtonView: {
    minHeight: 40,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  desktopTabButtonView: {
    width: '100%',
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  desktopTabButtonCollapsed: { width: 48, paddingHorizontal: 0, justifyContent: 'center' },
  tabButtonCompact: { width: 46, paddingHorizontal: 0, justifyContent: 'center' },
  tabButtonMicro: { width: 42 },
});
