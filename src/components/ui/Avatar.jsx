import React, { useState, useEffect } from 'react';

export const Avatar = ({ user, className = '' }) => {
  const [imageError, setImageError] = useState(false);

  // Reset image error if user avatar URL changes
  useEffect(() => {
    setImageError(false);
  }, [user?.avatar]);

  const getInitials = (name) => {
    if (!name) return 'U';
    const strName = typeof name === 'string' ? name : String(name || '');
    const parts = strName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return (parts[0].substring(0, 2) || 'U').toUpperCase();
    return ((parts[0][0] || '') + (parts[parts.length - 1][0] || '')).toUpperCase() || 'U';
  };

  const hasAvatar = typeof user?.avatar === 'string' && user.avatar.trim() !== '';

  if (hasAvatar && !imageError) {
    return (
      <img
        src={user.avatar}
        alt={user?.name || user?.displayName || 'User'}
        className={`object-cover ${className}`}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div className={`flex items-center justify-center bg-emerald-600 text-white font-bold tracking-wider ${className}`}>
      {getInitials(user?.name || user?.displayName)}
    </div>
  );
};

export default Avatar;
