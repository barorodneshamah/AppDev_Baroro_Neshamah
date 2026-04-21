import React, { FC } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { resetLogin } from '../app/reducers/auth';

const COLORS = {
  primary: '#E07A5F',
  primaryDark: '#C25A40',
  secondary: '#3D405B',
  accent: '#81B29A',
  background: '#F4F1DE',
  surface: '#FFFFFF',
  textDark: '#2D3142',
  textLight: '#FFFFFF',
  textMuted: '#9A9A9A',
  border: '#E8E8E8',
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

const Icon: FC<IconProps> = ({ name, size = 20, color = COLORS.secondary, style = {} }) => (
  <View
    style={[
      {
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: size / 2,
        opacity: 0.3,
      },
      style,
    ]}
  />
);

interface ProfileItemProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  isLast?: boolean;
}

const ProfileItem: FC<ProfileItemProps> = ({
  icon,
  label,
  value,
  onPress,
  isLast = false,
}) => (
  <TouchableOpacity
    style={styles.profileItem}
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={styles.profileItemLeft}>
      <Icon
        name={icon}
        size={20}
        color={COLORS.primary}
        style={styles.profileItemIcon}
      />
      <Text style={styles.profileItemLabel}>{label}</Text>
    </View>
    <View style={styles.profileItemRight}>
      <Text style={styles.profileItemValue}>{value || 'Not provided'}</Text>
      {onPress && (
        <Icon
          name="chevron-right"
          size={18}
          color={COLORS.textMuted}
          style={styles.arrowIcon}
        />
      )}
    </View>
    {!isLast && <View style={styles.profileItemDivider} />}
  </TouchableOpacity>
);

const ProfileScreen: FC = () => {
  const dispatch = useDispatch();
  const { data } = useSelector((state: any) => state.auth);

  const handleLogout = () => {
    dispatch(resetLogin());
  };

  const handleEditUsername = () => console.log('Edit Username');
  const handleEditEmail = () => console.log('Edit Email');
  const handleChangePassword = () => console.log('Change Password');
  const handlePrivacySettings = () => console.log('Privacy Settings');

  const avatarUrl = data?.username
    ? `https://ui-avatars.com/api/?name=${data.username}&background=E07A5F&color=fff&size=128`
    : `https://ui-avatars.com/api/?name=Guest&background=E07A5F&color=fff&size=128`;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.primary}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Section with Profile Picture and Name */}
        <View style={styles.topSection}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            <TouchableOpacity style={styles.editAvatarButton}>
              <Icon name="camera" size={16} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>{data?.username || 'Guest'}</Text>
          <Text style={styles.email}>{data?.email || 'No email provided'}</Text>
          <TouchableOpacity style={styles.editProfileButton}>
            <Icon name="user-edit" size={16} color={COLORS.textLight} />
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Details Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <ProfileItem
            icon="user"
            label="Username"
            value={data?.username}
            onPress={handleEditUsername}
          />
          <ProfileItem
            icon="envelope"
            label="Email"
            value={data?.email}
            onPress={handleEditEmail}
          />
          <ProfileItem
            icon="briefcase"
            label="Role"
            value={data?.roles?.join(', ') || 'User'}
            isLast={true}
          />
        </View>

        {/* Settings & Preferences Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <ProfileItem
            icon="lock"
            label="Change Password"
            onPress={handleChangePassword}
          />
          <ProfileItem
            icon="shield-alt"
            label="Privacy Settings"
            onPress={handlePrivacySettings}
            isLast={true}
          />
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="sign-out-alt" color={COLORS.primary} size={20} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 40,
  },
  topSection: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
    backgroundColor: COLORS.surface,
    borderRadius: 60,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    resizeMode: 'cover',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  name: {
    color: COLORS.textLight,
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-condensed',
    marginTop: 5,
  },
  email: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 5,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  editProfileButtonText: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-condensed',
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 15,
    marginTop: 25,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 10,
    paddingLeft: 5,
    paddingTop: 10,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-condensed',
  },
  profileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
  },
  profileItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileItemIcon: {
    marginRight: 15,
  },
  profileItemLabel: {
    fontSize: 16,
    color: COLORS.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
  },
  profileItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileItemValue: {
    fontSize: 15,
    color: COLORS.textMuted,
    marginRight: 10,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  arrowIcon: {
    opacity: 0.6,
  },
  profileItemDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    marginHorizontal: -20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    marginHorizontal: 15,
    marginTop: 30,
    height: 50,
    borderRadius: 12,
  },
  logoutText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-condensed',
  },
});

export default ProfileScreen;
