import { Request, Response, NextFunction, RequestHandler } from 'express';

type OwnerResolver = (req: Request) => Promise<string | null>;

// Factory that enforces resource ownership — returns 403 per PROJECT_PLAN.md §6 step 5 and §9 test 5
export function requireOwnership(resolveOwnerId: OwnerResolver): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(500).json({
        error: {
          code: 'INTERNAL',
          message: 'requireOwnership used without requireAuth',
        },
      });
      return;
    }

    const ownerId = await resolveOwnerId(req);

    // Returns 403 for both null (resource not found) and mismatched owner per PROJECT_PLAN.md §6 step 5.
    // We considered returning 404 to hide resource existence (anti-enumeration), but chose 403 for
    // consistency with PROJECT_PLAN.md §6 step 5 ("Cross-user access must return 403") and §9 test 5.
    if (ownerId === null || ownerId !== req.user.id) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient role',
        },
      });
      return;
    }

    next();
  };
}
