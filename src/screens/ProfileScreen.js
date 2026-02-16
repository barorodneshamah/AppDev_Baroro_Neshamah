import { Image, Text, View } from 'react-native';
import { IMG } from '../utils';

const ProfileScreen = () => {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderColor: 'blue',
        borderWidth: 3,
      }}
    >
      <Image
        source={{
          uri: IMG.LOGO,
        }}
        style={{
          width: 200,
          height: 200,
        }}
      />
      <Text>ProfileScreen</Text>
    </View>
  );
};

export default ProfileScreen;