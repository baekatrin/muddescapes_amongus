import json
import random

names = ['A. Jones', 'B. Lee', 'C. Park', 'D. Kim', 'E. Brown', 'F. Davis', 'G. Wilson', 'H. Taylor', 'J. Smith', 'K. Martinez', 'L. Garcia', 'M. White', 'N. Harris', 'O. Clark', 'P. Lewis', 'Q. Robinson', 'R. Walker', 'S. Young', 'T. Hall']
places = ['Lab 1', 'Lab 2', 'Lab 3', 'Lab 4', 'Reception', 'Storage A', 'Storage B', 'Corridor', 'Office 1', 'Office 2', 'Basement', 'Roof']
times = ['09:00', '10:15', '11:30', '12:00', '13:45', '14:45', '15:20', '16:00', '17:30', '18:00']
species = ['Human', 'Human', 'Human', 'Canine', 'Feline', 'Avian', 'Other']
codes = ['X1', 'X2', 'X3', 'BETA', 'GAMMA', 'DELTA', 'Z9', 'Y8', 'W7', 'ALPHA7']

win = {'name': 'J. Smith', 'place': 'Lab 3', 'time': '14:45', 'species': 'Human', 'code': 'ALPHA7'}
entries = [win]
used = {'J. Smith|Lab 3|14:45|Human'}

for _ in range(499):
    while True:
        n = random.choice(names)
        p = random.choice(places)
        t = random.choice(times)
        s = random.choice(species)
        key = f'{n}|{p}|{t}|{s}'
        if key not in used:
            used.add(key)
            entries.append({'name': n, 'place': p, 'time': t, 'species': s, 'code': random.choice(codes)})
            break

with open('data/entries.json', 'w') as f:
    json.dump(entries, f, separators=(',', ':'))

print('Wrote', len(entries), 'entries')
