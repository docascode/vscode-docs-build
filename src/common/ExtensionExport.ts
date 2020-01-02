export default interface ExtensionExports {
    initializationFinished: () => Promise<void>;
}