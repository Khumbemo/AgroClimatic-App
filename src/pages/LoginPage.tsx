import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sprout } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { signInWithGoogle } = useAuth();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center">
        <div className="bg-green-100 p-4 rounded-2xl mb-6">
          <Sprout className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Scientific Nursery</h1>
        <p className="text-gray-500 text-center mb-8 text-sm font-medium leading-relaxed">
          Comprehensive precision forestry management for seed and seedling production.
        </p>
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 font-bold py-4 px-4 rounded-2xl hover:bg-gray-50 transition-all shadow-sm active:scale-95"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>
        <p className="mt-8 text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">
          Forestry Solutions
        </p>
      </div>
    </div>
  );
};
export default LoginPage;
