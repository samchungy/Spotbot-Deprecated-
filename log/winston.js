const { createLogger, format, transports } = require('winston');
const env = process.env.NODE_ENV || 'development';
const fs = require('fs');
const path = require('path');

// Logger configuration
const logConfiguration = {
    // change level if in dev environment versus production
    level: env === 'production' ? 'info' : 'debug',
    format: format.combine(
        format.label({
            label: path.basename(process.mainModule.filename)
        }),
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        })
    ),
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.printf(
                    info =>
                    `${info.timestamp} ${info.level}: ${info.message}`
                )
            )
        }),
        new transports.File({
            filename: './log/all.log',
            format: format.combine(
                format.printf(
                    info =>
                    `${info.timestamp} ${info.level}: ${info.message}`
                )
            )
        })
    ]
};

// Create the logger
const logger = createLogger(logConfiguration);

module.exports = logger;