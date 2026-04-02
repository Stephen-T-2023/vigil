/* ============================================
   Skeleton.jsx
   Vigil — Ashborne
   Reusable skeleton loader component.
   ============================================ */

import styles from '../styles/Skeleton.module.css'

export default function Skeleton({ width, height, className }) {
  return (
    <div
      className={`${styles.skeleton} ${className || ''}`}
      style={{
        width: width || '100%',
        height: height || '1rem',
      }}
    />
  )
}