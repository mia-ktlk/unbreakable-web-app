import json
import pandas as pd
import os

# Create data directory if not exists
os.makedirs('/home/ubuntu/unbreakable-health-summit/client/public/data', exist_ok=True)

# 1. Read the CSV for QR Codes / Members
df_qr = pd.read_csv('/home/ubuntu/upload/badges_qr.csv')

# Let's map speaker names from our scraping to their QR codes in the CSV
# Scraped speakers:
# Greg Glassman, Emily Kaplan, Mark Sisson, Dave Feldman, Jaime Seeman, M.D., Drew Pinsky, M.D., Thomas Seyfried, Ph.D., Kenny Santucci, Eddie Hertzman, Arianna Masotti, PsyD, Jila Senemar, M.D.

# We'll normalize names to find matches in the CSV
speakers_scraped = {
    "Greg Glassman": {
        "role": "Co-Founder",
        "company": "The Broken Science Initiative & MetFix",
        "bio": "Greg Glassman is the founder of CrossFit and one of the most influential figures in modern fitness. In 2000, he formalized the CrossFit methodology, combining functional movements performed at high intensity to improve work capacity across broad time and modal domains. CrossFit grew into a global training movement with thousands of affiliated gyms worldwide. Glassman has been an outspoken critic of flawed public health narratives, particularly around chronic disease, nutrition science, and conflicts of interest in research. He is co-founder of The Broken Science Initiative and MetFix, organizations dedicated to exposing scientific misconduct and reframing metabolic disease as a preventable and reversible condition rooted in nutrition and lifestyle.",
        "image": "https://brokenscience.org/wp-content/uploads/2026/03/greg-glassman-speaker-v3-web-e1773266303701.png",
        "sessions": ["Opening Keynote: Broken Science & Metabolic Health", "The Future of Fitness & Medicine Panel"]
    },
    "Emily Kaplan": {
        "role": "Co-Founder & Journalist",
        "company": "The Broken Science Initiative & MetFix",
        "bio": "Emily Kaplan is a journalist and entrepreneur focused on investigating institutional failures in public health, nutrition policy, and scientific integrity. As co-founder of The Broken Science Initiative and MetFix, she works to examine how flawed research, financial conflicts, and regulatory capture have shaped modern dietary guidance and chronic disease outcomes. Kaplan’s work centers on translating complex metabolic health issues into accessible, investigative storytelling while holding powerful institutions accountable.",
        "image": "https://brokenscience.org/wp-content/uploads/2026/02/speaker-emily-kaplan-3-web-e1772302744477.png",
        "sessions": ["Investigative Journalism in Public Health", "The Future of Fitness & Medicine Panel"]
    },
    "Mark Sisson": {
        "role": "Author & Health Researcher",
        "company": "Primal Kitchen / Primal Blueprint",
        "bio": "Mark Sisson is a best-selling author and health educator known for pioneering the Primal health movement. He is the author of The Primal Blueprint and several other books exploring ancestral health, metabolic flexibility, and lifestyle-based approaches to preventing chronic disease. Sisson is also the founder of Primal Kitchen and a long-time advocate for low-carbohydrate, whole-food nutrition strategies grounded in evolutionary biology and metabolic science.",
        "image": "https://brokenscience.org/wp-content/uploads/2026/02/speaker-mark-sisson-3-web-e1772303405348.png",
        "sessions": ["Pioneering the Primal Health Movement", "Metabolic Flexibility & Ancestral Living"]
    },
    "Dave Feldman": {
        "role": "Software Engineer & Founder",
        "company": "Cholesterol Code",
        "bio": "Dave Feldman is a software engineer and independent researcher best known for founding the Cholesterol Code, a citizen-science initiative examining lipid metabolism in low-carbohydrate populations. Feldman’s data-driven experiments explore cholesterol variability, energy metabolism, and the “lean mass hyper-responder” phenotype, contributing to ongoing discussions around cardiovascular risk assessment in metabolically healthy individuals.",
        "image": "https://brokenscience.org/wp-content/uploads/2026/02/speaker-dave-feldman-3-web-e1772303343727.png",
        "sessions": ["Lipidology, Cholesterol & Citizen Science", "The Lean Mass Hyper-Responder Phenotype"]
    },
    "Dr. Jaime Seeman": {
        "role": "Board-Certified OB-GYN & Author",
        "company": "Dr. Fit and Fabulous",
        "bio": "Dr. Jaime Seeman is a board-certified OB-GYN, author, and public health advocate specializing in women’s metabolic health. Her work focuses on insulin resistance, strength training, and lifestyle interventions to prevent obesity, diabetes, and cardiovascular disease. Dr. Seeman integrates clinical medicine with performance training and emphasizes strength as a cornerstone of long-term metabolic resilience.",
        "image": "https://brokenscience.org/wp-content/uploads/2026/02/speaker-jaime-seeman-3-web-e1772303275386.png",
        "sessions": ["Women's Metabolic Health & Longevity", "Hormones, Strength & Metabolic Resilience"]
    },
    "Dr. Drew Pinsky": {
        "role": "Physician & Broadcaster",
        "company": "Dr. Drew",
        "bio": "Dr. Drew Pinsky, widely known as Dr. Drew, is a board-certified physician specializing in internal and addiction medicine and a longtime media broadcaster. He gained national recognition as co-host of Loveline and through numerous television programs focused on addiction, mental health, and public health education. For decades, Dr. Pinsky has worked at the intersection of clinical medicine and mass communication, translating complex health topics for broad audiences.",
        "image": "https://brokenscience.org/wp-content/uploads/2026/02/speaker-drew-pinsky-3-web-e1772303208441.png",
        "sessions": ["Addiction, Mental Health & Modern Public Health Narratives", "The Intersection of Clinical Medicine & Media Panel"]
    },
    "Prof. Thomas Seyfried": {
        "role": "Professor of Biology",
        "company": "Boston College",
        "bio": "Prof. Thomas Seyfried is a professor of biology at Boston College and a leading researcher in cancer metabolism. His work advances the metabolic theory of cancer, proposing that cancer is primarily a mitochondrial metabolic disease rather than strictly a genetic one. Dr. Seyfried is the author of Cancer as a Metabolic Disease and has published extensively on the role of glucose and glutamine metabolism in tumor growth, contributing to growing interest in metabolic therapies in oncology research.",
        "image": "https://brokenscience.org/wp-content/uploads/2026/02/speaker-thomas-seyfried-3-web-e1772303144211.png", # Fallback image path based on pattern
        "sessions": ["Cancer as a Metabolic Disease", "Mitochondrial Health & Metabolic Therapies"]
    },
    "Kenny Santucci": {
        "role": "Fitness Entrepreneur & Coach",
        "company": "STRONG New York",
        "bio": "Kenny Santucci is a New York City based trainer, coach, host, and fitness entrepreneur with more than a decade in the health and wellness space. Known for high energy leadership and a community-first approach, he is recognized as one of NYC’s top trainers and a trusted voice in performance and lifestyle fitness. He serves as a brand ambassador for Michelob Ultra and Fitaid, is a Technogym Master Trainer, and has hosted major wellness events including the Fitaid Morning Show and the Michelob Ultra Movement Fitness Festival. He also created STRONG New York, an event series that supports causes like Alzheimer’s awareness, Movember, and breast cancer research. His mission is personal, after overcoming weight struggles as a teen, he found wrestling and strength training at 15 and has been helping others build physical and mental strength ever since. His philosophy is simple: 'Lift heavy. Lift yourself. Lift up others.'",
        "image": "https://brokenscience.org/wp-content/uploads/2026/02/speaker-kenny-santucci-3-web-e1772303081112.png", # Fallback based on pattern
        "sessions": ["Morning High-Intensity Workout", "Community Building & Physical Strength as Medicine"]
    },
    "Eddie Hertzman": {
        "role": "Founder",
        "company": "Athletech News",
        "bio": "Edward Hertzman is the founder of Athletech News, a leading digital publication covering the business of fitness and wellness. Previously, he founded Sourcing Journal, which he later sold to Penske Media Group. Recognizing the need for a dedicated business intelligence platform in the fitness and wellness sector, Hertzman launched Athletech News to provide in-depth reporting, proprietary content, research, and industry analysis. Today, the platform reaches more than 100,000 subscribers and continues expanding into live events and executive forums.",
        "image": "https://brokenscience.org/wp-content/uploads/2026/02/speaker-eddie-hertzman-3-web-e1772303011211.png", # Fallback based on pattern
        "sessions": ["The Business of Fitness & Wellness", "The Future of Fitness & Medicine Panel"]
    },
    "Dr. Arianna Masotti": {
        "role": "Clinical Psychologist & Founder",
        "company": "The Bloome Method",
        "bio": "Arianna Masotti is an award-winning clinical psychologist, wellness coach, and public speaker. She is the founder of the Bloome Method, also known as Post-Workout Therapy (PWT), which blends psychodynamic psychology, neuroscience, and performance coaching to help high achievers strengthen self-esteem, body image, relationships, and career alignment. Dr. Masotti created the method after noticing that clients who came to therapy right after a workout showed more openness, flexibility, and emotional access. After more than 10,000 post-workout therapy sessions, she turned that insight into a structured approach that uses the 'prime state' after training to support resilience and growth. She also founded the Bloome Clinic, a multidisciplinary practice combining therapists, coaches, and trainers. Originally launched in London, Bloome is expanding to New York and Los Angeles as she works to train the next generation of performance-focused wellness coaches.",
        "image": "https://brokenscience.org/wp-content/uploads/2026/02/speaker-arianna-masotti-3-web-e1772302802790.png",
        "sessions": ["Post-Workout Therapy (PWT) & The Prime State", "Mental Resilience & Psychological Longevity"]
    },
    "Dr. Jila Senemar": {
        "role": "Board-Certified OB-GYN & Founder",
        "company": "JilaMD / Miami Menopause Collective",
        "bio": "Dr. Jila Senemar, MD, FACOG, is a board-certified obstetrician-gynecologist and founder of JilaMD, a personalized women’s midlife health and longevity practice in Miami. With more than 20 years of clinical experience, she specializes in perimenopause and menopause care, evidence-based hormone therapy, metabolic optimization and longevity Medicine, helping women restore energy, resilience, and long-term health through individualized, science-driven care. She is the founder of the Miami Menopause Collective, the EmpowHer Miami woman’s health exposition and SecondBloom Health, initiatives dedicated to expanding access to trusted education, community, and modern menopause care. Widely recognized for her clear, compassionate approach and rigorous commitment to evidence-based medicine, Dr. Senemar is a leading voice shaping the future of woman’s midlife health and longevity.",
        "image": "https://brokenscience.org/wp-content/uploads/2026/03/jila-senemar-speaker-v4-web.png",
        "sessions": ["Menopause, Midlife Longevity & Hormone Optimization", "Hormones, Strength & Metabolic Resilience"]
    }
}

