// URL polyfill - EN BAŞTA OLMALI!
import 'react-native-url-polyfill/auto'

import React, { useEffect, useState, useRef } from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer, useNavigation } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import * as SplashScreen from 'expo-splash-screen'
import { Platform, View, Text } from 'react-native'

// State management
import { useAuth, useUI } from './src/store'

// Screens
import AuthScreen from './src/screens/AuthScreen'
import HomeScreen from './src/screens/HomeScreen'
import EventDetailScreen from './src/screens/EventDetailScreen'
import CreateEventScreen from './src/screens/CreateEventScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import WebEventJoinScreen from './src/screens/WebEventJoinScreen'
import WebHomeScreen from './src/screens/WebHomeScreen'
import EnhancedEventDetailScreen from './src/screens/EnhancedEventDetailScreen'

// Services
import { supabase } from './src/services/supabase'

// Types
import { Profile, RootStackParamList } from './src/types'

// Utils
import { handleWebURL, isWebPlatform } from './src/utils/deepLinkHandler'

// Splash Screen'in otomatik kapanmasını engelleyelim
SplashScreen.preventAutoHideAsync()

const Stack = createStackNavigator<RootStackParamList>()

// # Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          backgroundColor: '#FFF8F0',
          padding: 20
        }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#2D1810', marginBottom: 10 }}>
            🚨 Bir hata oluştu
          </Text>
          <Text style={{ fontSize: 14, color: '#5D4037', textAlign: 'center', marginBottom: 20 }}>
            Uygulama yüklenirken bir sorun oluştu. Lütfen sayfayı yenileyin.
          </Text>
          <Text style={{ fontSize: 12, color: '#8D6E63', textAlign: 'center' }}>
            Hata: {this.state.error?.message}
          </Text>
        </View>
      )
    }

    return this.props.children
  }
}

