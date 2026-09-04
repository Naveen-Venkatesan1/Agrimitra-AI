import React, { useState, useEffect, useRef } from 'react';
import { Calculator, Database, Printer, TrendingUp, AlertTriangle, Scale, Sprout, MapPin, IndianRupee } from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { useAppStore } from '../../store/useAppStore';
import { fetchCropProductionStats } from '../../services/cropApi';
import { useTranslation } from '../../hooks/useTranslation';
import { CROP_FINANCIALS, getCropFinancials } from '../../data/cropFinancials';
import { getStatesAndUTs, getDistrictsByState } from '../../data/indiaLocations';

export const FinancialViability = () => {
  const { user, selectedState, selectedDistrict, setGlobalSelection } = useAppStore();
  const { t } = useTranslation();
  
  const [cropStats, setCropStats] = useState(null);
  const printRef = useRef();

  // Local State representing the farm
  const [crop, setCrop] = useState(user?.primaryCrop || "Paddy (Rice)");
  const [landAcres, setLandAcres] = useState(user?.landSize ? parseFloat(user.landSize) || 2.5 : 2.5);
  
  // Scenarios
  const [priceModifier, setPriceModifier] = useState(0); // -10, 0, +10
  const [yieldModifier, setYieldModifier] = useState(0); // -20, 0, +20
  const [costModifier, setCostModifier] = useState(0); // -15, 0, +15

  // Inputs
  const [seedCost, setSeedCost] = useState(0);
  const [fertilizerCost, setFertilizerCost] = useState(0);
  const [irrigationCost, setIrrigationCost] = useState(0);
  const [laborCost, setLaborCost] = useState(0);

  // Sync with defaults when crop changes
  useEffect(() => {
    const fin = getCropFinancials(crop);
    setSeedCost(fin.baselineCosts.seed);
    setFertilizerCost(fin.baselineCosts.fertilizer);
    setIrrigationCost(fin.baselineCosts.irrigation);
    setLaborCost(fin.baselineCosts.labor);
  }, [crop]);

  // Fetch API Stats
  useEffect(() => {
    fetchCropProductionStats(selectedState, crop)
      .then(res => setCropStats(res?.records?.[0] || null));
  }, [selectedState, crop]);

  // Calculations
  const fin = getCropFinancials(crop);
  
  // Base Inputs
  const baseYieldPerAcre = fin.expectedYieldPerAcre;
  const baseTotalYield = baseYieldPerAcre * landAcres;
  const basePrice = fin.mspPerQuintal;

  // Modified Inputs (Scenarios)
  const actualYieldPerAcre = baseYieldPerAcre * (1 + yieldModifier / 100);
  const actualTotalYield = actualYieldPerAcre * landAcres;
  const actualPrice = basePrice * (1 + priceModifier / 100);
  
  const baseTotalCost = (Number(seedCost) + Number(fertilizerCost) + Number(irrigationCost) + Number(laborCost)) * Number(landAcres);
  const actualTotalCost = baseTotalCost * (1 + costModifier / 100);

  // Results
  const estimatedRevenue = actualTotalYield * actualPrice;
  const netProfit = estimatedRevenue - actualTotalCost;
  const marginPercent = estimatedRevenue > 0 ? ((netProfit / estimatedRevenue) * 100).toFixed(1) : 0;
  const isLoss = netProfit < 0;

  // Break-even
  const breakEvenYieldTotal = actualPrice > 0 ? actualTotalCost / actualPrice : 0;
  const breakEvenYieldPerAcre = landAcres > 0 ? breakEvenYieldTotal / landAcres : 0;
  const breakEvenPrice = actualTotalYield > 0 ? actualTotalCost / actualTotalYield : 0;

  // Risk Indicators
  const priceRisk = breakEvenPrice > actualPrice * 0.9 ? 'High' : breakEvenPrice > actualPrice * 0.6 ? 'Moderate' : 'Low';
  const yieldRisk = yieldModifier < 0 ? 'High' : (cropStats ? 'Low' : 'Moderate');
  const costRisk = costModifier > 0 ? 'High' : 'Low';

  const getRiskColor = (risk) => {
    if (risk === 'High') return 'text-red-600 bg-red-50 border-red-200';
    if (risk === 'Moderate') return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  };

  const handlePrint = () => {
    window.print();
  };

  const stateOptions = getStatesAndUTs();
  const districtOptions = getDistrictsByState(selectedState);
  const cropOptions = Object.keys(CROP_FINANCIALS);

  const handleStateChange = (newState) => {
    const districts = getDistrictsByState(newState);
    setGlobalSelection(newState, districts[0] || '');
  };

  return (
    <div className="w-full animate-fade-in pb-10" ref={printRef}>
      
      {/* SCREEN UI - HIDDEN DURING PRINT */}
      <div className="print:hidden space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-agri-light uppercase tracking-wider">Agri Financials & Benchmarks</span>
              {cropStats && (
                <Badge variant="good" size="xs">
                  <Database className="w-3 h-3" /> API Sync ({cropStats.yield_kg_per_ha} kg/ha)
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-agri-dark mt-0.5">Financial Economics Analytics</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl">
              Simulate farm cultivation costs, yield forecasts, MSP market rates, and projected net profitability for {selectedDistrict}, {selectedState}.
            </p>
          </div>
          
          <Button variant="outline" size="sm" icon={Printer} onClick={handlePrint} className="shadow-sm border-agri-primary text-agri-primary hover:bg-agri-primary hover:text-white transition">
            Print / Save PDF
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: Inputs */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Farm Setup Card */}
            <Card hover={false} className="p-6">
              <h3 className="text-sm font-bold text-agri-dark border-b pb-3 mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-agri-primary" /> Location & Crop Parameters
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SearchableSelect
                  label="State / UT"
                  value={selectedState}
                  onChange={handleStateChange}
                  options={stateOptions}
                  placeholder="State"
                  icon={MapPin}
                />
                <SearchableSelect
                  label="District"
                  value={selectedDistrict}
                  onChange={(dist) => setGlobalSelection(selectedState, dist)}
                  options={districtOptions}
                  placeholder="District"
                  icon={MapPin}
                />
                <SearchableSelect
                  label="Primary Crop"
                  value={crop}
                  onChange={setCrop}
                  options={cropOptions}
                  placeholder="Crop"
                  icon={Sprout}
                />
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Land Size (Acres)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={landAcres}
                    onChange={(e) => setLandAcres(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-agri-primary"
                  />
                </div>
              </div>
            </Card>

            {/* Cost Inputs */}
            <Card hover={false} className="p-6">
              <h3 className="text-sm font-bold text-agri-dark border-b pb-3 mb-4 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-agri-primary" /> Cost Inputs (₹ / Acre)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Seed / Seedling Cost" type="number" min="0" value={seedCost} onChange={(e) => setSeedCost(Math.max(0, Number(e.target.value)))} />
                <Input label="Fertilizers & Pesticides" type="number" min="0" value={fertilizerCost} onChange={(e) => setFertilizerCost(Math.max(0, Number(e.target.value)))} />
                <Input label="Irrigation / Power" type="number" min="0" value={irrigationCost} onChange={(e) => setIrrigationCost(Math.max(0, Number(e.target.value)))} />
                <Input label="Labor & Machinery" type="number" min="0" value={laborCost} onChange={(e) => setLaborCost(Math.max(0, Number(e.target.value)))} />
              </div>
            </Card>

            {/* Scenarios */}
            <Card hover={false} className="p-6">
              <h3 className="text-sm font-bold text-agri-dark border-b pb-3 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-agri-primary" /> What-If Scenario Analysis
              </h3>
              
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-700 w-32">Market Price</span>
                  <div className="flex gap-2 flex-1">
                    {[-10, 0, 10].map(val => (
                      <button key={`price-${val}`} onClick={() => setPriceModifier(val)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${priceModifier === val ? 'bg-agri-primary text-white border-agri-primary' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                        {val === 0 ? 'Base' : `${val > 0 ? '+' : ''}${val}%`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-700 w-32">Expected Yield</span>
                  <div className="flex gap-2 flex-1">
                    {[-20, 0, 20].map(val => (
                      <button key={`yield-${val}`} onClick={() => setYieldModifier(val)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${yieldModifier === val ? 'bg-agri-primary text-white border-agri-primary' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                        {val === 0 ? 'Base' : `${val > 0 ? '+' : ''}${val}%`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-700 w-32">Input Costs</span>
                  <div className="flex gap-2 flex-1">
                    {[-15, 0, 15].map(val => (
                      <button key={`cost-${val}`} onClick={() => setCostModifier(val)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${costModifier === val ? 'bg-agri-primary text-white border-agri-primary' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                        {val === 0 ? 'Base' : `${val > 0 ? '+' : ''}${val}%`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

          </div>

          {/* RIGHT COLUMN: Results */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Main Financial Result Card */}
            <Card hover={false} className={`p-6 text-white flex flex-col justify-between shadow-xl border-0 ${isLoss ? 'bg-gradient-to-br from-red-900 to-red-800' : 'bg-gradient-to-br from-[#0B3D2E] to-[#0F4D3A]'}`}>
              <div>
                <div className="flex items-center justify-between border-b border-white/15 pb-2 mb-4">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isLoss ? 'text-red-200' : 'text-[#8BC34A]'}`}>
                    Financial Forecast ({crop})
                  </span>
                  <span className="text-xs text-white/80 font-medium">For {landAcres} Acres</span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs text-white/80">Total Input Expense:</span>
                    <span className="text-base font-bold text-red-300">₹{actualTotalCost.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs text-white/80">Estimated Gross Revenue:</span>
                    <span className="text-base font-bold text-emerald-300">₹{estimatedRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                  </div>

                  <div className="pt-2">
                    <span className="text-xs text-white/80">{isLoss ? 'Net Estimated Loss:' : 'Net Estimated Profit:'}</span>
                    <div className={`text-3xl font-black mt-0.5 ${isLoss ? 'text-red-400' : 'text-[#8BC34A]'}`}>
                      {isLoss ? '-' : ''}₹{Math.abs(netProfit).toLocaleString(undefined, {maximumFractionDigits: 0})}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/20 flex items-center justify-between">
                <Badge variant="outline" size="md" className={isLoss ? 'border-red-300 text-red-200' : 'border-[#8BC34A]/50 text-[#8BC34A]'}>
                  Margin: {marginPercent}%
                </Badge>
                <span className="text-[10px] sm:text-xs text-white/70 font-semibold">Ref: ₹{actualPrice.toLocaleString(undefined, {maximumFractionDigits: 0})} / Q</span>
              </div>
            </Card>

            {/* Yield Forecast */}
            <Card hover={false} className="p-6">
              <h3 className="text-sm font-bold text-agri-dark border-b pb-3 mb-4 flex items-center gap-2">
                <Sprout className="w-4 h-4 text-agri-primary" /> Yield Forecast
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase">Yield Per Acre</p>
                  <p className="text-sm font-bold text-agri-dark mt-1">{actualYieldPerAcre.toFixed(1)} Quintals</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                  <p className="text-[10px] font-semibold text-emerald-700 uppercase">Total Expected Yield</p>
                  <p className="text-sm font-bold text-agri-dark mt-1">{actualTotalYield.toFixed(1)} Quintals</p>
                </div>
              </div>
            </Card>

            {/* Break Even Analysis */}
            <Card hover={false} className="p-6">
              <h3 className="text-sm font-bold text-agri-dark border-b pb-3 mb-4 flex items-center gap-2">
                <Scale className="w-4 h-4 text-agri-primary" /> Break-Even Analysis
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-600">Break-even Yield (Total)</span>
                  <span className="text-sm font-bold text-agri-dark">{breakEvenYieldTotal.toFixed(1)} Quintals</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-600">Minimum Selling Price</span>
                  <span className="text-sm font-bold text-agri-dark">₹{breakEvenPrice.toFixed(0)} / Q</span>
                </div>
                <p className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-100 leading-relaxed">
                  Your farm needs to achieve <strong>{breakEvenYieldTotal.toFixed(1)} quintals</strong> or sell above <strong>₹{breakEvenPrice.toFixed(0)}/quintal</strong> to cover estimated cultivation costs.
                </p>
              </div>
            </Card>

            {/* Risk Indicators */}
            <Card hover={false} className="p-5 flex items-center justify-between gap-2">
              <div className="text-center flex-1 border-r pr-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Price Risk</p>
                <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md border ${getRiskColor(priceRisk)}`}>{priceRisk}</span>
              </div>
              <div className="text-center flex-1 border-r px-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Yield Risk</p>
                <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md border ${getRiskColor(yieldRisk)}`}>{yieldRisk}</span>
              </div>
              <div className="text-center flex-1 pl-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Cost Risk</p>
                <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md border ${getRiskColor(costRisk)}`}>{costRisk}</span>
              </div>
            </Card>

          </div>
        </div>
      </div>

      {/* DEDICATED PRINT / PDF REPORT VIEW - ONLY VISIBLE DURING PRINT */}
      <div className="hidden print:block w-full max-w-4xl mx-auto bg-white text-black font-sans">
        
        {/* Print Header */}
        <div className="border-b-2 border-agri-dark pb-4 mb-6">
          <h1 className="text-3xl font-black text-agri-dark uppercase tracking-wider">AGriMITRA AI</h1>
          <p className="text-sm font-semibold text-emerald-700">Smart Farming. Better Tomorrow</p>
        </div>

        {/* Report Title & Metadata */}
        <div className="mb-8">
          <h2 className="text-xl font-bold uppercase border-b pb-2 mb-4">Farm Financial Economics Report</h2>
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div>
              <p className="text-gray-500 font-semibold uppercase text-xs">Report Type</p>
              <p className="font-bold">Cultivation Cost & Profitability Statement</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-xs">Report Date</p>
              <p className="font-bold">{new Date().toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-xs">Location</p>
              <p className="font-bold">{selectedDistrict}, {selectedState}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-xs">Crop & Land Size</p>
              <p className="font-bold">{crop} • {landAcres} Acres</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-xs">Season</p>
              <p className="font-bold">{user?.season || 'Kharif'}</p>
            </div>
          </div>
        </div>

        {/* Cost Breakdown Table */}
        <div className="mb-8">
          <h3 className="text-lg font-bold bg-gray-100 p-2 border-l-4 border-agri-dark mb-4">CULTIVATION COST BREAKDOWN</h3>
          <table className="w-full text-sm border-collapse border border-gray-300">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="border border-gray-300 p-2 w-12 text-center">S.No</th>
                <th className="border border-gray-300 p-2">Cost Category</th>
                <th className="border border-gray-300 p-2 text-right">Rate / Acre</th>
                <th className="border border-gray-300 p-2 text-right">Area</th>
                <th className="border border-gray-300 p-2 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-2 text-center">1</td>
                <td className="border border-gray-300 p-2">Seed Cost</td>
                <td className="border border-gray-300 p-2 text-right">₹{seedCost.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                <td className="border border-gray-300 p-2 text-right">{landAcres} Acres</td>
                <td className="border border-gray-300 p-2 text-right">₹{(seedCost * landAcres).toLocaleString(undefined, {maximumFractionDigits:0})}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">2</td>
                <td className="border border-gray-300 p-2">Fertilizer Cost</td>
                <td className="border border-gray-300 p-2 text-right">₹{fertilizerCost.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                <td className="border border-gray-300 p-2 text-right">{landAcres} Acres</td>
                <td className="border border-gray-300 p-2 text-right">₹{(fertilizerCost * landAcres).toLocaleString(undefined, {maximumFractionDigits:0})}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">3</td>
                <td className="border border-gray-300 p-2">Irrigation / Power</td>
                <td className="border border-gray-300 p-2 text-right">₹{irrigationCost.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                <td className="border border-gray-300 p-2 text-right">{landAcres} Acres</td>
                <td className="border border-gray-300 p-2 text-right">₹{(irrigationCost * landAcres).toLocaleString(undefined, {maximumFractionDigits:0})}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">4</td>
                <td className="border border-gray-300 p-2">Labour Cost</td>
                <td className="border border-gray-300 p-2 text-right">₹{laborCost.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                <td className="border border-gray-300 p-2 text-right">{landAcres} Acres</td>
                <td className="border border-gray-300 p-2 text-right">₹{(laborCost * landAcres).toLocaleString(undefined, {maximumFractionDigits:0})}</td>
              </tr>
            </tbody>
            <tfoot className="bg-gray-100 font-bold">
              <tr>
                <td colSpan="4" className="border border-gray-300 p-2 text-right uppercase tracking-wider">Total Cultivation Cost</td>
                <td className="border border-gray-300 p-2 text-right text-base">₹{actualTotalCost.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Projected Revenue */}
        <div className="mb-8">
          <h3 className="text-lg font-bold bg-gray-100 p-2 border-l-4 border-agri-dark mb-4">PROJECTED REVENUE</h3>
          <div className="grid grid-cols-2 gap-4 text-sm border border-gray-300 p-4 rounded bg-gray-50">
            <div>
              <p className="text-gray-500 font-semibold uppercase text-xs mb-1">Crop</p>
              <p className="font-bold">{crop}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-xs mb-1">Estimated Yield</p>
              <p className="font-bold">{actualTotalYield.toFixed(1)} Quintals</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-xs mb-1">MSP / Market Rate</p>
              <p className="font-bold">₹{actualPrice.toLocaleString(undefined, {maximumFractionDigits:0})} / Quintal</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-xs mb-1">Estimated Gross Revenue</p>
              <p className="font-bold text-lg text-emerald-800">₹{estimatedRevenue.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
            </div>
          </div>
        </div>

        {/* Profitability Summary */}
        <div className="mb-12">
          <h3 className="text-lg font-bold bg-gray-100 p-2 border-l-4 border-agri-dark mb-4">FINANCIAL SUMMARY</h3>
          <div className="border border-gray-300 p-6 rounded bg-gray-50">
            <div className="flex justify-between items-center border-b border-gray-300 pb-3 mb-3">
              <span className="font-semibold text-gray-700">Total Cultivation Cost:</span>
              <span className="font-bold text-red-700 text-lg">₹{actualTotalCost.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-300 pb-3 mb-3">
              <span className="font-semibold text-gray-700">Estimated Gross Revenue:</span>
              <span className="font-bold text-emerald-700 text-lg">₹{estimatedRevenue.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-300 pb-3 mb-3">
              <span className="font-black text-gray-900 text-xl uppercase">Net Estimated {isLoss ? 'Loss' : 'Profit'}:</span>
              <span className={`font-black text-2xl ${isLoss ? 'text-red-700' : 'text-emerald-700'}`}>
                {isLoss ? '-' : ''}₹{Math.abs(netProfit).toLocaleString(undefined, {maximumFractionDigits:0})}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Profitability Margin:</span>
              <span className="font-bold text-lg">{marginPercent}%</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-6 border-t border-gray-300 text-center text-xs text-gray-500 pb-12">
          <p className="font-bold text-gray-700 mb-1">Generated by AGriMitra AI — Smart Farming. Better Tomorrow</p>
          <p>This report is an estimated agricultural financial analysis based on the inputs provided by the farmer.</p>
          <p className="mt-2">Report generated on: {new Date().toLocaleString()}</p>
        </div>
      </div>

      <style jsx="true">{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
          }
          .animate-fade-in {
            animation: none !important;
          }
          /* Hide global layout elements during print */
          header, nav, aside, .sidebar-container, .topbar-container {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default FinancialViability;
