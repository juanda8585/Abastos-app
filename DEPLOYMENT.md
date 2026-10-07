# Deploying Bubala on a standalone PC (POC)

Target scenario: the app runs on **one normal Windows PC** (not a server) inside
the internal network. One user opens it **from another PC** using a browser.
The application is **started with one shortcut and stopped with another** — it
does not stay running all day.

```
  PC-B (user) ──browser──> http://<PC-A-IP>/  ──nginx:80──> /api/* ──> API:3000 ──> PostgreSQL
   (only port 80 needs to be open on PC-A; API and DB are loopback-only)
```

---

## 1. What you need on PC-A (the PC that hosts the app)

| Requirement | Notes |
|---|---|
| Windows 10 (1803+) / Windows 11, admin rights | Needed once, to install Docker Desktop |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Windows installer with WSL2 backend |
| This project folder copied to PC-A | e.g. `C:\Bubala-app` |
| Internet **or** the offline image bundle | See §4 for the offline/internal-network path |

Nothing else — no Node.js, no PostgreSQL, no IIS on the target PC. Everything
runs inside the three containers defined in `docker-compose.yml`.

---

## 2. One-time setup on PC-A

1. Install Docker Desktop (accept the WSL2 backend) and reboot if asked.
2. Copy the project folder (e.g. from a USB stick or a share) to `C:\Bubala-app`.
3. **Allow port 80 through the firewall** (run once, in an *Administrator*
   command prompt):
   ```bat
   netsh advfirewall firewall add rule name="Bubala HTTP" dir=in action=allow protocol=TCP localport=80
   ```
4. Double-click **`Start-Bubala.bat`** — the first run builds the images
   (a few minutes) and starts everything. It opens `http://localhost/` and
   prints the URL to use from other PCs.
5. Note the IP printed by the script (or run `ipconfig` → IPv4 address),
   e.g. `192.168.1.50`. From PC-B open **`http://192.168.1.50/`**.

### Create the two shortcuts
1. Right-click `Start-Bubala.bat` → **Send to → Desktop (shortcut)**, rename it
   to **"Abrir Bubala"**.
2. Right-click `Stop-Bubala.bat` → **Send to Desktop (shortcut)**, rename it
   to **"Cerrar Bubala"**.
3. Optional: right-click shortcut → Properties → **Change Icon** to make them
   easy to spot.

---

## 3. Daily use

| You want to… | Do |
|---|---|
| Start working | Double-click **Abrir Bubala** → wait for the console to say *ready* → the browser opens by itself. The user opens `http://<PC-A-IP>/`. |
| Finish for the day | Double-click **Cerrar Bubala** → containers stop, **data is kept**. |
| Check what is running | `docker compose ps` |
| See logs | `docker compose logs -f backend-api` |

`Stop-Bubala.bat` only stops the containers. Docker Desktop can stay in the
tray (≈300 MB RAM); if you also want that memory back, right-click the Docker
whale icon → **Quit Docker Desktop**. Data survives either way.

> **Do not run `docker compose down -v`** — the `-v` deletes the database volume
> and all your data.

---

## 4. Offline / no-internet internal network

If PC-A cannot reach the internet, build and save the images on a machine that
can, copy them over, and load them:

```bat
:: on the internet-connected machine (with this project checked out)
docker compose build
docker save -o bubala-images.tar bubala-api bubala-frontend postgres:16-alpine

:: on PC-A (after installing Docker Desktop, which was copied as an .exe installer)
docker load -i bubala-images.tar
```

After that, `Start-Bubala.bat` works fully offline (its `--build` finds the
already-loaded images).

---

## 5. Backing up the data

The database lives in the Docker volume `bubala-app_postgres_data`. To take a
backup (containers must be running):

```bat
:: dump to a SQL file you can keep anywhere
docker exec my_postgres_container pg_dump -U myuser -d mydatabase > bubala-backup.sql
```

To restore later: start the app, then
`docker exec -i my_postgres_container psql -U myuser -d mydatabase < bubala-backup.sql`

If the whole volume is ever lost, the `init-scripts/*.sql` files rebuild an
empty system (schema, roster, demo data).

---

## 6. Troubleshooting

| Symptom | Fix |
|---|---|
| `Docker Desktop was not found` | Install Docker Desktop (§1). |
| Start script says *Docker Desktop did not start in time* | Open Docker Desktop manually and wait; check WSL2 is enabled (`wsl --status`). |
| *the API is not answering yet* | `docker compose logs backend-api` and `docker compose logs postgres_db`. First boot also runs the init scripts. |
| Page loads but data calls fail from PC-B | Confirm PC-A's firewall rule for port 80 (§2.3) and that you used the IP, not `localhost`. |
| Port 80 already in use | Find the culprit: `netstat -ano | findstr :80` (e.g. IIS or another web server). |
| Everything looks stale after a code change | The start script rebuilds automatically; or run `docker compose up -d --build`. |
| Database is empty/wrong | Never run `down -v`. Only a *fresh, empty* volume runs `init-scripts`. |

---

## 7. Security notes (POC-level, worth knowing)

* PostgreSQL (`5432`) and the API (`3000`) are bound to `127.0.0.1` in
  `docker-compose.yml` — **not reachable from the network**. Users go through
  nginx on port 80.
* There is **no authentication**: anyone who can reach port 80 can read and
  write data. Acceptable for an internal POC with one trusted user; add login
  before widening access.
* Default DB credentials (`myuser` / `mysecretpassword`) come from
  `docker-compose.yml`; change them before any wider rollout (requires
  recreating the volume, so do it on a fresh install).
