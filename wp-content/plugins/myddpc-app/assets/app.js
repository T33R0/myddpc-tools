const { useState, useEffect, createContext, useContext } = React;

//================================================================================
// 1. CONTEXT & PROVIDER
//================================================================================

// **FIXED**: The missing line that caused the entire application to fail.
const VehicleContext = createContext();

const VehicleProvider = ({ children }) => {
  const [vehicles, setVehicles] = useState([]);
  const [discoveryResults, setDiscoveryResults] = useState({ results: [], total: 0 });
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [compareVehicles, setCompareVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSwapModalOpen, setSwapModalOpen] = useState(false);
  const [candidateVehicle, setCandidateVehicle] = useState(null);
  
  const { rest_url, nonce } = window.myddpcAppData || {};

  const fetchGarageVehicles = () => {
     const mockVehicles = [
        { ID: 1, name: 'Daily Beast', Year: 2014, Make: 'Audi', Model: 'S6', Trim: 'Prestige', type: 'Daily Driver', mileage: 95420, lastService: '2024-05-15', nextService: '2024-08-15', totalInvested: 12500, modifications: 12, status: 'operational', buildProgress: 85, engine: '4.0L V8 Turbo', horsepower: 420, torque: 406, recentWork: [{ date: '2024-05-10', type: 'Performance', item: 'ECU Tune', cost: 1200, status: 'completed' }] },
        { ID: 2, name: 'Track Weapon', Year: 1999, Make: 'BMW', Model: 'Z3 Coupe', Trim: 'M-Sport', type: 'Project Car', mileage: 178500, lastService: '2024-06-20', nextService: '2024-09-20', totalInvested: 45200, modifications: 28, status: 'maintenance', buildProgress: 65, engine: '2.8L I6', horsepower: 193, torque: 206, recentWork: [{ date: '2024-06-20', type: 'Suspension', item: 'Coilover Install', cost: 2340, status: 'in-progress' }] }
     ];
    setVehicles(mockVehicles);
  };

  const fetchDiscoveryResults = (params = {}) => {
      if (!rest_url) return;
      setLoading(true);
      const apiParams = { filters: params.filters || {}, sort_by: params.sort_by || 'Year', sort_dir: params.sort_dir || 'desc', limit: params.limit || 10, offset: params.offset || 0 };
      fetch(`${rest_url}myddpc/v2/discover/results`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce }, body: JSON.stringify(apiParams) })
          .then(res => res.ok ? res.json() : Promise.reject(`Error: ${res.statusText}`))
          .then(data => setDiscoveryResults(data && Array.isArray(data.results) ? data : { results: [], total: 0 }))
          .catch(err => console.error("Failed to fetch discovery results:", err))
          .finally(() => setLoading(false));
  };

  useEffect(() => {
      if (rest_url) {
          fetchGarageVehicles();
          fetchDiscoveryResults();
      } else {
          setTimeout(() => setLoading(false), 1000);
      }
  }, [rest_url]);

  const addToCompare = (vehicle) => {
      if (!compareVehicles.find(v => v.ID === vehicle.ID)) {
          if (compareVehicles.length < 3) {
              setCompareVehicles([...compareVehicles, vehicle]);
          } else {
              setCandidateVehicle(vehicle);
              setSwapModalOpen(true);
          }
      }
  };
  const removeFromCompare = (vehicleId) => setCompareVehicles(compareVehicles.filter(v => v.ID !== vehicleId));
  const swapVehicleInCompare = (vehicleToReplaceId) => {
      const newCompareList = compareVehicles.map(v => v.ID === vehicleToReplaceId ? candidateVehicle : v);
      setCompareVehicles(newCompareList);
      setSwapModalOpen(false);
      setCandidateVehicle(null);
  };
  const cancelSwap = () => {
      setSwapModalOpen(false);
      setCandidateVehicle(null);
  }
  const clearCompare = () => setCompareVehicles([]);

  const value = {
      vehicles, discoveryResults, selectedVehicle, setSelectedVehicle,
      compareVehicles, addToCompare, removeFromCompare, clearCompare, loading,
      fetchDiscoveryResults, isSwapModalOpen, candidateVehicle, swapVehicleInCompare, cancelSwap
  };

  return <VehicleContext.Provider value={value}>{children}</VehicleContext.Provider>;
};

