import React, { useState } from 'react';
import { Headphones, MapPin, Phone, Mail, CheckCircle2, Send } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useAppStore } from '../../store/useAppStore';

export const StateProblemSolving = () => {
  const { user } = useAppStore();
  const [submitted, setSubmitted] = useState(false);
  const [problemText, setProblemText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setProblemText('');
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="space-y-6 w-full animate-fade-in pb-10">
      <div>
        <span className="text-xs font-semibold text-agri-light uppercase tracking-wider">Expert Support</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-agri-dark mt-0.5">State-wise Problem Solving</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Escalate unresolved field issues directly to state agricultural departments & KVK experts</p>
      </div>

      {submitted && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Ticket #KVK- {user?.state?.replace(/\s+/g, '') || 'TamilNadu'}-{Math.floor(Math.random() * 9000) + 1000} submitted! An agricultural officer will contact you within 24 hours.</span>
        </div>
      )}

      {/* State Helplines & Officers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card hover={false} className="p-5 border border-gray-200 bg-white">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">State Headquarters</span>
              <h3 className="text-sm font-bold text-agri-dark mt-1.5">{user?.state || 'Tamil Nadu'} Krishi Vigyan Kendra (KVK)</h3>
              <p className="text-xs text-gray-500 mt-0.5">{user?.district || 'Thanjavur'} District Advisory Unit</p>
            </div>
            <Phone className="w-5 h-5 text-agri-primary" />
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5 text-xs text-gray-600">
            <p><strong>Lead Officer:</strong> Dr. S. Anbazhagan (Senior Agronomist)</p>
            <p><strong>Toll-Free Helpline:</strong> <a href="tel:18001801551" className="text-agri-primary font-bold hover:underline">1800-180-1551</a></p>
            <p><strong>Email:</strong> kvk.thanjavur@tnau.ac.in</p>
          </div>
        </Card>

        <Card hover={false} className="p-5 border border-gray-200 bg-white">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-blue-700 uppercase bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">National Farmers Portal</span>
              <h3 className="text-sm font-bold text-agri-dark mt-1.5">Kisan Call Centre (KCC)</h3>
              <p className="text-xs text-gray-500 mt-0.5">24x7 Government Agricultural Helpline</p>
            </div>
            <Headphones className="w-5 h-5 text-blue-600" />
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5 text-xs text-gray-600">
            <p><strong>Languages:</strong> Tamil, English, Hindi, Telugu, Malayalam</p>
            <p><strong>Toll-Free Helpline:</strong> <a href="tel:1551" className="text-blue-600 font-bold hover:underline">1551 (Toll Free)</a></p>
            <p><strong>Operational Hours:</strong> 6:00 AM to 10:00 PM Daily</p>
          </div>
        </Card>
      </div>

      {/* Escalation Form */}
      <Card hover={false} className="p-6">
        <h3 className="text-sm font-bold text-agri-dark mb-4 border-b pb-2">Submit Unresolved Issue to State Expert</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Farmer Name" value={user?.name || 'User'} readOnly />
            <Input label="State & District" value={user?.location || 'Tamil Nadu, India'} readOnly />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Issue Category</label>
            <Select
              options={[
                { value: 'disease', label: 'Unidentified Leaf Disease / Pest Outbreak' },
                { value: 'soil', label: 'Soil Salinity & Nutrient Deficit' },
                { value: 'subsidy', label: 'Government Subsidy Claim Delay' },
                { value: 'irrigation', label: 'Water Canal / Borewell Dispute' }
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Describe Problem & Symptoms</label>
            <textarea
              required
              rows={4}
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              placeholder="Describe symptoms, affected land area, and previous treatments tried..."
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-agri-primary"
            />
          </div>

          <Button type="submit" variant="primary" icon={Send} size="lg">
            Submit Issue to Officer
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default StateProblemSolving;