# 2. Build speakers.json
speakers_list = []
for name, data in speakers_scraped.items():
    # Find QR Code in badges_qr
    match = df_qr[df_qr['Name'].str.lower().str.contains(name.lower().replace('dr. ', '').replace('prof. ', '').split(',')[0].strip())]
    qr_code = ""
    if not match.empty:
        qr_code = match.iloc[0]['QR Code']
    else:
        # Fallback to a generated one or default
        print(f"Warning: No QR code match for {name}")
        qr_code = "SPEAKER_" + name.replace(" ", "_").upper()
    
    speakers_list.append({
        "id": qr_code,
        "name": name,
        "role": data["role"],
        "company": data["company"],
        "email": f"{name.lower().replace(' ', '.').replace('dr.', '').replace('prof.', '').replace(',', '')}@unbreakablehealth.com",
        "website": "https://brokenscience.org",
        "phone": "+1 (305) 555-2026",
        "type": "speaker",
        "image": data["image"],
        "bio": data["bio"],
        "sessions": data["sessions"]
    })

with open('/home/ubuntu/unbreakable-health-summit/client/public/data/speakers.json', 'w') as f:
    json.dump(speakers_list, f, indent=2)

# 3. Build members.json (Full registry of all attendees, speakers, etc.)
members_list = []
for idx, row in df_qr.iterrows():
    name = row['Name']
    qr_code = row['QR Code']
    
    # Check if this member is one of our scraped speakers
    is_speaker = False
    speaker_info = None
    for s_name, s_data in speakers_scraped.items():
        s_norm = s_name.lower().replace('dr. ', '').replace('prof. ', '').split(',')[0].strip()
        if s_norm in name.lower():
            is_speaker = True
            speaker_info = s_data
            speaker_name = s_name
            break
            
    if is_speaker:
        members_list.append({
            "id": qr_code,
            "name": speaker_name,
            "role": speaker_info["role"],
            "company": speaker_info["company"],
            "email": f"{speaker_name.lower().replace(' ', '.').replace('dr.', '').replace('prof.', '').replace(',', '')}@unbreakablehealth.com",
            "website": "https://brokenscience.org",
            "phone": "+1 (305) 555-2026",
            "type": "speaker"
        })
    else:
        # Generate elegant attendee / partner roles
        role = "Attendee"
        company = "MetFix Affiliate"
        email_domain = "example.com"
        
        # Give some attendees special roles
        if "R.N." in name or "M.D." in name or "MD" in name or "Dr." in name:
            role = "Medical Practitioner"
            company = "Private Practice"
            email_domain = "medicalnetwork.org"
        elif "Sponsor" in name or idx % 15 == 0:
            role = "Sponsor Partner"
            company = "Athletech News Partner"
            email_domain = "athleticpartner.com"
        elif idx % 12 == 0:
            role = "Performance Coach"
            company = "Metabolic Health Gym"
            email_domain = "coachnetwork.com"
            
        members_list.append({
            "id": qr_code,
            "name": name,
            "role": role,
            "company": company,
            "email": f"{name.lower().replace(' ', '.').replace(',', '').replace('.', '')}@{email_domain}",
            "website": f"https://{name.lower().replace(' ', '').replace(',', '').replace('.', '')}.com",
            "phone": f"+1 (305) 555-{1000 + idx}",
            "type": "attendee"
        })

