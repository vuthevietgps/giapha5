import { IsArray, IsMongoId } from 'class-validator';

export class SetChildrenDto {
  @IsArray()
  @IsMongoId({ each: true })
  childrenIds!: string[];
}
