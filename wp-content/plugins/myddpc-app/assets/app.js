const { useState, useEffect, createContext, useContext, useCallback, useMemo } = React;

//================================================================================
// 1. CONTEXTS & PROVIDERS (Auth & Vehicles)
//================================================================================

//--- Auth Context ---
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
    const { current_user, rest_url, nonce, logout_url } = window.myddpcAppData || {};
    const [user, setUser] = useState(current_user || null);

    const login = async (username, password) => {
        const response = await fetch(`${rest_url}myddpc/v2/user/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
            body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Login failed.');
        }
        window.location.reload();
        return data;
    };

    const register = async (username, email, password) => {
        const response = await fetch(`${rest_url}myddpc/v2/user/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
            body: JSON.stringify({ username, email, password }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Registration failed.');
        }
        window.location.reload();
        return data;
    };

    const logout = () => {
        if (logout_url) {
            window.location.href = logout_url;
        } else {
            console.error('Logout URL not found.');
        }
    };

    const value = { isAuthenticated: !!user, user, login, register, logout };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const useAuth = () => useContext(AuthContext);

//--- Compare Context ---
const CompareContext = createContext();

const CompareProvider = ({ children }) => {
    // Always initialize as 3 slots
    const [compareVehicles, setCompareVehicles] = useState([null, null, null]);
    const { rest_url, nonce } = window.myddpcAppData || {};

    // Add vehicle to compare (fetch full details)
    const addVehicleToCompare = useCallback(async (vehicleId, slotIndex) => {
        if (!rest_url || !vehicleId) return;
        try {
            const response = await fetch(`${rest_url}myddpc/v2/discover/vehicle/${vehicleId}`, {
                headers: { 'X-WP-Nonce': nonce }
            });
            if (!response.ok) throw new Error('Failed to fetch vehicle details');
            const vehicleData = await response.json();
            // Map hero image for compare card compatibility
            let heroImage = '';
            if (vehicleData['Image URL']) {
                heroImage = vehicleData['Image URL'].split(';')[0];
            }
            vehicleData.at_a_glance = vehicleData.at_a_glance || {};
            vehicleData.at_a_glance.hero_image = heroImage;
            const newCompareVehicles = [...compareVehicles];
            while (newCompareVehicles.length <= slotIndex) {
                newCompareVehicles.push(null);
            }
            newCompareVehicles[slotIndex] = vehicleData;
            setCompareVehicles(newCompareVehicles);
        } catch (error) {
            console.error('Error adding vehicle to compare:', error);
        }
    }, [rest_url, nonce, compareVehicles]);

    // Add to first available slot
    const addToCompare = async (vehicle) => {
        if (!vehicle || !vehicle.ID) return;
        // Prevent duplicates
        if (compareVehicles.some(v => v && v.ID === vehicle.ID)) return;
        // Find first empty slot
        const slotIndex = compareVehicles.findIndex(v => !v);
        if (slotIndex === -1) return; // All slots full
        await addVehicleToCompare(vehicle.ID, slotIndex);
    };
    const removeFromCompare = (slotIndex) => {
        const newCompareVehicles = [...compareVehicles];
        newCompareVehicles[slotIndex] = null;
        setCompareVehicles(newCompareVehicles);
    };
    const clearCompare = () => {
        setCompareVehicles([null, null, null]);
    };

    const value = { compareVehicles, addVehicleToCompare, addToCompare, removeFromCompare, clearCompare };
    return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
};

const useCompare = () => useContext(CompareContext);

//--- Vehicle Context ---
const VehicleContext = createContext();

const VehicleProvider = ({ children }) => {
  const [vehicles, setVehicles] = useState([]);
  const [discoveryResults, setDiscoveryResults] = useState({ results: [], total: 0 });
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSwapModalOpen, setSwapModalOpen] = useState(false);
  const [candidateVehicle, setCandidateVehicle] = useState(null);
  
  const { rest_url, nonce } = window.myddpcAppData || {};

  const fetchGarageVehicles = useCallback(async () => {
      if (!rest_url || !window.myddpcAppData.is_logged_in) {
          setVehicles([]);
          return;
      };
      try {
          const response = await fetch(`${rest_url}myddpc/v2/garage/vehicles`, { method: 'GET', headers: { 'X-WP-Nonce': nonce } });
          if (!response.ok) throw new Error('Failed to fetch garage vehicles.');
          const data = await response.json();
          // Add mock data for UI development until backend is ready
          const processedData = data.map(v => ({
              ...v,
              status: v.status || 'operational',
              buildProgress: v.buildProgress || Math.floor(Math.random() * 50) + 25,
              nextService: v.nextService || '2024-09-15',
              totalInvested: v.totalInvested || 0,
              modifications: v.modifications || 0,
          }));
          setVehicles(processedData);
      } catch (err) {
          console.error(err);
          setVehicles([]);
      }
  }, [rest_url, nonce]);

  const fetchDiscoveryResults = useCallback((params = {}) => {
      if (!rest_url) return;
      setLoading(true);
      const apiParams = { filters: params.filters || {}, sort_by: params.sort_by || 'Year', sort_dir: params.sort_dir || 'desc', limit: params.limit || 10, offset: params.offset || 0 };
      fetch(`${rest_url}myddpc/v2/discover/results`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce }, body: JSON.stringify(apiParams) })
          .then(res => res.ok ? res.json() : Promise.reject(`Error: ${res.statusText}`))
          .then(data => setDiscoveryResults(data && Array.isArray(data.results) ? data : { results: [], total: 0 }))
          .catch(err => console.error("Failed to fetch discovery results:", err))
          .finally(() => setLoading(false));
  }, [rest_url, nonce]);

  const value = {
      vehicles, fetchGarageVehicles,
      discoveryResults, selectedVehicle, setSelectedVehicle,
      loading,
      fetchDiscoveryResults, isSwapModalOpen, candidateVehicle
  };

  return <VehicleContext.Provider value={value}>{children}</VehicleContext.Provider>;
};

// --- NEW: User Lists Context for Garage & Saved Vehicles ---

const UserListsContext = React.createContext();

const UserListsProvider = ({ children, isAuthenticated }) => {
    const { rest_url, nonce } = window.myddpcAppData || {};
    const [garageVehicles, setGarageVehicles] = useState([]);
    const [savedVehicles, setSavedVehicles] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAllLists = useCallback(async () => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // Fetch both lists in parallel
            const [garageRes, savedRes] = await Promise.all([
                fetch(`${rest_url}myddpc/v2/garage/vehicles`, { headers: { 'X-WP-Nonce': nonce } }),
                fetch(`${rest_url}myddpc/v2/saved`, { headers: { 'X-WP-Nonce': nonce } })
            ]);
            const garageData = await garageRes.json();
            const savedData = await savedRes.json();

            if (garageRes.ok) setGarageVehicles(garageData);
            if (savedRes.ok) setSavedVehicles(savedData);

        } catch (error) {
            console.error("Failed to fetch user lists:", error);
        } finally {
            setLoading(false);
        }
    }, [rest_url, nonce, isAuthenticated]);

    useEffect(() => {
        fetchAllLists();
    }, [fetchAllLists]);

    const value = { garageVehicles, savedVehicles, loading, refreshLists: fetchAllLists };

    return (
        <UserListsContext.Provider value={value}>
            {children}
        </UserListsContext.Provider>
    );
};

const useUserLists = () => useContext(UserListsContext);

const useVehicles = () => useContext(VehicleContext);


//================================================================================
// 2. SVG ICONS & REUSABLE UI COMPONENTS
//================================================================================

const Icon = ({ name, className }) => {
  switch(name) {
    case 'Menu':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>;
    case 'X':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>;
    case 'Search':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>;
    case 'Car':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18.4 10c-.4-.8-1.2-1.3-2.1-1.3H7.7c-.9 0-1.7.5-2.1 1.3L3.5 11.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2m14 0a2 2 0 1 1-4 0m4 0a2 2 0 1 0-4 0M9 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"></path></svg>;
    case 'Settings':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>;
    case 'Fuel':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 19V7a4 4 0 014-4h7a4 4 0 014 4v6c0 1.105.895 2 2 2s2-.895 2-2V9a2 2 0 00-2-2m-2 0V5a2 2 0 00-2-2m-8 14V7"></path></svg>;
    case 'Clipboard':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>;
    case 'Wrench':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>;
    case 'FileText':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path><polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" points="14,2 14,8 20,8"></polyline><line strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="16" y1="13" x2="8" y2="13"></line><line strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="16" y1="17" x2="8" y2="17"></line><polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" points="10,9 9,9 8,9"></polyline></svg>;
    case 'Bookmark':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"></path></svg>;
    case 'Columns':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h4M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M9 3v18M15 3v18"></path></svg>;
    case 'Garage':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21V7l9-4 9 4v14H3z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 21v-6a1 1 0 011-1h10a1 1 0 011 1v6"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 9h6"></path></svg>;
    case 'LayoutGrid':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x="3" y="3" width="7" height="7"></rect><rect strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x="14" y="3" width="7" height="7"></rect><rect strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x="14" y="14" width="7" height="7"></rect><rect strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x="3" y="14" width="7" height="7"></rect></svg>;
    case 'Trash2':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
    default:
      return <div className={`icon-placeholder ${className}`}>{name.charAt(0)}</div>;
  }
};
const PlusIcon = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const WrenchIcon = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>;
const DollarSignIcon = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const BarChartIcon = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>;
const SmartphoneIcon = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>;
const CheckCircleIcon = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const CameraIcon = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>;
const Edit3Icon = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>;
const Trash2Icon = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;

