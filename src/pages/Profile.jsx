import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, Sprout, Save, CheckCircle2, Award, LogOut, Camera, AlertCircle, ArrowLeft } from 'lucide-react';
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
  const navigate = useNavigate();
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
    <div className="space-y-3.5 sm:space-y-4 w-full animate-fade-in pb-16 sm:pb-8 font-sans">
      <LogoutModal isOpen={logoutModalOpen} onClose={() => setLogoutModalOpen(false)} />
      <ProfileCropModal
        isOpen={cropModalOpen}
        imageSrc={selectedImageSrc}
        onClose={() => setCropModalOpen(false)}
        onConfirm={handleConfirmCrop}
      />

      {/* 1. TOP BACK BUTTON */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200/90 shadow-2xs hover:bg-gray-50 active:scale-95 transition text-xs font-bold text-gray-700 cursor-pointer"
          aria-label={t('back', 'Back')}
        >
          <ArrowLeft className="w-3.5 h-3.5 text-gray-700 stroke-[2.2]" />
          <span>{t('back', 'Back')}</span>
        </button>
      </div>

      {/* 2. PAGE TITLE & SUBTITLE */}
      <div>
        <span className="text-[11px] font-bold text-agri-light uppercase tracking-wider">{t('account', 'Account')}</span>
        <h1 className="text-xl sm:text-2xl font-extrabold text-agri-dark mt-0.5">{t('farmer_profile', 'Farmer Profile')}</h1>
        <p className="text-xs text-gray-500 mt-0.5">{t('profile_subtitle', 'Manage your farm parameters, crop details, and regional settings')}</p>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{t('profile_sync_success', 'Profile updated & synchronized with Firestore successfully!')}</span>
        </div>
      )}

      {avatarError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{avatarError}</span>
        </div>
      )}

      {/* Top Profile Summary Card */}
      <Card hover={false} className="p-4 sm:p-5 bg-gradient-to-r from-agri-dark to-agri-primary text-white shadow-md">
        <div className="flex flex-col sm:flex-row items-center gap-3.5 sm:gap-4">
          <div className="relative group shrink-0">
            <Avatar user={user} className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-3 border-white/20 shadow-md text-2xl" />
            <label className="absolute bottom-0 right-0 p-1 bg-agri-primary text-white rounded-full cursor-pointer hover:bg-agri-dark shadow-xs transition">
              <Camera className="w-3 h-3" />
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/jpg, image/webp" 
                onChange={handleFileSelect} 
                className="hidden" 
              />
            </label>
          </div>

          <div className="text-center sm:text-left flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
              <h2 className="text-lg sm:text-xl font-bold truncate">{formData.name}</h2>
              <span className="px-2 py-0.5 rounded-full bg-[#8BC34A] text-agri-dark text-[11px] font-extrabold flex items-center gap-1 shrink-0">
                <Award className="w-3 h-3" /> {t('premium_farmer', 'Premium Farmer')}
              </span>
            </div>
            <p className="text-xs text-gray-200 mt-0.5 flex items-center justify-center sm:justify-start gap-1">
              <MapPin className="w-3 h-3 text-[#8BC34A] shrink-0" /> {formData.village ? `${formData.village}, ` : ''}{formData.district ? `${formData.district}, ` : ''}{formData.state || t('location_not_specified', 'Location not specified')}
            </p>
            <p className="text-[11px] sm:text-xs text-emerald-200 mt-1">
              {t('member_since_kharif', 'Member since Kharif 2023 • ID: AGR-884920')} {uploading && `• ${t('uploading_photo', 'Uploading photo...')}`}
            </p>
          </div>
        </div>
      </Card>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
        <Card hover={false} className="space-y-3 p-3.5 sm:p-4.5">
          <h3 className="text-xs sm:text-sm font-bold text-agri-dark border-b pb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-agri-primary shrink-0" /> {t('personal_contact_info', 'Personal & Contact Information')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
            <Input
              label={t('full_name', 'Full Name')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label={t('phone_number', 'Phone Number')}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label={t('village_taluk', 'Village / Taluk')}
              value={formData.village}
              onChange={(e) => setFormData({ ...formData, village: e.target.value })}
            />
            <Select
              label={t('state_ut', 'State / UT')}
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
              label={t('profile_district', 'District')}
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

        <Card hover={false} className="space-y-3 p-3.5 sm:p-4.5">
          <h3 className="text-xs sm:text-sm font-bold text-agri-dark border-b pb-1.5 flex items-center gap-1.5">
            <Sprout className="w-3.5 h-3.5 text-agri-primary shrink-0" /> {t('agricultural_parameters', 'Agricultural Parameters')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
            <Select
              label={t('land_size', 'Land Size')}
              value={formData.landSize}
              onChange={(e) => setFormData({ ...formData, landSize: e.target.value })}
              options={[
                { value: '1.0 Acre', label: t('acre_1', '1.0 Acre') },
                { value: '2.5 Acres', label: t('acre_2_5', '2.5 Acres') },
                { value: '5.0 Acres', label: t('acre_5', '5.0 Acres') },
                { value: '10.0+ Acres', label: t('acre_10_plus', '10.0+ Acres') },
              ]}
            />

            <Select
              label={t('primary_crop', 'Primary Crop')}
              value={formData.primaryCrop}
              onChange={(e) => setFormData({ ...formData, primaryCrop: e.target.value })}
              options={[
                { value: 'Paddy', label: t('crop_paddy', 'Paddy (Rice)') },
                { value: 'Wheat', label: t('crop_wheat', 'Wheat') },
                { value: 'Cotton', label: t('crop_cotton', 'Cotton') },
                { value: 'Sugarcane', label: t('crop_sugarcane', 'Sugarcane') },
                { value: 'Maize', label: t('crop_maize', 'Maize') },
              ]}
            />

            <Select
              label={t('current_season', 'Current Season')}
              value={formData.season}
              onChange={(e) => setFormData({ ...formData, season: e.target.value })}
              options={[
                { value: 'Kharif 2024', label: t('season_kharif_2024', 'Kharif 2024') },
                { value: 'Rabi 2024', label: t('season_rabi_2024', 'Rabi 2024') },
                { value: 'Zaid 2024', label: t('season_zaid_2024', 'Zaid 2024') },
              ]}
            />

            <Select
              label={t('soil_type', 'Soil Type')}
              value={formData.soilType}
              onChange={(e) => setFormData({ ...formData, soilType: e.target.value })}
              options={[
                { value: 'Clay Loam', label: t('soil_clay_loam', 'Clay Loam') },
                { value: 'Alluvial Soil', label: t('soil_alluvial', 'Alluvial Soil') },
                { value: 'Black Cotton Soil', label: t('soil_black_cotton', 'Black Cotton Soil') },
                { value: 'Red Soil', label: t('soil_red', 'Red Soil') },
                { value: 'Sandy Loam', label: t('soil_sandy_loam', 'Sandy Loam') },
              ]}
            />

            <Select
              label={t('irrigation_system', 'Irrigation System')}
              value={formData.irrigationType}
              onChange={(e) => setFormData({ ...formData, irrigationType: e.target.value })}
              options={[
                { value: 'Drip', label: t('irrigation_drip', 'Drip Irrigation') },
                { value: 'Sprinkler', label: t('irrigation_sprinkler', 'Sprinkler Irrigation') },
                { value: 'Canal', label: t('irrigation_canal', 'Canal Irrigation') },
                { value: 'Borewell', label: t('irrigation_borewell', 'Borewell Irrigation') },
                { value: 'Rainfed', label: t('irrigation_rainfed', 'Rainfed Irrigation') },
                { value: 'Other', label: t('irrigation_other', 'Other') },
              ]}
            />

            <Select
              label={t('water_availability', 'Water Availability')}
              value={formData.waterAvailability}
              onChange={(e) => setFormData({ ...formData, waterAvailability: e.target.value })}
              options={[
                { value: 'Low', label: t('water_low', 'Low Water Supply') },
                { value: 'Medium', label: t('water_medium', 'Medium Water Supply') },
                { value: 'High', label: t('water_high', 'High Water Supply') },
              ]}
            />

            <Select
              label={t('farming_experience', 'Farming Experience')}
              value={formData.farmingExperience}
              onChange={(e) => setFormData({ ...formData, farmingExperience: e.target.value })}
              options={[
                { value: 'Less than 5 years', label: t('exp_less_5', 'Less than 5 years') },
                { value: '5–10 years', label: t('exp_5_10', '5–10 years') },
                { value: 'More than 10 years', label: t('exp_more_10', 'More than 10 years') },
              ]}
            />
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => setLogoutModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs sm:text-sm border border-red-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-red-600" />
            <span>{t('logout', 'Logout')}</span>
          </button>

          <Button type="submit" variant="primary" icon={Save} size="md">
            {t('save', 'Save')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
