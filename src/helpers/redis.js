const MODES = require('../const/modes.json');
let net = require('net');

const CHUNK_SIZE = 1024;

module.exports = class RedisInterceptor {
    constructor(Pythagora, listenPort, targetPort, intermediateData) {
        this.Pythagora = Pythagora;
        this.listenPort = listenPort;
        this.targetPort = targetPort || 6379;
        this.intermediateData = intermediateData || [];
    }

    async init() {
        await new Promise((resolve, reject) => {
            this.listenSocket = net.createServer(connection => {
                connection.on('data', data => {

                    if (this.mode === MODES.capture) {
                        this.forwardData(connection, data, true);
                    } else if (this.mode === 'test') {

                        let mockData = this.intermediateData.find(d => d.type === 'redis' && d.request === data.toString());

                        if (mockData) {
                            const chunks = this.splitIntoChunks(mockData.response, CHUNK_SIZE);
                            chunks.forEach(chunk => connection.write(`+${chunk}\r\n`, 'utf8'));
                            // connection.destroy();
                        } else {
                            this.forwardData(connection, data);
                        }
                    } else {
                        this.forwardData(connection, data);
                    }

                });
            });

            this.listenSocket.listen(this.listenPort, () => {
                resolve();
            });
        });
    }

    setMode(mode) {
        this.mode = mode;
    }

    setIntermediateData(data) {
        this.intermediateData = data;
    }

    forwardData(connection, data, saveData) {
        this.targetSocket = new net.Socket();

        this.targetSocket.connect(this.targetPort, 'localhost', () => {
            this.targetSocket.write(data);
        });

        this.targetSocket.on('data', response => {
            if (saveData) Pythagora.saveRedisData(data.toString(), response.toString().replace(/^.*\r\n/, '').replace(/\r\n$/, ''));

            connection.write(response);
            // this.targetSocket.destroy();
            // connection.destroy();
        });
    }

    splitIntoChunks(str, chunkSize) {
        const chunks = [];

        for (let i = 0; i < str.length; i += chunkSize) {
            chunks.push(str.substring(i, i + chunkSize));
        }

        return chunks;
    }

    async cleanup() {
        this.intermediateData = [];
        let self = this;
        await new Promise((resolve, reject) => {
            self.listenSocket.close(() => {
                self.targetSocket ?
                    self.targetSocket.close(() => {
                        resolve();
                    }) :
                    resolve();
            });
        });
    }
}

