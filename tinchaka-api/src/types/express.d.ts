// Express Request type augmentation so req.user is typed everywhere per PROJECT_PLAN.md §6 step 5
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: 'PASSENGER' | 'DRIVER' };
    }
  }
}
export {};
