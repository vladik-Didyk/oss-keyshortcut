import { useState } from 'react'
import { slugToIconName, getIconData } from '../../utils/directoryHelpers'

// `loading`: "lazy" for the icons of a list; "eager" for the one icon at the top of a page.
export default function AppIcon({ slug, displayName, size = 48, className = '', loading = 'lazy' }) {
  const [imgError, setImgError] = useState(false)
  const iconName = slugToIconName[slug] || displayName
  const data = getIconData(iconName)

  if (data.type === 'image' && !imgError) {
    return (
      <img
        decoding="async"
        src={data.src}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 ${className}`}
        aria-hidden="true"
        loading={loading}
        onError={() => setImgError(true)}
      />
    )
  }

  const label = data.type === 'fallback' ? data.label : (iconName || displayName || '?')[0]
  const hex = data.type === 'fallback' ? data.hex : '86868b'

  return (
    <span
      className={`rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.35,
        backgroundColor: `#${hex}`,
      }}
      aria-hidden="true"
    >
      {label}
    </span>
  )
}
