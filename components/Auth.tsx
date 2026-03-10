import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, UploadCloud, CheckCircle, Smartphone, Mail, Fingerprint, AlertCircle, MapPin, Calculator } from 'lucide-react';
import { BusinessProfile, UserRole } from '../types';
import { api } from '../services/api';
import { BiometricService } from '../services/biometricService';
import { Preferences } from '@capacitor/preferences'

interface AuthProps {
  onLogin: (profile: BusinessProfile, token: string) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Biometric State
  const [showBiometric, setShowBiometric] = useState(false);

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    const isHardwareAvailable = await BiometricService.isAvailable();
    const storedCredentials = await BiometricService.getCredentials(); 
    
    // Check if the profile exists in Preferences
    const { value: storedProfile } = await Preferences.get({ key: 'userProfile' });

    // Only show biometric option if ALL data is present
    if (isHardwareAvailable && storedCredentials && storedProfile) {
      setShowBiometric(true);
    } else {
      setShowBiometric(false);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const verified = await BiometricService.verifyIdentity();

      if (!verified) {
        setError("Biometric authentication failed.");
        return;
      }

      const creds = await BiometricService.getCredentials();

      if (!creds || !creds.token) {
        setError("Session expired. Please login with password again.");
        return;
      }

      // Check if the token has mathematically expired before logging in
      try {
        const base64Url = creds.token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const tokenPayload = JSON.parse(window.atob(base64));
        
        if (tokenPayload.exp * 1000 < Date.now()) {
          await BiometricService.clearCredentials(); // Clear the dead token
          setError("Security session expired. Please login with password to renew.");
          setShowBiometric(false); // Hide button
          return;
        }
      } catch (e) {
        console.error("Error decoding token", e);
      }

      const { value } = await Preferences.get({ key: 'userProfile' });

      if (!value) {
        // Clean up out-of-sync credentials and hide the button
        await BiometricService.clearCredentials();
        setShowBiometric(false);
        setError("Profile data missing. Please login with password again.");
        return;
      }

      const parsedProfile = JSON.parse(value);
      onLogin(parsedProfile, creds.token);

    } catch (error) {
      console.error("Bio Login Error", error);
      setError("Biometric authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  // Form States
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [pan, setPan] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [businessType, setBusinessType] = useState('Sole Proprietor');

  // Tax Logic States
  const [taxSystem, setTaxSystem] = useState<'PAN' | 'VAT'>('PAN');
  const [annualTurnover, setAnnualTurnover] = useState('');

  // Detailed Address States
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [country, setCountry] = useState('Nepal');
  const [zipCode, setZipCode] = useState('');
  
  // New State for File Upload
  const [panPhoto, setPanPhoto] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        // Check file size (e.g., max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError("File size too large. Max 5MB allowed.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setPanPhoto(reader.result as string);
            setError(null);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // API call returns the data directly (throws if error)
      const data = await api.login({ identifier: phone, password });

      // Helper for business type mapping
      const getBusinessType = (t: string) => {
          if (t === 'PVT_LTD') return 'Pvt Ltd';
          if (t === 'PARTNERSHIP') return 'Partnership';
          return 'Sole Proprietor';
      };

      // Map backend response to frontend BusinessProfile
      const profile: BusinessProfile = {
        id: data.business ? data.business.id : 'admin',
        name: data.business ? data.business.name : data.user.name,
        pan: data.business ? data.business.pan : 'N/A',
        address: data.business ? data.business.address : 'N/A',
        // Detailed fields
        addressLine1: data.business?.addressLine1,
        addressLine2: data.business?.addressLine2,
        city: data.business?.city,
        province: data.business?.province,
        country: data.business?.country,
        zipCode: data.business?.zipCode,
        logo: data.business?.logo,

        ownerName: data.user.name,
        email: data.user.email,
        phone: data.user.phone || '',
        type: data.business ? getBusinessType(data.business.type) : 'Sole Proprietor',
        role: data.user.role as UserRole,
        isVerified: data.business ? data.business.isVerified : true,

        // Tax fields
        taxSystem: data.business?.taxSystem || 'PAN',
        annualTurnover: data.business?.annualTurnover || 0,
        enableBiometricLogin: data.business?.enableBiometricLogin || false
      };

      // Persist to Local Storage
      await Preferences.set({
        key: 'token',
        value: data.token,
      });

      await Preferences.set({
        key: 'userProfile',
        value: JSON.stringify(profile),
      });

      // Store biometric credentials if enabled
      if (profile.enableBiometricLogin) {
        await BiometricService.setCredentials(
          profile.email || profile.phone,
          data.token
        );
      } else {
        await BiometricService.clearCredentials();
      }
      
      // Update biometric preference if enabled on server
      if (!profile.enableBiometricLogin) {
          BiometricService.clearCredentials();
      }

      onLogin(profile, data.token);

    } catch (err: any) {
      console.error("Login Error:", err);
      // Handle Specific Errors
      if (err.message === 'Failed to fetch') {
         setError("Cannot reach server. Ensure backend is running.");
      } else if (err.code === 'PENDING_VERIFICATION') {
         setError("Account Pending: Your business is awaiting Admin verification.");
      } else {
         setError(err.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Basic Validation
    if (pan.length !== 9 || isNaN(Number(pan))) {
      setError("PAN must be a 9-digit number.");
      return;
    }
    
    // Ensure file is uploaded
    if (!panPhoto) {
        setError("Please upload your PAN certificate image.");
        return;
    }

    setLoading(true);

    try {
      const payload = {
        businessName,
        pan,
        ownerName,
        phone,
        email,
        type: businessType,
        password,
        panPhoto, // Send the base64 image string
        // Detailed Address
        addressLine1, addressLine2, city, province, country, zipCode,
        // Tax
        taxSystem,
        annualTurnover: annualTurnover ? parseFloat(annualTurnover) : 0
      };

      // API returns data directly (throws if error)
      await api.register(payload);

      setSuccessMsg("Registration Successful! Your account is now pending Admin Verification. You cannot login until verified.");
      setIsRegister(false); // Switch back to login view
      // Clear sensitive fields
      setPassword('');
      setPanPhoto(null);
      
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
          setError("Cannot reach server. Ensure backend is running.");
      } else {
          setError(err.message || "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center p-4">
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full ${isRegister ? 'max-w-3xl' : 'max-w-md'} overflow-hidden transition-all duration-300`}>
        <div className="p-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">MeroHisab</h1>
                <p className="text-gray-500 dark:text-gray-400">{isRegister ? "Register your Business" : "Secure Login"}</p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg flex items-start text-sm">
                    <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                    {error}
                </div>
            )}

            {successMsg && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg flex items-start text-sm">
                    <CheckCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                    {successMsg}
                </div>
            )}

          {isRegister ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
                
                {/* Business Info Section */}
                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-3 flex items-center">
                        Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Business Name *</label>
                            <input required type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none" />
                        </div>
                        <div>
                             <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Business Type *</label>
                            <select value={businessType} onChange={e => setBusinessType(e.target.value)} className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none">
                                <option>Sole Proprietor</option>
                                <option>Partnership</option>
                                <option>Pvt Ltd</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">PAN/VAT (9 Digits) *</label>
                            <input required type="text" maxLength={9} value={pan} onChange={e => setPan(e.target.value)} className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none" />
                        </div>
                         <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Phone *</label>
                            <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none" />
                        </div>
                    </div>
                </div>

                {/* Tax & Financials */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                    <h3 className="text-sm font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-3 flex items-center">
                        <Calculator size={16} className="mr-1" /> Tax & Turnover
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tax Registration Type *</label>
                            <select 
                                value={taxSystem} 
                                onChange={e => setTaxSystem(e.target.value as 'PAN' | 'VAT')} 
                                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none"
                            >
                                <option value="PAN">PAN Only (Non-VAT)</option>
                                <option value="VAT">VAT Registered (13%)</option>
                            </select>
                            <p className="text-[10px] text-gray-500 mt-1">
                                {taxSystem === 'PAN' ? "Select if turnover is < 50L (Goods) / 30L (Services)." : "Select if you are registered for VAT."}
                            </p>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Est. Annual Turnover (NPR)</label>
                            <input 
                                type="number" 
                                value={annualTurnover} 
                                onChange={e => setAnnualTurnover(e.target.value)} 
                                placeholder="e.g. 4500000"
                                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none" 
                            />
                        </div>
                    </div>
                </div>

                {/* Detailed Address Section */}
                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-3 flex items-center">
                        <MapPin size={16} className="mr-1" /> Business Address
                    </h3>
                    <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Address Line 1 (Street/Tole/Ward) *</label>
                          <input required placeholder="e.g. New Road, Ward No. 22" type="text" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none" />
                        </div>
                         <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Address Line 2 (Optional)</label>
                          <input placeholder="e.g. Near Bishal Bazar" type="text" value={addressLine2} onChange={e => setAddressLine2(e.target.value)} className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">City / Municipality *</label>
                                <input required placeholder="e.g. Kathmandu" type="text" value={city} onChange={e => setCity(e.target.value)} className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Province *</label>
                                <select required value={province} onChange={e => setProvince(e.target.value)} className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none">
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
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Country *</label>
                                <input required type="text" value={country} onChange={e => setCountry(e.target.value)} className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Zip / Postal Code *</label>
                                <input required placeholder="e.g. 44600" type="text" value={zipCode} onChange={e => setZipCode(e.target.value)} className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Owner Info & Security */}
                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-3">Owner & Security</h3>
                    <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Owner Full Name *</label>
                          <input required type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address *</label>
                          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none" />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                          <div className="relative">
                            <input required type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                         {/* Functional Upload Input */}
                        <div className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer relative transition-colors mt-2 ${panPhoto ? 'border-green-400 bg-green-50 dark:bg-green-900/30' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-700'}`}>
                            <input 
                                type="file" 
                                accept="image/*,application/pdf"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {panPhoto ? (
                                <div className="flex flex-col items-center text-green-700 dark:text-green-400">
                                     <CheckCircle size={32} className="mb-2"/>
                                     <p className="text-sm font-medium">Document Selected</p>
                                     <p className="text-xs mt-1">Click to replace</p>
                                </div>
                            ) : (
                                <>
                                    <UploadCloud className="mx-auto h-8 w-8 text-gray-400" />
                                    <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mt-1">Upload PAN/VAT Certificate *</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">JPG, PNG or PDF (Max 5MB)</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

              </div>
              
              <button disabled={loading} type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50 transition">
                {loading ? 'Processing...' : 'Complete Registration'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
               <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email or Phone</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail size={16} className="text-gray-400" />
                    </div>
                    <input required type="text" value={phone} onChange={e => setPhone(e.target.value)} className="block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md py-2 border focus:ring-blue-500 focus:border-blue-500" placeholder="Email or Phone" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CheckCircle size={16} className="text-gray-400" />
                    </div>
                    <input required type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md py-2 border focus:ring-blue-500 focus:border-blue-500" placeholder="••••••••" />
                     <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="flex justify-between mt-2">
                     <a href="#" className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">Forgot Password?</a>
                     <a href="#" className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"><Smartphone size={12} className="mr-1"/> Login with OTP (Disabled)</a>
                  </div>
                </div>

                <button disabled={loading} type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50">
                  {loading ? 'Logging In...' : 'Sign In'}
                </button>

                {showBiometric && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with</span>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-1 gap-3">
                        <button onClick={handleBiometricLogin} type="button" className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                            {loading ? <div className="h-5 w-5 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin mr-2"/> : <Fingerprint size={20} className="mr-2 text-purple-600 dark:text-purple-400" />}
                            Biometric Login
                        </button>
                    </div>
                  </>
                )}
            </form>
          )}

          <div className="mt-6 text-center">
             <button onClick={() => { setIsRegister(!isRegister); setError(null); }} className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                {isRegister ? "Already have an account? Sign In" : "Don't have an account? Register Business"}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;