import { useNavigation, NavigationProp } from '@react-navigation/native';
import React, { useState, FC } from 'react';
import {
  Image,
  ImageBackground,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { resetLogin } from '../app/reducers/auth';
import { ROUTES } from '../utils';
import CustomListItem from '../components/CustomListItem';

const { width } = Dimensions.get('window');

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface FeaturedItem {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  price: string;
  rating: number;
}

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

const CATEGORIES: Category[] = [
  { id: 'hotel', name: 'Hotels', icon: 'bed' },
  { id: 'resort', name: 'Resorts', icon: 'umbrella-beach' },
  { id: 'villa', name: 'Villas', icon: 'home' },
  { id: 'dining', name: 'Dining', icon: 'utensils' },
  { id: 'travel', name: 'Travel', icon: 'plane' },
];

const FEATURED_ITEMS: FeaturedItem[] = [
  {
    id: 1,
    title: 'Boutique Hotel',
    subtitle: 'Find your perfect stay',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    price: 'From $120/night',
    rating: 4.8,
  },
  {
    id: 2,
    title: 'Travel Planning',
    subtitle: 'Personalized itineraries',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800',
    price: 'Free Guide',
    rating: 4.9,
  },
  {
    id: 3,
    title: 'Fine Dining',
    subtitle: 'Local cuisine experiences',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
    price: 'Reservations',
    rating: 4.7,
  },
];

interface IconProps {
  name: string;
  size?: number;
  color?: string;
}

const Icon: FC<IconProps> = ({ name, size = 20, color = COLORS.secondary }) => (
  <View
    style={{
      width: size,
      height: size,
      backgroundColor: color,
      borderRadius: size / 2,
      opacity: 0.3,
    }}
  />
);

const HomeScreen: FC = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const dispatch = useDispatch();
  const { data } = useSelector((state: any) => state.auth);
  const [selectedCategory, setSelectedCategory] = useState('hotel');
  const [location, setLocation] = useState('');

  const handleLogout = () => dispatch(resetLogin());

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.username}>{data?.username || 'Guest'}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate(ROUTES.PROFILE)}
          >
            <Image
              source={{
                uri: `https://ui-avatars.com/api/?name=${
                  data?.username || 'Guest'
                }&background=E07A5F&color=fff`,
              }}
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>

        {/* Search Container */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon name="map-marker" size={20} color={COLORS.primary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Where are you going?"
              placeholderTextColor={COLORS.textMuted}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.dateButton}>
              <Icon name="calendar" size={16} color={COLORS.secondary} />
              <Text style={styles.dateText}>Check-in</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.dateButton}>
              <Icon name="calendar" size={16} color={COLORS.secondary} />
              <Text style={styles.dateText}>Check-out</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.searchButton}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat.id && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Icon
                  name={cat.icon}
                  size={20}
                  color={
                    selectedCategory === cat.id
                      ? COLORS.textLight
                      : COLORS.secondary
                  }
                />
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === cat.id && styles.categoryTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Featured Cards */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Experiences</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {FEATURED_ITEMS.map((item) => (
            <TouchableOpacity key={item.id} style={styles.featuredCard}>
              <ImageBackground
                source={{ uri: item.image }}
                style={styles.cardImage}
                imageStyle={styles.cardImageStyle}
              >
                <View style={styles.cardOverlay}>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>★ {item.rating}</Text>
                  </View>
                </View>
              </ImageBackground>

              <View style={styles.cardContent}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <View style={styles.locationRow}>
                    <Icon
                      name="map-marker"
                      size={14}
                      color={COLORS.primary}
                    />
                    <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceText}>{item.price}</Text>
                  <TouchableOpacity style={styles.bookButton}>
                    <Text style={styles.bookButtonText}>Book Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: '#FFE5E0' }]}>
                <Icon name="heart" color={COLORS.primary} size={24} />
              </View>
              <Text style={styles.actionText}>Favorites</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: '#E0F2F1' }]}>
                <Icon name="ticket" color={COLORS.accent} size={24} />
              </View>
              <Text style={styles.actionText}>My Bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
                <Icon name="support" color="#2196F3" size={24} />
              </View>
              <Text style={styles.actionText}>Support</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Dashboard</Text>

          <CustomListItem
            title="Manage Bookings"
            description="View and modify your reservations"
            badgeText="3"
            iconBackgroundColor="#FFE5E0"
            accentColor={COLORS.primary}
            onPress={() => console.log('Manage Bookings')}
          />

          <CustomListItem
            title="Saved Preferences"
            description="Update your travel preferences"
            badgeText="Updated"
            iconBackgroundColor="#E0F2F1"
            accentColor={COLORS.accent}
            onPress={() => console.log('Saved Preferences')}
          />

          <CustomListItem
            title="Loyalty Points"
            description="Earn rewards on every booking"
            badgeText="125"
            iconBackgroundColor="#FFF3E0"
            accentColor="#FF9800"
            onPress={() => console.log('Loyalty Points')}
          />

          <CustomListItem
            title="Travel Insurance"
            description="Protect your trip with insurance"
            badgeText="New"
            iconBackgroundColor="#E3F2FD"
            accentColor="#2196F3"
            onPress={() => console.log('Travel Insurance')}
          />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="logout" color={COLORS.primary} size={20} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="home" color={COLORS.primary} size={24} />
          <Text style={[styles.navText, { color: COLORS.primary }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="search" color={COLORS.textMuted} size={24} />
          <Text style={styles.navText}>Explore</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="ticket" color={COLORS.textMuted} size={24} />
          <Text style={styles.navText}>Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="user" color={COLORS.textMuted} size={24} />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  username: {
    color: COLORS.textLight,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  profileButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  searchContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 45,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: COLORS.textDark,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dateText: {
    marginLeft: 8,
    color: COLORS.textMuted,
    fontSize: 14,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
    marginHorizontal: 10,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    height: 45,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    marginTop: 25,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  seeAll: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesContainer: {
    paddingRight: 20,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: COLORS.textLight,
  },
  featuredCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 5,
  },
  cardImage: {
    height: 180,
    width: '100%',
  },
  cardImageStyle: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  cardOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 12,
  },
  ratingBadge: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ratingText: {
    color: COLORS.secondary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  cardContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
    marginBottom: 8,
  },
  bookButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bookButtonText: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: '700',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: (width - 60) / 3,
    elevation: 2,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 30,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  logoutText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    elevation: 10,
  },
  navItem: {
    alignItems: 'center',
  },
  navText: {
    fontSize: 11,
    marginTop: 4,
    color: COLORS.textMuted,
  },
});

export default HomeScreen;
