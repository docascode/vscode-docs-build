import { EventStream } from "./eventStream";
import { KeyChain } from "../credential/keyChain";

export default interface ExtensionExports {
    initializationFinished: () => Promise<void>;
    eventStream: EventStream;
    keyChain: KeyChain;
}