with open('/home/ubuntu/unbreakable-health-summit/client/public/data/members.json', 'w') as f:
    json.dump(members_list, f, indent=2)

# 4. Build schedule.json
# Let's create a rich, realistic schedule for the 2-day event at the Ritz Carlton, Miami (May 30-31, 2026)
schedule_data = {
  "days": [
    {
      "day": 1,
      "date": "Saturday, May 30, 2026",
      "agenda": [
        {
          "id": "s1-1",
          "title": "Registration & Morning Breathwork",
          "time": "07:30 AM - 08:30 AM",
          "room": "Grand Ballroom & Beachfront Lawn",
          "track": "Wellness",
          "description": "Pick up your badges, connect with fellow attendees, and participate in an optional morning breathwork and mobility session to prime your system for the day.",
          "speakers": ["Kenny Santucci"],
          "sponsor": "Athletech News"
        },
        {
          "id": "s1-2",
          "title": "Morning High-Intensity Workout",
          "time": "08:30 AM - 09:15 AM",
          "room": "Beachfront Lawn",
          "track": "Fitness",
          "description": "A fully scalable high-intensity functional fitness session designed to stimulate metabolic flexibility and physical strength.",
          "speakers": ["Kenny Santucci"],
          "sponsor": "MetFix"
        },
        {
          "id": "s1-3",
          "title": "Welcome Address & Opening Keynote: Broken Science & Metabolic Health",
          "time": "09:30 AM - 10:45 AM",
          "room": "Grand Ballroom",
          "track": "Science & Medicine",
          "description": "Co-founders Greg Glassman and Emily Kaplan officially kick off the Unbreakable Health Summit, exposing the systemic failures in modern public health guidelines and detailing the mission of the Broken Science Initiative.",
          "speakers": ["Greg Glassman", "Emily Kaplan"],
          "sponsor": "The Broken Science Initiative"
        },
        {
          "id": "s1-4",
          "title": "Lipidology, Cholesterol & Citizen Science",
          "time": "11:00 AM - 12:00 PM",
          "room": "Grand Ballroom",
          "track": "Science & Medicine",
          "description": "Dave Feldman presents groundbreaking data on lipid variability, energy metabolism, and the 'lean mass hyper-responder' phenotype, challenging conventional cardiovascular risk narratives.",
          "speakers": ["Dave Feldman"],
          "sponsor": "Cholesterol Code"
        },
        {
          "id": "s1-5",
          "title": "Networking Lunch & Immersive Activations",
          "time": "12:00 PM - 01:30 PM",
          "room": "Exhibition Hall & Ritz Terrace",
          "track": "Networking",
          "description": "Enjoy a metabolically optimized whole-food lunch, visit our sponsor booths, and experience cold plunge & sauna activations.",
          "speakers": [],
          "sponsor": "Primal Kitchen"
        },
        {
          "id": "s1-6",
          "title": "Women's Metabolic Health & Longevity",
          "time": "01:30 PM - 02:30 PM",
          "room": "Grand Ballroom",
          "track": "Clinical Practice",
          "description": "Dr. Jaime Seeman discusses the clinical management of insulin resistance, PCOS, and metabolic syndrome in women, emphasizing strength training and nutritional therapy.",
          "speakers": ["Dr. Jaime Seeman"],
          "sponsor": "Dr. Fit and Fabulous"
        },
        {
          "id": "s1-7",
          "title": "The Business of Fitness & Wellness",
          "time": "02:45 PM - 03:45 PM",
          "room": "Salons A & B",
          "track": "Business",
          "description": "Eddie Hertzman shares key insights on industry trends, venture capital in wellness, and how the fitness sector is merging with metabolic medicine.",
          "speakers": ["Eddie Hertzman"],
          "sponsor": "Athletech News"
        },
        {
          "id": "s1-8",
          "title": "Addiction, Mental Health & Modern Public Health Narratives",
          "time": "04:00 PM - 05:00 PM",
          "room": "Grand Ballroom",
          "track": "Public Health",
          "description": "Dr. Drew Pinsky explores the intersection of addiction, mental health, and institutional capture, analyzing how public communication shapes wellness outcomes.",
          "speakers": ["Dr. Drew Pinsky"],
          "sponsor": "MetFix"
        },
        {
          "id": "s1-9",
          "title": "VIP Cocktail Reception & Speaker Meet-and-Greet",
          "time": "06:00 PM - 08:00 PM",
          "room": "Ritz Carlton Ocean Terrace",
          "track": "Networking",
          "description": "An exclusive evening of drinks, hors d'oeuvres, and direct networking with summit speakers and industry leaders.",
          "speakers": ["Greg Glassman", "Emily Kaplan", "Mark Sisson", "Dr. Drew Pinsky"],
          "sponsor": "Athletech News"
        }
      ]
    },
    {
      "day": 2,
      "date": "Sunday, May 31, 2026",
      "agenda": [
        {
          "id": "s2-1",
          "title": "Morning Beach Mobility & Breathwork",
          "time": "07:30 AM - 08:15 AM",
          "room": "Ritz Beachfront Lawn",
          "track": "Wellness",
          "description": "Awaken the nervous system with gentle mobility flows, breathing exercises, and ocean plunge.",
          "speakers": ["Kenny Santucci"],
          "sponsor": "MetFix"
        },
        {
          "id": "s2-2",
          "title": "Pioneering the Primal Health Movement",
          "time": "08:30 AM - 09:30 AM",
          "room": "Grand Ballroom",
          "track": "Science & Medicine",
          "description": "Mark Sisson shares his evolutionary perspective on metabolic flexibility, whole-food nutrition, and the future of ancestral health in a high-tech world.",
          "speakers": ["Mark Sisson"],
          "sponsor": "Primal Kitchen"
        },
        {
          "id": "s2-3",
          "title": "Cancer as a Metabolic Disease",
          "time": "09:45 AM - 11:00 AM",
          "room": "Grand Ballroom",
          "track": "Science & Medicine",
          "description": "Prof. Thomas Seyfried presents his groundbreaking research on the metabolic theory of cancer, outlining therapeutic strategies focused on glucose and glutamine restriction.",
          "speakers": ["Prof. Thomas Seyfried"],
          "sponsor": "The Broken Science Initiative"
        },
        {
          "id": "s2-4",
          "title": "Post-Workout Therapy (PWT) & The Prime State",
          "time": "11:15 AM - 12:15 PM",
          "room": "Salons A & B",
          "track": "Wellness",
          "description": "Dr. Arianna Masotti explains the Bloome Method, demonstrating how physical exertion primes the brain for psychological breakthrough, emotional flexibility, and self-esteem building.",
          "speakers": ["Dr. Arianna Masotti"],
          "sponsor": "The Bloome Method"
        },
        {
          "id": "s2-5",
          "title": "Lunch, Exhibitor Hall & Longevity Demos",
          "time": "12:15 PM - 01:45 PM",
          "room": "Exhibition Hall",
          "track": "Networking",
          "description": "Explore the exhibitor hall, test bio-hacking equipment, and network with health professionals.",
          "speakers": [],
          "sponsor": "Athletech News"
        },
        {
          "id": "s2-6",
          "title": "Menopause, Midlife Longevity & Hormone Optimization",
          "time": "01:45 PM - 02:45 PM",
          "room": "Grand Ballroom",
          "track": "Clinical Practice",
          "description": "Dr. Jila Senemar discusses evidence-based hormone therapy, metabolic optimization, and cardiovascular longevity strategies for women in perimenopause and menopause.",
          "speakers": ["Dr. Jila Senemar"],
          "sponsor": "JilaMD"
        },
        {
          "id": "s2-7",
          "title": "Panel: Hormones, Strength & Metabolic Resilience",
          "time": "03:00 PM - 04:00 PM",
          "room": "Grand Ballroom",
          "track": "Clinical Practice",
          "description": "A collaborative panel featuring Dr. Seeman, Dr. Senemar, and Dr. Masotti discussing the physical, hormonal, and mental pillars of lifelong metabolic resilience.",
          "speakers": ["Dr. Jaime Seeman", "Dr. Jila Senemar", "Dr. Arianna Masotti"],
          "sponsor": "MetFix"
        },
        {
          "id": "s2-8",
          "title": "Closing Panel: The Future of Fitness & Medicine",
          "time": "04:15 PM - 05:30 PM",
          "room": "Grand Ballroom",
          "track": "Science & Medicine",
          "description": "A powerhouse closing discussion with Greg Glassman, Emily Kaplan, Mark Sisson, Eddie Hertzman, and Dr. Drew Pinsky on how we can break scientific capture and merge medical science with physical training.",
          "speakers": ["Greg Glassman", "Emily Kaplan", "Mark Sisson", "Eddie Hertzman", "Dr. Drew Pinsky"],
          "sponsor": "The Broken Science Initiative"
        }
      ]
    }
  ]
}

