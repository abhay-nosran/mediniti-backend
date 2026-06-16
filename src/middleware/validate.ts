import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

/**
 * Run an array of express-validator ValidationChains and then check the
 * result. If there are errors the handler responds immediately with a 422 and
 * the first human-readable error message. Otherwise it calls `next()`.
 *
 * Usage:
 *   router.post('/path', validate([body('email').isEmail(), ...]), handler)
 */
export function validate(chains: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run every chain in parallel
    await Promise.all(chains.map((chain) => chain.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Surface the first validation error to the client
      const first = errors.array({ onlyFirstError: true })[0];
      res.status(422).json({ success: false, message: first.msg });
      return;
    }

    next();
  };
}
