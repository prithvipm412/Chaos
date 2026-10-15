import csv
from pathlib import Path

_INDEX = {}


def load_card_index(card_dir):
    key = str(Path(card_dir).resolve())
    if key not in _INDEX:
        with (Path(card_dir) / 'aro_index.tsv').open() as handle:
            _INDEX[key] = {row['ARO Accession']: dict(name=row['ARO Name'], family=row['AMR Gene Family'],
                          drug_classes=[part.strip().lower().replace(' antibiotic', '') for part in row['Drug Class'].split(';') if part.strip()],
                          mechanism=row['Resistance Mechanism']) for row in csv.DictReader(handle, delimiter='\t')}
    return _INDEX[key]