const PageHeader = ({ title, subtitle, children }) => ( <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4"> <div> <h1 className="text-3xl font-light text-gray-900 mb-2">{title}</h1> <p className="text-gray-600">{subtitle}</p> </div> <div>{children}</div> </div> );

const CompareTray = () => {
    const { compareVehicles, removeFromCompare, clearCompare } = useCompare();
    if (!compareVehicles || !Array.isArray(compareVehicles) || compareVehicles.length === 0 || compareVehicles.every(v => !v)) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1 flex items-center gap-4">
                    <h4 className="font-medium text-gray-800">Compare List:</h4>
                    <div className="flex items-center gap-3">
                        {compareVehicles.map((v, i) => v && (
                            <div key={v.ID || i} className="bg-gray-100 px-3 py-1 rounded-full flex items-center text-sm">
                                <span className="text-gray-700">{`${v.Year} ${v.Make} ${v.Model}`}</span>
                                <button onClick={() => removeFromCompare(i)} className="ml-2 text-gray-500 hover:text-red-600"><Icon name="X" className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                </div>
                <button onClick={clearCompare} className="text-sm font-medium text-red-600 hover:underline">Clear All</button>
            </div>
        </div>
    );
};

const AuthModal = ({ isOpen, onClose }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    if (!isOpen) return null;
    return ReactDOM.createPortal(
        <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1100 }} onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl p-8 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
                {isLoginView ? <LoginView switchToRegister={() => setIsLoginView(false)} /> : <RegisterView switchToLogin={() => setIsLoginView(true)} />}
            </div>
        </div>, document.body);
};

const LoginView = ({ switchToRegister }) => {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(username, password);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-light text-center text-gray-900">Member Login</h2>
            {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">{error}</p>}
            <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-red-400">{loading ? 'Logging in...' : 'Login'}</button>
            <p className="text-sm text-center text-gray-600">Not a member? <button type="button" onClick={switchToRegister} className="font-medium text-red-600 hover:underline">Register here</button></p>
        </form>
    );
};

const RegisterView = ({ switchToLogin }) => {
    const { register } = useAuth();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register(username, email, password);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-light text-center text-gray-900">Create Account</h2>
            {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">{error}</p>}
            <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-red-400">{loading ? 'Creating Account...' : 'Register'}</button>
            <p className="text-sm text-center text-gray-600">Already a member? <button type="button" onClick={switchToLogin} className="font-medium text-red-600 hover:underline">Login here</button></p>
        </form>
    );
};

const CompareSwapModal = () => {
    const { isSwapModalOpen, compareVehicles, candidateVehicle, swapVehicleInCompare, cancelSwap } = useVehicles();
    if (!isSwapModalOpen) return null;
    return ReactDOM.createPortal(
        <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1100 }} onClick={cancelSwap}>
            <div className="bg-white rounded-lg shadow-2xl p-8 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-light text-gray-900 mb-2">Comparison List Full</h2>
                <p className="text-gray-600 mb-6">Select a vehicle to replace with the <span className="font-semibold">{`${candidateVehicle.Year} ${candidateVehicle.Make} ${candidateVehicle.Model}`}</span>.</p>
                <div className="space-y-3 mb-8">{compareVehicles.map(vehicle => (<button key={vehicle.ID} onClick={() => swapVehicleInCompare(vehicle.ID)} className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-300 transition-all"><p className="font-medium text-gray-800">{`${vehicle.Year} ${vehicle.Make} ${vehicle.Model}`}</p><p className="text-sm text-gray-500">{`${vehicle['Horsepower (HP)']} HP • ${vehicle['Drive type']}`}</p></button>))}</div>
                <div className="text-right"> <button onClick={cancelSwap} className="text-gray-600 font-medium hover:text-gray-900 px-4 py-2 rounded-lg">Cancel</button> </div>
            </div>
        </div>, document.body);
};

// **NEW**: Modal for setting a vehicle nickname
const AddToGarageModal = ({ vehicle, isOpen, onClose, onSave, loading }) => {
    const [nickname, setNickname] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (vehicle) {
            setNickname(`${vehicle.Year} ${vehicle.Make} ${vehicle.Model}`);
        }
    }, [vehicle]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!nickname.trim()) {
            setError('Nickname cannot be empty.');
            return;
        }
        setError('');
        try {
            await onSave(vehicle.ID, nickname);
            onClose();
        } catch (err) {
            setError(err.message);
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1200 }} onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl p-8 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-light text-gray-900 mb-2">Add to Garage</h2>
                <p className="text-gray-600 mb-6">Give your new vehicle a nickname.</p>
                {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg mb-4">{error}</p>}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Nickname</label>
                    <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                    <button onClick={handleSave} disabled={loading} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400">{loading ? 'Saving...' : 'Save to Garage'}</button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const VehicleSelectModal = ({ isOpen, onClose, title, vehicles, onSelect }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[101] flex justify-center items-center">
            <div className="bg-white rounded-lg shadow-xl m-4 w-full max-w-lg">
                <div className="p-4 border-b">
                    <h3 className="text-lg font-medium">{title}</h3>
                </div>
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {vehicles.length > 0 ? (
                        <ul className="space-y-2">
                            {vehicles.map(v => (
                                <li key={v.garage_id || v.saved_id} onClick={() => onSelect(v)} className="p-3 rounded-lg hover:bg-gray-100 cursor-pointer">
                                    <p className="font-medium">{v.name || `${v.Year} ${v.Make} ${v.Model}`}</p>
                                    <p className="text-sm text-gray-500">{v.Trim || ''}</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 text-center py-4">No vehicles found in this list.</p>
                    )}
                </div>
                <div className="p-4 border-t text-right">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Cancel</button>
                </div>
            </div>
        </div>
    );
};

//================================================================================
// 3. CORE VIEW COMPONENTS
//================================================================================

const DiscoverView = ({ setActiveView, requireAuth, setVehicleProfileId, setFromView }) => {
    const { discoveryResults, loading, fetchDiscoveryResults } = useVehicles();
    const { savedVehicles, refreshLists } = useUserLists();
    const { compareVehicles, addToCompare, removeFromCompare } = useCompare();
    const [filters, setFilters] = useState({});
    const [filterOptions, setFilterOptions] = useState({});
    const [sort, setSort] = useState({ by: 'Year', dir: 'desc' });
    const [pagination, setPagination] = useState({ page: 1, limit: 10 });
    const [vehicleToAddToGarage, setVehicleToAddToGarage] = useState(null);
    const { rest_url, nonce } = window.myddpcAppData || {};

    useEffect(() => { if (!rest_url) return; fetch(`${rest_url}myddpc/v2/discover/filters`, { headers: { 'X-WP-Nonce': nonce } }).then(res => res.json()).then(data => { if (typeof data === 'object' && data !== null) setFilterOptions(data); }).catch(err => console.error("Failed to fetch filter options:", err)); }, [rest_url, nonce]);
    useEffect(() => { const params = { filters, sort_by: sort.by, sort_dir: sort.dir, limit: pagination.limit, offset: (pagination.page - 1) * pagination.limit }; fetchDiscoveryResults(params); }, [filters, sort.by, sort.dir, pagination.page, pagination.limit, fetchDiscoveryResults]);
    
    const handleFilterChange = (filterName, value) => { setPagination(p => ({ ...p, page: 1 })); setFilters(p => ({ ...p, [filterName]: value })); };
    const handleSortChange = (field, value) => setSort(p => ({ ...p, [field]: value }));
    const handlePageChange = (direction) => setPagination(p => ({ ...p, page: Math.max(1, p.page + direction) }));
    const handleReset = () => { setFilters({}); setSort({ by: 'Year', dir: 'desc' }); setPagination({ page: 1, limit: 10 }); };

    const isVehicleSaved = (vehicleId) => {
        return savedVehicles.some(v => v.vehicle_id === vehicleId);
    };
    const isVehicleCompared = (vehicleId) => {
        return compareVehicles.some(v => v && v.ID === vehicleId);
    };

    // NEW: Logic to save a vehicle
    const handleSaveVehicle = async (vehicle) => {
        requireAuth(async () => {
            try {
                const response = await fetch(`${rest_url}myddpc/v2/saved`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
                    body: JSON.stringify({ vehicle_id: vehicle.ID }),
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || 'Could not save vehicle.');
                }
                
                await refreshLists(); // Refresh the saved vehicles list
                
                // Show success feedback - this will be automatically handled by the button state change
            } catch (error) {
                console.error('Error saving vehicle:', error);
                alert(error.message);
            }
        });
    };
    
    // UPDATED: Button state logic now checks saved list
    const getButtonState = (vehicle) => {
        if (isVehicleSaved(vehicle.ID)) {
            return { text: 'Saved', disabled: true, className: 'bg-green-600' };
        }
        return { text: 'Save', disabled: false, className: 'bg-red-600 hover:bg-red-700', action: () => handleSaveVehicle(vehicle) };
    };

    return (
        <>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <PageHeader title="Vehicle Discovery" subtitle="Find and compare vehicles by specifications and features" />
                <div className="mb-8"> <CompareTray /> </div>
                <div className="discover-view-grid grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="discover-filters-column lg:col-span-1">
                        <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-medium text-gray-900">Filters</h3>
                                <button onClick={handleReset} className="text-xs font-semibold text-red-600 hover:underline">Reset</button>
                            </div>
                            <div className="space-y-6">
                                {Object.keys(filterOptions).map(key => (
                                    <div key={key}>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">{key.replace(/_/g, ' ')}</label>
                                        <select 
                                            value={filters[key] || ''} 
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" 
                                            onChange={(e) => handleFilterChange(key, e.target.value)}
                                        >
                                            <option value="">All</option>
                                            {Array.isArray(filterOptions[key]) && filterOptions[key].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                                <p className="text-gray-600">{`${discoveryResults.total || 0} vehicles found`}</p>
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium">Sort by:</label>
                                    <select value={sort.by} onChange={(e) => handleSortChange('by', e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1 text-sm">
                                        <option value="Year">Year</option>
                                        <option value="Horsepower (HP)">Horsepower</option>
                                    </select>
                                    <select value={sort.dir} onChange={(e) => handleSortChange('dir', e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1 text-sm">
                                        <option value="desc">Descending</option>
                                        <option value="asc">Ascending</option>
                                    </select>
                                </div>
                            </div>
                            {loading ? <div className="text-center p-12">Loading results...</div> : (
                                <div className="space-y-4">
                                    {Array.isArray(discoveryResults.results) && discoveryResults.results.map((vehicle) => {
                                        const buttonState = getButtonState(vehicle);
                                        return (
                                            <div key={vehicle.ID} className="discover-result-item border border-gray-200 rounded-lg p-4 hover:shadow-sm">
                                                <div className="discover-result-item-content flex items-start justify-between">
                                                    <div className="discover-result-item-info flex-1">
                                                        <h4 className="text-lg font-medium text-gray-900 mb-2">{`${vehicle.Year} ${vehicle.Make} ${vehicle.Model} ${vehicle.Trim}`}</h4>
                                                         <div className="details-grid grid gap-x-4 gap-y-2 text-sm text-gray-600">
                                                            <div><span className="font-medium">Engine:</span> {vehicle['Engine size (l)']}L {vehicle.Cylinders}-cyl</div>
                                                            <div><span className="font-medium">Power:</span> {vehicle['Horsepower (HP)']} HP</div>
                                                            <div><span className="font-medium">Drive:</span> {vehicle['Drive type']}</div>
                                                            <div><span className="font-medium">Weight:</span> {vehicle['Curb weight (lbs)']} lbs</div>
                                                        </div>
                                                    </div>
                                                    <div className="discover-result-item-buttons flex items-center space-x-3 ml-4">
                                                        {/* Details icon button */}
                                                        <button onClick={() => { setVehicleProfileId(vehicle.ID); setActiveView('vehicle-profile'); setFromView('discover'); }} className="p-2 rounded-full text-gray-400 hover:text-blue-600 bg-white bg-opacity-80 shadow" title="View Details">
                                                            <Icon name="FileText" className="w-5 h-5" />
                                                        </button>
                                                        {isVehicleCompared(vehicle.ID) ? (
                                                            <span className="p-2 rounded-full bg-green-100 text-green-700 border border-green-300" title="In Compare">
                                                                <Icon name="Columns" className="w-5 h-5" />
                                                            </span>
                                                        ) : (
                                                            <button onClick={() => addToCompare(vehicle)} className="p-2 rounded-full text-gray-400 hover:text-red-600 bg-white bg-opacity-80 shadow" title="Compare">
                                                                <Icon name="Columns" className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                        <button onClick={buttonState.action} disabled={buttonState.disabled} className={`p-2 rounded-full text-gray-400 hover:text-green-600 bg-white bg-opacity-80 shadow ${buttonState.disabled ? 'opacity-50 cursor-not-allowed' : ''}`} title={buttonState.disabled ? 'Saved' : 'Save'}>
                                                            <Icon name="Bookmark" className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
                                <button onClick={() => handlePageChange(-1)} disabled={loading || pagination.page <= 1} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Previous</button>
                                <span className="text-sm text-gray-600">Page {pagination.page} of {Math.ceil((discoveryResults.total || 0) / pagination.limit)}</span>
                                <button onClick={() => handlePageChange(1)} disabled={loading || pagination.page * pagination.limit >= (discoveryResults.total || 0)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Next</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
   );
};

// --- SAVED VEHICLES COMPONENT ---

const SavedVehiclesView = ({ requireAuth, setActiveView, setVehicleProfileId, setFromView, setSelectedVehicle, setGarageView }) => {
    const { rest_url, nonce } = window.myddpcAppData || {};
    const [savedVehicles, setSavedVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { refreshLists } = useUserLists();
    const { fetchGarageVehicles, vehicles: garageVehicles } = useVehicles();

    const fetchSavedVehicles = useCallback(async () => {
        try {
            const response = await fetch(`${rest_url}myddpc/v2/saved`, {
                headers: { 'X-WP-Nonce': nonce }
            });
            if (!response.ok) throw new Error('Failed to fetch saved vehicles.');
            const data = await response.json();
            setSavedVehicles(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [rest_url, nonce]);

    useEffect(() => {
        requireAuth(() => {
            fetchSavedVehicles();
        });
    }, [requireAuth, fetchSavedVehicles]);

    const handleRemove = async (e, savedId) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to remove this vehicle from your saved list?')) {
            return;
        }
        try {
            const response = await fetch(`${rest_url}myddpc/v2/saved/${savedId}`, {
                method: 'DELETE',
                headers: { 'X-WP-Nonce': nonce }
            });
            if (!response.ok) throw new Error('Failed to remove vehicle.');
            await refreshLists();
        } catch (err) {
            alert(err.message);
        }
    };

    // Helper: find garage vehicle by vehicle_id
    const findGarageVehicle = (vehicleId) => {
        if (!Array.isArray(garageVehicles)) return null;
        return garageVehicles.find(gv => gv.vehicle_id === vehicleId);
    };

    // Handler: go to vehicle in garage
    const handleGoToGarageVehicle = (garageVehicle) => {
        if (!garageVehicle) return;
        setSelectedVehicle(garageVehicle);
        setActiveView('garage');
        setGarageView('vehicle-detail');
    };

    if (loading) return <div className="text-center p-12">Loading your saved vehicles...</div>;
    if (error) return <div className="text-center p-12 text-red-600">Error: {error}</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <PageHeader title="My Saved Vehicles" subtitle="A list of vehicles you're keeping an eye on. Add them to your Garage to start tracking mods." />
            <div className="space-y-4">
                {savedVehicles.length > 0 ? (
                    savedVehicles.map((vehicle) => {
                        const garageVehicle = findGarageVehicle(vehicle.vehicle_id);
                        return (
                            <div 
                                key={vehicle.saved_id} 
                                className="discover-result-item border border-gray-200 rounded-lg p-4 hover:shadow-sm hover:border-red-300 transition-all cursor-pointer"
                                onClick={() => {
                                    setVehicleProfileId(vehicle.vehicle_id);
                                    setActiveView('vehicle-profile');
                                    setFromView('saved');
                                    if (setSelectedVehicle) setSelectedVehicle(vehicle);
                                }}
                            >
                                <div className="discover-result-item-content flex items-start justify-between">
                                    <div className="discover-result-item-info flex-1">
                                        <h4 className="text-lg font-medium text-gray-900 mb-2">{`${vehicle.Year} ${vehicle.Make} ${vehicle.Model} ${vehicle.Trim}`}</h4>
                                        <div className="details-grid grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm text-gray-600">
                                            <div><span className="font-medium">Engine:</span> {vehicle.engine_size}L</div>
                                            <div><span className="font-medium">Power:</span> {vehicle.horsepower} HP</div>
                                            <div><span className="font-medium">Weight:</span> {vehicle.weight} lbs</div>
                                        </div>
                                    </div>
                                    <div className="discover-result-item-buttons flex items-center space-x-2 ml-4">
                                        {/* Only show Garage button if vehicle is in garage */}
                                        {garageVehicle && (
                                            <button onClick={e => { e.stopPropagation(); handleGoToGarageVehicle(garageVehicle); }} className="p-2 rounded-full text-gray-400 hover:text-red-600 bg-white bg-opacity-80 shadow" title="Go to Garage Vehicle">
                                                <Icon name="Garage" className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button onClick={(e) => handleRemove(e, vehicle.saved_id)} className="p-2 rounded-full text-gray-400 hover:text-red-600 bg-white bg-opacity-80 shadow" title="Remove Vehicle">
                                            <Icon name="Trash2" className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center p-12 text-gray-500 bg-white border border-gray-200 rounded-lg">
                        <p>You haven't saved any vehicles yet.</p>
                        <p className="mt-2 text-sm">Use the Discover tool to find and save vehicles to your list.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper function to determine if a stat is the winner
const isWinningStat = (statWinners, key, value) => {
    if (!statWinners || !statWinners[key]) return false;
    return parseFloat(value) === statWinners[key];
};

const CompareGeneral = ({ vehicle, statWinners }) => (
    <div className="p-6 flex-grow">
        <div className="space-y-3">
            <div className="flex justify-between">
                <span className="text-gray-600">Engine:</span>
                <span className="font-medium text-right">{vehicle['Engine size (l)']}L {vehicle.Cylinders}-cyl</span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-600">Power:</span>
                <span className={`font-medium ${isWinningStat(statWinners, 'Horsepower (HP)', vehicle['Horsepower (HP)']) ? 'text-green-600 font-bold' : ''}`}>
                    {`${vehicle['Horsepower (HP)']} HP`}
                </span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-600">Torque:</span>
                <span className={`font-medium ${isWinningStat(statWinners, 'Torque (ft-lbs)', vehicle['Torque (ft-lbs)']) ? 'text-green-600 font-bold' : ''}`}>
                    {`${vehicle['Torque (ft-lbs)']} ft-lbs`}
                </span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-600">Drive:</span>
                <span className="font-medium">{vehicle['Drive type']}</span>
            </div>
        </div>
    </div>
);

const ComparePerformance = ({ vehicle, statWinners }) => {
    const powerToWeight = parseFloat(vehicle['Horsepower (HP)']) / parseFloat(vehicle['Curb weight (lbs)']);
    
    return (
        <div className="p-6 flex-grow">
            <div className="space-y-3">
                <div className="flex justify-between">
                    <span className="text-gray-600">Horsepower:</span>
                    <span className={`font-medium ${isWinningStat(statWinners, 'Horsepower (HP)', vehicle['Horsepower (HP)']) ? 'text-green-600 font-bold' : ''}`}>
                        {`${vehicle['Horsepower (HP)']} HP`}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Torque:</span>
                    <span className={`font-medium ${isWinningStat(statWinners, 'Torque (ft-lbs)', vehicle['Torque (ft-lbs)']) ? 'text-green-600 font-bold' : ''}`}>
                        {`${vehicle['Torque (ft-lbs)']} ft-lbs`}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Weight:</span>
                    <span className={`font-medium ${isWinningStat(statWinners, 'Curb weight (lbs)', vehicle['Curb weight (lbs)']) ? 'text-green-600 font-bold' : ''}`}>
                        {`${vehicle['Curb weight (lbs)']} lbs`}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Power-to-Weight:</span>
                    <span className={`font-medium ${statWinners && statWinners['Power-to-Weight'] === powerToWeight ? 'text-green-600 font-bold' : ''}`}>
                        {powerToWeight.toFixed(3)}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">MPG (Combined):</span>
                    <span className="font-medium">{vehicle['EPA combined MPG']}</span>
                </div>
            </div>
        </div>
    );
};

const CompareDimensions = ({ vehicle, statWinners }) => (
    <div className="p-6 flex-grow">
        <div className="space-y-3">
            <div className="flex justify-between">
                <span className="text-gray-600">Length:</span>
                <span className="font-medium">{`${vehicle['Length (in)']} in`}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-600">Width:</span>
                <span className="font-medium">{`${vehicle['Width (in)']} in`}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-600">Height:</span>
                <span className="font-medium">{`${vehicle['Height (in)']} in`}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-600">Wheelbase:</span>
                <span className="font-medium">{`${vehicle['Wheelbase (in)']} in`}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-600">Ground Clearance:</span>
                <span className="font-medium">{`${vehicle['Ground clearance (in)']} in`}</span>
            </div>
        </div>
    </div>
);

const AddVehicleSlot = ({ onSelect, onBrowse }) => {
    const { garageVehicles, savedVehicles } = useUserLists();
    const { addVehicleToCompare, compareVehicles } = useCompare();
    const [modalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState({ title: '', vehicles: [] });

    const openModal = (type) => {
        if (type === 'saved') {
            setModalContent({ title: 'Select from Saved Vehicles', vehicles: savedVehicles });
        } else if (type === 'garage') {
            const formattedGarageVehicles = garageVehicles.map(v => ({...v, vehicle_id: v.vehicle_id_from_main_table}));
            setModalContent({ title: 'Select from Your Garage', vehicles: formattedGarageVehicles });
        }
        setModalOpen(true);
    };

    // Pass the handler as a prop to the modal
    const handleSelect = (vehicle) => {
        // Debug: log the vehicle object and ID used
        console.log('Garage/Saved vehicle selected for compare:', vehicle);
        let id = vehicle && (vehicle.ID || vehicle.vehicle_id || vehicle.vehicle_id_from_main_table);
        if (id) {
            const slotIndex = compareVehicles.findIndex(v => !v);
            console.log('Adding to compare slot', slotIndex, 'with ID', id);
            addVehicleToCompare(id, slotIndex);
        } else {
            console.warn('No valid ID found for selected vehicle:', vehicle);
        }
        setModalOpen(false);
    };

    return (
        <>
            <VehicleSelectModal 
                isOpen={modalOpen} 
                onClose={() => setModalOpen(false)}
                title={modalContent.title}
                vehicles={modalContent.vehicles}
                onSelect={handleSelect}
            />
            <div className="h-full border-2 border-dashed border-gray-300 rounded-lg flex flex-col justify-center items-center p-6 space-y-3">
                <p className="font-medium text-gray-700">Add a Vehicle</p>
                <button onClick={onBrowse} className="w-full text-center py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Browse New</button>
                <button onClick={() => openModal('saved')} className="w-full text-center py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">From Saved</button>
                <button onClick={() => openModal('garage')} className="w-full text-center py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">From Garage</button>
            </div>
        </>
    );
};

// A new helper component for rendering each stat row
const StatRow = ({ label, value, unit, isBest, barPercent }) => {
    // Always render the row, even if value is missing
    const displayValue = (value === null || value === undefined || value === '') ? 'N/A' : value;
    // Clamp barPercent between 0 and 100
    const percent = Math.max(0, Math.min(barPercent || 0, 100));
    return (
        <div className={`py-2 stat-row${isBest ? ' is-best' : ''}`}>
            <div className="flex justify-between items-baseline text-sm mb-1">
                <span className="text-gray-600">{label}</span>
                <span className={`font-medium transition-colors stat-value ${isBest ? 'text-green-600 font-bold' : 'text-gray-800'}`}>{displayValue} {unit}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 relative overflow-hidden" style={{ minHeight: '6px' }}>
                <div
                    className="bg-red-500 h-1.5 rounded-full transition-all duration-300"
                    style={{
                        width: `${percent}%`,
                        minWidth: percent > 0 ? 2 : 0,
                        maxWidth: '100%',
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                    }}
                ></div>
            </div>
        </div>
    );
};

// Helper to get the first image URL from various fields (shared)
const getFirstImageUrl = (vehicle) => {
    if (vehicle?.at_a_glance?.hero_image && vehicle.at_a_glance.hero_image !== 'N/A') return vehicle.at_a_glance.hero_image;
    if (vehicle.custom_image_url) return vehicle.custom_image_url;
    if (vehicle.db_image_url) return vehicle.db_image_url;
    // fallback: use title for placeholder text
    const title = vehicle?.at_a_glance?.title || `${vehicle.Year || ''} ${vehicle.Make || ''}` || 'Vehicle';
    return `https://via.placeholder.com/400x250?text=${encodeURIComponent(title)}`;
};

const CompareSlot = ({ vehicle, slotIndex, statWinners, analysisType, setActiveView, setVehicleProfileId, setFromView }) => {
    const { removeFromCompare } = useCompare();
    
    const pwr = useMemo(() => {
        if (!vehicle || !vehicle['Horsepower (HP)'] || !vehicle['Curb weight (lbs)']) return null;
        const hp = parseFloat(vehicle['Horsepower (HP)']);
        const weight = parseFloat(vehicle['Curb weight (lbs)']);
        if (isNaN(hp) || isNaN(weight) || weight === 0) return null;
        const ratio = hp / weight;
        return ratio.toFixed(3); // HP per lb
    }, [vehicle]);

    const getStatProps = (key, preference = 'max') => {
        const value = vehicle[key];
        const winner = statWinners ? statWinners[key] : null;
        if (value === null || value === undefined || value === '' || winner === null || winner === undefined) return { value, isBest: false, barPercent: 0 };
        
        const numericValue = parseFloat(value);
        const numericWinner = parseFloat(winner);
        if (isNaN(numericValue) || isNaN(numericWinner)) return { value, isBest: false, barPercent: 0 };
        const isBest = numericValue === numericWinner;
        let barPercent = (numericValue / numericWinner) * 100;
        
        // For stats where lower is better, invert the bar logic
        if (preference === 'min' && numericValue !== 0) {
            barPercent = (numericWinner / numericValue) * 100;
        }
        // Clamp barPercent between 0 and 100
        barPercent = Math.max(0, Math.min(barPercent, 100));
        return { value, isBest, barPercent };
    };

    const renderStats = () => {
        switch (analysisType) {
            case 'Performance': {
                const pwrValue = pwr !== null ? parseFloat(pwr) : null;
                const pwrWinner = statWinners ? statWinners['Power-to-Weight'] : null;
                return (
                    <>
                        <StatRow label="Horsepower" unit="HP" {...getStatProps('Horsepower (HP)')} />
                        <StatRow label="Torque" unit="ft-lbs" {...getStatProps('Torque (ft-lbs)')} />
                        <StatRow label="0-60 mph" unit="sec" {...getStatProps('0-60 mph', 'min')} />
                        <StatRow label="Curb Weight" unit="lbs" {...getStatProps('Curb weight (lbs)', 'min')} />
                        <StatRow label="Power-to-Weight" unit="hp/lb" 
                            value={pwr}
                            isBest={pwrValue !== null && pwrWinner !== null && pwrValue === pwrWinner}
                            barPercent={pwrValue !== null && pwrWinner !== null && pwrWinner !== 0 ? (pwrValue / pwrWinner) * 100 : 0}
                        />
                    </>
                );
            }
            case 'Dimensions':
                 return (
                    <>
                        <StatRow label="Length" unit="in" value={vehicle['Length (in)']} barPercent={0}/>
                        <StatRow label="Width" unit="in" value={vehicle['Width (in)']} barPercent={0}/>
                        <StatRow label="Height" unit="in" value={vehicle['Height (in)']} barPercent={0}/>
                        <StatRow label="Wheelbase" unit="in" value={vehicle['Wheelbase (in)']} barPercent={0}/>
                        <StatRow label="Ground Clearance" unit="in" value={vehicle['Ground clearance (in)']} barPercent={0}/>
                    </>
                );
            default: // General
                return (
                    <>
                        <StatRow label="Engine" value={vehicle['Engine size (l)'] ? `${vehicle['Engine size (l)']}L ${vehicle.Cylinders || ''}-cyl` : null} barPercent={0} />
                        <StatRow label="Drive Type" value={vehicle['Drive type']} barPercent={0} />
                        <StatRow label="MPG (Combined)" value={vehicle['EPA combined MPG']} unit="mpg" barPercent={0} />
                        <StatRow label="Doors" value={vehicle['Doors']} barPercent={0} />
                        <StatRow label="Body Style" value={vehicle['Body type']} barPercent={0} />
                    </>
                );
        }
    };

    // --- VehicleCard visual shell ---
    const imageUrl = getFirstImageUrl(vehicle);
    const statusConfig = {
        operational: { label: 'Operational', classes: 'bg-green-100 text-green-800' },
        maintenance: { label: 'In Service', classes: 'bg-yellow-100 text-yellow-800' },
        stored: { label: 'Stored', classes: 'bg-blue-100 text-blue-800' },
        project: { label: 'Project', classes: 'bg-purple-100 text-purple-800' }
        // No default/unknown
    };
    const currentStatus = statusConfig[vehicle.status];

    return (
        <div className="vehicle-card bg-white rounded-lg border h-full flex flex-col overflow-hidden relative">
            {/* Remove icon in top right of card (over image area) */}
            <span
                onClick={() => removeFromCompare(slotIndex)}
                className="absolute top-2 right-2 cursor-pointer text-gray-300 hover:text-red-600"
                style={{ zIndex: 10, right: '0.5rem' }}
                title="Remove from compare"
            >
                <Icon name="X" className="w-4 h-4" />
            </span>
            {/* Details icon button in top right, left of X */}
            <button
                onClick={() => { setVehicleProfileId(vehicle.ID); setActiveView('vehicle-profile'); setFromView('compare'); }}
                className="absolute top-2 right-8 cursor-pointer text-gray-400 hover:text-blue-600 bg-white bg-opacity-80 rounded-full p-1 shadow"
                style={{ zIndex: 10, right: '2.5rem' }}
                title="View Details"
            >
                <Icon name="FileText" className="w-5 h-5" />
            </button>
            {/* Card header with image and overlay */}
            <div className="relative">
                <div className="vehicle-card-bg" style={{ backgroundImage: `url(${imageUrl})`, height: '120px' }}></div>
                <div className="vehicle-card-overlay" style={{ height: '120px' }}></div>
                <div className="vehicle-card-header" style={{ height: '120px', padding: '1rem' }}>
                    <div>
                        <div className="flex items-center mb-2">
                            <h4 className="text-lg font-medium text-white mr-3 truncate">{`${vehicle.Year || ''} ${vehicle.Make || ''} ${vehicle.Model || ''}`}</h4>
                            {currentStatus && (
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${currentStatus.classes}`}>{currentStatus.label}</span>
                            )}
                        </div>
                        <p className="text-gray-200 font-medium truncate" style={{ marginTop: '-0.25rem' }}>{vehicle.Trim || ''}</p>
                    </div>
                </div>
            </div>
            {/* Stat comparison content */}
            <div className="p-4 flex-grow">
                <div className="divide-y divide-gray-200">
                    {renderStats()}
                </div>
            </div>
        </div>
    );
};

const CompareView = ({ setActiveView, setVehicleProfileId, setFromView }) => {
    const { compareVehicles, addVehicleToCompare } = useCompare();
    const [analysisType, setAnalysisType] = useState('General');

    // --- FIXED: statWinners calculation ---
    const statWinners = useMemo(() => {
        const loadedVehicles = compareVehicles.filter(v => v);
        if (loadedVehicles.length < 1) return {};

        // Helper to get the best value for a stat
        const getBest = (key, preference = 'max') => {
            const values = loadedVehicles
                .map(v => {
                    // Defensive: handle numbers as strings with commas
                    let val = v[key];
                    if (typeof val === 'string') val = val.replace(/,/g, '');
                    const num = parseFloat(val);
                    return isNaN(num) ? null : num;
                })
                .filter(v => v !== null);
            if (values.length === 0) return null;
            return preference === 'max' ? Math.max(...values) : Math.min(...values);
        };

        // Power-to-weight
        const pwrValues = loadedVehicles
            .map(v => {
                let hp = v['Horsepower (HP)'];
                let weight = v['Curb weight (lbs)'];
                if (typeof hp === 'string') hp = hp.replace(/,/g, '');
                if (typeof weight === 'string') weight = weight.replace(/,/g, '');
                hp = parseFloat(hp);
                weight = parseFloat(weight);
                if (isNaN(hp) || isNaN(weight) || weight === 0) return null;
                return hp / weight;
            })
            .filter(v => v !== null);

        return {
            'Horsepower (HP)': getBest('Horsepower (HP)'),
            'Torque (ft-lbs)': getBest('Torque (ft-lbs)'),
            'Curb weight (lbs)': getBest('Curb weight (lbs)', 'min'),
            '0-60 mph': getBest('0-60 mph', 'min'),
            'Power-to-Weight': pwrValues.length > 0 ? Math.max(...pwrValues) : null,
        };
    }, [compareVehicles]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                <PageHeader title="Vehicle Comparison" subtitle="Side-by-side vehicle analysis" />
                <div className="compare-view-controls flex items-center gap-2">
                    <div className="isolate inline-flex rounded-md shadow-sm">
                        {['General', 'Performance', 'Dimensions'].map(type => (
                             <button key={type} onClick={() => setAnalysisType(type)} className={`relative inline-flex items-center first:rounded-l-md last:rounded-r-md px-3 py-2 text-sm font-semibold -ml-px ${analysisType === type ? 'bg-red-600 text-white z-10' : 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'}`}>{type}</button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="compare-view-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                {compareVehicles.map((vehicle, index) => (
                    <div key={index} className="h-full">
                        {vehicle ? (
                            <CompareSlot 
                                vehicle={vehicle} 
                                slotIndex={index} 
                                statWinners={statWinners}
                                analysisType={analysisType}
                                setActiveView={setActiveView}
                                setVehicleProfileId={setVehicleProfileId}
                                setFromView={setFromView}
                            />
                        ) : (
                            <AddVehicleSlot 
                                onSelect={(vehicleId) => addVehicleToCompare(vehicleId, index)}
                                onBrowse={() => setActiveView('discover')}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const GarageMetrics = () => {
    const [metrics, setMetrics] = useState(null);
    const { rest_url, nonce } = window.myddpcAppData || {};

    useEffect(() => {
        const fetchMetrics = async () => {
            if (!rest_url) return;
            try {
                const response = await fetch(`${rest_url}myddpc/v2/garage/metrics`, {
                    headers: { 'X-WP-Nonce': nonce }
                });
                if (!response.ok) throw new Error('Failed to fetch metrics');
                const data = await response.json();
                setMetrics(data);
            } catch (error) {
                console.error("Error fetching garage metrics:", error);
            }
        };
        fetchMetrics();
    }, [rest_url, nonce]);

    const formatInvestment = (value) => {
        if (value >= 1000) {
            return `$${(value / 1000).toFixed(1)}K`;
        }
        return `$${value}`;
    };

    const metricCards = [
        { label: 'Active Vehicles', value: metrics?.active_vehicles, Icon: Icon, name: 'A' },
        { label: 'Open Tasks', value: metrics?.open_tasks, Icon: WrenchIcon },
        { label: 'Total Investment', value: metrics ? formatInvestment(metrics.total_investment) : null, Icon: DollarSignIcon },
        { label: 'Avg. Completion', value: metrics ? `${metrics.avg_completion}%` : null, Icon: BarChartIcon },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {metricCards.map((metric, idx) => (
                <div key={idx} className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">{metric.label}</p>
                            <p className="text-2xl font-light text-gray-900 mt-2">
                                {metric.value !== null && metric.value !== undefined ? metric.value : <span className="text-gray-400">...</span>}
                            </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <metric.Icon className="w-6 h-6 text-gray-600" name={metric.name} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const VehicleCard = ({ vehicle, onSelect, onWorkMode }) => {
    const statusConfig = {
        operational: { label: 'Operational', classes: 'bg-green-100 text-green-800' },
        maintenance: { label: 'In Service', classes: 'bg-yellow-100 text-yellow-800' },
        stored: { label: 'Stored', classes: 'bg-blue-100 text-blue-800' },
        project: { label: 'Project', classes: 'bg-purple-100 text-purple-800' },
        default: { label: 'Offline', classes: 'bg-gray-100 text-gray-800' }
    };
    const currentStatus = statusConfig[vehicle.status] || statusConfig.default;

    const formatInvestment = (value) => {
        if (value >= 1000) { return `$${(value / 1000).toFixed(1)}K`; }
        return `$${(value || 0).toFixed(2)}`;
    };

    // Use custom image, fall back to DB image, then to a generated SVG placeholder
    const imageUrl = vehicle.custom_image_url || vehicle.db_image_url || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='200' y='150' font-family='Arial,sans-serif' font-size='16' fill='%23374151' text-anchor='middle'%3E${vehicle.Year} ${vehicle.Make}%3C/text%3E%3C/svg%3E`;

    // Handler for the work mode button
    const handleWorkModeClick = (e) => {
        e.stopPropagation(); // Prevents the onSelect for the whole card from firing
        if (onWorkMode) {
            onWorkMode(vehicle);
        }
    };

    return (
        <div className="vehicle-card bg-white rounded-lg border flex flex-col" onClick={() => onSelect(vehicle)}>
            <div className="relative">
                <div className="vehicle-card-bg" style={{ backgroundImage: `url(${imageUrl})` }}></div>
                <div className="vehicle-card-overlay"></div>
                
                {/* NEW: Mobile Work Mode Button */}
                <button onClick={handleWorkModeClick} className="work-mode-btn">
                    <SmartphoneIcon className="w-5 h-5" />
                </button>

                <div className="vehicle-card-header">
                    <div>
                        <div className="flex items-center mb-2">
                            <h3 className="text-xl font-medium text-white mr-3">{vehicle.name}</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${currentStatus.classes}`}>{currentStatus.label}</span>
                        </div>
                        <p className="text-gray-200 font-medium">{vehicle.Year} {vehicle.Make} {vehicle.Model}</p>
                        <p className="text-sm text-gray-300">{vehicle.Trim}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-300 mb-1">Type</p>
                        <p className="font-medium text-white">{vehicle.type || 'Personal'}</p>
                    </div>
                </div>
            </div>

            <div className="vehicle-card-body">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-lg border">
                        <h4 className="text-sm font-medium text-gray-500 mb-3">Key Metrics</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span>Total Investment:</span> <span className="font-medium">{formatInvestment(vehicle.totalInvested)}</span></div>
                            <div className="flex justify-between"><span>Build Jobs:</span> <span className="font-medium">{vehicle.modifications}</span></div>
                            <div className="flex justify-between"><span>Mileage:</span> <span className="font-medium">{vehicle.mileage ? vehicle.mileage.toLocaleString() : 'N/A'}</span></div>
                        </div>
                    </div>
                    <div className="p-4 bg-white rounded-lg border">
                        <h4 className="text-sm font-medium text-gray-500 mb-3">Next Up</h4>
                        {vehicle.nextService ? (
                            <div>
                                <p className="font-medium text-gray-800">{vehicle.nextService}</p>
                                <p className="text-sm text-red-600">{vehicle.nextServiceDate}</p>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">No upcoming tasks.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const GarageOverview = ({ setActiveView, setGarageView, requireAuth }) => {
    const { isAuthenticated } = useAuth();
    const { vehicles, setSelectedVehicle } = useVehicles();

    const handleSelectVehicle = (vehicle) => {
        setSelectedVehicle(vehicle);
        setGarageView('vehicle-detail');
        // NEW: Push a new state to the browser history
        window.history.pushState({ view: 'detail' }, '');
    };

    if (!isAuthenticated) {
        return ( <div className="text-center py-16 max-w-2xl mx-auto"> <h2 className="text-2xl font-light text-gray-800 mb-4">Access Your Garage</h2> <p className="text-gray-600 mb-6">Log in or register to manage your vehicles, track your builds, and view your service history.</p> <button onClick={() => requireAuth(() => {})} className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700">Login / Register</button> </div> );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <PageHeader title="Garage Operations" subtitle="Vehicle management and build tracking system">
                <button onClick={() => setActiveView('discover')} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center font-medium">
                    <PlusIcon className="w-5 h-5 mr-2" /> Add Vehicle
                </button>
            </PageHeader>
            <GarageMetrics />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {Array.isArray(vehicles) && vehicles.length > 0 ? vehicles.map((vehicle) => (
                    <VehicleCard 
                        key={vehicle.garage_id} 
                        vehicle={vehicle} 
                        onSelect={handleSelectVehicle}
                        onWorkMode={(vehicle) => { setSelectedVehicle(vehicle); setGarageView('mobile-work'); }}
                    />
                )) : <p className="text-gray-600 lg:col-span-2">Your garage is empty. Go to the Discover tool to find and save vehicles.</p>}
            </div>
        </div>
    );
};

const MobileWorkInterface = ({ setGarageView }) => {
    const { selectedVehicle } = useVehicles();
    const [mobileWorkView, setMobileWorkView] = useState('tasks');
    // UPDATED: Removed 'Scanner' from the actions array
    const workModeActions = [
        { id: 'tasks', label: 'Tasks', icon: 'Clipboard' },
        { id: 'build', label: 'Build', icon: 'Wrench' },
        { id: 'notes', label: 'Notes', icon: 'FileText' },
        { id: 'fuel', label: 'Fuel', icon: 'Fuel' }
    ];

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-medium text-gray-900">Garage Work Mode</h1>
                        <p className="text-sm text-gray-600">{selectedVehicle?.Year} {selectedVehicle?.Make} {selectedVehicle?.Model}</p>
                    </div>
                    <button onClick={() => setGarageView('overview')} className="text-red-600 text-sm font-medium">Exit</button>
                </div>
            </div>
            <div className="bg-white border-b border-gray-200 sticky top-[61px] z-10">
                <div className="flex">
                    {workModeActions.map((action) => (
                        <button key={action.id} onClick={() => setMobileWorkView(action.id)} className={`flex-1 py-3 px-2 text-center transition-colors ${mobileWorkView === action.id ? 'border-b-2 border-red-600 text-red-600 bg-red-50' : 'text-gray-600'}`}>
                            <Icon name={action.icon} className="w-5 h-5 mx-auto mb-1" />
                            <span className="text-xs font-medium">{action.label}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div className="p-4">
                {mobileWorkView === 'tasks' && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                             <div className="bg-gray-50 rounded-lg p-8 text-center mb-4">
                                <Icon name="Clipboard" className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600">Task management feature</p>
                                <button className="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm">View Tasks</button>
                            </div>
                        </div>
                    </div>
                )}
                 {mobileWorkView === 'build' && <div className="text-center p-8 bg-white rounded-lg">Build feature coming soon.</div>}
                 {mobileWorkView === 'fuel' && <div className="text-center p-8 bg-white rounded-lg">Fuel tracking feature coming soon.</div>}
                 {mobileWorkView === 'notes' && <div className="text-center p-8 bg-white rounded-lg">Notes feature coming soon.</div>}
            </div>
        </div>
    );
};

const VehicleDetailView = ({ setGarageView }) => {
    const { selectedVehicle, fetchGarageVehicles } = useVehicles();
    const [buildList, setBuildList] = useState([]);
    const [editingJob, setEditingJob] = useState(null);
    const { rest_url, nonce } = window.myddpcAppData || {};

    // NEW: State to control the edit mode UI
    const [isEditing, setIsEditing] = useState(false);
    // NEW: State to control which tab is active
    const [activeTab, setActiveTab] = useState('details'); // 'details' or 'builds'
    
    const [vehicleInfo, setVehicleInfo] = useState({
        nickname: '', status: 'operational', type: 'Personal', mileage: ''
    });
    // NEW: State for the image file to be uploaded
    const [imageFile, setImageFile] = useState(null);

    // Populates the form state when a vehicle is selected or edit mode is cancelled
    const populateVehicleInfo = useCallback(() => {
        if (selectedVehicle) {
            setVehicleInfo({
                nickname: selectedVehicle.name || '',
                status: selectedVehicle.status || 'operational',
                type: selectedVehicle.type || 'Personal',
                mileage: selectedVehicle.mileage || '',
                // Keep track of the current image to avoid losing it on cancel
                custom_image_url: selectedVehicle.custom_image_url || '' 
            });
        }
    }, [selectedVehicle]);

    // Function to fetch build list for the selected vehicle
    const fetchBuildList = useCallback(async () => {
        if (!selectedVehicle?.garage_id) return;
        
        try {
            const response = await fetch(`${rest_url}myddpc/v2/garage/builds/${selectedVehicle.garage_id}`, {
                headers: { 'X-WP-Nonce': nonce }
            });
            const data = await response.json();
            if (response.ok) {
                setBuildList(Array.isArray(data) ? data : []);
            } else {
                console.error('Failed to fetch build list:', data.message);
                setBuildList([]);
            }
        } catch (error) {
            console.error('Error fetching build list:', error);
            setBuildList([]);
        }
    }, [selectedVehicle?.garage_id, rest_url, nonce]);

    useEffect(() => {
        if (selectedVehicle) {
            fetchBuildList();
            populateVehicleInfo();
        }
    }, [selectedVehicle, populateVehicleInfo, fetchBuildList]);
    
    const handleInfoChange = (e) => {
        const { name, value } = e.target;
        setVehicleInfo(prev => ({ ...prev, [name]: value }));
    };

    // NEW: Handles file selection for the custom image
    const handleImageFileChange = (e) => {
        if (e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    // Main save function
    const handleSave = async () => {
        let updatedInfo = { ...vehicleInfo };

        // Step 1: Upload image if a new one is selected
        if (imageFile) {
            const formData = new FormData();
            formData.append('file', imageFile);
            formData.append('title', `${vehicleInfo.nickname || selectedVehicle.name} Custom Image`);

            try {
                const response = await fetch(`${rest_url}wp/v2/media`, {
                    method: 'POST',
                    headers: { 'X-WP-Nonce': nonce },
                    body: formData,
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Failed to upload image.');
                // Update the info payload with the new image URL
                updatedInfo.custom_image_url = data.source_url;
            } catch (error) {
                console.error(error);
                alert('Error uploading image: ' + error.message);
                return; // Stop the save process if image upload fails
            }
        }

        // Step 2: Update vehicle details
        try {
            const response = await fetch(`${rest_url}myddpc/v2/garage/vehicle/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
                body: JSON.stringify({
                    garage_id: selectedVehicle.garage_id,
                    ...updatedInfo
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to update vehicle.');
            
            alert('Vehicle information updated.');
            await fetchGarageVehicles(); // Refresh the main list
            setIsEditing(false); // Exit edit mode
            setImageFile(null); // Clear the selected file
        } catch (error) {
            console.error(error);
            alert('Error updating vehicle: ' + error.message);
        }
    };
    
    // NEW: Handler for the cancel button
    const handleCancelEdit = () => {
        populateVehicleInfo(); // Revert any changes
        setIsEditing(false);
        setImageFile(null);
    };

    // NEW: Remove from Garage handler
    const handleRemoveFromGarage = async () => {
        if (!selectedVehicle?.garage_id) return;
        if (!window.confirm('Are you sure you want to remove this vehicle from your garage?')) return;
        try {
            const response = await fetch(`${rest_url}myddpc/v2/garage/vehicle/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
                body: JSON.stringify({ garage_id: selectedVehicle.garage_id }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to remove vehicle from garage.');
            alert('Vehicle removed from garage.');
            await fetchGarageVehicles();
            setGarageView('overview');
        } catch (error) {
            alert(error.message);
        }
    };

    if (!selectedVehicle) { return <div className="text-center p-8">No vehicle selected.</div>; }

    // Display component for static vehicle info
    const StaticInfoDisplay = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div><p className="text-sm text-gray-500">Nickname</p><p>{vehicleInfo.nickname}</p></div>
            <div><p className="text-sm text-gray-500">Mileage</p><p>{vehicleInfo.mileage ? Number(vehicleInfo.mileage).toLocaleString() : 'N/A'}</p></div>
            <div><p className="text-sm text-gray-500">Status</p><p className="capitalize">{vehicleInfo.status}</p></div>
            <div><p className="text-sm text-gray-500">Type</p><p>{vehicleInfo.type}</p></div>
        </div>
    );

    // Form component for editing vehicle info
    const EditableInfoForm = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Nickname</label>
                <input type="text" name="nickname" value={vehicleInfo.nickname} onChange={handleInfoChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Mileage</label>
                <input type="number" name="mileage" value={vehicleInfo.mileage} onChange={handleInfoChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select name="status" value={vehicleInfo.status} onChange={handleInfoChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="operational">Operational</option>
                    <option value="maintenance">In Service</option>
                    <option value="project">Project</option>
                    <option value="stored">Stored</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select name="type" value={vehicleInfo.type} onChange={handleInfoChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="Personal">Personal</option>
                    <option value="Daily">Daily</option>
                    <option value="Track">Track</option>
                    <option value="Show">Show</option>
                </select>
            </div>
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Custom Card Image</label>
                <input type="file" accept="image/*" onChange={handleImageFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"/>
                {imageFile && <p className="text-xs text-gray-500 mt-1">New: {imageFile.name}</p>}
            </div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button onClick={() => setGarageView('overview')} className="mb-4 text-sm text-red-600 font-medium">← Back to Garage</button>

            {/* Tab Switcher */}
            <div className="flex gap-2 mb-6">
                <button onClick={() => setActiveTab('details')} className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === 'details' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Vehicle Details</button>
                <button onClick={() => setActiveTab('builds')} className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === 'builds' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Build Planner</button>
                <div className="flex-1"></div>
                <button onClick={handleRemoveFromGarage} className="px-4 py-2 rounded-lg font-medium bg-white border border-red-600 text-red-600 hover:bg-red-50 ml-auto">Remove from Garage</button>
            </div>

            {/* Tab Content */}
            {activeTab === 'details' && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Vehicle Details</h3>
                        {!isEditing && (
                            <button onClick={() => setIsEditing(true)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium">Edit</button>
                        )}
                    </div>
                    {isEditing ? <EditableInfoForm /> : <StaticInfoDisplay />}
                    {isEditing && (
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={handleCancelEdit} className="bg-white hover:bg-gray-100 text-gray-800 px-4 py-2 rounded-lg border border-gray-300 font-medium">Cancel</button>
                            <button onClick={handleSave} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium">Save Changes</button>
                        </div>
                    )}
                </div>
            )}
            {activeTab === 'builds' && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Build Planner</h3>
                        <button onClick={() => setEditingJob({})} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                            Add New Job
                        </button>
                    </div>
                    {editingJob && (
                        <div className="mb-6">
                            <BuildJobForm 
                                job={editingJob} 
                                onSave={async (jobData) => {
                                    try {
                                        const response = await fetch(`${rest_url}myddpc/v2/garage/builds/save`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
                                            body: JSON.stringify({ ...jobData, garage_id: selectedVehicle.garage_id }),
                                        });
                                        const data = await response.json();
                                        if (!response.ok) throw new Error(data.message || 'Failed to save build job.');
                                        setEditingJob(null);
                                        fetchBuildList();
                                        alert('Build job saved successfully.');
                                    } catch (error) {
                                        console.error(error);
                                        alert('Error saving build job: ' + error.message);
                                    }
                                }}
                                onCancel={() => setEditingJob(null)}
                            />
                        </div>
                    )}
                    <div className="space-y-4">
                        {buildList.length > 0 ? (
                            buildList.map((job) => (
                                <div key={job.build_entry_id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-medium text-gray-900">{job.job_title}</h4>
                                        <div className="flex gap-2">
                                            <button onClick={() => setEditingJob(job)} className="text-blue-600 hover:text-blue-800 text-sm">
                                                Edit
                                            </button>
                                            <button onClick={async () => {
                                                if (confirm('Are you sure you want to delete this build job?')) {
                                                    try {
                                                        const response = await fetch(`${rest_url}myddpc/v2/garage/builds/delete`, {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
                                                            body: JSON.stringify({ build_entry_id: job.build_entry_id }),
                                                        });
                                                        const data = await response.json();
                                                        if (!response.ok) throw new Error(data.message || 'Failed to delete build job.');
                                                        fetchBuildList();
                                                        alert('Build job deleted successfully.');
                                                    } catch (error) {
                                                        console.error(error);
                                                        alert('Error deleting build job: ' + error.message);
                                                    }
                                                }
                                            }} className="text-red-600 hover:text-red-800 text-sm">
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                                        <div><span className="font-medium">Status:</span> <span className="capitalize">{job.status}</span></div>
                                        <div><span className="font-medium">Type:</span> <span className="capitalize">{job.job_type?.replace('_', ' ')}</span></div>
                                        <div><span className="font-medium">Method:</span> <span className="capitalize">{job.installation_method}</span></div>
                                        <div><span className="font-medium">Date:</span> {job.installation_date || 'TBD'}</div>
                                    </div>
                                    {job.job_notes && (
                                        <p className="text-sm text-gray-600 mb-3">{job.job_notes}</p>
                                    )}
                                    {job.items_data && Array.isArray(job.items_data) && job.items_data.length > 0 && (
                                        <div className="border-t pt-3">
                                            <h5 className="text-sm font-medium text-gray-700 mb-2">Parts & Costs:</h5>
                                            <div className="space-y-1">
                                                {job.items_data.map((item, index) => (
                                                    <div key={index} className="flex justify-between text-sm">
                                                        <span>{item.name}</span>
                                                        <span className="text-gray-600">
                                                            {item.cost ? `$${parseFloat(item.cost).toFixed(2)}` : 'TBD'}
                                                            {item.purpose && ` • ${item.purpose}`}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <WrenchIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                <p>No build jobs yet. Click "Add New Job" to get started!</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const BuildJobForm = ({ job, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        build_entry_id: '', job_title: '', job_type: 'aftermarket_upgrade', status: 'planned',
        installation_date: '', installation_method: 'diy', primary_link: '', job_notes: '',
        items_data: [{ name: '', cost: '', purpose: '' }]
    });

    useEffect(() => {
        if (job) {
            setFormData({
                build_entry_id: job.build_entry_id,
                job_title: job.job_title || '',
                job_type: job.job_type || 'aftermarket_upgrade',
                status: job.status || 'planned',
                installation_date: job.installation_date ? new Date(job.installation_date).toISOString().split('T')[0] : '',
                installation_method: job.installation_method || 'diy',
                primary_link: job.primary_link || '',
                job_notes: job.job_notes || '',
                items_data: Array.isArray(job.items_data) && job.items_data.length > 0 ? job.items_data : [{ name: '', cost: '', purpose: '' }]
            });
        }
    }, [job]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (index, e) => {
        const { name, value } = e.target;
        const newItems = [...formData.items_data];
        newItems[index][name] = value;
        setFormData(prev => ({ ...prev, items_data: newItems }));
    };

    const addItem = () => {
        if (formData.items_data.length < 10) {
            setFormData(prev => ({ ...prev, items_data: [...prev.items_data, { name: '', cost: '', purpose: '' }] }));
        }
    };

    const removeItem = (index) => {
        if (formData.items_data.length > 1) {
            const newItems = formData.items_data.filter((_, i) => i !== index);
            setFormData(prev => ({ ...prev, items_data: newItems }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
        if (!job) { // Reset form only if it was a new entry
            setFormData({ build_entry_id: '', job_title: '', job_type: 'aftermarket_upgrade', status: 'planned', installation_date: '', installation_method: 'diy', primary_link: '', job_notes: '', items_data: [{ name: '', cost: '', purpose: '' }] });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
            <h4 className="text-md font-medium text-gray-800">{job ? 'Edit Job' : 'Add New Job'}</h4>
            <input type="text" name="job_title" placeholder="Job Title (e.g., Front Suspension Overhaul)" value={formData.job_title} onChange={handleChange} className="w-full rounded-lg border-gray-300" required />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select name="job_type" value={formData.job_type} onChange={handleChange} className="rounded-lg border-gray-300">
                    <option value="aftermarket_upgrade">Aftermarket Upgrade</option>
                    <option value="oem_replacement">OEM Replacement</option>
                    <option value="maintenance">Maintenance</option>
                </select>
                <select name="status" value={formData.status} onChange={handleChange} className="rounded-lg border-gray-300">
                    <option value="planned">Planned</option>
                    <option value="purchased">Purchased</option>
                    <option value="complete">Complete</option>
                </select>
                <input type="date" name="installation_date" value={formData.installation_date} onChange={handleChange} className="rounded-lg border-gray-300" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select name="installation_method" value={formData.installation_method} onChange={handleChange} className="rounded-lg border-gray-300">
                    <option value="diy">DIY</option>
                    <option value="professional">Professional</option>
                </select>
                <input type="url" name="primary_link" placeholder="Primary Link (optional)" value={formData.primary_link} onChange={handleChange} className="rounded-lg border-gray-300" />
            </div>
            <textarea name="job_notes" placeholder="Job Notes (optional)" value={formData.job_notes} onChange={handleChange} className="w-full rounded-lg border-gray-300" rows="2"></textarea>
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Parts & Costs</label>
                {formData.items_data.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <input type="text" name="name" placeholder="Part/Item Name" value={item.name} onChange={e => handleItemChange(index, e)} className="flex-grow rounded-lg border-gray-300 text-sm" />
                        <input type="number" name="cost" placeholder="Cost" value={item.cost} onChange={e => handleItemChange(index, e)} className="w-24 rounded-lg border-gray-300 text-sm" />
                        <input type="text" name="purpose" placeholder="Purpose" value={item.purpose} onChange={e => handleItemChange(index, e)} className="w-32 rounded-lg border-gray-300 text-sm" />
                        <button type="button" onClick={() => removeItem(index)} className="p-2 text-red-500 hover:text-red-700"><Trash2Icon className="w-4 h-4" /></button>
                    </div>
                ))}
                {formData.items_data.length < 10 && <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:underline">+ Add Item</button>}
            </div>
            <div className="flex justify-end gap-3">
                {job && <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>}
                <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">{job ? 'Update Job' : 'Add Job'}</button>
            </div>
        </form>
    );
};

// --- MY ACCOUNT PAGE COMPONENT ---

const MyAccount = () => {
    const { rest_url, nonce } = window.myddpcAppData || {};
    const [userData, setUserData] = useState({ username: '', email: '', location: '', avatar_url: '' });
    const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [avatarFile, setAvatarFile] = useState(null);
    const [feedback, setFeedback] = useState({ message: '', type: '' });

    // Fetch user data on initial load
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await fetch(`${rest_url}myddpc/v2/user/me`, {
                    headers: { 'X-WP-Nonce': nonce }
                });
                const data = await response.json();
                if (response.ok) {
                    setUserData(data);
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        };
        fetchUserData();
    }, [rest_url, nonce]);

    const handleFeedback = (message, type = 'success', duration = 3000) => {
        setFeedback({ message, type });
        setTimeout(() => setFeedback({ message: '', type: '' }), duration);
    };
    
    const handleLocationChange = (e) => {
        setUserData(prev => ({ ...prev, location: e.target.value }));
    };

    const handlePasswordChange = (e) => {
        setPasswordData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleAvatarFileChange = (e) => {
        if (e.target.files[0]) {
            setAvatarFile(e.target.files[0]);
        }
    };

    // Uploads avatar and returns the URL
    const uploadAvatar = async () => {
        const formData = new FormData();
        formData.append('file', avatarFile);
        formData.append('title', `${userData.username}-avatar`);

        const response = await fetch(`${rest_url}wp/v2/media`, {
            method: 'POST',
            headers: { 'X-WP-Nonce': nonce },
            body: formData,
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to upload avatar.');
        }
        return data.source_url;
    };

    // Save profile updates (location, avatar)
    const handleProfileSave = async () => {
        let profileData = { location: userData.location };
        try {
            if (avatarFile) {
                const newAvatarUrl = await uploadAvatar();
                profileData.avatar_url = newAvatarUrl;
            }
            const response = await fetch(`${rest_url}myddpc/v2/user/profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
                body: JSON.stringify(profileData),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            handleFeedback('Profile updated successfully!');
            // Refresh user data to show new avatar immediately
            if(profileData.avatar_url) {
                setUserData(prev => ({...prev, avatar_url: profileData.avatar_url}));
            }
            setAvatarFile(null); // Clear file input
        } catch (error) {
            handleFeedback(error.message, 'error');
        }
    };
    
    // Change user password
    const handlePasswordSave = async (e) => {
        e.preventDefault();
        if (passwordData.new_password !== passwordData.confirm_password) {
            handleFeedback('New passwords do not match.', 'error');
            return;
        }
        try {
            const response = await fetch(`${rest_url}myddpc/v2/user/password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
                body: JSON.stringify({
                    current_password: passwordData.current_password,
                    new_password: passwordData.new_password,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            handleFeedback('Password changed successfully!');
            setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        } catch (error) {
            handleFeedback(error.message, 'error');
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
            {feedback.message && (
                <div className={`p-4 rounded-md ${feedback.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {feedback.message}
                </div>
            )}
            
            {/* --- Profile Section --- */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <h2 className="text-xl font-medium text-gray-900 mb-6">My Profile</h2>
                <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-6 space-y-4 sm:space-y-0">
                    <div className="flex flex-col items-center sm:items-start">
                        <img 
                            src={userData.avatar_url || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23f3f4f6'/%3E%3Ctext x='32' y='32' font-family='Arial,sans-serif' font-size='20' fill='%23374151' text-anchor='middle' dominant-baseline='central'%3E${userData.username ? userData.username.charAt(0).toUpperCase() : 'U'}%3C/text%3E%3C/svg%3E`} 
                            alt="Avatar" 
                            className="w-16 h-16 rounded-full object-cover mb-2 flex-shrink-0"
                        />
                        <input type="file" accept="image/*" onChange={handleAvatarFileChange} id="avatar-upload" className="hidden"/>
                        <label htmlFor="avatar-upload" className="cursor-pointer text-sm text-red-600 hover:text-red-800 font-medium text-center">
                            {avatarFile ? 'File Selected' : 'Set Avatar'}
                        </label>
                    </div>
                    <div className="flex-grow space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-500">Username</label>
                            <p className="mt-1 text-gray-800">{userData.username}</p>
                        </div>
                        <div>
                            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
                            <input type="text" id="location" value={userData.location || ''} onChange={handleLocationChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                        </div>
                    </div>
                </div>
                <div className="mt-6 text-center sm:text-right">
                    <button onClick={handleProfileSave} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium">Save Profile</button>
                </div>
            </div>

            {/* --- Password Section --- */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                 <h2 className="text-xl font-medium text-gray-900 mb-6">Change Password</h2>
                 <form onSubmit={handlePasswordSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Current Password</label>
                        <input type="password" name="current_password" value={passwordData.current_password} onChange={handlePasswordChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">New Password</label>
                        <input type="password" name="new_password" value={passwordData.new_password} onChange={handlePasswordChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                        <input type="password" name="confirm_password" value={passwordData.confirm_password} onChange={handlePasswordChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required/>
                    </div>
                    <div className="text-center sm:text-right">
                        <button type="submit" className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium">Update Password</button>
                    </div>
                 </form>
            </div>

            {/* --- Settings Section --- */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <h2 className="text-xl font-medium text-gray-900 mb-6">Settings</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button disabled className="w-full text-left p-4 bg-gray-100 rounded-lg text-gray-400 cursor-not-allowed">
                        <p className="font-medium">Theme</p>
                        <p className="text-sm">Customize app appearance (coming soon)</p>
                    </button>
                    <button disabled className="w-full text-left p-4 bg-gray-100 rounded-lg text-gray-400 cursor-not-allowed">
                        <p className="font-medium">Membership</p>
                        <p className="text-sm">Manage subscription (coming soon)</p>
                    </button>
                </div>
            </div>
        </div>
    );
};

const MyAccountView = () => {
    return <MyAccount />;
};

// 1. Add VehicleProfileView component
const VehicleProfileView = ({ vehicleId, onBack, year, make, model, trim }) => {
    const [vehicle, setVehicle] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [activeTab, setActiveTab] = React.useState('performance');
    const { rest_url, nonce } = window.myddpcAppData || {};

    // SVG icons for key specs and drivetrain
    const ICONS = {
        horsepower: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-zap"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
        ),
        torque: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-rotate-cw"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
        ),
        mpg: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-droplet"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>
        ),
        rwd: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
        ),
        fwd: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
        ),
        awd: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="7" r="2"/></svg>
        ),
        transmission: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="5"/><line x1="12" y1="6" x2="12" y2="18"/></svg>
        ),
    };

    // Helper to parse color swatches
    const parseColors = (colorString) => {
        if (!colorString || typeof colorString !== 'string') return [];
        return colorString.split(';').map(part => {
            const match = part.match(/([^()]+)\(([^)]+)\)/);
            if (match && match.length === 3) {
                return { name: match[1].trim(), rgb: match[2] };
            }
            return null;
        }).filter(Boolean);
    };

    React.useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);
        setVehicle(null);
        let fetchUrl = null;
        if (vehicleId) {
            fetchUrl = `${rest_url}myddpc/v2/vehicle/full_data?id=${vehicleId}`;
        }
        if (!fetchUrl) return;
        fetch(fetchUrl, { headers: { 'X-WP-Nonce': nonce } })
            .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch vehicle details'))
            .then(data => { if (isMounted) { setVehicle(data); setLoading(false); } })
            .catch(err => { if (isMounted) { setError(err); setLoading(false); } });
        return () => { isMounted = false; };
    }, [vehicleId, rest_url, nonce]);

    if (!vehicleId) return null;
    if (loading) return <div className="text-center p-12">Loading vehicle details...</div>;
    if (error || !vehicle) return <div className="text-center p-12 text-red-600">Error loading vehicle details.</div>;

    // --- Visual-first layout ---
    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button onClick={onBack} className="mb-4 text-sm text-red-600 font-medium">&larr; Back</button>
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Left: Hero Image */}
                    <div className="flex-1 flex items-center justify-center mb-6 md:mb-0" style={{ minWidth: 0 }}>
                        <img src={getFirstImageUrl(vehicle)} alt="Vehicle" className="w-full max-w-md h-auto object-cover rounded-lg shadow" />
                    </div>
                    {/* Right: Info */}
                    <div className="flex-1 flex flex-col gap-4 min-w-0">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-1">{vehicle.at_a_glance?.title || ''}</h1>
                            <h2 className="text-lg text-gray-600 mb-2">{vehicle.at_a_glance?.trim_desc || ''}</h2>
                        </div>
                        {/* Key Specs */}
                        <div className="flex gap-4 mb-2">
                            <div className="spec-item flex items-center gap-2 bg-gray-50 px-3 py-2 rounded border"><span>{ICONS.horsepower}</span><span className="font-bold text-lg">{vehicle.at_a_glance?.horsepower || 'N/A'}</span><span className="text-xs ml-1">HP</span></div>
                            <div className="spec-item flex items-center gap-2 bg-gray-50 px-3 py-2 rounded border"><span>{ICONS.torque}</span><span className="font-bold text-lg">{vehicle.at_a_glance?.torque || 'N/A'}</span><span className="text-xs ml-1">ft-lbs</span></div>
                            <div className="spec-item flex items-center gap-2 bg-gray-50 px-3 py-2 rounded border"><span>{ICONS.mpg}</span><span className="font-bold text-lg">{vehicle.at_a_glance?.combined_mpg || 'N/A'}</span><span className="text-xs ml-1">MPG</span></div>
                        </div>
                        {/* Drivetrain */}
                        <div className="flex gap-3 mb-2">
                            <div className="drivetrain-item flex items-center gap-2 bg-gray-100 px-3 py-1 rounded border">
                                {(() => {
                                    const drive = (vehicle.at_a_glance?.drive_type || '').toLowerCase();
                                    if (drive.includes('rear')) return ICONS.rwd;
                                    if (drive.includes('front')) return ICONS.fwd;
                                    if (drive.includes('all')) return ICONS.awd;
                                    return null;
                                })()}
                                <span>{vehicle.at_a_glance?.drive_type || 'N/A'}</span>
                            </div>
                            <div className="drivetrain-item flex items-center gap-2 bg-gray-100 px-3 py-1 rounded border">
                                {ICONS.transmission}
                                <span>{vehicle.at_a_glance?.transmission || 'N/A'}</span>
                            </div>
                        </div>
                        {/* Color Swatches */}
                        <div className="color-swatches mb-2">
                            <div className="mb-1 text-sm font-medium">Exterior Colors</div>
                            <div className="flex gap-2 flex-wrap mb-2">
                                {parseColors(vehicle.at_a_glance?.colors_exterior).length === 0 ? <span className="text-xs text-gray-400">N/A</span> :
                                    parseColors(vehicle.at_a_glance?.colors_exterior).map((color, idx) => (
                                        <div key={idx} className="color-swatch" style={{ backgroundColor: `rgb(${color.rgb})` }} title={color.name}></div>
                                    ))}
                            </div>
                            <div className="mb-1 text-sm font-medium">Interior Colors</div>
                            <div className="flex gap-2 flex-wrap">
                                {parseColors(vehicle.at_a_glance?.colors_interior).length === 0 ? <span className="text-xs text-gray-400">N/A</span> :
                                    parseColors(vehicle.at_a_glance?.colors_interior).map((color, idx) => (
                                        <div key={idx} className="color-swatch" style={{ backgroundColor: `rgb(${color.rgb})` }} title={color.name}></div>
                                    ))}
                            </div>
                        </div>
                        {/* Pros/Cons */}
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="pros bg-green-50 border-l-4 border-green-500 rounded p-3">
                                <div className="flex items-center gap-2 mb-1 text-green-700 font-semibold"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-thumbs-up"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> The Good</div>
                                <div className="text-sm text-gray-700 whitespace-pre-line">{(vehicle.at_a_glance?.pros || '').replace(/;+\s*$/, '') || 'N/A'}</div>
                            </div>
                            <div className="cons bg-red-50 border-l-4 border-red-500 rounded p-3">
                                <div className="flex items-center gap-2 mb-1 text-red-700 font-semibold"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-thumbs-down"><path d="M10 15v-5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> The Bad</div>
                                <div className="text-sm text-gray-700 whitespace-pre-line">{(vehicle.at_a_glance?.cons || '').replace(/;+\s*$/, '') || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Enthusiast's Deep Dive Tabs */}
                <div className="profile-tabs mt-8">
                    <div className="tab-headers flex border-b-2 border-gray-200 mb-4">
                        <button className={`tab-link px-4 py-2 font-medium text-gray-700 focus:outline-none transition-colors duration-150 ${activeTab === 'performance' ? 'active border-b-2 border-blue-500 bg-blue-100 font-bold' : 'hover:bg-gray-100'}`} onClick={() => setActiveTab('performance')}>Performance & Mechanical</button>
                        <button className={`tab-link px-4 py-2 font-medium text-gray-700 focus:outline-none transition-colors duration-150 ${activeTab === 'dimensions' ? 'active border-b-2 border-blue-500 bg-blue-100 font-bold' : 'hover:bg-gray-100'}`} onClick={() => setActiveTab('dimensions')}>Dimensions & Weight</button>
                        <button className={`tab-link px-4 py-2 font-medium text-gray-700 focus:outline-none transition-colors duration-150 ${activeTab === 'features' ? 'active border-b-2 border-blue-500 bg-blue-100 font-bold' : 'hover:bg-gray-100'}`} onClick={() => setActiveTab('features')}>Features & Options</button>
                        <button className={`tab-link px-4 py-2 font-medium text-gray-700 focus:outline-none transition-colors duration-150 ${activeTab === 'ownership' ? 'active border-b-2 border-blue-500 bg-blue-100 font-bold' : 'hover:bg-gray-100'}`} onClick={() => setActiveTab('ownership')}>Ownership & Reviews</button>
                    </div>
                    {activeTab === 'performance' && (
                        <div id="tab-performance" className="tab-content active">
                            <SpecTable data={vehicle.performance} section={null} />
                        </div>
                    )}
                    {activeTab === 'dimensions' && (
                        <div id="tab-dimensions" className="tab-content active">
                            <div className="blueprint-graphic-placeholder text-center mb-4">
                                <svg width="220" height="80" viewBox="0 0 220 80" style={{ opacity: 0.2 }}><rect x="10" y="30" width="200" height="30" rx="10" fill="#888" /><rect x="60" y="10" width="100" height="20" rx="8" fill="#888" /></svg>
                                <div className="text-xs text-gray-500">Vehicle dimensions (side/top profile)</div>
                            </div>
                            <SpecTable data={vehicle.dimensions} section={null} />
                        </div>
                    )}
                    {activeTab === 'features' && (
                        <div id="tab-features" className="tab-content active">
                            <SpecTable data={vehicle.features} section={null} />
                        </div>
                    )}
                    {activeTab === 'ownership' && (
                        <div id="tab-ownership" className="tab-content active">
                            <SpecTable data={vehicle.ownership} section={null} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper component for tabbed tables
const SpecTable = ({ data, section }) => {
    if (!data) return null;
    const sectionData = section ? data[section] : data;
    if (!sectionData) return null;
    return (
        <table className="spec-table w-full border-collapse">
            <tbody>
                {Object.entries(sectionData).map(([subSection, fields]) => (
                    <React.Fragment key={subSection}>
                        <tr><th colSpan={2} className="bg-gray-100 text-left px-4 py-2 text-sm font-semibold border-b" style={{ borderTop: '1px solid #e1e1e1' }}>{subSection}</th></tr>
                        {Object.entries(fields).map(([key, value]) => (
                            value && value !== 'N/A' && value !== 'N/A ft' && value !== 'N/A lbs' && value !== 'N/A in' && value !== 'N/A gal' ?
                                <tr key={key}>
                                    <td className="px-4 py-2 font-medium text-gray-700 w-1/3">{key}</td>
                                    <td className="px-4 py-2 text-gray-800">{value}</td>
                                </tr> : null
                        ))}
                    </React.Fragment>
                ))}
            </tbody>
        </table>
    );
};

//================================================================================
// 4. MAIN APP COMPONENT & LAYOUT
//================================================================================
const App = () => {
    const [activeView, setActiveView] = useState('garage');
    const [garageView, setGarageView] = useState('overview');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // This state is crucial
    const [isAuthModalOpen, setAuthModalOpen] = useState(false);
    const [vehicleToAddToGarage, setVehicleToAddToGarage] = useState(null);
    const [vehicleProfileId, setVehicleProfileId] = useState(null);
    const [fromView, setFromView] = useState('discover');
    
    const { isAuthenticated, user, logout } = useAuth();
    const { fetchGarageVehicles, setSelectedVehicle } = useVehicles();

    // Enhanced history management
    useEffect(() => {
        const handlePopState = (event) => {
            if (event.state) {
                // Restore both activeView and garageView from history state
                setActiveView(event.state.activeView || 'garage');
                setGarageView(event.state.garageView || 'overview');
            } else {
                // Default state when no history state exists
                setActiveView('garage');
                setGarageView('overview');
            }
        };

        // Set the initial state when the app loads
        window.history.replaceState({ 
            activeView: activeView, 
            garageView: garageView 
        }, '');

        // Add the event listener for popstate events
        window.addEventListener('popstate', handlePopState);

        // Cleanup: remove the event listener when the component unmounts
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []); // Empty array ensures this runs only on mount and unmount

    // Function to update browser history when navigation occurs
    const updateHistory = (newActiveView, newGarageView = 'overview') => {
        const state = { 
            activeView: newActiveView, 
            garageView: newGarageView 
        };
        
        // Create a descriptive title for the history entry
        let title = '';
        if (newActiveView === 'garage') {
            if (newGarageView === 'vehicle-detail') {
                title = 'Vehicle Details - MyDDPC Garage';
            } else if (newGarageView === 'mobile-work') {
                title = 'Work Mode - MyDDPC Garage';
            } else {
                title = 'Garage Overview - MyDDPC';
            }
        } else if (newActiveView === 'discover') {
            title = 'Discover Vehicles - MyDDPC';
        } else if (newActiveView === 'compare') {
            title = 'Compare Vehicles - MyDDPC';
        } else if (newActiveView === 'account') {
            title = 'My Account - MyDDPC';
        } else if (newActiveView === 'vehicle-profile') {
            title = `Vehicle Profile - MyDDPC`;
        }
        
        // Push new state to browser history
        window.history.pushState(state, title);
    };

    // Enhanced setActiveView that updates history
    const navigateToView = (viewId, garageViewId = 'overview') => {
        setActiveView(viewId);
        if (viewId === 'garage') {
            setGarageView(garageViewId);
        }
        updateHistory(viewId, garageViewId);
    };

    // Enhanced setGarageView that updates history
    const navigateToGarageView = (garageViewId) => {
        setGarageView(garageViewId);
        updateHistory('garage', garageViewId);
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchGarageVehicles();
        }
    }, [isAuthenticated, fetchGarageVehicles]);

    const requireAuth = (callback) => {
        if (isAuthenticated) {
            if (callback) callback();
        } else {
            setAuthModalOpen(true);
        }
    };

    const navigationItems = [
        { id: 'discover', label: 'Discover', icon: 'Search' },
        { id: 'compare', label: 'Compare', icon: 'Columns' },
        { id: 'saved', label: 'Saved Vehicles', icon: 'Bookmark', auth: true },
        { id: 'garage', label: 'Garage', icon: 'Garage', auth: true },
    ];

    const handleNavClick = (viewId) => {
        if (navigationItems.find(item => item.id === viewId)?.auth) {
            requireAuth(() => {
                setActiveView(viewId);
                setMobileMenuOpen(false); // Close menu on navigation
            });
        } else {
            setActiveView(viewId);
            setMobileMenuOpen(false); // Close menu on navigation
        }
    };
    


    const UserProfile = () => {
        const [dropdownOpen, setDropdownOpen] = useState(false);
        if (!user) return null;
        return (
            <div className="relative">
                <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setDropdownOpen(!dropdownOpen)}>
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center"><Icon name={user.displayName} className="w-4 h-4 text-gray-600" /></div>
                    <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.displayName}</span>
                </div>
                {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50" onMouseLeave={() => setDropdownOpen(false)}>
                        <button onClick={() => { navigateToView('account'); setDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">My Account</button>
                        <button onClick={logout} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Logout</button>
                    </div>
                )}
            </div>
        );
    };

    // --- Add to Garage Modal Logic ---
    const { rest_url, nonce } = window.myddpcAppData || {};
    const [addToGarageLoading, setAddToGarageLoading] = useState(false);
    const onSaveToGarage = async (vehicleId, nickname) => {
        setAddToGarageLoading(true);
        try {
            // Call backend to add vehicle to garage
            const response = await fetch(`${rest_url}myddpc/v2/garage/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
                body: JSON.stringify({ vehicle_id: vehicleId, nickname }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to add vehicle to garage.');
            // Refresh lists
            if (refreshLists) await refreshLists();
            setVehicleToAddToGarage(null);
            // Optionally show a success message (could add a toast here)
        } catch (err) {
            alert(err.message);
        } finally {
            setAddToGarageLoading(false);
        }
    };

    // This is the new return statement for the App component
    return (
        <UserListsProvider isAuthenticated={!!isAuthenticated}>
            <div id="myddpc-react-root" className="flex flex-col min-h-screen">
                <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
                <CompareSwapModal />
                <AddToGarageModalWrapper 
                    vehicleToAddToGarage={vehicleToAddToGarage}
                    setVehicleToAddToGarage={setVehicleToAddToGarage}
                />
                <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center h-16 justify-between">
                            {/* Left: Logo */}
                            <div className="flex-shrink-0 flex items-center" style={{ minWidth: 0 }}>
                                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleNavClick('garage')}>
                                    <img src="http://myddpc.com/wp-content/uploads/2025/03/cropped-cropped-cropped-Wordpress-Transparent-1.png" alt="MyDDPC Logo" className="h-8 w-auto" />
                                </div>
                            </div>

                            {/* Center: Navigation */}
                            <nav className="flex-1 flex justify-center items-center">
                                <div className="flex items-center space-x-1">
                                    {navigationItems.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleNavClick(item.id)}
                                            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeView === item.id ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'} nav-btn`}
                                        >
                                            <Icon name={item.icon} className="w-5 h-5 mr-2 nav-btn-icon" />
                                            <span className="nav-btn-label">{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </nav>

                            {/* Right: User Profile */}
                            <div className="flex items-center justify-end space-x-2 flex-shrink-0">
                                {isAuthenticated ? <UserProfile /> : (
                                    <button onClick={() => setAuthModalOpen(true)} className="text-sm font-medium text-gray-600 hover:text-gray-900 flex-shrink-0">Login</button>
                                )}
                            </div>
                        </div>
                    </div>
                </header>
                <main className="flex-grow bg-gray-50">
                    {activeView === 'discover' && <DiscoverView setActiveView={navigateToView} requireAuth={requireAuth} setVehicleProfileId={setVehicleProfileId} setFromView={setFromView} />}
                    {activeView === 'saved' && <SavedVehiclesView requireAuth={requireAuth} setActiveView={navigateToView} setVehicleProfileId={setVehicleProfileId} setFromView={setFromView} setSelectedVehicle={setSelectedVehicle} setGarageView={navigateToGarageView} />}
                    {activeView === 'compare' && <CompareView setActiveView={navigateToView} setVehicleProfileId={setVehicleProfileId} setFromView={setFromView} />}
                    {activeView === 'garage' && (
                        <>
                            {garageView === 'overview' && <GarageOverview setActiveView={navigateToView} setGarageView={navigateToGarageView} requireAuth={requireAuth} />}
                            {garageView === 'vehicle-detail' && <VehicleDetailView setGarageView={navigateToGarageView} />}
                            {garageView === 'mobile-work' && <MobileWorkInterface setGarageView={navigateToGarageView} />}
                        </>
                    )}
                    {activeView === 'account' && <MyAccountView />}
                    {activeView === 'vehicle-profile' && (
                        <VehicleProfileView vehicleId={vehicleProfileId} onBack={() => navigateToView(fromView)} />
                    )}
                </main>
            </div>
        </UserListsProvider>
    );
} // <-- This should be the only closing brace for App

//================================================================================
// 5. FINAL RENDER CALLS
//================================================================================

// Mount the main Garage App
const garageContainer = document.getElementById('myddpc-react-root');
if (garageContainer) {
    const root = ReactDOM.createRoot(garageContainer);
    root.render(
        <React.StrictMode>
            <AuthProvider>
                <CompareProvider>
                    <VehicleProvider>
                        <App />
                    </VehicleProvider>
                </CompareProvider>
            </AuthProvider>
        </React.StrictMode>
    );
}

// This is the new render block for the main app
const appContainer = document.getElementById('myddpc-react-root');
if (appContainer) {
    const root = ReactDOM.createRoot(appContainer);
    root.render(
        <React.StrictMode>
            <AuthProvider>
                <CompareProvider>
                    <VehicleProvider>
                        <App />
                    </VehicleProvider>
                </CompareProvider>
            </AuthProvider>
        </React.StrictMode>
    );
}

// Add this new component just above App:
function AddToGarageModalWrapper({ vehicleToAddToGarage, setVehicleToAddToGarage }) {
    const { rest_url, nonce } = window.myddpcAppData || {};
    const [addToGarageLoading, setAddToGarageLoading] = React.useState(false);
    const onSaveToGarage = async (vehicleId, nickname) => {
        setAddToGarageLoading(true);
        try {
            const response = await fetch(`${rest_url}myddpc/v2/garage/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
                body: JSON.stringify({ vehicle_id: vehicleId, nickname }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to add vehicle to garage.');
            setVehicleToAddToGarage(null);
        } catch (err) {
            alert(err.message);
        } finally {
            setAddToGarageLoading(false);
        }
    };
    return (
        <AddToGarageModal
            isOpen={!!vehicleToAddToGarage}
            onClose={() => setVehicleToAddToGarage(null)}
            vehicle={vehicleToAddToGarage}
            onSave={onSaveToGarage}
            loading={addToGarageLoading}
        />
    );
}