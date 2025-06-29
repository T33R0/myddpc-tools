const { useState, useEffect, createContext, useContext } = React;

// Since we can't import lucide-react, we create simple placeholder icons.
const Icon = ({ name, className }) => <div className={`icon-placeholder ${className}`}>{name.charAt(0)}</div>;

//================================================================================
// 1. CONTEXT FOR STATE MANAGEMENT
//================================================================================
const VehicleContext = createContext();

const VehicleProvider = ({ children }) => {
    const [vehicles, setVehicles] = useState([]);
    const [discoveryResults, setDiscoveryResults] = useState({ results: [], total: 0 });
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [compareVehicles, setCompareVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    // New state for the swap modal
    const [isSwapModalOpen, setSwapModalOpen] = useState(false);
    const [candidateVehicle, setCandidateVehicle] = useState(null);
    
    const { rest_url, nonce } = window.myddpcAppData || {};

    const fetchGarageVehicles = () => {
        const mockVehicles = [
            { ID: 1, name: 'Daily Beast', year: 2014, make: 'Audi', model: 'S6', trim: 'Prestige', type: 'Daily Driver', mileage: 95420, lastService: '2024-05-15', nextService: '2024-08-15', totalInvested: 12500, modifications: 12, status: 'operational', buildProgress: 85, engine: '4.0L V8 Turbo', horsepower: 420, torque: 406, recentWork: [{ date: '2024-05-10', type: 'Performance', item: 'ECU Tune', cost: 1200, status: 'completed' }] },
            { ID: 2, name: 'Track Weapon', year: 1999, make: 'BMW', model: 'Z3 Coupe', trim: 'M-Sport', type: 'Project Car', mileage: 178500, lastService: '2024-06-20', nextService: '2024-09-20', totalInvested: 45200, modifications: 28, status: 'maintenance', buildProgress: 65, engine: '2.8L I6', horsepower: 193, torque: 206, recentWork: [{ date: '2024-06-20', type: 'Suspension', item: 'Coilover Install', cost: 2340, status: 'in-progress' }] }
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

const CompareTray = () => {
    const { compareVehicles, removeFromCompare, clearCompare } = useVehicles();

    if (compareVehicles.length === 0) {
        return null; // Don't render anything if the tray is empty
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex-1 flex items-center gap-4">
                        <h4 className="font-medium text-gray-800">Compare List:</h4>
                        <div className="flex items-center gap-3">
                            {compareVehicles.map(v => (
                                <div key={v.ID} className="bg-gray-100 px-3 py-1 rounded-full flex items-center text-sm">
                                    <span className="text-gray-700">{`${v.Year} ${v.Make} ${v.Model}`}</span>
                                    <button onClick={() => removeFromCompare(v.ID)} className="ml-2 text-gray-500 hover:text-red-600">
                                        <Icon name="X" className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <button onClick={clearCompare} className="text-sm font-medium text-red-600 hover:underline">Clear All</button>
                </div>
            </div>
        </div>
    );
};

const CompareSwapModal = () => {
    const { isSwapModalOpen, compareVehicles, candidateVehicle, swapVehicleInCompare, cancelSwap } = useVehicles();
    const modalNode = document.getElementById('modal-root');

    if (!isSwapModalOpen || !modalNode) {
        return null;
    }

    return ReactDOM.createPortal(
        <div 
            className="fixed inset-0 flex items-center justify-center"
            style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                zIndex: 1000,
                pointerEvents: 'auto' // Re-enable pointer events for the container
            }}
            onClick={cancelSwap} // Close modal if overlay is clicked
        >
            <div 
                className="bg-white rounded-lg shadow-2xl p-8 max-w-lg w-full mx-4"
                onClick={e => e.stopPropagation()} // Prevent clicks inside the modal from closing it
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
                <div className="text-right">
                    <button onClick={cancelSwap} className="text-gray-600 font-medium hover:text-gray-900 px-4 py-2 rounded-lg">Cancel</button>
                </div>
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

    useEffect(() => {
        if (!rest_url) return;
        fetch(`${rest_url}myddpc/v2/discover/filters`, { headers: { 'X-WP-Nonce': nonce } })
            .then(res => res.json())
            .then(data => { if (typeof data === 'object' && data !== null) setFilterOptions(data); })
            .catch(err => console.error("Failed to fetch filter options:", err));
    }, [rest_url, nonce]);
    
    const handleApply = () => {
        const params = { filters, sort_by: sort.by, sort_dir: sort.dir, limit: pagination.limit, offset: (pagination.page - 1) * pagination.limit };
        fetchDiscoveryResults(params);
    };
    
    const handleFilterChange = (filterName, value) => setFilters(prev => ({ ...prev, [filterName]: value }));
    const handleSortChange = (field, value) => setSort(prev => ({ ...prev, [field]: value }));
    const handlePageChange = (direction) => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page + direction) }));

    useEffect(() => { handleApply(); }, [pagination.page, sort.by, sort.dir]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <PageHeader title="Vehicle Discovery" subtitle="Find and compare vehicles by specifications and features" />
            
            {/* **MOVED**: CompareTray is now here, directly below the header. */}
            <div className="mb-8">
                <CompareTray />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Filters Sidebar */}
                <div className="lg:col-span-1">
                     <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24">
                        <h3 className="text-lg font-medium text-gray-900 mb-6">Filters</h3>
                        <div className="space-y-6">
                            {Object.keys(filterOptions).map(key => (
                                <div key={key}>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">{key.replace(/_/g, ' ')}</label>
                                    <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" onChange={(e) => handleFilterChange(key, e.target.value)}>
                                        <option value="">All</option>
                                        {Array.isArray(filterOptions[key]) && filterOptions[key].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            ))}
                            <button onClick={handleApply} className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 font-medium">Apply Filters</button>
                        </div>
                    </div>
                </div>
                {/* Results Area */}
                <div className="lg:col-span-3">
                     <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                            <p className="text-gray-600">{`${discoveryResults.total || 0} vehicles found`}</p>
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium">Sort by:</label>
                                <select value={sort.by} onChange={(e) => handleSortChange('by', e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1 text-sm">
                                    <option value="Year">Year</option>
                                    <option value="Horsepower (HP)">Horsepower</option>
                                    <option value="Torque (ft-lbs)">Torque</option>
                                    <option value="Curb weight (lbs)">Weight</option>
                                </select>
                                <select value={sort.dir} onChange={(e) => handleSortChange('dir', e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1 text-sm">
                                    <option value="desc">Descending</option>
                                    <option value="asc">Ascending</option>
                                </select>
                            </div>
                        </div>
                        {loading ? <p>Loading vehicle data...</p> : (
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
                             <button onClick={() => handlePageChange(-1)} disabled={loading || pagination.page <= 1} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                            <span className="text-sm text-gray-600">Page {pagination.page} of {Math.ceil((discoveryResults.total || 0) / pagination.limit)}</span>
                             <button onClick={() => handlePageChange(1)} disabled={loading || pagination.page * pagination.limit >= (discoveryResults.total || 0)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
   );
};

const DimensionsView = ({ setActiveView }) => {
    const [vehicle, setVehicle] = useState(null);
    const [loading, setLoading] = useState(false);
    const [years, setYears] = useState([]);
    const [makes, setMakes] = useState([]);
    const [models, setModels] = useState([]);
    const [trims, setTrims] = useState([]);
    const [selection, setSelection] = useState({ year: '', make: '', model: '', trim: '' });
    const { rest_url, nonce } = window.myddpcAppData || {};

    const handleSelectionChange = (field, value) => {
        setSelection(prev => {
            const newSelection = { ...prev, [field]: value };
            // Reset dependent fields when a parent field changes
            if (field === 'year') {
                newSelection.make = '';
                newSelection.model = '';
                newSelection.trim = '';
                setMakes([]);
                setModels([]);
                setTrims([]);
            }
            if (field === 'make') {
                newSelection.model = '';
                newSelection.trim = '';
                setModels([]);
                setTrims([]);
            }
            if (field === 'model') {
                newSelection.trim = '';
                setTrims([]);
            }
            return newSelection;
        });
        setVehicle(null); // Clear previous results on any change
    };

    // Fetch initial years
    useEffect(() => {
        if (!rest_url) return;
        setLoading(true);
        fetch(`${rest_url}myddpc/v2/dimensions/years`, { headers: { 'X-WP-Nonce': nonce } })
            .then(res => res.json()).then(setYears).finally(() => setLoading(false));
    }, [rest_url, nonce]);

    // Fetch makes when year changes
    useEffect(() => {
        if (selection.year && rest_url) {
            setLoading(true);
            fetch(`${rest_url}myddpc/v2/dimensions/makes?year=${selection.year}`, { headers: { 'X-WP-Nonce': nonce } })
                .then(res => res.json()).then(setMakes).finally(() => setLoading(false));
        }
    }, [selection.year, rest_url, nonce]);

    // Fetch models when make changes
    useEffect(() => {
        if (selection.year && selection.make && rest_url) {
            setLoading(true);
            fetch(`${rest_url}myddpc/v2/dimensions/models?year=${selection.year}&make=${selection.make}`, { headers: { 'X-WP-Nonce': nonce } })
                .then(res => res.json()).then(setModels).finally(() => setLoading(false));
        }
    }, [selection.year, selection.make, rest_url, nonce]);

    // Fetch trims when model changes
    useEffect(() => {
        if (selection.year && selection.make && selection.model && rest_url) {
            setLoading(true);
            fetch(`${rest_url}myddpc/v2/dimensions/trims?year=${selection.year}&make=${selection.make}&model=${selection.model}`, { headers: { 'X-WP-Nonce': nonce } })
                .then(res => res.json()).then(setTrims).finally(() => setLoading(false));
        }
    }, [selection.year, selection.make, selection.model, rest_url, nonce]);

    const handleFetchDimensions = () => {
        const { year, make, model, trim } = selection;
        if (year && make && model && trim && rest_url) {
            setLoading(true);
            fetch(`${rest_url}myddpc/v2/dimensions/vehicle?year=${year}&make=${make}&model=${model}&trim=${trim}`, { headers: { 'X-WP-Nonce': nonce } })
                .then(res => res.json()).then(setVehicle).finally(() => setLoading(false));
        }
    };

    const isFetchable = selection.year && selection.make && selection.model && selection.trim;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <PageHeader title="Vehicle Dimensions" subtitle="Analyze vehicle size, fit, and spatial requirements" />
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    {/* Year Dropdown */}
                    <select value={selection.year} onChange={(e) => handleSelectionChange('year', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                        <option value="">Select Year</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    {/* Make Dropdown */}
                    <select value={selection.make} onChange={(e) => handleSelectionChange('make', e.target.value)} disabled={!selection.year || makes.length === 0} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100">
                        <option value="">Select Make</option>
                        {makes.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    {/* Model Dropdown */}
                     <select value={selection.model} onChange={(e) => handleSelectionChange('model', e.target.value)} disabled={!selection.make || models.length === 0} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100">
                        <option value="">Select Model</option>
                        {models.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    {/* Trim Dropdown */}
                    <select value={selection.trim} onChange={(e) => handleSelectionChange('trim', e.target.value)} disabled={!selection.model || trims.length === 0} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100">
                        <option value="">Select Trim</option>
                        {trims.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {/* Fetch Button */}
                    <button onClick={handleFetchDimensions} disabled={!isFetchable || loading} className="w-full bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed">
                        {loading ? 'Loading...' : 'Get Dimensions'}
                    </button>
                </div>
            </div>

            {vehicle && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">{`Dimensions for ${selection.year} ${selection.make} ${selection.model} (${selection.trim})`}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Object.entries(vehicle).map(([key, value]) => (
                            <div key={key} className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-sm text-gray-600">{key}</p>
                                <p className="text-lg font-medium text-gray-900">{value || 'N/A'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const PerformanceView = ({ setActiveView }) => {
    const [performanceData, setPerformanceData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [years, setYears] = useState([]);
    const [makes, setMakes] = useState([]);
    const [models, setModels] = useState([]);
    const [trims, setTrims] = useState([]);
    const [selection, setSelection] = useState({ year: '', make: '', model: '', trim: '' });
    const { rest_url, nonce } = window.myddpcAppData || {};

    const handleSelectionChange = (field, value) => {
        setSelection(prev => {
            const newSelection = { ...prev, [field]: value };
            // Reset dependent fields
            if (field === 'year') newSelection.make = newSelection.model = newSelection.trim = '';
            if (field === 'make') newSelection.model = newSelection.trim = '';
            if (field === 'model') newSelection.trim = '';
            return newSelection;
        });
        setPerformanceData(null); // Clear previous results
    };

    // Fetch years, makes, models, trims (using the dimensions endpoints for selectors)
    useEffect(() => {
        if (!rest_url) return;
        fetch(`${rest_url}myddpc/v2/dimensions/years`, { headers: { 'X-WP-Nonce': nonce } })
            .then(res => res.json()).then(setYears);
    }, [rest_url, nonce]);

    useEffect(() => {
        if (selection.year) {
            fetch(`${rest_url}myddpc/v2/dimensions/makes?year=${selection.year}`, { headers: { 'X-WP-Nonce': nonce } })
                .then(res => res.json()).then(setMakes);
        }
    }, [selection.year, rest_url, nonce]);

    useEffect(() => {
        if (selection.make) {
            fetch(`${rest_url}myddpc/v2/dimensions/models?year=${selection.year}&make=${selection.make}`, { headers: { 'X-WP-Nonce': nonce } })
                .then(res => res.json()).then(setModels);
        }
    }, [selection.make, rest_url, nonce]);

    useEffect(() => {
        if (selection.model) {
            fetch(`${rest_url}myddpc/v2/dimensions/trims?year=${selection.year}&make=${selection.make}&model=${selection.model}`, { headers: { 'X-WP-Nonce': nonce } })
                .then(res => res.json()).then(setTrims);
        }
    }, [selection.model, rest_url, nonce]);


    const handleFetchPerformance = () => {
        const { year, make, model, trim } = selection;
        if (year && make && model && trim && rest_url) {
            setLoading(true);
            // **NOTE**: Calling the 'performance' endpoint
            fetch(`${rest_url}myddpc/v2/performance/vehicle?year=${year}&make=${make}&model=${model}&trim=${trim}`, { headers: { 'X-WP-Nonce': nonce } })
                .then(res => res.json())
                .then(setPerformanceData)
                .finally(() => setLoading(false));
        }
    };

    const isFetchable = selection.year && selection.make && selection.model && selection.trim;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <PageHeader title="Performance Analysis" subtitle="Analyze vehicle performance and efficiency metrics" />
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    {/* Dropdowns */}
                    <select value={selection.year} onChange={(e) => handleSelectionChange('year', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                        <option value="">Select Year</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select value={selection.make} onChange={(e) => handleSelectionChange('make', e.target.value)} disabled={!selection.year} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100">
                        <option value="">Select Make</option>
                        {makes.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select value={selection.model} onChange={(e) => handleSelectionChange('model', e.target.value)} disabled={!selection.make} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100">
                        <option value="">Select Model</option>
                        {models.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select value={selection.trim} onChange={(e) => handleSelectionChange('trim', e.target.value)} disabled={!selection.model} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100">
                        <option value="">Select Trim</option>
                        {trims.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {/* Fetch Button */}
                    <button onClick={handleFetchPerformance} disabled={!isFetchable || loading} className="w-full bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed">
                        {loading ? 'Loading...' : 'Get Performance'}
                    </button>
                </div>
            </div>

            {performanceData && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">{`Performance Data for ${selection.year} ${selection.make} ${selection.model} (${selection.trim})`}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(performanceData).map(([key, value]) => (
                            <div key={key} className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-sm text-gray-600">{key}</p>
                                <p className="text-lg font-medium text-gray-900">{value || 'N/A'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
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
        // **CORRECTED**: This component now uses the exact data keys from the database objects.
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
                        <div className="flex justify-between"><span className="text-gray-600">Engine:</span><span className="font-medium text-right">{vehicle['Engine size (l)']}L {vehicle.Cylinders}-cyl</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Power:</span><span className="font-medium">{`${vehicle['Horsepower (HP)']} HP`}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Torque:</span><span className="font-medium">{`${vehicle['Torque (ft-lbs)']} ft-lbs`}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Drive:</span><span className="font-medium">{vehicle['Drive type']}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Weight:</span><span className="font-medium">{`${vehicle['Curb weight (lbs)']} lbs`}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">MPG:</span><span className="font-medium">{vehicle['EPA combined MPG']}</span></div>
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
                {[0, 1, 2].map(slot => <CompareSlot key={slot} vehicle={compareVehicles[slot]} onRemove={() => removeFromCompare(compareVehicles[slot].ID)} />)}
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

  // **FINAL CORRECTION**: This effect now applies direct styles to the modal root
  // to enforce its role as a centered overlay container.
  useEffect(() => {
    const modalRoot = document.createElement('div');
    modalRoot.setAttribute('id', 'modal-root');
    
    // Apply styles to make it a full-screen, centered flex container
    Object.assign(modalRoot.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        zIndex: '1000',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        // Initially hidden to prevent flash of empty div
        pointerEvents: 'none'
    });

    document.body.appendChild(modalRoot);

    return () => {
      document.body.removeChild(modalRoot);
    };
  }, []);

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
      case 'performance': return <PerformanceView setActiveView={setActiveView} />;
      case 'dimensions': return <DimensionsView setActiveView={setActiveView} />;
      case 'garage':
        return garageView === 'vehicle-detail'
          ? <VehicleDetailView setGarageView={setGarageView} />
          : <GarageOverview setActiveView={setActiveView} setGarageView={setGarageView} />;
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
