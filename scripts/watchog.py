#!./.venv/bin/python

import json
import time

from watchdog.observers import Observer

from watchog.change_handler import ChangeHandler

from starmie.config import Config

def main():
    print("[WATCHOG] Starting watchog...")

    config = None
    try:
        with open("config.json") as file:
            config = Config(json.loads(file.read()))
    except FileNotFoundError:
        print("Could not find config.json, exiting")
        return

    event_handler = ChangeHandler()

    observer = Observer()
    observer.schedule(event_handler, path=config.data_dir, recursive=True)
    observer.start()

    print("[WATCHOG] Watchog on duty!")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()

    observer.join()

    print("[WATCHOG] Done")

if __name__ == "__main__":
    main()
