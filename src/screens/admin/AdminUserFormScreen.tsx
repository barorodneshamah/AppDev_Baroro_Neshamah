// src/screens/admin/AdminUserFormScreen.tsx
import React, { FC, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Platform, StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { createUser, updateUser } from '../../app/api/api';
import { COLORS, FONTS, SHADOW, RADIUS } from '../../theme';

const ROLE_OPTIONS = ['ROLE_ADMIN', 'ROLE_STAFF', 'ROLE_GUEST'];

const AdminUserFormScreen: FC = () => {
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const { id, user } = route.params as { id?: number; user?: any };
  const { token }  = useSelector((state: RootState) => state.auth);

  const isEdit = !!id;

  const [form, setForm] = useState({
    username:  user?.username  ?? '',
    email:     user?.email     ?? '',
    fullName:  user?.fullName  ?? '',
    password:  '',
    role:      (user?.roles?.find((r: string) => r !== 'ROLE_USER') ?? 'ROLE_GUEST'),
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.username || !form.email) {
      Alert.alert('Validation', 'Username and email are required.'); return;
    }
    if (!isEdit && !form.password) {
      Alert.alert('Validation', 'Password is required for new users.'); return;
    }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        username: form.username,
        email:    form.email,
        fullName: form.fullName,
        roles:    [form.role],
      };
      if (form.password) payload.password = form.password;

      if (isEdit) await updateUser(id!, payload, token);
      else        await createUser(payload, token);

      navigation.goBack();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit User' : 'New User'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {[
          { key: 'username', label: 'Username', placeholder: 'johndoe' },
          { key: 'email',    label: 'Email',    placeholder: 'john@example.com' },
          { key: 'fullName', label: 'Full Name',placeholder: 'John Doe' },
          { key: 'password', label: isEdit ? 'New Password (leave blank to keep)' : 'Password', placeholder: '••••••••', secure: true },
        ].map(f => (
          <View key={f.key} style={styles.field}>
            <Text style={styles.label}>{f.label}</Text>
            <TextInput
              style={styles.input}
              placeholder={f.placeholder}
              placeholderTextColor={COLORS.textMuted}
              value={(form as any)[f.key]}
              onChangeText={v => set(f.key as keyof typeof form, v)}
              secureTextEntry={(f as any).secure}
              autoCapitalize="none"
            />
          </View>
        ))}

        {/* Role picker */}
        <View style={styles.field}>
          <Text style={styles.label}>Role</Text>
          <View style={styles.roleRow}>
            {ROLE_OPTIONS.map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.roleChip, form.role === r && { backgroundColor: COLORS.primary }]}
                onPress={() => set('role', r)}
              >
                <Text style={[styles.roleChipText, form.role === r && { color: '#fff' }]}>
                  {r.replace('ROLE_', '')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <>
                <Icon name={isEdit ? 'content-save' : 'account-plus'} size={18} color="#fff" />
                <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Create User'}</Text>
              </>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 16, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn:     { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontFamily: FONTS.display, fontWeight: '700' },
  body:  { padding: 16, paddingBottom: 100 },
  field: { marginBottom: 16 },
  label: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.textDark, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.sm, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: COLORS.textDark, fontFamily: FONTS.body, ...SHADOW.sm,
  },
  roleRow:      { flexDirection: 'row', gap: 10 },
  roleChip:     { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceAlt, alignItems: 'center' },
  roleChipText: { fontSize: 12, fontWeight: '700', fontFamily: FONTS.bold, color: COLORS.textMuted },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: 16, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: FONTS.bold },
});

export default AdminUserFormScreen;
