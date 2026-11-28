# Module 1 · Chapter 3 — Cybersecurity & Digital Footprints

*Module 1 · Chapter 03*

> Protect the device, the data and the person — because online safety is not a setting, it is a habit of judgement.

**Topics:** 2 — 3.1 Threats · 3.2 Ethics · **Study time:** ~80 minutes · **Visuals:** 8 diagrams & tables · **Assessment:** 5 MCQs + 2 practical prompts

> **Note on figures:** The original study guide uses vector diagrams. In this Markdown extract, each figure is represented by its caption and a summary of its labelled content.

## Behavioural learning objectives

By the end of this chapter you can:

- **Classify** malware types and matching countermeasures.
- **Identify** at least six signs of a phishing email or message.
- **Explain** why HTTPS matters and what it does *not* guarantee.
- **Design** a strong password and multi-factor authentication strategy.
- **Analyse** the long-term impact of an online post on a digital footprint.
- **Apply** copyright, Creative Commons and fair-use rules when citing digital work.

## 3.1 Network Security & Cyber Threats

Security is not a product you install once; it is a chain of decisions. Attackers rarely break encryption. They trick a person, reuse a leaked password, exploit an unpatched app, or find a backup that was never tested. Understanding the threat model helps you spend your effort where it actually protects you.

### The security model: confidentiality, integrity, availability

- **Confidentiality** — Only authorised people can read the data. Tools: strong passwords, encryption, access control.
- **Integrity** — Data is accurate and has not been altered. Tools: hashing, audit logs, backups, permissions.
- **Availability** — Systems and data are accessible when needed. Tools: backups, uptime, disaster recovery, DDoS protection.
- **Threat · vulnerability · risk** — A threat is a potential attacker or event; a vulnerability is a weakness; risk is the likelihood and impact of the two meeting.

### Malware: the hostile software family

| Type | How it behaves | Typical sign / defence |
|---|---|---|
| **Virus** | Attaches to a host file or program and spreads when that host runs. | Unexpected file changes; scan removable drives, avoid pirated software. |
| **Worm** | Self-replicates across networks without a host file. | Sudden network slowdown; patch systems, segment networks. |
| **Trojan** | Disguises itself as legitimate software; opens a back door. | Fake installers or “free” tools; download only from official sources. |
| **Ransomware** | Encrypts files and demands payment for the key. | Files renamed or inaccessible; offline backups and patching are the defence. |
| **Spyware / keylogger** | Secretly records activity, keystrokes, screenshots or location. | Battery drain, unknown apps; permission review and anti-malware scans. |
| **Adware** | Floods the user with unwanted advertisements or redirects. | Browser hijack; remove extensions, reset browser settings. |
| **Rootkit** | Hides deep in the system and conceals other malware. | Difficult to detect; reinstall the OS if compromise is suspected. |
| **Botnet** | A network of infected devices controlled remotely, often for DDoS or spam. | Device overheating or slow uploads; isolate and rebuild. |

*Table 3.1 — Malware is classified by behaviour, not by file name. A single attack can combine several types.*

### Phishing: the human vulnerability

**Phishing** is a fraudulent message designed to make you reveal credentials, download malware or transfer money. **Spear phishing** is personalised; **smishing** arrives by SMS; **vishing** uses a phone call. The strongest defence is a pause: verify the sender through a separate channel before acting.

**Figure 3.1 — Anatomy of a phishing email.** A real organisation will not ask for your password by email, and urgency is a pressure tactic, not proof of authority.

*Diagram summary:* A mock email from “ICT Quiz Admin” at a look-alike domain (`admin@mssn-remo-verify.xyz`) uses the subject “URGENT: Your quiz slot will be cancelled today”. It links to `http://mssn-remo-verify.xyz/login?id=2026`, asks for the school email password and a parent’s phone number, and threatens disqualification. The six red flags labelled are: look-alike domain, manufactured urgency, suspicious link, asks for password, threat of loss, and no verifiable contact.

### Passwords, MFA and the maths of guessing

Password strength comes from **length and unpredictability**, not from replacing “a” with “@”. A four-word passphrase such as `green-river-silent-book` is easier to remember and harder to crack than `P@ssw0rd!`. Never reuse a password across important accounts: one breach then unlocks many doors.

- **Use a password manager** to generate and store unique passwords; protect it with a long passphrase and MFA.
- **Turn on multi-factor authentication** (something you know + something you have, such as an authenticator app).
- **Check breaches** at a reputable service and change exposed passwords immediately.
- **Never share codes** — a caller asking for an OTP is an attacker, even if they sound official.

### HTTPS, firewalls and encryption

**HTTPS** is HTTP carried over TLS. It encrypts the connection between your browser and the server, protecting data in transit from eavesdropping and tampering. The padlock means the connection is encrypted and the certificate matches the domain; it does **not** mean the site is honest, safe or legitimate. Phishing sites can obtain certificates too.

