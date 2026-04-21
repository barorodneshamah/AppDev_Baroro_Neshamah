import React, { FC } from 'react';
import { Dimensions, Text, TouchableOpacity, View, ViewStyle, TextStyle } from 'react-native';

interface CustomButtonProps {
  containerStyle?: ViewStyle;
  label: string;
  textStyle?: TextStyle;
  onPress: () => void;
}

const CustomButton: FC<CustomButtonProps> = ({ containerStyle, label, textStyle, onPress }) => {
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
