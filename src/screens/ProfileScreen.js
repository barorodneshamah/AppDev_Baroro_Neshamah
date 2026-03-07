import React from 'react';
import {
  Image, Platform, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { IMG } from '../utils';
import { resetLogin } from '../app/reducers/auth';

const COLORS = {
  primary: '#c24a16',
  background: '#fcfbf7',
  textDark: '#333333',
  textLight: '#ffffff',
};

const ProfileScreen = () => {
  const dispatch = useDispatch();
  const { data } = useSelector(state => state.auth);

  const handleLogout = () => dispatch(resetLogin());

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <View style={styles.topSection}>
        <View style={styles.avatarWrapper}>
          <Image source={{ uri: IMG.LOGO }} style={styles.avatar} />
        </View>
        <Text style={styles.name}>{data?.username || 'Guest'}</Text>
        <Text style={styles.email}>{data?.email || ''}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Username</Text>
          <Text style={styles.infoValue}>{data?.username || '—'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{data?.email || '—'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Role</Text>
          <Text style={styles.infoValue}>{data?.roles?.[0] || '—'}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 40 },
  topSection: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    borderBottomLeftRadius: 60,
  },
  avatarWrapper: {
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 60,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    overflow: 'hidden',
  },
  avatar: { width: 100, height: 100, borderRadius: 50, resizeMode: 'cover' },
  name: {
    color: COLORS.textLight,
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  email: { color: COLORS.textLight, fontSize: 13, marginTop: 4, opacity: 0.85 },
  section: {
    backgroundColor: COLORS.textLight,
    marginHorizontal: 20,
    marginTop: 30,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  infoLabel: { fontSize: 14, color: COLORS.primary, fontWeight: 'bold' },
  infoValue: { fontSize: 14, color: COLORS.textDark },
  divider: { height: 1, backgroundColor: '#e2e8f0' },
  logoutButton: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginHorizontal: 40,
    marginTop: 30,
    height: 45,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: { color: COLORS.primary, fontSize: 16, fontWeight: 'bold' },
});

export default ProfileScreen;