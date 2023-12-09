import { inject, injectable } from "inversify";

import { DebuggingService } from "./DebuggingService";
import { ExecutionService } from "./ExecutionService";
import { ProfillingService } from "./ProfilingService";

import { Inversify } from "@/Inversify";

@injectable()
export class CodeExecutionService {
    constructor(
        @inject(ExecutionService) private executionService: ExecutionService,
        @inject(DebuggingService) private debuggingService: DebuggingService,
        @inject(ProfillingService) private profillingService: ProfillingService
    ) { }

    get Execution(): ExecutionService {
        return this.executionService;
    }

    get Debugging(): DebuggingService {
        return this.debuggingService;
    }

    get Profilling(): ProfillingService {
        return this.profillingService;
    }
}

Inversify.bind(CodeExecutionService).toSelf().inSingletonScope();
