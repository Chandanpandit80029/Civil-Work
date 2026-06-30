import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';

type ServiceType = {
  list: (params: any) => Promise<any>;
  getById: (id: string) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
};

type SearchableFields = {
  [key: string]: string[];
};

// Models and their searchable fields (other than 'title')
const searchableFields: SearchableFields = {
  ISCode: ['code', 'title'],
  Material: ['name', 'slug'],
  Article: ['title', 'excerpt'],
  Tutorial: ['title'],
  User: ['name', 'email'],
  Project: ['name'],
  BOQ: ['title'],
  Estimation: ['title'],
  Inspection: ['title'],
  Note: ['title'],
  Report: ['title'],
};

export function createCrudController(service: ServiceType, entityName: string, scopeToUser: boolean = false) {
  return {
    list: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const { page, limit, sortBy, sortOrder, search, ...filters } = req.query;
        // Build where clause
        const where: any = { ...filters };
        
        // Handle search - check searchable fields for this entity
        if (search) {
          const fields = searchableFields[entityName] || ['title', 'name'];
          const searchStr = String(search);
          if (fields.length === 1) {
            where[fields[0]] = { contains: searchStr, mode: 'insensitive' };
          } else {
            where.OR = fields.map((field) => ({
              [field]: { contains: searchStr, mode: 'insensitive' },
            }));
          }
        }

        // Filter by userId for user-scoped routes
        if (scopeToUser && req.user?.id) {
          where.userId = req.user.id;
        }

        const result = await service.list({
          page: page ? parseInt(String(page)) : 1,
          limit: limit ? parseInt(String(limit)) : 10,
          sortBy: sortBy ? String(sortBy) : 'createdAt',
          sortOrder: (sortOrder === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc',
          where,
        });
        res.json({ success: true, data: result.data, meta: result.meta });
      } catch (error) { next(error); }
    },

    getById: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const id = String(req.params.id);
        const item = await service.getById(id);
        // Verify ownership for user-scoped routes
        if (scopeToUser && req.user?.id && item?.userId !== req.user.id) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
        res.json({ success: true, data: item });
      } catch (error) { next(error); }
    },

    create: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        // Only inject userId for models that have a userId field
        const modelsWithUserId = ['Project', 'Note', 'Inspection', 'Notification', 'ActivityLog', 'Feedback', 'SupportTicket', 'SavedCalculation', 'RateAnalysis', 'Bookmark', 'Download', 'RecentActivity', 'Favorite'];
        let data = modelsWithUserId.includes(entityName) ? { ...req.body, userId: req.user?.id } : { ...req.body };

        // Handle nested creates for models with child relations
        if (entityName === 'Inspection' && data.checklist && Array.isArray(data.checklist)) {
          data.checklist = { create: data.checklist };
        }
        if (entityName === 'BOQ' && data.items && Array.isArray(data.items)) {
          data.items = { create: data.items };
        }
        if (entityName === 'Estimation' && data.breakdown && Array.isArray(data.breakdown)) {
          data.breakdown = { create: data.breakdown };
        }

        const item = await service.create(data);
        res.status(201).json({ success: true, message: `${entityName} created successfully`, data: item });
      } catch (error) { next(error); }
    },

    update: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const id = String(req.params.id);
        // Verify ownership for user-scoped routes
        if (scopeToUser && req.user?.id) {
          const existing = await service.getById(id);
          if (existing?.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
          }
        }
        const item = await service.update(id, req.body);
        res.json({ success: true, message: `${entityName} updated successfully`, data: item });
      } catch (error) { next(error); }
    },

    delete: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const id = String(req.params.id);
        // Verify ownership for user-scoped routes
        if (scopeToUser && req.user?.id) {
          const existing = await service.getById(id);
          if (existing?.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
          }
        }
        await service.delete(id);
        res.json({ success: true, message: `${entityName} deleted successfully` });
      } catch (error) { next(error); }
    },
  };
}