with open('/home/ubuntu/unbreakable-health-summit/client/public/data/schedule.json', 'w') as f:
    json.dump(schedule_data, f, indent=2)

# 5. Build sponsors.json
sponsors_data = [
  {
    "id": "sp1",
    "name": "The Broken Science Initiative",
    "tier": "Platinum",
    "logo": "https://brokenscience.org/wp-content/uploads/2024/10/logo.svg",
    "description": "Dedicated to exposing scientific misconduct, systemic flaws in peer review, and public health narratives. Co-founded by Greg Glassman and Emily Kaplan.",
    "website": "https://brokenscience.org",
    "booth": "Platinum Row A"
  },
  {
    "id": "sp2",
    "name": "MetFix",
    "tier": "Platinum",
    "logo": "https://brokenscience.org/wp-content/uploads/2026/02/Metfix-dark-logo.png",
    "description": "The elite network of metabolic health affiliates, merging cutting-edge metabolic medicine with high-performance physical training.",
    "website": "https://brokenscience.org",
    "booth": "Platinum Row B"
  },
  {
    "id": "sp3",
    "name": "Athletech News",
    "tier": "Gold",
    "logo": "https://brokenscience.org/wp-content/uploads/2026/03/ATN-Logo.png",
    "description": "The premier digital publication covering the business of fitness, wellness, and metabolic technology.",
    "website": "https://athletechnews.com",
    "booth": "Booth 101"
  },
  {
    "id": "sp4",
    "name": "Primal Kitchen",
    "tier": "Gold",
    "logo": "https://brokenscience.org/wp-content/uploads/2026/02/bronze-logo-2x.png", # Fallback logo
    "description": "Pioneering delicious, whole-food condiments, dressings, and snacks made with high-quality ingredients and avocado oil.",
    "website": "https://primalkitchen.com",
    "booth": "Booth 102"
  },
  {
    "id": "sp5",
    "name": "Cholesterol Code",
    "tier": "Silver",
    "logo": "https://brokenscience.org/wp-content/uploads/2026/02/bronze-logo-2x.png",
    "description": "A citizen-science research platform investigating lipidology, cardiovascular markers, and low-carb energy metabolism.",
    "website": "https://cholesterolcode.com",
    "booth": "Booth 201"
  },
  {
    "id": "sp6",
    "name": "The Bloome Method",
    "tier": "Silver",
    "logo": "https://brokenscience.org/wp-content/uploads/2026/02/bronze-logo-2x.png",
    "description": "Post-workout therapy combining clinical psychology, neuroscience, and performance coaching to build long-term resilience.",
    "website": "https://bloomemethod.com",
    "booth": "Booth 202"
  }
]

