# Module 1 · Chapter 1 — Advanced Computer Architecture & Operations

*Module 1 · Chapter 01*

> What is inside the box, how the parts cooperate, and how an operating system turns hardware into a usable tool.

**Topics:** 2 — 1.1 Hardware · 1.2 OS · **Study time:** ~70 minutes · **Visuals:** 8 diagrams & tables · **Assessment:** 5 MCQs + 2 practical prompts

> **Note on figures:** The original study guide uses vector diagrams. In this Markdown extract, each figure is represented by its caption and a summary of its labelled content.

## Behavioural learning objectives

By the end of this chapter you can:

- **Differentiate** volatile from non-volatile memory, with examples and consequences.
- **Explain** how CPU clock speed, cores, cache and architecture affect performance.
- **Compare** HDD and SSD storage on speed, durability, noise, power and cost.
- **Diagnose** common startup faults using POST behaviour and a logical sequence.
- **Describe** the functions of an operating system and classify major OS families.
- **Manage** absolute and relative file paths and choose suitable utility tools.

## 1.1 System Hardware & Maintenance

A computer is not a single object; it is a system of components that exchange data through buses. When one component fails, the symptom often appears somewhere else. Understanding the architecture is therefore the difference between guessing and diagnosing.

> **Performance is a system property:** the CPU, memory, storage and cooling must feed one another. One fast part cannot rescue a slow chain.

### The five functional blocks

Every general-purpose computer — desktop, laptop, tablet or smartphone — performs the same five jobs: **input**, **processing**, **memory**, **storage** and **output**. Data flows from input devices into memory; the **central processing unit (CPU)** processes it; results go to output devices or are saved to storage. The **motherboard** is the physical platform and communication backbone that connects these blocks.

**Figure 1.1 — The five functional blocks.** The CPU sits at the centre, but performance depends on how quickly data can move to and from memory, storage and devices.

*Diagram summary:* Input (keyboard, mouse, touch, camera) → system bus (data, address and control signals) → CPU (ALU, control unit, registers; clock, cores and cache). RAM (working memory, volatile, fast), storage (HDD, SSD, cloud, non-volatile) and output (monitor, printer, speaker, haptics) all connect through the bus.

> **Note — The Von Neumann idea**
>
> Most computers follow the **stored-program** model: both **instructions** and **data** live in the same memory, and the CPU fetches them one at a time. This is elegant, but it creates the **von Neumann bottleneck** — the CPU can process faster than memory can feed it. Cache memory exists to reduce this bottleneck.

> **Visual placeholder:** Photograph of an open desktop case with callout lines labelling the CPU socket and cooler, RAM slots, SATA ports, M.2 slot, power supply and expansion slots. Use a real school laboratory machine where possible.

### Inside the CPU: the component that executes instructions

The CPU follows a repeated **fetch–decode–execute–store** cycle. The **control unit** coordinates the cycle, the **arithmetic logic unit (ALU)** performs calculations and comparisons, and **registers** hold the tiny amount of data needed right now. **Cache memory** (L1, L2, L3) is a small, very fast buffer between the CPU and RAM.

- **Clock speed** — The number of cycles per second, measured in gigahertz (GHz). 3.2 GHz means roughly 3.2 billion cycles per second. Higher clock speed can mean faster execution — but only when comparing similar architectures.
- **Cores** — Independent processing units on one chip. More cores help with multitasking and parallel workloads; a single-threaded task may not use them all.
- **Cache** — Ultra-fast memory built into or near the CPU. Bigger cache usually improves performance because fewer trips to slower RAM are needed.

> **Exam trap — “more GHz always wins”**
>
> It does not. A 2.8 GHz modern CPU can outperform an older 3.6 GHz CPU because of better **instructions per cycle (IPC)**, more cores, larger cache and faster memory. Compare complete systems, not one number.

### Memory: volatile and non-volatile

**Volatile memory** loses its contents when power is removed. **Non-volatile memory** keeps its contents without power. This single distinction explains why unsaved work disappears in a power cut, while your files, photos and operating system survive.

| Feature | RAM (Random Access Memory) | ROM (Read-Only Memory) |
|---|---|---|
| **Volatility** | Volatile — cleared at shutdown | Non-volatile — retained without power |
| **Typical role** | Holds the OS, open apps and active data for the CPU | Stores firmware such as the BIOS/UEFI startup instructions |
| **Writable?** | Yes, continuously, by programs | Normally read-only; firmware can be updated (“flashed”) on modern systems |
| **Speed** | Very fast (nanoseconds) | Slower than RAM, but only read at startup or when firmware is needed |
| **Effect of more capacity** | More apps and browser tabs can stay open without slowdown | Capacity is fixed by the firmware chip; not a user upgrade |
| **Everyday example** | 8 GB or 16 GB DDR memory modules | BIOS/UEFI chip on the motherboard |

