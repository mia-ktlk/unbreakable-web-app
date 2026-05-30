import csv
import json

sponsors_data = []

# Map CSV fields to JSON format
with open('/home/ubuntu/upload/badges_qr-Sponsors.csv', mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for idx, row in enumerate(reader):
        name = row.get('Sponsor Name', '').strip()
        if not name:
            continue
            
        website = row.get('Website ', '').strip() or row.get('Website', '').strip()
        logo = row.get('Logo ', '').strip() or row.get('Logo', '').strip()
        bio = row.get('Bio ', '').strip() or row.get('Bio', '').strip() or f"Official Sponsor of the Unbreakable Health Summit 2026. Supporting the metabolic health revolution."
        
        # Social links
        instagram = row.get('Instagram ', '').strip() or row.get('Instagram', '').strip()
        facebook = row.get('Facebook ', '').strip() or row.get('Facebook', '').strip()
        linkedin = row.get('LinkedIn', '').strip()
        
        # Determine tier
        tier = "Platinum" if idx == 0 else "Gold" if idx <= 2 else "Silver"
        booth = f"Booth {101 + idx}"
        
        sponsors_data.append({
            "id": f"sp-{idx + 1}",
            "name": name,
            "logo": logo,
            "website": website,
            "description": bio,
            "tier": tier,
            "booth": booth,
            "socials": {
                "instagram": instagram,
                "facebook": facebook,
                "linkedin": linkedin
            }
        })

# Write to sponsors.json
with open('/home/ubuntu/unbreakable-health-summit/client/public/data/sponsors.json', 'w', encoding='utf-8') as f:
    json.dump(sponsors_data, f, indent=2)

print(f"Successfully processed {len(sponsors_data)} sponsors and wrote to sponsors.json!")
