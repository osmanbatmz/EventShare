// # src/navigation/WebNavigation.tsx - Web-specific Navigation
import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { LinearGradient } from 'expo-linear-gradient'

// # Types
import { RootStackParamList } from '../types'

// # Store
import { useAuth } from '../store'

const { width } = Dimensions.get('window')

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
  success: '#6A9F58',
  warning: '#E8A317',
}

// # Web Header Component
export const WebHeader: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  const route = useRoute()
  const { user, isAuthenticated } = useAuth()
  
  const [currentPath, setCurrentPath] = useState('')

  useEffect(() => {
    // # Update current path when route changes
    setCurrentPath(route.name || '')
  }, [route])

  const getPageTitle = () => {
    switch (currentPath) {
      case 'Home': return 'EventShare'
      case 'EventDetail': return 'Etkinlik Detayı'
      case 'CreateEvent': return 'Yeni Etkinlik'
      case 'JoinEvent': return 'Etkinliğe Katıl'
      case 'Profile': return 'Profil'
      case 'Auth': return 'Giriş Yap'
      default: return 'EventShare'
    }
  }

  const canGoBack = () => {
    return currentPath !== 'Home' && currentPath !== 'Auth'
  }

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientEnd]}
      style={styles.header}
    >
      <View style={styles.headerContent}>
        {/* # Back Button */}
        {canGoBack() && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        )}

        {/* # Title */}
        <Text style={styles.title}>{getPageTitle()}</Text>

        {/* # User Menu */}
        {isAuthenticated && user && (
          <TouchableOpacity
            style={styles.userButton}
            onPress={() => navigation.navigate('Profile' as any)}
          >
            <Text style={styles.userButtonText}>
              {user.display_name?.charAt(0).toUpperCase() || '👤'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  )
}

// # Web Footer Component
export const WebFooter: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()

  return (
    <View style={styles.footer}>
      <LinearGradient
        colors={[COLORS.surfaceWarm, COLORS.accent]}
        style={styles.footerGradient}
      >
        <View style={styles.footerContent}>
          <Text style={styles.footerText}>
            © 2025 EventShare - Anılarınızı paylaşın
          </Text>
          
          <View style={styles.footerLinks}>
            <TouchableOpacity
              style={styles.footerLink}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.footerLinkText}>Ana Sayfa</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.footerLink}
              onPress={() => navigation.navigate('CreateEvent')}
            >
              <Text style={styles.footerLinkText}>Etkinlik Oluştur</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  )
}

// # Web Layout Wrapper
export const WebLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <View style={styles.container}>
      <WebHeader />
      <View style={styles.content}>
        {children}
      </View>
      <WebFooter />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gradientStart,
  },
  
  header: {
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  backButtonText: {
    fontSize: 18,
    color: COLORS.textDark,
    fontWeight: '600',
  },
  
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
    flex: 1,
    textAlign: 'center',
  },
  
  userButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  userButtonText: {
    fontSize: 16,
    color: COLORS.surface,
    fontWeight: '600',
  },
  
  content: {
    flex: 1,
    paddingHorizontal: width > 768 ? 40 : 20,
    paddingVertical: 20,
  },
  
  footer: {
    height: 80,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  
  footerGradient: {
    flex: 1,
    justifyContent: 'center',
  },
  
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  
  footerText: {
    fontSize: 14,
    color: COLORS.textMedium,
  },
  
  footerLinks: {
    flexDirection: 'row',
    gap: 20,
  },
  
  footerLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  
  footerLinkText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
}) 