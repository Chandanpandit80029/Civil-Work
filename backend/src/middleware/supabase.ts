import { Request, Response, NextFunction } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';

// Extend Express Request to include Supabase context
declare global {
  namespace Express {
    interface Request {
      supabase?: SupabaseClient;
      supabaseAdmin?: SupabaseClient;
      supabaseUser?: {
        id: string;
        email?: string;
        role?: string;
        [key: string]: unknown;
      };
    }
  }
}

/**
 * Options for the Supabase Express middleware.
 */
export interface SupabaseMiddlewareOptions {
  /**
   * Auth mode:
   * - "user" – requires a valid JWT from the Authorization header
   * - "publishable" – requires the publishable key (e.g. for public endpoints)
   * - "secret" – requires the secret key (e.g. for admin endpoints)
   * - "none" – no auth required, creates anonymous clients
   */
  auth: 'user' | 'publishable' | 'secret' | 'none';
}

/**
 * Express middleware that validates Supabase auth and injects
 * `req.supabase` (RLS-scoped client) and `req.supabaseAdmin` (admin client).
 *
 * Auth modes:
 * - "user" – requires a valid JWT from the Authorization header
 * - "publishable" – requires the publishable key
 * - "secret" – requires the secret key
 * - "none" – no auth required, creates anonymous clients
 *
 * @example
 * ```ts
 * // Protect a route with JWT auth
 * router.get('/todos', supabaseMiddleware({ auth: 'user' }), async (req, res) => {
 *   const { data } = await req.supabase!.from('todos').select()
 *   res.json({ success: true, data })
 * })
 *
 * // Admin route with secret key
 * router.post('/admin/users', supabaseMiddleware({ auth: 'secret' }), async (req, res) => {
 *   const { data } = await req.supabaseAdmin!.from('users').select()
 *   res.json({ success: true, data })
 * })
 * ```
 */
export function supabaseMiddleware(options: SupabaseMiddlewareOptions = { auth: 'user' }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { url: supabaseUrl, publishableKey, secretKey } = config.supabase;

      if (!supabaseUrl) {
        res.status(500).json({ success: false, message: 'SUPABASE_URL is not configured' });
        return;
      }

      // Create admin client (bypasses RLS)
      const adminClient = createClient(supabaseUrl, secretKey || publishableKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      req.supabaseAdmin = adminClient;

      if (options.auth === 'none') {
        // Anonymous client
        req.supabase = createClient(supabaseUrl, publishableKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        next();
        return;
      }

      if (options.auth === 'secret') {
        // Use the admin client (secret key has full access)
        req.supabase = adminClient;
        req.supabaseUser = { id: 'admin', role: 'service_role' };
        next();
        return;
      }

      if (options.auth === 'publishable') {
        // Validate publishable key
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== `Bearer ${publishableKey}`) {
          res.status(401).json({ success: false, message: 'Invalid or missing publishable key' });
          return;
        }
        // Create an anon client (RLS-scoped)
        req.supabase = createClient(supabaseUrl, publishableKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        next();
        return;
      }

      // Auth mode: "user" – validate JWT
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, message: 'Missing or invalid Authorization header' });
        return;
      }

      const token = authHeader.split(' ')[1];

      // Verify the JWT using Supabase's admin API
      const { data: { user }, error } = await adminClient.auth.getUser(token);

      if (error || !user) {
        res.status(401).json({ success: false, message: error?.message || 'Invalid or expired token' });
        return;
      }

      // Create a user-scoped client (RLS will use the user's JWT)
      const userClient = createClient(supabaseUrl, publishableKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });

      req.supabase = userClient;
      req.supabaseUser = {
        id: user.id,
        email: user.email || undefined,
        role: user.role || undefined,
        ...user.user_metadata,
      };

      next();
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Supabase authentication error',
        error: error?.message || 'Unknown error',
      });
    }
  };
}