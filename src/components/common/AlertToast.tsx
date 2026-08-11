import { useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './toast.css';

const showAlertToast = (message: string) => {
  const normalizedMessage = message.toLowerCase();

  if (/(failed|error|invalid|cannot|not available|not implemented|must be)/.test(normalizedMessage)) {
    toast.error(message);
  } else if (/(success|successfully|sent|saved|deleted|moved|restored|updated|uploaded|created|starred|unstarred|shared|revoked)/.test(normalizedMessage)) {
    toast.success(message);
  } else if (/(please|warning|limit|exceeds)/.test(normalizedMessage)) {
    toast.warning(message);
  } else {
    toast.info(message);
  }
};

const AlertToast = () => {
  useEffect(() => {
    const nativeAlert = window.alert;

    window.alert = (alertMessage?: unknown) => {
      showAlertToast(String(alertMessage ?? ''));
    };

    return () => {
      window.alert = nativeAlert;
    };
  }, []);

  return (
    <ToastContainer
      position="top-right"
      autoClose={3500}
      closeOnClick
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
    />
  );
};

export default AlertToast;
