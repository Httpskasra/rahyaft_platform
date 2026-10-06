// src/common/middleware/setPostgresSession.middleware.ts
// import { Injectable, NestMiddleware } from '@nestjs/common';
// import { PrismaService } from '../../prisma/prisma.service';

// @Injectable()
// export class SetPostgresSessionMiddleware implements NestMiddleware {
//   constructor(private readonly prisma: PrismaService) {}

//   async use(req: any, res: any, next: () => void) {
//     const user = req.user; // فرض: JWT decoded user
//     if (user) {
//       await this.prisma.$executeRawUnsafe(`
//         SET app.user_id = '${user.id}';
//         SET app.user_department_id = '${user.departmentId}';
//       `);
//     }
//     next();
//   }
// }
