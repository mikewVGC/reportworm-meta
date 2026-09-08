# Reportworm Meta

Reportworm Meta builds a snapshot of the current metagame based on results from teams that have top cut official events and certain online tournaments. The intent is to give an idea of what Pokemon are being used to the most success for best of three, open teamsheet tournaments.

## Setup

Requires you have Reportworm Standings or at the very least all the data needed to churn out some stats. Create `config.json` in the project root:

```
{
    "manifest": "../vgc-standings-data/manifest.json",
    "data_dir": "../vgc-standings/public/data",
    "output_dir": "public/data",
    "sprite_coords": "../sd-spriter/output/map-coords.json",
    "google_tag": "",
    "prod": true
}
```

## Report Builder (Starmie)

Starmie is a very simple script that builds the main report.

```
./scripts/starmie.py
```

There are some options but you probably won't need them.

## Auto Builder (Watchog)

Ideally this would just function on its own without needing to rebuild any time there's new data. So, you can run `watchog` to monitor your data directory (`config.data_dir`).

```
./scripts/watchog.py
```

Watchog will debounce events so it will only run starmie once every 3 seconds, so unless you do a full rebuild of your standings data it will likely just run once whenever you build event standings.

## License

Reportworm Builder is licensed with the BSD license. See `LICENSE`.
