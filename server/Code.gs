/** Deploy only after approval. All configuration lives in Script Properties.
 * Intended behind a same-origin gateway with IP rate limits and bot protection.
 * Never expose sheet IDs or log request bodies. */
function doPost(e) {
  function json(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
  var lock = LockService.getScriptLock();
  try {
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty('COLLECTION_APPROVED') !== 'true') return json({ok:false,code:'DISABLED'});
    if (!e || !e.postData || e.postData.contents.length > 12000) return json({ok:false,code:'INVALID'});
    var data = JSON.parse(e.postData.contents);
    // Gateway injects this secret server-side. It must never appear in the browser.
    var gatewaySecret = props.getProperty('GATEWAY_SECRET');
    if (!gatewaySecret || data.gatewaySecret !== gatewaySecret) return json({ok:false,code:'UNAUTHORIZED'});
    var roster = JSON.parse(props.getProperty('SUPERVISOR_ROUTES') || '{}');
    var route = Object.prototype.hasOwnProperty.call(roster,data.supervisorId) ? roster[data.supervisorId] : null;
    var consentVersion = props.getProperty('CONSENT_VERSION');
    if (!route || !route.spreadsheetId || !consentVersion || data.consentVersion !== consentVersion || data.consent !== true ||
        typeof data.name !== 'string' || data.name.trim().length < 5 || data.name.length > 150 ||
        typeof data.email !== 'string' || data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ||
        typeof data.topic !== 'string' || data.topic.trim().length < 10 || data.topic.length > 1000 ||
        ['section-1','section-2','section-3'].indexOf(data.sectionId) === -1 ||
        typeof data.requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(data.requestId)) return json({ok:false,code:'INVALID'});
    var pepper = props.getProperty('HASH_PEPPER');
    if (!pepper) return json({ok:false,code:'CONFIGURATION'});
    function hash(value) { return Utilities.computeHmacSha256Signature(value,pepper).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join(''); }
    var emailHash = hash(data.email.trim().toLowerCase());
    var fingerprint = hash([emailHash,data.supervisorId,data.sectionId,data.topic.trim().toLowerCase()].join('|'));
    var payloadHash = hash([fingerprint,data.name.trim(),data.consentVersion].join('|'));
    if (!lock.tryLock(10000)) return json({ok:false,code:'BUSY'});
    // Per-email limiter is durable; IP/bot limits must be enforced by gateway.
    var cache = CacheService.getScriptCache();
    var limitKey = 'rate-'+emailHash;
    var count = Number(cache.get(limitKey) || 0);
    if (count >= 5) return json({ok:false,code:'RATE_LIMIT'});
    cache.put(limitKey,String(count+1),600);
    var sheet = SpreadsheetApp.openById(route.spreadsheetId).getSheetByName('Applications');
    if (!sheet) return json({ok:false,code:'CONFIGURATION'});
    // Fixed schema: see deployment guide. Read/write under a single script lock.
    var rows = sheet.getDataRange().getValues();
    for (var i=1;i<rows.length;i++) {
      if (rows[i][0] === data.requestId) {
        if (rows[i][2] !== payloadHash) return json({ok:false,code:'IDEMPOTENCY_CONFLICT'});
        return json({ok:true,status:'saved',requestId:data.requestId,receiptId:String(rows[i][1])});
      }
      if (rows[i][3] === fingerprint) return json({ok:false,code:'DUPLICATE'});
    }
    var rateSheetId = props.getProperty('RATE_LEDGER_ID');
    if (!rateSheetId) return json({ok:false,code:'CONFIGURATION'});
    var ledger = SpreadsheetApp.openById(rateSheetId).getSheetByName('RateLimits');
    if (!ledger) return json({ok:false,code:'CONFIGURATION'});
    var now = Date.now(), records = ledger.getDataRange().getValues(), recent = 0;
    for (var j=1;j<records.length;j++) if (records[j][0] === emailHash && now-Number(records[j][1]) < 600000) recent++;
    if (recent >= 5) return json({ok:false,code:'RATE_LIMIT'});
    ledger.appendRow([emailHash,now]); SpreadsheetApp.flush();
    var receipt = Utilities.getUuid();
    // Force user text to plain text to prevent Sheets formula injection.
    function cell(value) { return "'" + value; }
    var record = [data.requestId,receipt,payloadHash,fingerprint,new Date().toISOString(),cell(data.name.trim()),cell(data.email.trim()),data.supervisorId,data.sectionId,cell(data.topic.trim()),data.consentVersion,cell(route.name || data.supervisorId),cell(['Современный маркетинг, брендинг, реклама и PR','Медиакоммуникации, цифровые медиа и искусственный интеллект','Креативные индустрии и студенческие проекты для бизнеса'][Number(data.sectionId.slice(-1))-1]),'Новая'];
    var rowIndex = sheet.getLastRow()+1;
    sheet.getRange(rowIndex,1,1,record.length).setNumberFormat('@').setValues([record]);
    SpreadsheetApp.flush();
    // Only return success after confirming the stored receipt and request ID.
    var saved = sheet.getRange(rowIndex,1,1,2).getValues()[0];
    if (saved[0] !== data.requestId || saved[1] !== receipt) return json({ok:false,code:'UNCONFIRMED'});
    return json({ok:true,status:'saved',requestId:data.requestId,receiptId:receipt});
  } catch (error) {
    // Generic error; never expose exceptions, sheet IDs, or personal data.
    return json({ok:false,code:'SERVER_ERROR'});
  } finally { if (lock.hasLock()) lock.releaseLock(); }
}
