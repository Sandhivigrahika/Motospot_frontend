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
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
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
  primaryDimSoft:  'rgba(79, 125, 8, 0.14)',
  primaryDimBorder: 'rgba(79, 125, 8, 0.28)',
};

export default function GarageScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const { bikes, isLoading, isFetching, refetch } = useMyBikes();

  const renderBikeItem = ({ item }: { item: Bike }) => (
    <View style={styles.bikeCard}>
      <View style={styles.bikeTopRow}>
        <View style={styles.bikeIconWrap}>
          <Text style={styles.bikeIcon}>🏍️</Text>
        </View>

        <View style={styles.bikeInfo}>
          <Text style={styles.bikeCompany}>{item.company_name || 'Unknown Brand'}</Text>
          <Text style={styles.bikeModel}>{item.model_name || 'Unknown Model'}</Text>

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
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.editButton}
          onPress={() => navigation.navigate('BikeForm', { bike: item })}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>

        {/* Delete button removed; no Delete logic here */}
      </View>
    </View>
  );

  const emptyState = (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconWrap}>
        <Text style={styles.emptyIcon}>🏍️</Text>
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
        <Text style={styles.primaryButtonText}>+ Add Bike</Text>
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
          <View>
            <Text style={styles.headerEyebrow}>GARAGE</Text>
            <Text style={styles.headerTitle}>My Bikes</Text>
            <Text style={styles.headerSubtitle}>
              Manage your bikes and update details.
            </Text>
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
              <Text style={styles.primaryButtonText}>+ Add Another Bike</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  wrapper: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textMuted,
  },

  header: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },

  headerEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1.1,
    marginBottom: 4,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },

  headerSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    maxWidth: '92%',
  },

  countBadge: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(166, 244, 0, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  countBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },

  listContent: {
    padding: 18,
    paddingBottom: 120,
  },

  bikeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    //shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 5,
  },

  bikeTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  bikeIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(166, 244, 0, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  bikeIcon: {
    fontSize: 22,
  },

  bikeInfo: {
    flex: 1,
  },

  bikeCompany: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 3,
  },

  bikeModel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },

  bikeMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },

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

  bikeReg: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.4,
  },

  yearBadge: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginBottom: 4,
  },

  bikeYear: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },

  actionsRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },

  editButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primaryDim,
    justifyContent: 'center',
    borderWidth: 1,
    alignItems: 'center',
    borderColor: COLORS.primaryDimBorder,
  },

  editButtonText: {
    color: '#F5F7F2',
    fontSize: 15,
    fontWeight: '800',
  },

  // Delete button styles removed from here
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
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

  emptyIcon: {
    fontSize: 30,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 18,
  },

  footer: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
  },

  primaryButton: {
    backgroundColor: COLORS.primary,
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },

  primaryButtonText: {
    color: '#050505',
    fontSize: 16,
    fontWeight: '800',
  },
});