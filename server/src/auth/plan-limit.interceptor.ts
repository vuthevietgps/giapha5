import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Subscription, SubscriptionStatus } from '../subscriptions/schemas/subscription.schema';
import { Member } from '../members/schemas/member.schema';

/**
 * Interceptor kiểm tra giới hạn gói dịch vụ khi tạo member mới.
 * Apply cho POST /members
 */
@Injectable()
export class PlanLimitInterceptor implements NestInterceptor {
  constructor(
    @InjectModel(Subscription.name) private subModel: Model<Subscription>,
    @InjectModel(Member.name) private memberModel: Model<Member>,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;

    // Only check on member creation
    if (method !== 'POST') return next.handle();

    const familyId = req.body?.family;
    if (!familyId) return next.handle();

    // Match both string and ObjectId stored values
    const familyRefs: Array<string | Types.ObjectId> = [familyId];
    if (Types.ObjectId.isValid(familyId)) {
      familyRefs.push(new Types.ObjectId(familyId));
    }
    const familyMatch = { $in: familyRefs };

    // Find active subscription for this family
    const sub = await this.subModel
      .findOne({ family: familyMatch, status: SubscriptionStatus.ACTIVE })
      .exec();

    if (!sub) {
      // Không có gói dịch vụ → cho phép (backward compatibility cho dòng họ cũ)
      return next.handle();
    }

    // Check if subscription has expired
    if (sub.endDate < new Date()) {
      await this.subModel.findByIdAndUpdate(sub._id, { status: SubscriptionStatus.EXPIRED });
      throw new ForbiddenException('Gói dịch vụ đã hết hạn. Vui lòng gia hạn để tiếp tục.');
    }

    // Count current members in family
    const memberCount = await this.memberModel.countDocuments({ family: familyMatch }).exec();

    if (memberCount >= sub.maxMembers) {
      throw new ForbiddenException(
        `Đã đạt giới hạn ${sub.maxMembers} thành viên của gói hiện tại. Vui lòng nâng cấp gói.`
      );
    }

    return next.handle();
  }
}
