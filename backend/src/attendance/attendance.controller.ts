import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { AttendanceService } from './attendance.service';
import { AttendanceQueryDto } from './dto/attendance-query.dto';

const ALLOWED_MIME_TYPES = [
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

@ApiTags('Attendance')
@ApiBearerAuth('access-token')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * POST /attendance/import
   * بارگذاری فایل اکسل تردد و درج مستقیم در دیتابیس.
   * فایل ذخیره نمی‌شود؛ فقط در حافظه پردازش می‌شود.
   */
  @Post('import')
  @ApiOperation({ summary: 'Import attendance records from an Excel workbook' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel workbook (.xls or .xlsx), maximum size 10 MB',
        },
      },
    },
  })
  @RequirePermission({ action: 'create', resource: 'attendance' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: undefined, // memoryStorage پیش‌فرض -> buffer در حافظه
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  import(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('File must be an .xls or .xlsx workbook');
    }

    return this.attendanceService.importFromExcel(file.buffer);
  }

  /** GET /attendance — لیست ترددهای خام (فیلتر با userId, from, to) */
  @Get()
  @RequirePermission({ action: 'read', resource: 'attendance' })
  findAll(@Query() query: AttendanceQueryDto) {
    return this.attendanceService.findAll(query);
  }

  /** GET /attendance/daily-summary — اولین/آخرین تردد هر کاربر در هر روز */
  @Get('daily-summary')
  @RequirePermission({ action: 'read', resource: 'attendance' })
  getDailySummary(@Query() query: AttendanceQueryDto) {
    return this.attendanceService.getDailySummary(query);
  }
}
