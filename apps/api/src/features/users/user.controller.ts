import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service';
import { ok } from '@buildx/shared';

export class UserController {
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getMe(req.auth!.userId);
      res.json(ok(user));
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.updateProfile(req.auth!.userId, req.body);
      res.json(ok(user));
    } catch (err) {
      next(err);
    }
  }

  async completeOnboarding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.completeOnboarding(req.auth!.userId, req.body);
      res.status(200).json(ok(user));
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
