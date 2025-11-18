'use client';

import { useState } from 'react';
import MobileHeader from './MobileHeader';
import Navigation from './Navigation';

export default function MobileLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <MobileHeader onMenuToggle={setIsMobileMenuOpen} />
      <Navigation 
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  );
}

