import { EventStream } from "./eventStream";
import { KeyChain } from "../credential/keyChain";
import { EnvironmentController } from "./environmentController";

export default interface ExtensionExports {
    initializationFinished: () => Promise<void>;
    eventStream: EventStream;
    keyChain: KeyChain;
    environmentController: EnvironmentController;
}