import React, { useState, useEffect } from 'react';
import { User, MapPin, Sprout, Save, CheckCircle2, Award, LogOut, Camera, AlertCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import LogoutModal from '../components/ui/LogoutModal';
import ProfileCropModal from '../components/ui/ProfileCropModal';
import { Avatar } from '../components/ui/Avatar';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../hooks/useTranslation';
import { profileApi } from '../services/api';
import { getStatesAndUTs, getDistrictsByState } from '../data/indiaLocations';

export const Profile = () => {
  const { user, updateUserProfile, updateSmartContext } = useAppStore();
  const { t } = useTranslation();
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState(null);
  const [avatarError, setAvatarError] = useState('');
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    village: user?.village || '',
    district: user?.district || '',
    state: user?.state || '',
    location: user?.location || '',
    landSize: user?.landSize || '',
    primaryCrop: user?.primaryCrop || '',
    secondaryCrop: user?.secondaryCrop || '',
    season: user?.season || '',
    soilType: user?.soilType || '',
    language: user?.language || 'English'
  });
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        village: user.village || '',
        district: user.district || '',
        state: user.state || '',
        location: user.location || '',
        landSize: user.landSize || '',
        primaryCrop: user.primaryCrop || '',
        secondaryCrop: user.secondaryCrop || '',
        season: user.season || '',
        soilType: user.soilType || '',
        irrigationType: user.irrigationType || 'Drip',
        waterAvailability: user.waterAvailability || 'Medium',
        farmingExperience: user.farmingExperience || '5–10 years',
        language: user.language || 'English'
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await updateUserProfile(formData);
    if (updateSmartContext) {
      await updateSmartContext(formData);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    // Security & File Type Validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setAvatarError('Invalid file format. Please select a JPG, JPEG, PNG, or WEBP image.');
      setTimeout(() => setAvatarError(''), 4500);
      return;
    }

    // Size Limit Validation (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setAvatarError('File is too large. Maximum allowed size is 10MB.');
      setTimeout(() => setAvatarError(''), 4500);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImageSrc(reader.result);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmCrop = async (croppedBlobFile) => {
    setUploading(true);
    try {
      const res = await profileApi.uploadAvatar(croppedBlobFile, user?.id);
      if (res.success && res.avatarUrl) {
        await updateUserProfile({ avatar: res.avatarUrl });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setAvatarError(res.error || 'Failed to upload photo. Please try again.');
        setTimeout(() => setAvatarError(''), 4500);
        throw new Error(res.error || 'Failed to upload photo');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 w-full animate-fade-in pb-10">
      <LogoutModal isOpen={logoutModalOpen} onClose={() => setLogoutModalOpen(false)} />
      <ProfileCropModal
        isOpen={cropModalOpen}
        imageSrc={selectedImageSrc}
        onClose={() => setCropModalOpen(false)}
        onConfirm={handleConfirmCrop}
      />
      <div>
        <span className="text-xs font-semibold text-agri-light uppercase tracking-wider">Account</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-agri-dark mt-0.5">{t('nav_profile', 'Farmer Profile')}</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage your farm parameters, crop details, and regional settings</p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Profile updated & synchronized with Firestore successfully!</span>
        </div>
      )}

      {avatarError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{avatarError}</span>
        </div>
      )}

      {/* Top Profile Summary Card */}
      <Card hover={false} className="p-6 bg-gradient-to-r from-agri-dark to-agri-primary text-white">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative group">
            <Avatar user={user} className="w-20 h-20 rounded-full border-4 border-white/20 shadow-md text-3xl" />
            <label className="absolute bottom-0 right-0 p-1.5 bg-agri-primary text-white rounded-full cursor-pointer hover:bg-agri-dark shadow-xs transition">
              <Camera className="w-3.5 h-3.5" />
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/jpg, image/webp" 
                onChange={handleFileSelect} 
                className="hidden" 
              />
            </label>
          </div>

          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-bold">{formData.name}</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#8BC34A] text-agri-dark text-xs font-extrabold flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /> Premium Farmer
              </span>
            </div>
            <p className="text-xs text-gray-200 mt-1 flex items-center justify-center sm:justify-start gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#8BC34A]" /> {formData.village ? `${formData.village}, ` : ''}{formData.district ? `${formData.district}, ` : ''}{formData.state || 'Location not specified'}
            </p>
            <p className="text-xs text-emerald-200 mt-2">Member since Kharif 2023 • ID: AGR-884920 {uploading && '• Uploading photo...'}</p>
          </div>
        </div>
      </Card>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card hover={false} className="space-y-4 p-6">
          <h3 className="text-sm font-bold text-agri-dark border-b pb-2 flex items-center gap-2">
            <User className="w-4 h-4 text-agri-primary" /> Personal & Contact Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t('full_name')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="Village / Taluk"
              value={formData.village}
              onChange={(e) => setFormData({ ...formData, village: e.target.value })}
            />
            <Select
              label="State / UT"
              value={formData.state || 'Tamil Nadu'}
              onChange={(e) => {
                const newState = e.target.value;
                const districts = getDistrictsByState(newState);
                const newDist = districts[0] || '';
                setFormData({
                  ...formData,
                  state: newState,
                  district: newDist,
                  location: `${newDist}, ${newState}, India`
                });
              }}
              options={getStatesAndUTs().map(st => ({ value: st, label: st }))}
            />
            <Select
              label="District"
              value={formData.district || 'Thanjavur'}
              onChange={(e) => {
                const newDist = e.target.value;
                setFormData({
                  ...formData,
                  district: newDist,
                  location: `${newDist}, ${formData.state || 'Tamil Nadu'}, India`
                });
              }}
              options={getDistrictsByState(formData.state || 'Tamil Nadu').map(d => ({ value: d, label: d }))}
            />
          </div>
        </Card>

        <Card hover={false} className="space-y-4 p-6">
          <h3 className="text-sm font-bold text-agri-dark border-b pb-2 flex items-center gap-2">
            <Sprout className="w-4 h-4 text-agri-primary" /> Agricultural Parameters
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Land Size"
              value={formData.landSize}
              onChange={(e) => setFormData({ ...formData, landSize: e.target.value })}
              options={[
                { value: '1.0 Acre', label: '1.0 Acre' },
                { value: '2.5 Acres', label: '2.5 Acres' },
                { value: '5.0 Acres', label: '5.0 Acres' },
                { value: '10.0+ Acres', label: '10.0+ Acres' },
              ]}
            />

            <Select
              label="Primary Crop"
              value={formData.primaryCrop}
              onChange={(e) => setFormData({ ...formData, primaryCrop: e.target.value })}
              options={[
                { value: 'Paddy', label: 'Paddy (Rice)' },
                { value: 'Wheat', label: 'Wheat' },
                { value: 'Cotton', label: 'Cotton' },
                { value: 'Sugarcane', label: 'Sugarcane' },
                { value: 'Maize', label: 'Maize' },
              ]}
            />

            <Select
              label="Current Season"
              value={formData.season}
              onChange={(e) => setFormData({ ...formData, season: e.target.value })}
              options={[
                { value: 'Kharif 2024', label: 'Kharif 2024' },
                { value: 'Rabi 2024', label: 'Rabi 2024' },
                { value: 'Zaid 2024', label: 'Zaid 2024' },
              ]}
            />

            <Select
              label="Soil Type"
              value={formData.soilType}
              onChange={(e) => setFormData({ ...formData, soilType: e.target.value })}
              options={[
                { value: 'Clay Loam', label: 'Clay Loam' },
                { value: 'Alluvial Soil', label: 'Alluvial Soil' },
                { value: 'Black Cotton Soil', label: 'Black Cotton Soil' },
                { value: 'Red Soil', label: 'Red Soil' },
                { value: 'Sandy Loam', label: 'Sandy Loam' },
              ]}
            />

            <Select
              label="Irrigation System"
              value={formData.irrigationType}
              onChange={(e) => setFormData({ ...formData, irrigationType: e.target.value })}
              options={[
                { value: 'Drip', label: 'Drip Irrigation' },
                { value: 'Sprinkler', label: 'Sprinkler Irrigation' },
                { value: 'Canal', label: 'Canal Irrigation' },
                { value: 'Borewell', label: 'Borewell Irrigation' },
                { value: 'Rainfed', label: 'Rainfed Irrigation' },
                { value: 'Other', label: 'Other' },
              ]}
            />

            <Select
              label="Water Availability"
              value={formData.waterAvailability}
              onChange={(e) => setFormData({ ...formData, waterAvailability: e.target.value })}
              options={[
                { value: 'Low', label: 'Low Water Supply' },
                { value: 'Medium', label: 'Medium Water Supply' },
                { value: 'High', label: 'High Water Supply' },
              ]}
            />

            <Select
              label="Farming Experience"
              value={formData.farmingExperience}
              onChange={(e) => setFormData({ ...formData, farmingExperience: e.target.value })}
              options={[
                { value: 'Less than 5 years', label: 'Less than 5 years' },
                { value: '5–10 years', label: '5–10 years' },
                { value: 'More than 10 years', label: 'More than 10 years' },
              ]}
            />
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={() => setLogoutModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs sm:text-sm border border-red-200 transition flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-red-600" />
            <span>{t('logout')}</span>
          </button>

          <Button type="submit" variant="primary" icon={Save} size="lg">
            {t('save')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
