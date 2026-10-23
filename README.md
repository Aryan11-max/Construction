# SiteStock – Construction Procurement & Inventory (Demo)

Mock system for multi-site inventory tracking and material procurement, built from the 23 Oct meeting with Arjun.

## Run
No build step, no dependencies.

- Double-click `index.html`, or
- Serve it: `npx serve .` or `python3 -m http.server 8080` then open http://localhost:8080

Data is saved in the browser's localStorage. Use **Reset demo data** in the header to restore the seed.

## Modules
| Tab | What it does |
|---|---|
| Dashboard | Open requests, approvals pending, in-transit lines, low stock, stock value per location |
| Requests | Replaces WhatsApp. Site raises request → Approved → Dispatched (warehouse) / PO Raised (vendor) → Delivered. Full tracker timeline per request |
| Inventory | Live balance matrix: materials × warehouses, sites, in transit |
| Transfers & ledger | Move stock between any two locations (incl. site→site), log site consumption, full movement history |
| Job cost (JCR) | Client value, budget, labour/subcon, live material cost per activity, burn %, margin |
| Materials & locations | Material master with codes, rates, reorder levels; add new sites/warehouses (dynamic locations) |

## How it works
- Every stock change is a **movement** `{code, qty, from, to, type, ref, act}`. Balances are computed from the ledger, never edited directly.
- Special locations: `VENDOR` (inward), `TRANSIT` (dispatched, not yet received), `CONSUMED` (used at site).
- Warehouse requests move stock to `TRANSIT` on dispatch and to the site on delivery. Vendor-direct requests (e.g. pile foundation steel/RMC) go `VENDOR → site` on delivery.
- Each movement into a site carries an activity, which feeds the JCR material cost in real time.

## Files
```
index.html        markup shell
css/styles.css    styles (light + dark theme)
js/data.js        seed data: locations, materials, movements, requests, JCR
js/app.js         state, stock calculation, views, actions
```

## Next steps
1. Load Arjun's JCR Excel and inventory list into `js/data.js` (or an import screen).
2. Expand the material master to ~50 codes.
3. Move to a backend (e.g. Supabase/Postgres or Node + SQLite) with logins for Site Engineer / Office / Warehouse roles.
4. WhatsApp or SMS notifications on status changes.
