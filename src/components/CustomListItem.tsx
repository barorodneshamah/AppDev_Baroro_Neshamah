import React, { useState, FC } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ViewStyle,
  TextStyle,
} from 'react-native';

interface CustomListItemProps {
  title: string;
  description?: string;
  icon?: string;
  badgeText?: string;
  onPress?: () => void;
  backgroundColor?: string;
  iconBackgroundColor?: string;
  accentColor?: string;
}

const { width } = Dimensions.get('window');

const CustomListItem: FC<CustomListItemProps> = ({
  title,
  description,
  icon,
  badgeText,
  onPress,
  backgroundColor = '#FFFFFF',
  iconBackgroundColor = '#FFE5E0',
  accentColor = '#E07A5F',
}) => {
  const [isSelected, setIsSelected] = useState(false);

  const handlePress = () => {
    setIsSelected(!isSelected);
    if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      style={[
        styles.container,
        {
          backgroundColor,
          borderLeftColor: isSelected ? accentColor : 'transparent',
          borderLeftWidth: isSelected ? 4 : 0,
        },
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: iconBackgroundColor },
        ]}
      >
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      {badgeText && <Text style={styles.badge}>{badgeText}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  badge: {
    backgroundColor: '#E07A5F',
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default CustomListItem;
