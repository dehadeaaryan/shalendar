/**
 * Google Calendar -> Shalendar event sync.
 * Add the configuration values under Apps Script > Project Settings > Script properties.
 */
function syncGoogleCalendarToShalendar() {
  const properties = PropertiesService.getScriptProperties();
  const calendarName = properties.getProperty('SHALENDAR_NAME');
  const password = properties.getProperty('SHALENDAR_PASSWORD');
  const partnerName = properties.getProperty('SHALENDAR_MEMBER');
  const calendarId = properties.getProperty('GOOGLE_CALENDAR_ID');

  if (!calendarName || !password || !partnerName) {
    throw new Error('Set SHALENDAR_NAME, SHALENDAR_PASSWORD, and SHALENDAR_MEMBER in Script properties.');
  }

  const calendar = calendarId
    ? CalendarApp.getCalendarById(calendarId)
    : CalendarApp.getDefaultCalendar();
  if (!calendar) throw new Error('Google Calendar was not found or is not accessible.');

  // Sync a rolling window. Shalendar deletes only missing Google events inside it.
  const start = new Date();
  start.setDate(start.getDate() - 30);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setDate(end.getDate() + 180);
  end.setHours(23, 59, 59, 999);

  const events = calendar.getEvents(start, end).map((event) => ({
    title: event.getTitle(),
    start_time: event.getStartTime().toISOString(),
    end_time: event.getEndTime().toISOString(),
    external_shortcut_id: calendar.getId() + ':' + event.getId() + ':' + event.getStartTime().getTime(),
  }));

  const response = UrlFetchApp.fetch('https://shalendar.aaryandehade.com/api/sync', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      calendar_name: calendarName,
      password: password,
      partner_name: partnerName,
      source: 'google',
      timezone: calendar.getTimeZone(),
      sync_start: start.toISOString(),
      sync_end: end.toISOString(),
      events: events,
    }),
    muteHttpExceptions: true,
  });

  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error('Shalendar sync failed (' + status + '): ' + response.getContentText());
  }
  console.log(response.getContentText());
}

/** Run once to refresh the Google Calendar events every 6 hours. */
function installShalendarGoogleSyncTrigger() {
  const handler = 'syncGoogleCalendarToShalendar';
  const exists = ScriptApp.getProjectTriggers().some((trigger) => trigger.getHandlerFunction() === handler);
  if (!exists) ScriptApp.newTrigger(handler).timeBased().everyHours(6).create();
}