*Table 1.1 — RAM versus ROM. “Memory” in everyday speech usually means RAM; “storage” means the non-volatile disk or flash drive.*

**Figure 1.2 — The memory hierarchy.** The closer memory is to the CPU, the faster and more expensive it is per gigabyte. Good system design keeps frequently used data near the top.

*Diagram summary:* Registers → Cache (L1–L3) → RAM — working memory (volatile) → SSD/HDD — local storage (non-volatile) → Cloud/tape archive — largest, slowest, cheapest. The top is fastest, smallest and most expensive per GB; capacity increases downwards.

### Storage technologies: HDD versus SSD

A **hard disk drive (HDD)** stores data magnetically on spinning platters and reads it with a moving head. A **solid-state drive (SSD)** stores data in flash memory chips with no moving parts. Both are non-volatile; they differ in mechanics, speed and failure behaviour.

| Criterion | HDD | SSD |
|---|---|---|
| **Moving parts** | Spinning platters and an actuator arm | None — electronic flash cells |
| **Boot and load speed** | Slower: mechanical seek and rotational delay | Much faster: near-instant random access |
| **Shock resistance** | Low — a drop can damage the head or platter | High — better for laptops and phones |
| **Noise and power** | Audible spin; higher power draw | Silent; lower power; cooler |
| **Cost per GB** | Lower — best for bulk archives | Higher — but falling steadily |
| **Maintenance** | Defragment occasionally to reorganise files | Do **not** defragment; the OS sends TRIM commands instead |
| **Typical use** | Backup drives, CCTV storage, budget desktops | Operating systems, laptops, servers, phones |

*Table 1.2 — HDD versus SSD. A common upgrade is a small SSD for the operating system plus a large HDD for archives — speed where it matters, capacity where it is cheap.*

> **Note — Why an SSD speeds up booting**
>
> The operating system reads thousands of small files during startup. An HDD must physically move its head to each location, causing **seek time** and **rotational latency**. An SSD addresses flash cells electronically, so random reads are dramatically faster. Sequential speed matters for copying large files; random speed matters for starting applications.

> **Try it — Choose storage for three budgets**
>
> **A.** A school lab needs five fast boot drives and a shared archive. **B.** A student needs the cheapest 1 TB for family photos. **C.** A video editor needs a scratch disk and long-term backup. For each, recommend an SSD/HDD combination and justify it in one sentence using speed, capacity, durability and cost per GB.

### Basic hardware troubleshooting

When a computer fails to start, work from the outside in and from simple to complex. The **power-on self-test (POST)** is firmware code that checks essential hardware before the OS loads. Beep codes or diagnostic LEDs report failures; their meaning depends on the motherboard manufacturer.

**Figure 1.3 — A logical startup diagnostic path.** Never open a PSU or poke inside a plugged-in machine; unplug first and follow your school’s safety rules.

*Diagram summary:* Computer will not start → any lights or fan noise? If no, check the power lead, switch, socket and PSU, then test another outlet. If yes → any image on screen? If no, check monitor input, cable and GPU seating; reseat RAM if needed. If yes → any beep code or debug LED? If yes, decode the pattern; test RAM one stick at a time and reseat cards. If no → does the OS begin to load? If yes, check boot order or use OS repair (Safe Mode, startup repair, check disk and backups).

> **Exam trap — The troubleshooting rule of four**
>
> **1. Reproduce** the fault. **2. Isolate** the variable — change one thing at a time. **3. Verify** the fix with a restart and a stress test. **4. Document** what happened so the next person does not repeat the work. “It just started working” is not a diagnosis.

## 1.2 Operating Systems & Utilities

Hardware without an operating system is like a library with no catalogue, no librarian and no lights. The operating system (OS) is the master program that manages resources, provides a human-friendly interface, and keeps applications from colliding with one another.

### Six functions of an operating system

- **Process management** — Schedules programs on the CPU, starts and stops processes, and prevents one app from freezing the system.
- **Memory management** — Allocates RAM to programs, swaps data to disk when RAM is full, and reclaims memory when apps close.
- **File management** — Organises files in folders, tracks names, sizes, permissions and locations, and enforces access rights.
- **Device management** — Uses drivers to translate OS commands into signals that printers, cameras, keyboards and GPUs understand.
- **Security & access control** — Handles logins, permissions, encryption and audit trails; isolates user accounts from each other.
- **User interface** — Provides a GUI (windows, icons, menus, pointer) or a CLI (typed commands) for humans to control the machine.

