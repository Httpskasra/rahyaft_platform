import { IsString, Matches } from 'class-validator';

export class SaveSignatureDto {
  @IsString()
  @Matches(/^data:image\/png;base64,/, {
    message: 'signatureDataUrl must be a PNG data URL',
  })
  signatureDataUrl!: string;
}
