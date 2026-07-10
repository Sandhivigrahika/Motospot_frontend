// src/screens/BookingListScreen.tsx

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';

import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { api } from '../api/client';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

const API_URL = 'https://motospotbackend-production.up.railway.app';

interface Booking {
  id: string;
  bike_id: string;
  company_name: string;
  model_name: string;
  registration_number: string;
  preferred_date: string;
  preferred_time: string;
  pickup_address: string | null;
  manual_address: string | null;
  current_condition: string;
  status:
    | 'confirmed'
    | 'bike_picked_up'
    | 'reached_service_centre'
    | 'under_process'
    | 'bike_left_service_centre'
    | 'cancelled'
    | 'rejected'
    | 'delivered'
    | 'completed';
  notes: string;
}

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
  textDark: '#050505',

  primary: '#A6F400',
  primaryDark: '#7ECC00',
  primarySoft: 'rgba(166, 244, 0, 0.12)',

  greenBg: 'rgba(166, 244, 0, 0.12)',
  greenText: '#A6F400',

  amberBg: 'rgba(245, 158, 11, 0.12)',
  amberText: '#FBBF24',

  blueBg: 'rgba(59, 130, 246, 0.12)',
  blueText: '#60A5FA',

  purpleBg: 'rgba(139, 92, 246, 0.12)',
  purpleText: '#A78BFA',

  redBg: 'rgba(255, 90, 95, 0.12)',
  redText: '#FF8A8F',

  shadow: '#000000',
};

// ✅ manual date parsing avoids UTC midnight → IST day-shift bug
const formatDateTime = (dateStr: string, timeStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const formattedDate = date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinute = String(minutes).padStart(2, '0');

  return `${formattedDate} • ${displayHour}:${displayMinute} ${period}`;
};

