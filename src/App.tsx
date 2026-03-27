/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  PlusSquare, 
  Database, 
  Activity, 
  Settings, 
  LogOut, 
  LogIn,
  TrendingUp,
  Lock,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Trash2,
  Menu,
  X,
  Calendar as CalendarIcon,
  ChevronLeft,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday
} from 'date-fns';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { auth, db, signInWithGoogle, logout } from './firebase';

import { cn } from './lib/utils';
import { Expense, UserProfile, ExpenseStatus, TransactionType } from './types';

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We don't throw here to keep the app running, but we could show a toast
}

// --- Components ---

const StatCard = ({ label, value, icon: Icon, highlight = false, onClick }: { label: string, value: string, icon: any, highlight?: boolean, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={cn(
      "brutalist-card p-6 flex flex-col justify-between h-full group hover:scale-[1.02] active:scale-[0.98] cursor-crosshair relative overflow-hidden transition-all",
      highlight && "bg-nexus-accent text-black shadow-[0px_0px_30px_0px_rgba(0,240,255,0.4)]",
      onClick && "cursor-pointer border-nexus-accent/50 hover:border-nexus-accent"
    )}
  >
    <div className="absolute top-0 left-0 w-full h-1 bg-black/10 group-hover:bg-black/30 transition-colors" />
    <div className="flex justify-between items-start relative z-10">
      <div className="flex flex-col">
        <span className={cn("text-[10px] font-black uppercase tracking-[0.2em] opacity-60", highlight && "text-black opacity-80")}>{label}</span>
        {onClick && <span className="text-[8px] font-mono text-nexus-accent opacity-0 group-hover:opacity-100 transition-opacity uppercase">Click to Edit</span>}
      </div>
      <Icon size={18} className={cn("opacity-40 group-hover:opacity-100 transition-opacity group-hover:rotate-12", highlight && "text-black opacity-60")} />
    </div>
    <div className={cn("text-3xl font-display mt-6 leading-none terminal-glow relative z-10", highlight && "text-black")}>{value}</div>
    <div className={cn("mt-4 font-mono text-[8px] opacity-20 group-hover:opacity-40 transition-opacity uppercase tracking-widest", highlight && "text-black opacity-40")}>
      Realtime_Feed // {Math.random().toString(36).slice(2, 7).toUpperCase()}
    </div>
  </div>
);

const ConfirmationModal = ({ isOpen, onConfirm, onCancel, message }: { isOpen: boolean, onConfirm: () => void, onCancel: () => void, message: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="brutalist-card bg-black text-nexus-accent p-8 max-w-md w-full border-[4px] border-nexus-accent relative overflow-hidden">
        <div className="warning-stripes h-2 mb-6" />
        <h3 className="text-3xl font-display mb-4 uppercase italic">Security_Verification</h3>
        <p className="font-mono text-sm mb-8 opacity-80 leading-relaxed">
          {message.toUpperCase()}
        </p>
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={onConfirm}
            className="brutalist-button bg-nexus-accent text-black py-4 font-display text-lg uppercase hover:bg-white transition-colors"
          >
            Confirm_YES
          </button>
          <button 
            onClick={onCancel}
            className="brutalist-button bg-transparent text-nexus-accent border-nexus-accent py-4 font-display text-lg uppercase hover:bg-nexus-accent/10 transition-colors"
          >
            Abort_NO
          </button>
        </div>
        <div className="mt-6 font-mono text-[8px] opacity-30 uppercase tracking-widest text-center">
          Authorization_Required // Protocol_404
        </div>
      </div>
    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={cn("brutalist-sidebar-item w-full text-left", active && "active")}
  >
    <Icon size={20} />
    <span className="font-display tracking-wider text-sm">{label}</span>
  </button>
);

const Logo = () => (
  <div className="p-6 border-b-[3px] border-black bg-nexus-accent text-black relative group cursor-pointer overflow-hidden">
    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
    <div className="flex items-center gap-2 mb-1 relative z-10">
      <Shield size={28} className="text-black group-hover:animate-bounce" />
      <div className="font-display text-3xl leading-none tracking-tighter uppercase terminal-glow">
        NEXUS<br/>VAULT
      </div>
    </div>
    <div className="font-mono text-[9px] font-black tracking-widest border-t border-black pt-1 mt-1 relative z-10 flex justify-between">
      <span>V.3.0.0 // CORE</span>
      <span className="animate-pulse text-red-600">LIVE</span>
    </div>
  </div>
);

const COUNTRIES = [
  { name: 'United States', code: 'US', currency: '$' },
  { name: 'United Kingdom', code: 'GB', currency: '£' },
  { name: 'European Union', code: 'EU', currency: '€' },
  { name: 'India', code: 'IN', currency: '₹' },
  { name: 'Japan', code: 'JP', currency: '¥' },
  { name: 'Australia', code: 'AU', currency: 'A$' },
  { name: 'Canada', code: 'CA', currency: 'C$' },
  { name: 'Brazil', code: 'BR', currency: 'R$' },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Form State
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('FOOD');
  const [txnType, setTxnType] = useState<TransactionType>('EXPENSE');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Balance Edit State
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [tempBalance, setTempBalance] = useState('');
  const [showBalanceConfirm, setShowBalanceConfirm] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Ensure profile exists
        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || '',
              photoURL: currentUser.photoURL || '',
              totalBalance: 0, // Initially 0 as requested
              vaultSavings: 0,
              healthScore: 100,
              country: 'US',
              currency: '$'
            };
            await setDoc(userDocRef, newProfile);
          } else {
            const data = userDoc.data() as UserProfile;
            if (data.totalBalance === undefined) {
              // Ensure totalBalance is initialized and saved if missing
              await setDoc(userDocRef, { totalBalance: 0 }, { merge: true });
            }
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
        }
      } else {
        setProfile(null);
        setExpenses([]);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Real-time profile sync
  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setProfile(doc.data() as UserProfile);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expenseData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Expense[];
      setExpenses(expenseData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'expenses');
    });

    return unsubscribe;
  }, [user]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || !profile) return;

    setIsSubmitting(true);
    const val = parseFloat(amount);
    try {
      // 1. Add the transaction
      await addDoc(collection(db, 'expenses'), {
        userId: user.uid,
        amount: val,
        type: txnType,
        category,
        description,
        timestamp: serverTimestamp(),
        status: 'PAID'
      });

      // 2. Update the user profile balance
      const userDocRef = doc(db, 'users', user.uid);
      const newBalance = txnType === 'INCOME' 
        ? profile.totalBalance + val 
        : profile.totalBalance - val;
      
      await setDoc(userDocRef, { 
        ...profile, 
        totalBalance: newBalance 
      }, { merge: true });

      setAmount('');
      setDescription('');
      setActiveTab('Dashboard'); // Redirect to dashboard after adding
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'expenses');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (exp: Expense) => {
    if (!user || !profile) return;
    
    try {
      // 1. Delete the doc
      await deleteDoc(doc(db, 'expenses', exp.id));

      // 2. Revert the balance
      const userDocRef = doc(db, 'users', user.uid);
      const newBalance = exp.type === 'INCOME' 
        ? profile.totalBalance - exp.amount 
        : profile.totalBalance + exp.amount;
      
      await setDoc(userDocRef, { 
        ...profile, 
        totalBalance: newBalance 
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `expenses/${exp.id}`);
    }
  };

  const totals = useMemo(() => {
    const income = expenses
      .filter(e => e.type === 'INCOME')
      .reduce((acc, curr) => acc + curr.amount, 0);
    const outflow = expenses
      .filter(e => e.type === 'EXPENSE')
      .reduce((acc, curr) => acc + curr.amount, 0);
    return { income, outflow };
  }, [expenses]);

  const anomalies = useMemo(() => {
    const expenseList = expenses.filter(e => e.type === 'EXPENSE');
    if (expenseList.length === 0) return [];

    // Calculate average per category
    const categoryAverages: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    expenseList.forEach(e => {
      categoryAverages[e.category] = (categoryAverages[e.category] || 0) + e.amount;
      categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
    });

    Object.keys(categoryAverages).forEach(cat => {
      categoryAverages[cat] = categoryAverages[cat] / categoryCounts[cat];
    });

    // Identify anomalies: > 2.5x category average OR > 1000
    return expenseList.filter(e => {
      const isHighForCategory = e.amount > (categoryAverages[e.category] * 2.5) && categoryCounts[e.category] > 1;
      const isAbsoluteHigh = e.amount > 1000;
      return isHighForCategory || isAbsoluteHigh;
    });
  }, [expenses]);

  const financialStatus = useMemo(() => {
    if (!profile) return { status: 'UNKNOWN', color: 'text-gray-500', message: 'WAITING_FOR_DATA' };
    
    const burnRate = totals.outflow / (totals.income || 1);
    const savingsRate = ((totals.income - totals.outflow) / (totals.income || 1)) * 100;
    
    if (profile.totalBalance < 0) return { status: 'CRITICAL_DEBT', color: 'text-red-500', message: 'IMMEDIATE_ACTION_REQUIRED' };
    if (burnRate > 0.9) return { status: 'HIGH_BURN', color: 'text-orange-500', message: '' };
    if (savingsRate > 20) return { status: 'OPTIMAL_GROWTH', color: 'text-green-500', message: 'VAULT_EFFICIENCY_MAXIMIZED' };
    
    return { status: 'STABLE_CORE', color: 'text-nexus-accent', message: '' };
  }, [profile, totals]);

  const calculatedHealthScore = useMemo(() => {
    if (expenses.length === 0) return 100;
    const burnRate = totals.outflow / (totals.income || 1);
    const savingsFactor = Math.max(0, 100 - (burnRate * 100));
    const anomalyPenalty = anomalies.length * 5;
    const balanceFactor = profile?.totalBalance && profile.totalBalance > 0 ? 20 : 0;
    
    return Math.min(100, Math.max(0, Math.round((savingsFactor * 0.6) + balanceFactor + (20 - anomalyPenalty))));
  }, [totals, anomalies, profile]);

  const categories = [
    'FOOD', 'SALARY', 'RENT', 'UTILITIES', 'TRAVEL', 'ENTERTAINMENT', 'HEALTH', 'OTHER'
  ];

  const categoryData = useMemo(() => {
    const data = categories.map(cat => ({
      name: cat,
      value: expenses
        .filter(e => e.category === cat && e.type === 'EXPENSE')
        .reduce((acc, curr) => acc + curr.amount, 0)
    })).filter(d => d.value > 0);
    return data;
  }, [expenses]);

  const COLORS = ['#00F0FF', '#00FF00', '#FF0000', '#0000FF', '#FF00FF', '#00FFFF', '#888888', '#FFFFFF'];

  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      // Error handled in firebase.ts
    } finally {
      setLoginLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#050505]">
        <div className="text-nexus-accent font-mono text-xl animate-pulse tracking-[0.5em]">
          INITIALIZING_VAULT_PROTOCOL...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-nexus-bg p-4 md:p-8 relative overflow-hidden">
        <div className="scanlines" />
        <div className="nexus-grid absolute inset-0 opacity-10" />
        
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="brutalist-card bg-black/80 backdrop-blur-xl text-white p-8 md:p-10 max-w-lg w-full text-center relative z-10 border-nexus-accent/20"
        >
          <div className="warning-stripes h-1 mb-6 opacity-30" />
          
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-nexus-accent/20 blur-2xl rounded-full animate-pulse" />
            <Shield size={48} className="relative z-10 text-nexus-accent animate-pulse" />
          </div>

          <h1 className="text-4xl md:text-6xl font-display mb-4 uppercase italic terminal-glow tracking-tighter leading-none">
            Nexus <span className="text-nexus-accent">Vault</span>
          </h1>
          
          <div className="font-mono text-[10px] tracking-[0.4em] mb-6 opacity-40 border-y border-white/10 py-2 uppercase">
            Secure_Financial_Core_v3.0.0 // Encrypted_Session
          </div>
          
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="font-mono text-xs opacity-60 uppercase tracking-widest">
                System Status: <span className="text-nexus-accent">AWAITING_AUTHORIZATION</span>
              </p>
              <p className="font-mono text-[10px] opacity-40 leading-relaxed max-w-sm mx-auto">
                ESTABLISHING SECURE CONNECTION TO THE VAULT. 
                PLEASE PROVIDE BIOMETRIC CREDENTIALS VIA GOOGLE VAULT.
              </p>
            </div>
            
            <button 
              onClick={handleLogin}
              disabled={loginLoading}
              className={cn(
                "brutalist-button w-full flex items-center justify-center gap-4 py-4 text-lg group overflow-hidden relative",
                loginLoading && "opacity-50 cursor-wait"
              )}
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
              {loginLoading ? (
                <div className="w-6 h-6 border-2 border-black border-t-transparent animate-spin rounded-full" />
              ) : (
                <LogIn size={24} className="relative z-10" />
              )}
              <span className="relative z-10 font-black tracking-widest">
                {loginLoading ? 'SYNCHRONIZING...' : 'AUTHORIZE_VAULT'}
              </span>
            </button>

            <div className="pt-4 border-t border-white/5">
              <div className="text-[9px] font-mono opacity-30 uppercase tracking-[0.2em] space-y-2">
                <div>Trouble logging in? Open the app in a new browser tab.</div>
                <div className="text-nexus-accent/60">If popups are blocked, the system will attempt a redirect.</div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 font-mono text-[8px] opacity-30 uppercase tracking-widest flex justify-between">
            <span>Encrypted_Session: Active</span>
            <span>Node: {Math.random().toString(36).slice(2, 10).toUpperCase()}</span>
          </div>
        </motion.div>
        
        <div className="absolute bottom-8 font-mono text-[10px] opacity-20 uppercase tracking-[0.5em]">
          Nexus Vault // Global Secure Network
        </div>
      </div>
    );
  }

  const handleUpdateBalance = async () => {
    if (!user || !tempBalance) return;
    const newBalance = parseFloat(tempBalance);
    if (isNaN(newBalance)) return;

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { totalBalance: newBalance }, { merge: true });
      setIsEditingBalance(false);
      setShowBalanceConfirm(false);
      setTempBalance('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleUpdateCountry = async (countryCode: string) => {
    if (!user) return;
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (!country) return;

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { 
        country: country.code, 
        currency: country.currency 
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Calendar':
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);
        const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

        const expensesByDay = expenses.reduce((acc, exp) => {
          if (!exp.timestamp) return acc;
          const dateKey = format(exp.timestamp.toDate(), 'yyyy-MM-dd');
          if (!acc[dateKey]) acc[dateKey] = [];
          acc[dateKey].push(exp);
          return acc;
        }, {} as Record<string, Expense[]>);

        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="brutalist-card p-6 bg-black text-white">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
                <h3 className="font-display text-2xl md:text-3xl uppercase tracking-widest flex items-center gap-3">
                  <CalendarIcon size={32} className="text-nexus-accent" />
                  Expense Timeline
                </h3>
                <div className="flex items-center gap-4 brutalist-card p-2 bg-white/5 border-white/20">
                  <button 
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-2 hover:bg-nexus-accent hover:text-black transition-colors"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <div className="font-display text-xl min-w-[160px] text-center uppercase tracking-widest">
                    {format(currentMonth, 'MMMM yyyy')}
                  </div>
                  <button 
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 hover:bg-nexus-accent hover:text-black transition-colors"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-px bg-white/10 border-[3px] border-black overflow-hidden">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="bg-[#1a1a1a] p-2 text-center font-black text-[10px] uppercase tracking-widest text-nexus-accent border-b-[3px] border-black">
                    {day}
                  </div>
                ))}
                {calendarDays.map((day, i) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const dayExpenses = expensesByDay[dateKey] || [];
                  const dayTotal = dayExpenses.reduce((sum, exp) => sum + (exp.type === 'EXPENSE' ? exp.amount : 0), 0);
                  const isCurrentMonth = isSameMonth(day, monthStart);
                  
                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "min-h-[100px] p-2 bg-black transition-all hover:bg-white/5 flex flex-col gap-1 border-r border-b border-white/5",
                        !isCurrentMonth && "opacity-20 grayscale",
                        isToday(day) && "ring-2 ring-nexus-accent ring-inset bg-nexus-accent/5"
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <span className={cn(
                          "font-mono text-xs font-bold",
                          isToday(day) ? "text-nexus-accent" : "text-white/40"
                        )}>
                          {format(day, 'd')}
                        </span>
                        {dayTotal > 0 && (
                          <span className="text-[10px] font-black text-red-400">
                            -{profile?.currency || '$'}{dayTotal.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-1 max-h-[60px] custom-scrollbar">
                        {dayExpenses.slice(0, 3).map(exp => (
                          <div key={exp.id} className={cn(
                            "text-[8px] font-mono p-1 truncate",
                            exp.type === 'INCOME' ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400"
                          )}>
                            {exp.type === 'INCOME' ? '+' : '-'}{exp.amount} {exp.category}
                          </div>
                        ))}
                        {dayExpenses.length > 3 && (
                          <div className="text-[8px] font-mono opacity-30 text-center">
                            +{dayExpenses.length - 3} MORE
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Month Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="brutalist-card p-6 bg-black text-white border-nexus-accent/30">
                <div className="text-[10px] font-mono opacity-50 uppercase mb-2">Monthly Outflow</div>
                <div className="text-2xl font-display text-red-400">
                  {profile?.currency || '$'}{expenses
                    .filter(e => e.type === 'EXPENSE' && e.timestamp && isSameMonth(e.timestamp.toDate(), currentMonth))
                    .reduce((sum, e) => sum + e.amount, 0)
                    .toLocaleString()}
                </div>
              </div>
              <div className="brutalist-card p-6 bg-black text-white border-blue-500/30">
                <div className="text-[10px] font-mono opacity-50 uppercase mb-2">Monthly Inflow</div>
                <div className="text-2xl font-display text-blue-400">
                  {profile?.currency || '$'}{expenses
                    .filter(e => e.type === 'INCOME' && e.timestamp && isSameMonth(e.timestamp.toDate(), currentMonth))
                    .reduce((sum, e) => sum + e.amount, 0)
                    .toLocaleString()}
                </div>
              </div>
              <div className="brutalist-card p-6 bg-black text-white border-green-500/30">
                <div className="text-[10px] font-mono opacity-50 uppercase mb-2">Net Cashflow</div>
                <div className="text-2xl font-display text-green-400">
                  {profile?.currency || '$'}{(
                    expenses
                      .filter(e => e.type === 'INCOME' && e.timestamp && isSameMonth(e.timestamp.toDate(), currentMonth))
                      .reduce((sum, e) => sum + e.amount, 0) -
                    expenses
                      .filter(e => e.type === 'EXPENSE' && e.timestamp && isSameMonth(e.timestamp.toDate(), currentMonth))
                      .reduce((sum, e) => sum + e.amount, 0)
                  ).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        );
      case 'Dashboard':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {isEditingBalance ? (
                <div className="brutalist-card p-6 flex flex-col justify-between h-full border-nexus-accent bg-black/40">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-nexus-accent">Manual_Override</span>
                    <Wallet size={18} className="text-nexus-accent" />
                  </div>
                  <div className="mt-6 flex items-end gap-2">
                    <span className="text-2xl font-display text-nexus-accent">{profile?.currency || '$'}</span>
                    <input 
                      autoFocus
                      type="number" 
                      value={tempBalance}
                      onChange={(e) => setTempBalance(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setShowBalanceConfirm(true);
                        if (e.key === 'Escape') setIsEditingBalance(false);
                      }}
                      className="bg-transparent border-b-2 border-nexus-accent text-3xl font-display w-full focus:outline-none text-white"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button 
                      onClick={() => setShowBalanceConfirm(true)}
                      className="text-[10px] font-mono bg-nexus-accent text-black px-2 py-1 uppercase font-bold"
                    >
                      Update
                    </button>
                    <button 
                      onClick={() => setIsEditingBalance(false)}
                      className="text-[10px] font-mono border border-white/20 text-white/50 px-2 py-1 uppercase"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <StatCard 
                  label="Total Balance" 
                  value={`${profile?.currency || '$'}${(profile?.totalBalance || 0).toLocaleString()}`} 
                  icon={Wallet} 
                  onClick={() => {
                    setTempBalance((profile?.totalBalance || 0).toString());
                    setIsEditingBalance(true);
                  }}
                />
              )}
              <StatCard label="Total Income" value={`${profile?.currency || '$'}${totals.income.toLocaleString()}`} icon={TrendingUp} />
              <StatCard label="Total Outflow" value={`${profile?.currency || '$'}${totals.outflow.toLocaleString()}`} icon={AlertTriangle} />
              <StatCard label="Health Score" value={`${calculatedHealthScore}/100`} icon={Activity} highlight />
            </div>

            {/* Overspending Alerts & Unusual Transactions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="brutalist-card p-6 bg-black text-white border-nexus-accent/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display text-xl uppercase tracking-widest flex items-center gap-2">
                    <Activity size={20} className="text-nexus-accent" />
                    Overspending Alerts
                  </h3>
                  <div className={cn("font-mono text-[10px] px-2 py-1 bg-white/10", financialStatus.color)}>
                    {anomalies.length} ALERTS
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="text-4xl font-display italic terminal-glow">{financialStatus.message}</div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                    <div>
                      <div className="text-[8px] font-mono opacity-50 uppercase tracking-widest">Burn Rate</div>
                      <div className="text-lg font-display">{(totals.outflow / (totals.income || 1) * 100).toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-[8px] font-mono opacity-50 uppercase tracking-widest">Savings Rate</div>
                      <div className="text-lg font-display">{(((totals.income - totals.outflow) / (totals.income || 1)) * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="brutalist-card p-6 bg-black text-white border-red-500/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display text-xl uppercase tracking-widest flex items-center gap-2 text-red-500">
                    <AlertTriangle size={20} />
                    Unusual Transactions
                  </h3>
                  <div className="font-mono text-[10px] px-2 py-1 bg-red-500/20 text-red-500">
                    {anomalies.length} FLAGS
                  </div>
                </div>
                <div className="space-y-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                  {anomalies.length > 0 ? (
                    anomalies.map(ano => (
                      <div key={ano.id} className="flex justify-between items-center p-2 bg-white/5 border-l-2 border-red-500">
                        <div>
                          <div className="text-[10px] font-black uppercase">{ano.category}</div>
                          <div className="text-[8px] font-mono opacity-50 truncate w-32">{ano.description || 'NO_DESC'}</div>
                        </div>
                        <div className="text-red-400 font-bold">-{profile?.currency || '$'}{ano.amount.toLocaleString()}</div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs font-mono opacity-30 italic py-8">
                      NO_UNUSUAL_ACTIVITY_DETECTED
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="brutalist-card bg-black text-white p-0 overflow-hidden">
                  <div className="p-4 border-b-[3px] border-black bg-[#1a1a1a] flex justify-between items-center">
                    <h3 className="font-display uppercase tracking-widest flex items-center gap-2 text-xl">
                      <Database size={18} />
                      Recent Logs
                    </h3>
                    <button onClick={() => setActiveTab('Log')} className="text-[10px] font-mono text-nexus-accent hover:underline">VIEW_ALL_LOGS</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-sm">
                      <thead>
                        <tr className="bg-[#222] text-nexus-accent uppercase text-[10px] tracking-widest">
                          <th className="p-4 border-b-[3px] border-black">TX_ID</th>
                          <th className="p-4 border-b-[3px] border-black">Type</th>
                          <th className="p-4 border-b-[3px] border-black">Sector</th>
                          <th className="p-4 border-b-[3px] border-black">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.slice(0, 5).map((exp) => (
                          <tr key={exp.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                            <td className="p-4 text-xs opacity-50">{exp.id.slice(0, 8).toUpperCase()}</td>
                            <td className="p-4">
                              <span className={cn(
                                "px-2 py-0.5 text-[9px] font-black",
                                exp.type === 'INCOME' ? "bg-blue-500 text-white" : "bg-orange-500 text-white"
                                )}>
                                {exp.type}
                              </span>
                            </td>
                            <td className="p-4">{exp.category}</td>
                            <td className={cn("p-4 font-bold text-sm", exp.type === 'INCOME' ? "text-green-400" : "text-red-400")}>
                              {exp.type === 'INCOME' ? '+' : '-'}{profile?.currency || '$'}{exp.amount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* System Console */}
                <div className="brutalist-card bg-black text-green-500 p-4 font-mono text-[10px] h-48 overflow-hidden relative">
                  <div className="absolute top-2 right-4 text-[8px] opacity-30 animate-pulse">SYS_MONITOR_ACTIVE</div>
                  <div className="space-y-1">
                    <div className="opacity-50">[{format(new Date(), 'HH:mm:ss')}] INITIALIZING_SUBSYSTEMS...</div>
                    <div className="opacity-50">[{format(new Date(), 'HH:mm:ss')}] SECURE_TUNNEL_ESTABLISHED</div>
                    <div className="opacity-50">[{format(new Date(), 'HH:mm:ss')}] SYNCING_VAULT_DATA...</div>
                    <div className="text-nexus-accent">[{format(new Date(), 'HH:mm:ss')}] WELCOME_BACK_OPERATOR_{user.displayName?.toUpperCase().replace(' ', '_')}</div>
                    {expenses.slice(0, 3).map((exp, i) => (
                      <div key={i} className="opacity-70">
                        [{exp.timestamp ? format(exp.timestamp.toDate(), 'HH:mm:ss') : '...'} ] DETECTED_{exp.type}_OF_{profile?.currency || '$'}{exp.amount}_IN_{exp.category}
                      </div>
                    ))}
                    <div className="animate-pulse">_</div>
                  </div>
                </div>
              </div>

              <div className="brutalist-card p-6 min-h-[300px] flex flex-col">
                <h3 className="font-display uppercase tracking-widest mb-4 flex items-center gap-2 text-xl">
                  <TrendingUp size={18} />
                  Sector Breakdown
                </h3>
                {categoryData.length > 0 ? (
                  <div className="flex-1 h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} dataKey="value" stroke="#000" strokeWidth={2}>
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ backgroundColor: '#000', border: '3px solid #00F0FF', color: '#fff', fontFamily: 'monospace' }} itemStyle={{ color: '#00F0FF' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs font-mono opacity-30 italic">NO_OUTFLOW_DATA</div>
                )}
              </div>
            </div>
          </div>
        );
      case 'Inject':
        return (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="brutalist-card p-8">
              <h3 className="font-display text-3xl uppercase tracking-widest mb-8 flex items-center gap-3">
                <PlusSquare size={32} />
                Inject Record Protocol
              </h3>
              <form onSubmit={handleAddExpense} className="space-y-6">
                <div className="flex border-[3px] border-black">
                  <button type="button" onClick={() => setTxnType('EXPENSE')} className={cn("flex-1 py-4 font-display text-xl uppercase transition-all", txnType === 'EXPENSE' ? "bg-red-500 text-white" : "bg-white text-black")}>Expense</button>
                  <button type="button" onClick={() => setTxnType('INCOME')} className={cn("flex-1 py-4 font-display text-xl uppercase transition-all", txnType === 'INCOME' ? "bg-green-500 text-white" : "bg-white text-black")}>Income</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest opacity-50">Amount_{profile?.currency === '$' ? 'USD' : 'LOCAL'}</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-lg">{profile?.currency || '$'}</span>
                      <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="brutalist-input w-full pl-10 text-lg" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest opacity-50">Classification</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="brutalist-input w-full appearance-none text-xl">
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest opacity-50">Data_Log_Desc</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="ENTER SECURE DETAILS..." className="brutalist-input w-full h-32 resize-none text-lg" />
                </div>
                <button type="submit" disabled={isSubmitting} className="brutalist-button w-full text-2xl py-6 flex items-center justify-center gap-3">
                  {isSubmitting ? <Clock size={32} className="animate-spin" /> : <><ChevronRight size={32} />Authorize_TXN</>}
                </button>
              </form>
            </div>
          </div>
        );
      case 'Log':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="brutalist-card bg-black text-white p-0 overflow-hidden">
              <div className="p-6 border-b-[3px] border-black bg-[#1a1a1a] flex justify-between items-center">
                <h3 className="font-display text-2xl uppercase tracking-widest flex items-center gap-3">
                  <Database size={24} />
                  Complete Registry
                </h3>
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left font-mono text-sm">
                  <thead>
                    <tr className="bg-[#222] text-nexus-accent uppercase text-xs tracking-widest">
                      <th className="p-6 border-b-[3px] border-black">TX_ID</th>
                      <th className="p-6 border-b-[3px] border-black">Timestamp</th>
                      <th className="p-6 border-b-[3px] border-black">Type</th>
                      <th className="p-6 border-b-[3px] border-black">Sector</th>
                      <th className="p-6 border-b-[3px] border-black">Amount</th>
                      <th className="p-6 border-b-[3px] border-black">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                        <td className="p-6 text-xs opacity-50">{exp.id.toUpperCase()}</td>
                        <td className="p-6">{exp.timestamp ? format(exp.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss') : 'PENDING'}</td>
                        <td className="p-6">
                          <span className={cn("px-3 py-1 text-xs font-black", exp.type === 'INCOME' ? "bg-blue-500 text-white" : "bg-orange-500 text-white")}>{exp.type}</span>
                        </td>
                        <td className="p-6">{exp.category}</td>
                        <td className={cn("p-6 font-bold text-sm", exp.type === 'INCOME' ? "text-green-400" : "text-red-400")}>
                          {exp.type === 'INCOME' ? '+' : '-'}{profile?.currency || '$'}{exp.amount.toLocaleString()}
                        </td>
                        <td className="p-6">
                          <button onClick={() => handleDeleteExpense(exp)} className="text-red-500 hover:text-red-400 transition-colors p-2 border-2 border-transparent hover:border-red-500">
                            <Trash2 size={20} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-white/10">
                {expenses.map((exp) => (
                  <div key={exp.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono opacity-30 uppercase">ID: {exp.id.toUpperCase()}</div>
                        <div className="text-xs font-mono opacity-60">{exp.timestamp ? format(exp.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss') : 'PENDING'}</div>
                      </div>
                      <span className={cn("px-2 py-0.5 text-[10px] font-black uppercase", exp.type === 'INCOME' ? "bg-blue-500 text-white" : "bg-orange-500 text-white")}>
                        {exp.type}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-nexus-accent mb-1">Sector</div>
                        <div className="font-display text-lg">{exp.category}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-black uppercase tracking-widest text-nexus-accent mb-1">Amount</div>
                        <div className={cn("font-display text-xl leading-none", exp.type === 'INCOME' ? "text-green-400" : "text-red-400")}>
                          {exp.type === 'INCOME' ? '+' : '-'}{profile?.currency || '$'}{exp.amount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteExpense(exp)} 
                      className="w-full py-2 border-2 border-red-500/30 text-red-500 font-mono text-[10px] uppercase hover:bg-red-500/10 transition-all"
                    >
                      Delete_Record
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'Health':
        return (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="brutalist-card p-0 overflow-hidden bg-black text-white">
              <div className="warning-stripes h-10 border-b-[3px] border-black flex items-center justify-center">
                <span className="bg-black text-nexus-accent px-4 font-black text-xs tracking-[0.5em] uppercase">System Integrity Scan</span>
              </div>
              <div className="p-6 md:p-12 text-center relative">
                <div className="absolute top-4 right-4 font-mono text-[10px] opacity-30">SCAN_REF: {Math.random().toString(36).slice(2, 10).toUpperCase()}</div>
                <h3 className="font-display text-3xl md:text-5xl uppercase tracking-widest mb-8 md:mb-12 terminal-glow italic">CORE_STABILITY</h3>
                
                <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-12 mb-8 md:mb-12">
                  <div className="relative scale-75 md:scale-100">
                    <svg className="w-64 h-64 -rotate-90">
                      <circle cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                      <motion.circle 
                        cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="8" fill="transparent" 
                        strokeDasharray={2 * Math.PI * 120}
                        initial={{ strokeDashoffset: 2 * Math.PI * 120 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 120 * (1 - calculatedHealthScore / 100) }}
                        transition={{ duration: 2, ease: "easeOut" }}
                        className={cn(
                          calculatedHealthScore > 70 ? "text-green-500" : 
                          calculatedHealthScore > 40 ? "text-nexus-accent" : "text-red-500"
                        )} 
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={cn(
                        "font-display leading-none",
                        calculatedHealthScore === 100 ? "text-5xl" : "text-6xl"
                      )}>{calculatedHealthScore}</span>
                      <span className="text-xl font-display opacity-50 uppercase">Percent</span>
                    </div>
                  </div>
                  
                  <div className="text-left space-y-6">
                    <div className="space-y-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-nexus-accent">Risk Assessment</div>
                      <div className={cn("text-2xl font-display italic", calculatedHealthScore > 70 ? "text-green-400" : calculatedHealthScore > 40 ? "text-nexus-accent" : "text-red-500")}>
                        {calculatedHealthScore > 70 ? 'LOW_EXPOSURE' : calculatedHealthScore > 40 ? 'MODERATE_RISK' : 'CRITICAL_VULN'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-nexus-accent">Protocol Status</div>
                      <div className="text-2xl font-display italic">{financialStatus.status}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 text-left">
                  <div className="p-6 border-2 border-white/10 bg-white/5">
                    <h4 className="font-display text-xl uppercase mb-4 text-nexus-accent">System Insights</h4>
                    <ul className="space-y-3 font-mono text-xs">
                      <li className="flex items-start gap-2">
                        <span className="text-nexus-accent">▶</span>
                        <span>SAVINGS_RATE: {(((totals.income - totals.outflow) / (totals.income || 1)) * 100).toFixed(1)}% ({calculatedHealthScore > 70 ? 'OPTIMAL' : 'NEEDS_IMPROVEMENT'})</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-nexus-accent">▶</span>
                        <span>ANOMALIES_DETECTED: {anomalies.length} (PENALTY: -{anomalies.length * 5}PTS)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-nexus-accent">▶</span>
                        <span>MONTHLY_BURN: {((totals.outflow / (totals.income || 1)) * 100).toFixed(1)}%</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-nexus-accent">▶</span>
                        <span>VAULT_RESERVE: {profile?.totalBalance && profile.totalBalance > 0 ? 'POSITIVE' : 'NEGATIVE'}</span>
                      </li>
                    </ul>
                  </div>
                  <div className="p-6 border-2 border-white/10 bg-white/5">
                    <h4 className="font-display text-xl uppercase mb-4 text-red-500">Action Required</h4>
                    <div className="space-y-4 font-mono text-xs">
                      {anomalies.length > 0 && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400">
                          DETECTED_{anomalies.length}_OUTLIER_TXNS. REVIEW_REGISTRY_LOG_IMMEDIATELY.
                        </div>
                      )}
                      {totals.outflow > totals.income && (
                        <div className="p-3 bg-orange-500/10 border border-orange-500/30 text-orange-400">
                          OUTFLOW_EXCEEDS_INCOME.
                        </div>
                      )}
                      {calculatedHealthScore < 50 && (
                        <div className="p-3 bg-red-500/20 border border-red-500 text-red-500 font-bold animate-pulse">
                          CRITICAL_FINANCIAL_INSTABILITY. RECONSTRUCT_BUDGET_PROTOCOL.
                        </div>
                      )}
                      {calculatedHealthScore >= 80 && (
                        <div className="p-3 bg-green-500/10 border border-green-500/30 text-green-400">
                          SYSTEM_STABLE. NO_IMMEDIATE_ACTION_REQUIRED.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8">
                  <div className="brutalist-card p-4 md:p-6 bg-[#111] border-white/20 text-white hover:border-nexus-accent transition-colors group">
                    <div className="text-[10px] uppercase opacity-50 mb-2 group-hover:text-nexus-accent">Liquidity</div>
                    <div className="text-xl md:text-2xl font-display">OPTIMAL</div>
                    <div className="mt-4 h-1 bg-white/10 overflow-hidden">
                      <div className="h-full bg-green-500 w-[90%]" />
                    </div>
                  </div>
                  <div className="brutalist-card p-4 md:p-6 bg-[#111] border-white/20 text-white hover:border-nexus-accent transition-colors group">
                    <div className="text-[10px] uppercase opacity-50 mb-2 group-hover:text-nexus-accent">Volatility</div>
                    <div className="text-xl md:text-2xl font-display">STABLE</div>
                    <div className="mt-4 h-1 bg-white/10 overflow-hidden">
                      <div className="h-full bg-blue-500 w-[15%]" />
                    </div>
                  </div>
                  <div className="brutalist-card p-4 md:p-6 bg-[#111] border-white/20 text-white hover:border-nexus-accent transition-colors group">
                    <div className="text-[10px] uppercase opacity-50 mb-2 group-hover:text-nexus-accent">Vault Depth</div>
                    <div className="text-xl md:text-2xl font-display">DEEP</div>
                    <div className="mt-4 h-1 bg-white/10 overflow-hidden">
                      <div className="h-full bg-nexus-accent w-[75%]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'Config':
        return (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="brutalist-card p-6 md:p-8">
              <h3 className="font-display text-2xl md:text-3xl uppercase tracking-widest mb-6 md:mb-8 flex items-center gap-3">
                <Settings size={32} />
                System Configuration
              </h3>
              <div className="space-y-6 md:space-y-8">
                <div className="p-4 md:p-6 border-[3px] border-black bg-black/5">
                  <h4 className="font-display text-xl mb-4">User Identity</h4>
                  <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                    <img src={user.photoURL || ''} className="w-16 h-16 border-[3px] border-black" alt="User" />
                    <div>
                      <div className="font-black uppercase break-all">{user.displayName}</div>
                      <div className="font-mono text-xs opacity-50 break-all">{user.email}</div>
                    </div>
                  </div>
                </div>
                <div className="p-6 border-[3px] border-black bg-black/5">
                  <h4 className="font-display text-xl mb-4">Regional Protocol</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Select Country / Currency</label>
                      <select 
                        value={profile?.country || 'US'} 
                        onChange={(e) => handleUpdateCountry(e.target.value)}
                        className="brutalist-input w-full appearance-none text-lg bg-white"
                      >
                        {COUNTRIES.map(country => (
                          <option key={country.code} value={country.code}>
                            {country.name} ({country.currency})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-black text-nexus-accent font-mono text-xs">
                      <span>ACTIVE_CURRENCY</span>
                      <span className="font-black">{profile?.currency || '$'}</span>
                    </div>
                  </div>
                </div>
                <div className="p-6 border-[3px] border-black bg-black/5">
                  <h4 className="font-display text-xl mb-4">Security Protocol</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-sm uppercase">Encryption Level</span>
                      <span className="bg-black text-nexus-accent px-3 py-1 font-black text-xs">AES-256-GCM</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-sm uppercase">Auth Provider</span>
                      <span className="bg-black text-nexus-accent px-3 py-1 font-black text-xs">GOOGLE_OAUTH_2</span>
                    </div>
                  </div>
                </div>
                <div className="p-6 border-[3px] border-black bg-black/5">
                  <h4 className="font-display text-xl mb-4 text-red-500">Danger Zone</h4>
                  <button 
                    onClick={() => {
                      setTempBalance('0');
                      setShowBalanceConfirm(true);
                    }}
                    className="brutalist-button w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white text-sm py-3"
                  >
                    RESET_CORE_BALANCE_TO_ZERO
                  </button>
                </div>
                <button onClick={logout} className="brutalist-button w-full bg-red-500 text-white hover:bg-red-600">
                  TERMINATE_ALL_SESSIONS
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-nexus-bg relative">
      <div className="scanlines" />
      
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsSidebarOpen(true)}
        className="lg:hidden fixed top-6 left-6 z-30 brutalist-button p-2 bg-nexus-accent text-black border-[2px] border-black"
      >
        <Menu size={24} />
      </button>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>
      
      {/* Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || (typeof window !== 'undefined' && window.innerWidth >= 1024)) && (
          <motion.aside 
            initial={{ x: -240 }}
            animate={{ x: 0 }}
            exit={{ x: -240 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "fixed lg:relative top-0 left-0 h-full w-[240px] bg-black flex flex-col border-r-[3px] border-black shrink-0 z-50 lg:z-20",
              !isSidebarOpen && "hidden lg:flex"
            )}
          >
            <div className="flex justify-between items-center lg:block">
              <Logo />
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden p-4 text-nexus-accent"
              >
                <X size={24} />
              </button>
            </div>

            <nav className="flex-1 nexus-grid">
              <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'Dashboard'} onClick={() => { setActiveTab('Dashboard'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={CalendarIcon} label="Calendar" active={activeTab === 'Calendar'} onClick={() => { setActiveTab('Calendar'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={PlusSquare} label="Inject Record" active={activeTab === 'Inject'} onClick={() => { setActiveTab('Inject'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={Database} label="Registry Log" active={activeTab === 'Log'} onClick={() => { setActiveTab('Log'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={Activity} label="Health Scan" active={activeTab === 'Health'} onClick={() => { setActiveTab('Health'); setIsSidebarOpen(false); }} />
              <SidebarItem icon={Settings} label="System Config" active={activeTab === 'Config'} onClick={() => { setActiveTab('Config'); setIsSidebarOpen(false); }} />
            </nav>

            <div className="p-4 mt-auto border-t-[3px] border-black bg-[#050505]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                <div className="font-mono text-[8px] text-green-500 uppercase tracking-tighter">Vault Established</div>
              </div>
              <div className="font-mono text-[8px] text-white/30 uppercase mb-4 space-y-1">
                <div>CPU_LOAD: 12.4%</div>
                <div>MEM_USAGE: 4.2GB</div>
              </div>
              <button 
                onClick={logout}
                className="flex items-center justify-center gap-2 text-red-500 font-mono text-[10px] uppercase border-[2px] border-red-500/30 hover:bg-red-500/10 hover:border-red-500 transition-all w-full py-3 group"
              >
                <LogOut size={14} className="group-hover:translate-x-1 transition-transform" />
                <span>Terminate Session</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 lg:pt-8 flex flex-col nexus-grid relative">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col relative z-10">
          {/* Header */}
          <header className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b-[3px] border-white/10 pb-6 mb-8">
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-display uppercase italic tracking-tighter leading-none terminal-glow">
                {activeTab.toUpperCase()}_PRTCL
              </h2>
              <div className="flex items-center gap-2 mt-2 font-mono text-[10px] text-nexus-accent">
                <div className="w-1.5 h-1.5 bg-nexus-accent animate-pulse" />
                VAULT_SECURED // ACCESS_GRANTED
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right font-mono text-[9px] opacity-50 space-y-0.5 hidden md:block">
                <div className="text-nexus-accent font-black">OP_ID: {user.uid.slice(0, 12).toUpperCase()}</div>
                <div>LOC: {Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
                <div>{format(new Date(), 'yyyy.MM.dd // HH:mm:ss')}</div>
              </div>
              
              <div className="flex items-center gap-3">
                <div 
                  onClick={() => setActiveTab('Config')}
                  className="brutalist-card bg-black text-white p-2 flex items-center gap-3 border-white/20 hover:border-nexus-accent transition-colors cursor-pointer group relative"
                >
                  <div className="text-right">
                    <div className="font-display text-xs leading-none group-hover:text-nexus-accent transition-colors">{user.displayName?.toUpperCase()}</div>
                    <div className="font-mono text-[8px] opacity-50">OPERATOR</div>
                  </div>
                  <img 
                    src={user.photoURL || ''} 
                    alt="Account" 
                    className="w-8 h-8 border border-white/20 group-hover:border-nexus-accent transition-colors"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <button 
                  onClick={logout}
                  className="brutalist-button bg-red-500 text-white border-white/20 hover:bg-red-600 p-2 h-12 w-12 flex items-center justify-center group"
                  title="TERMINATE_SESSION"
                >
                  <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
                </button>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1">
            {renderContent()}
          </div>

          {/* Footer to fix blank space */}
          <footer className="mt-12 pt-6 border-t-[3px] border-white/5 flex justify-between items-center font-mono text-[9px] opacity-30 uppercase tracking-[0.2em]">
            <div>Nexus Vault Financial Core // All Rights Reserved</div>
            <div>System Integrity: 100% // Connection: Encrypted</div>
          </footer>
        </div>
      </main>

      <ConfirmationModal 
        isOpen={showBalanceConfirm}
        onConfirm={handleUpdateBalance}
        onCancel={() => setShowBalanceConfirm(false)}
        message={`Are you sure you want to override the core balance to ${profile?.currency || '$'}${parseFloat(tempBalance || '0').toLocaleString()}? This action will be logged in the registry.`}
      />
    </div>
  );
}
