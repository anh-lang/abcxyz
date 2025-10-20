import React, { useState } from 'react';

interface LoginProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onRegister: (email: string, pass: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  authError: string | null;
}

const VinFastLogo = () => (
    <div className="flex items-center justify-center mb-8">
        <svg className="w-12 h-12 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.28 15.44l-4.24-4.24 1.41-1.41 2.83 2.83 6.36-6.36 1.41 1.41-7.77 7.77z"/>
        </svg>
        <span className="text-3xl font-bold text-slate-800 ml-2">VinFast</span>
    </div>
);


export const Login: React.FC<LoginProps> = ({ onLogin, onRegister, onGoogleSignIn, authError }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isLoginView) {
      await onLogin(email, password);
    } else {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      await onRegister(email, password);
    }
  };
  
  const handleGoogleClick = async () => {
      setError('');
      await onGoogleSignIn();
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6">
        <VinFastLogo />
        <div>
          <h2 className="text-center text-2xl font-bold text-slate-900">
            {isLoginView ? 'Đăng nhập vào tài khoản' : 'Tạo tài khoản mới'}
          </h2>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Địa chỉ email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Mật khẩu"
          />
          {!isLoginView && (
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Xác nhận mật khẩu"
            />
          )}
           {(error || authError) && <p className="text-sm text-red-600 text-center animate-pulse">{error || authError}</p>}
          <button
            type="submit"
            className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-colors"
          >
            {isLoginView ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        </form>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-slate-500">Hoặc tiếp tục với</span>
          </div>
        </div>
        <div>
          <button
            onClick={handleGoogleClick}
            className="w-full flex justify-center items-center py-2 px-4 border border-slate-300 rounded-lg shadow-sm bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path>
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path>
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.223 0-9.655-3.657-11.303-8.591l-6.571 4.819C9.656 39.663 16.318 44 24 44z"></path>
              <path fill="#1976D2" d="M43.611 20.083H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C41.389 36.197 44 30.668 44 24c0-1.341-.138-2.65-.389-3.917z"></path>
            </svg>
            Google
          </button>
        </div>
        <p className="text-center text-sm text-slate-600">
          {isLoginView ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
          <button onClick={() => setIsLoginView(!isLoginView)} className="font-medium text-indigo-600 hover:text-indigo-500 ml-1">
            {isLoginView ? 'Đăng ký' : 'Đăng nhập'}
          </button>
        </p>
      </div>
    </div>
  );
};
