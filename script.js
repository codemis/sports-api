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
 * 
 * @param {string} date The date to parse
 * @param {string} time The time
 *
 * @returns The date time
 */
const parseEventDate = (date, time = '00:00:00') => {
  // Normalize time format (HH:MM to HH:MM:SS)
  const normalizedTime = /^\d{1,2}:\d{2}$/.test(time) ? `${time}:00` : time;
  
  // Try ISO format first (more reliable)
  const isoDate = new Date(`${date}T${normalizedTime}Z`);
  if (!isNaN(isoDate.getTime())) return isoDate.getTime();
  
  // Fallback to locale string parsing
  const localeDate = new Date(`${date} ${normalizedTime}`);
  if (!isNaN(localeDate.getTime())) return localeDate.getTime();
  
  return null;
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

  // Get the new data
  const results = await fetchLeagueData(leagueId);

  // Update existing events or add new ones
  results.forEach(newEvent => {
    const existingIndex = existingData.events.findIndex(e => e.id === newEvent.id);
    if (existingIndex !== -1) {
      // Update existing event
      existingData.events[existingIndex] = newEvent;
    } else {
      // Add new event
      existingData.events.push(newEvent);
    }
  });

  // iterate all existingData.events and only keep events of last week
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - oneWeekMs;
  existingData.events = existingData.events.filter(event => {
    if (!event.date) return true;
    
    const eventTime = parseEventDate(event.date, event.time);
    if (eventTime === null) return true; // Keep events with unparseable dates
    
    return eventTime >= cutoff;
  });
  // Sort and save
  existingData.events = sortEvents(existingData.events);
  await fs.writeFile(dataFile, JSON.stringify(existingData));
  
  console.log(`Successfully updated events for ${leagueId}`);
} catch (error) {
  console.error('Script failed:', error.message);
  process.exit(1);
}
