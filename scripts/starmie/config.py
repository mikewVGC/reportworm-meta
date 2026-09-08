
from __future__ import annotations
from typing import Any

class Config:
    def __init__(self, config:dict = {}) -> None:
        self.manifest = config['manifest'] if 'manifest' in config else ""
        self.data_dir = config['data_dir'] if 'data_dir' in config else ""
        self.output_dir = config['output_dir'] if 'output_dir' in config else ""
        self.sprite_coords = config['sprite_coords'] if 'sprite_coords' in config else ""
        self.google_tag = config['google_tag'] if 'google_tag' in config else ""
        self.mode = config['mode'] if 'mode' in config else 'dev'
        
    def __dict__(self):
        return {
            "manifest": self.manifest,
            "data_dir": self.data_dir,
            "output_dir": self.output_dir,
            "sprite_coords": self.sprite_coords,
            "google_tag": self.google_tag,
            "mode": self.mode,
        }
