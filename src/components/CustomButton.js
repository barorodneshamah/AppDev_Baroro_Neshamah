import { Dimensions, Text, TouchableOpacity, View } from 'react-native';

const CustomButton = ({ containerStyle, label, textStyle, onPress }) => {
  const { width, height } = Dimensions.get('window');

  return (
    <View style={containerStyle}>
      <TouchableOpacity onPress={onPress}>
        <View style={{ padding: width * 0.014 }}>
          <Text style={textStyle}>{label}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default CustomButton;
