import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BackButton = ({ fallback = '/', className = '' }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.state?.idx > 0) {
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
