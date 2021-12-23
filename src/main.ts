import path from "path";
import * as fs from "fs";
import * as yaml from "js-yaml";
import { Config } from "./config";
import fetch from 'node-fetch';

export default function assetdl() {
    // Check command line for config file path
    var configFilePath = null;
    if (process.argv.length > 2) {
        configFilePath = process.argv[2];
    }
    if (configFilePath == null) {
        configFilePath = '.';
    }

    configFilePath = path.resolve(configFilePath);
    var isDir = fs.lstatSync(configFilePath).isDirectory();
    if (isDir) {
        configFilePath = path.join(configFilePath, 'assetdl.yml');
    }
    var exists = fs.existsSync(configFilePath);
    if (!exists) {
        console.error('Config file not found: ' + configFilePath);
        process.exit(1);
    }

    var config : Config = yaml.load(fs.readFileSync(configFilePath, 'utf8')) as any;

    var rootPath = path.resolve(path.dirname(configFilePath), config.path);

    // Check for state file
    var stateFilePath = path.join(rootPath, 'assetdl.state.json');
    var stateFileExists = fs.existsSync(stateFilePath);
    var state = {};
    if (stateFileExists) {
        state = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
    }

    console.log("Checking assets");

    (async () => {
        for (var assetKey in config.assets) {
            var asset = config.assets[assetKey];
            var assetState = state[assetKey];
            if (assetState == null) {
                assetState = {};
                state[assetKey] = assetState;
            }
            var assetPath: string = asset.path;
            switch (asset.type) {
                case 'github':
                    // send http request to github api
                    var response = await fetch(`https://api.github.com/repos/${asset.repo}/releases/latest`);
                    if (response.status != 200) {
                        console.error('Error fetching asset: ' + assetKey);
                        continue;
                    }
                    var release: any = await response.json();
                    var anyMatch = false;
                    for (var githubAsset of release.assets) {
                        var filename: string = githubAsset.name;
                        var matches = regexMatch(asset.regex, filename);
                        if (matches) {
                            anyMatch = true;
                            if (githubAsset.id != assetState.id) {
                                var downloadUrl: string = githubAsset.browser_download_url;
                                var success = await performDownload(downloadUrl, assetKey, assetPath, filename);
                                if (success) {
                                    assetState.id = githubAsset.id;
                                }
                                break;
                            }
                        }
                    }
                    if (!anyMatch) {
                        console.warn("No asset found for: " + assetKey);
                    }
                    break;
                case 'jenkins':
                    // send http request to jenkins api
                    var response = await fetch(`${asset.url}/lastSuccessfulBuild/api/json`);
                    if (response.status != 200) {
                        console.error('Error fetching asset: ' + assetKey);
                        continue;
                    }
                    var buildInfo: any = await response.json();
                    var anyMatch = false;
                    for (var jenkinsAsset of buildInfo.artifacts) {
                        var filename: string = jenkinsAsset.fileName;
                        var matches = regexMatch(asset.regex, filename);
                        if (matches) {
                            anyMatch = true;
                            if (buildInfo.number != assetState.number) {
                                var downloadUrl = `${asset.url}/lastSuccessfulBuild/artifact/${jenkinsAsset.relativePath}`;
                                var success = await performDownload(downloadUrl, assetKey, assetPath, filename);
                                if (success) {
                                    assetState.number = buildInfo.number;
                                }
                            }
                        }
                    }
            }
            // save state
            fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 4));
        }
        console.log("Done");
    })();

    function regexMatch(pattern: string, text: string): boolean {
        return new RegExp(pattern).exec(text)?.[0] == text;
    }

    async function performDownload(downloadUrl: string, assetKey: string, targetPath: string, filename: string): Promise<boolean> {
        console.log("Downloading asset: " + assetKey);
        if (targetPath == null) {
            targetPath = path.resolve(rootPath, filename);
        } else {
            targetPath = targetPath.replace('$filename', filename);
            targetPath = path.resolve(rootPath, targetPath);
        }
        var response = await fetch(downloadUrl);
        if (response.status != 200) {
            console.error('Error downloading asset: ' + downloadUrl);
            return false;
        }
        // create directory
        var dir = path.dirname(targetPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        var stream = response.body.pipe(fs.createWriteStream(targetPath + ".assetdltmp"));
        await new Promise((resolve, reject) => {
            stream.on('finish', resolve);
            stream.on('error', reject);
        });
        if (state[assetKey].path != null) {
            var existing = path.join(rootPath, state[assetKey].path);
            if (fs.existsSync(existing)) {
                fs.unlinkSync(existing);
            }
        }
        fs.renameSync(targetPath + ".assetdltmp", targetPath);
        state[assetKey].path = targetPath;
        return true;
    }
}
