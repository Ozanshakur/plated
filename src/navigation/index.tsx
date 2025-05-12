"use client"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { useTheme } from "../theme/ThemeProvider"
import { useAuth } from "../context/AuthContext"
import EmailVerificationBanner from "../components/EmailVerificationBanner"
import { View } from "react-native"

// Screens
import SignInScreen from "../screens/auth/SigninScreen"
import SignUpScreen from "../screens/auth/SignupScreen"
import HomeScreen from "../screens/main/HomeScreen"
import SearchScreen from "../screens/main/SearchScreen"
import CreatePostScreen from "../screens/main/CreatePostScreen"
import NotificationsScreen from "../screens/main/NotificationsScreen"
import ProfileScreen from "../screens/main/ProfileScreen"
import ChatScreen from "../screens/main/ChatScreen"
import ConversationScreen from "../screens/main/ConversationScreen"
import VerifyEmailScreen from "../screens/auth/VerifyEmailScreen"
import CommentScreen from "../screens/main/CommentScreen"
import EditProfileScreen from "../screens/main/EditProfileScreen"
import PrivacyPolicyScreen from "../screens/main/PrivacyPolicyScreen"
import SupportScreen from "../screens/main/SupportScreen"
import UserProfileScreen from "../screens/main/UserProfileScreen"
import VerificationScreen from "../screens/main/VerificationScreen"

// Icons
import { Home, Search, PlusSquare, Bell, User } from "lucide-react-native"

// Stack Navigator Types
export type RootStackParamList = {
  Welcome: undefined
  SignIn: undefined
  SignUp: undefined
  VerifyEmail: { email: string }
  Main: { screen?: string }
  CreatePost: undefined
  Comments: { postId: string; postContent: string }
  UserProfile: { userId: string }
  EditProfile: undefined
  PrivacyPolicy: undefined
  Support: undefined
  Verification: undefined
  Chat: undefined
  Conversation: { userId: string; username: string }
}

// Tab Navigator Types
export type MainTabParamList = {
  Home: undefined
  Search: undefined
  CreatePost: undefined
  Notifications: undefined
  Profile: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator<MainTabParamList>()

// Tab Navigator
const MainTabNavigator = () => {
  const { theme } = useTheme()

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.secondaryText,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBarBackground,
          borderTopColor: theme.colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 85,
        },
        headerStyle: {
          backgroundColor: theme.colors.mainBackground,
        },
        headerTintColor: theme.colors.primaryText,
        headerShadowVisible: false,
        tabBarShowLabel: true,
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Start",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          header: (props) => (
            <View style={{ backgroundColor: theme.colors.mainBackground }}>
              <EmailVerificationBanner />
              {/* <Header {...props} /> */}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: "Suchen",
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
          header: (props) => (
            <View style={{ backgroundColor: theme.colors.mainBackground }}>
              <EmailVerificationBanner />
              {/* <Header {...props} /> */}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{
          tabBarLabel: "Erstellen",
          tabBarIcon: ({ color, size }) => <PlusSquare size={size} color={color} />,
          header: (props) => (
            <View style={{ backgroundColor: theme.colors.mainBackground }}>
              <EmailVerificationBanner />
              {/* <Header {...props} /> */}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: "Aktivität",
          tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />,
          header: (props) => (
            <View style={{ backgroundColor: theme.colors.mainBackground }}>
              <EmailVerificationBanner />
              {/* <Header {...props} /> */}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profil",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          header: (props) => (
            <View style={{ backgroundColor: theme.colors.mainBackground }}>
              <EmailVerificationBanner />
              {/* <Header {...props} /> */}
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  )
}

// Root Navigator
const Navigation = () => {
  const { theme, isDarkMode } = useTheme()
  const { loading } = useAuth()

  if (loading) {
    return null // Oder einen Ladebildschirm anzeigen
  }

  return (
    <NavigationContainer
      theme={{
        dark: isDarkMode,
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.mainBackground,
          card: theme.colors.cardBackground,
          text: theme.colors.primaryText,
          border: theme.colors.border,
          notification: theme.colors.error,
        },
        fonts: {
          regular: {
            fontFamily: "System",
            fontWeight: "400",
          },
          medium: {
            fontFamily: "System",
            fontWeight: "500",
          },
          bold: {
            fontFamily: "System",
            fontWeight: "700",
          },
          heavy: {
            fontFamily: "System",
            fontWeight: "900",
          },
        },
      }}
    >
      <Stack.Navigator
        initialRouteName="Main"
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.mainBackground,
          },
          headerTintColor: theme.colors.primaryText,
          headerShadowVisible: false,
        }}
      >
        {/* Hauptnavigation - immer sichtbar */}
        <Stack.Screen name="Main" component={MainTabNavigator} options={{ headerShown: false }} />

        {/* Auth Screens - nur bei Bedarf */}
        <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: "Anmelden" }} />
        <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: "Registrieren" }} />

        {/* Chat Screens */}
        <Stack.Screen name="Chat" component={ChatScreen} options={{ title: "Nachrichten" }} />
        <Stack.Screen
          name="Conversation"
          component={ConversationScreen}
          options={({ route }) => ({ title: route.params?.username || "Konversation" })}
        />
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ title: "E-Mail bestätigen" }} />

        {/* Comments Screen - mit ausgeblendeter Header-Navigation */}
        <Stack.Screen name="Comments" component={CommentScreen} options={{ headerShown: false }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />

        {/* Neue Screens */}
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Support" component={SupportScreen} options={{ headerShown: false }} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Verification" component={VerificationScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default Navigation
