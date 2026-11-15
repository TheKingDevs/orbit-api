import { TtpDTO } from '@apptypes/ttp.type';

export interface ITtpService {
  generateTtp(dto: TtpDTO): Promise<Buffer>;
  generateAttp(dto: TtpDTO): Promise<Buffer>;
}
