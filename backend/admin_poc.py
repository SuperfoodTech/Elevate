import os
import sys
from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy import create_engine, text
from pydantic import BaseModel

backend_dir = os.path.dirname(os.path.abspath(__file__))
elevate_dir = os.path.dirname(backend_dir)

if elevate_dir not in sys.path:
    sys.path.insert(0, elevate_dir)

from src.config import get_db_url

app = FastAPI(title="SuperFood Canvas Merchant Mapping Admin")
engine = create_engine(get_db_url())

class DragMapRequest(BaseModel):
    store_id: str
    target_resto_final: str
    target_status: str = "Live"

class ResetMapRequest(BaseModel):
    store_id: str

class RenameClusterRequest(BaseModel):
    old_name: str
    new_name: str

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SuperFood Canvas Admin - Merchant Mapping</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-canvas: #f8fafc;
            --grid-color: #cbd5e1;
            --panel-bg: #ffffff;
            --primary-accent: #2563eb;
            --grab-color: #00B14F;
            --shopee-color: #EE4D2D;
            --gofood-color: #00AA13;
        }

        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: var(--bg-canvas);
            background-image: radial-gradient(var(--grid-color) 1.2px, transparent 1.2px);
            background-size: 24px 24px;
            color: #0f172a;
            overflow-x: hidden;
        }

        .header-bar {
            background: rgba(15, 23, 42, 0.92);
            backdrop-filter: blur(12px);
            color: white;
            padding: 1rem 2rem;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
            position: sticky;
            top: 0;
            z-index: 1000;
        }

        .canvas-workspace {
            padding: 1.5rem;
            min-height: calc(100vh - 90px);
        }

        .miro-frame {
            background: var(--panel-bg);
            border-radius: 16px;
            border: 2px solid #e2e8f0;
            box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
            padding: 20px;
            min-height: 240px;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
        }

        .miro-frame-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 10px;
            border-bottom: 1px solid #f1f5f9;
        }

        .miro-frame-title {
            font-weight: 700;
            font-size: 1rem;
            color: #1e293b;
        }

        .miro-frame-pending {
            border-color: #f59e0b;
            background: #fffbeb;
        }

        .miro-frame-never {
            border-color: #ef4444;
            background: #fef2f2;
        }

        .miro-frame.drag-over {
            border-color: #2563eb;
            background-color: #eff6ff;
            box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.2);
            transform: scale(1.015);
        }

        .miro-frame-never.drag-over {
            border-color: #dc2626;
            background-color: #fee2e2;
            box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.2);
        }

        .store-node {
            background: #ffffff;
            border-radius: 12px;
            border: 1px solid #cbd5e1;
            padding: 12px 14px;
            margin-bottom: 10px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.04);
            cursor: grab;
            user-select: none;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .store-node:hover {
            border-color: var(--primary-accent);
            box-shadow: 0 8px 16px rgba(37, 99, 235, 0.12);
            transform: translateY(-2px);
        }

        .store-node:active {
            cursor: grabbing;
            opacity: 0.6;
            transform: scale(0.96) rotate(1deg);
        }

        .badge-platform {
            font-size: 0.7rem;
            font-weight: 700;
            letter-spacing: 0.5px;
            padding: 3px 8px;
            border-radius: 6px;
        }
        .bg-grab { background-color: var(--grab-color); color: white; }
        .bg-shopee { background-color: var(--shopee-color); color: white; }
        .bg-gofood { background-color: var(--gofood-color); color: white; }

        .mapped-chip {
            display: inline-flex;
            align-items: center;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 6px 10px;
            margin: 4px;
            font-size: 0.85rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.03);
            transition: all 0.15s ease;
        }
        .mapped-chip:hover {
            border-color: #cbd5e1;
            background: #ffffff;
        }
        .btn-chip-reset {
            background: none;
            border: none;
            color: #94a3b8;
            font-weight: 700;
            font-size: 1rem;
            margin-left: 8px;
            cursor: pointer;
            padding: 0 4px;
            line-height: 1;
        }
        .btn-chip-reset:hover {
            color: #ef4444;
        }

        .btn-rename-cluster {
            font-size: 0.75rem;
            padding: 2px 6px;
            color: #64748b;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            cursor: pointer;
        }
        .btn-rename-cluster:hover {
            background: #e2e8f0;
            color: #0f172a;
        }

        .toast-container-custom {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 2000;
        }
    </style>
