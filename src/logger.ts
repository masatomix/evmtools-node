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
    moduleLogLevels: {},
    transport: undefined,
}

const isBrowser = typeof window !== 'undefined'

// 外から設定を上書きできるようにしておく
let loggerConfig: LoggerConfig = {
    ...defaultLoggerOptions,
    ...(isBrowser
        ? {} // ブラウザでは config 無効
        : config.has('evmtools-node-logger')
          ? config.get('evmtools-node-logger')
          : {}),
}

export function setLoggerConfig(config: LoggerConfig) {
    loggerConfig = {
        ...defaultLoggerOptions,
        ...config,
    }
    // 必要なら既存ログレベルをリセットして再構築する処理も入れられる
    for (const key of Object.keys(loggers)) {
        delete loggers[key]
    }
}

/**
 * モジュール名を指定して Logger を取得。
 * 初回アクセス時に生成し、以後はキャッシュされたものを返す。
 */
export function getLogger(moduleName: string): Logger {
    if (!loggers[moduleName]) {
        const { transport, moduleLogLevels, level: loglevel } = loggerConfig
        const level = moduleLogLevels[moduleName] ?? loglevel
        // console.log(`${moduleName}はなかったので${level}で作る`)
        loggers[moduleName] = pino({
            level,
            transport,
        }).child({ module: moduleName })
    }
    return loggers[moduleName]
}
