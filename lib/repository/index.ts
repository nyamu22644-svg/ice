// ICE Repository Selector
// Automatically provides Supabase repository when configured in environment,
// otherwise uses the reliable synthetic in-memory store.

import { IdentityRepository } from './identity-repository';
import { syntheticRepo } from './synthetic-repository';
import { supabaseRepo } from './supabase-repository';
import { isSupabaseConfigured } from '../supabase/client';

export * from './identity-repository';
export * from './synthetic-repository';
export * from './supabase-repository';

export function getRepository(): IdentityRepository {
  if (isSupabaseConfigured) {
    return supabaseRepo;
  }
  return syntheticRepo;
}

export const repository = getRepository();