**Figure 1.4 — The OS as a layer between applications and hardware.** Applications never talk to the disk directly; they ask the OS, which enforces permissions and fairness.

*Diagram summary:* Applications and user interface (browser, word processor, spreadsheet, games, code editor) → operating system kernel and services (processes, memory, files, devices, network, security; system calls and drivers) → hardware (CPU, RAM, disks, GPU, network card, USB devices).

### Types of operating systems

| Family | Examples | Typical strengths | Common context |
|---|---|---|---|
| **Windows** | Windows 10/11, Windows Server | Wide software compatibility, familiar GUI, strong school/business support | School labs, offices, gaming |
| **Linux** | Ubuntu, Fedora, Debian, Android (Linux-based) | Open source, stable, highly customisable, free to install | Servers, coding, low-cost labs |
| **macOS** | macOS (Apple) | Polished interface, strong creative tools, Unix foundation | Design, media, Apple hardware |
| **Android** | Android (Google, Linux kernel) | Touch-first, huge app ecosystem, affordable devices | Phones and tablets |
| **iOS / iPadOS** | iPhone, iPad | Tight security, smooth integration, curated app store | Apple mobile devices |
| **Real-time OS** | FreeRTOS, VxWorks | Guaranteed response within a deadline | Cars, medical devices, robots |

*Table 1.3 — OS families. The same task can be done on any general-purpose OS; the best choice depends on hardware, budget, software and support.*

### File management and paths

A **file** is a named collection of data. A **folder (directory)** groups files. A **path** describes where a file lives. An **absolute path** starts from the root; a **relative path** starts from the current folder.

- **Windows absolute path** — `C:\Users\Amina\Documents\ICT\notes.txt` — Drive letter `C:` → folders → filename + extension.
- **Linux / macOS absolute path** — `/home/amina/ict/notes.txt` — Single root `/`; case-sensitive on Linux.
- **Relative path** — `Documents\ICT\notes.txt` — Starts from the current working directory.
- **File extension** — `.txt · .docx · .xlsx · .py · .jpg` — Hints at the file type; the OS uses it to choose an app.

> **Exam trap — Extensions are hints, not guarantees**
>
> Renaming `virus.exe` to `holiday.jpg` does not make it an image. The file’s internal structure still determines what it is. This is why “show file extensions” is a basic security setting — and why you should never open unexpected attachments.

> **Visual placeholder:** Annotated screenshot of the Windows File Explorer address bar and a Linux terminal prompt side by side, highlighting the root, folders, filename and extension. Blur any personal usernames.

### Utility software: the maintenance toolkit

| Utility | What it does | Use it when… |
|---|---|---|
| **Antivirus / anti-malware** | Scans files and memory for known malicious patterns and suspicious behaviour; quarantines threats. | Always running; scan downloads and USB drives before opening. |
| **Disk cleanup** | Removes temporary files, caches, old updates and recycle-bin contents. | Storage is nearly full or the system feels cluttered. |
| **Disk defragmenter** | Reorganises fragmented files so an HDD can read them sequentially. | On an **HDD** only. Never on an SSD. |
| **TRIM / optimise** | Tells an SSD which blocks are no longer needed, preserving speed and lifespan. | Scheduled automatically on modern SSDs. |
| **Backup** | Copies important data to another location so it survives theft, fire, ransomware or accidental deletion. | Before exams, repairs or any major change. |
| **Task manager / activity monitor** | Shows running processes, CPU/RAM/disk usage and startup apps; lets you end a frozen process. | The computer is slow, hot or unresponsive. |
| **Compression** | Reduces file size for storage or sharing (ZIP, RAR, 7z). | Sending many files or saving space; never as a substitute for backup. |
| **Firewall** | Filters network traffic according to rules; blocks unsolicited inbound connections. | Always on, especially on public Wi-Fi. |

*Table 1.4 — Utility software. Utilities protect, clean, organise or repair; they are not the same as application software used to create content.*

## Deen + Digital — Amanah in the machine

A device is a trust (*amanah*). You are accountable for how you use it, what you store on it and how you treat the people whose data it holds. The Prophet ﷺ taught that Allah loves excellence in work (*itqan*), and he instructed us to tie our camel — to take reasonable precautions rather than claim that faith replaces effort.

**Practically:** back up your work before a storm or an exam; install updates; do not use pirated software; do not repair someone’s phone and secretly copy their photos. Waste is also a moral issue: extending the life of a device through maintenance is better than discarding it because it is slow. The same care that keeps a laptop alive keeps a community’s resources alive.

