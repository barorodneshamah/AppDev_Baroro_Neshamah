import { Text, TouchableOpacity, View } from 'react-native';

const CustomButton = ({ label, onPress }) => {
  return (
    <View>
      <TouchableOpacity
        onPress={onPress}
        style={{
          margin: 10,
          backgroundColor: 'blue',
          borderRadius: 10,
        }}
      >
        <View style={{ padding: 10 }}>
          <Text
            style={{
              color: 'white',
              fontSize: 15,
            }}
          >
            {label}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default CustomButton;
