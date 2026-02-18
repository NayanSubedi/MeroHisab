import React, { useState, useRef, useEffect } from 'react';
import { BusinessProfile } from '../types';
import { api } from '../services/api';
import { BiometricService } from '../services/biometricService';
import { Save, Lock, User, Building, MapPin, CheckCircle, AlertCircle, Camera, Fingerprint } from 'lucide-react';

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

  useEffect(() => {
    checkBioAvailability();
  }, []);

  const checkBioAvailability = async () => {
      const available = await BiometricService.isAvailable();
      setIsBioHardwareAvailable(available);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // Increased to 5MB
         setMessage({ type: 'error', text: 'Logo size must be less than 5MB' });
         return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
        setMessage(null); // Clear errors on successful selection
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleBiometricToggle = async (checked: boolean) => {
    setEnableBiometric(checked);
    if (checked) {
        if (!isBioHardwareAvailable) {
            alert("Biometric hardware (Fingerprint/FaceID) is not available on this device.");
            setEnableBiometric(false);
            return;
        }
        // Verify identity before enabling
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
        name: ownerName,
        email,
        newPassword,
        businessName,
        addressLine1,
        addressLine2,
        city,
        province,
        country,
        zipCode,
        logo,
        // Keep existing tax values from props so they aren't lost
        taxSystem: userProfile.taxSystem,
        annualTurnover: userProfile.annualTurnover,
        // Settings
        enableBiometricLogin: enableBiometric
    };

    try {
        await api.updateProfile(payload, token);
        
        // Construct updated local profile
        const updatedProfile: BusinessProfile = {
            ...userProfile,
            name: businessName,
            ownerName: ownerName,
            email: email,
            address: `${addressLine1}, ${city}, ${province}`,
            addressLine1, addressLine2, city, province, country, zipCode,
            logo: logo || undefined,
            // Maintain existing tax values
            taxSystem: userProfile.taxSystem,
            annualTurnover: userProfile.annualTurnover,
            enableBiometricLogin: enableBiometric
        };

        // Update local storage and app state
        localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
        
        // Ensure Biometric service state matches UI
        if (!enableBiometric) {
             BiometricService.clearCredentials();
        }

        onUpdate(updatedProfile);
        
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setNewPassword(''); // Clear password field for security
    } catch (error) {
        console.error(error);
        setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Business Profile & Settings</h2>
        {message && (
            <div className={`px-4 py-2 rounded-lg flex items-center text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'}`}>
                {message.type === 'success' ? <CheckCircle size={16} className="mr-2"/> : <AlertCircle size={16} className="mr-2"/>}
                {message.text}
            </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Logo & Basic Info */}
        <div className="md:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-center transition-colors">
                <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">Business Logo</h3>
                <div className="relative inline-block group">
                    <div className="w-32 h-32 rounded-full border-4 border-gray-100 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                        {logo ? (
                            <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <Building size={40} className="text-gray-300 dark:text-gray-500" />
                        )}
                    </div>
                    <button 
                        type="button"
                        onClick={triggerFileInput}
                        className="px-4 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition flex items-center mx-auto"
                    >
                        <Camera size={14} className="mr-2"/> Change Logo
                    </button>
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoChange} 
                        className="hidden" 
                    />
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Appears on Invoices. Max 5MB.</p>
            </div>

             <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                <div className="flex items-center mb-4">
                    <Lock size={18} className="text-gray-400 dark:text-gray-500 mr-2" />
                    <h3 className="font-semibold text-gray-700 dark:text-gray-200">Security</h3>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">New Password</label>
                    <input 
                        type="password" 
                        placeholder="Leave blank to keep current" 
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500" 
                    />
                </div>
            </div>

            {/* App Settings / Biometric */}
             <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                <div className="flex items-center mb-4">
                    <Fingerprint size={18} className="text-gray-400 dark:text-gray-500 mr-2" />
                    <h3 className="font-semibold text-gray-700 dark:text-gray-200">App Settings</h3>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">Biometric Login</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Enable fingerprint/face ID</span>
                        {!isBioHardwareAvailable && (
                            <span className="block text-[10px] text-red-500 mt-1">Hardware not available</span>
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>
        </div>

        {/* Right Column: Details */}
        <div className="md:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                <div className="flex items-center mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                    <User size={18} className="text-gray-400 dark:text-gray-500 mr-2" />
                    <h3 className="font-semibold text-gray-700 dark:text-gray-200">General Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Business Name</label>
                        <input required type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Owner Name</label>
                        <input required type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</label>
                        <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none" />
                    </div>
                </div>
            </div>

            {/* Tax Settings Removed */}

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                 <div className="flex items-center mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                    <MapPin size={18} className="text-gray-400 dark:text-gray-500 mr-2" />
                    <h3 className="font-semibold text-gray-700 dark:text-gray-200">Detailed Address</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                         <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Address Line 1 *</label>
                        <input required value={addressLine1} onChange={e => setAddressLine1(e.target.value)} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none" />
                    </div>
                    <div className="md:col-span-2">
                         <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Address Line 2 (Optional)</label>
                        <input value={addressLine2} onChange={e => setAddressLine2(e.target.value)} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">City *</label>
                        <input required value={city} onChange={e => setCity(e.target.value)} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none" />
                    </div>
                     <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Province *</label>
                         <select required value={province} onChange={e => setProvince(e.target.value)} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none">
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
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Country *</label>
                        <input required value={country} onChange={e => setCountry(e.target.value)} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Zip Code *</label>
                        <input required value={zipCode} onChange={e => setZipCode(e.target.value)} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none" />
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button 
                    type="submit" 
                    disabled={loading}
                    className="flex items-center px-6 py-2.5 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition disabled:opacity-50"
                >
                    <Save size={18} className="mr-2" /> {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>

      </form>
    </div>
  );
};

export default ProfileSettings;