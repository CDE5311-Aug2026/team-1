import React from 'react';
import { assetFor } from '../data.js';
import './brand-mark.css';

/** One shared silhouette for the app mark and its printed archive stamps. */
export default function BrandMark({ className = '' }) {
  const mask = `url(${JSON.stringify(assetFor('./assets/brand/findsg-merlion-search.png'))})`;
  return <span
    className={['findsg-brand-mark', className].filter(Boolean).join(' ')}
    aria-hidden="true"
    style={{ maskImage: mask, WebkitMaskImage: mask }}
  />;
}
