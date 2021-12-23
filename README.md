# AssetDL
A simple script to download and update assets to the latest version from Jenkins or Github

## Installation
```
npm install -g assetdl
```

## Config
Write an assetdl.yml file (usually in the directory to download the assets to)

Example:
```
path: .
assets:
  geyser:
    type: jenkins
    url: https://ci.opencollab.dev/job/GeyserMC/job/Geyser/job/master/
    regex: Geyser-Spigot\.jar
  floodgate:
    type: jenkins
    url: https://ci.opencollab.dev/job/GeyserMC/job/Floodgate/job/master/
    regex: floodgate-spigot\.jar
  floodgate-sqlite:
    type: jenkins
    url: https://ci.opencollab.dev/job/GeyserMC/job/Floodgate/job/master/
    regex: floodgate-sqlite-database\.jar
    path: floodgate/$filename
  essentialsx:
    type: github
    repo: EssentialsX/Essentials
    regex: EssentialsX-.*\.jar
  luckperms:
    type: jenkins
    url: https://ci.lucko.me/job/LuckPerms/
    regex: LuckPerms-Bukkit-.*\.jar
```

## Execution
Can be run on a schedule (e.g. using cron or as part of a startup script)
```
assetdl /path/to/assetdl.yml
```
