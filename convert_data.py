import csv
import json
import os

# Define file paths
csv_path = "/home/ubuntu/upload/badges_qr-Speakers.csv"
speakers_json_path = "/home/ubuntu/unbreakable-health-summit/client/public/data/speakers.json"
members_json_path = "/home/ubuntu/unbreakable-health-summit/client/public/data/members.json"

# Check if CSV exists
if not os.path.exists(csv_path):
    print(f"Error: CSV file not found at {csv_path}")
    exit(1)

# We will read existing speakers.json first to preserve session links (which are not in the CSV)
existing_speakers = {}
if os.path.exists(speakers_json_path):
    try:
        with open(speakers_json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for item in data:
                existing_speakers[item['name'].strip().lower()] = item.get('sessions', [])
    except Exception as e:
        print(f"Warning: Could not read existing speakers.json ({e}). Will use empty sessions list.")

# Read CSV data
speakers_data = []
members_data = []

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # Extract fields
        qr_code = row.get('QR Code', '').strip()
        photo = row.get('Photo', '').strip()
        name = row.get('Name', '').strip()
        affiliate = row.get('Affiliate ', '').strip() or row.get('Affiliate', '').strip()
        bio = row.get('Bio', '').strip()
        website = row.get('Website', '').strip()
        raw_type = row.get('Type', '').strip()
        instagram = row.get('Instagram', '').strip()

        if not name:
            continue

        # Map type to lowercase tag, defaults to "speaker"
        type_tag = raw_type.lower() if raw_type else "speaker"

        # 1. Prepare Speaker item (if Type is Speaker or Panelist or similar)
        # The user requested: "replace all existing placeholder data with this new data. Notice that there are a few types of speakers, make sure the tag like where it would say 'speaker' matches their type so for example 'panelist.'"
        # We will check if the row is intended as a speaker/panelist (all entries in badges_qr-Speakers.csv are speakers/panelists/headliners)
        speaker_item = {
            "id": qr_code,
            "name": name,
            "role": affiliate,  # Using Affiliate column as their role/title
            "company": affiliate, # Standardized company field
            "type": type_tag,
        }

        # Optional fields: "make sure if there is a blank field it doesn't show (so some attributes are optional)"
        if website:
            speaker_item["website"] = website
        if photo:
            speaker_item["image"] = photo
        if bio:
            speaker_item["bio"] = bio
        if instagram:
            speaker_item["instagram"] = instagram

        # Fetch sessions from existing speakers if name matches
        speaker_item["sessions"] = existing_speakers.get(name.lower(), [])

        speakers_data.append(speaker_item)

        # 2. Add to members list too so they are searchable/scannable
        member_item = {
            "id": qr_code,
            "name": name,
            "role": affiliate,
            "company": affiliate,
            "type": type_tag
        }
        if website:
            member_item["website"] = website
        
        members_data.append(member_item)

# Let's also read badges_qr.csv to load ALL attendees/members so they are scannable!
# "Note there is a tab called attendees and a tab called speakers"
# We should parse the other attendee names from badges_qr.csv to make sure they are in members.json as "attendee"
attendees_csv_path = "/home/ubuntu/upload/badges_qr.csv"
if os.path.exists(attendees_csv_path):
    print("Parsing attendees from badges_qr.csv...")
    with open(attendees_csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row.get('Name', '').strip()
            qr_code = row.get('QR Code', '').strip()
            if not name or not qr_code:
                continue
            
            # Check if this attendee is already added as a speaker/panelist (to avoid duplicates)
            is_speaker = any(m['name'].lower() == name.lower() for m in members_data)
            if not is_speaker:
                members_data.append({
                    "id": qr_code,
                    "name": name,
                    "role": "Attendee",
                    "company": "MetFix Affiliate",
                    "type": "attendee"
                })

# Write the updated speakers.json
with open(speakers_json_path, 'w', encoding='utf-8') as f:
    json.dump(speakers_data, f, indent=2, ensure_ascii=False)
print(f"Successfully wrote {len(speakers_data)} speakers to {speakers_json_path}")

# Write the updated members.json
with open(members_json_path, 'w', encoding='utf-8') as f:
    json.dump(members_data, f, indent=2, ensure_ascii=False)
print(f"Successfully wrote {len(members_data)} members/attendees to {members_json_path}")
