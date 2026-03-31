//src\components\PhoneCard.tsx

import React from 'react';
import {View, Text, TouchableOpacity, TextInput, ActivityIndicator, Modal, 
    StyleSheet, Platform} from 'react-native';

import { KeyboardAvoidingView } from 'react-native';
import {usePhone} from '../hooks/usePhone';

interface PhoneCardProps {
    title?: string;
    requiredHint?: string;
}

export const PhoneCard: React.FC<PhoneCardProps> = ({
    title = 'Contact Number',
    requiredHint= 'Requred for admin to contact you',
}) => {
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

  return (
    <>
      <View style={styles.phoneCard}>
        {userPhone ? (
          <>
            <View style={styles.phoneRow}>
              <Text style={styles.phoneIcon}>📱</Text>
              <Text style={styles.phoneNumber}>{userPhone}</Text>
            </View>
            <TouchableOpacity onPress={openPhoneEdit}>
              <Text style={styles.phoneEditBtn}>Edit</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.addPhoneBtn} onPress={openPhoneEdit}>
            <Text style={styles.addPhoneBtnText}>+ Add phone number</Text>
            <Text style={styles.addPhoneHint}>{requiredHint}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Phone Modal */}
      <Modal visible={phoneModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>
                {userPhone ? 'Update Phone Number' : 'Add Phone Number'}
              </Text>
              <Text style={styles.phoneModalHint}>
                Enter your 10-digit mobile number
              </Text>
              <View style={styles.phoneInputRow}>
                <Text style={styles.phonePrefix}>+91</Text>
                <TextInput
                  style={styles.phoneInputField}
                  value={phoneInput}
                  onChangeText={(text) => setPhoneInput(text.replace(/\\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  keyboardType="phone-pad"
                  maxLength={10}
                  autoFocus
                />
              </View>
              <TouchableOpacity
                style={[styles.phoneSaveBtn, phoneLoading && { opacity: 0.6 }]}
                onPress={savePhone}
                disabled={phoneLoading}
              >
                {phoneLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.phoneSaveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalClose} onPress={closePhoneModal}>
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};



const styles = StyleSheet.create({
  phoneCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 12,
    elevation: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  phoneIcon: {
    fontSize: 16,
  },

  phoneNumber: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
  },

  phoneEditBtn: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },

  addPhoneBtn: {
    flex: 1,
  },

  addPhoneBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3b82f6',
  },

  addPhoneHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },

  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },

  phoneModalHint: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 12,
  },

  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    marginBottom: 16,
    overflow: 'hidden',
  },

  phonePrefix: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    backgroundColor: '#f1f5f9',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },

  phoneInputField: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1e293b',
  },

  phoneSaveBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  phoneSaveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  modalClose: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },

  modalCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
});
