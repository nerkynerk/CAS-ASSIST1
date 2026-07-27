import { Tabs } from 'expo-router';
import { useColorScheme, type ColorValue } from 'react-native';

import { AcademicIcon, type AcademicIconName } from '@/components/ui/academic-ui';
import { useAuth } from '@/context/auth';
import { BrandColors, Colors } from '@/constants/theme';

const PRIMARY = BrandColors.primary;

function tabIcon(name: AcademicIconName) {
  return function TabBarIcon({ color, size }: { color: ColorValue; size: number }) {
    return (
      <AcademicIcon name={name} color={String(color)} size={size} />
    );
  };
}

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
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
        tabBarStyle: { backgroundColor: colors.background },
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
            title: isStaff ? 'Queue' : 'Management',
            tabBarIcon: tabIcon({ ios: 'briefcase.fill', android: 'work', web: 'work' }),
          }}
        />
      </Tabs.Protected>

      <Tabs.Protected guard={isStudent || isFaculty}>
        <Tabs.Screen
          name="tickets"
          options={{
            title: isStudent ? 'Requests' : 'Advising',
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
      <Tabs.Screen name="chatbot" options={{ href: null }} />
      <Tabs.Screen name="documents" options={{ href: null }} />
    </Tabs>
  );
}
