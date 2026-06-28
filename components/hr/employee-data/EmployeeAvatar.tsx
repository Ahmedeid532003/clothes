import React from 'react';
import { mediaUrl } from '@/lib/api/media';
import { initials } from '@/components/hr/employee-data/employee-data-shared';

type Props = {
  fullName: string;
  photoUrl?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
};

const SIZE_CLASS = {
  sm: 'emp-data-avatar-square is-sm',
  md: 'emp-data-avatar-square',
  lg: 'emp-data-avatar-square is-lg',
};

export function EmployeeAvatar({
  fullName,
  photoUrl,
  className = '',
  size = 'md',
  showDot = true,
}: Props) {
  const src = mediaUrl(photoUrl);
  return (
    <span className={`${SIZE_CLASS[size]} ${src ? 'has-photo' : ''} ${className}`.trim()}>
      {src ? (
        <img src={src} alt={fullName} className="emp-data-avatar-img" loading="lazy" />
      ) : (
        initials(fullName)
      )}
      {showDot ? <i className="emp-data-avatar-dot" aria-hidden /> : null}
    </span>
  );
}
