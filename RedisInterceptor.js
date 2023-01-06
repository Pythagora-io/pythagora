let net = require('net');

const CHUNK_SIZE = 1024;

module.exports = class RedisInterceptor {
    constructor(Pytagora, listenPort, targetPort, intermediateData) {
        this.Pytagora = Pytagora;
        this.listenPort = listenPort;
        this.targetPort = targetPort || 6379;
        this.intermediateData = intermediateData || [];
    }

    async init() {
        await new Promise((resolve, reject) => {
            const listenSocket = net.createServer(connection => {
                connection.on('data', data => {

                    if (this.mode === 'capture') {
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

            listenSocket.listen(this.listenPort, () => {
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
        const targetSocket = new net.Socket();

        targetSocket.connect(this.targetPort, 'localhost', () => {
            targetSocket.write(data);
        });

        targetSocket.on('data', response => {
            if (saveData) Pytagora.saveRedisData(data.toString(), response.toString().replace(/^.*\r\n/, '').replace(/\r\n$/, ''));

            connection.write(response);
            // targetSocket.destroy();
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
}

