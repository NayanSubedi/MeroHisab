import React, { useState, useRef, useEffect } from 'react';
import { BusinessProfile } from '../types';
import { api } from '../services/api';
import { BiometricService } from '../services/biometricService';
import { Save, Lock, User, Building, MapPin, CheckCircle, AlertCircle, Camera, Fingerprint, Loader2, Shield, Settings, ChevronRight } from 'lucide-react';
import { Preferences } from '@capacitor/preferences';

interface ProfileSettingsProps {
  userProfile: BusinessProfile;
  token: string;
  onUpdate: (updatedProfile: BusinessProfile) => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ userProfile, token, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Business Info State
  const [businessName, setBusinessName] = useState(userProfile.name);
  const [addressLine1, setAddressLine1] = useState(userProfile.addressLine1 || '');
  const [addressLine2, setAddressLine2] = useState(userProfile.addressLine2 || '');
  const [city, setCity] = useState(userProfile.city || '');
  const [province, setProvince] = useState(userProfile.province || '');
  const [country, setCountry] = useState(userProfile.country || 'Nepal');
  const [zipCode, setZipCode] = useState(userProfile.zipCode || '');
  const [logo, setLogo] = useState<string | null>(userProfile.logo || null);

  // App Settings
  const [enableBiometric, setEnableBiometric] = useState(userProfile.enableBiometricLogin || false);
  const [isBioHardwareAvailable, setIsBioHardwareAvailable] = useState(false);

  // User Info State
  const [ownerName, setOwnerName] = useState(userProfile.ownerName);
  const [email, setEmail] = useState(userProfile.email);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => { checkBioAvailability(); }, []);

  const checkBioAvailability = async () => {
    const available = await BiometricService.isAvailable();
    setIsBioHardwareAvailable(available);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Logo size must be less than 5MB' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => { setLogo(reader.result as string); setMessage(null); };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => { fileInputRef.current?.click(); };

  const handleBiometricToggle = async (checked: boolean) => {
    setEnableBiometric(checked);
    if (checked) {
      if (!isBioHardwareAvailable) {
        alert("Biometric hardware (Fingerprint/FaceID) is not available on this device.");
        setEnableBiometric(false);
        return;
      }
      const verified = await BiometricService.verifyIdentity();
      if (verified) {
        BiometricService.setCredentials(userProfile.phone || userProfile.email, token);
      } else {
        setEnableBiometric(false);
        alert("Verification failed. Biometrics disabled.");
      }
    } else {
      BiometricService.clearCredentials();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const payload = {
      name: ownerName, email, newPassword, businessName,
      addressLine1, addressLine2, city, province, country, zipCode, logo,
      taxSystem: userProfile.taxSystem,
      annualTurnover: userProfile.annualTurnover,
      enableBiometricLogin: enableBiometric
    };

    try {
      await api.updateProfile(payload, token);
      const updatedProfile: BusinessProfile = {
        ...userProfile, name: businessName, ownerName, email,
        address: `${addressLine1}, ${city}, ${province}`,
        addressLine1, addressLine2, city, province, country, zipCode,
        logo: logo || undefined,
        taxSystem: userProfile.taxSystem,
        annualTurnover: userProfile.annualTurnover,
        enableBiometricLogin: enableBiometric
      };
      await Preferences.set({ key: 'userProfile', value: JSON.stringify(updatedProfile) });
      if (!enableBiometric) BiometricService.clearCredentials();
      onUpdate(updatedProfile);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setNewPassword('');
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500";
  const labelClass = "block text-[11px] font-semibold text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wider";

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-20">

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-indigo-950 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10" />
        <div className="relative flex items-center gap-3">
          <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl">
            <Settings size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Business Settings</h2>
            <p className="text-xs text-white/50">Manage your profile, address, and security</p>
          </div>
        </div>
      </div>

      {/* Toast Message */}
      {message && (
        <div className={`p-3.5 rounded-2xl flex items-center text-sm font-medium border transition-all ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30'
            : 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30'
        }`}>
          {message.type === 'success' ? <CheckCircle size={16} className="mr-2 flex-shrink-0" /> : <AlertCircle size={16} className="mr-2 flex-shrink-0" />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* LEFT COLUMN */}
        <div className="md:col-span-1 space-y-4">

          {/* Logo Card */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Business Logo</h3>
            <div className="flex flex-col items-center">
              <div className="relative group mb-3">
                <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-50 dark:bg-gray-700 flex items-center justify-center transition-colors group-hover:border-blue-400">
                  {logo ? (
                    <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building size={32} className="text-gray-300 dark:text-gray-500" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={triggerFileInput}
                  className="absolute -bottom-2 -right-2 p-2 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-95"
                >
                  <Camera size={14} />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 text-center">Appears on invoices. Max 5MB.</p>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
            </div>
          </div>

          {/* Security */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <Lock size={14} className="text-red-500" />
              </div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Security</h3>
            </div>
            <div>
              <label className={labelClass}>New Password</label>
              <input
                type="password"
                placeholder="Leave blank to keep current"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Biometric */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Fingerprint size={14} className="text-purple-500" />
              </div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">App Settings</h3>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-3">
                <span className="block text-sm font-semibold text-gray-700 dark:text-gray-200">Biometric Login</span>
                <span className="text-[10px] text-gray-400">Fingerprint / Face ID</span>
                {!isBioHardwareAvailable && (
                  <span className="block text-[10px] text-red-400 mt-0.5">Hardware not available</span>
                )}
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={enableBiometric}
                  disabled={!isBioHardwareAvailable}
                  onChange={e => handleBiometricToggle(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Tax Info (read-only) */}
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} className="text-gray-400" />
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tax Registration</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-gray-400 block">PAN No.</span>
                <span className="text-sm font-bold text-gray-800 dark:text-white font-mono">{userProfile.pan}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block">System</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${
                  userProfile.taxSystem === 'VAT'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {userProfile.taxSystem}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="md:col-span-2 space-y-4">

          {/* General Info */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <User size={14} className="text-blue-500" />
              </div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">General Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelClass}>Business Name</label>
                <input required type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Owner Name</label>
                <input required type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <MapPin size={14} className="text-emerald-500" />
              </div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Detailed Address</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelClass}>Address Line 1 *</label>
                <input required value={addressLine1} onChange={e => setAddressLine1(e.target.value)} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Address Line 2 (Optional)</label>
                <input value={addressLine2} onChange={e => setAddressLine2(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>City *</label>
                <input required value={city} onChange={e => setCity(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Province *</label>
                <select required value={province} onChange={e => setProvince(e.target.value)} className={inputClass}>
                  <option value="">Select Province</option>
                  <option value="Koshi">Koshi</option>
                  <option value="Madhesh">Madhesh</option>
                  <option value="Bagmati">Bagmati</option>
                  <option value="Gandaki">Gandaki</option>
                  <option value="Lumbini">Lumbini</option>
                  <option value="Karnali">Karnali</option>
                  <option value="Sudurpaschim">Sudurpaschim</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Country *</label>
                <input required value={country} onChange={e => setCountry(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Zip Code *</label>
                <input required value={zipCode} onChange={e => setZipCode(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all font-semibold text-sm disabled:opacity-50 active:scale-[0.97]"
            >
              {loading ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Save size={18} className="mr-2" />}
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};

export default ProfileSettings;