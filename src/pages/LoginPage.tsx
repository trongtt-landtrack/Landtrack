import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Loader2, Eye, EyeOff, X, ArrowLeft, Building2 } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { PROVINCES } from '../constants';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';

export default function LoginPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [referrer, setReferrer] = useState('0938808522');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Vui lòng nhập email để khôi phục mật khẩu.');
      return;
    }
    setError('');
    setSuccessMessage('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage('Hệ thống đã gửi link khôi phục mật khẩu vào email: ' + email + '. Vui lòng kiểm tra cả hòm thư rác (Spam).');
    } catch (err: any) {
      console.error('Forgot password error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('Email này chưa được đăng ký trong hệ thống.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Địa chỉ email không hợp lệ.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau ít phút.');
      } else {
        setError('Không thể gửi email khôi phục. Lỗi: ' + (err.code || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cleanPhone = phone.replace(/\s+/g, '');
        // Normalize phone to 0... format
        let normalizedPhone = cleanPhone;
        if (normalizedPhone.startsWith('+84')) {
          normalizedPhone = '0' + normalizedPhone.slice(3);
        }

        // Validate phone number format
        const phoneRegex = /^0[3|5|7|8|9][0-9]{8}$/;
        if (!phoneRegex.test(normalizedPhone)) {
          setError('Số điện thoại không hợp lệ. Vui lòng nhập SĐT Việt Nam (ví dụ: 0912345678).');
          setLoading(false);
          return;
        }

        // Normalize referrer phone
        const cleanReferrer = referrer.replace(/\s+/g, '');
        let normalizedReferrer = cleanReferrer;
        if (normalizedReferrer.startsWith('+84')) {
          normalizedReferrer = '0' + normalizedReferrer.slice(3);
        }

        if (!normalizedReferrer) {
          setError('Vui lòng nhập số điện thoại người giới thiệu.');
          setLoading(false);
          return;
        }

        // Check if referrer phone is allowed and if user phone is already registered
        try {
          // Check allowed_phones for referrer
          const allowedQ = query(
            collection(db, 'allowed_phones'), 
            where('phone', 'in', [normalizedReferrer, '+84' + normalizedReferrer.slice(1)])
          );
          const allowedSnapshot = await getDocs(allowedQ);
          
          if (allowedSnapshot.empty) {
            setError('Số điện thoại người giới thiệu không hợp lệ hoặc chưa được cấp phép. Vui lòng kiểm tra lại.');
            setLoading(false);
            return;
          }

          // Check if phone is already used in users collection
          const userQ = query(collection(db, 'users'), where('phone', '==', normalizedPhone));
          const userSnapshot = await getDocs(userQ);
          
          if (!userSnapshot.empty) {
            setError('Số điện thoại này đã được đăng ký cho một tài khoản khác. Vui lòng đăng nhập hoặc dùng SĐT khác.');
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Error checking phone status:', err);
          setError('Lỗi kiểm tra trạng thái số điện thoại. Vui lòng thử lại.');
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Create user document in Firestore
        try {
          const isSuperAdmin = userCredential.user.email === 'tranthetrong91@gmail.com';
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            id: userCredential.user.uid,
            name: name,
            email: userCredential.user.email,
            phone: normalizedPhone,
            gender: gender,
            workLocation: workLocation,
            referrer: referrer,
            role: isSuperAdmin ? 'super_admin' : 'user',
            status: 'active',
            createdAt: new Date().toISOString()
          });
          
          // Sync to Google Sheet via configurable GAS URL
          const gasUrl = import.meta.env.VITE_USER_SYNC_GAS_URL || 'https://script.google.com/macros/s/AKfycbwwdfjr62BudOsfgER93I5673lVCtNr24InQkUwExzA8YNaHxaUohWGGqDyUzqPyAKf/exec';
          
          await fetch(gasUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              email: userCredential.user.email, 
              name: name, 
              phone: normalizedPhone,
              referrer: referrer,
              workLocation: workLocation,
              role: 'user',
              createdAt: new Date().toISOString()
            }),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${userCredential.user.uid}`);
        }
      }
      navigate('/projects');
    } catch (err: any) {
      setError(err.message === 'Firebase: Error (auth/invalid-credential).' ? 'Email hoặc mật khẩu không đúng.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row w-full max-w-6xl relative max-h-[85vh]">
        
        {/* Close Button */}
        <button 
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 z-20 p-2 bg-white/50 hover:bg-gray-100 text-gray-500 hover:text-gray-800 rounded-full transition-colors backdrop-blur-sm"
          title="Đóng và quay lại trang chủ"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Left Side - Branding */}
        <div className="lg:w-5/12 bg-gradient-to-br from-primary to-primary/80 p-12 text-white flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/pattern/800/800')] opacity-10 mix-blend-overlay"></div>
          <div className="relative z-10">
            <div className="w-32 h-32 metallic-border mx-auto mb-6">
              <div className="metallic-border-inner">
                <img 
                  src="https://github.com/trongtt-landtrack/Anh-Logo/blob/main/xql6xl4b.png?raw=true" 
                  alt="LandTrack Logo" 
                  className="w-full h-full object-contain drop-shadow-md"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <h1 className="text-4xl font-display font-black leading-tight mb-4 logo-text-gradient">
              LANDTRACK
            </h1>
            <p className="text-white/80 font-sans">
              Nền tảng công nghệ hỗ trợ kinh doanh BĐS hàng đầu Việt Nam
            </p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="lg:w-7/12 p-8 lg:p-12 relative overflow-y-auto">
          {!isForgotPassword ? (
            <div className="flex border-b border-gray-200 mb-8">
              <button
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                  setSuccessMessage('');
                }}
                className={`flex-1 pb-4 text-center font-display font-bold text-xl transition-colors border-b-2 ${
                  isLogin ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Đăng nhập
              </button>
              <button
                onClick={() => {
                  setIsLogin(false);
                  setError('');
                  setSuccessMessage('');
                }}
                className={`flex-1 pb-4 text-center font-display font-bold text-xl transition-colors border-b-2 ${
                  !isLogin ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Đăng ký
              </button>
            </div>
          ) : (
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-8">
              Khôi phục mật khẩu
            </h2>
          )}

          {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-2 rounded font-sans">{error}</p>}
          {successMessage && <p className="text-green-600 text-sm mb-4 bg-green-50 p-2 rounded font-sans">{successMessage}</p>}

          {isForgotPassword ? (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
              <p className="text-sm text-gray-600 mb-4 font-sans">
                Nhập địa chỉ email của bạn để nhận hướng dẫn đặt lại mật khẩu.
              </p>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />
                <input 
                  type="email" 
                  placeholder="Email" 
                  className="w-full pl-10 pr-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent font-sans"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-primary hover:bg-accent text-white font-display font-bold py-3 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                GỬI LINK KHÔI PHỤC
              </button>
              <div className="text-center">
                <button 
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="text-sm text-primary font-display font-bold hover:text-accent transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <ArrowLeft className="w-4 h-4" /> Quay lại đăng nhập
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Personal Info Group */}
                      <div className="space-y-4">
                        <div className="relative">
                          <User className="absolute left-3 top-3.5 text-gray-400 w-4 h-4" />
                          <input 
                            type="text" 
                            placeholder="Họ và tên" 
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-sans text-sm transition-all"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="relative">
                          <select 
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-sans text-sm transition-all appearance-none bg-white"
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            required
                          >
                            <option value="">Giới tính</option>
                            <option value="male">Nam</option>
                            <option value="female">Nữ</option>
                            <option value="other">Khác</option>
                          </select>
                        </div>
                        <div className="relative">
                          <div className="absolute left-3 top-3.5 text-gray-400 font-display font-bold text-xs">+84</div>
                          <input 
                            type="tel" 
                            placeholder="Số điện thoại" 
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-sans text-sm transition-all"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                          />
                        </div>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-3.5 text-gray-400 w-4 h-4" />
                          <input 
                            type="text" 
                            placeholder="Nơi làm việc" 
                            list="provinces"
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-sans text-sm transition-all"
                            value={workLocation}
                            onChange={(e) => setWorkLocation(e.target.value)}
                            required
                          />
                          <datalist id="provinces">
                            {PROVINCES.map((province) => (
                              <option key={province} value={province} />
                            ))}
                          </datalist>
                        </div>
                      </div>

                      {/* Account Info Group */}
                      <div className="space-y-4">
                        <div className="relative">
                          <Mail className="absolute left-3 top-3.5 text-gray-400 w-4 h-4" />
                          <input 
                            type="email" 
                            placeholder="Email" 
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-sans text-sm transition-all"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3.5 text-gray-400 w-4 h-4" />
                          <input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Mật khẩu" 
                            className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-sans text-sm transition-all"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3.5 text-gray-400 w-4 h-4" />
                          <input 
                            type={showConfirmPassword ? "text" : "password"} 
                            placeholder="Xác nhận mật khẩu" 
                            className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-sans text-sm transition-all"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="relative">
                          <User className="absolute left-3 top-3.5 text-gray-400 w-4 h-4" />
                          <input 
                            type="text" 
                            placeholder="Người giới thiệu (SĐT)" 
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-sans text-sm transition-all"
                            value={referrer}
                            onChange={(e) => setReferrer(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
              )}

              {isLogin && (
                <>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />
                    <input 
                      type="email" 
                      placeholder="Email" 
                      className="w-full pl-10 pr-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent font-sans"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Mật khẩu" 
                      className="w-full pl-10 pr-10 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent font-sans"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <button 
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError('');
                        setSuccessMessage('');
                      }}
                      className="text-xs text-primary hover:text-accent transition-colors font-display font-bold"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                </>
              )}

              <button 
                type="submit" 
                className="w-full bg-primary hover:bg-accent text-white font-display font-bold py-3 px-4 rounded-md transition-colors mt-6 flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <User className="w-5 h-5" />}
                {isLogin ? 'Đăng nhập' : 'Đăng ký'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
