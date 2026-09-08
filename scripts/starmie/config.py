
from __future__ import annotations
from typing import Any

class Config:
    def __init__(self, config:dict = {}) -> None:
        self.manifest = config['manifest'] if 'manifest' in config else ""
        self.data_dir = config['data_dir'] if 'data_dir' in config else ""
        self.output_dir = config['output_dir'] if 'output_dir' in config else ""
        self.sprite_coords = config['sprite_coords'] if 'sprite_coords' in config else ""
        self.google_tag = config['google_tag'] if 'google_tag' in config else ""
        self.prod = config['prod'] if 'prod' in config else False
        
    def __dict__(self):
        return {
            self.manifest,
            self.data_dir,
            self.output_dir,
            self.sprite_coords,
            self.google_tag,
            self.prod,
        }
