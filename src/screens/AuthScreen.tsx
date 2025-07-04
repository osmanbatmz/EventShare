import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RootStackParamList } from '../types'

// # Services
import { supabase } from '../services/supabase'

// # Utils
import { validateEmail, validateDisplayName } from '../utils'

// # Store
import { useUI, useAuth } from '../store'

const { width, height } = Dimensions.get('window')

// # Modern Auth Screen Component
const AuthScreen: React.FC = () => {
  // # State
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // # UI State
  const { isLoading, setLoading, setError } = useUI()
  const { setGuestMode, setAuthenticated } = useAuth()

  // # Navigation
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()

  // # 2025 Modern Color Palette
  const MODERN_COLORS = {
    // # Warm tones inspired by Mocha Mousse 2025
    primary: '#8B5A3C', // # Mocha brown
    primaryLight: '#A67C52',
    accent: '#F4E4BC', // # Warm cream
    
    // # Gradients
    gradientStart: '#FFF8F0', // # Warm white
    gradientEnd: '#F5E6D3', // # Light mocha
    
    // # Neutrals with warmth
    textDark: '#2D1810', // # Dark brown
    textMedium: '#5D4037',
    textLight: '#8D6E63',
    
    // # Surfaces
    surface: '#FFFFFF',
    surfaceWarm: '#FEFCFA',
    border: '#E8DDD4',
    borderActive: '#D4C4B0',
    
    // # States
    success: '#6A9F58', // # Warm green
    error: '#C85450', // # Warm red
    
    // # Overlays
    overlay: 'rgba(45, 24, 16, 0.1)',
    overlayDark: 'rgba(45, 24, 16, 0.3)',
  }

  // # Login işlemi
  const handleLogin = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!validateEmail(email)) {
        Alert.alert('Geçersiz Email', 'Lütfen geçerli bir email adresi girin')
        return
      }

      if (password.length < 6) {
        Alert.alert('Şifre Hatası', 'Şifre en az 6 karakter olmalı')
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      })

      if (error) throw error

      // Login başarılı - state'i güncelle
      if (data.user) {
        console.log('✅ Login successful, setting authenticated to true')
        setAuthenticated(true)
      }

    } catch (error: any) {
      console.error('Login error:', error)
      
      let errorMessage = 'Giriş yapılamadı'
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Email veya şifre hatalı'
      }
      
      Alert.alert('Giriş Hatası', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // # Register işlemi
  const handleRegister = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!validateEmail(email)) {
        Alert.alert('Geçersiz Email', 'Lütfen geçerli bir email adresi girin')
        return
      }

      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim()
      const nameError = validateDisplayName(displayName)
      if (nameError) {
        Alert.alert('İsim Hatası', nameError)
        return
      }

      if (password.length < 6) {
        Alert.alert('Şifre Hatası', 'Şifre en az 6 karakter olmalı')
        return
      }

      if (password !== confirmPassword) {
        Alert.alert('Şifre Hatası', 'Şifreler eşleşmiyor')
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: { display_name: displayName }
        }
      })

      if (error) throw error

      if (data.user) {
        Alert.alert(
          'Kayıt Başarılı! 🎉',
          'Hesabınız oluşturuldu. Şimdi giriş yapabilirsiniz.',
          [{ text: 'Tamam', onPress: () => setIsLogin(true) }]
        )
      }

    } catch (error: any) {
      console.error('Register error:', error)
      
      let errorMessage = 'Kayıt olunamadı'
      if (error.message.includes('User already registered')) {
        errorMessage = 'Bu email adresi zaten kayıtlı'
      }
      
      Alert.alert('Kayıt Hatası', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={[MODERN_COLORS.gradientStart, MODERN_COLORS.gradientEnd]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView 
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* # Hero Section */}
              <View style={styles.heroSection}>
                {/* # App Icon/Logo */}
                <View style={styles.logoContainer}>
                  <LinearGradient
                    colors={[MODERN_COLORS.primary, MODERN_COLORS.primaryLight]}
                    style={styles.logoCircle}
                  >
                    <Text style={styles.logoText}>📸</Text>
                  </LinearGradient>
                </View>
                
                {/* # Main Title */}
                <Text style={styles.mainTitle}>EventShare</Text>
                <Text style={styles.subtitle}>
                  {isLogin 
                    ? 'Hoş geldiniz! 👋\nEtkinliklerinizin anılarına kolayca erişin'
                    : 'Hadi başlayalım! ✨\nBirkaç adımda hesabınızı oluşturun'
                  }
                </Text>
              </View>

              {/* # Auth Card */}
              <View style={styles.authCard}>
                {/* # Tab Switcher */}
                <View style={styles.tabContainer}>
                  <TouchableOpacity
                    style={[styles.tab, isLogin && styles.activeTab]}
                    onPress={() => setIsLogin(true)}
                  >
                    <Text style={[styles.tabText, isLogin && styles.activeTabText]}>
                      Giriş Yap
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.tab, !isLogin && styles.activeTab]}
                    onPress={() => setIsLogin(false)}
                  >
                    <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>
                      Kayıt Ol
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* # Form Fields */}
                <View style={styles.formContainer}>
                  {/* # Name Fields (Register only) */}
                  {!isLogin && (
                    <View style={styles.nameRow}>
                      <View style={styles.nameField}>
                        <Text style={styles.fieldLabel}>Ad</Text>
                        <View style={styles.inputContainer}>
                          <TextInput
                            style={styles.input}
                            value={firstName}
                            onChangeText={setFirstName}
                            placeholder="Adınız"
                            placeholderTextColor={MODERN_COLORS.textLight}
                            autoCapitalize="words"
                            autoCorrect={false}
                          />
                        </View>
                      </View>
                      
                      <View style={styles.nameField}>
                        <Text style={styles.fieldLabel}>Soyad</Text>
                        <View style={styles.inputContainer}>
                          <TextInput
                            style={styles.input}
                            value={lastName}
                            onChangeText={setLastName}
                            placeholder="Soyadınız"
                            placeholderTextColor={MODERN_COLORS.textLight}
                            autoCapitalize="words"
                            autoCorrect={false}
                          />
                        </View>
                      </View>
                    </View>
                  )}

                  {/* # Email Field */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Email</Text>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputIcon}>📧</Text>
                      <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="ornek@email.com"
                        placeholderTextColor={MODERN_COLORS.textLight}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="email"
                      />
                    </View>
                  </View>

                  {/* # Password Field */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Şifre</Text>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputIcon}>🔒</Text>
                      <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="En az 6 karakter"
                        placeholderTextColor={MODERN_COLORS.textLight}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>

                  {/* # Confirm Password (Register only) */}
                  {!isLogin && (
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Şifre Tekrar</Text>
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputIcon}>🔐</Text>
                        <TextInput
                          style={styles.input}
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          placeholder="Şifrenizi tekrar girin"
                          placeholderTextColor={MODERN_COLORS.textLight}
                          secureTextEntry
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                    </View>
                  )}

                  {/* # Submit Button */}
                  <TouchableOpacity
                    style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                    onPress={isLogin ? handleLogin : handleRegister}
                    disabled={isLoading}
                  >
                    <LinearGradient
                      colors={isLoading 
                        ? [MODERN_COLORS.textLight, MODERN_COLORS.textLight]
                        : [MODERN_COLORS.primary, MODERN_COLORS.primaryLight]
                      }
                      style={styles.submitGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.submitButtonText}>
                        {isLoading 
                          ? (isLogin ? 'Giriş yapılıyor...' : 'Kayıt oluşturuluyor...') 
                          : (isLogin ? ' Giriş Yap' : '✨ Hesap Oluştur')
                        }
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* # Toggle Link */}
                  <View style={styles.toggleContainer}>
                    <Text style={styles.toggleText}>
                      {isLogin ? 'Hesabınız yok mu?' : 'Zaten hesabınız var mı?'}
                    </Text>
                    <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                      <Text style={styles.toggleLink}>
                        {isLogin ? 'Kayıt olun' : 'Giriş yapın'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* # Guest Mode Option */}
                  <View style={styles.guestContainer}>
                    <View style={styles.divider}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>veya</Text>
                      <View style={styles.dividerLine} />
                    </View>
                    
                    <TouchableOpacity
                      style={styles.guestButton}
                      onPress={() => {
                        Alert.alert(
                          'Misafir Modu',
                          'Misafir olarak etkinliklere katılabilir ve içerik yükleyebilirsiniz. Daha fazla özellik için kayıt olmanızı öneririz.',
                          [
                            { text: 'İptal', style: 'cancel' },
                            { 
                              text: 'Misafir Olarak Devam Et', 
                              onPress: () => {
                                setGuestMode(true, 'Misafir');
                                console.log('✅ Misafir modu aktif, Home ekranına yönlendiriliyor.');
                                // navigation.reset ile Home'a yönlendir
                                if (typeof navigation !== 'undefined' && navigation.reset) {
                                  navigation.reset({
                                    index: 0,
                                    routes: [{ name: 'Home' }],
                                  });
                                }
                              }
                            }
                          ]
                        )
                      }}
                    >
                      <Text style={styles.guestButtonText}>👤 Misafir Olarak Devam Et</Text>
                    </TouchableOpacity>
                    
                    <Text style={styles.guestNote}>
                      Etkinlik oluşturmak için kayıt gerekli
                    </Text>
                  </View>
                </View>
              </View>

              {/* # Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  🎉 Etkinliklerinizin her anını yakın çevrenizle paylaşın
                </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </>
  )
}

// # Modern Styles with 2025 Trends
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  safeArea: {
    flex: 1,
  },
  
  keyboardView: {
    flex: 1,
  },
  
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 20 : (StatusBar.currentHeight || 0) + 20,
  },
  
  // # Hero Section
  heroSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  
  logoContainer: {
    marginBottom: 24,
  },
  
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5A3C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  
  logoText: {
    fontSize: 36,
  },
  
  mainTitle: {
    fontSize: 42, // # Exaggerated typography
    fontWeight: '800',
    color: '#2D1810',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -1,
  },
  
  subtitle: {
    fontSize: 18,
    color: '#5D4037',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  
  // # Auth Card
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24, // # Generous border radius
    padding: 32, // # Generous padding
    marginBottom: 24,
    shadowColor: '#8B5A3C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  
  // # Tab Switcher
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5E6D3',
    borderRadius: 16,
    padding: 4,
    marginBottom: 32,
  },
  
  tab: {
    flex: 1,
    paddingVertical: 16, // # Large touch targets
    borderRadius: 12,
    alignItems: 'center',
  },
  
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#8B5A3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8D6E63',
  },
  
  activeTabText: {
    color: '#2D1810',
    fontWeight: '700',
  },
  
  // # Form
  formContainer: {
    gap: 24, // # Generous spacing
  },
  
  nameRow: {
    flexDirection: 'row',
    gap: 16,
  },
  
  nameField: {
    flex: 1,
  },
  
  fieldContainer: {
    gap: 8,
  },
  
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1810',
    marginLeft: 4,
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFCFA',
    borderWidth: 2,
    borderColor: '#E8DDD4',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18, // # Large touch targets
    shadowColor: '#8B5A3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  
  inputIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2D1810',
    fontWeight: '500',
  },
  
  // # Submit Button
  submitButton: {
    borderRadius: 20, // # Extra rounded
    overflow: 'hidden',
    marginTop: 8,
  },
  
  submitButtonDisabled: {
    opacity: 0.6,
  },
  
  submitGradient: {
    paddingVertical: 20, // # Large button
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18, // # Large text
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  
  // # Toggle
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  
  toggleText: {
    fontSize: 15,
    color: '#8D6E63',
    fontWeight: '500',
  },
  
  toggleLink: {
    fontSize: 15,
    color: '#8B5A3C',
    fontWeight: '700',
  },
  
  // # Guest Mode
  guestContainer: {
    marginTop: 24,
  },
  
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8DDD4',
  },
  
  dividerText: {
    fontSize: 14,
    color: '#8D6E63',
    marginHorizontal: 16,
    fontWeight: '500',
  },
  
  guestButton: {
    backgroundColor: '#F5E6D3',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8DDD4',
  },
  
  guestButtonText: {
    fontSize: 16,
    color: '#5D4037',
    fontWeight: '600',
  },
  
  guestNote: {
    fontSize: 12,
    color: '#8D6E63',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  
  // # Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 40,
  },
  
  footerText: {
    fontSize: 16,
    color: '#8D6E63',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
})

export default AuthScreen