const winston = require('winston');

const { combine, timestamp, printf, colorize, align } = winston.format;

const logger = winston.createLogger({
  level: 'info', // Default level, will be updated by init
  format: combine(
    colorize({ all: true }),
    timestamp({
      format: 'YYYY-MM-DD hh:mm:ss.SSS A',
    }),
    align(),
    printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

logger.init = function(config) {
  this.level = config.logging.level;

  if (config.env.isProduction && config.logging.enableFile) {
    this.add(
      new winston.transports.File({
        filename: 'logs/app.log',
        level: 'info',
        maxsize: config.logging.maxFileSize,
        maxFiles: config.logging.maxFiles,
      })
    );
    this.add(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: config.logging.maxFileSize,
        maxFiles: config.logging.maxFiles,
      })
    );
  }

  if (!config.logging.enableConsole) {
      this.remove(winston.transports.Console);
  }
};

module.exports = logger;