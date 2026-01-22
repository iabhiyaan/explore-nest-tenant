import { SetMetadata } from '@nestjs/common';

export const PROTECTED_ROLE_KEY = 'protectedRole';
export const ProtectedRole = () => SetMetadata(PROTECTED_ROLE_KEY, true);
