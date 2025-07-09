import pino, { Logger } from 'pino'
import config from 'config'

// const isProd = process.env.NODE_ENV === 'production';

// モジュールごとのロガーをキャッシュ
const loggers: Record<string, Logger> = {}

interface Transport {
    target: string
    options: {
        translateTime: string
        ignore: string
        levelFirst: boolean
    }
}
interface LoggerConfig {
    level: string
    moduleLogLevels: Record<string, pino.LevelWithSilent>
    transport?: Transport
}

// デフォルトの設定(このlibrary標準の動き)
const defaultLoggerOptions: LoggerConfig = {
    level: 'warn',
    moduleLogLevels: {
        FileClassRepository: 'info',
        GenerateMappingClassUserCase: 'info',
    },
    transport: undefined,
}

// 利用者の設定
const userLoggerConfig: LoggerConfig | object = config.has('evmtools-node-logger')
    ? config.get('evmtools-node-logger')
    : {}
const loggerConfig = { ...defaultLoggerOptions, ...userLoggerConfig }

const { transport, moduleLogLevels, level: loglevel } = loggerConfig

/**
 * モジュール名を指定して Logger を取得。
 * 初回アクセス時に生成し、以後はキャッシュされたものを返す。
 */
export function getLogger(moduleName: string): Logger {
    if (!loggers[moduleName]) {
        const level = moduleLogLevels[moduleName] ?? loglevel
        // console.log(`${moduleName}はなかったので${level}で作る`)
        loggers[moduleName] = pino({
            level,
            transport,
        }).child({ module: moduleName })
    }
    return loggers[moduleName]
}