export default function App() {
  const { user, isAuthenticated, setUser, setAuthenticated, isGuestMode } = useAuth()
  const { setLoading } = useUI()
  const [isReady, setIsReady] = useState(false)
  const [initialRoute, setInitialRoute] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigationRef = useRef<any>(null)

  useEffect(() => {
    initializeApp()

    // Supabase auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 Supabase auth state changed:', event)
      checkAuthSession()
    })
    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  const initializeApp = async () => {
    try {
      setError(null)
      console.log('🚀 Uygulama başlatılıyor...')
      
      // # Session kontrolü yap
      await checkAuthSession()
      
      checkWebURL()
    } catch (err) {
      console.error('Uygulama başlatılırken hata:', err)
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata')
    }
  }

  useEffect(() => {
    console.log('🔄 Kimlik durumu değişti:', { isAuthenticated, isGuestMode })
    
    // isAuthenticated undefined ise henüz session kontrolü yapılmamış
    if (isAuthenticated !== undefined || isGuestMode) {
      console.log('✅ Uygulama hazır, isReady true yapılıyor')
      setIsReady(true)
      SplashScreen.hideAsync()
      
      // # Navigation'ı programmatik olarak kontrol et
      if (navigationRef.current) {
        const targetRoute = isGuestMode || isAuthenticated === true ? 'Home' : 'Auth'
        console.log('🧭 Yönlendiriliyor:', targetRoute)
        navigationRef.current.navigate(targetRoute)
      }
    }
  }, [isAuthenticated, isGuestMode])

  const checkAuthSession = async () => {
    try {
      setLoading(true)
      console.log('🔍 Oturum kontrol ediliyor...')
      
      // # Önce mevcut session'ı kontrol et
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Oturum kontrol hatası:', error)
        setAuthenticated(false)
        return
      }
      
      console.log('📱 Oturum bulundu:', !!session?.user)
      
      if (session?.user) {
        console.log('👤 Kullanıcı bulundu:', session.user.email)
        
        // # Session'ın geçerli olup olmadığını kontrol et
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.log('❌ Oturum geçersiz, temizleniyor...')
          await supabase.auth.signOut()
          setAuthenticated(false)
          return
        }
        
        await loadUserProfile(session.user.id)
        setAuthenticated(true)
      } else {
        console.log('❌ Kullanıcı bulunamadı')
        setAuthenticated(false)
      }
    } catch (error) {
      console.error('Oturum kontrolü başarısız:', error)
      setAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Profil yükleme hatası:', error)
        return
      }

      if (profile) {
        setUser(profile as Profile)
      }
    } catch (error) {
      console.error('Kullanıcı profili yüklenemedi:', error)
    }
  }

  const checkWebURL = () => {
    if (isWebPlatform()) {
      try {
        const deepLinkData = handleWebURL()
        if (deepLinkData?.type === 'event_join' && deepLinkData.eventCode) {
          setInitialRoute('JoinEvent')
        } else if (deepLinkData?.type === 'event_view' && deepLinkData.eventId) {
          setInitialRoute('EventDetail')
        } else {
          // # Web'de ana sayfa göster
          setInitialRoute('WebHome')
        }
      } catch (err) {
        console.error('Web URL kontrol hatası:', err)
        setInitialRoute('WebHome')
      }
    } else {
      // # Mobil için Auth ekranı başlangıç
      setInitialRoute('Auth')
    }
  }

  // # Error durumunda
  if (error) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#FFF8F0',
        padding: 20
      }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#2D1810', marginBottom: 10 }}>
          🚨 Başlatma Hatası
        </Text>
        <Text style={{ fontSize: 14, color: '#5D4037', textAlign: 'center', marginBottom: 20 }}>
          Uygulama başlatılırken bir sorun oluştu.
        </Text>
        <Text style={{ fontSize: 12, color: '#8D6E63', textAlign: 'center' }}>
          Hata: {error}
        </Text>
      </View>
    )
  }

  if (!isReady) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#FFF8F0'
      }}>
        <Text style={{ fontSize: 18, color: '#2D1810' }}>
          EventShare yükleniyor...
        </Text>
      </View>
    )
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: '#FFF8F0' }
            }}
            initialRouteName={
              isWebPlatform() 
                ? (initialRoute as keyof RootStackParamList || 'WebHome')
                : (isGuestMode || isAuthenticated === true ? 'Home' : 'Auth')
            }
          >
            {/* # Web Screens - No auth required */}
            {isWebPlatform() && (
              <>
                <Stack.Screen 
                  name="WebHome" 
                  component={WebHomeScreen}
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen 
                  name="JoinEvent" 
                  component={WebEventJoinScreen}
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen 
                  name="EventDetail" 
                  component={EnhancedEventDetailScreen}
                  options={{
                    headerShown: true,
                    title: 'Etkinlik Detayı',
                    headerStyle: { backgroundColor: '#FFF8F0' },
                    headerTintColor: '#2D1810',
                    headerBackTitle: '',
                  }}
                />
              </>
            )}
            
            {/* # Auth Screen - Always available */}
            <Stack.Screen 
              name="Auth" 
              component={AuthScreen}
              options={{
                headerShown: false,
              }}
            />
            
            {/* # Main App Screens */}
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen 
              name="EventDetail" 
              component={EnhancedEventDetailScreen}
              options={{
                headerShown: true,
                title: 'Etkinlik Detayı',
                headerStyle: { backgroundColor: '#FFF8F0' },
                headerTintColor: '#2D1810',
                headerBackTitle: '',
              }}
            />
            <Stack.Screen 
              name="CreateEvent" 
              component={CreateEventScreen}
              options={{
                headerShown: true,
                title: 'Yeni Etkinlik',
                headerStyle: { backgroundColor: '#F4E4BC' },
                headerTintColor: '#2D1810',
                headerBackTitle: '',
              }}
            />
            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen}
              options={{
                headerShown: true,
                title: 'Profil',
                headerStyle: { backgroundColor: '#FFF8F0' },
                headerTintColor: '#2D1810',
                headerBackTitle: '',
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="dark" backgroundColor="#FFF8F0" translucent={false} />
      </SafeAreaProvider>
    </ErrorBoundary>
  )
}