> “And do not follow that of which you have no knowledge. Indeed, the hearing, the sight and the heart — all of those will be accounted for.”
>
> **Qur’an 17:36** · verify before you click, install or accuse

## Quick Review

*Chapter 1 · 10-minute recall*

### Core ideas

- Five blocks: input, processing, memory, storage, output — linked by the system bus.
- CPU cycle: fetch → decode → execute → store. Performance = clock × IPC × cores × cache, constrained by cooling and memory.
- RAM is volatile and holds active work; ROM is non-volatile and holds firmware. Storage is non-volatile.
- HDD = mechanical, cheap per GB, slower, fragile; SSD = flash, fast, silent, shock-resistant, higher cost per GB.
- POST checks hardware at startup; beep codes and debug LEDs identify faults. Change one variable at a time.
- The OS manages processes, memory, files, devices, security and the interface.
- Absolute paths start at the root; relative paths start at the current folder.
- Defragment HDDs, never SSDs. Use TRIM and backups instead.

### Key vocabulary

CPU · ALU · control unit · register · cache · clock speed · core · motherboard · system bus · RAM · ROM · firmware · BIOS/UEFI · volatile · non-volatile · HDD · SSD · TRIM · POST · beep code · driver · kernel · absolute path · relative path · extension · defragmentation · utility software

### One-line answers

- **Why cache?** — To reduce the von Neumann bottleneck by keeping frequent data close to the CPU.
- **Why POST?** — To verify essential hardware before handing control to the OS.
- **Why TRIM?** — To keep SSD write performance and lifespan healthy.

**Objectives check:** O1 → Q1 · O2 → Q2 · O3 → Q4 · O4 → Q3 · O5 → Q4 + P2 · O6 → Q5 *(Q = MCQ; P = practical prompt)*

## Assessment Suite

**Chapter 01** — 5 MCQs · 2 practical prompts. Suggested time: 18 minutes.

### Multiple-choice questions

1. Which statement correctly distinguishes RAM from ROM?
   - **A.** RAM is volatile and holds active data; ROM is non-volatile and stores firmware.
   - **B.** RAM is non-volatile; ROM loses its contents when power is removed.
   - **C.** RAM stores the operating system permanently; ROM is upgraded by adding sticks.
   - **D.** RAM is slower than ROM but has a larger capacity.

2. A student replaces a 4 GB RAM module with a 16 GB module. What is the most direct expected benefit?
   - **A.** The screen resolution increases automatically.
   - **B.** The SSD gains more storage capacity.
   - **C.** More applications and browser tabs can remain open without heavy slowdown.
   - **D.** The CPU clock speed rises from 2.4 GHz to 4.8 GHz.

3. A desktop powers on, the fans spin, but there is no display and the motherboard emits a repeated beep pattern. What is the most appropriate first step?
   - **A.** Reinstall the operating system immediately.
   - **B.** Open the power supply while it is still plugged in.
   - **C.** Replace the monitor and keyboard.
   - **D.** Consult the motherboard manual or manufacturer’s beep-code table.

4. Which maintenance action is **inappropriate** for a solid-state drive?
   - **A.** Enabling TRIM.
   - **B.** Running a traditional disk defragmenter regularly.
   - **C.** Keeping free space available for wear levelling.
   - **D.** Backing up important files to another drive.

5. In the path `C:\Users\Amina\Documents\ict.txt`, which part is the file extension?
   - **A.** `C:\`
   - **B.** `Users\Amina`
   - **C.** `.txt`
   - **D.** `Documents`

### Answer key with explanations

1. **A** — RAM is volatile working memory; ROM retains firmware without power.
2. **C** — More RAM allows more concurrent data in memory; it does not change CPU speed or storage.
3. **D** — POST beep codes are manufacturer-specific; decode them before replacing parts.
4. **B** — Defragmentation is for mechanical HDDs; SSDs use TRIM and wear levelling.
5. **C** — The extension follows the final dot and hints at the file type.

### Practical prompts

**Practical prompt 1 — Diagnose (8 marks)**

A school computer shows a black screen, but the power LED is on and the fan is running. Write a six-step diagnostic sequence, explaining what each step rules out.

*Hint:* Cover monitor power and input source, cable, RAM seating, GPU, POST code, and safe mode. State the safety precaution before opening the case.

**Practical prompt 2 — Decide (10 marks)**

A school has ₦120,000 to improve five old desktop computers. Compare upgrading to SSDs versus adding RAM, and recommend a plan with justification.

*Hint:* Consider boot speed, multitasking, cost per unit, existing RAM slots, data migration and longevity. A strong answer may recommend a mixed plan and explain the trade-off.
