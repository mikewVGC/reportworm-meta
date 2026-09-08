import subprocess
import sys

from threading import Timer

from watchdog.events import FileSystemEventHandler

class ChangeHandler(FileSystemEventHandler):

    def __init__(self):
        self.timer = None


    def on_created(self, event):
        if event.is_directory:
            return
        
        print(f"[WATCHOG] File created: {event.src_path}")
        self.trigger_run()


    def on_modified(self, event):
        if event.is_directory:
            return

        print(f"[WATCHOG] File modified: {event.src_path}")
        self.trigger_run()


    def on_deleted(self, event):
        if event.is_directory:
            return
        
        print(f"[WATCHOG] File deleted: {event.src_path}")
        self.trigger_run()


    def trigger_run(self):
        if self.timer is not None:
            self.timer.cancel()

        self.timer = Timer(3, self.run_starmie)
        self.timer.start()


    def run_starmie(self):
        print("[WATCHOG] Running starmie...")
        subprocess.run([ sys.executable, "scripts/starmie.py" ])
        print("[WATCHOG] Done!")
