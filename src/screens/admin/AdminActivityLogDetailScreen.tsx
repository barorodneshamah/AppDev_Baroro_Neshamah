// src/screens/admin/AdminActivityLogDetailScreen.tsx
import React, { FC } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, FONTS, RADIUS, SHADOW, getRoleColor } from '../../theme';

const Row: FC<{ label: string; value?: any; icon: string }> = ({ label, value, icon }) => (
  value !== undefined && value !== null && value !== '' ? (
    <View style={styles.row}>
      <Icon name={icon} size={18} color={COLORS.textMuted} />
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</Text>
      </View>
    </View>
  ) : null
);

const ACTION_META: Record<string, { color: string; icon: string }> = {
  LOGIN: { color: COLORS.success, icon: 'login' },
  LOGOUT: { color: COLORS.textMuted, icon: 'logout' },
  CREATE: { color: COLORS.info, icon: 'plus-circle-outline' },
  UPDATE: { color: COLORS.warning, icon: 'pencil-circle-outline' },
  DELETE: { color: COLORS.error, icon: 'delete-circle-outline' },
};

const AdminActivityLogDetailScreen: FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const log = route.params?.log ?? {};
  const meta = ACTION_META[log.action] ?? { color: COLORS.textMuted, icon: 'information-outline' };
  const roleColor = getRoleColor(log.userRole ?? '');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Detail</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={[styles.actionIcon, { backgroundColor: meta.color }]}>
            <Icon name={meta.icon} size={24} color="#fff" />
          </View>
          <Text style={styles.actionTitle}>{log.action || 'Activity'}</Text>
          <Text style={styles.description}>{log.description || `${log.action ?? ''} ${log.entityType ?? ''}`.trim()}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleColor + '1A' }]}>
            <Text style={[styles.roleText, { color: roleColor }]}>{(log.userRole ?? 'ROLE_USER').replace('ROLE_', '')}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Row icon="identifier" label="Log ID" value={log.id} />
          <Row icon="account-outline" label="Username" value={log.username} />
          <Row icon="database-outline" label="Entity Type" value={log.entityType} />
          <Row icon="numeric" label="Entity ID" value={log.entityId} />
          <Row icon="tag-outline" label="Entity Name" value={log.entityName} />
          <Row icon="cellphone-link" label="Source" value={log.source === 'mobile' ? 'Mobile App' : log.source || 'Web'} />
          <Row icon="ip-network-outline" label="IP Address" value={log.ipAddress} />
          <Row icon="clock-outline" label="Created At" value={log.createdAt} />
          <Row icon="history" label="Old Data" value={log.oldData} />
          <Row icon="database-edit-outline" label="New Data" value={log.newData} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontFamily: FONTS.display, fontWeight: '700' },
  body: { padding: 16, paddingBottom: 100 },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 18,
    alignItems: 'center',
    marginBottom: 14,
    ...SHADOW.sm,
  },
  actionIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionTitle: { fontSize: 18, fontFamily: FONTS.bold, fontWeight: '800', color: COLORS.textDark },
  description: { fontSize: 13, fontFamily: FONTS.body, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, marginTop: 10 },
  roleText: { fontSize: 11, fontFamily: FONTS.bold, fontWeight: '700' },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 14, ...SHADOW.sm },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 11, fontFamily: FONTS.body, color: COLORS.textMuted },
  rowValue: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textDark, marginTop: 2 },
});

export default AdminActivityLogDetailScreen;
