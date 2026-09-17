export type PlatformType = 'GoFood' | 'GrabFood' | 'ShopeeFood';
export type ListingStatus = 'Live' | 'Need Review' | 'Inactive';

export interface ListingRecord {
  id: string;
  namaListing: string;
  namaBrand: string;
  brandId: string;
  namaPemilik: string;
  ownerId: string;
  outlet: string;
  outletId: string;
  aplikator: PlatformType;
  storeId: string;
  groupId: string;
  link: string;
  statusListing: ListingStatus;
  statusInternal: string;
  alamat: string;
  namaBank: string;
  namaPemilikRekening: string;
  nomorRekening: string;
  tarif: number;
  _searchIndex?: string;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(current);
        current = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        row.push(current);
        rows.push(row);
        row = [];
        current = '';
      } else if (char === '\n') {
        row.push(current);
        rows.push(row);
        row = [];
        current = '';
      } else {
        current += char;
      }
    }
  }
  if (current || row.length > 0) {
    row.push(current);
    rows.push(row);
  }
  return rows;
}

export function parseDBRToListings(csvText: string, cachedOwners: any[] = []): ListingRecord[] {
  const startIdx = csvText.indexOf('Nama Pemilik,Nama Brand');
  const validText = startIdx >= 0 ? csvText.slice(startIdx) : csvText;
  const rows = parseCSV(validText);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim());

  // Build lookup map for owners if available
  const ownerLookupMap = new Map<string, string>();
  if (Array.isArray(cachedOwners)) {
    cachedOwners.forEach((o: any) => {
      if (o && o.name) {
        ownerLookupMap.set(o.name.trim().toLowerCase(), o.id);
      }
    });
  }

  const listings: ListingRecord[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 5) continue;

    const getCol = (name: string) => {
      const idx = headers.indexOf(name);
      return idx >= 0 && idx < row.length ? row[idx].trim() : '';
    };

    const ownerName = getCol('Nama Pemilik');
    const brandName = getCol('Nama Brand') || ownerName;
    const outletName = getCol('Outlet') || `${brandName} Outlet`;
    const appRaw = getCol('Aplikator').toLowerCase();

    if (!ownerName && !brandName) continue;

    let aplikator: PlatformType = 'GoFood';
    if (appRaw.includes('grab')) {
      aplikator = 'GrabFood';
    } else if (appRaw.includes('shopee')) {
      aplikator = 'ShopeeFood';
    }

    const statusListingLower = getCol('Status Listing').toLowerCase();
    const statusInternalLower = getCol('Status Internal').toLowerCase();
    let statusListing: ListingStatus = 'Live';

    if (
      statusListingLower.includes('inactive') ||
      statusListingLower.includes('tutup') ||
      statusInternalLower.includes('inactive')
    ) {
      statusListing = 'Inactive';
    } else if (
      statusListingLower.includes('unregistered') ||
      statusListingLower.includes('review') ||
      statusInternalLower.includes('unmanaged')
    ) {
      statusListing = 'Need Review';
    }

    const storeId = getCol('Store ID') || '-';
    const groupId = getCol('Group ID') || '-';
    const namaListing = getCol('Nama Listing') || brandName;
    const link = getCol('Link') || '#';
    const alamat = getCol('Alamat');
    const namaBank = getCol('Nama Bank') || '-';
    const namaPemilikRekening = getCol('Nama Pemilik Rekening') || '-';
    const nomorRekening = getCol('Nomor Rekening') || '-';
    const tarif = parseInt(getCol('Tarif'), 10) || 1500;

    const brandId = btoa(`${brandName.trim()}:::${ownerName.trim()}`).replace(/=/g, '');
    const outletId = btoa(`${outletName.trim()}:::${ownerName.trim()}`).replace(/=/g, '');
    const ownerId = ownerLookupMap.get(ownerName.toLowerCase()) || `OWN-${String(i).padStart(3, '0')}`;
    const id = btoa(`${storeId}:::${aplikator}:::${namaListing}:::${outletName}`).replace(/=/g, '');

    const searchIndex = `${namaListing} ${storeId} ${groupId} ${brandName} ${ownerName} ${outletName} ${aplikator} ${namaBank} ${statusListing}`.toLowerCase();

    listings.push({
      id,
      namaListing,
      namaBrand: brandName,
      brandId,
      namaPemilik: ownerName,
      ownerId,
      outlet: outletName,
      outletId,
      aplikator,
      storeId,
      groupId,
      link,
      statusListing,
      statusInternal: getCol('Status Internal') || 'Live',
      alamat,
      namaBank,
      namaPemilikRekening,
      nomorRekening,
      tarif,
      _searchIndex: searchIndex
    });
  }

  return listings;
}
