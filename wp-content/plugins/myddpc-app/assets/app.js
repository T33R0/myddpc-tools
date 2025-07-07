const { useState, useEffect, createContext, useContext, useCallback, useMemo } = React;
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
    const addVehicleToCompare = useCallback(async (vehicleOrId, slotIndex) => {
        if (!rest_url || !vehicleOrId) return;
        let vehicleId = vehicleOrId;
        let custom_image_url = null;
        let garage_nickname = null;
        // If passed a garage vehicle object, extract ID and custom fields
        if (typeof vehicleOrId === 'object' && vehicleOrId !== null) {
            vehicleId = vehicleOrId.vehicle_id || vehicleOrId.ID;
            custom_image_url = vehicleOrId.custom_image_url || null;
            garage_nickname = vehicleOrId.garage_nickname || vehicleOrId.name || null;
        }
        if (!vehicleId) return;
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
            // Merge custom image and nickname if present
            if (custom_image_url) vehicleData.custom_image_url = custom_image_url;
            if (garage_nickname) vehicleData.garage_nickname = garage_nickname;
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
        // Defensive: ensure vehicles is always an array
        const vehiclesArr = Array.isArray(data.vehicles) ? data.vehicles : [];
        // Fetch full vehicle data for those missing a custom image
        const augmentedVehicles = await Promise.all(vehiclesArr.map(async v => {
            if (v.custom_image_url && v.custom_image_url.trim() !== '') return v;
            const id = v.vehicle_id || v.vehicle_data_id;
            if (!id) {
                console.warn('No vehicle_id for garage vehicle:', v);
                return v;
            }
            // Fetch full data
            try {
                const fullRes = await fetch(`${rest_url}myddpc/v2/vehicle/full_data?id=${id}`, { headers: { 'X-WP-Nonce': nonce } });
                if (!fullRes.ok) return v;
                const fullData = await fullRes.json();
                // Merge image fields
                let hero_image = fullData?.at_a_glance?.hero_image || '';
                let image_url = fullData?.ImageURL || '';
                return {
                    ...v,
                    at_a_glance: fullData?.at_a_glance,
                    hero_image,
                    ImageURL: image_url,
                };
            } catch (e) {
                return v;
            }
        }));
        const processedData = augmentedVehicles.map(v => ({
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
    case 'Plus':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>;
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
    case 'Users':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
    case 'Info':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;
    case 'Bell':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5v-5z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>;
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
const UsersIcon = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const InfoIcon = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;

const PageHeader = ({ title, subtitle, children }) => ( <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4"> <div> <h1 className="text-3xl font-light text-gray-900 mb-2">{title}</h1> <p className="text-gray-600">{subtitle}</p> </div> <div>{children}</div> </div> );

const CompareTray = () => {
    const { compareVehicles, removeFromCompare, clearCompare } = useCompare();
    if (!compareVehicles || !Array.isArray(compareVehicles) || compareVehicles.length === 0 || compareVehicles.every(v => !v)) return null;
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
                        {compareVehicles.map((v, i) => v && (
                            <div key={v.ID || i} className="bg-gray-100 px-3 py-1 rounded-full flex items-center text-sm">
                                <span className="text-gray-700">{`${v.Year} ${v.Make} ${v.Model}`}</span>
                                <button onClick={() => removeFromCompare(i)} className="ml-2 text-gray-500 hover:text-red-600"><Icon name="X" className="w-4 h-4" /></button>
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
                <label htmlFor="login-username" className="block text-sm font-medium text-gray-700">Username</label>
                <input type="text" id="login-username" name="username" value={username} onChange={e => setUsername(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
            </div>
            <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">Password</label>
                <input type="password" id="login-password" name="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
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
                <label htmlFor="register-username" className="block text-sm font-medium text-gray-700">Username</label>
                <input type="text" id="register-username" name="username" value={username} onChange={e => setUsername(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
            </div>
            <div>
                <label htmlFor="register-email" className="block text-sm font-medium text-gray-700">Email Address</label>
                <input type="email" id="register-email" name="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
            </div>
            <div>
                <label htmlFor="register-password" className="block text-sm font-medium text-gray-700">Password</label>
                <input type="password" id="register-password" name="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
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
            onClose(); // Only close modal, no notification
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
                    <label htmlFor="garage-nickname" className="block text-sm font-medium text-gray-700">Nickname</label>
                    <input type="text" id="garage-nickname" name="nickname" value={nickname} onChange={e => setNickname(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
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
    const { isAuthenticated } = useAuth();
    const { discoveryResults, loading, fetchDiscoveryResults } = useVehicles();
    const { savedVehicles, refreshLists } = useUserLists();
    const { compareVehicles, addToCompare, removeFromCompare } = useCompare();
    const [filters, setFilters] = useState({});
    const [filterOptions, setFilterOptions] = useState({});
    const [sort, setSort] = useState({ by: 'Year', dir: 'desc' });
    const [pagination, setPagination] = useState({ page: 1, limit: 24 }); // Use even number for better layout
    const [vehicleToAddToGarage, setVehicleToAddToGarage] = useState(null);
    const [viewMode, setViewMode] = useState(() => {
        const saved = localStorage.getItem('myddpc_discover_view_mode');
        return saved === 'list' ? 'list' : 'gallery';
    });
    const { rest_url, nonce } = window.myddpcAppData || {};

    useEffect(() => { 
        if (!rest_url) return; 
        fetch(`${rest_url}myddpc/v2/discover/filters`, { 
            headers: { 'X-WP-Nonce': nonce } 
        }).then(res => res.json()).then(data => { 
            if (typeof data === 'object' && data !== null) setFilterOptions(data); 
        }).catch(err => console.error("Failed to fetch filter options:", err)); 
    }, [rest_url, nonce]);
    
    useEffect(() => { 
        const params = { 
            filters, 
            sort_by: sort.by, 
            sort_dir: sort.dir, 
            limit: pagination.limit, 
            offset: (pagination.page - 1) * pagination.limit 
        }; 
        fetchDiscoveryResults(params); 
    }, [filters, sort.by, sort.dir, pagination.page, pagination.limit, fetchDiscoveryResults]);
    
    const handleFilterChange = (filterName, value) => { 
        setPagination(p => ({ ...p, page: 1 })); 
        setFilters(p => ({ ...p, [filterName]: value })); 
    };
    const handleSortChange = (field, value) => setSort(p => ({ ...p, [field]: value }));
    const handlePageChange = (direction) => setPagination(p => ({ ...p, page: Math.max(1, p.page + direction) }));
        const handleReset = () => { 
        setFilters({});
        setSort({ by: 'Year', dir: 'desc' });
        setPagination({ page: 1, limit: 24 }); // Use even number for better layout
    };

    const handleViewModeChange = (mode) => {
        setViewMode(mode);
        localStorage.setItem('myddpc_discover_view_mode', mode);
    };

    const isVehicleSaved = (vehicleId) => {
        return savedVehicles.some(v => v.vehicle_id === vehicleId);
    };
    const isVehicleCompared = (vehicleId) => {
        return compareVehicles.some(v => v && v.ID === vehicleId);
    };

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
                
                await refreshLists();
            } catch (error) {
                console.error('Error saving vehicle:', error);
                alert(error.message);
            }
        });
    };

    const handleAddToGarage = (vehicle) => {
        requireAuth(() => {
            setVehicleToAddToGarage(vehicle);
        });
    };
    
    const getButtonState = (vehicle) => {
        if (isVehicleSaved(vehicle.ID)) {
            return { text: 'Saved', disabled: true, className: 'bg-green-600' };
        }
        return { text: 'Save', disabled: false, className: 'bg-red-600 hover:bg-red-700', action: () => handleSaveVehicle(vehicle) };
    };

    // Enhanced VehicleCard component with visual-first design
    const VehicleCard = ({ vehicle }) => {
        const buttonState = getButtonState(vehicle);
        const imageUrl = getFirstImageUrl(vehicle);
        
        // Handle grouped vehicle data (with trim metadata)
        const hasGroupMetadata = vehicle._group_metadata;
        const vehicleName = hasGroupMetadata 
            ? `${vehicle.Year} ${vehicle.Make} ${vehicle.Model}`
            : `${vehicle.Year || vehicle.year} ${vehicle.Make || vehicle.make} ${vehicle.Model || vehicle.model} ${vehicle.Trim || vehicle.trim}`;
        
        // State for trim selection within the card
        const [selectedTrimId, setSelectedTrimId] = React.useState(vehicle.ID);
        const [modelTrims, setModelTrims] = React.useState(null);
        const [currentVehicleData, setCurrentVehicleData] = React.useState(vehicle);
        
        // Fetch trims for this model when card loads
        React.useEffect(() => {
            const fetchModelTrims = async () => {
                try {
                    const year = vehicle.Year || vehicle.year;
                    const make = vehicle.Make || vehicle.make;
                    const model = vehicle.Model || vehicle.model;
                    
                    if (!year || !make || !model) return;
                    
                    const fetchUrl = `${rest_url}myddpc/v2/discover/model_trims?year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`;
                    const response = await fetch(fetchUrl, { headers: { 'X-WP-Nonce': nonce } });
                    
                    if (response.ok) {
                        const data = await response.json();
                        setModelTrims(data);
                        
                        // Set the first trim as default if we have trims
                        if (data.trims && data.trims.length > 0) {
                            setSelectedTrimId(data.trims[0].ID);
                            setCurrentVehicleData(data.trims[0]);
                        }
                    }
                } catch (err) {
                    console.error('Error fetching model trims:', err);
                }
            };
            
            fetchModelTrims();
        }, [vehicle, rest_url, nonce]);
        
        // Handle trim selection
        const handleTrimChange = (trimId, e) => {
            e.stopPropagation(); // Prevent card click
            if (!modelTrims || !modelTrims.trims) return;
            
            const selectedTrim = modelTrims.trims.find(trim => trim.ID == trimId);
            if (!selectedTrim) return;
            
            setSelectedTrimId(trimId);
            setCurrentVehicleData(selectedTrim);
        };
        
        // Use current vehicle data for display
        const displayVehicle = currentVehicleData || vehicle;
        
        return (
            <div 
                className="vehicle-discovery-card bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
                onClick={(e) => {
                    // Don't navigate if clicking on the dropdown or buttons
                    if (e.target.closest('select') || e.target.closest('button')) return;
                    setVehicleProfileId(selectedTrimId); 
                    setActiveView('vehicle-profile'); 
                    setFromView('discover'); 
                }}
            >
                {/* Hero Image Container - Largest element for visual impact */}
                <div className="vehicle-card-image-container relative h-56 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                    <img 
                        src={getFirstImageUrl(displayVehicle)} 
                        alt={vehicleName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                    <div className="vehicle-placeholder absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200" style={{ display: 'none' }}>
                        <div className="text-center">
                            <Icon name="Car" className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm font-medium">Image coming soon</p>
                        </div>
                    </div>
                    
                    {/* Quick action overlay on hover */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="bg-white rounded-lg px-4 py-2 shadow-lg">
                            <span className="text-sm font-medium text-gray-900">View Details</span>
                        </div>
                    </div>
                </div>
                
                {/* Vehicle Information */}
                <div className="p-5">
                    {/* Vehicle Title */}
                    <h3 className="vehicle-card-title text-xl font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight">
                        {vehicleName}
                    </h3>
                    
                    {/* Trim Selector Dropdown */}
                    {(modelTrims && modelTrims.trims && modelTrims.trims.length > 1) || (hasGroupMetadata && hasGroupMetadata.trim_count > 1) ? (
                        <div className="mb-3">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Select Trim {hasGroupMetadata && hasGroupMetadata.trim_count > 1 && `(${hasGroupMetadata.trim_count} available)`}
                            </label>
                            <select 
                                value={selectedTrimId} 
                                onChange={(e) => handleTrimChange(e.target.value, e)}
                                className="w-full rounded-lg border border-gray-300 px-2 py-1 text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-colors"
                            >
                                {modelTrims && modelTrims.trims ? (
                                    modelTrims.trims.map(trim => (
                                        <option key={trim.ID} value={trim.ID}>
                                            {trim.Trim} - {trim['Horsepower (HP)']} HP
                                        </option>
                                    ))
                                ) : (
                                    <option value={vehicle.ID}>
                                        {vehicle.Trim} - {vehicle['Horsepower (HP)']} HP
                                    </option>
                                )}
                            </select>
                        </div>
                    ) : null}
                    
                    {/* Key Specifications Grid */}
                    <div className="vehicle-card-specs grid grid-cols-2 gap-3 mb-5">
                        <div className="spec-item bg-gray-50 rounded-lg p-3">
                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Power</div>
                            <div className="font-bold text-gray-900">
                                {displayVehicle['Horsepower (HP)'] || displayVehicle.horsepower || 'N/A'} <span className="text-sm font-normal">HP</span>
                            </div>
                        </div>
                        <div className="spec-item bg-gray-50 rounded-lg p-3">
                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Engine</div>
                            <div className="font-bold text-gray-900">
                                {displayVehicle['Engine size (l)'] || displayVehicle.engine_size || 'N/A'}L <span className="text-sm font-normal">{displayVehicle.Cylinders || displayVehicle.cylinders || 'N/A'}-cyl</span>
                            </div>
                        </div>
                        <div className="spec-item bg-gray-50 rounded-lg p-3">
                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Weight</div>
                            <div className="font-bold text-gray-900">
                                {displayVehicle['Curb weight (lbs)'] ? Math.round(displayVehicle['Curb weight (lbs)']).toLocaleString() : displayVehicle.weight || 'N/A'} <span className="text-sm font-normal">lbs</span>
                            </div>
                        </div>
                        {displayVehicle['Drive type'] && (
                            <div className="spec-item bg-gray-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Drive</div>
                                <div className="font-bold text-gray-900">
                                    {displayVehicle['Drive type'].toUpperCase().includes('ALL WHEEL') ? 'AWD' : 
                                     displayVehicle['Drive type'].toUpperCase().includes('FRONT WHEEL') ? 'FWD' : 
                                     displayVehicle['Drive type'].toUpperCase().includes('FOUR WHEEL') ? '4WD' : 
                                     displayVehicle['Drive type'].toUpperCase().includes('REAR WHEEL') ? 'RWD' : 
                                     displayVehicle['Drive type']}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Action Bar - Clear, prominent buttons */}
                    <div className="vehicle-card-actions flex gap-2">
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                // Save the base model (without specific trim) to saved vehicles
                                const baseVehicle = {
                                    ...displayVehicle,
                                    ID: vehicle.ID, // Use the original vehicle ID (base model)
                                    Trim: vehicle.Trim // Use the original trim (base model)
                                };
                                handleSaveVehicle(baseVehicle); 
                            }}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Save Vehicle
                        </button>
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                if (isVehicleCompared(displayVehicle.ID)) {
                                    removeFromCompare(compareVehicles.findIndex(v => v && v.ID === displayVehicle.ID));
                                } else {
                                    addToCompare(displayVehicle); 
                                }
                            }}
                            className={`flex-1 px-4 py-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                                isVehicleCompared(displayVehicle.ID) 
                                    ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                            title={isVehicleCompared(displayVehicle.ID) ? 'Remove from Head-to-Head' : 'Add to Head-to-Head'}
                        >
                            <Icon name="Columns" className="w-4 h-4" />
                            <span className="hidden sm:inline">Head-to-Head</span>
                            <span className="sm:hidden">Compare</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <PageHeader title="Vehicle Discovery" subtitle="Find and compare vehicles by specifications and features" />
                <div className="mb-8"> <CompareTray /> </div>
                
                {/* Two-Column Layout: Filter Pane + Results Pane */}
                <div className="discover-view-grid grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Filter Pane (Left Column) - Persistent */}
                    <div className="discover-filters-column lg:col-span-1">
                        <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                                <button 
                                    onClick={handleReset} 
                                    className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline transition-colors"
                                >
                                    Reset All
                                </button>
                            </div>
                            <div className="space-y-6">
                                {Object.keys(filterOptions).map(key => (
                                    <div key={key}>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2 capitalize">
                                            {key.replace(/_/g, ' ')}
                                        </label>
                            <select 
                                            value={filters[key] || ''} 
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors" 
                                            onChange={(e) => handleFilterChange(key, e.target.value)}
                                        >
                                            <option value="">All {key.replace(/_/g, ' ')}</option>
                                            {Array.isArray(filterOptions[key]) && filterOptions[key].map(opt => 
                                                <option key={opt} value={opt}>{opt}</option>
                                )}
                            </select>
                    </div>
                                ))}
                    </div>
                </div>
                    </div>
                    
                    {/* Results Pane (Right Column) */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            {/* Header Bar with Results Count, Sorting, and View Toggle */}
                            <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
                                <div className="flex items-center gap-3">
                                    <p className="text-lg font-medium text-gray-900">
                                        {loading ? 'Loading...' : `${discoveryResults.total || 0} vehicles found`}
                                    </p>
                                    {!loading && discoveryResults.total > 0 && (
                                        <span className="text-sm text-gray-500">
                                            (Page {pagination.page} of {Math.ceil((discoveryResults.total || 0) / pagination.limit)})
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <ViewToggle currentView={viewMode} onViewChange={handleViewModeChange} />
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm font-semibold text-gray-700">Sort by:</label>
                                        <select 
                                            value={sort.by} 
                                            onChange={(e) => handleSortChange('by', e.target.value)} 
                                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                        >
                                            <option value="Year">Year</option>
                                            <option value="Make">Make</option>
                                            <option value="Horsepower (HP)">Power</option>
                                            <option value="Curb weight (lbs)">Weight</option>
                                        </select>
                                        <select 
                                            value={sort.dir} 
                                            onChange={(e) => handleSortChange('dir', e.target.value)} 
                                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                        >
                                            <option value="desc">Descending</option>
                                            <option value="asc">Ascending</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Results Grid */}
                            {loading ? (
                                <div className="text-center p-16">
                                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                                    <p className="mt-4 text-gray-600 text-lg">Loading vehicles...</p>
                                </div>
                            ) : Array.isArray(discoveryResults.results) && discoveryResults.results.length > 0 ? (
                                viewMode === 'gallery' ? (
                                    <div className="vehicle-discovery-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                        {discoveryResults.results.map((vehicle) => (
                                            <VehicleCardGallery 
                                                key={vehicle.ID} 
                                                vehicle={vehicle}
                                                onCardClick={(selectedTrimId) => {
                                                    setVehicleProfileId(selectedTrimId);
                                                    setActiveView('vehicle-profile');
                                                    setFromView('discover');
                                                }}
                                                onSaveVehicle={handleSaveVehicle}
                                                onAddToCompare={addToCompare}
                                                isVehicleSaved={isVehicleSaved}
                                                isVehicleCompared={isVehicleCompared}
                                                removeFromCompare={removeFromCompare}
                                                compareVehicles={compareVehicles}
                                                setVehicleProfileId={setVehicleProfileId}
                                                setActiveView={setActiveView}
                                                setFromView={setFromView}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {discoveryResults.results.map((vehicle) => (
                                            <VehicleCardList 
                                                key={vehicle.ID} 
                                                vehicle={vehicle}
                                                onCardClick={(selectedTrimId) => {
                                                    setVehicleProfileId(selectedTrimId);
                                                    setActiveView('vehicle-profile');
                                                    setFromView('discover');
                                                }}
                                                onSaveVehicle={handleSaveVehicle}
                                                onAddToCompare={addToCompare}
                                                isVehicleSaved={isVehicleSaved}
                                                isVehicleCompared={isVehicleCompared}
                                                removeFromCompare={removeFromCompare}
                                                compareVehicles={compareVehicles}
                                                setVehicleProfileId={setVehicleProfileId}
                                                setActiveView={setActiveView}
                                                setFromView={setFromView}
                                                isSavedList={false}
                                            />
                                        ))}
                                    </div>
                                )
                            ) : (
                                <div className="text-center p-16">
                                    <Icon name="Search" className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                                    <h3 className="text-xl font-semibold text-gray-900 mb-3">No vehicles found</h3>
                                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                        No vehicles match your current filters. Try adjusting your search criteria or reset the filters to see all vehicles.
                                    </p>
                    <button
                                        onClick={handleReset}
                                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-colors"
                                    >
                                        Reset All Filters
                    </button>
                                </div>
                            )}
                            
                            {/* Enhanced Pagination */}
                            {Array.isArray(discoveryResults.results) && discoveryResults.results.length > 0 && (
                                <div className="flex justify-between items-center mt-12 pt-8 border-t border-gray-200">
                    <button
                                        onClick={() => handlePageChange(-1)} 
                                        disabled={loading || pagination.page <= 1} 
                                        className="px-6 py-3 text-sm font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        ← Previous
                    </button>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-600">
                                            Page {pagination.page} of {Math.ceil((discoveryResults.total || 0) / pagination.limit)}
                                        </span>
                                        <span className="text-sm text-gray-400">•</span>
                                        <span className="text-sm text-gray-600">
                                            {discoveryResults.total || 0} total vehicles
                                        </span>
                </div>
                                    <button 
                                        onClick={() => handlePageChange(1)} 
                                        disabled={loading || pagination.page * pagination.limit >= (discoveryResults.total || 0)} 
                                        className="px-6 py-3 text-sm font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next →
                                    </button>
            </div>
                            )}
        </div>
                    </div>
                </div>
            </div>
            
            {/* Add to Garage Modal */}
            <AddToGarageModalWrapper 
                vehicleToAddToGarage={vehicleToAddToGarage} 
                setVehicleToAddToGarage={setVehicleToAddToGarage} 
            />
        </>
    );
};

// --- VEHICLE CARD LIST COMPONENT ---
const VehicleCardList = ({ vehicle, onCardClick, onSaveVehicle, onAddToCompare, isVehicleSaved, isVehicleCompared, removeFromCompare, compareVehicles, setVehicleProfileId, setActiveView, setFromView, isSavedList }) => {
    // State for trim selection within the card
    const [selectedTrimId, setSelectedTrimId] = React.useState(vehicle.ID);
    const [modelTrims, setModelTrims] = React.useState(null);
    const [currentVehicleData, setCurrentVehicleData] = React.useState(vehicle);
    const { rest_url, nonce } = window.myddpcAppData || {};
    
    // Fetch trims for this model when card loads
    React.useEffect(() => {
        const fetchModelTrims = async () => {
            try {
                const year = vehicle.Year || vehicle.year;
                const make = vehicle.Make || vehicle.make;
                const model = vehicle.Model || vehicle.model;
                
                if (!year || !make || !model) return;
                
                const fetchUrl = `${rest_url}myddpc/v2/discover/model_trims?year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`;
                const response = await fetch(fetchUrl, { headers: { 'X-WP-Nonce': nonce } });
                
                if (response.ok) {
                    const data = await response.json();
                    setModelTrims(data);
                    
                    // Set the first trim as default if we have trims
                    if (data.trims && data.trims.length > 0) {
                        setSelectedTrimId(data.trims[0].ID);
                        setCurrentVehicleData(data.trims[0]);
                    }
                }
            } catch (err) {
                console.error('Error fetching model trims:', err);
            }
        };
        
        fetchModelTrims();
    }, [vehicle, rest_url, nonce]);
    
    // Handle trim selection
    const handleTrimChange = (trimId, e) => {
        e.stopPropagation(); // Prevent card click
        if (!modelTrims || !modelTrims.trims) return;
        
        const selectedTrim = modelTrims.trims.find(trim => trim.ID == trimId);
        if (!selectedTrim) return;
        
        setSelectedTrimId(trimId);
        setCurrentVehicleData(selectedTrim);
    };
    
    // Use current vehicle data for display
    const displayVehicle = currentVehicleData || vehicle;
    
    // Handle grouped vehicle data (with trim metadata)
    const hasGroupMetadata = vehicle._group_metadata;
    const vehicleName = hasGroupMetadata 
        ? `${vehicle.Year} ${vehicle.Make} ${vehicle.Model}`
        : `${vehicle.Year || vehicle.year} ${vehicle.Make || vehicle.make} ${vehicle.Model || vehicle.model} ${vehicle.Trim || vehicle.trim}`;
    
    return (
        <div 
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
            onClick={() => onCardClick(selectedTrimId)}
        >
            <div className="flex items-center gap-4">
                {/* Vehicle Image (only for saved list) */}
                {isSavedList && (
                    <div className="flex-shrink-0 w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden">
                        <img 
                            src={getFirstImageUrl(displayVehicle)} 
                            alt={vehicleName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200" style={{ display: 'none' }}>
                            <Icon name="Car" className="w-8 h-8 text-gray-400" />
                        </div>
                    </div>
                )}
                
                {/* Vehicle Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {vehicleName}
                        </h3>
                        
                        {/* Trim Selector Dropdown */}
                        {(modelTrims && modelTrims.trims && modelTrims.trims.length > 1) || (hasGroupMetadata && hasGroupMetadata.trim_count > 1) ? (
                            <select 
                                value={selectedTrimId} 
                                onChange={(e) => handleTrimChange(e.target.value, e)}
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-red-500 focus:border-red-500 ml-2"
                            >
                                {modelTrims && modelTrims.trims ? (
                                    modelTrims.trims.map(trim => (
                                        <option key={trim.ID} value={trim.ID}>
                                            {trim.Trim} ({trim['Horsepower (HP)']} HP)
                                        </option>
                                    ))
                                ) : (
                                    <option value={vehicle.ID}>
                                        {vehicle.Trim || vehicle.trim} ({vehicle['Horsepower (HP)'] || vehicle.horsepower} HP)
                                    </option>
                                )}
                            </select>
                        ) : null}
                    </div>
                    
                    {/* Vehicle Specs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-sm text-gray-600">
                        <div><span className="font-medium">Power:</span> {displayVehicle['Horsepower (HP)'] || displayVehicle.horsepower || 'N/A'} HP</div>
                        <div><span className="font-medium">Engine:</span> {displayVehicle['Engine size (l)'] || displayVehicle.engine_size || 'N/A'}L {displayVehicle.Cylinders || displayVehicle.cylinders || 'N/A'}-cyl</div>
                        <div><span className="font-medium">Weight:</span> {displayVehicle['Curb weight (lbs)'] ? Math.round(displayVehicle['Curb weight (lbs)']).toLocaleString() : displayVehicle.weight || 'N/A'} lbs</div>
                        {displayVehicle['Drive type'] && <div><span className="font-medium">Drive:</span> {displayVehicle['Drive type'].toUpperCase().includes('ALL WHEEL') ? 'AWD' : 
                         displayVehicle['Drive type'].toUpperCase().includes('FRONT WHEEL') ? 'FWD' : 
                         displayVehicle['Drive type'].toUpperCase().includes('FOUR WHEEL') ? '4WD' : 
                         displayVehicle['Drive type'].toUpperCase().includes('REAR WHEEL') ? 'RWD' : 
                         displayVehicle['Drive type']}</div>}
                    </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isVehicleSaved(displayVehicle.ID)) {
                                // Already saved, could add remove functionality here
                                return;
                            }
                            onSaveVehicle(displayVehicle);
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                            isVehicleSaved(displayVehicle.ID) 
                                ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                                : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                        title={isVehicleSaved(displayVehicle.ID) ? 'Already Saved' : 'Save Vehicle'}
                    >
                        <Icon name="Heart" className="w-4 h-4" />
                        <span className="hidden sm:inline ml-1">Save</span>
                    </button>
                    
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isVehicleCompared(displayVehicle.ID)) {
                                removeFromCompare(compareVehicles.findIndex(v => v && v.ID === displayVehicle.ID));
                            } else {
                                onAddToCompare(displayVehicle);
                            }
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                            isVehicleCompared(displayVehicle.ID) 
                                ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                        title={isVehicleCompared(displayVehicle.ID) ? 'Remove from Head-to-Head' : 'Add to Head-to-Head'}
                    >
                        <Icon name="Columns" className="w-4 h-4" />
                        <span className="hidden sm:inline">Compare</span>
                    </button>
                </div>
            </div>
        </div>
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
    
    // State for grouped vehicles with trim selection
    const [groupedVehicles, setGroupedVehicles] = useState({});
    const [selectedTrims, setSelectedTrims] = useState({});
    const [viewMode, setViewMode] = useState(() => {
        const saved = localStorage.getItem('myddpc_saved_view_mode');
        return saved === 'list' ? 'list' : 'gallery';
    });

    const fetchSavedVehicles = useCallback(async () => {
        try {
            const response = await fetch(`${rest_url}myddpc/v2/saved`, {
                headers: { 'X-WP-Nonce': nonce }
            });
            if (!response.ok) throw new Error('Failed to fetch saved vehicles.');
            const data = await response.json();
            setSavedVehicles(data);
            
            // Fetch trims for each saved vehicle
            const trimsData = {};
            for (const vehicle of data) {
                try {
                    const trimsResponse = await fetch(
                        `${rest_url}myddpc/v2/discover/model_trims?year=${vehicle.Year}&make=${vehicle.Make}&model=${vehicle.Model}`,
                        { headers: { 'X-WP-Nonce': nonce } }
                    );
                    if (trimsResponse.ok) {
                        const trimsResult = await trimsResponse.json();
                        trimsData[vehicle.vehicle_id] = trimsResult;
                    }
                } catch (err) {
                    console.warn(`Failed to fetch trims for ${vehicle.Year} ${vehicle.Make} ${vehicle.Model}:`, err);
                }
            }
            setGroupedVehicles(trimsData);
            
            // Set default selected trims to the original vehicle
            const defaultTrims = {};
            data.forEach(vehicle => {
                defaultTrims[vehicle.vehicle_id] = vehicle.vehicle_id;
            });
            setSelectedTrims(defaultTrims);
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
    
    // Handler: change selected trim for a vehicle
    const handleTrimChange = (vehicleId, trimId) => {
        setSelectedTrims(prev => ({
            ...prev,
            [vehicleId]: trimId
        }));
    };
    
    // Helper: get the currently selected vehicle data
    const getCurrentVehicleData = (savedVehicle) => {
        const trims = groupedVehicles[savedVehicle.vehicle_id];
        if (!trims || !trims.trims) return savedVehicle;
        
        const selectedTrimId = selectedTrims[savedVehicle.vehicle_id];
        const selectedTrim = trims.trims.find(trim => trim.ID === parseInt(selectedTrimId));
        
        if (selectedTrim) {
            return {
                ...savedVehicle,
                ...selectedTrim,
                vehicle_id: selectedTrim.ID
            };
        }
        
        return savedVehicle;
    };

    const handleViewModeChange = (mode) => {
        setViewMode(mode);
        localStorage.setItem('myddpc_saved_view_mode', mode);
    };

    if (loading) return <div className="text-center p-12">Loading your saved vehicles...</div>;
    if (error) return <div className="text-center p-12 text-red-600">Error: {error}</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <PageHeader 
                title="My Saved Vehicles" 
                subtitle="A list of vehicles you're keeping an eye on. Add them to your Garage to start tracking mods."
            >
                <ViewToggle currentView={viewMode} onViewChange={handleViewModeChange} />
            </PageHeader>
            
            {savedVehicles.length > 0 ? (
                viewMode === 'gallery' ? (
                    <div className="vehicle-discovery-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {savedVehicles.map((vehicle) => {
                            const currentVehicle = getCurrentVehicleData(vehicle);
                            const garageVehicle = findGarageVehicle(currentVehicle.vehicle_id);
                            const trims = groupedVehicles[vehicle.vehicle_id];
                            const hasMultipleTrims = trims && trims.trims && trims.trims.length > 1;
                            
                            return (
                                <VehicleCardGallery 
                                    key={vehicle.saved_id}
                                    vehicle={{
                                        ...currentVehicle,
                                        saved_id: vehicle.saved_id,
                                        _hasMultipleTrims: hasMultipleTrims,
                                        _trims: trims,
                                        _selectedTrimId: selectedTrims[vehicle.vehicle_id] || vehicle.vehicle_id,
                                        _onTrimChange: (trimId) => handleTrimChange(vehicle.vehicle_id, trimId),
                                        _garageVehicle: garageVehicle,
                                        _onRemove: (e) => handleRemove(e, vehicle.saved_id),
                                        _onGoToGarage: () => handleGoToGarageVehicle(garageVehicle),
                                        _onViewDetails: () => {
                                            setVehicleProfileId(currentVehicle.vehicle_id);
                                            setActiveView('vehicle-profile');
                                            setFromView('saved');
                                            if (setSelectedVehicle) setSelectedVehicle(currentVehicle);
                                        },
                                        _onCompare: () => {
                                            setVehicleProfileId(currentVehicle.vehicle_id);
                                            setActiveView('compare');
                                            setFromView('saved');
                                        }
                                    }}
                                    onCardClick={(selectedTrimId) => {
                                        setVehicleProfileId(selectedTrimId);
                                        setActiveView('vehicle-profile');
                                        setFromView('saved');
                                    }}
                                    onSaveVehicle={() => {}} // Already saved, no action needed
                                    onAddToCompare={() => {}} // Could implement compare functionality
                                    isVehicleSaved={() => true} // Always true for saved vehicles
                                    isVehicleCompared={() => false} // Could implement compare state
                                    removeFromCompare={() => {}}
                                    compareVehicles={[]}
                                    setVehicleProfileId={setVehicleProfileId}
                                    setActiveView={setActiveView}
                                    setFromView={setFromView}
                                    isSavedList={true}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {savedVehicles.map((vehicle) => {
                            const currentVehicle = getCurrentVehicleData(vehicle);
                            const garageVehicle = findGarageVehicle(currentVehicle.vehicle_id);
                            const trims = groupedVehicles[vehicle.vehicle_id];
                            const hasMultipleTrims = trims && trims.trims && trims.trims.length > 1;
                            
                            return (
                                <div 
                                    key={vehicle.saved_id} 
                                    className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-all cursor-pointer bg-white"
                                    onClick={() => {
                                        setVehicleProfileId(currentVehicle.vehicle_id);
                                        setActiveView('vehicle-profile');
                                        setFromView('saved');
                                        if (setSelectedVehicle) setSelectedVehicle(currentVehicle);
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-3">
                                                <h4 className="text-lg font-medium text-gray-900 truncate">
                                                    {`${currentVehicle.Year} ${currentVehicle.Make} ${currentVehicle.Model}`}
                                                </h4>
                                                {hasMultipleTrims && (
                                                    <select 
                                                        value={selectedTrims[vehicle.vehicle_id] || vehicle.vehicle_id}
                                                        onChange={(e) => handleTrimChange(vehicle.vehicle_id, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-red-500 focus:border-red-500"
                                                    >
                                                        {trims.trims.map(trim => (
                                                            <option key={trim.ID} value={trim.ID}>
                                                                {trim.Trim} ({trim['Horsepower (HP)']} HP)
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm text-gray-600">
                                                <div><span className="font-medium">Power:</span> {currentVehicle['Horsepower (HP)'] || currentVehicle.horsepower || 'N/A'} HP</div>
                                                <div><span className="font-medium">Engine:</span> {currentVehicle['Engine size (l)'] || currentVehicle.engine_size || 'N/A'}L {currentVehicle.Cylinders || currentVehicle.cylinders || 'N/A'}-cyl</div>
                                                <div><span className="font-medium">Weight:</span> {currentVehicle['Curb weight (lbs)'] ? Math.round(currentVehicle['Curb weight (lbs)']).toLocaleString() : currentVehicle.weight || 'N/A'} lbs</div>
                                                {currentVehicle['Drive type'] && <div><span className="font-medium">Drive:</span> {currentVehicle['Drive type'].toUpperCase().includes('ALL WHEEL') ? 'AWD' : 
                                                 currentVehicle['Drive type'].toUpperCase().includes('FRONT WHEEL') ? 'FWD' : 
                                                 currentVehicle['Drive type'].toUpperCase().includes('FOUR WHEEL') ? '4WD' : 
                                                 currentVehicle['Drive type'].toUpperCase().includes('REAR WHEEL') ? 'RWD' : 
                                                 currentVehicle['Drive type']}</div>}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 ml-4 min-w-[120px] items-end">
                                            {garageVehicle && (
                                                <button 
                                                    onClick={e => { e.stopPropagation(); handleGoToGarageVehicle(garageVehicle); }} 
                                                    className="px-3 py-2 rounded-lg text-sm font-semibold transition-colors bg-blue-600 hover:bg-blue-700 text-white"
                                                    title="Go to Garage Vehicle"
                                                >
                                                    <Icon name="Garage" className="w-4 h-4" />
                                                    <span className="hidden sm:inline ml-1">Garage</span>
                                                </button>
                                            )}
                                            <button 
                                                onClick={e => handleRemove(e, vehicle.saved_id)} 
                                                className="px-3 py-2 rounded-lg text-sm font-semibold transition-colors bg-red-600 hover:bg-red-700 text-white"
                                                title="Remove Vehicle"
                                            >
                                                <Icon name="Trash2" className="w-4 h-4" />
                                                <span className="hidden sm:inline ml-1">Remove</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            ) : (
                <div className="text-center p-12 text-gray-500 bg-white border border-gray-200 rounded-lg">
                    <p>You haven't saved any vehicles yet.</p>
                    <p className="mt-2 text-sm">Use the Discover tool to find and save vehicles to your list.</p>
                </div>
            )}
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
    const { isAuthenticated } = useAuth();
    const [modalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState({ title: '', vehicles: [] });
    const [modalType, setModalType] = useState('saved');

    const openModal = (type) => {
        setModalType(type);
        if (type === 'saved') {
            setModalContent({ title: 'Select from Saved Vehicles', vehicles: savedVehicles });
        } else if (type === 'garage') {
            let garageList = [];
            if (Array.isArray(garageVehicles)) {
                garageList = garageVehicles;
            } else if (garageVehicles && Array.isArray(garageVehicles.vehicles)) {
                garageList = garageVehicles.vehicles;
            }
            setModalContent({ title: 'Select from Your Garage', vehicles: garageList });
        }
        setModalOpen(true);
    };

    const handleSelect = (vehicle) => {
        let id = vehicle && (vehicle.ID || vehicle.vehicle_id || vehicle.vehicle_id_from_main_table);
        const slotIndex = compareVehicles.findIndex(v => !v);
        if (modalType === 'saved') {
            if (id) {
                addVehicleToCompare(id, slotIndex);
            } else {
                console.warn('No valid ID found for selected saved vehicle:', vehicle);
            }
        } else if (modalType === 'garage') {
            if (id) {
                let vehicleToAdd = { ...vehicle };
                if (vehicle.custom_image_url) vehicleToAdd.custom_image_url = vehicle.custom_image_url;
                if (vehicle.name) vehicleToAdd.garage_nickname = vehicle.name;
                addVehicleToCompare(vehicleToAdd, slotIndex);
            } else {
                console.warn('No valid ID found for selected garage vehicle:', vehicle);
            }
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
                {isAuthenticated && (
                    <>
                        <button onClick={() => openModal('saved')} className="w-full text-center py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">From Saved</button>
                        <button onClick={() => openModal('garage')} className="w-full text-center py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">From Garage</button>
                    </>
                )}
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
    if (vehicle?.custom_image_url) return vehicle.custom_image_url;
    if (vehicle?.db_image_url) return vehicle.db_image_url;
    if (vehicle?.hero_image) return vehicle.hero_image;
    if (vehicle?.ImageURL) return vehicle.ImageURL.split(';')[0];
    if (vehicle?.['Image URL']) return vehicle['Image URL'].split(';')[0];
    if (vehicle?.at_a_glance?.hero_image && vehicle.at_a_glance.hero_image !== 'N/A') return vehicle.at_a_glance.hero_image;
    
    // fallback: create a data URL SVG placeholder instead of external service
    const title = vehicle?.at_a_glance?.title || `${vehicle.Year || ''} ${vehicle.Make || ''}` || 'Vehicle';
    const encodedTitle = encodeURIComponent(title);
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='250' viewBox='0 0 400 250'%3E%3Crect width='400' height='250' fill='%23f3f4f6'/%3E%3Ctext x='200' y='125' font-family='Arial,sans-serif' font-size='14' fill='%236b7280' text-anchor='middle'%3E${encodedTitle}%3C/text%3E%3C/svg%3E`;
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

const CompareView = ({ setActiveView, setVehicleProfileId, setFromView, onUpgradeClick }) => {
    const { compareVehicles } = useCompare();
    const { isAuthenticated } = useAuth();
    const { fetchGarageVehicles } = useVehicles();
    const [analysisType, setAnalysisType] = useState('General');

    useEffect(() => {
        fetchGarageVehicles && fetchGarageVehicles();
    }, [fetchGarageVehicles]);

    // Only allow 2 slots for guests, 3 for signed-in users
    const maxSlots = isAuthenticated ? 3 : 2;
    const visibleSlots = compareVehicles.slice(0, maxSlots);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                <PageHeader title="Vehicle Comparison" subtitle="Side-by-side vehicle analysis" />
                <PageHeader title="Vehicle Comparison" subtitle="Side-by-side vehicle analysis" />
                <div className="compare-view-controls flex items-center gap-2">
                    <div className="isolate inline-flex rounded-md shadow-sm">
                        {['General', 'Performance', 'Dimensions'].map(type => (
                             <button key={type} onClick={() => setAnalysisType(type)} className={`relative inline-flex items-center first:rounded-l-md last:rounded-r-md px-3 py-2 text-sm font-semibold -ml-px ${analysisType === type ? 'bg-red-600 text-white z-10' : 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'}`}>{type}</button>
                        ))}
                        {['General', 'Performance', 'Dimensions'].map(type => (
                             <button key={type} onClick={() => setAnalysisType(type)} className={`relative inline-flex items-center first:rounded-l-md last:rounded-r-md px-3 py-2 text-sm font-semibold -ml-px ${analysisType === type ? 'bg-red-600 text-white z-10' : 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'}`}>{type}</button>
                        ))}
                    </div>
                </div>
            </div>
            <div className={`compare-view-grid grid grid-cols-1 md:grid-cols-${maxSlots} lg:grid-cols-${maxSlots} gap-6 items-stretch`}>
                {visibleSlots.map((vehicle, index) => (
                    <div key={index} className="h-full">
                        {vehicle ? (
                            <CompareSlot 
                                vehicle={vehicle} 
                                slotIndex={index} 
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
            {/* Show upgrade link if at 2 vehicles and not pro */}
            {!isAuthenticated && visibleSlots.filter(Boolean).length === 2 && (
                <div className="mt-6 flex justify-center">
                    <a href="#" className="text-sm text-blue-600 underline hover:text-blue-800 font-medium cursor-pointer" onClick={onUpgradeClick}>Want to compare more than two vehicles?</a>
                </div>
            )}
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
    // Use custom image if set and non-empty, otherwise use getFirstImageUrl
    let imageUrl = '';
    if (vehicle.custom_image_url && vehicle.custom_image_url.trim() !== '') {
        imageUrl = vehicle.custom_image_url;
    } else {
        imageUrl = getFirstImageUrl(vehicle);
    }
    // Debug: log the vehicle object to inspect image fields
    console.log('VehicleCard vehicle:', vehicle);
    const statusConfig = {
        operational: { label: 'Operational', classes: 'bg-green-100 text-green-800' },
        maintenance: { label: 'In Service', classes: 'bg-yellow-100 text-yellow-800' },
        stored: { label: 'Stored', classes: 'bg-blue-100 text-blue-800' },
        project: { label: 'Project', classes: 'bg-purple-100 text-purple-800' },
        default: { label: 'Offline', classes: 'bg-gray-100 text-gray-800' }
    };
    const currentStatus = statusConfig[vehicle.status] || statusConfig.default;
    // Prefer custom image, then main image from vehicle data, then fallback SVG
    let mainImage = '';
    if (vehicle.custom_image_url) {
        mainImage = vehicle.custom_image_url;
    } else if (vehicle.hero_image) {
        mainImage = vehicle.hero_image;
    } else if (vehicle.db_image_url) {
        mainImage = vehicle.db_image_url;
    } else if (vehicle.ImageURL) {
        mainImage = vehicle.ImageURL.split(';')[0];
    } else if (vehicle['Image URL']) {
        mainImage = vehicle['Image URL'].split(';')[0];
    } else {
        const title = `${vehicle.Year || ''} ${vehicle.Make || ''}` || 'Vehicle';
        const encodedTitle = encodeURIComponent(title);
        mainImage = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='200' y='150' font-family='Arial,sans-serif' font-size='16' fill='%236b7280' text-anchor='middle'%3E${encodedTitle}%3C/text%3E%3C/svg%3E`;
    }

    // Restore formatInvestment
    const formatInvestment = (value) => {
        if (value >= 1000) { return `$${(value / 1000).toFixed(1)}K`; }
        return `$${(value || 0).toFixed(2)}`;
    };

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
                <div className="vehicle-card-bg" style={{ backgroundImage: `url(${imageUrl})`, height: '120px' }}></div>
                <div className="vehicle-card-overlay" style={{ height: '120px' }}></div>
                
                {/* NEW: Mobile Work Mode Button */}
                <button onClick={handleWorkModeClick} className="work-mode-btn">
                    <SmartphoneIcon className="w-5 h-5" />
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
    const { vehicles, setSelectedVehicle, fetchGarageVehicles } = useVehicles();
    const { savedVehicles } = useUserLists();
    const [garageLimit, setGarageLimit] = useState(null);
    const [garageCount, setGarageCount] = useState(0);
    const [canAddMore, setCanAddMore] = useState(false);
    const [canUseGarage, setCanUseGarage] = useState(true);
    const [showSelectModal, setShowSelectModal] = useState(false);
    const [addToGarageLoading, setAddToGarageLoading] = useState(false);
    const [vehicleToAdd, setVehicleToAdd] = useState(null);
    const { rest_url, nonce } = window.myddpcAppData || {};
    const [addCardExpanded, setAddCardExpanded] = useState(false);
    const [selectedSavedId, setSelectedSavedId] = useState('');
    const [nickname, setNickname] = useState('');
    const [addError, setAddError] = useState('');

    useEffect(() => {
        // Fetch garage permissions/limits from backend
        async function fetchGarageMeta() {
            try {
                const res = await fetch(`${rest_url}myddpc/v2/garage/vehicles`, { headers: { 'X-WP-Nonce': nonce } });
                const data = await res.json();
                setGarageLimit(data.garage_limit);
                setGarageCount(data.garage_count);
                setCanAddMore(data.can_add_more);
                setCanUseGarage(data.can_use_garage !== false);
            } catch (e) {
                setCanUseGarage(false);
            }
        }
        if (isAuthenticated) fetchGarageMeta();
    }, [isAuthenticated, rest_url, nonce]);

    const handleSelectVehicle = (vehicle) => {
        setSelectedVehicle(vehicle);
        setGarageView('vehicle-detail');
        window.history.pushState({ view: 'detail' }, '');
    };

    const handleAddFromSaved = () => setShowSelectModal(true);
    const handleSelectSavedVehicle = (vehicle) => {
        setVehicleToAdd(vehicle);
        setShowSelectModal(false);
    };
    const handleAddToGarage = async (vehicleId, nickname) => {
        setAddToGarageLoading(true);
        try {
            const response = await fetch(`${rest_url}myddpc/v2/garage/add_vehicle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
                body: JSON.stringify({ vehicle_id: vehicleId, nickname }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to add vehicle to garage.');
            setVehicleToAdd(null);
            await fetchGarageVehicles();
            // No notification/toast here
        } catch (err) {
            alert(err.message);
        } finally {
            setAddToGarageLoading(false);
        }
    };

    // Inline add handler
    const handleInlineAdd = async () => {
        setAddToGarageLoading(true);
        setAddError('');
        try {
            const selectedVehicle = savedVehicles.find(v => v.saved_id === selectedSavedId);
            if (!selectedVehicle) throw new Error('Please select a saved vehicle.');
            if (!nickname.trim()) throw new Error('Nickname is required.');
            const response = await fetch(`${rest_url}myddpc/v2/garage/add_vehicle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
                body: JSON.stringify({ vehicle_id: selectedVehicle.vehicle_id, nickname }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to add vehicle to garage.');
            setAddCardExpanded(false);
            setSelectedSavedId('');
            setNickname('');
            await fetchGarageVehicles();
        } catch (err) {
            setAddError(err.message);
        } finally {
            setAddToGarageLoading(false);
        }
    };

    if (!isAuthenticated || canUseGarage === false) {
        return null;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <PageHeader title="Garage Operations" subtitle="Vehicle management and build tracking system">
            </PageHeader>
            <GarageMetrics />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {Array.isArray(vehicles) && vehicles.length > 0 ? vehicles.slice().reverse().map((vehicle) => (
                    <VehicleCard 
                        key={vehicle.garage_id} 
                        vehicle={vehicle} 
                        onSelect={handleSelectVehicle}
                        onWorkMode={(vehicle) => { setSelectedVehicle(vehicle); setGarageView('mobile-work'); }}
                    />
                )) : <p className="text-gray-600 lg:col-span-2">Your garage is empty. Add a vehicle from your saved list.</p>}
                {/* Inline Add/Pro Card Logic */}
                {canAddMore && (
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 bg-white min-h-[180px]">
                        {!addCardExpanded ? (
                            <button onClick={() => setAddCardExpanded(true)} className="flex flex-col items-center">
                                <PlusIcon className="w-10 h-10 text-red-500 mb-2" />
                                <span className="font-medium text-red-600">Add from Saved Vehicles</span>
                                <span className="text-xs text-gray-500 mt-1">You can add {garageLimit === -1 ? 'unlimited' : `${garageLimit - garageCount}`} more</span>
                            </button>
                        ) : (
                            <div className="w-full max-w-xs mx-auto">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Saved Vehicle</label>
                                <select value={selectedSavedId} onChange={e => setSelectedSavedId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 mb-3">
                                    <option value="">-- Select --</option>
                                    {savedVehicles.filter(v => !vehicles.some(gv => gv.vehicle_id === v.vehicle_id)).map(v => (
                                        <option key={v.saved_id} value={v.saved_id}>{`${v.Year} ${v.Make} ${v.Model} ${v.Trim}`}</option>
                                    ))}
                                </select>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nickname</label>
                                <input type="text" id="inline-nickname" name="nickname" value={nickname} onChange={e => setNickname(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 mb-3" placeholder="Enter nickname" />
                                {addError && <p className="text-red-500 text-xs mb-2">{addError}</p>}
                                <div className="flex gap-2">
                                    <button onClick={handleInlineAdd} disabled={addToGarageLoading} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-red-400">{addToGarageLoading ? 'Adding...' : 'Add Vehicle'}</button>
                                    <button onClick={() => { setAddCardExpanded(false); setAddError(''); setSelectedSavedId(''); setNickname(''); }} className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">Cancel</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {!canAddMore && garageLimit !== null && (
                    <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 bg-white min-h-[180px]">
                        <div className="flex flex-col items-center">
                            <Icon name="Garage" className="w-10 h-10 text-gray-400 mb-2" />
                            <span className="font-medium text-gray-500">Garage Full</span>
                            <span className="text-xs text-gray-500 mt-1">Go Pro for more space</span>
                        </div>
                    </div>
                )}
            </div>
            {/* Saved Vehicle Select Modal */}
            <VehicleSelectModal 
                isOpen={showSelectModal} 
                onClose={() => setShowSelectModal(false)} 
                title="Select a vehicle to add to your garage" 
                vehicles={savedVehicles.filter(v => !vehicles.some(gv => gv.vehicle_id === v.vehicle_id))}
                onSelect={handleSelectSavedVehicle}
            />
            {/* Add to Garage Modal for nickname */}
            <AddToGarageModal 
                isOpen={!!vehicleToAdd} 
                onClose={() => setVehicleToAdd(null)} 
                vehicle={vehicleToAdd} 
                onSave={handleAddToGarage} 
                loading={addToGarageLoading}
            />
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
                {mobileWorkView === 'tasks' && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                             <div className="bg-gray-50 rounded-lg p-8 text-center mb-4">
                                <Icon name="Clipboard" className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600">Task management feature</p>
                                <button className="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm">View Tasks</button>
                                <Icon name="Clipboard" className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600">Task management feature</p>
                                <button className="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm">View Tasks</button>
                            </div>
                        </div>
                    </div>
                )}
                 {mobileWorkView === 'build' && <div className="text-center p-8 bg-white rounded-lg">Build feature coming soon.</div>}
                 {mobileWorkView === 'fuel' && <div className="text-center p-8 bg-white rounded-lg">Fuel tracking feature coming soon.</div>}
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

    // State to control the edit mode UI
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState('details'); // 'details' or 'builds'
    
    // Enhanced vehicle info state with new fields
    const [vehicleInfo, setVehicleInfo] = useState({
        nickname: '', 
        status: 'operational', 
        type: 'Personal', 
        mileage: '',
        vin: '',
        engine_code: '',
        drivetrain: '',
        exterior_color: '',
        interior_color: '',
        production_date: '',
        purchase_date: '',
        purchase_price: '',
        purchased_from: '',
        purchase_mileage: '',
        service_intervals: {
            oil_change: 5000,
            brake_fluid: 24000,
            transmission: 60000,
            coolant: 60000
        },
        last_service: {
            oil_change: '',
            brake_fluid: '',
            transmission: '',
            coolant: ''
        }
    });
    
    // Image carousel state
    const [imageFile, setImageFile] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [images, setImages] = useState([]);
    
    // Add Entry modal state
    const [showAddEntryModal, setShowAddEntryModal] = useState(false);
    const [addEntryType, setAddEntryType] = useState('');

    // Populates the form state when a vehicle is selected or edit mode is cancelled
    const populateVehicleInfo = useCallback(() => {
        if (selectedVehicle) {
            setVehicleInfo({
                nickname: selectedVehicle.name || '',
                status: selectedVehicle.status || 'operational',
                type: selectedVehicle.type || 'Personal',
                mileage: selectedVehicle.mileage || '',
                vin: selectedVehicle.vin || '',
                engine_code: selectedVehicle.engine_code || '',
                drivetrain: selectedVehicle.drivetrain || '',
                exterior_color: selectedVehicle.exterior_color || '',
                interior_color: selectedVehicle.interior_color || '',
                production_date: selectedVehicle.production_date || '',
                purchase_date: selectedVehicle.purchase_date || '',
                purchase_price: selectedVehicle.purchase_price || '',
                purchased_from: selectedVehicle.purchased_from || '',
                purchase_mileage: selectedVehicle.purchase_mileage || '',
                service_intervals: selectedVehicle.service_intervals || {
                    oil_change: 5000,
                    brake_fluid: 24000,
                    transmission: 60000,
                    coolant: 60000
                },
                last_service: selectedVehicle.last_service || {
                    oil_change: '',
                    brake_fluid: '',
                    transmission: '',
                    coolant: ''
                },
                custom_image_url: selectedVehicle.custom_image_url || '' 
            });
            
            // Set up images array
            const imageArray = [];
            if (selectedVehicle.custom_image_url) {
                imageArray.push(selectedVehicle.custom_image_url);
            }
            if (selectedVehicle.hero_image) {
                imageArray.push(selectedVehicle.hero_image);
            }
            if (selectedVehicle.db_image_url) {
                imageArray.push(selectedVehicle.db_image_url);
            }
            if (selectedVehicle.ImageURL) {
                const urls = selectedVehicle.ImageURL.split(';').filter(url => url.trim());
                imageArray.push(...urls);
            }
            if (selectedVehicle['Image URL']) {
                const urls = selectedVehicle['Image URL'].split(';').filter(url => url.trim());
                imageArray.push(...urls);
            }
            
            // Add placeholder if no images
            if (imageArray.length === 0) {
                const title = `${selectedVehicle.Year || ''} ${selectedVehicle.Make || ''}` || 'Vehicle';
                const encodedTitle = encodeURIComponent(title);
                imageArray.push(`data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='200' y='150' font-family='Arial,sans-serif' font-size='16' fill='%236b7280' text-anchor='middle'%3E${encodedTitle}%3C/text%3E%3C/svg%3E`);
            }
            
            setImages(imageArray);
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

    const handleServiceIntervalChange = (service, value) => {
        setVehicleInfo(prev => ({
            ...prev,
            service_intervals: {
                ...prev.service_intervals,
                [service]: parseInt(value) || 0
            }
        }));
    };

    const handleLastServiceChange = (service, value) => {
        setVehicleInfo(prev => ({
            ...prev,
            last_service: {
                ...prev.last_service,
                [service]: value
            }
        }));
    };

    // Handles file selection for the custom image
    const handleImageFileChange = (e) => {
        if (e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    // Calculate service due information
    const getServiceDueInfo = () => {
        const currentMileage = parseInt(vehicleInfo.mileage) || 0;
        const services = [];
        
        Object.entries(vehicleInfo.service_intervals).forEach(([service, interval]) => {
            const lastServiceMileage = parseInt(vehicleInfo.last_service[service]) || 0;
            const milesSinceService = currentMileage - lastServiceMileage;
            const milesUntilService = interval - milesSinceService;
            
            if (milesUntilService <= 0) {
                services.push({
                    name: service.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    status: 'overdue',
                    miles: Math.abs(milesUntilService),
                    type: 'overdue'
                });
            } else if (milesUntilService <= interval * 0.2) {
                services.push({
                    name: service.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    status: 'due_soon',
                    miles: milesUntilService,
                    type: 'warning'
                });
            }
        });
        
        return services;
    };

    // Calculate total investment
    const getTotalInvestment = () => {
        let total = 0;
        buildList.forEach(build => {
            if (build.status === 'complete' && build.items_data) {
                const items = Array.isArray(build.items_data) ? build.items_data : JSON.parse(build.items_data || '[]');
                items.forEach(item => {
                    if (item.cost && !isNaN(parseFloat(item.cost))) {
                        total += parseFloat(item.cost);
                    }
                });
            }
        });
        return total;
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
    
    // Handler for the cancel button
    const handleCancelEdit = () => {
        populateVehicleInfo(); // Revert any changes
        setIsEditing(false);
        setImageFile(null);
    };

    // Remove from Garage handler
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

    // Quick mileage update
    const handleQuickMileageUpdate = async () => {
        const newMileage = prompt('Enter current mileage:', vehicleInfo.mileage);
        if (newMileage && !isNaN(parseInt(newMileage))) {
            setVehicleInfo(prev => ({ ...prev, mileage: newMileage }));
            // Auto-save the mileage update
            try {
                const response = await fetch(`${rest_url}myddpc/v2/garage/vehicle/update`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
                    body: JSON.stringify({
                        garage_id: selectedVehicle.garage_id,
                        mileage: newMileage
                    }),
                });
                if (response.ok) {
                    await fetchGarageVehicles();
                }
            } catch (error) {
                console.error('Error updating mileage:', error);
            }
        }
    };

    if (!selectedVehicle) { 
        return <div className="text-center p-8">No vehicle selected.</div>; 
    }

    const serviceDueInfo = getServiceDueInfo();
    const totalInvestment = getTotalInvestment();
    const statusConfig = {
        operational: { label: 'Operational', classes: 'bg-green-100 text-green-800', icon: '✓' },
        maintenance: { label: 'In Service', classes: 'bg-yellow-100 text-yellow-800', icon: '🔧' },
        stored: { label: 'Stored', classes: 'bg-blue-100 text-blue-800', icon: '🏠' },
        project: { label: 'Project', classes: 'bg-purple-100 text-purple-800', icon: '🚧' },
        default: { label: 'Offline', classes: 'bg-gray-100 text-gray-800', icon: '⏸️' }
    };
    const currentStatus = statusConfig[vehicleInfo.status] || statusConfig.default;

    // Get full vehicle name
    const getFullVehicleName = () => {
        const parts = [];
        if (selectedVehicle.Year) parts.push(selectedVehicle.Year);
        if (selectedVehicle.Make) parts.push(selectedVehicle.Make);
        if (selectedVehicle.Model) parts.push(selectedVehicle.Model);
        if (selectedVehicle.Trim) parts.push(selectedVehicle.Trim);
        return parts.join(' ');
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header Block: Identity and Primary Actions */}
            <div className="mb-8">
                <button onClick={() => setGarageView('overview')} className="mb-4 text-sm text-red-600 font-medium">← Back to Garage</button>
                
                {/* Hero Image Carousel */}
                <div className="relative mb-6 bg-gray-100 rounded-lg overflow-hidden" style={{ height: '400px' }}>
                    {images.length > 0 ? (
                        <>
                            <img 
                                src={images[currentImageIndex]} 
                                alt={`${vehicleInfo.nickname || selectedVehicle.name}`}
                                className="w-full h-full object-cover"
                            />
                            {images.length > 1 && (
                                <>
                                    <button 
                                        onClick={() => setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1)}
                                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                                    >
                                        ←
                                    </button>
                                    <button 
                                        onClick={() => setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1)}
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                                    >
                                        →
                                    </button>
                                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                                        {images.map((_, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setCurrentImageIndex(index)}
                                                className={`w-2 h-2 rounded-full ${index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'}`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <div className="text-center">
                                <CameraIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                <p>No images available</p>
                            </div>
                        </div>
                    )}
                    
                    {/* Image upload overlay when editing */}
                    {isEditing && (
                        <div className="absolute top-4 right-4">
                            <label className="bg-white bg-opacity-90 px-3 py-2 rounded-lg cursor-pointer hover:bg-opacity-100 transition-all">
                                <CameraIcon className="w-4 h-4 inline mr-1" />
                                Add Photo
                                <input type="file" id="vehicle-image-upload" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                            </label>
                        </div>
                    )}
                </div>

                {/* Title Hierarchy */}
                <div className="mb-6">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        {vehicleInfo.nickname || `${selectedVehicle.Year} ${selectedVehicle.Make} ${selectedVehicle.Model}`}
                    </h1>
                    <h2 className="text-xl text-gray-600">
                        {getFullVehicleName()}
                    </h2>
                </div>

                {/* Primary Actions */}
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setShowAddEntryModal(true)}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Add Entry
                        </button>
                    </div>
                    <button 
                        onClick={handleRemoveFromGarage} 
                        className="text-red-600 hover:text-red-800 font-medium"
                    >
                        Remove from Garage
                    </button>
                </div>
            </div>

            {/* Dashboard Block: At-a-Glance Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Mileage */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-500">Current Mileage</h3>
                        <button 
                            onClick={handleQuickMileageUpdate}
                            className="text-red-600 hover:text-red-800 text-sm"
                        >
                            <PlusIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                        {vehicleInfo.mileage ? Number(vehicleInfo.mileage).toLocaleString() : 'N/A'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">miles</p>
                </div>

                {/* Status */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${currentStatus.classes}`}>
                        <span className="mr-1">{currentStatus.icon}</span>
                        {currentStatus.label}
                    </div>
                </div>

                {/* Total Investment */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Total Invested</h3>
                    <div className="text-3xl font-bold text-gray-900">
                        ${totalInvestment.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">in modifications</p>
                </div>

                {/* Service Due */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Service Due</h3>
                    {serviceDueInfo.length > 0 ? (
                        <div className="space-y-1">
                            {serviceDueInfo.slice(0, 2).map((service, index) => (
                                <div key={index} className={`text-sm ${service.type === 'overdue' ? 'text-red-600' : 'text-yellow-600'}`}>
                                    {service.name}: {service.miles.toLocaleString()} mi
                                </div>
                            ))}
                            {serviceDueInfo.length > 2 && (
                                <div className="text-xs text-gray-500">+{serviceDueInfo.length - 2} more</div>
                            )}
                        </div>
                    ) : (
                        <div className="text-sm text-green-600">All caught up!</div>
                    )}
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2 mb-6">
                <button 
                    onClick={() => setActiveTab('details')} 
                    className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === 'details' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                    Vehicle Details
                </button>
                <button 
                    onClick={() => setActiveTab('builds')} 
                    className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === 'builds' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                    Build Planner
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'details' && (
                <div className="space-y-6">
                    {/* Vehicle Specifications Section */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Vehicle Specifications</h3>
                            {!isEditing && (
                                <button onClick={() => setIsEditing(true)} className="text-red-600 hover:text-red-800">
                                    <Edit3Icon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="vehicle-vin" className="block text-sm font-medium text-gray-700">VIN</label>
                                    <input type="text" id="vehicle-vin" name="vin" value={vehicleInfo.vin} onChange={handleInfoChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                                </div>
                                <div>
                                    <label htmlFor="vehicle-engine-code" className="block text-sm font-medium text-gray-700">Engine Code</label>
                                    <input type="text" id="vehicle-engine-code" name="engine_code" value={vehicleInfo.engine_code} onChange={handleInfoChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                                </div>
                                <div>
                                    <label htmlFor="vehicle-drivetrain" className="block text-sm font-medium text-gray-700">Drivetrain</label>
                                    <input type="text" id="vehicle-drivetrain" name="drivetrain" value={vehicleInfo.drivetrain} onChange={handleInfoChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                                </div>
                                <div>
                                    <label htmlFor="vehicle-exterior-color" className="block text-sm font-medium text-gray-700">Exterior Color</label>
                                    <input type="text" id="vehicle-exterior-color" name="exterior_color" value={vehicleInfo.exterior_color} onChange={handleInfoChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                                </div>
                                <div>
                                    <label htmlFor="vehicle-interior-color" className="block text-sm font-medium text-gray-700">Interior Color</label>
                                    <input type="text" id="vehicle-interior-color" name="interior_color" value={vehicleInfo.interior_color} onChange={handleInfoChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                                </div>
                                <div>
                                    <label htmlFor="vehicle-production-date" className="block text-sm font-medium text-gray-700">Production Date</label>
                                    <input type="date" id="vehicle-production-date" name="production_date" value={vehicleInfo.production_date} onChange={handleInfoChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                                </div>
                            </div>
                        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                <div><p className="text-sm text-gray-500">VIN</p><p>{vehicleInfo.vin || 'N/A'}</p></div>
                                <div><p className="text-sm text-gray-500">Engine Code</p><p>{vehicleInfo.engine_code || 'N/A'}</p></div>
                                <div><p className="text-sm text-gray-500">Drivetrain</p><p>{vehicleInfo.drivetrain || 'N/A'}</p></div>
                                <div><p className="text-sm text-gray-500">Exterior Color</p><p>{vehicleInfo.exterior_color || 'N/A'}</p></div>
                                <div><p className="text-sm text-gray-500">Interior Color</p><p>{vehicleInfo.interior_color || 'N/A'}</p></div>
                                <div><p className="text-sm text-gray-500">Production Date</p><p>{vehicleInfo.production_date || 'N/A'}</p></div>
        </div>
                        )}
                    </div>

                    {/* Purchase Information Section */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Purchase Information</h3>
                            {!isEditing && (
                                <button onClick={() => setIsEditing(true)} className="text-red-600 hover:text-red-800">
                                    <Edit3Icon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        {isEditing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                                    <label htmlFor="purchase-date" className="block text-sm font-medium text-gray-700">Purchase Date</label>
                                    <input type="date" id="purchase-date" name="purchase_date" value={vehicleInfo.purchase_date} onChange={handleInfoChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
                                    <label htmlFor="purchase-price" className="block text-sm font-medium text-gray-700">Purchase Price</label>
                                    <input type="number" id="purchase-price" name="purchase_price" value={vehicleInfo.purchase_price} onChange={handleInfoChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
                                    <label htmlFor="purchased-from" className="block text-sm font-medium text-gray-700">Purchased From</label>
                                    <input type="text" id="purchased-from" name="purchased_from" value={vehicleInfo.purchased_from} onChange={handleInfoChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
                                    <label htmlFor="purchase-mileage" className="block text-sm font-medium text-gray-700">Purchase Mileage</label>
                                    <input type="number" id="purchase-mileage" name="purchase_mileage" value={vehicleInfo.purchase_mileage} onChange={handleInfoChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                <div><p className="text-sm text-gray-500">Purchase Date</p><p>{vehicleInfo.purchase_date || 'N/A'}</p></div>
                                <div><p className="text-sm text-gray-500">Purchase Price</p><p>{vehicleInfo.purchase_price ? `$${Number(vehicleInfo.purchase_price).toLocaleString()}` : 'N/A'}</p></div>
                                <div><p className="text-sm text-gray-500">Purchased From</p><p>{vehicleInfo.purchased_from || 'N/A'}</p></div>
                                <div><p className="text-sm text-gray-500">Purchase Mileage</p><p>{vehicleInfo.purchase_mileage ? Number(vehicleInfo.purchase_mileage).toLocaleString() : 'N/A'}</p></div>
        </div>
                        )}
                    </div>

                    {/* Service Intervals Section */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Service Intervals</h3>
                            {!isEditing && (
                                <button onClick={() => setIsEditing(true)} className="text-red-600 hover:text-red-800">
                                    <Edit3Icon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        {isEditing ? (
                            <div className="space-y-4">
                                {Object.entries(vehicleInfo.service_intervals).map(([service, interval]) => (
                                    <div key={service} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label htmlFor={`service-interval-${service}`} className="block text-sm font-medium text-gray-700">
                                                {service.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Interval
                                            </label>
                                            <input 
                                                type="number" 
                                                id={`service-interval-${service}`}
                                                name={`service_interval_${service}`}
                                                value={interval} 
                                                onChange={(e) => handleServiceIntervalChange(service, e.target.value)}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" 
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`last-service-${service}`} className="block text-sm font-medium text-gray-700">Last Service</label>
                                            <input 
                                                type="number" 
                                                id={`last-service-${service}`}
                                                name={`last_service_${service}`}
                                                value={vehicleInfo.last_service[service]} 
                                                onChange={(e) => handleLastServiceChange(service, e.target.value)}
                                                placeholder="Mileage"
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" 
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <span className="text-sm text-gray-500">
                                                {vehicleInfo.mileage && vehicleInfo.last_service[service] ? 
                                                    `Due in ${interval - (parseInt(vehicleInfo.mileage) - parseInt(vehicleInfo.last_service[service]))} miles` : 
                                                    'Set last service mileage'
                                                }
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(vehicleInfo.service_intervals).map(([service, interval]) => {
                                    const lastService = vehicleInfo.last_service[service];
                                    const currentMileage = parseInt(vehicleInfo.mileage) || 0;
                                    const lastServiceMileage = parseInt(lastService) || 0;
                                    const milesSinceService = currentMileage - lastServiceMileage;
                                    const milesUntilService = interval - milesSinceService;
                                    
                                    return (
                                        <div key={service} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <h4 className="font-medium">{service.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                                                <p className="text-sm text-gray-600">Every {interval.toLocaleString()} miles</p>
                                            </div>
                                            <div className="text-right">
                                                {lastService ? (
                                                    <div>
                                                        <p className="text-sm text-gray-600">Last: {lastService.toLocaleString()} mi</p>
                                                        <p className={`text-sm font-medium ${milesUntilService <= 0 ? 'text-red-600' : milesUntilService <= interval * 0.2 ? 'text-yellow-600' : 'text-green-600'}`}>
                                                            {milesUntilService <= 0 ? 
                                                                `Overdue by ${Math.abs(milesUntilService).toLocaleString()} mi` : 
                                                                `Due in ${milesUntilService.toLocaleString()} mi`
                                                            }
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-500">No service recorded</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
            </div>

                    {/* Key Logs Summary */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
                            <button className="text-red-600 hover:text-red-800 text-sm">View All</button>
                        </div>
                        <div className="space-y-3">
                            {buildList.slice(0, 3).map((job) => (
                                <div key={job.build_entry_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium">{job.job_title}</p>
                                        <p className="text-sm text-gray-600">
                                            {job.installation_date ? new Date(job.installation_date).toLocaleDateString() : 'TBD'}
                                        </p>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        job.status === 'complete' ? 'bg-green-100 text-green-800' :
                                        job.status === 'purchased' ? 'bg-blue-100 text-blue-800' :
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                                    </span>
                                </div>
                            ))}
                            {buildList.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    <WrenchIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                    <p>No recent activity. Add your first modification!</p>
                                </div>
                        )}
                    </div>
                    </div>

                    {/* Edit Actions */}
                    {isEditing && (
                        <div className="flex justify-end gap-3">
                            <button onClick={handleCancelEdit} className="bg-white hover:bg-gray-100 text-gray-800 px-4 py-2 rounded-lg border border-gray-300 font-medium">
                                Cancel
                            </button>
                            <button onClick={handleSave} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium">
                                Save Changes
                            </button>
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

            {/* Add Entry Modal */}
            {showAddEntryModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[101] flex justify-center items-center">
                    <div className="bg-white rounded-lg shadow-xl m-4 w-full max-w-md">
                        <div className="p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Entry</h3>
                            <div className="space-y-3">
                                <button 
                                    onClick={() => {
                                        setAddEntryType('mod');
                                        setShowAddEntryModal(false);
                                        setEditingJob({});
                                        setActiveTab('builds');
                                    }}
                                    className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <WrenchIcon className="w-6 h-6 text-red-600" />
                                        <div>
                                            <h4 className="font-medium">New Modification</h4>
                                            <p className="text-sm text-gray-600">Add parts, upgrades, or custom work</p>
                                        </div>
                                    </div>
                                </button>
                                <button 
                                    onClick={() => {
                                        setAddEntryType('service');
                                        setShowAddEntryModal(false);
                                        // TODO: Implement service logging
                                        alert('Service logging coming soon!');
                                    }}
                                    className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <CheckCircleIcon className="w-6 h-6 text-red-600" />
                                        <div>
                                            <h4 className="font-medium">Service Record</h4>
                                            <p className="text-sm text-gray-600">Log maintenance and repairs</p>
                                        </div>
                                    </div>
                                </button>
                                <button 
                                    onClick={() => {
                                        setAddEntryType('note');
                                        setShowAddEntryModal(false);
                                        // TODO: Implement note logging
                                        alert('Note logging coming soon!');
                                    }}
                                    className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <Edit3Icon className="w-6 h-6 text-red-600" />
                                        <div>
                                            <h4 className="font-medium">Note</h4>
                                            <p className="text-sm text-gray-600">Add observations or reminders</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button 
                                    onClick={() => setShowAddEntryModal(false)}
                                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
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
                                    <input type="text" id="job-title" name="job_title" placeholder="Job Title (e.g., Front Suspension Overhaul)" value={formData.job_title} onChange={handleChange} className="w-full rounded-lg border-gray-300" required />
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
                                        <input type="date" id="installation-date" name="installation_date" value={formData.installation_date} onChange={handleChange} className="rounded-lg border-gray-300" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select name="installation_method" value={formData.installation_method} onChange={handleChange} className="rounded-lg border-gray-300">
                    <option value="diy">DIY</option>
                    <option value="professional">Professional</option>
                </select>
                                        <input type="url" id="primary-link" name="primary_link" placeholder="Primary Link (optional)" value={formData.primary_link} onChange={handleChange} className="rounded-lg border-gray-300" />
            </div>
            <textarea name="job_notes" placeholder="Job Notes (optional)" value={formData.job_notes} onChange={handleChange} className="w-full rounded-lg border-gray-300" rows="2"></textarea>
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Parts & Costs</label>
                {formData.items_data.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                                                    <input type="text" id={`item-name-${index}`} name="name" placeholder="Part/Item Name" value={item.name} onChange={e => handleItemChange(index, e)} className="flex-grow rounded-lg border-gray-300 text-sm" />
                            <input type="number" id={`item-cost-${index}`} name="cost" placeholder="Cost" value={item.cost} onChange={e => handleItemChange(index, e)} className="w-24 rounded-lg border-gray-300 text-sm" />
                            <input type="text" id={`item-purpose-${index}`} name="purpose" placeholder="Purpose" value={item.purpose} onChange={e => handleItemChange(index, e)} className="w-32 rounded-lg border-gray-300 text-sm" />
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
    const [userData, setUserData] = useState({ 
        username: '', 
        email: '', 
        location: '', 
        avatar_url: '', 
        bio: '', 
        member_since: '' 
    });
    const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [passwordInputs, setPasswordInputs] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [avatarFile, setAvatarFile] = useState(null);
    const [feedback, setFeedback] = useState({ message: '', type: '' });
    const [activeTab, setActiveTab] = useState('profile');
    const [garageData, setGarageData] = useState([]);
    const [stats, setStats] = useState({
        vehicles: 0,
        modifications: 0,
        serviceRecords: 0,
        milesTracked: 0
    });
    // Add isEditing state for profile section
    const [isEditing, setIsEditing] = useState(false);

    // Fetch user data on initial load
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                console.log('MyAccount: Fetching user data...', { rest_url, nonce });
                const response = await fetch(`${rest_url}myddpc/v2/user/me`, {
                    headers: { 'X-WP-Nonce': nonce }
                });
                console.log('MyAccount: Response status:', response.status);
                const data = await response.json();
                console.log('MyAccount: Response data:', data);
                if (response.ok) {
                    setUserData(data);
                } else {
                    console.error('MyAccount: Failed to fetch user data:', data);
                }
            } catch (error) {
                console.error("MyAccount: Error fetching user data:", error);
            }
        };
        fetchUserData();
    }, [rest_url, nonce]);

    // Fetch garage data for stats and showcase
    useEffect(() => {
        const fetchGarageData = async () => {
            try {
                const response = await fetch(`${rest_url}myddpc/v2/garage/vehicles`, {
                    headers: { 'X-WP-Nonce': nonce }
                });
                if (response.ok) {
                    const data = await response.json();
                    setGarageData(data.vehicles || []);
                    
                    // Calculate stats from actual garage data
                    let totalMods = 0;
                    let totalService = 0;
                    let totalMiles = 0;
                    
                    data.vehicles?.forEach(vehicle => {
                        // Count modifications (builds) - backend provides this as a count
                        if (vehicle.modifications !== undefined) {
                            totalMods += parseInt(vehicle.modifications) || 0;
                        }
                        
                        // Count service intervals (these represent service records)
                        if (vehicle.service_intervals) {
                            try {
                                // service_intervals is already parsed as an object by the backend
                                const services = typeof vehicle.service_intervals === 'string' 
                                    ? JSON.parse(vehicle.service_intervals) 
                                    : vehicle.service_intervals;
                                if (services && typeof services === 'object') {
                                    const serviceCount = Object.keys(services).length;
                                    totalService += serviceCount;
                                }
                            } catch (e) {
                                console.log('Error parsing service intervals:', e);
                            }
                        }
                        
                        // Sum up mileage
                        if (vehicle.mileage) {
                            const mileage = parseInt(vehicle.mileage) || 0;
                            totalMiles += mileage;
                        }
                    });
                    
                    setStats({
                        vehicles: data.vehicles?.length || 0,
                        modifications: totalMods,
                        serviceRecords: totalService,
                        milesTracked: totalMiles
                    });
                }
            } catch (error) {
                console.error("Error fetching garage data:", error);
            }
        };
        fetchGarageData();
    }, [rest_url, nonce]);

    const handleFeedback = (message, type = 'success', duration = 3000) => {
        setFeedback({ message, type });
        setTimeout(() => setFeedback({ message: '', type: '' }), duration);
    };
    
    const handleInputChange = (field, value) => {
        setUserData(prev => ({ ...prev, [field]: value }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordInputs(prev => ({ ...prev, [name]: value }));
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

    // Save profile updates
    const handleProfileSave = async () => {
        let profileData = { 
            location: userData.location,
            bio: userData.bio
        };
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
            // Update the main userData state with the new values
            setUserData(prev => ({
                ...prev, 
                ...(profileData.avatar_url && { avatar_url: profileData.avatar_url })
            }));
            setAvatarFile(null);
            setIsEditing(false); // Exit edit mode
        } catch (error) {
            handleFeedback(error.message, 'error');
        }
    };

    // Cancel edit mode and revert changes
    const handleCancelEdit = () => {
        // Revert userData to original values by re-fetching
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
                console.error("Error reverting user data:", error);
            }
        };
        fetchUserData();
        setAvatarFile(null);
        setIsEditing(false);
    };
    
    // Change user password
    const handlePasswordSave = async (e) => {
        e.preventDefault();
        if (passwordInputs.new_password !== passwordInputs.confirm_password) {
            handleFeedback('New passwords do not match.', 'error');
            return;
        }
        try {
            const response = await fetch(`${rest_url}myddpc/v2/user/password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
                body: JSON.stringify({
                    current_password: passwordInputs.current_password,
                    new_password: passwordInputs.new_password,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            handleFeedback('Password changed successfully!');
            setPasswordInputs({ current_password: '', new_password: '', confirm_password: '' });
        } catch (error) {
            handleFeedback(error.message, 'error');
        }
    };

    // Format member since date
    const formatMemberSince = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long' 
        });
    };

    // Tab components
    const ProfileTab = () => (
        <div className="space-y-6">
            {/* Profile Header */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} className="text-red-600 hover:text-red-800">
                            <Edit3Icon className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-6 gap-6">
                    {/* Avatar Section - 1 column */}
                    <div className="col-span-1">
                        <div className="avatar-container">
                            <img 
                                src={userData.avatar_url || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23f3f4f6'/%3E%3Ctext x='40' y='40' font-family='Arial,sans-serif' font-size='24' fill='%23374151' text-anchor='middle' dominant-baseline='central'%3E${userData.username ? userData.username.charAt(0).toUpperCase() : 'U'}%3C/text%3E%3C/svg%3E`} 
                                alt="Avatar" 
                                className="w-20 h-20 rounded-full object-cover flex-shrink-0 border-2 border-white shadow-md"
                            />
                            {isEditing && (
                                <>
                                    <div className="avatar-overlay">
                                        <CameraIcon className="w-6 h-6 text-white" />
                                    </div>
                                    <input type="file" accept="image/*" onChange={handleAvatarFileChange} id="avatar-upload" className="hidden"/>
                                    <label htmlFor="avatar-upload" className="absolute inset-0 cursor-pointer rounded-full"></label>
                                </>
                            )}
                        </div>
                        {isEditing && avatarFile && (
                            <div className="avatar-actions">
                                <button 
                                    onClick={() => setAvatarFile(null)}
                                    className="px-3 py-1 text-xs text-red-600 hover:text-red-700"
                                >
                                    Remove
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {/* User Info Section - 5 columns */}
                    <div className="col-span-5 space-y-4">
                        {/* Username and Member Since Row */}
                        <div className="grid grid-cols-5 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Username</label>
                                <p className="mt-1 text-gray-800 font-medium text-lg">{userData.username}</p>
                            </div>
                            <div className="col-span-1"></div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Member Since</label>
                                <p className="mt-1 text-gray-800">{formatMemberSince(userData.member_since)}</p>
                            </div>
                        </div>
                        
                        {/* Location - 5 columns */}
                        <div>
                            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    id="location" 
                                    name="location" 
                                    value={userData.location || ''} 
                                    onChange={(e) => handleInputChange('location', e.target.value)}
                                    placeholder="City, State"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            ) : (
                                <p className="mt-1 text-gray-800">{userData.location || 'No location added yet.'}</p>
                            )}
                        </div>
                        
                        {/* Bio - 5 columns */}
                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-gray-700">Bio</label>
                            {isEditing ? (
                                <textarea 
                                    id="bio" 
                                    name="bio" 
                                    value={userData.bio || ''} 
                                    onChange={(e) => handleInputChange('bio', e.target.value)}
                                    placeholder="Tell us about your cars and builds..."
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
                                    rows="3"
                                />
                            ) : (
                                <p className="mt-1 text-gray-800">{userData.bio || 'No bio added yet.'}</p>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Edit Actions */}
                {isEditing && (
                    <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                        <button onClick={handleCancelEdit} className="bg-white hover:bg-gray-100 text-gray-800 px-4 py-2 rounded-lg border border-gray-300 font-medium">
                            Cancel
                        </button>
                        <button onClick={handleProfileSave} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium">
                            Save Changes
                        </button>
                    </div>
                )}
            </div>

            {/* Stats Dashboard */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Activity</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{stats.vehicles}</div>
                        <div className="text-sm text-gray-600">Vehicles in Garage</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{stats.modifications}</div>
                        <div className="text-sm text-gray-600">Modifications Logged</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{stats.serviceRecords}</div>
                        <div className="text-sm text-gray-600">Service Records</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{stats.milesTracked.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">Miles Tracked</div>
                    </div>
                </div>
            </div>

            {/* Garage Showcase */}
            {garageData.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">My Garage</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {garageData.map((vehicle, index) => {
                            // Get the best available image
                            const imageUrl = vehicle.custom_image_url || 
                                           vehicle.vehicle_data?.Image_URL || 
                                           vehicle.vehicle_data?.hero_image ||
                                           `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23f3f4f6'/%3E%3Ctext x='150' y='100' font-family='Arial,sans-serif' font-size='16' fill='%236b7280' text-anchor='middle' dominant-baseline='central'%3E${vehicle.Year || ''} ${vehicle.Make || ''} ${vehicle.Model || ''}%3C/text%3E%3C/svg%3E`;
                            
                            // Build YMMT string
                            const ymmt = [vehicle.Year, vehicle.Make, vehicle.Model, vehicle.Trim].filter(Boolean).join(' ');
                            
                            return (
                                <div 
                                    key={index} 
                                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => {
                                        // Navigate to garage and select this vehicle
                                        if (window.setSelectedVehicle && window.navigateToView) {
                                            window.setSelectedVehicle(vehicle);
                                            window.navigateToView('garage', 'vehicle-detail');
                                        }
                                    }}
                                >
                                    <div className="aspect-w-16 aspect-h-9 mb-3">
                                        <img 
                                            src={imageUrl}
                                            alt={vehicle.name || 'Vehicle'}
                                            className="w-full h-32 object-cover rounded"
                                            onError={(e) => {
                                                // Fallback to SVG placeholder if image fails to load
                                                e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23f3f4f6'/%3E%3Ctext x='150' y='100' font-family='Arial,sans-serif' font-size='16' fill='%236b7280' text-anchor='middle' dominant-baseline='central'%3E${vehicle.Year || ''} ${vehicle.Make || ''} ${vehicle.Model || ''}%3C/text%3E%3C/svg%3E`;
                                            }}
                                        />
                                    </div>
                                    <h4 className="font-medium text-gray-900 mb-1">{vehicle.name}</h4>
                                    <p className="text-sm text-gray-600">
                                        {ymmt}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );

    const AccountSettingsTab = () => (
        <div className="space-y-6">
            {/* Profile Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-500">Username</label>
                        <p className="mt-1 text-gray-800">{userData.username}</p>
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input 
                            type="email" 
                            id="email" 
                            name="email" 
                            value={userData.email || ''} 
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                            disabled
                        />
                        <p className="mt-1 text-sm text-gray-500">Contact support to change your email address</p>
                    </div>
                </div>
            </div>

            {/* Security */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Security</h3>
                <form onSubmit={handlePasswordSave} className="space-y-4">
                    <div>
                        <label htmlFor="current-password" className="block text-sm font-medium text-gray-700">Current Password</label>
                        <input type="password" id="current-password" name="current_password" value={passwordInputs.current_password} onChange={handlePasswordChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required/>
                    </div>
                    <div>
                        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">New Password</label>
                        <input type="password" id="new-password" name="new_password" value={passwordInputs.new_password} onChange={handlePasswordChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required/>
                    </div>
                    <div>
                        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                        <input type="password" id="confirm-password" name="confirm_password" value={passwordInputs.confirm_password} onChange={handlePasswordChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required/>
                    </div>
                    <div className="text-right">
                        <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium">
                            Update Password
                        </button>
                    </div>
                </form>
            </div>

            {/* Notification Preferences */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
                <div className="space-y-3">
                    <label className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-300 text-red-600 focus:ring-red-500" defaultChecked />
                        <span className="ml-2 text-sm text-gray-700">Email me when someone comments on my build</span>
                    </label>
                    <label className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-300 text-red-600 focus:ring-red-500" defaultChecked />
                        <span className="ml-2 text-sm text-gray-700">Email me when someone replies to my comment</span>
                    </label>
                    <label className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
                        <span className="ml-2 text-sm text-gray-700">Send me a weekly summary of popular builds</span>
                    </label>
                </div>
            </div>

            {/* Future Enhancements */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Future Enhancements</h3>
                <p className="text-gray-600">We're currently developing site themes and membership options. Stay tuned for exciting new features!</p>
            </div>
        </div>
    );

    const NotificationsTab = () => (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                </div>
                <p className="text-gray-500">No recent activity to show</p>
                <p className="text-sm text-gray-400 mt-1">Activity feed coming soon!</p>
            </div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            {feedback.message && (
                <div className={`p-4 rounded-md mb-6 ${feedback.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {feedback.message}
                </div>
            )}
            
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
                <p className="text-gray-600 mt-2">Manage your profile, settings, and preferences</p>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { id: 'profile', label: 'Profile', icon: 'User' },
                        { id: 'settings', label: 'Account Settings', icon: 'Settings' },
                        { id: 'notifications', label: 'Notifications', icon: 'Bell' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                                activeTab === tab.id
                                    ? 'border-red-500 text-red-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <Icon name={tab.icon} className="w-4 h-4" />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'settings' && <AccountSettingsTab />}
            {activeTab === 'notifications' && <NotificationsTab />}
        </div>
    );
};

const MyAccountView = () => {
    return <MyAccount />;
};

// 1. Add VehicleProfileView component
const VehicleProfileView = ({ vehicleId, onBack, year, make, model, trim, setVehicleToAddToGarage }) => {
    const [vehicle, setVehicle] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [activeTab, setActiveTab] = React.useState('performance');
    const [communityBuilds, setCommunityBuilds] = React.useState(null);
    const [communityLoading, setCommunityLoading] = React.useState(false);
    const [modelTrims, setModelTrims] = React.useState(null);
    const [selectedTrimId, setSelectedTrimId] = React.useState(vehicleId);
    const [currentVehicleData, setCurrentVehicleData] = React.useState(null);
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

    // Fetch initial vehicle data
    React.useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);
        setVehicle(null);
        setCommunityBuilds(null);
        
        if (!vehicleId) return;
        
        // Fetch the initial vehicle data
        const fetchVehicleData = async () => {
            try {
                const fetchUrl = `${rest_url}myddpc/v2/vehicle/full_data?id=${vehicleId}`;
                const response = await fetch(fetchUrl, { headers: { 'X-WP-Nonce': nonce } });
                if (!response.ok) throw new Error('Failed to fetch vehicle details');
                const data = await response.json();
                
                if (isMounted) {
                    setVehicle(data);
                    setCurrentVehicleData(data);
                    setLoading(false);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err);
                    setLoading(false);
                }
            }
        };
        
        fetchVehicleData();
        return () => { isMounted = false; };
    }, [vehicleId, rest_url, nonce]);

    // Fetch model trims when vehicle data is available
    React.useEffect(() => {
        if (!vehicle || !vehicle.at_a_glance) return;
        
        const fetchModelTrims = async () => {
            try {
                const year = vehicle.at_a_glance.title.split(' ')[0];
                const make = vehicle.at_a_glance.title.split(' ')[1];
                const model = vehicle.at_a_glance.title.split(' ').slice(2).join(' ');
                
                if (!year || !make || !model) return;
                
                const fetchUrl = `${rest_url}myddpc/v2/discover/model_trims?year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`;
                const response = await fetch(fetchUrl, { headers: { 'X-WP-Nonce': nonce } });
                
                if (response.ok) {
                    const data = await response.json();
                    setModelTrims(data);
                }
            } catch (err) {
                console.error('Error fetching model trims:', err);
            }
        };
        
        fetchModelTrims();
    }, [vehicle, rest_url, nonce]);

    // Handle trim selection
    const handleTrimChange = async (trimId) => {
        if (!modelTrims || !modelTrims.trims) return;
        
        const selectedTrim = modelTrims.trims.find(trim => trim.ID == trimId);
        if (!selectedTrim) return;
        
        setSelectedTrimId(trimId);
        
        // Fetch full data for the selected trim
        try {
            const fetchUrl = `${rest_url}myddpc/v2/vehicle/full_data?id=${trimId}`;
            const response = await fetch(fetchUrl, { headers: { 'X-WP-Nonce': nonce } });
            if (response.ok) {
                const data = await response.json();
                setCurrentVehicleData(data);
            }
        } catch (err) {
            console.error('Error fetching trim data:', err);
        }
    };

    // Fetch community builds
    React.useEffect(() => {
        if (!vehicleId) return;
        
        let isMounted = true;
        setCommunityLoading(true);
        
        fetch(`${rest_url}myddpc/v2/community/builds/${vehicleId}`, { 
            headers: { 'X-WP-Nonce': nonce } 
        })
            .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch community builds'))
            .then(data => { 
                if (isMounted) { 
                    setCommunityBuilds(data); 
                    setCommunityLoading(false); 
                } 
            })
            .catch(err => { 
                if (isMounted) { 
                    console.error('Error fetching community builds:', err);
                    setCommunityLoading(false); 
                } 
            });
            
        return () => { isMounted = false; };
    }, [vehicleId, rest_url, nonce]);

    if (!vehicleId) return null;
    if (loading) return <div className="text-center p-12">Loading vehicle details...</div>;
    if (error || !vehicle) return <div className="text-center p-12 text-red-600">Error loading vehicle details.</div>;

    // Use current vehicle data for display (selected trim)
    const displayData = currentVehicleData || vehicle;

    // --- Visual-first layout ---
    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button onClick={onBack} className="mb-4 text-sm text-red-600 font-medium">&larr; Back</button>
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Left: Hero Image */}
                    <div className="flex-1 flex items-center justify-center mb-6 md:mb-0" style={{ minWidth: 0 }}>
                        <img src={getFirstImageUrl(displayData)} alt="Vehicle" className="w-full max-w-md h-auto object-cover rounded-lg shadow" />
                    </div>
                    {/* Right: Info */}
                    <div className="flex-1 flex flex-col gap-4 min-w-0">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-1">{displayData.at_a_glance?.title || ''}</h1>
                            <h2 className="text-lg text-gray-600 mb-2">{displayData.at_a_glance?.trim_desc || ''}</h2>
                            
                            {/* Trim Selector */}
                            {modelTrims && modelTrims.trims && modelTrims.trims.length > 1 && (
                                <div className="mt-3">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Select Trim ({modelTrims.trims.length} available)
                                    </label>
                                    <select 
                                        value={selectedTrimId} 
                                        onChange={(e) => handleTrimChange(e.target.value)}
                                        className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                                    >
                                        {modelTrims.trims.map(trim => (
                                            <option key={trim.ID} value={trim.ID}>
                                                {trim.Trim} - {trim['Horsepower (HP)']} HP
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        

                        {/* Key Specs */}
                        <div className="flex gap-4 mb-2">
                            <div className="spec-item flex items-center gap-2 bg-gray-50 px-3 py-2 rounded border"><span>{ICONS.horsepower}</span><span className="font-bold text-lg">{displayData.at_a_glance?.horsepower || 'N/A'}</span><span className="text-xs ml-1">HP</span></div>
                            <div className="spec-item flex items-center gap-2 bg-gray-50 px-3 py-2 rounded border"><span>{ICONS.torque}</span><span className="font-bold text-lg">{displayData.at_a_glance?.torque || 'N/A'}</span><span className="text-xs ml-1">ft-lbs</span></div>
                            <div className="spec-item flex items-center gap-2 bg-gray-50 px-3 py-2 rounded border"><span>{ICONS.mpg}</span><span className="font-bold text-lg">{displayData.at_a_glance?.combined_mpg || 'N/A'}</span><span className="text-xs ml-1">MPG</span></div>
                        </div>
                        {/* Drivetrain */}
                        <div className="flex gap-3 mb-2">
                            <div className="drivetrain-item flex items-center gap-2 bg-gray-100 px-3 py-1 rounded border">
                                {(() => {
                                    const drive = (displayData.at_a_glance?.drive_type || '').toLowerCase();
                                    if (drive.includes('rear')) return ICONS.rwd;
                                    if (drive.includes('front')) return ICONS.fwd;
                                    if (drive.includes('all')) return ICONS.awd;
                                    return null;
                                })()}
                                <span>{displayData.at_a_glance?.drive_type || 'N/A'}</span>
                            </div>
                            <div className="drivetrain-item flex items-center gap-2 bg-gray-100 px-3 py-1 rounded border">
                                {ICONS.transmission}
                                <span>{displayData.at_a_glance?.transmission || 'N/A'}</span>
                            </div>
                        </div>
                        {/* Color Swatches */}
                        <div className="color-swatches mb-2">
                            <div className="mb-1 text-sm font-medium">Exterior Colors</div>
                            <div className="flex gap-2 flex-wrap mb-2">
                                {parseColors(displayData.at_a_glance?.colors_exterior).length === 0 ? <span className="text-xs text-gray-400">N/A</span> :
                                    parseColors(displayData.at_a_glance?.colors_exterior).map((color, idx) => (
                                        <div key={idx} className="color-swatch" style={{ backgroundColor: `rgb(${color.rgb})` }} title={color.name}></div>
                                    ))}
                            </div>
                            <div className="mb-1 text-sm font-medium">Interior Colors</div>
                            <div className="flex gap-2 flex-wrap">
                                {parseColors(displayData.at_a_glance?.colors_interior).length === 0 ? <span className="text-xs text-gray-400">N/A</span> :
                                    parseColors(displayData.at_a_glance?.colors_interior).map((color, idx) => (
                                        <div key={idx} className="color-swatch" style={{ backgroundColor: `rgb(${color.rgb})` }} title={color.name}></div>
                                    ))}
                            </div>
                        </div>
                        {/* Pros/Cons */}
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="pros bg-green-50 border-l-4 border-green-500 rounded p-3">
                                <div className="flex items-center gap-2 mb-1 text-green-700 font-semibold"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-thumbs-up"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> The Good</div>
                                <div className="text-sm text-gray-700 whitespace-pre-line">{(displayData.at_a_glance?.pros || '').replace(/;+\s*$/, '') || 'N/A'}</div>
                            </div>
                            <div className="cons bg-red-50 border-l-4 border-red-500 rounded p-3">
                                <div className="flex items-center gap-2 mb-1 text-red-700 font-semibold"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-thumbs-down"><path d="M10 15v-5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> The Bad</div>
                                <div className="text-sm text-gray-700 whitespace-pre-line">{(displayData.at_a_glance?.cons || '').replace(/;+\s*$/, '') || 'N/A'}</div>
                            </div>
                        </div>
                        
                        {/* Save Vehicle Button */}
                        {setVehicleToAddToGarage && (
                            <div className="mt-6">
                                <button 
                                    onClick={async () => {
                                        try {
                                            // Save the base model (without specific trim) to saved vehicles
                                            const baseVehicle = {
                                                ...vehicle,
                                                ID: vehicleId, // Use the original vehicle ID (base model)
                                                Year: vehicle.at_a_glance?.title?.split(' ')[0],
                                                Make: vehicle.at_a_glance?.title?.split(' ')[1],
                                                Model: vehicle.at_a_glance?.title?.split(' ').slice(2).join(' '),
                                                Trim: vehicle.at_a_glance?.trim_desc // Use the original trim (base model)
                                            };
                                            
                                            // Save to saved vehicles list instead of garage
                                            const response = await fetch(`${rest_url}myddpc/v2/saved`, {
                                                method: 'POST',
                                                headers: { 
                                                    'Content-Type': 'application/json', 
                                                    'X-WP-Nonce': nonce 
                                                },
                                                body: JSON.stringify({ vehicle_id: vehicleId })
                                            });
                                            
                                            if (!response.ok) {
                                                const error = await response.json();
                                                throw new Error(error.message || 'Failed to save vehicle');
                                            }
                                            
                                            // Show success feedback
                                            alert('Vehicle saved to your list!');
                                        } catch (err) {
                                            alert(err.message);
                                        }
                                    }}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold text-lg transition-colors"
                                >
                                    + Save Vehicle
                                </button>
                            </div>
                        )}
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
                            <SpecTable data={displayData.performance} section={null} />
                        </div>
                    )}
                    {activeTab === 'dimensions' && (
                        <div id="tab-dimensions" className="tab-content active">
                            <div className="blueprint-graphic-placeholder text-center mb-4">
                                <svg width="220" height="80" viewBox="0 0 220 80" style={{ opacity: 0.2 }}><rect x="10" y="30" width="200" height="30" rx="10" fill="#888" /><rect x="60" y="10" width="100" height="20" rx="8" fill="#888" /></svg>
                                <div className="text-xs text-gray-500">Vehicle dimensions (side/top profile)</div>
                            </div>
                            <SpecTable data={displayData.dimensions} section={null} />
                        </div>
                    )}
                    {activeTab === 'features' && (
                        <div id="tab-features" className="tab-content active">
                            <SpecTable data={displayData.features} section={null} />
                        </div>
                    )}
                    {activeTab === 'ownership' && (
                        <div id="tab-ownership" className="tab-content active">
                            <SpecTable data={displayData.ownership} section={null} />
                        </div>
                    )}
                </div>
                
                {/* Community Bridge Section */}
                {communityLoading ? (
                    <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                            <p className="mt-2 text-gray-600">Loading community builds...</p>
                        </div>
                    </div>
                ) : communityBuilds && communityBuilds.has_builds ? (
                    <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-1">Community Builds</h3>
                                <p className="text-gray-600">
                                    {communityBuilds.build_count} community member{communityBuilds.build_count !== 1 ? 's' : ''} have built this vehicle
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Icon name="Users" className="w-5 h-5 text-gray-400" />
                                <span className="text-sm text-gray-500">Community</span>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            {communityBuilds.builds.map((buildData, index) => (
                                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h4 className="font-semibold text-gray-900">
                                                {buildData.garage_vehicle.nickname}
                                            </h4>
                                            <p className="text-sm text-gray-600">
                                                Built by {buildData.garage_vehicle.owner_name}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-medium text-gray-900">
                                                {buildData.garage_vehicle.completed_builds} completed
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {buildData.garage_vehicle.total_builds} total builds
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        {buildData.builds.slice(0, 3).map((build, buildIndex) => (
                                            <div key={buildIndex} className="flex items-center justify-between bg-white rounded-md p-3 border border-gray-100">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${
                                                        build.status === 'complete' ? 'bg-green-500' : 
                                                        build.status === 'in_progress' ? 'bg-yellow-500' : 'bg-gray-400'
                                                    }`}></div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">{build.title}</div>
                                                        <div className="text-xs text-gray-500 capitalize">
                                                            {build.type.replace(/_/g, ' ')}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {build.installation_date ? 
                                                        new Date(build.installation_date).toLocaleDateString() : 
                                                        'Planned'
                                                    }
                                                </div>
                                            </div>
                                        ))}
                                        {buildData.builds.length > 3 && (
                                            <div className="text-center pt-2">
                                                <span className="text-sm text-gray-500">
                                                    +{buildData.builds.length - 3} more builds
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-start gap-3">
                                <Icon name="Info" className="w-5 h-5 text-blue-600 mt-0.5" />
                                <div>
                                    <h4 className="font-medium text-blue-900 mb-1">Join the Community</h4>
                                    <p className="text-sm text-blue-700">
                                        Add this vehicle to your garage and start sharing your own builds with the community!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : communityBuilds && !communityBuilds.has_builds ? (
                    <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
                        <div className="text-center">
                            <Icon name="Users" className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Community Builds Yet</h3>
                            <p className="text-gray-600 mb-4">
                                Be the first to add this vehicle to your garage and start building!
                            </p>
                            <button 
                                onClick={() => {
                                    // This would typically open the add to garage modal
                                    // For now, we'll just show a message
                                    alert('Add to garage functionality would be triggered here');
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-colors"
                            >
                                Add to My Garage
                            </button>
                        </div>
                    </div>
                ) : null}
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
    const [activeView, setActiveView] = useState('discover');
    const [garageView, setGarageView] = useState('overview');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // This state is crucial
    const [isAuthModalOpen, setAuthModalOpen] = useState(false);
    const [vehicleToAddToGarage, setVehicleToAddToGarage] = useState(null);
    const [vehicleProfileId, setVehicleProfileId] = useState(null);
    const [fromView, setFromView] = useState('discover');
    const [showGarageBenefits, setShowGarageBenefits] = useState(false);
    const [prevView, setPrevView] = useState(null);
    const [prevGarageView, setPrevGarageView] = useState(null);
    const { isAuthenticated = false, user, logout } = useAuth() || {};
    const safeIsAuthenticated = typeof isAuthenticated === 'boolean' ? isAuthenticated : false;
    const { fetchGarageVehicles, setSelectedVehicle } = useVehicles();
    const prevAuthRef = React.useRef(safeIsAuthenticated);

    // Enhanced history management
    useEffect(() => {
        const handlePopState = (event) => {
            if (event.state) {
                setActiveView(event.state.activeView || (safeIsAuthenticated ? 'garage' : 'discover'));
                setGarageView(event.state.garageView || 'overview');
                // Restore fromView if it exists in the state
                if (event.state.fromView) {
                    setFromView(event.state.fromView);
                }
            } else {
                if (safeIsAuthenticated) {
                    setActiveView('garage');
                    setGarageView('overview');
                } else {
                    setActiveView('discover');
                    setGarageView('overview');
                }
            }
        };
        window.history.replaceState({ 
            activeView: safeIsAuthenticated ? 'garage' : 'discover', 
            garageView: 'overview',
            fromView: 'discover'
        }, '');
        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [safeIsAuthenticated]);

    // Function to update browser history when navigation occurs
    const updateHistory = (newActiveView, newGarageView = 'overview') => {
        const state = { 
            activeView: newActiveView, 
            garageView: newGarageView,
            fromView: fromView // Include the current fromView in history state
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
    // Enhanced setGarageView that updates history
    const navigateToGarageView = (garageViewId) => {
        setGarageView(garageViewId);
        updateHistory('garage', garageViewId);
    };

    useEffect(() => {
        if (safeIsAuthenticated) {
            fetchGarageVehicles();
        }
    }, [safeIsAuthenticated, fetchGarageVehicles]);

    // Debug activeView changes
    useEffect(() => {
        console.log('App: activeView changed to:', activeView);
    }, [activeView]);

    const requireAuth = (callback) => {
        if (safeIsAuthenticated) {
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
    const navigationItems = [
        { id: 'discover', label: 'Discover', icon: 'Search' },
        { id: 'compare', label: 'Compare', icon: 'Columns' },
        { id: 'saved', label: 'Saved Vehicles', icon: 'Bookmark', auth: true },
        { id: 'garage', label: 'Garage', icon: 'Garage', auth: true },
    ];

    const handleNavClick = (viewId) => {
        console.log('handleNavClick called with:', viewId, 'current activeView:', activeView);
        if (navigationItems.find(item => item.id === viewId)?.auth) {
            if (!safeIsAuthenticated) {
                setPrevView(activeView);
                setPrevGarageView(garageView);
                setShowGarageBenefits(true);
                setActiveView(viewId); // still set for UI highlight
                setMobileMenuOpen(false);
                return;
            }
            requireAuth(() => {
                setActiveView(viewId);
                setMobileMenuOpen(false);
            });
        } else {
            setShowGarageBenefits(false);
            setActiveView(viewId);
            setMobileMenuOpen(false);
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
                        <button onClick={() => { console.log('My Account clicked'); navigateToView('account'); setDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">My Account</button>
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

    // Helper to open register modal
    const openRegisterModal = () => {
        setAuthModalOpen(true);
        setTimeout(() => {
            const regTab = document.querySelector('[data-tab="register"]');
            if (regTab) regTab.click();
        }, 100);
    };

    // Intercept compare upgrade link for guests
    const handleCompareUpgradeClick = (e) => {
        e.preventDefault();
        setPrevView(activeView);
        setPrevGarageView(garageView);
        setShowGarageBenefits(true);
        setActiveView('compare');
    };

    // Handler to restore previous view after registration
    const handleRegisterSuccess = () => {
        setShowGarageBenefits(false);
        if (prevView === 'garage') {
            setActiveView('garage');
            setGarageView(prevGarageView || 'overview');
        } else if (prevView) {
            setActiveView(prevView);
        } else {
            setActiveView('garage');
            setGarageView('overview');
        }
    };

    // Redirect to garage only immediately after login
    useEffect(() => {
        if (!prevAuthRef.current && safeIsAuthenticated) {
            setActiveView('garage');
            setGarageView('overview');
            window.history.replaceState({ activeView: 'garage', garageView: 'overview' }, '');
        }
        prevAuthRef.current = safeIsAuthenticated;
    }, [safeIsAuthenticated]);

    // Expose navigation functions globally for MyAccount component
    useEffect(() => {
        window.setActiveView = setActiveView;
        window.setGarageView = setGarageView;
        window.setSelectedVehicle = setSelectedVehicle;
        window.navigateToView = navigateToView;
        window.navigateToGarageView = navigateToGarageView;
        
        return () => {
            delete window.setActiveView;
            delete window.setGarageView;
            delete window.setSelectedVehicle;
            delete window.navigateToView;
            delete window.navigateToGarageView;
        };
    }, [setActiveView, setGarageView, setSelectedVehicle, navigateToView, navigateToGarageView]);

    // This is the new return statement for the App component
    return (
        <UserListsProvider isAuthenticated={safeIsAuthenticated}>
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
                                {safeIsAuthenticated ? <UserProfile /> : (
                                    <button onClick={() => setAuthModalOpen(true)} className="text-sm font-medium text-gray-600 hover:text-gray-900 flex-shrink-0">Login</button>
                                )}
                            </div>
                        </div>
                    </div>
                </header>
                <main className="flex-grow bg-gray-50">
                    {showGarageBenefits ? (
                        <GarageBenefitsScreen onCreateAccount={openRegisterModal} onRegisterSuccess={handleRegisterSuccess} />
                    ) : (
                        <>
                            {activeView === 'discover' && <DiscoverView setActiveView={navigateToView} requireAuth={requireAuth} setVehicleProfileId={setVehicleProfileId} setFromView={setFromView} />}
                            {activeView === 'saved' && <SavedVehiclesView requireAuth={requireAuth} setActiveView={navigateToView} setVehicleProfileId={setVehicleProfileId} setFromView={setFromView} setSelectedVehicle={setSelectedVehicle} setGarageView={navigateToGarageView} />}
                            {activeView === 'compare' && <CompareView setActiveView={navigateToView} setVehicleProfileId={setVehicleProfileId} setFromView={setFromView} onUpgradeClick={handleCompareUpgradeClick} />}
                            {activeView === 'account' && (() => { console.log('Rendering MyAccountView'); return <MyAccountView />; })()}
                            {activeView === 'vehicle-profile' && <VehicleProfileView vehicleId={vehicleProfileId} onBack={() => navigateToView(fromView || 'discover')} setVehicleToAddToGarage={setVehicleToAddToGarage} />}
                            {activeView === 'garage' && (
                                <>
                                    {garageView === 'overview' && <GarageOverview setActiveView={navigateToView} setGarageView={navigateToGarageView} requireAuth={requireAuth} />}
                                    {garageView === 'vehicle-detail' && <VehicleDetailView setGarageView={navigateToGarageView} />}
                                    {garageView === 'mobile-work' && <MobileWorkInterface setGarageView={navigateToGarageView} />}
                                </>
                            )}
                        </>
                    )}
                </main>
            </div>
        </UserListsProvider>
    );
} // <-- This should be the only closing brace for App

//================================================================================
// 5. FINAL RENDER CALLS
//================================================================================

// Mount the main App
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

// Shared VehicleRow component (move this above DiscoverView and SavedVehiclesView)
const VehicleRow = ({ vehicle, onRowClick, actionButtons, isSelected }) => (
  <div
    className={`discover-result-item border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-all cursor-pointer ${isSelected ? 'ring-2 ring-red-400' : ''}`}
    tabIndex={0}
    onClick={onRowClick}
    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(); } }}
    aria-selected={isSelected}
    role="button"
  >
    <div className="discover-result-item-content flex items-start justify-between">
      <div className="discover-result-item-info flex-1">
        <h4 className="text-lg font-medium text-gray-900 mb-2">{`${vehicle.Year || vehicle.year} ${vehicle.Make || vehicle.make} ${vehicle.Model || vehicle.model} ${vehicle.Trim || vehicle.trim}`}</h4>
        <div className="details-grid grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm text-gray-600">
          <div><span className="font-medium">Engine:</span> {vehicle['Engine size (l)'] || vehicle.engine_size}L {vehicle.Cylinders || vehicle.cylinders}-cyl</div>
          <div><span className="font-medium">Power:</span> {vehicle['Horsepower (HP)'] || vehicle.horsepower} HP</div>
          <div><span className="font-medium">Weight:</span> {vehicle['Curb weight (lbs)'] || vehicle.weight} lbs</div>
          {vehicle['Drive type'] && <div><span className="font-medium">Drive:</span> {vehicle['Drive type']}</div>}
        </div>
      </div>
      <div className="discover-result-item-buttons flex items-center space-x-2 ml-4">
        {actionButtons}
      </div>
    </div>
  </div>
);

// GarageBenefitsScreen: shown to guests when accessing garage, saved, or compare upgrade link
const GarageBenefitsScreen = ({ onCreateAccount, onRegisterSuccess }) => {
  const [email, setEmail] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  // Registration logic (calls backend)
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch(window.myddpcAppData.rest_url + 'myddpc/v2/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.myddpcAppData.nonce },
        body: JSON.stringify({ email, username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed.');
      setSuccess(true);
      setTimeout(() => {
        if (onRegisterSuccess) onRegisterSuccess();
      }, 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-center min-h-[70vh] p-8 gap-8 bg-white rounded-lg shadow-md max-w-4xl mx-auto">
      {/* Left column: image + features */}
      <div className="flex-1 flex flex-col items-center md:items-start text-left mb-8 md:mb-0">
        <h2 className="text-3xl font-bold mb-6 text-gray-900 text-left">Build, Track, and Showcase Your Ultimate Project Car.</h2>
        <div className="w-full flex justify-center md:justify-start mb-6">
          {/* Placeholder image (replace with garage screenshot later) */}
          <div className="w-64 h-40 bg-gray-200 rounded-lg flex items-center justify-center border border-gray-300">
            <span className="text-gray-400 text-lg">[Garage Screenshot]</span>
          </div>
        </div>
        <ul className="space-y-4 text-gray-700 text-base max-w-md">
          <li><span className="font-semibold text-red-700">Document Every Mod:</span> Create a definitive build sheet for your project. Never lose track of a part number or install date again.</li>
          <li><span className="font-semibold text-red-700">Visualize Your Investment:</span> Track every dollar spent to understand the true value of your build.</li>
          <li><span className="font-semibold text-red-700">Master Your Maintenance:</span> Log all service records to stay ahead of your car's needs.</li>
          <li><span className="font-semibold text-red-700">Compare Builds Side-by-Side:</span> Analyze your setup against others in the community to find your next competitive edge.</li>
          <li><span className="font-semibold text-red-700">Your Garage, Anywhere:</span> Access your complete build history from your phone at the track or in the garage.</li>
        </ul>
      </div>
      {/* Right column: registration form */}
      <form className="flex-1 bg-gray-50 rounded-lg shadow p-8 flex flex-col items-center min-w-[320px] max-w-sm w-full" onSubmit={handleRegister}>
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Create Your Account</h3>
        <input
          type="email"
          className="mb-3 w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-400"
          placeholder="Email Address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="text"
          className="mb-3 w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-400"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          className="mb-4 w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-400"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold text-lg transition-colors mb-2"
          disabled={loading}
        >
          {loading ? 'Creating Account...' : 'Create My Free Garage'}
        </button>
        <div className="text-xs text-gray-500 text-center mt-2">
          We respect your privacy. We will never share your email address or personal information.
        </div>
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        {success && <div className="text-green-600 text-sm mb-2">Account created! Redirecting...</div>}
      </form>
    </div>
  );
};

//================================================================================
// VIEW TOGGLE SYSTEM COMPONENTS
//================================================================================

// ViewToggle Component
const ViewToggle = ({ currentView, onViewChange }) => {
    return (
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
                onClick={() => onViewChange('gallery')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'gallery'
                        ? 'bg-white text-red-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Gallery View"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span className="hidden sm:inline">Gallery</span>
            </button>
            <button
                onClick={() => onViewChange('list')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'list'
                        ? 'bg-white text-red-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                }`}
                title="List View"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span className="hidden sm:inline">List</span>
            </button>
        </div>
    );
};

// VehicleCardGallery Component - Visual card layout
const VehicleCardGallery = ({ vehicle, onCardClick, onSaveVehicle, onAddToCompare, isVehicleSaved, isVehicleCompared, removeFromCompare, compareVehicles, setVehicleProfileId, setActiveView, setFromView }) => {
    const { rest_url, nonce } = window.myddpcAppData || {};
    
    // Handle grouped vehicle data (with trim metadata)
    const hasGroupMetadata = vehicle._group_metadata;
    const vehicleName = hasGroupMetadata 
        ? `${vehicle.Year} ${vehicle.Make} ${vehicle.Model}`
        : `${vehicle.Year || vehicle.year} ${vehicle.Make || vehicle.make} ${vehicle.Model || vehicle.model} ${vehicle.Trim || vehicle.trim}`;
    
    // State for trim selection within the card
    const [selectedTrimId, setSelectedTrimId] = React.useState(vehicle.ID);
    const [modelTrims, setModelTrims] = React.useState(null);
    const [currentVehicleData, setCurrentVehicleData] = React.useState(vehicle);
    
    // Fetch trims for this model when card loads
    React.useEffect(() => {
        const fetchModelTrims = async () => {
            try {
                const year = vehicle.Year || vehicle.year;
                const make = vehicle.Make || vehicle.make;
                const model = vehicle.Model || vehicle.model;
                
                if (!year || !make || !model) return;
                
                const fetchUrl = `${rest_url}myddpc/v2/discover/model_trims?year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`;
                const response = await fetch(fetchUrl, { headers: { 'X-WP-Nonce': nonce } });
                
                if (response.ok) {
                    const data = await response.json();
                    setModelTrims(data);
                    
                    // Set the first trim as default if we have trims
                    if (data.trims && data.trims.length > 0) {
                        setSelectedTrimId(data.trims[0].ID);
                        setCurrentVehicleData(data.trims[0]);
                    }
                }
            } catch (err) {
                console.error('Error fetching model trims:', err);
            }
        };
        
        fetchModelTrims();
    }, [vehicle, rest_url, nonce]);
    
    // Handle trim selection
    const handleTrimChange = (trimId, e) => {
        e.stopPropagation(); // Prevent card click
        if (!modelTrims || !modelTrims.trims) return;
        
        const selectedTrim = modelTrims.trims.find(trim => trim.ID == trimId);
        if (!selectedTrim) return;
        
        setSelectedTrimId(trimId);
        setCurrentVehicleData(selectedTrim);
    };
    
    // Use current vehicle data for display
    const displayVehicle = currentVehicleData || vehicle;
    
    return (
        <div 
            className="vehicle-discovery-card bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
            onClick={(e) => {
                // Don't navigate if clicking on the dropdown or buttons
                if (e.target.closest('select') || e.target.closest('button')) return;
                setVehicleProfileId(selectedTrimId); 
                setActiveView('vehicle-profile'); 
                setFromView('discover'); 
            }}
        >
            {/* Hero Image Container - Largest element for visual impact */}
            <div className="vehicle-card-image-container relative h-56 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                <img 
                    src={getFirstImageUrl(displayVehicle)} 
                    alt={vehicleName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                    }}
                />
                <div className="vehicle-placeholder absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200" style={{ display: 'none' }}>
                    <div className="text-center">
                        <Icon name="Car" className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm font-medium">Image coming soon</p>
                    </div>
                </div>
                
                {/* Quick action overlay on hover */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="bg-white rounded-lg px-4 py-2 shadow-lg">
                        <span className="text-sm font-medium text-gray-900">View Details</span>
                    </div>
                </div>
            </div>
            
            {/* Vehicle Information */}
            <div className="p-5">
                {/* Vehicle Title */}
                <h3 className="vehicle-card-title text-xl font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight">
                    {vehicleName}
                </h3>
                
                {/* Trim Selector Dropdown */}
                {(modelTrims && modelTrims.trims && modelTrims.trims.length > 1) || (hasGroupMetadata && hasGroupMetadata.trim_count > 1) ? (
                    <div className="mb-3">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Select Trim {hasGroupMetadata && hasGroupMetadata.trim_count > 1 && `(${hasGroupMetadata.trim_count} available)`}
                        </label>
                        <select 
                            value={selectedTrimId} 
                            onChange={(e) => handleTrimChange(e.target.value, e)}
                            className="w-full rounded-lg border border-gray-300 px-2 py-1 text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-colors"
                        >
                            {modelTrims && modelTrims.trims ? (
                                modelTrims.trims.map(trim => (
                                    <option key={trim.ID} value={trim.ID}>
                                        {trim.Trim} - {trim['Horsepower (HP)']} HP
                                    </option>
                                ))
                            ) : (
                                <option value={vehicle.ID}>
                                    {vehicle.Trim} - {vehicle['Horsepower (HP)']} HP
                                </option>
                            )}
                        </select>
                    </div>
                ) : null}
                
                {/* Key Specifications Grid */}
                <div className="vehicle-card-specs grid grid-cols-2 gap-3 mb-5">
                    <div className="spec-item bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Power</div>
                        <div className="font-bold text-gray-900">
                            {displayVehicle['Horsepower (HP)'] || displayVehicle.horsepower || 'N/A'} <span className="text-sm font-normal">HP</span>
                        </div>
                    </div>
                    <div className="spec-item bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Engine</div>
                        <div className="font-bold text-gray-900">
                            {displayVehicle['Engine size (l)'] || displayVehicle.engine_size || 'N/A'}L <span className="text-sm font-normal">{displayVehicle.Cylinders || displayVehicle.cylinders || 'N/A'}-cyl</span>
                        </div>
                    </div>
                    <div className="spec-item bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Weight</div>
                        <div className="font-bold text-gray-900">
                            {displayVehicle['Curb weight (lbs)'] ? Math.round(displayVehicle['Curb weight (lbs)']).toLocaleString() : displayVehicle.weight || 'N/A'} <span className="text-sm font-normal">lbs</span>
                        </div>
                    </div>
                    {displayVehicle['Drive type'] && (
                        <div className="spec-item bg-gray-50 rounded-lg p-3">
                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Drive</div>
                            <div className="font-bold text-gray-900">
                                {displayVehicle['Drive type'].toUpperCase().includes('ALL WHEEL') ? 'AWD' : 
                                 displayVehicle['Drive type'].toUpperCase().includes('FRONT WHEEL') ? 'FWD' : 
                                 displayVehicle['Drive type'].toUpperCase().includes('FOUR WHEEL') ? '4WD' : 
                                 displayVehicle['Drive type'].toUpperCase().includes('REAR WHEEL') ? 'RWD' : 
                                 displayVehicle['Drive type']}
                            </div>
                        </div>
                    )}
                </div>
                {/* Action Bar - Clear, prominent buttons */}
                <div className="vehicle-card-actions flex gap-2">
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            // Save the base model (without specific trim) to saved vehicles
                            const baseVehicle = {
                                ...displayVehicle,
                                ID: vehicle.ID, // Use the original vehicle ID (base model)
                                Trim: vehicle.Trim // Use the original trim (base model)
                            };
                            onSaveVehicle(baseVehicle); 
                        }}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Save Vehicle
                    </button>
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            if (isVehicleCompared(displayVehicle.ID)) {
                                removeFromCompare(compareVehicles.findIndex(v => v && v.ID === displayVehicle.ID));
                            } else {
                                onAddToCompare(displayVehicle); 
                            }
                        }}
                        className={`flex-1 px-4 py-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                            isVehicleCompared(displayVehicle.ID) 
                                ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                        title={isVehicleCompared(displayVehicle.ID) ? 'Remove from Head-to-Head' : 'Add to Head-to-Head'}
                    >
                        <Icon name="Columns" className="w-4 h-4" />
                        <span className="hidden sm:inline">Head-to-Head</span>
                        <span className="sm:hidden">Compare</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
