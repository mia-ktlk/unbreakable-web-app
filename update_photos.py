import json

path = '/home/ubuntu/unbreakable-health-summit/client/public/data/speakers.json'

with open(path, 'r') as f:
    speakers = json.load(f)

updated_count = 0
for speaker in speakers:
    if "Seyfried" in speaker['name']:
        speaker['image'] = "https://brokenscience.org/wp-content/uploads/2026/02/speaker-thomas-seyfried-3-web-e1772302568581.png"
        updated_count += 1
    elif "Santucci" in speaker['name']:
        speaker['image'] = "https://brokenscience.org/wp-content/uploads/2026/02/speaker-kenny-santucci-3-web-e1772302945363.png"
        updated_count += 1
    elif "Hertzman" in speaker['name']:
        speaker['image'] = "https://brokenscience.org/wp-content/uploads/2026/02/speaker-eddie-hertzman-3-web-e1772302880451.png"
        updated_count += 1

with open(path, 'w') as f:
    json.dump(speakers, f, indent=2)

print(f"Successfully updated {updated_count} speaker photos in speakers.json!")
