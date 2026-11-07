import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const routeByHistoryIndex = new Map();
const isTransactionDetailPath = (pathname) =>
  /^\/accounts\/[^/]+\/transaction\/[^/]+\/?$/.test(pathname);

const BackButton = ({
  fallback = '/',
  to,
  skipTransactionDetails = false,
  className = '',
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!skipTransactionDetails) return;

    const historyIndex = window.history.state?.idx;
    if (Number.isInteger(historyIndex)) {
      routeByHistoryIndex.set(historyIndex, location.pathname);
    }
  }, [location.key, location.pathname, skipTransactionDetails]);

  const handleBack = () => {
    if (to) {
      navigate(to, { replace: true });
      return;
    }

    const currentIndex = window.history.state?.idx;
    if (skipTransactionDetails && Number.isInteger(currentIndex) && currentIndex > 0) {
      for (let targetIndex = currentIndex - 1; targetIndex >= 0; targetIndex -= 1) {
        const previousPath = routeByHistoryIndex.get(targetIndex);
        if (previousPath && !isTransactionDetailPath(previousPath)) {
          navigate(targetIndex - currentIndex);
          return;
        }
      }

      navigate(fallback, { replace: true });
      return;
    }

    if (Number.isInteger(currentIndex) && currentIndex > 0) {
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  };

  return (
    <button
      type='button'
      onClick={handleBack}
      className={`inline-flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-100 ${className}`}
      aria-label='Go back'
      title='Go back'
    >
      <ArrowLeft size={20} aria-hidden='true' />
    </button>
  );
};

export default BackButton;
