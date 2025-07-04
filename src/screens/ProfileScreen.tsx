import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  Platform,
  Dimensions,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'

// # Types
import { RootStackParamList } from '../types'

// # Store
import { useAuth } from '../store'

// # Utils
import { generateAvatarColor, formatDate } from '../utils'

const { width } = Dimensions.get('window')

const GuestProfileScreen: React.FC = () => {
  const { setGuestMode, guestName } = useAuth();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={guestStyles.container}>
      <View style={guestStyles.avatarCircle}>
        <Text style={guestStyles.avatarText}>{(guestName?.charAt(0).toUpperCase() || '👤')}</Text>
      </View>
      <Text style={guestStyles.title}>Hoş geldin, {guestName || 'Misafir'}!</Text>
      <Text style={guestStyles.subtitle}>
        Kayıt olursan etkinlik oluşturabilir, profilini yönetebilir ve daha fazlasını yapabilirsin.
      </Text>
      <TouchableOpacity
        style={guestStyles.registerButton}
        onPress={() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Auth' }],
          });
        }}
      >
        <Text style={guestStyles.registerButtonText}>Kayıt Ol</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={guestStyles.logoutButton}
        onPress={() => setGuestMode(false)}
      >
        <Text style={guestStyles.logoutButtonText}>Çıkış Yap</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={guestStyles.infoButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={guestStyles.infoButtonText}>Daha fazla bilgi</Text>
      </TouchableOpacity>
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={guestStyles.modalOverlay}>
          <View style={guestStyles.modalContent}>
            <Text style={guestStyles.modalText}>
              Misafir olarak sadece etkinliklere katılabilir ve içerik yükleyebilirsin. Kayıt olursan tüm özelliklere erişebilirsin!
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={guestStyles.closeText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const guestStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8F0', padding: 24 },
  avatarCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#E8DDD4', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { fontSize: 40, color: '#8B5A3C', fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2D1810', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#5D4037', textAlign: 'center', marginBottom: 24 },
  registerButton: { backgroundColor: '#8B5A3C', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 24, marginBottom: 12 },
  registerButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  logoutButton: { backgroundColor: '#C85450', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 24, marginBottom: 12 },
  logoutButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  infoButton: { marginTop: 8, padding: 8 },
  infoButtonText: { color: '#8B5A3C', fontSize: 15, textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 32, borderRadius: 16, alignItems: 'center' },
  modalText: { fontSize: 18, marginBottom: 16, color: '#2D1810', textAlign: 'center' },
  closeText: { color: '#C85450', fontWeight: 'bold', fontSize: 16 },
});

