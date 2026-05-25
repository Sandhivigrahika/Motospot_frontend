//src/api/interceptors.ts

import { api } from './client';

let interceptorId: number | null = null;
let isHandlingUnauthorized = false;


export const setupLogoutInterceptor = ( onUnauthorized: () => void) => {
  if (interceptorId !==null) return;

  interceptorId = api.interceptors.response.use(
    (response) => response,
    async (error) => {
      console.log('🔴 INTERCEPTOR FIRED', error.response?.status, error.response?.data?.detail);
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail;


      console.log('🔴 DETAIL CHECK', detail);


      const isUnauthorized =
        status === 401 ||
        detail === 'Token expired' ||
        detail === 'Could not validate credentials';
      console.log('🔴 IS UNAUTHORIZED?', isUnauthorized);

      if (isUnauthorized && !isHandlingUnauthorized) {

        console.log('🔴 CALLING onUnauthorized');
        
        isHandlingUnauthorized = true;

        try {
          onUnauthorized();
        }
         finally {
          setTimeout( () =>  {
            isHandlingUnauthorized = false;
          }, 500);
         }
      }

      return Promise.reject(error);
    }
  );

};


export const ejectLogoutInterceptor = () => {
  if (interceptorId !== null) {
    api.interceptors.response.eject(interceptorId);
    interceptorId = null;
  }
};