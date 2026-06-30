import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { paginate, buildPaginationMeta } from '../utils/helpers';

const prisma = new PrismaClient();

type PrismaDelegate = {
  findMany: (args: any) => Promise<any[]>;
  findUnique: (args: any) => Promise<any>;
  create: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
  count: (args: any) => Promise<number>;
};

function getDelegate(modelName: string): PrismaDelegate {
  const delegate = (prisma as any)[modelName];
  if (!delegate) throw new Error(`Prisma model "${modelName}" not found`);
  return delegate;
}

export class CrudService {
  private modelName: string;
  private delegate: PrismaDelegate;

  constructor(modelName: string) {
    this.modelName = modelName;
    this.delegate = getDelegate(modelName.charAt(0).toLowerCase() + modelName.slice(1));
  }

  async list(params: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; where?: any }) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', where = {} } = params;
    const { skip, take } = paginate(page, limit);

    const [data, total] = await Promise.all([
      this.delegate.findMany({ skip, take, where, orderBy: { [sortBy]: sortOrder } }),
      this.delegate.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async getById(id: string) {
    const item = await this.delegate.findUnique({ where: { id } });
    if (!item) throw new AppError(`${this.modelName} not found`, 404);
    return item;
  }

  async create(data: any) {
    return this.delegate.create({ data });
  }

  async update(id: string, data: any) {
    const item = await this.delegate.findUnique({ where: { id } });
    if (!item) throw new AppError(`${this.modelName} not found`, 404);
    return this.delegate.update({ where: { id }, data });
  }

  async delete(id: string) {
    const item = await this.delegate.findUnique({ where: { id } });
    if (!item) throw new AppError(`${this.modelName} not found`, 404);
    return this.delegate.delete({ where: { id } });
  }
}

// Export service instances
export const projectService = new CrudService('Project');
export const materialService = new CrudService('Material');
export const isCodeService = new CrudService('ISCode');
export const boqService = new CrudService('BOQ');
export const estimationService = new CrudService('Estimation');
export const inspectionService = new CrudService('Inspection');
export const reportService = new CrudService('Report');
export const noteService = new CrudService('Note');
export const notificationService = new CrudService('Notification');
export const calculatorService = new CrudService('Calculator');
export const dailyProgressService = new CrudService('DailyProgress');
export const projectFileService = new CrudService('ProjectFile');
export const feedbackService = new CrudService('Feedback');
export const supportTicketService = new CrudService('SupportTicket');
export const activityLogService = new CrudService('ActivityLog');
