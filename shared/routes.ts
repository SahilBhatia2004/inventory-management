
import { z } from 'zod';
import { insertItemSchema, insertDailyLogSchema, insertConsumptionSchema } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  items: {
    list: {
      method: 'GET' as const,
      path: '/api/items' as const,
      responses: {
        200: z.array(z.any()), // Frontend will infer from schema
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/items' as const,
      input: insertItemSchema,
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/items/:id' as const,
      input: insertItemSchema.partial(),
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/items/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  inventory: {
    list: {
      method: 'GET' as const,
      path: '/api/inventory' as const,
      responses: {
        200: z.array(z.any()),
      },
    },
    update: {
      method: 'POST' as const,
      path: '/api/inventory/:itemId/add' as const,
      input: z.object({ quantity: z.number(), reason: z.string() }),
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
  },
  dailyLogs: {
    list: {
      method: 'GET' as const,
      path: '/api/daily-logs' as const,
      responses: {
        200: z.array(z.any()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/daily-logs/:date' as const, // Fetch by date usually
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/daily-logs' as const,
      input: insertDailyLogSchema,
      responses: {
        201: z.any(),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/daily-logs/:id' as const,
      input: insertDailyLogSchema.partial().extend({ status: z.enum(['Draft', 'Confirmed']).optional() }),
      responses: {
        200: z.any(),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/daily-logs/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    // The "Magic" button - Predict consumption for a log
    predict: {
      method: 'POST' as const,
      path: '/api/daily-logs/:id/predict' as const,
      responses: {
        200: z.object({ message: z.string(), predictions: z.number() }), // returns count of predictions made
      },
    },
  },
  consumption: {
    listByLog: {
      method: 'GET' as const,
      path: '/api/daily-logs/:logId/consumption' as const,
      responses: {
        200: z.array(z.any()),
      },
    },
    batchUpdate: {
      method: 'POST' as const,
      path: '/api/daily-logs/:logId/consumption' as const,
      input: z.object({
        entries: z.array(z.object({
          itemId: z.number(),
          quantityUsed: z.number(),
        }))
      }),
      responses: {
        200: z.any(),
      },
    },
  },
  stats: {
    dashboard: {
      method: 'GET' as const,
      path: '/api/stats/dashboard' as const,
      responses: {
        200: z.object({
          totalItems: z.number(),
          lowStockCount: z.number(),
          monthlyCost: z.number(),
          stockValue: z.number(),
        }),
      },
    },
  },
};

// ============================================
// HELPER
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
