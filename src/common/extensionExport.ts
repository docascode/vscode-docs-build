import { DiagnosticController } from "../build/diagnosticController";
import { KeyChain } from "../credential/keyChain";
import { EnvironmentController } from "./environmentController";
import { EventStream } from "./eventStream";

export default interface ExtensionExports {
    initializationFinished: () => Promise<void>;
    eventStream: EventStream;
    keyChain: KeyChain;
    environmentController: EnvironmentController;
    diagnosticController: DiagnosticController;
}