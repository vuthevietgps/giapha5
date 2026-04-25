import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ParseMongoIdPipe implements PipeTransform<string, string> {
  constructor(private readonly fieldName = 'id') {}

  transform(value: string): string {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`${this.fieldName} must be a valid MongoId`);
    }

    return value;
  }
}

@Injectable()
export class OptionalParseMongoIdPipe implements PipeTransform<string | undefined, string | undefined> {
  constructor(private readonly fieldName = 'id') {}

  transform(value?: string): string | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`${this.fieldName} must be a valid MongoId`);
    }

    return value;
  }
}