const BookingsListScreen = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [feedbackVisible, setfeedbackVisible] = useState(false);
  const [feedbackBookingId, setFeedbackBookingId] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [submittedFeedback, setsubmittedFeedback] = useState<Set<string>>(new Set());

  const loadBookings = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const token = await SecureStore.getItemAsync('accessToken');

      const response = await api.get('/bookings/me?status=active', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setBookings(response.data);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const detail = error.response?.data?.detail;

        const isAuthError =
          status === 401 ||
          detail === 'Token expired' ||
          detail === 'Could not validate credentials';

        if (isAuthError) {
          return;
        }
      }

      console.log('Bookings load error:', error);
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refetch every time the screen comes into focus (after booking, cancelling, etc.)
  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [])
  );

  const handleCancel = async (bookingId: string) => {
  Alert.alert(
    'Cancel Booking',
    'Are you sure you want to cancel this booking?',
    [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await SecureStore.getItemAsync('accessToken');
            await api.post(
              `${API_URL}/bookings/${bookingId}/cancel`,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );
            Alert.alert('Done', 'Booking cancelled successfully');
            loadBookings();
          } catch (error: any) {
            // The request threw — but the cancel may have succeeded server-side.
            // Re-fetch and check the actual state before deciding what to show.
            try {
              const token = await SecureStore.getItemAsync('accessToken');
              const res = await api.get('/bookings/me?status=active', {
                headers: { Authorization: `Bearer ${token}` },
              });
              const stillActive = res.data.some((b: Booking) => b.id === bookingId);
              setBookings(res.data);

              if (!stillActive) {
                // It's gone from the active list → cancel actually worked
                Alert.alert('Done', 'Booking cancelled successfully');
              } else {
                // Genuinely still active → real failure
                const detail = error?.response?.data?.detail;
                Alert.alert('Error', detail || 'Could not cancel booking. Please try again.');
              }
            } catch {
              // Couldn't even re-check (network still down) — refresh and stay quiet-ish
              loadBookings();
              Alert.alert(
                'Check your connection',
                'We could not confirm the cancellation. Please refresh in a moment.'
              );
            }
          }
        },
      },
    ]
  );
};

  const submitFeedback = async () => {
    if (!feedbackBookingId) return;
    if (rating === 0) {
      Alert.alert('Rating required', 'Please select at least 1 star');
      return;
    }

    try {
      const token = await SecureStore.getItemAsync('accessToken');

      await api.post(
        `${API_URL}/bookings/${feedbackBookingId}/feedback`,
        {
          booking_id: feedbackBookingId,
          rating,
          comment: comment.trim() || null,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert('Thank you!', 'Your feedback has been submitted');

      setsubmittedFeedback(prev => {
        const newSet = new Set(prev);
        newSet.add(feedbackBookingId);
        return newSet;
      });
      setfeedbackVisible(false);
      setFeedbackBookingId(null);
      setRating(0);
      setComment('');
    } catch (error) {
      console.log('Feedback error:', error);
      Alert.alert('Error', 'Could not submit feedback. Try again.');
    }
  };

  const getStatusConfig = (status: string) => {
    const config: Record<string, { color: string; bgColor: string }> = {
      confirmed: { color: COLORS.greenText, bgColor: COLORS.greenBg },
      bike_picked_up: { color: COLORS.amberText, bgColor: COLORS.amberBg },
      reached_service_centre: { color: COLORS.amberText, bgColor: COLORS.amberBg },
      under_process: { color: COLORS.purpleText, bgColor: COLORS.purpleBg },
      bike_left_service_centre: { color: COLORS.blueText, bgColor: COLORS.blueBg },
      delivered: { color: COLORS.greenText, bgColor: COLORS.greenBg },
      completed: { color: COLORS.greenText, bgColor: COLORS.greenBg },
      cancelled: { color: COLORS.redText, bgColor: COLORS.redBg },
      rejected: { color: COLORS.redText, bgColor: COLORS.redBg },
    };
    return config[status] || { color: COLORS.textMuted, bgColor: COLORS.surfaceElevated };
  };

  const renderStatusBadge = (status: string) => {
    const statusText = status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    const { color, bgColor } = getStatusConfig(status);

    return (
      <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
        <Text style={[styles.statusText, { color }]} numberOfLines={1} ellipsizeMode="tail">
          {statusText}
        </Text>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Text style={styles.emptyIcon}>🏍️</Text>
      </View>
      <Text style={styles.emptyTitle}>No Active Bookings</Text>
      <Text style={styles.emptySubtitle}>
        Your active service bookings will appear here
      </Text>
    </View>
  );

  const renderStars = () => {
    const stars = [1, 2, 3, 4, 5];
    return (
      <View style={styles.starsRow}>
        {stars.map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setRating(s)}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${s} star${s > 1 ? 's' : ''}`}
          >
            <Text style={[styles.star, rating >= s && styles.starActive]}>★</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.flex}>
            <FlatList
              data={bookings}
              keyExtractor={(item) => item.id}
              refreshing={refreshing}
              onRefresh={() => loadBookings(true)}
              ListEmptyComponent={renderEmptyState}
              renderItem={({ item }) => (
                <View style={styles.bookingCard}>
                  <View style={styles.headerRow}>
                    <View style={styles.bikeSection}>
                      <Text style={styles.companyName} numberOfLines={1}>
                        {item.company_name}
                      </Text>
                      <Text style={styles.modelName} numberOfLines={1}>
                        {item.model_name}
                      </Text>
                      <Text style={styles.regNumber} numberOfLines={1}>
                        {item.registration_number}
                      </Text>
                    </View>
                    {renderStatusBadge(item.status)}
                  </View>

                  <Text style={styles.dateTime}>
                    🗓 {formatDateTime(item.preferred_date, item.preferred_time)}
                  </Text>

                  <Text style={styles.conditionText}>
                    Condition: {item.current_condition}
                  </Text>

                  <Text style={styles.addressText}>
                    {item.manual_address || item.pickup_address || '📍 No address provided'}
                  </Text>

                  {item.notes ? <Text style={styles.notesText}>📝 {item.notes}</Text> : null}

                  {item.status === 'confirmed' && !submittedFeedback.has(item.id) && (
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => handleCancel(item.id)}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.cancelButtonText}>Cancel Booking</Text>
                    </TouchableOpacity>
                  )}

                  {item.status === 'completed' && !submittedFeedback.has(item.id) && (
                    <TouchableOpacity
                      disabled={submittedFeedback.has(item.id)}
                      style={[
                        styles.feedbackButton,
                        submittedFeedback.has(item.id) && {
                          opacity: 0.5,
                        },
                      ]}
                    >
                      <Text style={styles.feedbackButtonText}>
                        {submittedFeedback.has(item.id) ? 'Feedback Submitted' : 'Rate Service'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              style={styles.list}
              contentContainerStyle={styles.container}
              showsVerticalScrollIndicator={false}
            />

            <Modal
              visible={feedbackVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setfeedbackVisible(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Rate your service</Text>

                  {renderStars()}

                  <TextInput
                    style={styles.commentInput}
                    placeholder="Add a note (optional)"
                    placeholderTextColor={COLORS.textMuted}
                    multiline
                    value={comment}
                    onChangeText={setComment}
                  />

                  <View style={styles.modalButtonsRow}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalCancel]}
                      onPress={() => setfeedbackVisible(false)}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.modalCancelText}>Later</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalSubmit]}
                      onPress={submitFeedback}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.modalSubmitText}>Submit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  container: {
    padding: 20,
    backgroundColor: COLORS.bg,
    flexGrow: 1,
    paddingBottom: 36,
  },
  list: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(166, 244, 0, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyIcon: { fontSize: 30 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  bookingCard: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bikeSection: { flex: 1, flexShrink: 1, marginRight: 12 },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  modelName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  regNumber: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  dateTime: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 70,
    maxWidth: 120,
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  conditionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  cancelButton: {
    backgroundColor: COLORS.redBg,
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 95, 0.24)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: COLORS.redText,
    fontWeight: '700',
    fontSize: 16,
  },
  feedbackButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  feedbackButtonText: {
    color: COLORS.textDark,
    fontWeight: '800',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  star: {
    fontSize: 32,
    color: '#3A3F42',
    marginHorizontal: 4,
  },
  starActive: {
    color: COLORS.primary,
  },
  commentInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 16,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancel: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalSubmit: {
    backgroundColor: COLORS.primary,
  },
  modalCancelText: {
    color: COLORS.text,
    fontWeight: '700',
  },
  modalSubmitText: {
    color: COLORS.textDark,
    fontWeight: '800',
  },
});

export default BookingsListScreen;