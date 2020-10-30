export interface ILogger {
    /**
     * Log the given value.
     *
     * @param value A string.
     */
    append(value: string): void;

    /**
     * Log the given value and a line feed character
     * to the channel.
     *
     * @param value A string.
     */
    appendLine(value: string): void;
}