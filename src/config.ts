export interface Config {
    path: string,
    assets: {[key: string]: ConfigAsset}
}

export interface ConfigAsset {
    type: string,
    path: string,
    [key: string]: any
}