import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/** Translates common Prisma error codes into proper HTTP errors instead of leaking
 * a raw 500 with internal details for predictable, non-exceptional cases. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    switch (exception.code) {
      case 'P2002':
        return response
          .status(409)
          .json({ statusCode: 409, message: 'A record with these unique values already exists' });
      case 'P2025':
        return response.status(404).json({ statusCode: 404, message: 'Record not found' });
      default:
        throw exception;
    }
  }
}
