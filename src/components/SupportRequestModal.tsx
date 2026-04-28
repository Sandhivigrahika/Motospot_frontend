import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const API_URL = 'https://motospotbackend-production.up.railway.app';

type SupportRequestModalProps = {
  visible: boolean;
  onClose: () => void;
};

const ENQUIRY_OPTIONS = [
  { label: 'General Enquiry', value: 'GENERAL_ENQUIRY' },
  { label: 'Booking Issue', value: 'BOOKING_ISSUE' },
  { label: 'Payment Issue', value: 'PAYMENT_ISSUE' },
  { label: 'Service Complaint', value: 'SERVICE_COMPLAINT' },
  { label: 'Pickup / Delivery', value: 'PICKUP_DELIVERY' },
  { label: 'Other', value: 'OTHER' },
];

const SupportRequestModal: React.FC<SupportRequestModalProps> = ({
  visible,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('GENERAL_ENQUIRY');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedLabel = useMemo(
    () => ENQUIRY_OPTIONS.find((item) => item.value === selectedCategory)?.label || 'General Enquiry',
    [selectedCategory]
  );

  const resetState = () => {
    setSelectedCategory('GENERAL_ENQUIRY');
    setMessage('');
  };

  const handleClose = () => {
    if (loading) return;
    resetState();
    onClose();
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const token = await SecureStore.getItemAsync('accessToken');

      if (!token) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      const payload = {
        enquiry_category: selectedCategory,
        message: message.trim() || undefined,
      };

      const response = await axios.post(`${API_URL}/support/`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200 || response.status === 201) {
        Alert.alert('Request sent', `Support request created under ${selectedLabel}`);
        resetState();
        onClose();
      } else {
        Alert.alert('Success', 'Support request created');
        resetState();
        onClose();
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;

        if (typeof detail === 'string') {
          Alert.alert('Error', detail);
        } else {
          Alert.alert('Error', 'Could not create support request');
        }
      } else if (error instanceof Error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Could not create support request');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Need Help?</Text>
          <Text style={styles.subtitle}>
            Create a support request and the admin team will contact you.
          </Text>

          <Text style={styles.label}>Enquiry Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {ENQUIRY_OPTIONS.map((item) => {
              const active = selectedCategory === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(item.value)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[styles.categoryChipText, active && styles.categoryChipTextActive]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>Message</Text>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Describe your issue or request"
            placeholderTextColor="#94a3b8"
            multiline
            textAlignVertical="top"
            maxLength={500}
          />

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={loading}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#08110a" />
              ) : (
                <Text style={styles.submitBtnText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default SupportRequestModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
    maxHeight: '78%',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
    color: '#64748b',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 10,
  },
  categoryRow: {
    paddingBottom: 6,
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  categoryChipTextActive: {
    color: '#166534',
  },
  messageInput: {
    minHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  submitBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A6F400',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#08110a',
  },
});