import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const user = authService.user();

  if (user) {
    // Encode user info as base64 JSON and add to header
    const userInfo = {
      id: user.id,
      email: user.email,
      role: user.role,
      managedFamilies: user.managedFamilies,
      assignedFamily: user.assignedFamily,
    };
    const userInfoBase64 = btoa(JSON.stringify(userInfo));
    
    const cloned = req.clone({
      headers: req.headers.set('x-user-info', userInfoBase64)
    });
    
    return next(cloned);
  }

  return next(req);
};