const useVehicles = () => useContext(VehicleContext);

//================================================================================
// 2. REUSABLE UI COMPONENTS
//================================================================================

const Icon = ({ name, className }) => <div className={`icon-placeholder ${className}`}>{name.charAt(0)}</div>;
const PageHeader = ({ title, subtitle }) => ( <div className="flex items-center justify-between mb-8"> <div> <h1 className="text-3xl font-light text-gray-900 mb-2">{title}</h1> <p className="text-gray-600">{subtitle}</p> </div> </div> );

const CompareTray = () => {
    const { compareVehicles, removeFromCompare, clearCompare } = useVehicles();
    if (compareVehicles.length === 0) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1 flex items-center gap-4">
                    <h4 className="font-medium text-gray-800">Compare List:</h4>
                    <div className="flex items-center gap-3">
                        {compareVehicles.map(v => (
                            <div key={v.ID} className="bg-gray-100 px-3 py-1 rounded-full flex items-center text-sm">
                                <span className="text-gray-700">{`${v.Year} ${v.Make} ${v.Model}`}</span>
                                <button onClick={() => removeFromCompare(v.ID)} className="ml-2 text-gray-500 hover:text-red-600"><Icon name="X" className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                </div>
                <button onClick={clearCompare} className="text-sm font-medium text-red-600 hover:underline">Clear All</button>
            </div>
        </div>
    );
};

const CompareSwapModal = () => {
    const { isSwapModalOpen, compareVehicles, candidateVehicle, swapVehicleInCompare, cancelSwap } = useVehicles();
    const modalNode = document.getElementById('modal-root');
    if (!isSwapModalOpen || !modalNode) return null;

    return ReactDOM.createPortal(
        <div 
            className="fixed inset-0 flex items-center justify-center"
            style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                zIndex: 1000,
                pointerEvents: 'auto'
            }}
            onClick={cancelSwap}
        >
            <div 
                className="bg-white rounded-lg shadow-2xl p-8 max-w-lg w-full mx-4"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-2xl font-light text-gray-900 mb-2">Comparison List Full</h2>
                <p className="text-gray-600 mb-6">Select a vehicle to replace with the <span className="font-semibold">{`${candidateVehicle.Year} ${candidateVehicle.Make} ${candidateVehicle.Model}`}</span>.</p>
                <div className="space-y-3 mb-8">
                    {compareVehicles.map(vehicle => (
                        <button 
                            key={vehicle.ID} 
                            onClick={() => swapVehicleInCompare(vehicle.ID)} 
                            className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-300 transition-all"
                        >
                            <p className="font-medium text-gray-800">{`${vehicle.Year} ${vehicle.Make} ${vehicle.Model}`}</p>
                            <p className="text-sm text-gray-500">{`${vehicle['Horsepower (HP)']} HP • ${vehicle['Drive type']}`}</p>
                        </button>
                    ))}
                </div>
                <div className="text-right"> <button onClick={cancelSwap} className="text-gray-600 font-medium hover:text-gray-900 px-4 py-2 rounded-lg">Cancel</button> </div>
            </div>
        </div>,
        modalNode
    );
};


//================================================================================
// 3. VIEW COMPONENTS
//================================================================================