</head>
<body>

    <div class="header-bar d-flex justify-content-between align-items-center">
        <div>
            <h5 class="mb-0 fw-bold">SuperFood Canvas Admin Workspace</h5>
            <small class="text-slate-400">Master Data Layer 3: <code>layer3_dim.dim_merchant_mapping</code></small>
        </div>
        <div class="d-flex align-items-center gap-3">
            <div class="input-group input-group-sm" style="width: 260px;">
                <input type="text" id="searchFilter" class="form-control bg-dark text-white border-secondary" placeholder="Cari nama toko / ID..." onkeyup="filterNodes()">
            </div>
            <span class="badge bg-warning text-dark px-3 py-2 fs-6">Pending: <span id="pendingCount">0</span></span>
            <span class="badge bg-success px-3 py-2 fs-6">Mapped: <span id="mappedCount">0</span></span>
            <button class="btn btn-sm btn-outline-light" onclick="fetchBoardData()">Sync Board</button>
        </div>
    </div>

    <div class="canvas-workspace">

        <div class="row g-4">

            <!-- PANEL ANTREAN TOKO BARU (PENDING REVIEW CANVAS FRAME) -->
            <div class="col-lg-4 col-md-5">
                <div class="miro-frame miro-frame-pending h-100">
                    <div class="miro-frame-header">
                        <div>
                            <span class="miro-frame-title text-amber-900">Unmapped Store Queue</span>
                            <small class="d-block text-muted">Toko hasil penarikan yang butuh pengakuan</small>
                        </div>
                        <span class="badge bg-amber-200 text-amber-900 px-2 py-1 fs-6" id="leftBadge">0</span>
                    </div>

                    <div id="unmappedList" class="overflow-auto pe-1" style="max-height: 70vh;" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDropToUnmapped(event)">
                        <!-- Dynamic Store Nodes -->
                    </div>
                </div>
            </div>

            <!-- PANEL TARGET CLUSTER CANVAS NODES -->
            <div class="col-lg-8 col-md-7">
                <div class="row g-4 overflow-auto" style="max-height: 80vh;" id="targetBuckets">

                    <!-- CLUSTER KHUSUS: NEVER / NON-AGENCY -->
                    <div class="col-md-6">
                        <div class="miro-frame miro-frame-never" data-target-resto="NEVER" data-target-status="Never" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event)">
                            <div class="miro-frame-header">
                                <div>
                                    <span class="miro-frame-title text-danger">NEVER / NON-AGENCY</span>
                                    <small class="d-block text-muted">Toko pribadi mitra (auto-filter out)</small>
                                </div>
                                <span class="badge bg-danger">Filter Out</span>
                            </div>
                            <div class="bucket-contents d-flex flex-wrap gap-1" id="bucket-NEVER"></div>
                        </div>
                    </div>

                    <!-- CONTAINER BUAT CLUSTER BARU -->
                    <div class="col-md-6">
                        <div class="miro-frame border-primary bg-white" style="border-style: dashed;">
                            <span class="miro-frame-title text-primary d-block mb-2">+ Tambah Cluster Cabang Baru</span>
                            <div class="input-group mb-2">
                                <input type="text" id="newBranchInput" class="form-control" placeholder="Nama Cabang Baku (e.g. Citraland)" onkeypress="if(event.key==='Enter') addNewBranchBucket()">
                                <button class="btn btn-primary font-weight-bold" onclick="addNewBranchBucket()">+ Cluster</button>
                            </div>
                            <small class="text-muted">Buat frame drop zone baru untuk mengelompokkan toko ke cabang baru.</small>
                        </div>
                    </div>

                </div>
            </div>

        </div>

    </div>

    <!-- Toast Notification Container -->
    <div class="toast-container-custom" id="toastContainer"></div>

    <script>
        let storesData = [];
        let mappedData = [];

        async function fetchBoardData() {
            try {
                const res = await fetch('/admin/api/board_data');
                const data = await res.json();
                storesData = data.pending;
                mappedData = data.mapped;
                
                document.getElementById('pendingCount').innerText = storesData.length;
                document.getElementById('mappedCount').innerText = mappedData.length;
                document.getElementById('leftBadge').innerText = storesData.length;

                renderUnmappedList();
                renderMappedBuckets();
            } catch (e) {
                console.error("Error fetching board data:", e);
            }
        }

        function renderUnmappedList() {
            const container = document.getElementById('unmappedList');
            container.innerHTML = '';

            if (storesData.length === 0) {
                container.innerHTML = '<div class="text-center text-muted py-5 fw-semibold">Semua toko baru sudah ter-mapping. Antrean kosong.</div>';
                return;
            }

            storesData.forEach(store => {
                const pClass = store.platform === 'GrabFood' ? 'bg-grab' : (store.platform === 'ShopeeFood' ? 'bg-shopee' : 'bg-gofood');
                const card = document.createElement('div');
                card.className = 'store-node';
                card.draggable = true;
                card.id = 'store-' + store.store_id;
                card.setAttribute('data-store-id', store.store_id);
                card.setAttribute('data-search-term', (store.nama_tarikan + ' ' + store.store_id + ' ' + store.platform).toLowerCase());

                card.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="badge-platform ${pClass}">${store.platform}</span>
                        <code class="text-muted small">${store.store_id}</code>
                    </div>
                    <div class="fw-bold text-slate-800 mb-1">${store.nama_tarikan || 'Nama Toko Raw'}</div>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-secondary">Brand/Owner: ${store.brand || store.outlet_name || store.owner_name || store.nama_tarikan || '-'}</small>
                        <small class="text-primary fw-semibold" style="font-size: 0.75rem;">Drag to map &rarr;</small>
                    </div>
                `;

                card.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', store.store_id);
                    card.style.opacity = '0.4';
                });

                card.addEventListener('dragend', (e) => {
                    card.style.opacity = '1';
                });

                container.appendChild(card);
            });
        }

        function renderMappedBuckets() {
            const groups = {};
            mappedData.forEach(m => {
                const key = m.status === 'Never' ? 'NEVER' : (m.nama_resto_final || 'UNKNOWN');
                if (!groups[key]) groups[key] = [];
                groups[key].push(m);
            });

            const neverBox = document.getElementById('bucket-NEVER');
            neverBox.innerHTML = '';
            if (groups['NEVER']) {
                groups['NEVER'].forEach(s => {
                    neverBox.appendChild(createMappedMiniBadge(s));
                });
            }

            const container = document.getElementById('targetBuckets');
            const existingDynamic = container.querySelectorAll('.dynamic-bucket');
            existingDynamic.forEach(el => el.remove());

            Object.keys(groups).forEach(branchName => {
                if (branchName === 'NEVER') return;

                const col = document.createElement('div');
                col.className = 'col-md-6 dynamic-bucket';
                col.innerHTML = `
                    <div class="miro-frame" data-target-resto="${branchName}" data-target-status="Live" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event)">
                        <div class="miro-frame-header">
                            <div>
                                <span class="miro-frame-title text-primary">Cluster: ${branchName}</span>
                                <button class="btn-rename-cluster ms-2" onclick="promptRenameCluster('${branchName}')">Edit Nama</button>
                            </div>
                            <span class="badge bg-primary px-2 py-1">${groups[branchName].length} Toko</span>
                        </div>
                        <div class="bucket-contents d-flex flex-wrap gap-1"></div>
                    </div>
                `;
                const contents = col.querySelector('.bucket-contents');
                groups[branchName].forEach(s => {
                    contents.appendChild(createMappedMiniBadge(s));
                });

                container.insertBefore(col, container.lastElementChild);
            });
        }

        function createMappedMiniBadge(s) {
            const chip = document.createElement('div');
            chip.className = 'mapped-chip';
            const pClass = s.platform === 'GrabFood' ? 'bg-grab' : (s.platform === 'ShopeeFood' ? 'bg-shopee' : 'bg-gofood');

            chip.innerHTML = `
                <span class="badge-platform ${pClass} me-2">${s.platform}</span>
                <span class="fw-semibold text-slate-800 me-2" style="font-size: 0.8rem;">${s.nama_tarikan || s.store_id}</span>
                <button class="btn-chip-reset" onclick="resetMapping('${s.store_id}')" title="Reset/Batalkan ke unmapped">&times;</button>
            `;
            return chip;
        }

        function handleDragOver(e) {
            e.preventDefault();
            e.currentTarget.classList.add('drag-over');
        }

        function handleDragLeave(e) {
            e.currentTarget.classList.remove('drag-over');
        }

        async function handleDrop(e) {
            e.preventDefault();
            const zone = e.currentTarget;
            zone.classList.remove('drag-over');

            const storeId = e.dataTransfer.getData('text/plain');
            const targetResto = zone.getAttribute('data-target-resto');
            const targetStatus = zone.getAttribute('data-target-status');

            if (!storeId) return;

            try {
                const res = await fetch('/admin/api/map_drag_drop', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        store_id: storeId,
                        target_resto_final: targetResto === 'NEVER' ? 'NEVER / NON-AGENCY' : targetResto,
                        target_status: targetStatus
                    })
                });

                if (res.ok) {
                    showToast(`Toko ID ${storeId} berhasil di-map ke ${targetResto}`);
                    await fetchBoardData();
                } else {
                    showToast("Gagal mengupdate mapping toko", "danger");
                }
            } catch (err) {
                console.error("Drop error:", err);
            }
        }

        async function handleDropToUnmapped(e) {
            e.preventDefault();
            const storeId = e.dataTransfer.getData('text/plain');
            if (storeId) {
                await resetMapping(storeId);
            }
        }

        async function resetMapping(storeId) {
            try {
                const res = await fetch('/admin/api/reset_mapping', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ store_id: storeId })
                });

                if (res.ok) {
                    showToast(`Mapping Toko ID ${storeId} berhasil dibatalkan`);
                    await fetchBoardData();
                } else {
                    showToast("Gagal membatalkan mapping toko", "danger");
                }
            } catch (err) {
                console.error("Reset error:", err);
            }
        }

        async function promptRenameCluster(oldName) {
            const newName = prompt(`Ubah nama cluster "${oldName}" menjadi:`, oldName);
            if (!newName || newName.trim() === '' || newName === oldName) return;

            try {
                const res = await fetch('/admin/api/rename_cluster', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ old_name: oldName, new_name: newName.trim() })
                });

                if (res.ok) {
                    showToast(`Cluster "${oldName}" berhasil diubah menjadi "${newName.trim()}"`);
                    await fetchBoardData();
                } else {
                    showToast("Gagal mengubah nama cluster", "danger");
                }
            } catch (err) {
                console.error("Rename cluster error:", err);
            }
        }

        function addNewBranchBucket() {
            const input = document.getElementById('newBranchInput');
            const val = input.value.trim();
            if (!val) return;

            const container = document.getElementById('targetBuckets');
            const col = document.createElement('div');
            col.className = 'col-md-6 dynamic-bucket';
            col.innerHTML = `
                <div class="miro-frame" data-target-resto="${val}" data-target-status="Live" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event)">
                    <div class="miro-frame-header">
                        <div>
                            <span class="miro-frame-title text-primary">Cluster: ${val}</span>
                            <button class="btn-rename-cluster ms-2" onclick="promptRenameCluster('${val}')">Edit Nama</button>
                        </div>
                        <span class="badge bg-secondary px-2 py-1">0 Toko</span>
                    </div>
                    <div class="bucket-contents d-flex flex-wrap gap-1"></div>
                </div>
            `;
            container.insertBefore(col, container.lastElementChild);
            input.value = '';
            showToast(`Cluster Cabang ${val} berhasil dibuat`);
        }

        function filterNodes() {
            const q = document.getElementById('searchFilter').value.toLowerCase().trim();
            const cards = document.querySelectorAll('#unmappedList .store-node');
            cards.forEach(card => {
                const term = card.getAttribute('data-search-term');
                if (!q || term.includes(q)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        function showToast(msg, type = "success") {
            const container = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = `alert alert-${type} shadow-lg py-2 px-3 mb-2 rounded-3 text-white bg-${type === 'success' ? 'dark' : 'danger'}`;
            toast.innerText = msg;
            container.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }

        fetchBoardData();
    </script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
"""

@app.get("/admin", response_class=HTMLResponse)
def get_admin_dashboard():
    return HTMLResponse(content=HTML_TEMPLATE)

@app.get("/admin/api/board_data")
def get_board_data():
    with engine.connect() as conn:
        pending_sql = text("""
            SELECT store_id, platform, nama_tarikan, nama_resto_final, outlet_name, brand, group_code, owner_name 
            FROM layer3_dim.dim_merchant_mapping 
            WHERE mapping_status = 'PENDING_REVIEW'
            ORDER BY created_at DESC
        """)
        pending_stores = [dict(r._mapping) for r in conn.execute(pending_sql).fetchall()]

        mapped_sql = text("""
            SELECT store_id, platform, owner_name, outlet_name, brand, nama_resto_final, nama_tarikan, group_code, status 
            FROM layer3_dim.dim_merchant_mapping 
            WHERE mapping_status = 'MAPPED'
            ORDER BY updated_at DESC
        """)
        mapped_stores = [dict(r._mapping) for r in conn.execute(mapped_sql).fetchall()]

    return {"pending": pending_stores, "mapped": mapped_stores}

@app.post("/admin/api/map_drag_drop")
def approve_drag_drop_mapping(req: DragMapRequest):
    with engine.begin() as conn:
        update_sql = text("""
            UPDATE layer3_dim.dim_merchant_mapping
            SET nama_resto_final = :nama_resto_final,
                status = :status,
                mapping_status = 'MAPPED',
                mapped_by = 'DRAG_DROP_CANVAS',
                updated_at = CURRENT_TIMESTAMP
            WHERE store_id = :store_id
        """)
        conn.execute(update_sql, {
            "store_id": req.store_id,
            "nama_resto_final": req.target_resto_final,
            "status": req.target_status
        })

    try:
        with engine.begin() as conn:
            conn.execute(text("SELECT refresh_fact_transactions()"))
    except Exception as e:
        print(f"Error refreshing fact_transactions: {e}")

    return {"status": "success", "store_id": req.store_id, "target": req.target_resto_final}

@app.post("/admin/api/reset_mapping")
def reset_store_mapping(req: ResetMapRequest):
    with engine.begin() as conn:
        update_sql = text("""
            UPDATE layer3_dim.dim_merchant_mapping
            SET nama_resto_final = NULL,
                status = 'Live',
                mapping_status = 'PENDING_REVIEW',
                mapped_by = 'RESET_CANVAS',
                updated_at = CURRENT_TIMESTAMP
            WHERE store_id = :store_id
        """)
        conn.execute(update_sql, {
            "store_id": req.store_id
        })

    try:
        with engine.begin() as conn:
            conn.execute(text("SELECT refresh_fact_transactions()"))
    except Exception as e:
        print(f"Error refreshing fact_transactions: {e}")

    return {"status": "success", "store_id": req.store_id, "action": "reset_to_pending"}

@app.post("/admin/api/rename_cluster")
def rename_cluster(req: RenameClusterRequest):
    with engine.begin() as conn:
        update_sql = text("""
            UPDATE layer3_dim.dim_merchant_mapping
            SET nama_resto_final = :new_name,
                updated_at = CURRENT_TIMESTAMP
            WHERE nama_resto_final = :old_name AND mapping_status = 'MAPPED'
        """)
        conn.execute(update_sql, {
            "old_name": req.old_name,
            "new_name": req.new_name
        })

    try:
        with engine.begin() as conn:
            conn.execute(text("SELECT refresh_fact_transactions()"))
    except Exception as e:
        print(f"Error refreshing fact_transactions: {e}")

    return {"status": "success", "old_name": req.old_name, "new_name": req.new_name}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.admin_poc:app", host="0.0.0.0", port=8005, reload=True)
