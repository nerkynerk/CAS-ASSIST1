import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { type ColorValue } from 'react-native';

import { AcademicIcon, type AcademicIconName } from '@/components/ui/academic-ui';
import { useAuth } from '@/context/auth';
import { useAppTheme } from '@/context/theme';
import { BrandColors } from '@/constants/theme';

const PRIMARY = BrandColors.primary;

function tabIcon(name: AcademicIconName) {
  return function TabBarIcon({ color, size }: { color: ColorValue; size: number }) {
    return (
      <AcademicIcon name={name} color={String(color)} size={size} />
    );
  };
}

export default function AppTabs() {
  const { colors, resolvedTheme } = useAppTheme();
  const { profile } = useAuth();
  const role = profile?.role;
  const isStudent = role === 'student';
  const isFaculty = role === 'faculty';
  const isStaff = role === 'staff';
  const isSuperAdmin = role === 'super_admin';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarHideOnKeyboard: true,
        tabBarBackground: () => (
          <BlurView
            intensity={resolvedTheme === 'dark' ? 44 : 68}
            tint={resolvedTheme === 'dark' ? 'dark' : 'light'}
            experimentalBlurMethod="dimezisBlurView"
            style={{ flex: 1 }}
          />
        ),
        tabBarStyle: {
          position: 'absolute',
          height: 72,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: 'transparent',
          borderTopColor: 'transparent',
          boxShadow: '0 -12px 36px rgba(20, 52, 49, 0.10)',
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.1 },
        tabBarItemStyle: { borderRadius: 14 },
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
      <Tabs.Protected guard={isStudent}>
        <Tabs.Screen name="documents" options={{ href: null }} />
      </Tabs.Protected>
    </Tabs>
  );
}
