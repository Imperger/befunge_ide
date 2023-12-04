import { inject, injectable } from "inversify";

import { DebuggingService } from "./DebuggingService";
import { ExecutionService } from "./ExecutionService";

import { Inversify } from "@/Inversify";

@injectable()
export class CodeExecutionService {
    constructor(
        @inject(ExecutionService) private executionService: ExecutionService,
        @inject(DebuggingService) private debuggingService: DebuggingService
    ) { }

    get Execution(): ExecutionService {
        return this.executionService;
    }

    get Debugging(): DebuggingService {
        return this.debuggingService;
    }
}

Inversify.bind(CodeExecutionService).toSelf().inSingletonScope();
