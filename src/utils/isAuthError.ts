import axios from 'axios';

export const isAuthError = (error: unknown) => {
  if (!axios.isAxiosError(error)) return false;

  const status = error.response?.status;
  const detail = error.response?.data?.detail;

  return (
    status === 401 ||
    detail === 'Token expired' ||
    detail === 'Could not validate credentials'
  );
};