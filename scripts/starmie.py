#!./.venv/bin/python

import argparse
import itertools
import json
import shutil

from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

from reportworm_builder.builder import Builder
from reportworm_builder.builder_cache import BuilderCache

from starmie.config import Config

def main():

    parser = argparse.ArgumentParser(
        prog="./scripts/starmie.py",
        description="Starmie is a script for building Reportworm Meta (Starmie has Analytic)",
    )
    parser.add_argument('--build-only', action="store_true", help="Don't process any data, only rebuild the site")
    parser.add_argument('--process-only', action="store_true", help="Don't rebuild the site, only process data")

    cl = parser.parse_args()

    config = None
    try:
        with open("config.json") as file:
            config = Config(json.loads(file.read()))
    except FileNotFoundError:
        print("Could not find config.json, exiting")
        return

    if not cl.process_only:
        builder = Builder(config.__dict__(), {})
        builder.build()

    else:
        print("Process-only flag set, skipping rebuild")

    if cl.build_only:
        print("Build-only flag specified, exiting!")
        return

    manifest = {}
    try:
        with open(config.manifest) as file:
            manifest = json.loads(file.read())
    except FileNotFoundError:
        print("Could not find manifest, exiting")
        return

    # load sprite coordinates (if we have it)
    sprite_coords = {}
    try:
        with open(config.sprite_coords) as file:
            sprite_coords = json.loads(file.read())
    except FileNotFoundError:
        # it's okay if we can't find this
        ...

    seasons = [ manifest['current'], manifest['current'] - 1, *manifest['grassroots'] ]

    # loop through and collect events
    events = []
    for year in seasons:
        season = []
        try:
            with open(f"{config.data_dir}/{year}.json") as file:
                season = json.loads(file.read())
        except FileNotFoundError:
            print(f"[manifest] Couldn't open {year}.json, skipping")
            continue

        for event_info in season:
            if event_info['status'] != "complete":
                continue
            events.append({
                **event_info,
                "year": year,
            })

    # sort by start date
    events = sorted(events, key=lambda e: e['start'], reverse=True)[:10]
    event_format = events[0]['format']

    teams = []
    player_teams = {}

    meta = {
        "info": {
            "format": event_format,
            "build": datetime.now(tz=timezone.utc).strftime("%b %d, %Y %H:%M %Z"),
        },
        "events": [],
        "meta": [],
        "lookup": {},
    }

    mon_lookup = {}

    # get teams
    for event_info in events:
        if event_info['format'] != event_format:
            continue

        event = {}
        try:
            with open(f"{config.data_dir}/{event_info['year']}/{event_info['code']}.json") as file:
                event = json.loads(file.read())
        except FileNotFoundError:
            print(f"Couldn't open {event_info['year']}/{event_info['code']}.json, skipping")
            continue

        meta['events'].append({
            "name": event_info['name'],
            "code": event_info['code'],
            "year": event_info['year'],
            "players": event_info['playerCount'],
            "date": event_info['dates'],
        })

        for player in event['standings'].values():
            if player['cut'] == False:
                continue

            team = []
            for mon in player['team']:
                mon_code = mon['altcode'] if len(mon['altcode']) else mon['code']
                team.append(mon_code)

                if mon_code not in mon_lookup:
                    mon_name = mon['altname'] if len(mon['altname']) else mon['name']

                    mon_lookup[mon_code] = {
                        'code': mon_code,
                        'name': mon_name,
                        'dex': mon['dex'],
                        'pos': sprite_coords[mon_code] if mon_code in sprite_coords else [],
                    }

            teams.append(set(team))

            team_hash = '-'.join(sorted(team))
            if team_hash not in player_teams:
                player_teams[team_hash] =[]

            player_teams[team_hash].append({
                "link": f"{event_info['year']}/{event_info['code']}/player/{player['code']}",
                "name": player['name'],
                "place": player['place'],
                "event": event_info['name'],
                "players": event_info['playerCount'],
            })

    counts = Counter()

    for t in teams:
        sorted_team = sorted(list(t))

        for r in [ 1, 6 ]:
            subsets = itertools.combinations(sorted_team, r)
            counts.update(subsets)

    grouped_counts = defaultdict(Counter)
    for subset, count in counts.items():
        ct = len(subset)
        grouped_counts[ct][subset] = count

    min_count = { 1: 4, 6: 2 }

    for size in sorted(grouped_counts.keys()):
        meta_info = {
            "size": size,
            "data": [],
        }

        top_subsets = grouped_counts[size].most_common(None)
        for subset, count in top_subsets:
            if count < min_count[size]:
                continue

            team_hash = '-'.join(sorted(subset))

            # show megas first
            team_sorted = sorted(subset, key=lambda m: (
                    not m.endswith("megax"),
                    not m.endswith("megay"),
                    not m.endswith("megaz"),
                    not m.endswith("mega"),
                    m,
                )
            )

            meta_info['data'].append({
                "count": count,
                "total": 0,
                "wins": 0,
                "losses": 0,
                "mons": team_sorted,
                "teams": player_teams[team_hash] if team_hash in player_teams else [],
            })
            
        meta['meta'].append(meta_info)

    # reduce mon_lookup to just what's needed
    meta_mons = {}
    for meta_data in meta['meta']:
        for mon_data in meta_data['data']:
            for mon in mon_data['mons']:
                meta_mons[mon] = mon_lookup[mon]

    meta['lookup'] = meta_mons

    # loop through events again to collect winrates
    for event_info in events:
        if event_info['format'] != event_format:
            continue

        # loading events AGAIN... this doesn't need to be efficient though
        event = {}
        try:
            with open(f"{config.data_dir}/{event_info['year']}/{event_info['code']}.json") as file:
                event = json.loads(file.read())
        except FileNotFoundError:
            print(f"Couldn't open {event_info['year']}/{event_info['code']}.json, skipping")
            continue

        for player in event['standings'].values():
            player_team = [ m['altcode'] if len(m['altcode']) else m['code'] for m in player['team'] ]

            for n, m in enumerate(meta['meta']):
                for i, team_info in enumerate(m['data']):
                    if set(team_info['mons']) <= set(player_team):
                        meta['meta'][n]['data'][i]['total'] += 1
                        meta['meta'][n]['data'][i]['wins'] += player['record']['w']
                        meta['meta'][n]['data'][i]['losses'] += player['record']['l']

    dt_str = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d-%H:%M:%S-%Z")

    with open(f"{config.output_dir}/report.json", "w") as file:
        file.write(json.dumps(meta, indent=2 if config.mode == 'dev' else None))

    archive_dir = Path(f"{config.output_dir}/archive")
    archive_dir.mkdir(parents=True, exist_ok=True)

    shutil.copy(f"{config.output_dir}/report.json", f"{config.output_dir}/archive/report-{dt_str}.json")

if __name__ == "__main__":
    main()
