const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const jsonBody = (schema: object) => ({ 'application/json': { schema } });

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'integer', minimum: 1 },
};

const badRequest = { description: 'Invalid data', content: jsonBody(ref('ValidationError')) };
const notFound = { description: 'Not found', content: jsonBody(ref('Error')) };

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'TeamBoard API',
    version: '1.0.0',
    description: 'Board and Task management API - Express + TypeScript + Prisma + MySQL',
  },
  tags: [
    { name: 'Boards', description: 'Manage boards' },
    { name: 'Tasks', description: 'Manage tasks' },
  ],
  paths: {
    '/api/boards': {
      get: {
        tags: ['Boards'],
        summary: 'List boards',
        responses: {
          200: { description: 'OK', content: jsonBody({ type: 'array', items: ref('BoardWithCount') }) },
        },
      },
      post: {
        tags: ['Boards'],
        summary: 'Create a new board',
        requestBody: { required: true, content: jsonBody(ref('BoardCreate')) },
        responses: {
          201: { description: 'Created', content: jsonBody(ref('Board')) },
          400: badRequest,
        },
      },
    },
    '/api/boards/{id}': {
      parameters: [idParam],
      get: {
        tags: ['Boards'],
        summary: 'Get board details (with tasks)',
        responses: {
          200: { description: 'OK', content: jsonBody(ref('BoardDetail')) },
          400: badRequest,
          404: notFound,
        },
      },
      put: {
        tags: ['Boards'],
        summary: 'Update a board',
        requestBody: { required: true, content: jsonBody(ref('BoardUpdate')) },
        responses: {
          200: { description: 'Updated', content: jsonBody(ref('Board')) },
          400: badRequest,
          404: notFound,
        },
      },
      delete: {
        tags: ['Boards'],
        summary: 'Delete a board (also deletes its tasks)',
        responses: {
          204: { description: 'Deleted' },
          400: badRequest,
          404: notFound,
        },
      },
    },
    '/api/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'List tasks',
        parameters: [
          { name: 'boardId', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] } },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] } },
        ],
        responses: {
          200: { description: 'OK', content: jsonBody({ type: 'array', items: ref('Task') }) },
          400: badRequest,
        },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Create a new task',
        requestBody: { required: true, content: jsonBody(ref('TaskCreate')) },
        responses: {
          201: { description: 'Created', content: jsonBody(ref('Task')) },
          400: badRequest,
          404: { description: 'Board does not exist', content: jsonBody(ref('Error')) },
        },
      },
    },
    '/api/tasks/{id}': {
      parameters: [idParam],
      get: {
        tags: ['Tasks'],
        summary: 'Get task details',
        responses: {
          200: { description: 'OK', content: jsonBody(ref('Task')) },
          400: badRequest,
          404: notFound,
        },
      },
      put: {
        tags: ['Tasks'],
        summary: 'Update a task',
        requestBody: { required: true, content: jsonBody(ref('TaskUpdate')) },
        responses: {
          200: { description: 'Updated', content: jsonBody(ref('Task')) },
          400: badRequest,
          404: notFound,
        },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Delete a task',
        responses: {
          204: { description: 'Deleted' },
          400: badRequest,
          404: notFound,
        },
      },
    },
  },
  components: {
    schemas: {
      Board: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Sprint 1' },
          description: { type: 'string', nullable: true, example: 'Tasks for the first sprint' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      BoardWithCount: {
        allOf: [
          ref('Board'),
          {
            type: 'object',
            properties: {
              _count: { type: 'object', properties: { tasks: { type: 'integer', example: 3 } } },
            },
          },
        ],
      },
      BoardDetail: {
        allOf: [
          ref('Board'),
          { type: 'object', properties: { tasks: { type: 'array', items: ref('Task') } } },
        ],
      },
      BoardCreate: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', maxLength: 100, example: 'Sprint 1' },
          description: { type: 'string', nullable: true, example: 'Tasks for the first sprint' },
        },
      },
      BoardUpdate: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 100, example: 'Sprint 1 (edited)' },
          description: { type: 'string', nullable: true },
        },
      },
      Task: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          title: { type: 'string', example: 'Design the database' },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          boardId: { type: 'integer', example: 1 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      TaskCreate: {
        type: 'object',
        required: ['title', 'boardId'],
        properties: {
          title: { type: 'string', maxLength: 200, example: 'Design the database' },
          description: { type: 'string', nullable: true, example: 'Draw the ERD for Board and Task' },
          status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'], example: 'TODO' },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'], example: 'HIGH' },
          dueDate: { type: 'string', format: 'date-time', nullable: true, example: '2026-12-31T17:00:00.000Z' },
          boardId: { type: 'integer', example: 1 },
        },
      },
      TaskUpdate: {
        type: 'object',
        properties: {
          title: { type: 'string', maxLength: 200 },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'], example: 'IN_PROGRESS' },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          boardId: { type: 'integer' },
        },
      },
      Error: {
        type: 'object',
        properties: { message: { type: 'string', example: 'Board not found with id = 99' } },
      },
      ValidationError: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Invalid data' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'name' },
                message: { type: 'string', example: 'Board name must not be empty' },
              },
            },
          },
        },
      },
    },
  },
};
