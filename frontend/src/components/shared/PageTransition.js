import { useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';

export default function PageTransition({ children }) {
  const location = useLocation();
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.classList.remove('page-enter');
      // Force reflow
      void ref.current.offsetHeight;
      ref.current.classList.add('page-enter');
    }
  }, [location.pathname]);

  return (
    <div ref={ref} className="page-enter" style={{ width: '100%' }}>
      {children}
    </div>
  );
}
