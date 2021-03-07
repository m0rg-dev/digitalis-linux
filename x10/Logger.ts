type log_channel = 'info';

export default class Logger {
    static enabled_channels = new Set<log_channel>();

    static log(channel: log_channel, source: string, message: string) {
        if(Logger.enabled_channels.has(channel)) {
            console.error(`[${source} ${channel}]: ${message}`);
        }
    }

    static enable = (channel: log_channel) => Logger.enabled_channels.add(channel);
    static disable = (channel: log_channel) => Logger.enabled_channels.delete(channel);
};