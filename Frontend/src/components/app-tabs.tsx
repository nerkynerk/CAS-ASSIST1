import { BlurView } from 'expo-blur';
import { Tabs, usePathname } from 'expo-router';
import { useWindowDimensions, type ColorValue } from 'react-native';

import { AcademicIcon, type AcademicIconName } from '@/components/ui/academic-ui';
import { useAuth } from '@/context/auth';
import { useAppTheme } from '@/context/theme';
import { Fonts, Layout } from '@/constants/theme';

function tabIcon(name: AcademicIconName) {
  return function TabBarIcon({ color, size }: { color: ColorValue; size: number }) {
    return (
      <AcademicIcon name={name} color={String(color)} size={size} animated={false} />
    );
  };
}

export default function AppTabs() {
  const { colors, resolvedTheme } = useAppTheme();
  const { profile } = useAuth();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const role = profile?.role;
  const isStudent = role === 'student';
  const isFaculty = role === 'faculty';
  const isStaff = role === 'staff';
  const isSuperAdmin = role === 'super_admin';
  const showLabels = width >= 390;
  const detailRoute = pathname.startsWith('/ticket/');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarActiveBackgroundColor: colors.backgroundSelected,
        tabBarHideOnKeyboard: true,
        tabBarBackground: () => (
          <BlurView
            intensity={resolvedTheme === 'dark' ? 30 : 42}
            tint={resolvedTheme === 'dark' ? 'dark' : 'light'}
            experimentalBlurMethod="dimezisBlurView"
            style={{ flex: 1 }}
          />
        ),
        tabBarStyle: {
          position: 'absolute',
          height: showLabels ? 76 : 66,
          paddingTop: showLabels ? 8 : 6,
          paddingBottom: showLabels ? 8 : 6,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          boxShadow: '0 -4px 16px rgba(20, 52, 49, 0.06)',
          ...(detailRoute ? { display: 'none' } : {}),
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.sans,
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.1,
        },
        tabBarItemStyle: {
          borderRadius: 10,
          marginHorizontal: width >= Layout.compactBreakpoint ? 3 : 1,
          marginVertical: 4,
        },
        tabBarShowLabel: showLabels,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: isStudent ? 'Home' : isFaculty ? 'Dashboard' : isStaff ? 'Operations' : 'Overview',
          tabBarIcon: tabIcon({ ios: 'house.fill', android: 'home', web: 'home' }),
        }}
      />

      <Tabs.Protected guard={isStaff || isSuperAdmin}>
        <Tabs.Screen
          name="admin"
          options={{
            title: 'Management',
            tabBarIcon: tabIcon({ ios: 'briefcase.fill', android: 'work', web: 'work' }),
          }}
        />
      </Tabs.Protected>

      <Tabs.Protected guard={isSuperAdmin}>
        <Tabs.Screen
          name="analytics"
          options={{
            title: 'Analytics',
            tabBarIcon: tabIcon({ ios: 'chart.bar.xaxis', android: 'analytics', web: 'analytics' }),
          }}
        />
      </Tabs.Protected>

      <Tabs.Protected guard={isStudent}>
        <Tabs.Screen
          name="tickets"
          options={{
            title: 'Requests',
            tabBarIcon: tabIcon({ ios: 'doc.text.fill', android: 'assignment', web: 'assignment' }),
          }}
        />
      </Tabs.Protected>

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Updates',
          tabBarIcon: tabIcon({ ios: 'bell.fill', android: 'notifications', web: 'notifications' }),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: tabIcon({ ios: 'person.fill', android: 'person', web: 'person' }),
        }}
      />
      <Tabs.Screen name="chatbot" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="faq" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="ticket/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Protected guard={isStudent}>
        <Tabs.Screen name="documents" options={{ href: null }} />
      </Tabs.Protected>
    </Tabs>
  );
}
