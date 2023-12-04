import { inject, injectable } from "inversify";

import { DebuggingService } from "./DebuggingService";

import { Inversify } from "@/Inversify";

@injectable()
export class CodeExecutionService {
    constructor(
        @inject(DebuggingService) private debuggingService: DebuggingService
    ) { }

    get Debugging(): DebuggingService {
        return this.debuggingService;
    }
}

Inversify.bind(CodeExecutionService).toSelf().inSingletonScope();
