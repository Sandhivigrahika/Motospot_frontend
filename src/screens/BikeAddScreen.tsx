




import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

const API_URL = 'https://motospotbackend-production.up.railway.app';

interface Company {
  id: string;
  company_name: string;
}

interface Model {
  id: string;
  model_name: string;
  company_id: string;
}

export default function BikeAddScreen({navigation}: any) {
  //const navigation = useNavigation();
  //  Loading state
  const [loading, setLoading] = useState(false);

  //  Dropdown open states
  const [openCompany, setOpenCompany] = useState(false); //decides if company and model dropdown is open - without state react cannot trackdown open/close
  const [openModel, setOpenModel] = useState(false);

  //  Dropdown selected values
  const [companyValue, setCompanyValue] = useState<string | null>(null);
  const [modelValue, setModelValue] = useState<string | null>(null);
  // store the "selected dropdown" values it's different than the backend data one because it stores the data fetched from the backend
  //eg - companyValue="12", modelValue="7" initially none because the user hasn't selected anything.

  //  Backend data
  const [companies, setCompanies] = useState<Company[]>([]); //these hold the lists fetched from the backend
  // setCompanies([{id: 1, name: "Honda"}, {id:2, name:"Yamaha"}])
  const [models, setModels] = useState<Model[]>([]); //same as above

  //  Form state
  const [form, setForm] = useState({
    company_id: '',
    model_id: '',
    reg_no: '',
    purchase_year: ''
  });

// Comment - This is the form object storing input fields, so instead of having 4 separate useStates, you grouped them.

  // ===============================
  // Load Dropdown Data
  // ===============================
  const loadCompanies = async () => {  //calls you backend API /user/companies-> waits for response -> companiesRes -> companiesRes.data
    try {
      console.log(' calling companies API...');
      const companiesRes = await axios.get(`${API_URL}/user/companies`);
      console.log('Raw response: ', companiesRes);
      console.log('companies.data:',companiesRes.data);
      console.log('Type of data.data:', typeof companiesRes.data);

      setCompanies(companiesRes.data || []); //setting function from [companies, setCompanies]


    } catch (err: any) {
          Alert.alert("Error", JSON.stringify(err.response?.data?.detail || err.message));
      //console.error('Full error:', err.response?.data || err.message)
      
    }
  };

  //========================================
  // Load Companies once the screen loads
  //========================================
  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    //If user clears company selection, reset everything
    if(!companyValue) {
      setModels([]);
      setModelValue(null);

      setForm(prev => ({
        ...prev,
        company_id: "",
        model_id: ''
      }));

      return;
    }

    //update form when company changes
    setForm(prev => ({
      ...prev, 
      company_id: companyValue,
      model_id: ''

    }));
    // reset model dropdown
    setModelValue(null);
    setModels([]);


    //fetch model for the selected company
    const loadModels = async() => { 
      try {
        const modelsRes = await axios.get(`${API_URL}/user/bike-models`, {
          params: {company_id: companyValue}
        });

        console.log("Models raw Response:",modelsRes.data);

        setModels(modelsRes.data || []);
      } catch (err: any) {
          Alert.alert("Error", JSON.stringify(err.response?.data?.detail || err.message));
       }
      

    };

    loadModels();
  }, [companyValue]);

// What happens here - 
// when user selects company
// form.company_id is updated
// form.model_id is reset
// model dropdown resets
// models list clear
// API is called with company_id
// models get loaded

  // ===============================
  // Sync dropdown → form
  // ===============================
  
// when modelValue changes, you update form.model_id
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      model_id: modelValue || ''
    }));
  }, [modelValue]);

  // ===============================
  // Add Bike
  // ===============================
  const addBike = async () => {
    if (!form.company_id || !form.model_id || !form.reg_no || !form.purchase_year) {
      Alert.alert('Error', 'Fill all fields');
      return;
    }


    setLoading(true);

    try {
      const token = await SecureStore.getItemAsync('accessToken');

      if (!token) {
        Alert.alert("Error","Login Expired. Please login again")
        return; 
      }
      const payload = { 
        ...form,
        fuel_type:"petrol",
      };

      await axios.post(
        `${API_URL}/bikes/add`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert('Success', 'Bike added! 🎉');
      navigation.goBack();

    }catch (err: any) {
        const detail = err.response?.data?.detail;

        Alert.alert(
          "Error",
          typeof detail === "string"
            ? detail
            : JSON.stringify(detail || err.message)
  );
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // UI
  // ===============================
  return (
  <ScrollView
    contentContainerStyle={styles.scrollContainer}
    keyboardShouldPersistTaps="handled"
  >
    <View style={styles.formCard}>
      <Text style={styles.title}>Add Bike</Text>

      <DropDownPicker
        open={openCompany}
        value={companyValue}
        items={(companies || []).map(c => ({
          label: c.company_name || 'Unknown',
          value: String(c.id)
        }))}
        setOpen={setOpenCompany}
        setValue={setCompanyValue}
        placeholder="Select Company"
        zIndex={2000}
      />

      <DropDownPicker
        open={openModel}
        value={modelValue}
        items={(models || []).map(m => ({
          label: m.model_name || "Unknown",
          value: String(m.id)
        }))}
        setOpen={setOpenModel}
        setValue={setModelValue}
        placeholder="Select Model"
        disabled={!companyValue}
        zIndex={1000}
      />

      <TextInput
        style={styles.input}
        placeholder="Registration Number"
        value={form.reg_no}
        onChangeText={(text) =>
          setForm(prev => ({ ...prev, reg_no: text }))
        }
      />

      <TextInput
        style={styles.input}
        placeholder="Purchase Year"
        keyboardType="numeric"
        value={form.purchase_year}
        onChangeText={(text) =>
          setForm(prev => ({ ...prev, purchase_year: text }))
        }
      />

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <Button title="Add Bike" onPress={addBike} />
      )}
    </View>
  </ScrollView>
);
}


const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2B2B2B"
  },
  formCard: {
    width: "95%",
    backgroundColor: "#A5D6A7",
    padding: 20,
    borderRadius: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: "center"
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    marginVertical: 12,
    borderRadius: 8
  }
});
