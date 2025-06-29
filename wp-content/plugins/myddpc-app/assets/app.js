const { useState, useEffect, createContext, useContext } = React;

// Since we can't import lucide-react, we create simple placeholder icons.
const Icon = ({ name, className }) => <div className={`icon-placeholder ${className}`}>{name.charAt(0)}</div>;

//================================================================================
// 1. CONTEXT FOR STATE MANAGEMENT
//================================================================================
const VehicleContext = createContext();

const VehicleProvider = ({ children }) => {
  const [vehicles, setVehicles] = useState([]);
  const [discoveryResults, setDiscoveryResults] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [compareVehicles, setCompareVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // This check prevents the app from crashing if the data object isn't ready yet.
  const { rest_url, nonce } = window.myddpcAppData || {};

  const fetchGarageVehicles = () => {
     // NOTE: We need a new REST endpoint to get user-specific garage vehicles.
     // For now, this uses mock data for your Audi and BMW.
     const mockVehicles = [
        { id: 1, name: 'Daily Beast', year: 2014, make: 'Audi', model: 'S6', trim: 'Prestige', type: 'Daily Driver', mileage: 95420, lastService: '2024-05-15', nextService: '2024-08-15', totalInvested: 12500, modifications: 12, status: 'operational', buildProgress: 85, engine: '4.0L V8 Turbo', horsepower: 420, torque: 406, recentWork: [{ date: '2024-05-10', type: 'Performance', item: 'ECU Tune', cost: 1200, status: 'completed' }] },
        { id: 2, name: 'Track Weapon', year: 1999, make: 'BMW', model: 'Z3 Coupe', trim: 'M-Sport', type: 'Project Car', mileage: 178500, lastService: '2024-06-20', nextService: '2024-09-20', totalInvested: 45200, modifications: 28, status: 'maintenance', buildProgress: 65, engine: '2.8L I6', horsepower: 193, torque: 206, recentWork: [{ date: '2024-06-20', type: 'Suspension', item: 'Coilover Install', cost: 2340, status: 'in-progress' }] }
     ];
    setVehicles(mockVehicles);
  };

  const fetchDiscoveryResults = (filters = {}) => {
      if (!rest_url) return; // Don't fetch if WP data isn't available
      setLoading(true);
      fetch(`${rest_url}myddpc/v2/discover/results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
          body: JSON.stringify({ filters })
      })
      .then(res => res.ok ? res.json() : Promise.reject(`Error: ${res.statusText}`))
      .then(data => {
          // Ensure the response is always an array before setting state.
          setDiscoveryResults(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error("Failed to fetch discovery results:", err);
        setDiscoveryResults([]); // Clear results on error to prevent crashes.
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Only run fetch calls if the rest_url is available.
    if (rest_url) {
        fetchGarageVehicles();
        fetchDiscoveryResults(); // Initial fetch for the discover page
    } else {
        // If data isn't available after a short delay, stop loading.
        setTimeout(() => setLoading(false), 1000);
    }
  }, [rest_url]);

  const addToCompare = (vehicle) => {
    if (compareVehicles.length < 3 && !compareVehicles.find(v => v.id === vehicle.id)) {
      setCompareVehicles([...compareVehicles, vehicle]);
    }
  };
  const removeFromCompare = (vehicleId) => setCompareVehicles(compareVehicles.filter(v => v.id !== vehicleId));
  const clearCompare = () => setCompareVehicles([]);

  const value = {
    vehicles, discoveryResults, selectedVehicle, setSelectedVehicle,
    compareVehicles, addToCompare, removeFromCompare, clearCompare, loading,
    fetchDiscoveryResults
  };

  return <VehicleContext.Provider value={value}>{children}</VehicleContext.Provider>;
};

const useVehicles = () => useContext(VehicleContext);

//================================================================================
// 2. REUSABLE UI COMPONENTS (No changes)
//================================================================================
const PageHeader = ({ title, subtitle }) => (
    <div className="flex items-center justify-between mb-8">
        <div>
            <h1 className="text-3xl font-light text-gray-900 mb-2">{title}</h1>
            <p className="text-gray-600">{subtitle}</p>
        </div>
    </div>
);

const VehicleCard = ({ vehicle, onClick }) => {
    const statusConfig = {
        operational: { label: 'Operational', classes: 'bg-green-100 text-green-800' },
        maintenance: { label: 'In Service', classes: 'bg-amber-100 text-amber-800' },
        default: { label: 'Offline', classes: 'bg-gray-100 text-gray-800' }
    };
    const currentStatus = statusConfig[vehicle.status] || statusConfig.default;
    const daysToService = Math.ceil((new Date(vehicle.nextService) - new Date()) / (1000 * 60 * 60 * 24));

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer group" onClick={onClick}>
            <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center mb-2">
                            <h3 className="text-xl font-medium text-gray-900 mr-3">{vehicle.name}</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${currentStatus.classes}`}>{currentStatus.label}</span>
                        </div>
                        <p className="text-gray-600 font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                        <p className="text-sm text-gray-500">{vehicle.trim} • {vehicle.mileage.toLocaleString()} miles</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500 mb-1">Type</p>
                        <p className="font-medium text-gray-900">{vehicle.type}</p>
                    </div>
                </div>
            </div>
            <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <Icon name="Car" className="w-20 h-20 text-gray-400" />
            </div>
            <div className="p-6">
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <p className="text-lg font-light text-gray-900">{vehicle.modifications}</p>
                        <p className="text-xs text-gray-600 uppercase tracking-wide">Mods</p>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-light text-gray-900">${(vehicle.totalInvested / 1000).toFixed(0)}K</p>
                        <p className="text-xs text-gray-600 uppercase tracking-wide">Invested</p>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-light text-gray-900">{daysToService}</p>
                        <p className="text-xs text-gray-600 uppercase tracking-wide">Days to Svc</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

//================================================================================
// 3. VIEW COMPONENTS
//================================================================================
const DiscoverView = ({ setActiveView }) => {
    const { discoveryResults, addToCompare, loading, fetchDiscoveryResults } = useVehicles();
    const [filters, setFilters] = useState({});
    const [filterOptions, setFilterOptions] = useState({ makes: [], body_styles: [], drivetrains: [] });
    const { rest_url, nonce } = window.myddpcAppData || {};

    useEffect(() => {
        if (!rest_url) return;
        fetch(`${rest_url}myddpc/v2/discover/filters`, { headers: { 'X-WP-Nonce': nonce } })
            .then(res => res.json())
            .then(data => {
                // Ensure the data received is an object before setting state.
                if (typeof data === 'object' && data !== null) {
                    setFilterOptions(data);
                }
            })
            .catch(err => console.error("Failed to fetch filter options:", err));
    }, [rest_url]);
    
    const handleFilterChange = (filterName, value) => setFilters(prev => ({ ...prev, [filterName]: value }));
    const handleApplyFilters = () => fetchDiscoveryResults(filters);
    
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <PageHeader title="Vehicle Discovery" subtitle="Find and compare vehicles by specifications and features" />
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1">
                     <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24">
                        <h3 className="text-lg font-medium text-gray-900 mb-6">Filters</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Make</label>
                                <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" onChange={(e) => handleFilterChange('make', e.target.value)}>
                                    <option value="">All Makes</option>
                                    {/* DEFENSIVE CODING: Check if filterOptions.makes is an array before mapping. */}
                                    {Array.isArray(filterOptions?.makes) && filterOptions.makes.map(make => <option key={make} value={make}>{make}</option>)}
                                </select>
                            </div>
                            <button onClick={handleApplyFilters} className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 font-medium">Apply Filters</button>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-3">
                     <div className="bg-white rounded-lg border border-gray-200 p-6">
                        {loading ? <p>Loading vehicle data...</p> : (
                            <>
                                <p className="text-gray-600 mb-6">{discoveryResults.length} vehicles found</p>
                                <div className="space-y-4">
                                    {/* DEFENSIVE CODING: Check if discoveryResults is an array. */}
                                    {Array.isArray(discoveryResults) && discoveryResults.map((vehicle) => (
                                        <div key={vehicle.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm">
                                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                                                <div className="flex-1 mb-4 md:mb-0">
                                                    <h4 className="text-lg font-medium text-gray-900 mb-2">{`${vehicle.Year} ${vehicle.Make} ${vehicle.Model} ${vehicle.Trim}`}</h4>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm text-gray-600">
                                                        <div><span className="font-medium">Engine:</span> {vehicle['Engine Type']}</div>
                                                        <div><span className="font-medium">Power:</span> {vehicle['Horsepower (HP)']} HP</div>
                                                        <div><span className="font-medium">Drive:</span> {vehicle.Drivetrain}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-3 w-full md:w-auto">
                                                    <button onClick={() => addToCompare(vehicle)} className="flex-1 md:flex-initial px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Compare</button>
                                                    <button className="flex-1 md:flex-initial px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Save</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
   );
};

const CompareView = ({ setActiveView }) => {
    const { compareVehicles, removeFromCompare, clearCompare } = useVehicles();

    const CompareSlot = ({ vehicle, onRemove }) => {
        if (!vehicle) {
             return (
                <div className="h-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                    <Icon name="Car" className="w-16 h-16 text-gray-400 mb-4" />
                    <p className="text-gray-500 text-center mb-4">Add Vehicle</p>
                    <button onClick={() => setActiveView('discover')} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">Browse</button>
                </div>
            );
        }
        return (
             <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col">
                 <div className="p-6 border-b border-gray-100">
                    <div className="flex items-start justify-between mb-4">
                         <div>
                            <h3 className="text-lg font-medium text-gray-900">{`${vehicle.Year} ${vehicle.Make}`}</h3>
                            <p className="text-gray-600">{`${vehicle.Model} ${vehicle.Trim}`}</p>
                        </div>
                        <button onClick={onRemove} className="text-gray-400 hover:text-gray-600"><Icon name="X" className="w-5 h-5" /></button>
                    </div>
                </div>
                <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center"><Icon name="Car" className="w-16 h-16 text-gray-400" /></div>
                <div className="p-6 flex-grow">
                     <div className="space-y-3">
                        <div className="flex justify-between"><span className="text-gray-600">Engine:</span><span className="font-medium text-right">{vehicle['Engine Type']}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Power:</span><span className="font-medium">{`${vehicle['Horsepower (HP)']} HP`}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Drive:</span><span className="font-medium">{vehicle.Drivetrain}</span></div>
                     </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-8">
                 <div>
                    <h1 className="text-3xl font-light text-gray-900 mb-2">Vehicle Comparison</h1>
                    <p className="text-gray-600">Side-by-side vehicle analysis</p>
                </div>
                {compareVehicles.length > 0 && <button onClick={clearCompare} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">Clear All</button>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[0, 1, 2].map(slot => <CompareSlot key={slot} vehicle={compareVehicles[slot]} onRemove={() => removeFromCompare(compareVehicles[slot].id)} />)}
            </div>
        </div>
    );
};

const GarageOverview = ({ setActiveView, setGarageView }) => {
    const { vehicles, setSelectedVehicle } = useVehicles();
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <PageHeader title="Garage Operations" subtitle="Vehicle management and build tracking" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {Array.isArray(vehicles) && vehicles.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} onClick={() => {
                    setSelectedVehicle(vehicle);
                    setGarageView('vehicle-detail');
                }} />)}
            </div>
        </div>
    );
};

const VehicleDetailView = ({ setGarageView }) => {
    const { selectedVehicle } = useVehicles();
    if (!selectedVehicle) {
        return <div className="text-center p-8">No vehicle selected.</div>;
    }
    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button onClick={() => setGarageView('overview')} className="mb-4 text-sm text-red-600 font-medium">← Back to Garage</button>
            <PageHeader title={selectedVehicle.name} subtitle={`${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`} />
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Work</h3>
                 <ul className="divide-y divide-gray-200">
                    {Array.isArray(selectedVehicle.recentWork) && selectedVehicle.recentWork.map((work, index) => (
                      <li key={index} className="py-3">
                        <p className="font-medium">{`${work.item} (${work.type})`}</p>
                        <p className="text-sm text-gray-500">{`Date: ${work.date} | Cost: $${work.cost}`}</p>
                      </li>
                    ))}
                  </ul>
            </div>
        </div>
    );
};

const PlaceholderView = ({ title, subtitle, iconName }) => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader title={title} subtitle={subtitle} />
        <div className="bg-white rounded-lg border border-gray-200 p-8 flex items-center justify-center h-96">
            <div className="text-center">
                <Icon name={iconName} className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">{`${title} tools coming soon.`}</p>
            </div>
        </div>
    </div>
);

//================================================================================
// 4. MAIN APP COMPONENT & LAYOUT
//================================================================================
const App = () => {
  const [activeView, setActiveView] = useState('garage');
  const [garageView, setGarageView] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationItems = [
    { id: 'discover', label: 'Discover', icon: 'Search' },
    { id: 'compare', label: 'Compare', icon: 'Car' },
    { id: 'performance', label: 'Performance', icon: 'BarChart3' },
    { id: 'dimensions', label: 'Dimensions', icon: 'Ruler' },
    { id: 'garage', label: 'Garage', icon: 'Settings' },
  ];

  const handleNavClick = (viewId) => {
      setActiveView(viewId);
      if (viewId === 'garage') setGarageView('overview');
      setMobileMenuOpen(false);
  }

  const renderView = () => {
    switch (activeView) {
      case 'discover': return <DiscoverView setActiveView={setActiveView} />;
      case 'compare': return <CompareView setActiveView={setActiveView} />;
      case 'performance': return <PlaceholderView title="Performance Analysis" subtitle="Analyze vehicle performance and efficiency metrics" iconName="BarChart3" />;
      case 'dimensions': return <PlaceholderView title="Vehicle Dimensions" subtitle="Analyze vehicle size, fit, and spatial requirements" iconName="Ruler" />;
      case 'garage':
        return garageView === 'vehicle-detail'
          ? <VehicleDetailView setGarageView={setGarageView} />
          : <GarageOverview setActiveView={setActiveView} setGarageView={setGarageView} />;
      default: return <GarageOverview setActiveView={setActiveView} setGarageView={setGarageView} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center space-x-3">
                        <div className="relative w-8 h-8">
                            <div className="absolute inset-0 bg-red-600 rounded-lg"></div>
                            <div className="absolute inset-1 bg-white rounded-md flex items-center justify-center"><Icon name="Car" className="w-4 h-4 text-red-600" /></div>
                        </div>
                        <span className="text-xl font-medium text-gray-900">MyDDPC</span>
                    </div>
                    <nav className="hidden md:flex items-center space-x-1">
                        {navigationItems.map(item => (
                            <button key={item.id} onClick={() => handleNavClick(item.id)} className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeView === item.id ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                                <Icon name={item.icon} className="w-4 h-4 mr-2" />
                                {item.label}
                            </button>
                        ))}
                    </nav>
                    <div className="flex items-center space-x-4">
                         <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center"><Icon name="User" className="w-4 h-4 text-gray-600" /></div>
                            <span className="text-sm font-medium text-gray-700 hidden sm:block">Rory Teehan</span>
                         </div>
                        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg text-gray-600">
                            <Icon name={mobileMenuOpen ? 'X' : 'Menu'} className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
            {mobileMenuOpen && (
                 <div className="md:hidden border-t border-gray-200 bg-white">
                     <div className="px-4 py-3 space-y-1">
                        {navigationItems.map(item => 
                            <button key={item.id} onClick={() => handleNavClick(item.id)} className={`w-full flex items-center px-3 py-3 rounded-lg text-sm font-medium ${activeView === item.id ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                                <Icon name={item.icon} className="w-5 h-5 mr-3" />
                                {item.label}
                            </button>
                        )}
                     </div>
                </div>
            )}
        </header>
        <main>{renderView()}</main>
    </div>
  );
};

// Final render call to attach the app to the DOM
const domContainer = document.querySelector('#myddpc-react-root');
const root = ReactDOM.createRoot(domContainer);
root.render(<VehicleProvider><App /></VehicleProvider>);