A **firewall** filters network traffic by rules, blocking unsolicited inbound connections and suspicious outbound traffic. **Encryption** converts readable plaintext into ciphertext using a key. **Symmetric** encryption uses one shared key (fast, used for bulk data); **asymmetric** encryption uses a public/private key pair (used to exchange keys and verify identity).

**Figure 3.2 — Defence in depth.** Security is layered: network, device, account and data controls reinforce one another.

*Diagram summary:* Network: firewall, segmentation, patching → Device: antivirus, updates, screen lock, encryption → Account: unique password, MFA, least privilege → Data: 3-2-1 backup, verify restore, classify sensitivity. If one layer fails, the next layer still protects you.

> **Exam trap — The 3-2-1 backup rule**
>
> Keep **3** copies of important data, on **2** different types of media, with **1** copy off-site (or offline). Test the restore, not just the backup. Ransomware cannot encrypt a backup that is disconnected — but it can destroy one that is always mounted.

### If you suspect a compromise

1. **Stop and disconnect.** — Unplug the network cable or turn off Wi-Fi, but do not delete evidence.
2. **Tell a trusted adult.** — A teacher, parent or ICT coordinator. Speed matters more than pride.
3. **Change passwords from a clean device.** — Start with email and banking; enable MFA; revoke active sessions.
4. **Scan and restore.** — Run a full anti-malware scan; restore from a known-good backup if files are encrypted.

## 3.2 Digital Ethics & Footprints

Every click leaves a trace. Some traces you choose — a post, a comment, a photo. Others are collected quietly — location, device type, browsing history. A digital footprint is the cumulative record of your online activity, and it can outlive the moment that created it.

### Active and passive footprints

- **Active footprint** — What you deliberately create: posts, comments, uploads, reviews, emails, public profiles, forum answers.
- **Passive footprint** — What is collected as you use services: IP address, device fingerprint, cookies, location logs, purchase history.
- **Permanence** — Deleting is not erasing. Screenshots, caches, archives and other people’s copies may survive.
- **Context collapse** — A joke shared with friends can be read by teachers, employers or strangers years later.

**Figure 3.3 — The digital footprint iceberg.** The visible layer is only a fraction of what services and third parties may know.

*Diagram summary:* Above the waterline — visible: posts, photos, comments, public profiles and usernames. Below the waterline — hidden or collected: IP address, location, cookies, device ID, search history, metadata, inferred interests, data broker profiles and old cached pages. Two callouts ask, “Before you post: Would I say this aloud? Would I mind my parents seeing it?” and apply “The archive test: assume it can be screenshotted, searched and shown out of context.”

### Cyberbullying and the law

**Cyberbullying** is repeated, intentional harm through digital channels: threats, humiliation, exclusion, impersonation, spreading rumours or sharing private images without consent. It differs from a single argument because of repetition, power imbalance and the permanence of the record.

In Nigeria, the **Cybercrimes (Prohibition, Prevention, etc.) Act 2015** (and subsequent amendments) criminalises offences including cyberstalking, identity theft, unauthorized access and the sharing of certain private images. School rules and child-protection policies apply in addition to the law. Laws change: cite the principle, and encourage reporting to a trusted adult, the school, or the relevant authority.

- **Do not retaliate.** Retaliation escalates and can make you a participant.
- **Preserve evidence.** Screenshot the message with date, time, sender and URL; do not edit it.
- **Block and report.** Use platform tools, then tell a parent, teacher or counsellor.
- **Support the target.** A private message of support can matter more than a public comment.

### Copyright, Creative Commons and citation

**Intellectual property (IP)** protects creations of the mind. **Copyright** covers original works such as text, music, images, code and video; it arises automatically and usually lasts for the creator’s lifetime plus decades. **Trademarks** protect brand identifiers; **patents** protect inventions; **trade secrets** protect confidential formulas or processes.

**Plagiarism** is presenting someone else’s work or ideas as your own, even if you changed a few words. **Fair use** (or fair dealing) is a limited legal exception for purposes such as criticism, teaching or news; it is not a blanket permission. When in doubt, ask, license or link.

**Figure 3.4 — The reuse spectrum.** CC licences are not “free of rules”; each one specifies attribution, commercial use and derivative works.

*Diagram summary:* CC0 / public domain (no conditions) → CC BY / BY-SA (attribute; share-alike) → CC BY-NC / ND (non-commercial; no derivatives) → all rights reserved (ask for permission). Freedom to reuse decreases from left to right.

> **Exam trap — Cite with TASL**
>
> **T**itle of the work · **A**uthor · **S**ource link · **L**icence. Example: *“Digital Footprint” by A. Musa, via Wikimedia Commons, CC BY-SA 4.0.* For school assignments, include the access date and the full URL. A citation is not decoration; it is evidence of intellectual honesty.

### Verify before you share

Misinformation spreads because it is emotional, urgent and easy to forward. Use the **SIFT** method: **Stop** and check your emotional reaction; **Investigate** the source; **Find** better coverage; **Trace** the claim, image or quote to its original context. Reverse image search and lateral reading (opening other tabs to see what trusted sources say) are fast, free skills.