const DiscoverView = ({ setActiveView }) => {
    const { discoveryResults, addToCompare, loading, fetchDiscoveryResults } = useVehicles();
    const [filters, setFilters] = useState({});
    const [filterOptions, setFilterOptions] = useState({});
    const [sort, setSort] = useState({ by: 'Year', dir: 'desc' });
    const [pagination, setPagination] = useState({ page: 1, limit: 10 });
    const { rest_url, nonce } = window.myddpcAppData || {};

    // Initial fetch for filter options
    useEffect(() => {
        if (!rest_url) return;
        fetch(`${rest_url}myddpc/v2/discover/filters`, { headers: { 'X-WP-Nonce': nonce } })
            .then(res => res.json()).then(data => { if (typeof data === 'object' && data !== null) setFilterOptions(data); })
            .catch(err => console.error("Failed to fetch filter options:", err));
    }, [rest_url, nonce]);
    
    // Abstracted fetch logic
    const handleApply = () => {
        const params = { filters, sort_by: sort.by, sort_dir: sort.dir, limit: pagination.limit, offset: (pagination.page - 1) * pagination.limit };
        fetchDiscoveryResults(params);
    };
    
    // State change handlers
    const handleFilterChange = (filterName, value) => {
        // When a filter changes, reset to page 1
        setPagination(prev => ({ ...prev, page: 1 })); 
        setFilters(prev => ({ ...prev, [filterName]: value }));
    };
    const handleSortChange = (field, value) => setSort(prev => ({ ...prev, [field]: value }));
    const handlePageChange = (direction) => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page + direction) }));

    // **NEW**: Reset handler
    const handleReset = () => {
        setFilters({});
        setSort({ by: 'Year', dir: 'desc' });
        setPagination({ page: 1, limit: 10 });
        // Manually trigger the fetch with cleared filters since state updates might not be synchronous
        fetchDiscoveryResults({ filters: {}, sort_by: 'Year', sort_dir: 'desc', limit: 10, offset: 0 });
    };
    
    // **UPDATED**: This effect now triggers on any change to filters, sort, or page.
    useEffect(() => {
        handleApply();
    }, [filters, sort.by, sort.dir, pagination.page]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <PageHeader title="Vehicle Discovery" subtitle="Find and compare vehicles by specifications and features" />
            <div className="mb-8"> <CompareTray /> </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
                            {/* **NEW**: Reset button */}
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
                            {/* **REMOVED**: Apply Filters button is gone */}
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
                        {loading ? <p>Loading...</p> : (
                            <div className="space-y-4">
                                {Array.isArray(discoveryResults.results) && discoveryResults.results.map((vehicle) => (
                                    <div key={vehicle.ID} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm">
                                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                                            <div className="flex-1 mb-4 md:mb-0">
                                                <h4 className="text-lg font-medium text-gray-900 mb-2">{`${vehicle.Year} ${vehicle.Make} ${vehicle.Model} ${vehicle.Trim}`}</h4>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm text-gray-600">
                                                    <div><span className="font-medium">Engine:</span> {vehicle['Engine size (l)']}L {vehicle.Cylinders}-cyl</div>
                                                    <div><span className="font-medium">Power:</span> {vehicle['Horsepower (HP)']} HP</div>
                                                    <div><span className="font-medium">Drive:</span> {vehicle['Drive type']}</div>
                                                    <div><span className="font-medium">Weight:</span> {vehicle['Curb weight (lbs)']} lbs</div>
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
   );
};

const CompareGeneral = ({ vehicle }) => (
    <div className="p-6 flex-grow">
        <div className="space-y-3">
            <div className="flex justify-between"><span className="text-gray-600">Engine:</span><span className="font-medium text-right">{vehicle['Engine size (l)']}L {vehicle.Cylinders}-cyl</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Power:</span><span className="font-medium">{`${vehicle['Horsepower (HP)']} HP`}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Torque:</span><span className="font-medium">{`${vehicle['Torque (ft-lbs)']} ft-lbs`}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Drive:</span><span className="font-medium">{vehicle['Drive type']}</span></div>
        </div>
    </div>
);

const ComparePerformance = ({ vehicle }) => (
    <div className="p-6 flex-grow">
        <div className="space-y-3">
            <div className="flex justify-between"><span className="text-gray-600">Horsepower:</span><span className="font-medium">{`${vehicle['Horsepower (HP)']} HP`}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Torque:</span><span className="font-medium">{`${vehicle['Torque (ft-lbs)']} ft-lbs`}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Weight:</span><span className="font-medium">{`${vehicle['Curb weight (lbs)']} lbs`}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">MPG (Combined):</span><span className="font-medium">{vehicle['EPA combined MPG']}</span></div>
        </div>
    </div>
);

const CompareDimensions = ({ vehicle }) => (
    <div className="p-6 flex-grow">
        <div className="space-y-3">
            <div className="flex justify-between"><span className="text-gray-600">Length:</span><span className="font-medium">{`${vehicle['Length (in)']} in`}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Width:</span><span className="font-medium">{`${vehicle['Width (in)']} in`}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Height:</span><span className="font-medium">{`${vehicle['Height (in)']} in`}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Wheelbase:</span><span className="font-medium">{`${vehicle['Wheelbase (in)']} in`}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Ground Clearance:</span><span className="font-medium">{`${vehicle['Ground clearance (in)']} in`}</span></div>
        </div>
    </div>
);

const CompareView = ({ setActiveView }) => {
    const { compareVehicles, removeFromCompare, clearCompare } = useVehicles();
    const [analysisType, setAnalysisType] = useState('General'); // 'General', 'Performance', 'Dimensions'

    const renderAnalysisComponent = (vehicle) => {
        switch (analysisType) {
            case 'Performance': return <ComparePerformance vehicle={vehicle} />;
            case 'Dimensions': return <CompareDimensions vehicle={vehicle} />;
            default: return <CompareGeneral vehicle={vehicle} />;
        }
    };
    
    const CompareSlot = ({ vehicle }) => {
        if (!vehicle) {
            return (<div className="h-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50"> <Icon name="Car" className="w-16 h-16 text-gray-400 mb-4" /> <p className="text-gray-500 text-center mb-4">Add Vehicle</p> <button onClick={() => setActiveView('discover')} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">Browse</button> </div>);
        }
        return (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-start justify-between mb-4">
                        <div> <h3 className="text-lg font-medium text-gray-900">{`${vehicle.Year} ${vehicle.Make}`}</h3> <p className="text-gray-600">{`${vehicle.Model} ${vehicle.Trim}`}</p> </div>
                        <button onClick={() => removeFromCompare(vehicle.ID)} className="text-gray-400 hover:text-gray-600"><Icon name="X" className="w-5 h-5" /></button>
                    </div>
                </div>
                <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center"><Icon name="Car" className="w-16 h-16 text-gray-400" /></div>
                {renderAnalysisComponent(vehicle)}
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                <div> <h1 className="text-3xl font-light text-gray-900 mb-2">Vehicle Comparison</h1> <p className="text-gray-600">Side-by-side vehicle analysis</p> </div>
                <div className="flex items-center gap-2">
                    <div className="isolate inline-flex rounded-md shadow-sm">
                        <button onClick={() => setAnalysisType('General')} className={`relative inline-flex items-center rounded-l-md px-3 py-2 text-sm font-semibold ${analysisType === 'General' ? 'bg-red-600 text-white z-10' : 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'}`}>General</button>
                        <button onClick={() => setAnalysisType('Performance')} className={`relative -ml-px inline-flex items-center px-3 py-2 text-sm font-semibold ${analysisType === 'Performance' ? 'bg-red-600 text-white z-10' : 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'}`}>Performance</button>
                        <button onClick={() => setAnalysisType('Dimensions')} className={`relative -ml-px inline-flex items-center rounded-r-md px-3 py-2 text-sm font-semibold ${analysisType === 'Dimensions' ? 'bg-red-600 text-white z-10' : 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'}`}>Dimensions</button>
                    </div>
                    {compareVehicles.length > 0 && <button onClick={clearCompare} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 ml-4">Clear</button>}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[0, 1, 2].map(slot => <CompareSlot key={slot} vehicle={compareVehicles[slot]} />)}
            </div>
        </div>
    );
};

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
                        <p className="text-gray-600 font-medium">{vehicle.Year} {vehicle.Make} {vehicle.Model}</p>
                        <p className="text-sm text-gray-500">{vehicle.Trim} • {vehicle.mileage.toLocaleString()} miles</p>
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

const GarageOverview = ({ setActiveView, setGarageView }) => {
    const { vehicles, setSelectedVehicle } = useVehicles();
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <PageHeader title="Garage Operations" subtitle="Vehicle management and build tracking" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {Array.isArray(vehicles) && vehicles.map((vehicle) => <VehicleCard key={vehicle.ID} vehicle={vehicle} onClick={() => {
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
            <PageHeader title={selectedVehicle.name} subtitle={`${selectedVehicle.Year} ${selectedVehicle.Make} ${selectedVehicle.Model}`} />
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


//================================================================================
// 4. MAIN APP COMPONENT & LAYOUT
//================================================================================
const App = () => {
  const [activeView, setActiveView] = useState('garage');
  const [garageView, setGarageView] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const modalRoot = document.createElement('div');
    modalRoot.setAttribute('id', 'modal-root');
    Object.assign(modalRoot.style, { position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh', zIndex: '1000', display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' });
    document.body.appendChild(modalRoot);
    return () => { document.body.removeChild(modalRoot); };
  }, []);

  const navigationItems = [
    { id: 'discover', label: 'Discover', icon: 'Search' },
    { id: 'compare', label: 'Compare', icon: 'Car' },
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
      case 'garage':
        return garageView === 'vehicle-detail' ? <VehicleDetailView setGarageView={setGarageView} /> : <GarageOverview setActiveView={setActiveView} setGarageView={setGarageView} />;
      default: return <GarageOverview setActiveView={setActiveView} setGarageView={setGarageView} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
        <CompareSwapModal />
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center space-x-3">
                        <div className="relative w-8 h-8"> <div className="absolute inset-0 bg-red-600 rounded-lg"></div> <div className="absolute inset-1 bg-white rounded-md flex items-center justify-center"><Icon name="Car" className="w-4 h-4 text-red-600" /></div> </div>
                        <span className="text-xl font-medium text-gray-900">MyDDPC</span>
                    </div>
                    <nav className="hidden md:flex items-center space-x-1">
                        {navigationItems.map(item => ( <button key={item.id} onClick={() => handleNavClick(item.id)} className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeView === item.id ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}> <Icon name={item.icon} className="w-4 h-4 mr-2" /> {item.label} </button> ))}
                    </nav>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2"> <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center"><Icon name="User" className="w-4 h-4 text-gray-600" /></div> <span className="text-sm font-medium text-gray-700 hidden sm:block">Rory Teehan</span> </div>
                        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg text-gray-600"> <Icon name={mobileMenuOpen ? 'X' : 'Menu'} className="w-5 h-5" /> </button>
                    </div>
                </div>
            </div>
            {mobileMenuOpen && ( <div className="md:hidden border-t border-gray-200 bg-white"> <div className="px-4 py-3 space-y-1"> {navigationItems.map(item => ( <button key={item.id} onClick={() => handleNavClick(item.id)} className={`w-full flex items-center px-3 py-3 rounded-lg text-sm font-medium ${activeView === item.id ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-50'}`}> <Icon name={item.icon} className="w-5 h-5 mr-3" /> {item.label} </button> ))} </div> </div> )}
        </header>
        <main>{renderView()}</main>
    </div>
  );
};

//================================================================================
// 5. FINAL RENDER CALL
//================================================================================
const domContainer = document.querySelector('#myddpc-react-root');
const root = ReactDOM.createRoot(domContainer);
root.render(<VehicleProvider><App /></VehicleProvider>);