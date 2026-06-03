import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, UploadCloud, CheckCircle, Smartphone, Mail, Fingerprint, AlertCircle, MapPin, Calculator, ShieldCheck, User, Building, Phone, Key, ArrowRight, Loader2 } from 'lucide-react';
import { BusinessProfile, UserRole } from '../types';
import { api } from '../services/api';
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

  // Form States
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [pan, setPan] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [businessType, setBusinessType] = useState('Sole Proprietor');
  const [taxSystem, setTaxSystem] = useState<'PAN' | 'VAT'>('PAN');
  const [annualTurnover, setAnnualTurnover] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [country, setCountry] = useState('Nepal');
  const [zipCode, setZipCode] = useState('');
  const [panPhoto, setPanPhoto] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            setError("File size too large. Max 5MB allowed."); return;
        }
        const reader = new FileReader();
        reader.onloadend = () => { setPanPhoto(reader.result as string); setError(null); };
        reader.readAsDataURL(file);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      const data = await api.login({ identifier: phone, password });
      const getBusinessType = (t: string) => {
          if (t === 'PVT_LTD') return 'Pvt Ltd';
          if (t === 'PARTNERSHIP') return 'Partnership';
          return 'Sole Proprietor';
      };

      const profile: BusinessProfile = {
        id: data.business ? data.business.id : 'admin',
        name: data.business ? data.business.name : data.user.name,
        pan: data.business ? data.business.pan : 'N/A',
        address: data.business ? data.business.address : 'N/A',
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
        taxSystem: data.business?.taxSystem || 'PAN',
        annualTurnover: data.business?.annualTurnover || 0
      };

      await Preferences.set({ key: 'token', value: data.token });
      await Preferences.set({ key: 'userProfile', value: JSON.stringify(profile) });
      onLogin(profile, data.token);
    } catch (err: any) {
      if (err.message === 'Failed to fetch') setError("Cannot reach server. Ensure backend is running.");
      else if (err.code === 'PENDING_VERIFICATION') setError("Account Pending: Your business is awaiting Admin verification.");
      else setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setSuccessMsg(null);
    if (pan.length !== 9 || isNaN(Number(pan))) { setError("PAN must be a 9-digit number."); return; }
    if (!panPhoto) { setError("Please upload your PAN certificate image."); return; }

    setLoading(true);
    try {
      const payload = {
        businessName, pan, ownerName, phone, email, type: businessType, password, panPhoto,
        addressLine1, addressLine2, city, province, country, zipCode, taxSystem,
        annualTurnover: annualTurnover ? parseFloat(annualTurnover) : 0
      };
      await api.register(payload);
      setSuccessMsg("Registration Successful! Your account is pending Admin Verification.");
      setIsRegister(false);
      setPassword(''); setPanPhoto(null);
    } catch (err: any) {
      if (err.message === 'Failed to fetch') setError("Cannot reach server. Ensure backend is running.");
      else setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-white px-4 py-3.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500 font-medium";
  const labelClass = "block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider ml-1";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col md:flex-row">
      
      {/* Left / Top Panel - Branding */}
      <div className={`relative flex flex-col justify-center px-8 py-12 md:p-20 transition-all duration-500 bg-gradient-to-br from-blue-700 via-indigo-800 to-indigo-950 ${isRegister ? 'md:w-[35%]' : 'md:w-1/2'}`}>
        
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-3xl -mr-20 -mt-20 mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-500/20 rounded-full blur-3xl -ml-20 -mb-20 mix-blend-screen pointer-events-none" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none" />

        <div className="relative z-10 text-white max-w-md mx-auto w-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-xl">
              <Building size={24} className="text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Dainikhisab</h1>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            {isRegister ? 'Join the future of MSME accounting.' : 'Welcome back to your dashboard.'}
          </h2>
          <p className="text-blue-100 text-lg opacity-90 leading-relaxed font-medium">
            {isRegister 
              ? 'Register your business today and get AI-powered insights, automated bill scanning, and effortless tax compliance.' 
              : 'Log in to securely manage your transactions, predict cash flow, and track your business growth in real-time.'}
          </p>
          
          {/* Feature highlights (Login only) */}
          {!isRegister && (
            <div className="mt-12 space-y-4 hidden md:block">
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                <div className="p-2 bg-emerald-500/20 rounded-xl"><CheckCircle size={18} className="text-emerald-400" /></div>
                <span className="text-sm font-semibold">End-to-End Encryption</span>
              </div>
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                <div className="p-2 bg-purple-500/20 rounded-xl"><Calculator size={18} className="text-purple-400" /></div>
                <span className="text-sm font-semibold">AI Cash Flow Forecasting</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right / Bottom Panel - Form */}
      <div className={`flex flex-col justify-center flex-1 p-6 sm:p-12 md:p-20 bg-white dark:bg-gray-900 transition-all duration-500 overflow-y-auto`}>
        <div className="max-w-2xl w-full mx-auto">
          
          <div className="mb-10 text-center md:text-left">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {isRegister ? 'Create Account' : 'Sign In'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isRegister ? 'Fill in your business details to get started' : 'Enter your credentials to access your account'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-2xl flex items-start text-sm font-medium animate-in slide-in-from-top-2">
              <AlertCircle size={18} className="mr-3 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-start text-sm font-medium animate-in slide-in-from-top-2">
              <CheckCircle size={18} className="mr-3 mt-0.5 flex-shrink-0" />
              {successMsg}
            </div>
          )}

          {isRegister ? (
            <form onSubmit={handleRegister} className="space-y-8 animate-in fade-in duration-500">
              
              {/* Section 1: Business Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">1</div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-lg">Business Structure</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Business Name *</label>
                    <input required type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Mero Tech Pvt Ltd" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Business Type *</label>
                    <div className="relative">
                      <select value={businessType} onChange={e => setBusinessType(e.target.value)} className={`${inputClass} appearance-none pr-10`}>
                        <option>Sole Proprietor</option>
                        <option>Partnership</option>
                        <option>Pvt Ltd</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Taxation & Identity */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">2</div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-lg">Tax & Registration</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Tax System *</label>
                    <select value={taxSystem} onChange={e => setTaxSystem(e.target.value as 'PAN' | 'VAT')} className={`${inputClass} appearance-none`}>
                      <option value="PAN">PAN Only (Non-VAT)</option>
                      <option value="VAT">VAT Registered (13%)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>PAN/VAT Number *</label>
                    <input required type="text" maxLength={9} value={pan} onChange={e => setPan(e.target.value)} placeholder="9-digit PAN" className={inputClass} />
                  </div>
                  <div className="md:col-span-2 relative group mt-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 ml-1 cursor-pointer">Registration Certificate *</label>
                    <div className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
                      panPhoto 
                      ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 bg-gray-50 dark:bg-gray-800/50'
                    }`}>
                      <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      {panPhoto ? (
                        <div className="flex flex-col items-center text-emerald-600 dark:text-emerald-400">
                           <CheckCircle size={28} className="mb-2"/>
                           <p className="text-sm font-bold">Document Selected</p>
                           <p className="text-xs font-medium mt-1 opacity-80">Click or drag to replace</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                           <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-3 group-hover:scale-110 transition-transform"><UploadCloud size={24} className="text-blue-500" /></div>
                           <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Upload PAN/VAT Certificate</p>
                           <p className="text-xs text-gray-400 mt-1">JPEG, PNG or PDF up to 5MB</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2 mt-2">
                    <label className={labelClass}>Est. Annual Turnover (NPR)</label>
                    <input type="number" value={annualTurnover} onChange={e => setAnnualTurnover(e.target.value)} placeholder="e.g. 5000000" className={inputClass} />
                  </div>
                </div>
              </div>

              {/* Section 3: User Details (Moved down for better flow) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">3</div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-lg">Contact & Security</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Owner Name *</label>
                    <input required type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} className={inputClass} placeholder="Full legal name" />
                  </div>
                  <div>
                    <label className={labelClass}>Contact Number *</label>
                    <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="10-digit mobile" />
                  </div>
                  <div>
                    <label className={labelClass}>Email Address *</label>
                    <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="business@email.com" />
                  </div>
                  <div>
                    <label className={labelClass}>Secure Password *</label>
                    <div className="relative">
                      <input required type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-1 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Address */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">4</div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-lg">Location</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Address Line 1 *</label>
                    <input required type="text" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} className={inputClass} placeholder="Street, Tole, Ward No." />
                  </div>
                  <div>
                    <label className={labelClass}>City/VDC *</label>
                    <input required type="text" value={city} onChange={e => setCity(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Province *</label>
                    <select required value={province} onChange={e => setProvince(e.target.value)} className={`${inputClass} appearance-none`}>
                      <option value="">Select Province</option>
                      <option value="Koshi">Koshi</option><option value="Madhesh">Madhesh</option>
                      <option value="Bagmati">Bagmati</option><option value="Gandaki">Gandaki</option>
                      <option value="Lumbini">Lumbini</option><option value="Karnali">Karnali</option>
                      <option value="Sudurpaschim">Sudurpaschim</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button disabled={loading} type="submit" className="w-full flex justify-center items-center py-4 px-4 rounded-2xl shadow-xl shadow-blue-600/20 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all active:scale-[0.98]">
                  {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
                  {loading ? 'Processing Registration...' : 'Complete Registration'}
                </button>
              </div>

              <div className="text-center mt-8">
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Already have an account?{' '}
                  <button type="button" onClick={() => { setIsRegister(false); setError(null); }} className="text-blue-600 dark:text-blue-400 font-bold hover:underline transition-all">Sign In</button>
                </p>
              </div>
            </form>
          ) : (
            
            <form onSubmit={handleLogin} className="space-y-6 max-w-sm mx-auto md:mx-0 animate-in fade-in duration-500">
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Email or Phone</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-1 pl-3 flex items-center pointer-events-none text-gray-400">
                      <User size={18} />
                    </div>
                    <input required type="text" value={phone} onChange={e => setPhone(e.target.value)} className={`${inputClass} pl-11`} placeholder="you@business.com" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1.5 ml-1">
                    <label className={`${labelClass} mb-0 ml-0`}>Password</label>
                    <a href="#" tabIndex={-1} className="text-[10px] font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 transition-colors">Forgot Password?</a>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-1 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Key size={18} />
                    </div>
                    <input required type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className={`${inputClass} pl-11`} placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-1 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <button disabled={loading} type="submit" className="w-full flex justify-center items-center group py-3.5 px-4 rounded-xl shadow-lg shadow-blue-600/20 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-600/30 focus:outline-none transition-all active:scale-[0.98]">
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Sign In'}
                {!loading && <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />}
              </button>

              <div className="text-center mt-12 pt-6 border-t border-gray-100 dark:border-gray-800">
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Don't have an account?{' '}
                  <button type="button" onClick={() => { setIsRegister(true); setError(null); }} className="text-blue-600 dark:text-blue-400 font-bold hover:underline transition-all">Register Business</button>
                </p>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default Auth;