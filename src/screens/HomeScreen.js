import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { IMG, ROUTES } from '../utils';

const HomeScreen = () => {
  const navigation = useNavigation();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Image
        source={{
          uri: IMG.LOGO,
          // uri: 'https://www.chachinggroup.com/blog/wp-content/uploads/2016/07/logo-design-in-Thailand.jpg',
        }}
        style={{
          width: 200,
          height: 200,
        }}
      />
      <Text>HomeScreen</Text>

      <TouchableOpacity
        onPress={() => {
          navigation.navigate(ROUTES.PROFILE);
        }}
      >
        <View
          style={{
            padding: 20,
            backgroundColor: 'green',
            borderRadius: 20,
          }}
        >
          <Text style={{ fontSize: 40, color: 'white' }}>
            GO TO PROFILE SCREEN
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default HomeScreen;