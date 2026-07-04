'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { 
  User, Building2, MapPin, Palette, CreditCard, 
  Edit3, Save, X, Mail, Phone, Globe, Hash,
  Banknote, FileText, Clock, CheckCircle, AlertCircle,
  Loader2, Camera, ChevronRight, Shield, Award, Image, Upload, Trash2, Plus,
  Map, Link2, ExternalLink
} from 'lucide-react';

interface UserProfile {
  id: string;
  full_name: string;
  name?: string;
  email: string;
  role: string;
  mobile_number: string;
  is_mobile_verified: boolean;
  is_email_verified: boolean;
  auth_provider: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

interface ShowroomData {
  id: string;
  showroom_name: string;
  business_type: string | null;
  gst_number: string | null;
  pan_number: string | null;
  business_registration_type: string | null;
  created_at: string;
  updated_at: string;
}

interface ShowroomAddress {
  id: string;
  showroom_id: string;
  address_line_1: string;
  address_line_2: string | null;
  landmark: string | null;
  state: string;
  city: string;
  pincode: string;
  google_maps_link: string | null;
  latitude: number | null;
  longitude: number | null;
  is_primary: boolean;
  created_at?: string;
}

interface ShowroomBranding {
  id: string;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  official_mobile_number: string | null;
  whatsapp_number: string | null;
  support_email: string | null;
  website_url: string | null;
}

interface BillingConfig {
  id: string;
  invoice_prefix: string;
  default_gst_percentage: number;
  invoice_footer_note: string | null;
  invoice_terms_conditions: string | null;
  authorized_signature_url: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  upi_id: string | null;
  invoice_sequence: number;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showroom, setShowroom] = useState<ShowroomData | null>(null);
  const [addresses, setAddresses] = useState<ShowroomAddress[]>([]);
  const [branding, setBranding] = useState<ShowroomBranding | null>(null);
  const [billing, setBilling] = useState<BillingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Modal states
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<any>({});
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Helper function to get data from storage
  const getFromStorage = (key: string, isJson = true) => {
    let data = localStorage.getItem(key);
    if (data) return isJson ? JSON.parse(data) : data;
    
    data = sessionStorage.getItem(key);
    if (data) return isJson ? JSON.parse(data) : data;
    
    const cookies = document.cookie.split('; ').reduce((acc: any, cookie) => {
      const [cookieKey, cookieValue] = cookie.split('=');
      acc[cookieKey] = decodeURIComponent(cookieValue);
      return acc;
    }, {});
    
    if (cookies[key]) {
      return isJson ? JSON.parse(cookies[key]) : cookies[key];
    }
    
    return null;
  };

  // Update storage
  const updateStorage = (key: string, value: any) => {
    const stringValue = JSON.stringify(value);
    localStorage.setItem(key, stringValue);
    sessionStorage.setItem(key, stringValue);
  };

