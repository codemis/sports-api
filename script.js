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
import { NFLParser } from './src/parsers/nfl-parser.js';
import { NBAParser } from './src/parsers/nba-parser.js';
import { MLBParser } from './src/parsers/mlb-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataFile = path.join(__dirname, 'www', 'events.json');
let leagueId = process.argv[2] || 'NFL';
leagueId = leagueId.toUpperCase();

/**
 * Fetch the data for a specific league
 *
 * @param {string} leagueId The league id, e.g. 'NFL'
 *
 * @returns The response data or an error object
 */
const fetchLeagueData = async (leagueId) => {
  let parser = null;
  if (leagueId === 'NFL') {
    parser = new NFLParser();
  } else if (leagueId === 'NBA') {
    parser = new NBAParser();
  } else if (leagueId === 'MLB') {
    parser = new MLBParser();
  } else {
    system.exit(1);
  }
  try {
    const response = await axios.get(parser.url);
    const parsed = parser.parse(response.data);
    if (!Array.isArray(parsed)) {
      throw new Error('Parser did not return an array');
    }
    return parsed;
  } catch (error) {
    throw new Error(error.message);
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

  // Preserve final events from the last week for this league
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - oneWeekMs;
  const preserved = existingData.events.filter(event => {
    if (event.league !== leagueId) return false;
    if (event.status_type !== 'STATUS_FINAL') return false;
    if (!event.date) return false;
    let time = event.time || '00:00:00';
    if (/^\d{1,2}:\d{2}$/.test(time)) time += ':00';
    let dt = Date.parse(`${event.date}T${time}Z`);
    if (isNaN(dt)) dt = Date.parse(`${event.date} ${time}`);
    if (isNaN(dt)) return false;
    return dt >= cutoff;
  });

  console.log(preserved);

  // Remove all events for current league
  existingData.events = existingData.events.filter(event => event.league !== leagueId);

  // Get the new data
  const results = await fetchLeagueData(leagueId);

  // Merge preserved final events not present in results (compare by id)
  const resultIds = new Set(results.map(r => r.id));
  for (const ev of preserved) {
    if (ev.id && !resultIds.has(ev.id)) {
      results.push(ev);
    }
  }
  existingData.events.push(...results);
  
  // Sort and save
  existingData.events = sortEvents(existingData.events);
  await fs.writeFile(dataFile, JSON.stringify(existingData));
  
  console.log(`Successfully updated events for ${leagueId}`);
} catch (error) {
  console.error('Script failed:', error.message);
  process.exit(1);
}
