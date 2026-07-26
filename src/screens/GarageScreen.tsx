import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useMyBikes, MY_BIKES_QUERY_KEY, Bike } from '../hooks/useMyBikes';

const API_URL = 'https://motospotbackend-production.up.railway.app';

const COLORS = {
  bg: '#050505',
  surface: '#0D0F10',
  surfaceSoft: '#121416',
  surfaceElevated: '#181B1D',
  border: '#23272A',
  borderSoft: '#1A1D20',

  text: '#F5F7F2',
  textSecondary: '#C7CEC7',
  textMuted: '#8B948C',

  primary: '#A6F400',
  primarySoft: 'rgba(166, 244, 0, 0.12)',

  primaryDim: '#4F7D08',
  primaryDimSoft: 'rgba(79, 125, 8, 0.14)',
  primaryDimBorder: 'rgba(79, 125, 8, 0.28)',
};

export default function GarageScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const { bikes, isLoading, isFetching, refetch } = useMyBikes();

  const renderBikeItem = ({ item }: { item: Bike }) => (
    <View style={styles.bikeCard}>
      <View style={styles.bikeIconWrap}>
        <Ionicons name="bicycle" size={20} color={COLORS.primary} />
      </View>

      <View style={styles.bikeInfo}>
        <Text style={styles.bikeCompany}>{item.company_name || 'Unknown brand'}</Text>
        <Text style={styles.bikeModel}>{item.model_name || 'Unknown model'}</Text>

        <View style={styles.bikeMetaRow}>
          {!!item.registration_number && (
            <View style={styles.regBadge}>
              <Text style={styles.bikeReg}>{item.registration_number}</Text>
            </View>
          )}
          {!!item.purchase_year && (
            <View style={styles.yearBadge}>
              <Text style={styles.bikeYear}>{item.purchase_year}</Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={styles.editIconBtn}
        onPress={() => navigation.navigate('BikeForm', { bike: item })}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Edit bike"
      >
        <Ionicons name="create-outline" size={18} color={COLORS.textMuted} />
      </TouchableOpacity>
    </View>
  );

  const emptyState = (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="bicycle" size={30} color={COLORS.primary} />
      </View>

      <Text style={styles.emptyTitle}>No bikes in your garage</Text>
      <Text style={styles.emptyText}>
        Add your first bike to manage it here and use it during booking.
      </Text>

      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.primaryButton}
        onPress={() => navigation.navigate('BikeForm')}
      >
        <Ionicons name="add" size={18} color="#050505" />
        <Text style={styles.primaryButtonText}>Add bike</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your garage...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <View style={styles.wrapper}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>GARAGE</Text>
            <Text style={styles.headerTitle}>My bikes</Text>
            <Text style={styles.headerSubtitle}>Manage your bikes and update details.</Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{bikes.length}</Text>
          </View>
        </View>

        <FlatList
          data={bikes}
          keyExtractor={(item, index) => String(item.id ?? index)}
          renderItem={renderBikeItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={emptyState}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        />

        {bikes.length > 0 && (
          <View style={styles.footer}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.primaryButton}
              onPress={() => navigation.navigate('BikeForm')}
            >
              <Ionicons name="add" size={18} color="#050505" />
              <Text style={styles.primaryButtonText}>Add another bike</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  wrapper: { flex: 1, backgroundColor: COLORS.bg },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 15, color: COLORS.textMuted },

  header: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  headerTitle: { fontSize: 26, fontWeight: '700', color: COLORS.text, marginBottom: 5 },
  headerSubtitle: { fontSize: 14, lineHeight: 21, color: COLORS.textSecondary, maxWidth: '92%' },

  countBadge: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(166, 244, 0, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },

  listContent: { padding: 18, paddingBottom: 120 },

  bikeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  
  bikeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(166, 244, 0, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bikeInfo: { flex: 1 },
  bikeCompany: { fontSize: 17, fontWeight: '600', color: COLORS.text, marginBottom: 3 },
  bikeModel: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 10 },

  bikeMetaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  regBadge: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(166, 244, 0, 0.18)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 4,
  },
  bikeReg: { fontSize: 12, fontWeight: '700', color: COLORS.primary, letterSpacing: 0.4 },
  yearBadge: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginBottom: 4,
  },
  bikeYear: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },

  editIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 12,
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(166, 244, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 21, fontWeight: '700', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 15, lineHeight: 22, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 18 },

  footer: { position: 'absolute', left: 18, right: 18, bottom: 18 },
  primaryButton: {
    backgroundColor: COLORS.primary,
    minHeight: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: '#050505', fontSize: 16, fontWeight: '700' },
});