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
import { api } from '../api/client';
import { usePhone } from '../hooks/usePhone';

const API_URL = 'https://motospotbackend-production.up.railway.app';

type SupportRequestModalProps = {
  visible: boolean;
  onClose: () => void;
};

const ENQUIRY_OPTIONS = [
  { label: 'New Booking', value: 'NEW_BOOKING' },
  { label: 'Previous Bookings', value: 'PAST_BOOKING' },
  { label: 'Payment Related', value: 'PAYMENT' },
  { label: 'Other', value: 'OTHER' },
];

const SupportRequestModal: React.FC<SupportRequestModalProps> = ({
  visible,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('GENERAL_ENQUIRY');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    userPhone,
    phoneInput,
    setPhoneInput,
    phoneModal,
    phoneLoading,
    openPhoneEdit,
    closePhoneModal,
    savePhone,
  } = usePhone();

  const selectedLabel = useMemo(
    () => ENQUIRY_OPTIONS.find((item) => item.value === selectedCategory)?.label || 'General Enquiry',
    [selectedCategory]
  );

  const formattedPhone = useMemo(() => {
    if (!userPhone) return null;
    const digits = userPhone.replace(/\D/g, '');
    const local = digits.startsWith('91') && digits.length > 10 ? digits.slice(-10) : digits;
    return `+91 ${local}`;
  }, [userPhone]);

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

      const response = await api.post('/support/', payload, {
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
        const status = error.response?.status;
        const detail = error.response?.data?.detail;

        const isAuthError =
          status === 401 ||
          detail === 'Token expired' ||
          detail === 'Could not validate credentials';

        if (isAuthError) {
          return;
        }

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

          {/* Phone number row */}
          <View style={styles.phoneRow}>
            <View style={styles.phoneInfo}>
              <Text style={styles.label}>Contact Number</Text>
              <Text style={styles.phoneValue}>
                {formattedPhone || 'No number added'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.phoneEditBtn}
              onPress={openPhoneEdit}
              activeOpacity={0.85}
            >
              <Text style={styles.phoneEditBtnText}>
                {userPhone ? 'Edit' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>

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

      {/* Phone edit modal (nested) */}
      <Modal
        visible={phoneModal}
        transparent
        animationType="fade"
        onRequestClose={closePhoneModal}
      >
        <View style={styles.overlay}>
          <View style={styles.phoneSheet}>
            <Text style={styles.title}>
              {userPhone ? 'Update Phone Number' : 'Add Phone Number'}
            </Text>
            <Text style={styles.subtitle}>
              We'll use this number to contact you about your request.
            </Text>

            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.phoneInputWrap}>
              <Text style={styles.phonePrefix}>+91</Text>
              <TextInput
                style={styles.phoneInput}
                value={phoneInput}
                onChangeText={(text) => setPhoneInput(text.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit number"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={closePhoneModal}
                disabled={phoneLoading}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, phoneLoading && { opacity: 0.7 }]}
                onPress={savePhone}
                disabled={phoneLoading}
              >
                {phoneLoading ? (
                  <ActivityIndicator color="#08110a" />
                ) : (
                  <Text style={styles.submitBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  phoneSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
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
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  phoneInfo: {
    flex: 1,
  },
  phoneValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 2,
  },
  phoneEditBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  phoneEditBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  phoneInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
  },
  phonePrefix: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
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