const ProfileScreen: React.FC = () => {
  const { user, isGuestMode, logout } = useAuth();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  if (isGuestMode) {
    return <GuestProfileScreen />;
  }

  if (!user) {
    return null;
  }

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
    error: '#C85450',
  }

  const handleLogout = async () => {
    Alert.alert(
      '🚪 Çıkış Yap',
      'Hesabınızdan çıkmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            await logout()
          }
        }
      ]
    )
  }

  const avatarColor = generateAvatarColor(user?.display_name || 'Guest')

  // # Profile Menu Items - Basit ve temiz
  const menuItems = [
    {
      id: 'edit_profile',
      icon: '✏️',
      title: 'Profili Düzenle',
      onPress: () => Alert.alert('Yakında', 'Bu özellik yakında eklenecek'),
    },
    {
      id: 'my_events',
      icon: '🎪',
      title: 'Etkinliklerim',
      count: user ? ((user.total_events_created || 0) + (user.total_events_joined || 0)) : 0,
      onPress: () => Alert.alert('Yakında', 'Bu özellik yakında eklenecek'),
    },
    {
      id: 'notifications',
      icon: '🔔',
      title: 'Bildirimler',
      onPress: () => Alert.alert('Yakında', 'Bildirim ayarları yakında'),
    },
    {
      id: 'privacy',
      icon: '🔒',
      title: 'Gizlilik',
      onPress: () => Alert.alert('Yakında', 'Gizlilik ayarları yakında'),
    },
    {
      id: 'help',
      icon: '❓',
      title: 'Yardım',
      onPress: () => Alert.alert('Yardım', 'Sorularınız için: destek@eventshare.app'),
    },
    {
      id: 'about',
      icon: 'ℹ️',
      title: 'Hakkında',
      onPress: () => Alert.alert('EventShare v1.0.0', 'Modern etkinlik paylaşım uygulaması'),
    },
  ]

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        style={styles.container}
      >
        <View style={styles.safeArea}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* # Profile Header */}
            <View style={styles.profileHeader}>
              <LinearGradient
                colors={[COLORS.surface, COLORS.surfaceWarm]}
                style={styles.headerCard}
              >
                {/* # Avatar */}
                <View style={styles.avatarContainer}>
                  <LinearGradient
                    colors={[avatarColor, avatarColor + 'CC']}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarText}>
                      {(user?.display_name && user.display_name.charAt(0).toUpperCase()) || 'M'}
                    </Text>
                  </LinearGradient>
                  <TouchableOpacity style={styles.editAvatarButton}>
                    <Text style={styles.editAvatarIcon}>📷</Text>
                  </TouchableOpacity>
                </View>

                {/* # User Info */}
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {user?.display_name || 'Kullanıcı'}
                  </Text>
                  <Text style={styles.userEmail}>
                    {user?.email || ''}
                  </Text>
                  {!isGuestMode && user && (
                    <Text style={styles.joinDate}>
                      📅 {user?.created_at ? formatDate(user.created_at) : 'Bilinmiyor'} tarihinde katıldı
                    </Text>
                  )}
                </View>
              </LinearGradient>
            </View>

            {/* # Menu Section */}
            <View style={styles.menuSection}>
              <Text style={styles.sectionTitle}>⚙️ Ayarlar</Text>
              <View style={styles.menuCard}>
                <LinearGradient
                  colors={[COLORS.surface, COLORS.surfaceWarm]}
                  style={styles.menuContent}
                >
                  {menuItems.map((item, index) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.menuItem,
                        index < menuItems.length - 1 && styles.menuItemBorder
                      ]}
                      onPress={item.onPress}
                    >
                      <View style={styles.menuItemIcon}>
                        <Text style={styles.menuItemEmoji}>{item.icon}</Text>
                      </View>
                      <Text style={styles.menuItemTitle}>{item.title}</Text>
                      <View style={styles.menuItemRight}>
                        {item.count && item.count > 0 && (
                          <View style={styles.countBadge}>
                            <Text style={styles.countText}>{item.count}</Text>
                          </View>
                        )}
                        <Text style={styles.menuItemArrow}>›</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </LinearGradient>
              </View>
            </View>

            {/* # Logout Section */}
            <View style={styles.logoutSection}>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <LinearGradient
                  colors={[COLORS.error, '#E74C3C']}
                  style={styles.logoutGradient}
                >
                  <Text style={styles.logoutIcon}>🚪</Text>
                  <Text style={styles.logoutText}>Çıkış Yap</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* # Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                EventShare ile anılarınızı paylaşmaya devam edin! 🎉
              </Text>
            </View>
          </ScrollView>
        </View>
      </LinearGradient>
    </>
  )
}

// # Modern Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  safeArea: {
    flex: 1,
  },
  
  scrollView: {
    flex: 1,
  },
  
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16, // # Navigation header'dan sonra az boşluk
    paddingBottom: 40,
  },
  
  // # Profile Header
  profileHeader: {
    marginBottom: 32,
  },
  
  headerCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#8B5A3C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  
  // # Avatar
  avatarContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5A3C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  
  avatarText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '800',
  },
  
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5A3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#F4E4BC',
  },
  
  editAvatarIcon: {
    fontSize: 20,
  },
  
  // # User Info
  userInfo: {
    alignItems: 'center',
  },
  
  userName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2D1810',
    marginBottom: 8,
    textAlign: 'center',
  },
  
  userEmail: {
    fontSize: 16,
    fontWeight: '500',
    color: '#5D4037',
    marginBottom: 8,
  },
  
  joinDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8D6E63',
    textAlign: 'center',
  },
  
  // # Menu Section
  menuSection: {
    marginBottom: 32,
  },
  
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D1810',
    marginBottom: 16,
    marginLeft: 4,
  },
  
  menuCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#8B5A3C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  
  menuContent: {
    padding: 8,
  },
  
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F4E4BC',
  },
  
  menuItemIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#F4E4BC',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  menuItemEmoji: {
    fontSize: 24,
  },
  
  menuItemTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#2D1810',
  },
  
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  countBadge: {
    backgroundColor: '#8B5A3C',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  
  countText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  
  menuItemArrow: {
    fontSize: 24,
    color: '#D4C4B0',
    fontWeight: '300',
  },
  
  // # Logout Section
  logoutSection: {
    marginBottom: 32,
  },
  
  logoutButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#C85450',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  
  logoutIcon: {
    fontSize: 24,
  },
  
  logoutText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  
  // # Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  
  footerText: {
    fontSize: 16,
    color: '#8D6E63',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
})

export default ProfileScreen