# Contest-day deployment: one Windows PC, no cloud, no internet dependency

This is for an **in-person** event where every student's device is on the
same WiFi/LAN as one PC you control. The whole stack (MongoDB, Redis,
backend, frontend, and self-hosted Judge0) runs on that one machine. Students
open a browser and go to `http://<that PC's LAN IP>/` - nothing touches the
public internet during the contest, so there's no cloud signup, no credit
card, no rate limits, and no dependency on the venue's internet uptime.

Do this walkthrough **at least a day or two before the event**, not the
morning of.

## 0. Pick the machine

- Windows 10/11, 64-bit, ideally 8GB+ RAM. Most lab/desktop PCs qualify.
- Prefer a machine plugged in via Ethernet to the same switch/router
  students' devices connect to. WiFi works too, but Ethernet is one less
  thing that can flake mid-contest.
- Check BIOS/UEFI has virtualization enabled (Docker Desktop needs it) -
  usually already on by default on anything made in the last ~8 years.

## 1. Install prerequisites

1. Install **Docker Desktop for Windows** (docker.com) - during setup, choose
   the **WSL2** backend when prompted (this is the default on current
   installers). WSL2 is a real Linux kernel, so Judge0's Linux-only,
   privileged-container image runs natively - no emulation, no
   `exec format error`.
2. Install **Git for Windows** (git-scm.com), or just download the repo as a
   ZIP from GitHub if Git feels like one more thing to install.
3. Reboot if the installer asks for it, then open Docker Desktop once and
   confirm it says "Engine running" in the bottom-left.

## 2. Get the code and the Judge0 secrets onto the machine

```bash
git clone https://github.com/alviayovas-cell/codesphere.git
```

The `judge0-selfhosted/` folder (with the real generated Redis/Postgres/Rails
secrets) is deliberately **not** in git - copy it over separately (USB drive,
AirDrop-to-a-shared-folder, whatever's easiest) into the repo root, so you
end up with:

```
codesphere/
  codesphere/          <- the app (backend/, frontend/, docker-compose.yml)
  judge0-selfhosted/   <- docker-compose.yml + judge0.conf (copied in manually)
```

## 3. Configure the backend

```bash
cd codesphere/codesphere/backend
copy .env.lan.example .env
```

Open `.env` and fill in `JWT_SECRET_KEY` with a real generated value. With
Git Bash or WSL:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Paste the output as `JWT_SECRET_KEY=...`. Everything else in `.env.lan.example`
is already set up for this deployment (Judge0 pointed at
`host.docker.internal:2358`, production mode, sane timeouts).

## 4. Start Judge0 first

```bash
cd ../../judge0-selfhosted
docker compose up -d
```

Give it a minute, then confirm it's actually answering:

```bash
curl http://localhost:2358/about
```

You should get back JSON with a Judge0 version string. If this hangs or
errors, don't move on - fix Judge0 first (check `docker compose logs`).

## 5. Start the app

```bash
cd ../codesphere
docker compose up --build
```

This builds and starts MongoDB, Redis, the backend API, 2 grading workers,
and the frontend (served by nginx on port 80). First build takes a few
minutes; subsequent ones are much faster.

Once it's up, on the **same machine** open `http://localhost/` - you should
see the CodeSphere login page.

## 6. Find the LAN IP students will use

```bash
ipconfig
```

Look for the "IPv4 Address" under the network adapter that's actually
connected to the venue's WiFi/switch (e.g. `192.168.1.50`). If your
router/network admin can give this machine a **static IP or a DHCP
reservation**, do that now - it means the address won't change on you
mid-event.

From a **different device** on the same network, open
`http://192.168.1.50/` (your actual IP) - you should see the same login
page. This is the URL you'll give students on contest day.

If this step fails but `localhost` worked in step 5, it's almost always one
of:
- **Windows Firewall** blocking inbound connections - see step 7.
- **AP/client isolation** on the WiFi, which blocks devices from reaching
  each other even on the same network - ask whoever manages the venue's
  WiFi to disable it for the contest SSID, or use a separate switch/router
  you control instead of the venue's shared WiFi.

## 7. Windows Firewall

When Docker Desktop or the app first binds a port, Windows may prompt to
allow it through the firewall - click **Allow** for both Private and Public
networks (or whichever matches the venue's network profile). If you missed
the prompt, add a rule manually: Windows Defender Firewall → Advanced
Settings → Inbound Rules → New Rule → Port → TCP → `80` → Allow.
(Port 8000 doesn't need to be opened to other devices - only the machine
itself talks to it, everything else goes through port 80.)

## 8. Seed problems / create the admin account

Use whatever seeding process you already used for local testing (e.g. the
existing `backend/scripts/seed_problems.py` and your admin-creation script),
run from inside the `backend` container or against `localhost:8000` from the
host - same as you've done in local dev, just pointed at this machine
instead of your Mac.

## 9. Before the actual event

- Load-test this exact deployment (not the mocked local `load_test.py` run
  earlier) with something close to your real headcount - point it at
  `http://<lan-ip>/api` and simulate 35-50 concurrent Run/Submit calls.
- Turn off Windows sleep/hibernate on this machine (Settings → System →
  Power) so it doesn't go to sleep mid-contest.
- Do a dry run with 2-3 phones/laptops on the actual venue WiFi, not just
  your own machine, to catch AP-isolation or firewall issues while there's
  still time to fix them.

## 10. Shutting down after the event

```bash
cd codesphere/codesphere && docker compose down
cd ../../judge0-selfhosted && docker compose down
```

Data (submissions, students, problems) persists in Docker volumes between
runs unless you also pass `-v` (which deletes it) - don't pass `-v` unless
you actually want to wipe everything.
