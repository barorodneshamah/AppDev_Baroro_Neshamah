import React, { FC } from 'react';
import { Dimensions, Text, View, ViewStyle, TextStyle } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';

interface CustomTextInputProps {
  placeholder?: string;
  label: string;
  labelStyle?: TextStyle;
  value: string;
  onChangeText: (text: string) => void;
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
}

const CustomTextInput: FC<CustomTextInputProps> = ({
  placeholder,
  label,
  labelStyle,
  value,
  onChangeText,
  containerStyle,
  textStyle,
}) => {
  const { width, height } = Dimensions.get('window');

  return (
    <View style={containerStyle}>
      <Text style={labelStyle}>{label}</Text>
      <TextInput
        placeholder={placeholder}
        onChangeText={onChangeText}
        value={value}
        style={[
          textStyle,
          {
            width: width * 0.9,
            borderBottomWidth: 1,
          },
        ]}
      />
    </View>
  );
};

export default CustomTextInput;
