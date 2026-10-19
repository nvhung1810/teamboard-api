const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const jsonBody = (schema: object) => ({ 'application/json': { schema } });

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'integer', minimum: 1 },
};

const badRequest = { description: 'Dữ liệu không hợp lệ', content: jsonBody(ref('ValidationError')) };
const notFound = { description: 'Không tìm thấy', content: jsonBody(ref('Error')) };

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'TeamBoard API',
    version: '1.0.0',
    description: 'API quản lý Board và Task — Express + TypeScript + Prisma + MySQL',
  },
  tags: [
    { name: 'Boards', description: 'Quản lý board' },
    { name: 'Tasks', description: 'Quản lý task' },
  ],
  paths: {
    '/api/boards': {
      get: {
        tags: ['Boards'],
        summary: 'Lấy danh sách board',
        responses: {
          200: { description: 'OK', content: jsonBody({ type: 'array', items: ref('BoardWithCount') }) },
        },
      },
      post: {
        tags: ['Boards'],
        summary: 'Tạo board mới',
        requestBody: { required: true, content: jsonBody(ref('BoardCreate')) },
        responses: {
          201: { description: 'Đã tạo', content: jsonBody(ref('Board')) },
          400: badRequest,
        },
      },
    },
    '/api/boards/{id}': {
      parameters: [idParam],
      get: {
        tags: ['Boards'],
        summary: 'Xem chi tiết board (kèm task)',
        responses: {
          200: { description: 'OK', content: jsonBody(ref('BoardDetail')) },
          400: badRequest,
          404: notFound,
        },
      },
      put: {
        tags: ['Boards'],
        summary: 'Cập nhật board',
        requestBody: { required: true, content: jsonBody(ref('BoardUpdate')) },
        responses: {
          200: { description: 'Đã cập nhật', content: jsonBody(ref('Board')) },
          400: badRequest,
          404: notFound,
        },
      },
      delete: {
        tags: ['Boards'],
        summary: 'Xoá board (xoá luôn các task bên trong)',
        responses: {
          204: { description: 'Đã xoá' },
          400: badRequest,
          404: notFound,
        },
      },
    },
    '/api/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'Lấy danh sách task',
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
        summary: 'Tạo task mới',
        requestBody: { required: true, content: jsonBody(ref('TaskCreate')) },
        responses: {
          201: { description: 'Đã tạo', content: jsonBody(ref('Task')) },
          400: badRequest,
          404: { description: 'Board không tồn tại', content: jsonBody(ref('Error')) },
        },
      },
    },
    '/api/tasks/{id}': {
      parameters: [idParam],
      get: {
        tags: ['Tasks'],
        summary: 'Xem chi tiết task',
        responses: {
          200: { description: 'OK', content: jsonBody(ref('Task')) },
          400: badRequest,
          404: notFound,
        },
      },
      put: {
        tags: ['Tasks'],
        summary: 'Cập nhật task',
        requestBody: { required: true, content: jsonBody(ref('TaskUpdate')) },
        responses: {
          200: { description: 'Đã cập nhật', content: jsonBody(ref('Task')) },
          400: badRequest,
          404: notFound,
        },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Xoá task',
        responses: {
          204: { description: 'Đã xoá' },
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
          description: { type: 'string', nullable: true, example: 'Các việc của sprint đầu tiên' },
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
          description: { type: 'string', nullable: true, example: 'Các việc của sprint đầu tiên' },
        },
      },
      BoardUpdate: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 100, example: 'Sprint 1 (đã sửa)' },
          description: { type: 'string', nullable: true },
        },
      },
      Task: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          title: { type: 'string', example: 'Thiết kế database' },
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
          title: { type: 'string', maxLength: 200, example: 'Thiết kế database' },
          description: { type: 'string', nullable: true, example: 'Vẽ ERD cho Board và Task' },
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
        properties: { message: { type: 'string', example: 'Không tìm thấy board có id = 99' } },
      },
      ValidationError: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Dữ liệu không hợp lệ' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'name' },
                message: { type: 'string', example: 'Tên board không được để trống' },
              },
            },
          },
        },
      },
    },
  },
};
