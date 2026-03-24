// src/screens/BookingListScreen.tsx

import React, { useState, useEffect } from 'react';
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
} from 'react-native';

import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';




const API_URL = 'https://motospotbackend-production.up.railway.app';

interface Booking {
    id: string;
    bike_id: string;
    company_name: string;        // ✅ flat — was nested in bike{}
    model_name: string;          // ✅ flat — was nested in bike{}
    registration_number: string; // ✅ flat + correct field name (was registration_no)
    preferred_date: string;
    preferred_time: string;
    pickup_address: string | null;
    manual_address: string | null;
    current_condition: string;
    status: 'confirmed' | 'bike_picked_up' | 'reached_service_centre' |
            'under_process' | 'bike_left_service_centre' | 'cancelled' |
            'rejected' | 'delivered' | 'completed';
    notes: string;
}

// ✅ FIXED: manual date parsing avoids UTC midnight → IST day-shift bug
const formatDateTime = (dateStr: string, timeStr: string): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // local time, no UTC shift
    const formattedDate = date.toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
    });

    // timeStr may come as "10:00:00" or "10:00" — handle both
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    const displayMinute = String(minutes).padStart(2, '0');

    return `${formattedDate} • ${displayHour}:${displayMinute} ${period}`;
};

const BookingsListScreen = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    const [feedbackVisible, setfeedbackVisible] = useState(false);
    const [feedbackBookingId, setFeedbackBookingId] = useState<string | null>(null);
    const [rating, setRating] = useState<number>(0);
    const [comment, setComment] = useState<string>('');
    const [submittedFeedback, setsubmittedFeedback] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadBookings();
    }, []);

    const loadBookings = async () => {
        try {
            const token = await SecureStore.getItemAsync('accessToken');
            // ✅ FIXED: added ?status=active — backend requires this param
            const response = await axios.get(`${API_URL}/bookings/me?status=active`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setBookings(response.data);
        } catch (error) {
            console.log('Bookings load error:', error);
            Alert.alert('Error', 'Failed to load bookings');
        } finally {
            setLoading(false);
        }
    };

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
                            await axios.post(
                                `${API_URL}/bookings/${bookingId}/cancel`,
                                {},
                                { headers: { Authorization: `Bearer ${token}` } }
                            );
                            Alert.alert('Done', 'Booking cancelled successfully');
                            loadBookings(); // refresh list
                        } catch (error) {
                            Alert.alert('Error', 'Could not cancel booking. Try again.');
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

        await axios.post(
            // ⬇️ adjust if your real endpoint is different
            //const API_URL = 'https://motospotbackend-production.up.railway.app';
            //POST/bookings/{booking_id}/feedback Add feedback
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

        //Mark this booking as submitted locally
        setsubmittedFeedback(prev => {
            const newSet = new Set(prev);
            newSet.add(feedbackBookingId!);
            return newSet;
        });
        setfeedbackVisible(false);
        setFeedbackBookingId(null);
        setRating(0);
        setComment('');
        // optional: later we can refresh bookings or update local state
    } catch (error) {
        console.log('Feedback error:', error);
        Alert.alert('Error', 'Could not submit feedback. Try again.');
    }
};


    const getStatusConfig = (status: string) => {
        const config: Record<string, { color: string; bgColor: string }> = {
            confirmed: { color: '#10b981', bgColor: '#d1fae5' },
            bike_picked_up: { color: '#f59e0b', bgColor: '#fef3c7' },
            reached_service_centre: { color: '#f59e0b', bgColor: '#fef3c7' },
            under_process: { color: '#8b5cf6', bgColor: '#ede9fe' },
            bike_left_service_centre: { color: '#3b82f6', bgColor: '#dbeafe' },
            delivered: { color: '#059669', bgColor: '#d1fae5' },
            completed: { color: '#059669', bgColor: '#d1fae5' },
            cancelled: { color: '#dc2626', bgColor: '#fee2e2' },
            rejected: { color: '#dc2626', bgColor: '#fee2e2' },
        };
        return config[status] || { color: '#6b7280', bgColor: '#f3f4f6' };
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
            <Text style={styles.emptyTitle}>No Active Bookings</Text>
            <Text style={styles.emptySubtitle}>Your active service bookings will appear here</Text>
        </View>
    );

    const renderStars = () => {
    const stars = [1, 2, 3, 4, 5];
    return (
        <View style={styles.starsRow}>
            {stars.map((s) => (
                <TouchableOpacity key={s} onPress={() => setRating(s)}>
                    <Text style={[styles.star, rating >= s && styles.starActive]}>
                        ★
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <FlatList
                data={bookings}
                keyExtractor={(item) => item.id}
                refreshing={loading}
                onRefresh={loadBookings}
                ListEmptyComponent={renderEmptyState}
                renderItem={({ item }) => (
                    <View style={styles.bookingCard}>

                        {/* Header row: bike info + status badge */}
                        <View style={styles.headerRow}>
                            <View style={styles.bikeSection}>
                                {/* ✅ company_name as primary title */}
                                <Text style={styles.companyName} numberOfLines={1}>
                                    {item.company_name}
                                </Text>
                                {/* ✅ model_name below company */}
                                <Text style={styles.modelName} numberOfLines={1}>
                                    {item.model_name}
                                </Text>
                                {/* ✅ correct field name: registration_number */}
                                <Text style={styles.regNumber} numberOfLines={1}>
                                    {item.registration_number}
                                </Text>
                            </View>
                            {renderStatusBadge(item.status)}
                        </View>

                        {/* Date & Time */}
                        <Text style={styles.dateTime}>
                            🗓 {formatDateTime(item.preferred_date, item.preferred_time)}
                        </Text>

                        {/* Condition */}
                        <Text style={styles.conditionText}>
                            Condition: {item.current_condition}
                        </Text>

                        {/* Address */}
                        

                        <Text style={styles.addressText}>
                            {item['manual_address'] || item['pickup_address'] || '📍 No address provided'}
                        </Text>

                        {/* Notes */}
                        {item.notes ? (
                            <Text style={styles.notesText}>📝 {item.notes}</Text>
                        ) : null}

                        {/* ✅ Cancel only for 'confirmed' — not for in-progress bookings */}
                        {item.status === 'confirmed' && !submittedFeedback.has(item.id) && (
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => handleCancel(item.id)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel Booking</Text>
                            </TouchableOpacity>
                        )}

                        {/* Feedback button only for completed bookings */}
                        {item.status === 'completed' && (
                            <TouchableOpacity
                            style={styles.feedbackButton}
                            onPress={() => {
                                setFeedbackBookingId(item.id);
                                setRating(0);
                                setComment('');
                                setfeedbackVisible(true);
                            }}

                            >
                                <Text style={styles.feedbackButtonText}> Rate Service</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
                style={styles.list}
                contentContainerStyle={styles.container}
            />
            <Modal
    visible={feedbackVisible}
    transparent
    animationType="slide"
    onRequestClose={() => setfeedbackVisible(false)}
>
    <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate your service</Text>

            {renderStars()}

            <TextInput
                style={styles.commentInput}
                placeholder="Add a note (optional)"
                multiline
                value={comment}
                onChangeText={setComment}
            />

            <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                    style={[styles.modalButton, styles.modalCancel]}
                    onPress={() => setfeedbackVisible(false)}
                >
                    <Text style={styles.modalCancelText}>Later</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.modalButton, styles.modalSubmit]}
                    onPress={submitFeedback}
                >
                    <Text style={styles.modalSubmitText}>Submit</Text>
                </TouchableOpacity>
            </View>
        </View>
    </View>
</Modal>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { padding: 20, backgroundColor: '#f8fafc', flexGrow: 1 },
    list: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 80,
    },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 8 },
    emptySubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
    bookingCard: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
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
        color: '#1f2937',
        marginBottom: 2,
    },
    modelName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 2,
    },
    regNumber: {
        fontSize: 13,
        color: '#94a3b8',
        marginBottom: 4,
    },
    dateTime: { fontSize: 14, color: '#374151', marginBottom: 8 },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        minWidth: 70,
        maxWidth: 120,
        alignItems: 'center',
        alignSelf: 'flex-start',
    },
    statusText: { fontSize: 12, fontWeight: '600' },
    conditionText: { fontSize: 14, color: '#6b7280', marginBottom: 6 },
    addressText: { fontSize: 14, color: '#374151', marginBottom: 6 },
    notesText: {
        fontSize: 14,
        color: '#4b5563',
        backgroundColor: '#f9fafb',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    cancelButton: {
        backgroundColor: '#ef4444',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    cancelButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
        feedbackButton: {
        backgroundColor: '#3b82f6',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    feedbackButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
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
        color: '#d1d5db',
        marginHorizontal: 4,
    },
    starActive: {
        color: '#facc15',
    },
    commentInput: {
        minHeight: 80,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        padding: 10,
        textAlignVertical: 'top',
        fontSize: 14,
        color: '#111827',
        marginBottom: 16,
    },
    modalButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    modalButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginLeft: 8,
    },
    modalCancel: {
        backgroundColor: '#e5e7eb',
    },
    modalSubmit: {
        backgroundColor: '#3b82f6',
    },
    modalCancelText: {
        color: '#111827',
        fontWeight: '500',
    },
    modalSubmitText: {
        color: '#fff',
        fontWeight: '600',
    },

});

export default BookingsListScreen;
