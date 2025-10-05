/**
 * Sports API - A script that pulls sports event data from SportsDB API
 * Copyright (C) 2025 Johnathan Pulos
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * This script will pull data from the sportsdb API and store it in a
 * JSON file in a format that can be used by a Raspberry Pi project. We are using
 * the free API since we will not be making many requests.
 * 
 * This will be fired every 20 minutes using a CRON job. Each time it runs,
 * it will pass in the league id as an argument.
 */
import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const dataFile = path.join(__dirname, 'www', 'events.json');
const leagueId = process.argv[2] || 'NFL';
const API_KEY = process.env.API_KEY || '';
const API_VERSION = process.env.API_VERSION || '1';
if (!API_KEY) {
  console.error('API_KEY is not set in environment variables');
  process.exit(1);
}
const BASE_URL = `https://www.thesportsdb.com/api/v${API_VERSION}/json/${API_KEY}/`;

const LEAGUE_STATUS_MAP = {
  MLB: {
    NS: 'Not Started',
    IN1: 'Inning 1',
    IN2: 'Inning 2',
    IN3: 'Inning 3',
    IN4: 'Inning 4',
    IN5: 'Inning 5',
    IN6: 'Inning 6',
    IN7: 'Inning 7',
    IN8: 'Inning 8',
    IN9: 'Inning 9',
    POST: 'Postponed',
    CANC: 'Cancelled',
    INTR: 'Interrupted',
    ABD: 'Abandoned',
    FT: 'Finished',
  },
  NBA: {
    NS: 'Not Started',
    Q1: 'Quarter 1 (In Play)',
    Q2: 'Quarter 2 (In Play)',
    Q3: 'Quarter 3 (In Play)',
    Q4: 'Quarter 4 (In Play)',
    OT: 'Over Time (In Play)',
    BT: 'Break Time (In Play)',
    HT: 'Halftime (In Play)',
    FT: 'Game Finished',
    AOT: 'After Over Time',
    POST: 'Game Postponed',
    CANC: 'Game Cancelled',
    SUSP: 'Game Suspended',
    AWD: 'Game Awarded',
    ABD: 'Game Abandoned',
  },
  NFL: {
    NS: 'Not Started',
    Q1: '1st Quarter',
    Q2: '2nd Quarter',
    Q3: '3rd Quarter',
    Q4: '4th Quarter',
    OT: 'Overtime',
    HT: 'Halftime',
    FT: 'Finished',
    AOT: 'After Over Time',
    CANC: 'Cancelled',
    PST: 'Postponed',
  },
}

if (!LEAGUE_STATUS_MAP[leagueId]) {
  console.error(`League ID "${leagueId}" is not supported.`);
  process.exit(1);
}

/**
 * Get events for a specific day and league id
 *
 * @param {string} day The day of the events in YYYY-MM-DD format
 * @param {string} leagueId The league id, e.g. 'NFL'
 *
 * @returns The response data or an error object
 */
const fetchEventsByDay = async (day, leagueId) => {
  try {
    const response = await axios.get(`${BASE_URL}eventsday.php?d=${day}&l=${leagueId}`);
    return response.data;
  } catch (error) {
    return { error: error.message };
  }
};

/**
 * Format a date as YYYY-MM-DD, with an optional offset in days
 *
 * @param {Date} base The base date (default is today)
 * @param {number} offsetDays The number of days to offset (can be negative)
 *
 * @returns The formatted date string
 */
const formatDateYMD = (base = new Date(), offsetDays = 0) => {
  const d = new Date(base);
  if (offsetDays) d.setDate(d.getDate() + offsetDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Format an ISO timestamp into a date and time string in a specific time zone
 *
 * @param {string} isoTimestamp The ISO timestamp, e.g. "2025-10-05T13:30:00Z"
 * @param {string} timeZone The IANA time zone name, e.g. "America/Los_Angeles"
 *
 * @returns An object with 'date' and 'time' properties
 */
const formatEventDateTime = (isoTimestamp, timeZone = 'America/Los_Angeles') => {
  if (!isoTimestamp) return { date: '', time: '' };
  // If timestamp has no offset or Z, assume UTC
  const hasOffset = /[zZ]|[+\-]\d{2}:?\d{2}$/.test(isoTimestamp);
  const iso = hasOffset ? isoTimestamp : `${isoTimestamp}Z`;
  const instant = new Date(iso);

  const dateStr = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    timeZone
  }).format(instant).replace(',', ''); // "Oct 05 2025"

  const timeStr = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone
  }).format(instant); // "06:30 PM"

  return { date: dateStr, time: timeStr };
};

/**
 * Format event data into a specific structure
 *
 * @param {object} event The event object from the API
 * @param {string} leagueId The league id
 *
 * @returns The formatted event object
 */
const formatEventData = (event, leagueId) => {
  const { date: formattedDate, time } = formatEventDateTime(event.strTimestamp);
  const statusString = (LEAGUE_STATUS_MAP[leagueId] && LEAGUE_STATUS_MAP[leagueId][event.strStatus]) ? LEAGUE_STATUS_MAP[leagueId][event.strStatus] : event.strStatus;
  return {
    id: event.idEvent,
    date: formattedDate,
    status: statusString,
    time: time,
    league: leagueId,
    leagueBadge: event.strLeagueBadge,
    away: {
        id: event.idAwayTeam,
        name: event.strAwayTeam,
        badge: event.strAwayTeamBadge,
        score: parseInt(event.intAwayScore, 10) || 0
    },
    home: {
        id: event.idHomeTeam,
        name: event.strHomeTeam,
        badge: event.strHomeTeamBadge,
        score: parseInt(event.intHomeScore, 10) || 0
    }
  }
};

/**
 * Initialize the data file if it doesn't exist
 * 
 * @returns The initialized data file content
 */
const initializeDataFile = async () => {
  try {
    const data = await fs.readFile(dataFile, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    // File doesn't exist, create it
    const initialData = { events: [] };
    await fs.writeFile(dataFile, JSON.stringify(initialData));
    return initialData;
  }
};

/**
 * Sort events by league, date, and time
 */
const sortEvents = (events) => {
  return events.sort((a, b) => {
    if (a.league !== b.league) return a.league.localeCompare(b.league);
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });
};

try {
  const existingData = await initializeDataFile();

  // Clear any existing data for the current league
  existingData.events = existingData.events.filter(event => event.league !== leagueId);
  const datesToFetch = [
    formatDateYMD(new Date(), -1), // yesterday
    formatDateYMD(new Date(), 0),  // today
    formatDateYMD(new Date(), 1)   // tomorrow
  ];
  // Process all dates
  const eventPromises = datesToFetch.map(async (day) => {
    try {
      const result = await fetchEventsByDay(day, leagueId);
      return result?.events?.map(event => formatEventData(event, leagueId)) || [];
    } catch (error) {
      console.error(error.message);
      return [];
    }
  });
  
  const allEvents = await Promise.all(eventPromises);
  existingData.events.push(...allEvents.flat());
  
  // Sort and save
  existingData.events = sortEvents(existingData.events);
  await fs.writeFile(dataFile, JSON.stringify(existingData));
  
  console.log(`Successfully updated events for ${leagueId}`);
} catch (error) {
  console.error('Script failed:', error.message);
  process.exit(1);
}