  // Extract Google Maps embed URL from various formats
  const getGoogleMapsEmbedUrl = (mapsLink: string | null): string | null => {
    if (!mapsLink) return null;
    
    try {
      // For share links (maps.app.goo.gl), we'll use a static map image or just provide the link
      if (mapsLink.includes('maps.app.goo.gl') || mapsLink.includes('goo.gl/maps')) {
        // For share links, we can't directly embed without API key
        // Return null to show the fallback UI
        return null;
      }
      // Check if it's a regular Google Maps URL
      else if (mapsLink.includes('google.com/maps')) {
        // If it's already an embed URL
        if (mapsLink.includes('embed')) {
          return mapsLink;
        }
        
        // Try to extract coordinates for static map (optional, requires API key)
        const coordsMatch = mapsLink.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (coordsMatch) {
          // Return a static map image URL (requires API key)
          // Without API key, return null to use fallback
          return null;
        }
        
        // For place URLs, we could convert to embed but need API key
        return null;
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing maps URL:', error);
      return null;
    }
  };

  // Helper to validate Google Maps link
  const isValidGoogleMapsLink = (link: string | null): boolean => {
    if (!link) return false;
    return link.includes('google.com/maps') || 
           link.includes('maps.app.goo.gl') ||
           link.includes('goo.gl/maps');
  };

  useEffect(() => {
    const loadAllData = async () => {
      try {
        // Get user and showroom from storage
        const userData = getFromStorage('user', true);
        const showroomData = getFromStorage('showroom', true);
        
        if (userData) {
          setUser(userData);
        }
        
        if (showroomData?.id) {
          setShowroom(showroomData);
          // Fetch fresh data from database
          await fetchShowroomDetails(showroomData.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };
    
    loadAllData();
  }, []);

  // Fetch all showroom details from database
  async function fetchShowroomDetails(showroomId: string) {
    try {
      // Fetch addresses
      const { data: addressData, error: addressError } = await supabase
        .from('showroom_addresses')
        .select('*')
        .eq('showroom_id', showroomId)
        .order('is_primary', { ascending: false });
      
      if (addressError) throw addressError;
      if (addressData) {
        setAddresses(addressData);
        updateStorage('showroom_addresses', addressData);
      }
      
      // Fetch branding
      const { data: brandingData, error: brandingError } = await supabase
        .from('showroom_branding')
        .select('*')
        .eq('showroom_id', showroomId)
        .maybeSingle();
      
      if (brandingError && brandingError.code !== 'PGRST116') throw brandingError;
      if (brandingData) {
        setBranding(brandingData);
        updateStorage('showroom_branding', brandingData);
      }
      
      // Fetch billing
      const { data: billingData, error: billingError } = await supabase
        .from('billing_configurations')
        .select('*')
        .eq('showroom_id', showroomId)
        .maybeSingle();
      
      if (billingError && billingError.code !== 'PGRST116') throw billingError;
      if (billingData) {
        setBilling(billingData);
        updateStorage('billing_configuration', billingData);
      }
      
    } catch (error) {
      console.error('Error fetching showroom details:', error);
      showNotification('error', 'Failed to load showroom details');
    } finally {
      setLoading(false);
    }
  }

  // Upload file to Supabase storage
  async function uploadFile(file: File, bucket: string, path: string): Promise<string | null> {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${path}.${fileExt}`;
      const filePath = `${showroom?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      showNotification('error', 'Failed to upload file');
      return null;
    } finally {
      setUploading(false);
    }
  }

  // Handle image upload for branding/billing
  async function handleImageUpload(field: string, bucket: string) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const publicUrl = await uploadFile(file, bucket, field);
      if (publicUrl) {
        setEditingData({ ...editingData, [field]: publicUrl });
        showNotification('success', 'Image uploaded successfully');
      }
    };
    input.click();
  }

  function openModal(section: string, data: any) {
    setActiveModal(section);
    setEditingData({ ...data });
  }

  function openAddressModal(address: ShowroomAddress) {
    setSelectedAddressId(address.id);
    setActiveModal('address');
    setEditingData({ ...address });
  }

  // Add new address (opens modal with empty form)
  async function addNewAddress() {
    if (!showroom?.id) return;
    
    const tempAddress: ShowroomAddress = {
      id: 'temp-' + Date.now(),
      showroom_id: showroom.id,
      address_line_1: '',
      address_line_2: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      google_maps_link: null,
      latitude: null,
      longitude: null,
      is_primary: addresses.length === 0
    };
    
    setAddresses([...addresses, tempAddress]);
    openAddressModal(tempAddress);
  }

  // Save new address to database
  async function saveNewAddressToDB(addressData: ShowroomAddress) {
    if (!showroom?.id) return null;
    
    const newAddress = {
      showroom_id: showroom.id,
      address_line_1: addressData.address_line_1,
      address_line_2: addressData.address_line_2 || '',
      landmark: addressData.landmark || '',
      city: addressData.city,
      state: addressData.state,
      pincode: addressData.pincode,
      google_maps_link: addressData.google_maps_link || null,
      is_primary: addressData.is_primary || addresses.length === 0
    };
    
    const { data, error } = await supabase
      .from('showroom_addresses')
      .insert([newAddress])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Update existing address in database
  async function updateAddressInDB(addressId: string, addressData: Partial<ShowroomAddress>) {
    const { data, error } = await supabase
      .from('showroom_addresses')
      .update({
        address_line_1: addressData.address_line_1,
        address_line_2: addressData.address_line_2,
        landmark: addressData.landmark,
        city: addressData.city,
        state: addressData.state,
        pincode: addressData.pincode,
        google_maps_link: addressData.google_maps_link || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', addressId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Save modal changes (handles both add and edit)
  async function saveModalChanges() {
    setSaving(true);
    try {
      const section = activeModal;
      
      // Profile update (storage only, no DB)
      if (section === 'profile' && user) {
        const updatedUser = { ...user, ...editingData, full_name: editingData.name || editingData.full_name };
        setUser(updatedUser);
        updateStorage('user', updatedUser);
        
        // Also update complete_auth_data
        const completeData = getFromStorage('complete_auth_data', true);
        if (completeData) {
          completeData.user = updatedUser;
          updateStorage('complete_auth_data', completeData);
        }
        
        showNotification('success', 'Profile updated successfully');
      }
      
      // Showroom update (storage + DB)
      else if (section === 'showroom' && showroom) {
        // Update in database
        const { error } = await supabase
          .from('showrooms')
          .update({
            showroom_name: editingData.showroom_name,
            business_type: editingData.business_type,
            gst_number: editingData.gst_number,
            pan_number: editingData.pan_number,
            business_registration_type: editingData.business_registration_type,
            updated_at: new Date().toISOString()
          })
          .eq('id', showroom.id);
        
        if (error) throw error;
        
        const updatedShowroom = { ...showroom, ...editingData };
        setShowroom(updatedShowroom);
        updateStorage('showroom', updatedShowroom);
        
        // Update complete_auth_data
        const completeData = getFromStorage('complete_auth_data', true);
        if (completeData) {
          completeData.showroom = updatedShowroom;
          updateStorage('complete_auth_data', completeData);
        }
        
        showNotification('success', 'Showroom details updated successfully');
      }
      
      // Address update (add or edit in DB)
      else if (section === 'address') {
        if (selectedAddressId && selectedAddressId.toString().startsWith('temp-')) {
          // New address - save to database
          const savedAddress = await saveNewAddressToDB(editingData);
          if (savedAddress) {
            // Replace temp address with real one
            const updatedAddresses = addresses.map(addr => 
              addr.id === selectedAddressId ? savedAddress : addr
            );
            setAddresses(updatedAddresses);
            updateStorage('showroom_addresses', updatedAddresses);
            
            // Update complete_auth_data
            const completeData = getFromStorage('complete_auth_data', true);
            if (completeData) {
              completeData.showroom_addresses = updatedAddresses;
              updateStorage('complete_auth_data', completeData);
            }
            
            showNotification('success', 'Address added successfully');
          }
        } else if (selectedAddressId) {
          // Existing address - update in database
          const updatedAddress = await updateAddressInDB(selectedAddressId, editingData);
          if (updatedAddress) {
            const updatedAddresses = addresses.map(addr => 
              addr.id === selectedAddressId ? updatedAddress : addr
            );
            setAddresses(updatedAddresses);
            updateStorage('showroom_addresses', updatedAddresses);
            
            // Update complete_auth_data
            const completeData = getFromStorage('complete_auth_data', true);
            if (completeData) {
              completeData.showroom_addresses = updatedAddresses;
              updateStorage('complete_auth_data', completeData);
            }
            
            showNotification('success', 'Address updated successfully');
          }
        }
        setSelectedAddressId(null);
      }
      
      // Branding update (storage + DB)
      else if (section === 'branding' && branding) {
        const { error } = await supabase
          .from('showroom_branding')
          .update({
            logo_url: editingData.logo_url,
            banner_url: editingData.banner_url,
            primary_color: editingData.primary_color,
            secondary_color: editingData.secondary_color,
            official_mobile_number: editingData.official_mobile_number,
            whatsapp_number: editingData.whatsapp_number,
            support_email: editingData.support_email,
            website_url: editingData.website_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', branding.id);
        
        if (error) throw error;
        
        const updatedBranding = { ...branding, ...editingData };
        setBranding(updatedBranding);
        updateStorage('showroom_branding', updatedBranding);
        
        const completeData = getFromStorage('complete_auth_data', true);
        if (completeData) {
          completeData.showroom_branding = updatedBranding;
          updateStorage('complete_auth_data', completeData);
        }
        
        showNotification('success', 'Branding updated successfully');
      }
      
      // Billing update (storage + DB)
      else if (section === 'billing' && billing) {
        const { error } = await supabase
          .from('billing_configurations')
          .update({
            invoice_prefix: editingData.invoice_prefix,
            default_gst_percentage: editingData.default_gst_percentage,
            invoice_footer_note: editingData.invoice_footer_note,
            invoice_terms_conditions: editingData.invoice_terms_conditions,
            authorized_signature_url: editingData.authorized_signature_url,
            bank_name: editingData.bank_name,
            account_number: editingData.account_number,
            ifsc_code: editingData.ifsc_code,
            upi_id: editingData.upi_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', billing.id);
        
        if (error) throw error;
        
        const updatedBilling = { ...billing, ...editingData };
        setBilling(updatedBilling);
        updateStorage('billing_configuration', updatedBilling);
        
        const completeData = getFromStorage('complete_auth_data', true);
        if (completeData) {
          completeData.billing_configuration = updatedBilling;
          updateStorage('complete_auth_data', completeData);
        }
        
        showNotification('success', 'Billing configuration updated successfully');
      }
      
      setActiveModal(null);
    } catch (error) {
      console.error('Error saving:', error);
      showNotification('error', 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  function handleCloseModal() {
    // If this was a new address (temp ID), remove it from the list
    if (activeModal === 'address' && selectedAddressId && selectedAddressId.toString().startsWith('temp-')) {
      setAddresses(addresses.filter(addr => addr.id !== selectedAddressId));
    }
    setActiveModal(null);
    setSelectedAddressId(null);
  }

  // Set primary address in database
  async function setPrimaryAddress(addressId: string) {
    if (!showroom?.id) return;
    
    setSaving(true);
    try {
      // Update all addresses to not primary
      const { error: updateError } = await supabase
        .from('showroom_addresses')
        .update({ is_primary: false })
        .eq('showroom_id', showroom.id);
      
      if (updateError) throw updateError;
      
      // Set the selected address as primary
      const { error: primaryError } = await supabase
        .from('showroom_addresses')
        .update({ is_primary: true })
        .eq('id', addressId);
      
      if (primaryError) throw primaryError;
      
      // Fetch fresh addresses from database
      const { data: freshAddresses, error: fetchError } = await supabase
        .from('showroom_addresses')
        .select('*')
        .eq('showroom_id', showroom.id)
        .order('is_primary', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      if (freshAddresses) {
        setAddresses(freshAddresses);
        updateStorage('showroom_addresses', freshAddresses);
        
        // Update complete_auth_data
        const completeData = getFromStorage('complete_auth_data', true);
        if (completeData) {
          completeData.showroom_addresses = freshAddresses;
          updateStorage('complete_auth_data', completeData);
        }
      }
      
      showNotification('success', 'Primary address updated successfully');
    } catch (error) {
      console.error('Error setting primary address:', error);
      showNotification('error', 'Failed to set primary address');
    } finally {
      setSaving(false);
    }
  }

  // Delete address from database
  async function deleteAddress(addressId: string) {
    if (!confirm('Are you sure you want to delete this address?')) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('showroom_addresses')
        .delete()
        .eq('id', addressId);
      
      if (error) throw error;
      
      const updatedAddresses = addresses.filter(addr => addr.id !== addressId);
      setAddresses(updatedAddresses);
      updateStorage('showroom_addresses', updatedAddresses);
      
      // Update complete_auth_data
      const completeData = getFromStorage('complete_auth_data', true);
      if (completeData) {
        completeData.showroom_addresses = updatedAddresses;
        updateStorage('complete_auth_data', completeData);
      }
      
      // If we deleted the primary address and there are other addresses, make the first one primary
      if (updatedAddresses.length > 0 && !updatedAddresses.some(addr => addr.is_primary)) {
        await setPrimaryAddress(updatedAddresses[0].id);
      }
      
      showNotification('success', 'Address deleted successfully');
    } catch (error) {
      console.error('Error deleting address:', error);
      showNotification('error', 'Failed to delete address');
    } finally {
      setSaving(false);
    }
  }

  function showNotification(type: 'success' | 'error', message: string) {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }

  const isEmpty = (value: any) => {
    return value === null || value === undefined || value === '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const displayName = user?.full_name || user?.name || 'User';
  const userEmail = user?.email || 'No email set';
  const userMobile = user?.mobile_number || 'Not set';
  const userRole = user?.role || 'admin';
  const primaryAddress = addresses.find(a => a.is_primary) || addresses[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-down">
          <div className={`rounded-lg shadow-lg p-4 flex items-center gap-3 ${
            notification.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <p className={notification.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {notification.message}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
              <p className="text-gray-600 mt-1">Manage your account and showroom information</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Account Status</p>
                <p className="text-xl font-bold text-gray-900 capitalize">{userRole}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> {user?.is_email_verified ? 'Email Verified' : 'Email Not Verified'}
            </p>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Showroom ID</p>
                <p className="text-sm font-mono font-bold text-gray-900">{showroom?.id?.slice(0, 8)}...</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Hash className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Addresses</p>
                <p className="text-xl font-bold text-gray-900">{addresses.length}</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Last Updated</p>
                <p className="text-lg font-bold text-gray-900">{new Date().toLocaleDateString()}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Section */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
                </div>
                <button
                  onClick={() => openModal('profile', {
                    name: displayName,
                    email: userEmail,
                    mobile_number: userMobile
                  })}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Full Name</label>
                  <p className="font-medium mt-0.5 text-gray-900">{displayName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mobile Number</label>
                  <p className={`font-medium mt-0.5 ${isEmpty(userMobile) ? 'text-yellow-600' : 'text-gray-900'}`}>
                    {userMobile}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email Address</label>
                  <p className="font-medium mt-0.5 text-gray-900">{userEmail}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Role</label>
                  <p className="text-gray-900 font-medium capitalize mt-0.5">{userRole}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Showroom Section */}
          {showroom && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6 border-b border-gray-100">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Showroom Details</h2>
                  </div>
                  <button
                    onClick={() => openModal('showroom', showroom)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Showroom Name</label>
                  <p className="font-semibold text-lg mt-0.5 text-gray-900">{showroom.showroom_name || 'Not set'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Business Type</label>
                    <p className="mt-0.5 text-gray-900">{showroom.business_type || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Registration Type</label>
                    <p className="capitalize mt-0.5 text-gray-900">{showroom.business_registration_type?.replace(/_/g, ' ') || 'Not set'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">GST Number</label>
                    <p className="font-mono text-sm mt-0.5 text-gray-900">{showroom.gst_number || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">PAN Number</label>
                    <p className="font-mono text-sm mt-0.5 text-gray-900">{showroom.pan_number || 'Not set'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Address Section with Google Maps */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Addresses</h2>
                </div>
                <button
                  onClick={addNewAddress}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Address
                </button>
              </div>
            </div>
            <div className="p-6">
              {addresses.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 mb-2">No address added yet</p>
                  <button
                    onClick={addNewAddress}
                    className="text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add your first address
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {addresses.map((address) => (
                    <div 
                      key={address.id}
                      className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                        address.is_primary ? 'border-green-500 bg-green-50/30' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => openAddressModal(address)}
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex gap-2 flex-wrap">
                            {address.is_primary && (
                              <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                <CheckCircle className="w-3 h-3" /> Primary
                              </span>
                            )}
                            {address.google_maps_link && (
                              <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                <Map className="w-3 h-3" /> Location Added
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {!address.is_primary && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPrimaryAddress(address.id);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded"
                                disabled={saving}
                              >
                                Set as Primary
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteAddress(address.id);
                              }}
                              className="text-xs text-red-600 hover:text-red-700 bg-red-50 px-2 py-1 rounded"
                              disabled={saving}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        
                        <p className="font-medium text-gray-800">
                          {address.address_line_1}
                          {address.address_line_2 && `, ${address.address_line_2}`}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          {address.landmark && `${address.landmark}, `}
                          {address.city}, {address.state}
                        </p>
                        <p className="text-sm text-gray-600">
                          Pincode: {address.pincode}
                        </p>
                        
                        {/* Google Maps Link Display */}
                        {address.google_maps_link && (
                          <div className="mt-3 flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-blue-500" />
                            <a
                              href={address.google_maps_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-sm text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
                            >
                              View on Google Maps
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                      
                      {/* Embedded Map Placeholder */}
                      {address.google_maps_link && (
                        <div className="border-t border-gray-200 p-4 bg-white rounded-b-lg">
                          <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100 flex flex-col items-center justify-center">
                            <Map className="w-12 h-12 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600 text-center px-4 mb-2">
                              Click below to view location on Google Maps
                            </p>
                            <a
                              href={address.google_maps_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Open in Google Maps
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Branding Section */}
          {branding && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6 border-b border-gray-100">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center">
                      <Palette className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Branding & Contact</h2>
                  </div>
                  <button
                    onClick={() => openModal('branding', branding)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Logo</label>
                  <div className="mt-2">
                    {branding.logo_url ? (
                      <img src={branding.logo_url} alt="Logo" className="h-16 w-auto object-contain rounded-lg border border-gray-200" />
                    ) : (
                      <p className="text-yellow-600 text-sm">No logo uploaded</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Banner</label>
                  <div className="mt-2">
                    {branding.banner_url ? (
                      <img src={branding.banner_url} alt="Banner" className="w-full h-24 object-cover rounded-lg border border-gray-200" />
                    ) : (
                      <p className="text-yellow-600 text-sm">No banner uploaded</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Official Mobile</label>
                    <p className="mt-0.5 text-gray-900">{branding.official_mobile_number || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">WhatsApp Number</label>
                    <p className="mt-0.5 text-gray-900">{branding.whatsapp_number || 'Not set'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Support Email</label>
                  <p className="mt-0.5 text-gray-900">{branding.support_email || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Website</label>
                  <p className="mt-0.5 text-gray-900">{branding.website_url || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Brand Colors</label>
                  <div className="flex gap-3 mt-2">
                    {branding.primary_color ? (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg shadow-md" style={{ backgroundColor: branding.primary_color }}></div>
                        <span className="text-sm text-gray-600">Primary</span>
                      </div>
                    ) : (
                      <p className="text-yellow-600 text-sm">No primary color set</p>
                    )}
                    {branding.secondary_color && (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg shadow-md" style={{ backgroundColor: branding.secondary_color }}></div>
                        <span className="text-sm text-gray-600">Secondary</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Billing Section */}
          {billing && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6 border-b border-gray-100">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Billing Configuration</h2>
                  </div>
                  <button
                    onClick={() => openModal('billing', billing)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Authorized Signature</label>
                  <div className="mt-2">
                    {billing.authorized_signature_url ? (
                      <img src={billing.authorized_signature_url} alt="Signature" className="h-12 w-auto object-contain" />
                    ) : (
                      <p className="text-yellow-600 text-sm">No signature uploaded</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Invoice Prefix</label>
                    <p className="font-mono mt-0.5 text-gray-900">{billing.invoice_prefix || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">GST Percentage</label>
                    <p className="mt-0.5 text-gray-900">{billing.default_gst_percentage || 'Not set'}%</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Invoice Footer Note</label>
                  <p className="text-sm italic mt-0.5 text-gray-600">{billing.invoice_footer_note || 'No footer note set'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Invoice Terms &amp; Conditions</label>
                  {billing.invoice_terms_conditions ? (
                    <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm text-gray-700">
                      {billing.invoice_terms_conditions
                        .split('\n')
                        .map((t) => t.replace(/^\s*\d+[.)]\s*/, '').trim())
                        .filter(Boolean)
                        .map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                    </ol>
                  ) : (
                    <p className="text-sm italic mt-0.5 text-gray-500">
                      Using default terms (goods once sold, warranty, overdue interest, jurisdiction)
                    </p>
                  )}
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bank Details</label>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-800">{billing.bank_name || 'Bank name not set'}</p>
                    <p className="text-sm font-mono text-gray-600">Acc: {billing.account_number || 'Not set'}</p>
                    <p className="text-sm font-mono text-gray-600">IFSC: {billing.ifsc_code || 'Not set'}</p>
                    <p className="text-sm text-gray-800">UPI: {billing.upi_id || 'Not set'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal - Edit Forms */}
      {activeModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-white/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                Edit {activeModal === 'profile' ? 'Profile' : 
                       activeModal === 'showroom' ? 'Showroom' :
                       activeModal === 'address' ? 'Address' :
                       activeModal === 'branding' ? 'Branding' : 'Billing'} Details
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {activeModal === 'profile' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={editingData.name || ''}
                      onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                    <input
                      type="tel"
                      value={editingData.mobile_number || ''}
                      onChange={(e) => setEditingData({ ...editingData, mobile_number: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={editingData.email || ''}
                      onChange={(e) => setEditingData({ ...editingData, email: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </>
              )}

              {activeModal === 'showroom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Showroom Name</label>
                    <input
                      type="text"
                      value={editingData.showroom_name || ''}
                      onChange={(e) => setEditingData({ ...editingData, showroom_name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Type</label>
                    <input
                      type="text"
                      value={editingData.business_type || ''}
                      onChange={(e) => setEditingData({ ...editingData, business_type: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., EV Dealer, Service Center"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">GST Number</label>
                    <input
                      type="text"
                      value={editingData.gst_number || ''}
                      onChange={(e) => setEditingData({ ...editingData, gst_number: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">PAN Number</label>
                    <input
                      type="text"
                      value={editingData.pan_number || ''}
                      onChange={(e) => setEditingData({ ...editingData, pan_number: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Registration Type</label>
                    <select
                      value={editingData.business_registration_type || ''}
                      onChange={(e) => setEditingData({ ...editingData, business_registration_type: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select type</option>
                      <option value="proprietorship">Proprietorship</option>
                      <option value="partnership">Partnership</option>
                      <option value="pvt_ltd">Private Limited</option>
                      <option value="llp">LLP</option>
                    </select>
                  </div>
                </>
              )}

              {activeModal === 'address' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      value={editingData.address_line_1 || ''}
                      onChange={(e) => setEditingData({ ...editingData, address_line_1: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Street address, building number"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={editingData.address_line_2 || ''}
                      onChange={(e) => setEditingData({ ...editingData, address_line_2: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                      placeholder="Apartment, suite, unit, etc."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Landmark
                    </label>
                    <input
                      type="text"
                      value={editingData.landmark || ''}
                      onChange={(e) => setEditingData({ ...editingData, landmark: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                      placeholder="Nearby landmark"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        value={editingData.city || ''}
                        onChange={(e) => setEditingData({ ...editingData, city: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State *
                      </label>
                      <input
                        type="text"
                        value={editingData.state || ''}
                        onChange={(e) => setEditingData({ ...editingData, state: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pincode *
                    </label>
                    <input
                      type="text"
                      value={editingData.pincode || ''}
                      onChange={(e) => setEditingData({ ...editingData, pincode: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  
                  {/* Google Maps Link Field */}
                  <div className="border-t border-gray-200 pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <Map className="w-4 h-4 text-blue-500" />
                        Google Maps Location Link <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                      </div>
                    </label>
                    <input
                      type="url"
                      value={editingData.google_maps_link || ''}
                      onChange={(e) => {
                        const newLink = e.target.value;
                        setEditingData({ ...editingData, google_maps_link: newLink });
                      }}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="https://maps.app.goo.gl/... or https://www.google.com/maps/place/..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Paste your Google Maps share link or location URL. This will show a map link on your profile.
                    </p>
                    
                    {/* Link preview/validation */}
                    {editingData.google_maps_link && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        {isValidGoogleMapsLink(editingData.google_maps_link) ? (
                          <div className="flex items-center gap-2 text-green-700">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">Valid Google Maps link</span>
                            <a
                              href={editingData.google_maps_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline ml-auto flex items-center gap-1"
                            >
                              Test Link <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-yellow-700">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm">Please enter a valid Google Maps URL</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    * Required fields
                  </p>
                </>
              )}

              {activeModal === 'branding' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                    <div className="flex items-center gap-4">
                      {editingData.logo_url && (
                        <img src={editingData.logo_url} alt="Logo Preview" className="h-16 w-auto object-contain rounded-lg border border-gray-200" />
                      )}
                      <button
                        type="button"
                        onClick={() => handleImageUpload('logo_url', 'showroom-logos')}
                        disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {editingData.logo_url ? 'Change Logo' : 'Upload Logo'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Banner</label>
                    <div className="flex flex-col gap-4">
                      {editingData.banner_url && (
                        <img src={editingData.banner_url} alt="Banner Preview" className="w-full h-32 object-cover rounded-lg border border-gray-200" />
                      )}
                      <button
                        type="button"
                        onClick={() => handleImageUpload('banner_url', 'showroom-banners')}
                        disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 self-start"
                      >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {editingData.banner_url ? 'Change Banner' : 'Upload Banner'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Official Mobile Number</label>
                    <input
                      type="tel"
                      value={editingData.official_mobile_number || ''}
                      onChange={(e) => setEditingData({ ...editingData, official_mobile_number: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp Number</label>
                    <input
                      type="tel"
                      value={editingData.whatsapp_number || ''}
                      onChange={(e) => setEditingData({ ...editingData, whatsapp_number: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Support Email</label>
                    <input
                      type="email"
                      value={editingData.support_email || ''}
                      onChange={(e) => setEditingData({ ...editingData, support_email: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
                    <input
                      type="url"
                      value={editingData.website_url || ''}
                      onChange={(e) => setEditingData({ ...editingData, website_url: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                      <input
                        type="color"
                        value={editingData.primary_color || '#00C853'}
                        onChange={(e) => setEditingData({ ...editingData, primary_color: e.target.value })}
                        className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                      <input
                        type="color"
                        value={editingData.secondary_color || '#00E676'}
                        onChange={(e) => setEditingData({ ...editingData, secondary_color: e.target.value })}
                        className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeModal === 'billing' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Authorized Signature</label>
                    <div className="flex items-center gap-4">
                      {editingData.authorized_signature_url && (
                        <img src={editingData.authorized_signature_url} alt="Signature Preview" className="h-12 w-auto object-contain border border-gray-200 rounded p-1" />
                      )}
                      <button
                        type="button"
                        onClick={() => handleImageUpload('authorized_signature_url', 'invoice-signatures')}
                        disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {editingData.authorized_signature_url ? 'Change Signature' : 'Upload Signature'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Prefix</label>
                    <input
                      type="text"
                      value={editingData.invoice_prefix || ''}
                      onChange={(e) => setEditingData({ ...editingData, invoice_prefix: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                      placeholder="e.g., INV-2024-"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Default GST Percentage</label>
                    <input
                      type="number"
                      value={editingData.default_gst_percentage || 18}
                      onChange={(e) => setEditingData({ ...editingData, default_gst_percentage: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Footer Note</label>
                    <textarea
                      value={editingData.invoice_footer_note || ''}
                      onChange={(e) => setEditingData({ ...editingData, invoice_footer_note: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                      rows={3}
                      placeholder="Thank you for choosing EV service!"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Terms &amp; Conditions</label>
                    <textarea
                      value={editingData.invoice_terms_conditions || ''}
                      onChange={(e) => setEditingData({ ...editingData, invoice_terms_conditions: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                      rows={5}
                      placeholder={'Enter one term per line, e.g.\nGoods once sold cannot be taken back or exchanged.\nWarranty as per manufacturer terms and conditions.\nSubject to local jurisdiction.'}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Enter one term per line. Numbering is added automatically on the invoice. Leave blank to use the default terms.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                    <input
                      type="text"
                      value={editingData.bank_name || ''}
                      onChange={(e) => setEditingData({ ...editingData, bank_name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                      <input
                        type="text"
                        value={editingData.account_number || ''}
                        onChange={(e) => setEditingData({ ...editingData, account_number: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
                      <input
                        type="text"
                        value={editingData.ifsc_code || ''}
                        onChange={(e) => setEditingData({ ...editingData, ifsc_code: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">UPI ID</label>
                    <input
                      type="text"
                      value={editingData.upi_id || ''}
                      onChange={(e) => setEditingData({ ...editingData, upi_id: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                      placeholder="showroom@bankname"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
              <button
                onClick={saveModalChanges}
                disabled={saving || uploading}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2.5 rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
              <button
                onClick={handleCloseModal}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
