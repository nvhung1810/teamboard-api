import 'dotenv/config';
import { createApp } from '../presentation/http/app';
import { prisma } from '../infrastructure/database/prisma';
import { boardController, taskController } from './container';

const PORT = Number(process.env.PORT) || 3000;

const app = createApp({ boardController, taskController });

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Swagger UI:     http://localhost:${PORT}/api-docs`);
});

async function shutdown() {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
