import React, { useState, useEffect } from 'react';

export const Avatar = ({ user, className = '' }) => {
  const [imageError, setImageError] = useState(false);

  // Reset image error if user avatar URL changes
  useEffect(() => {
    setImageError(false);
  }, [user?.avatar]);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const hasAvatar = user?.avatar && user.avatar.trim() !== '';

  if (hasAvatar && !imageError) {
    return (
      <img
        src={user.avatar}
        alt={user?.name || 'User'}
        className={`object-cover ${className}`}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div className={`flex items-center justify-center bg-emerald-600 text-white font-bold tracking-wider ${className}`}>
      {getInitials(user?.name)}
    </div>
  );
};

export default Avatar;
