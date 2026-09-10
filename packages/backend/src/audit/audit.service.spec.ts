import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditService.buildDiff', () => {
  const service = new AuditService({} as PrismaService);

  it('only includes fields that actually changed', () => {
    const before = { firstName: 'Ivan', lastName: 'Petrov', phone: '123' };
    const after = { firstName: 'Ivan', lastName: 'Sidorov' };

    const diff = service.buildDiff(before, after);

    expect(diff).toEqual({ lastName: { old: 'Petrov', new: 'Sidorov' } });
  });

  it('treats equal Date values as unchanged even with different instances', () => {
    const before = { firstContactDate: new Date('2026-01-01T00:00:00.000Z') };
    const after = { firstContactDate: new Date('2026-01-01T00:00:00.000Z') };

    const diff = service.buildDiff(before, after);

    expect(diff).toEqual({});
  });

  it('detects an actual Date change', () => {
    const before = { firstContactDate: new Date('2026-01-01T00:00:00.000Z') };
    const after = { firstContactDate: new Date('2026-02-01T00:00:00.000Z') };

    const diff = service.buildDiff(before, after);

    expect(diff.firstContactDate).toBeDefined();
  });

  it('normalizes null/undefined to null in the recorded diff', () => {
    const before: { comment: string | undefined } = { comment: undefined };
    const after = { comment: 'hello' };

    const diff = service.buildDiff(before, after);

    expect(diff.comment).toEqual({ old: null, new: 'hello' });
  });
});