with open('/home/ubuntu/unbreakable-health-summit/client/public/data/sponsors.json', 'w') as f:
    json.dump(sponsors_data, f, indent=2)

# 6. Build exhibitors.json
exhibitors_data = [
  {
    "id": "ex1",
    "name": "JilaMD & Miami Menopause Collective",
    "booth": "Booth 301",
    "category": "Clinical Practice & Longevity",
    "description": "Miami's premier personalized women's midlife health and longevity practice, specializing in perimenopause and menopause optimization.",
    "website": "https://jilamd.com"
  },
  {
    "id": "ex2",
    "name": "Dr. Fit and Fabulous",
    "booth": "Booth 302",
    "category": "Clinical Practice & Strength",
    "description": "Integrative women's health and metabolic medicine consulting led by board-certified OB-GYN Dr. Jaime Seeman.",
    "website": "https://drfitandfabulous.com"
  },
  {
    "id": "ex3",
    "name": "STRONG New York",
    "booth": "Booth 303",
    "category": "Fitness & Community",
    "description": "NYC's premier fitness community and event series, supporting mental health, Alzheimer's awareness, and physical longevity.",
    "website": "https://strongnewyork.com"
  },
  {
    "id": "ex4",
    "name": "BSI Medical Society",
    "booth": "Booth 304",
    "category": "Education & Accreditation",
    "description": "Accrediting body offering Certificates of Completion and professional education in metabolic medicine and scientific integrity.",
    "website": "https://brokenscience.org"
  }
]

with open('/home/ubuntu/unbreakable-health-summit/client/public/data/exhibitors.json', 'w') as f:
    json.dump(exhibitors_data, f, indent=2)

print("Successfully generated all static JSON data files!")
