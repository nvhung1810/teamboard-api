import type { Request, Response } from 'express';
import type { CreateBoardUseCase } from '../../../application/use-cases/board/create-board.use-case';
import type { DeleteBoardUseCase } from '../../../application/use-cases/board/delete-board.use-case';
import type { GetBoardUseCase } from '../../../application/use-cases/board/get-board.use-case';
import type { GetBoardsUseCase } from '../../../application/use-cases/board/get-boards.use-case';
import type { UpdateBoardUseCase } from '../../../application/use-cases/board/update-board.use-case';
import { idParamSchema } from '../validators/common.validator';
import { createBoardSchema, updateBoardSchema } from '../validators/board.validator';

export class BoardController {
  constructor(
    private readonly getBoards: GetBoardsUseCase,
    private readonly getBoard: GetBoardUseCase,
    private readonly createBoard: CreateBoardUseCase,
    private readonly updateBoard: UpdateBoardUseCase,
    private readonly deleteBoard: DeleteBoardUseCase,
  ) {}

  getAll = async (_req: Request, res: Response) => {
    const boards = await this.getBoards.execute();
    // Giữ nguyên shape response: số lượng task nằm trong `_count.tasks`
    res.json(boards.map(({ taskCount, ...board }) => ({ ...board, _count: { tasks: taskCount } })));
  };

  getById = async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    res.json(await this.getBoard.execute(id));
  };

  create = async (req: Request, res: Response) => {
    const data = createBoardSchema.parse(req.body);
    res.status(201).json(await this.createBoard.execute(data));
  };

  update = async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    const data = updateBoardSchema.parse(req.body);
    res.json(await this.updateBoard.execute(id, data));
  };

  remove = async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    await this.deleteBoard.execute(id);
    res.status(204).send();
  };
}
