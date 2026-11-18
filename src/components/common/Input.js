import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  editable = true,
  iconLeft,
  iconRight,
  style,
  inputStyle,
  helperText,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          error && styles.inputWrapperError,
          !editable && styles.inputWrapperDisabled,
          multiline && { height: numberOfLines * 24 + 24, alignItems: 'flex-start' },
        ]}
      >
        {iconLeft && <View style={styles.iconLeft}>{iconLeft}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.gray400}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[styles.input, multiline && styles.inputMultiline, inputStyle]}
        />
        {secureTextEntry ? (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.eyeBtn}
          >
            <Text style={styles.eyeText}>{isPasswordVisible ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        ) : (
          iconRight && <View style={styles.iconRight}>{iconRight}</View>
        )}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.m,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.ink,
    marginBottom: 6,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.2,
    borderColor: colors.gray200,
    borderRadius: radii.m,
    paddingHorizontal: spacing.m,
    minHeight: 48,
  },
  inputWrapperFocused: {
    borderColor: colors.teal,
    backgroundColor: '#ffffff',
  },
  inputWrapperError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerMist,
  },
  inputWrapperDisabled: {
    backgroundColor: colors.gray100,
    borderColor: colors.gray200,
  },
  iconLeft: {
    marginRight: spacing.s,
  },
  iconRight: {
    marginLeft: spacing.s,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.ink,
    paddingVertical: 10,
  },
  inputMultiline: {
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  eyeBtn: {
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
  },
  eyeText: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '600',
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginTop: 4,
    fontWeight: '500',
  },
  helperText: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 4,
  },
});
