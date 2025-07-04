import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'

// # Services
import { supabase } from '../services/supabase'

// # Utils
import { validateEmail, validateDisplayName } from '../utils'

// # Store
import { useUI, useAuth } from '../store'

const { width, height } = Dimensions.get('window')

interface RegisterModalProps {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

const RegisterModal: React.FC<RegisterModalProps> = ({ visible, onClose, onSuccess }) => {
  // # State
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // # UI State
  const { isLoading, setLoading, setError } = useUI()
  const { setAuthenticated } = useAuth()

  // # Modern Color Palette
  const COLORS = {
    primary: '#8B5A3C',
    primaryLight: '#A67C52',
    accent: '#F4E4BC',
    gradientStart: '#FFF8F0',
    gradientEnd: '#F5E6D3',
    textDark: '#2D1810',
    textMedium: '#5D4037',
    textLight: '#8D6E63',
    surface: '#FFFFFF',
    surfaceWarm: '#FEFCFA',
    border: '#E8DDD4',
    borderActive: '#D4C4B0',
    success: '#6A9F58',
    error: '#C85450',
    overlay: 'rgba(45, 24, 16, 0.6)',
  }

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
          [{ 
            text: 'Tamam', 
            onPress: () => {
              setAuthenticated(true)
              onSuccess()
              onClose()
            }
          }]
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

  const resetForm = () => {
    setFirstName('')
    setLastName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <SafeAreaView style={styles.container}>
            <ScrollView 
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* # Header */}
              <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hesap Oluştur</Text>
                <View style={styles.placeholder} />
              </View>

              {/* # Content */}
              <View style={styles.content}>
                <View style={styles.heroSection}>
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryLight]}
                    style={styles.logoCircle}
                  >
                    <Text style={styles.logoText}>✨</Text>
                  </LinearGradient>
                  <Text style={styles.heroTitle}>EventShare'e Katıl</Text>
                  <Text style={styles.heroSubtitle}>
                    Etkinlik oluşturabilir ve daha fazla özelliğe erişebilirsiniz
                  </Text>
                </View>

                {/* # Form */}
                <View style={styles.formContainer}>
                  {/* # Name Fields */}
                  <View style={styles.nameRow}>
                    <View style={styles.nameField}>
                      <Text style={styles.fieldLabel}>Ad</Text>
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={styles.input}
                          value={firstName}
                          onChangeText={setFirstName}
                          placeholder="Adınız"
                          placeholderTextColor={COLORS.textLight}
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
                          placeholderTextColor={COLORS.textLight}
                          autoCapitalize="words"
                          autoCorrect={false}
                        />
                      </View>
                    </View>
                  </View>

                  {/* # Email */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Email</Text>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputIcon}>📧</Text>
                      <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="email@example.com"
                        placeholderTextColor={COLORS.textLight}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>

                  {/* # Password */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Şifre</Text>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputIcon}>🔒</Text>
                      <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="En az 6 karakter"
                        placeholderTextColor={COLORS.textLight}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>

                  {/* # Confirm Password */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Şifre Tekrar</Text>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputIcon}>🔒</Text>
                      <TextInput
                        style={styles.input}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Şifrenizi tekrar girin"
                        placeholderTextColor={COLORS.textLight}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>

                  {/* # Submit Button */}
                  <TouchableOpacity
                    style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                    onPress={handleRegister}
                    disabled={isLoading}
                  >
                    <LinearGradient
                      colors={isLoading 
                        ? [COLORS.textLight, COLORS.textLight]
                        : [COLORS.primary, COLORS.primaryLight]
                      }
                      style={styles.submitGradient}
                    >
                      <Text style={styles.submitButtonText}>
                        {isLoading ? 'Hesap Oluşturuluyor...' : '✨ Hesap Oluştur'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* # Terms */}
                  <Text style={styles.termsText}>
                    Hesap oluşturarak{' '}
                    <Text style={styles.termsLink}>Kullanım Şartları</Text>
                    {' '}ve{' '}
                    <Text style={styles.termsLink}>Gizlilik Politikası</Text>
                    'nı kabul etmiş olursunuz.
                  </Text>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 24, 16, 0.6)',
  },
  
  keyboardView: {
    flex: 1,
  },
  
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  
  // # Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 20,
  },
  
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 90, 60, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  closeIcon: {
    fontSize: 18,
    color: '#8B5A3C',
    fontWeight: '600',
  },
  
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D1810',
  },
  
  placeholder: {
    width: 40,
  },
  
  // # Content
  content: {
    flex: 1,
  },
  
  // # Hero Section
  heroSection: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 32,
  },
  
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#8B5A3C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  
  logoText: {
    fontSize: 36,
  },
  
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2D1810',
    marginBottom: 12,
    textAlign: 'center',
  },
  
  heroSubtitle: {
    fontSize: 16,
    color: '#5D4037',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  
  // # Form
  formContainer: {
    gap: 24,
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
    paddingVertical: 18,
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
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 8,
  },
  
  submitButtonDisabled: {
    opacity: 0.6,
  },
  
  submitGradient: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  
  // # Terms
  termsText: {
    fontSize: 12,
    color: '#8D6E63',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 16,
  },
  
  termsLink: {
    color: '#8B5A3C',
    fontWeight: '600',
  },
})

export default RegisterModal 