> **Visual placeholder:** Side-by-side screenshot of a browser address bar showing the HTTPS padlock and certificate details, and a social-media privacy settings page. Annotate the domain name, certificate issuer, audience selector and location-permission toggle.

## Deen + Digital — The tongue has a keyboard now

“O you who have believed, if there comes to you a disobedient one with information, investigate, lest you harm a people out of ignorance and become, over what you have done, regretful” (49:6). The verse was revealed about news and conflict; its principle applies directly to the forwarded message, the unverified screenshot and the viral clip.

The Qur’an also warns against suspicion, spying and backbiting (49:12), and describes backbiting as eating the flesh of a dead brother. A subtweet, a gossip group, a humiliating video or a leaked photo is not “just content”. **Privacy is a right, not a hiding place for wrongdoing.** Protect people’s data, ask before sharing their image, and correct falsehood with evidence rather than insults.

> “And do not spy or backbite one another.”
>
> **Qur’an 49:12** · verify, protect, and speak with justice

## Quick Review

*Chapter 3 · 10-minute recall*

### Core ideas

- CIA triad: confidentiality, integrity, availability.
- Malware: virus (host), worm (self-spreading), trojan (disguise), ransomware (encryption), spyware (secret collection).
- Phishing clues: look-alike domain, urgency, fear, suspicious link, password request, generic greeting, unexpected attachment.
- Strong password = long, unique, random; add MFA; use a manager; never share OTPs.
- HTTPS encrypts the connection, not the honesty of the site.
- 3-2-1 backup: 3 copies, 2 media, 1 off-site/offline; test restore.
- Footprint: active vs passive; deletion is not erasure; context can collapse.
- Copyright is automatic; CC licences grant specific permissions; cite with TASL.

### Key vocabulary

malware · virus · worm · trojan · ransomware · spyware · phishing · smishing · social engineering · firewall · encryption · TLS · HTTPS · MFA · OTP · password manager · digital footprint · cookie · cyberbullying · copyright · plagiarism · Creative Commons · fair use · public domain · SIFT

### One-line answers

- **Padlock?** — Encrypted connection with a valid certificate — not proof of good intentions.
- **Why MFA?** — A stolen password alone is no longer enough to enter.
- **Why cite?** — To credit the creator, allow verification and avoid plagiarism.

**Objectives check:** O1 → Q1 · O2 → P1 · O3 → Q3 · O4 → Q2 · O5 → Q4 + P2 · O6 → Q5 *(Q = MCQ; P = practical prompt)*

## Assessment Suite

**Chapter 03** — 5 MCQs · 2 practical prompts. Suggested time: 18 minutes.

### Multiple-choice questions

1. Which malware encrypts a victim’s files and demands payment for the decryption key?
   - **A.** Adware
   - **B.** Worm
   - **C.** Ransomware
   - **D.** Rootkit

2. Which login approach is strongest against guessing and credential theft?
   - **A.** A long unique passphrase plus multi-factor authentication.
   - **B.** The same strong password on every account.
   - **C.** Your birthday followed by “123”.
   - **D.** Replacing “a” with “@” in a common word.

3. What does the padlock and HTTPS in a browser guarantee?
   - **A.** The website is honest and safe to buy from.
   - **B.** Your password will never be stolen.
   - **C.** The site cannot contain phishing content.
   - **D.** The connection is encrypted and the certificate matches the domain.

4. Which is an example of an **active** digital footprint?
   - **A.** A cookie stored when you visit a news site.
   - **B.** A comment you deliberately post under your real name.
   - **C.** Your IP address recorded by a game server.
   - **D.** The device type detected by a website.

5. An image is licensed **CC BY-NC 4.0**. Which use is permitted without further permission?
   - **A.** Using it in a school project with attribution, no payment.
   - **B.** Selling posters of the image without attribution.
   - **C.** Claiming you created the image.
   - **D.** Using it in a commercial advertisement.

### Answer key with explanations

1. **C** — Ransomware encrypts data and sells the key; offline backups are the strongest defence.
2. **A** — Length, uniqueness and a second factor defeat guessing and stolen passwords.
3. **D** — HTTPS protects data in transit; it does not certify ethics or legitimacy.
4. **B** — Active footprints are deliberate; cookies, IP and device data are passive.
5. **A** — BY = attribution; NC = non-commercial. A school project with credit is allowed.

### Practical prompts

**Practical prompt 1 — Investigate (8 marks)**

Write a short safety notice to your classmates identifying six red flags in a phishing message and explaining what to do instead of clicking.

*Hint:* Include sender verification, link inspection (hover, do not click), OTP secrecy, reporting and preserving evidence. Keep it under 150 words but specific.

**Practical prompt 2 — Evaluate (10 marks)**

A friend posts an embarrassing photo of a classmate and it is shared widely. Describe a response that is safe, lawful and ethical, and explain the long-term footprint consequences for everyone involved.

*Hint:* Consider consent, reporting, evidence, cyberbullying law, the target’s wellbeing, the sharer’s responsibility, and what cannot be undone. Propose a prevention rule for your class.
