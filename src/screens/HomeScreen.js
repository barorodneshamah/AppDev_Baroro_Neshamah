import { useNavigation } from '@react-navigation/native';
import React from 'react';
import {
  Image, Platform, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { IMG, ROUTES } from '../utils';
import { resetLogin } from '../app/reducers/auth';

const COLORS = {
  primary: '#c24a16',
  background: '#fcfbf7',
  textDark: '#333333',
  textLight: '#ffffff',
};

const HomeScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { data } = useSelector(state => state.auth);

  const handleLogout = () => dispatch(resetLogin());

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <View style={styles.header}>
        <Text style={styles.tagline}>A House of Joy, Warmth, and Memories</Text>
        <View style={styles.logoCard}>
          <Image source={{ uri: IMG.LOGO }} style={styles.logo} />
        </View>
        <Text style={styles.welcomeText}>
          Welcome, {data?.username || 'Guest'}!
        </Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardTitle}>🏨 Boutique Hotel</Text>
          <Text style={styles.cardDesc}>Find your perfect room and book your stay with us.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardTitle}>🗺️ Travel Planning</Text>
          <Text style={styles.cardDesc}>Plan your journey with personalized itineraries.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardTitle}>🍽️ Food & Dining</Text>
          <Text style={styles.cardDesc}>Explore local cuisine and book dining experiences.</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate(ROUTES.PROFILE)}
      >
        <Text style={styles.buttonText}>View Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 40 },
  header: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    borderBottomLeftRadius: 60,
  },
  tagline: {
    color: COLORS.textLight,
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  logoCard: {
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    overflow: 'hidden',
    marginBottom: 20,
  },
  logo: { width: 180, height: 130, borderRadius: 25, resizeMode: 'cover' },
  welcomeText: {
    color: COLORS.textLight,
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  section: { paddingHorizontal: 20, paddingTop: 30 },
  card: {
    backgroundColor: COLORS.textLight,
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.primary,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  cardDesc: { fontSize: 13, color: COLORS.textDark },
  button: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 40,
    marginTop: 10,
    height: 45,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { color: COLORS.textLight, fontSize: 16, fontWeight: 'bold' },
  logoutButton: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginHorizontal: 40,
    marginTop: 15,
    height: 45,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: { color: COLORS.primary, fontSize: 16, fontWeight: 'bold' },
});

export default HomeScreen;